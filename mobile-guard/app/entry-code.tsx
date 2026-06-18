import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { guardEntryWithCode, startGuardMediaUpload } from '@/lib/api';
import { DoorController, DoorControllerRef } from '../components/DoorController';
import { QRScannerOverlay } from '../components/QRScannerOverlay';
import { IDScannerOverlay } from '../components/IDScannerOverlay';
import { getControllerIp, getDoorNumber, getControllerUsername, getControllerPassword, getAppMode } from '@/lib/storage';
import * as Speech from 'expo-speech';
import { OPTIMIZED_CAPTURE_OPTIONS } from '@/lib/capture-options';
import { preparePhotoForUpload } from '@/lib/photo-upload';

export default function EntryCodeScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const doorControllerRef = useRef<DoorControllerRef>(null);
  const scanLockRef = useRef(false);
  const lastScanRef = useRef(0);
  const lastSpokenPhaseRef = useRef<'idCapture' | 'qrScan' | null>(null);
  const uploadRef = useRef<Promise<string | null> | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<'idCapture' | 'idPreview' | 'qrScan' | 'opening' | 'done' | 'error'>('idCapture');
  const [busy, setBusy] = useState(false);
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [status, setStatus] = useState<string>('Listo para escanear');
  const [statusType, setStatusType] = useState<'ready' | 'success' | 'error'>('ready');
  const [idStatus, setIdStatus] = useState<string>('Alinear documento');
  const [idStatusType, setIdStatusType] = useState<'ready' | 'detecting' | 'success' | 'error'>('ready');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [appMode, setAppMode] = useState<'KIOSKO' | 'GUARDIA'>('GUARDIA');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState<number>(-1);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [capturingEvidence, setCapturingEvidence] = useState(false);

  useEffect(() => {
    (async () => {
      const mode = await getAppMode();
      setAppMode(mode);
      setCameraFacing(mode === 'GUARDIA' ? 'back' : 'front');
    })();
  }, []);

  const openPrimaryDoor = async () => {
    console.log('🔧 Entry - Getting controller settings from storage...');

    const [ip, door, username, password] = await Promise.all([
      getControllerIp(),
      getDoorNumber(),
      getControllerUsername(),
      getControllerPassword()
    ]);

    console.log('🔧 Entry - Controller settings retrieved:', {
      ip: ip || 'MISSING',
      door: door || 'MISSING',
      username: username || 'MISSING',
      password: password ? '***' : 'MISSING'
    });

    if (!ip || !door || !username || !password) {
      console.log('❌ Entry - Incomplete controller configuration');
      throw new Error('Configuración del controlador incompleta');
    }

    console.log('🚪 Entry - Calling doorControllerRef.current?.openDoor...');
    console.log('🚪 Entry - doorControllerRef.current exists:', !!doorControllerRef.current);

    const result = await doorControllerRef.current?.openDoor(
      ip,
      door,
      username,
      password
    );

    console.log('🚪 Entry - Door controller result:', result);

    if (!result?.success) {
      const errorMsg = result?.message || 'No se pudo abrir la puerta';
      console.log('❌ Entry - Door opening failed:', errorMsg);
      throw new Error(errorMsg);
    }
  };

  const handleManualOpenDoor = async () => {
    if (busy || phase !== 'done') return;
    try {
      setBusy(true);
      setStatus('Abriendo puerta...');
      setStatusType('ready');
      setPhase('opening');
      await openPrimaryDoor();
      setStatus('Puerta abierta correctamente');
      setStatusType('success');
      setPhase('done');
      setTimeout(() => {
        router.replace('/home');
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo abrir la puerta';
      setStatus(message);
      setStatusType('error');
      setPhase('done');
      Alert.alert('Advertencia', message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    console.log('📷 Entry - Permission status changed:', {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      status: permission?.status
    });

    if (!permission) {
      console.log('📷 Entry - Permission not available yet');
      return;
    }

    if (!permission.granted) {
      console.log('📷 Entry - Requesting camera permission...');
      requestPermission();
    } else {
      console.log('📷 Entry - Camera permission granted ✅');
    }
  }, [permission]);

  useEffect(() => {
    if (!permission?.granted) return;

    const speakOptions = {
      language: 'es',
      pitch: 1.0,
      rate: 0.8,
      volume: 0.8,
    };

    if (phase === 'idCapture') {
      if (lastSpokenPhaseRef.current === 'idCapture') return;
      lastSpokenPhaseRef.current = 'idCapture';
      Speech.stop();
      const timer = setTimeout(() => {
        Speech.speak('Coloque su Documento de Identificacion', speakOptions);
      }, 300);
      return () => clearTimeout(timer);
    }

    if (phase === 'qrScan') {
      if (lastSpokenPhaseRef.current === 'qrScan') return;
      lastSpokenPhaseRef.current = 'qrScan';
      Speech.stop();
      const timer = setTimeout(() => {
        Speech.speak('Coloque su Código', speakOptions);
      }, 300);
      return () => clearTimeout(timer);
    }

    lastSpokenPhaseRef.current = null;
    Speech.stop();
  }, [permission?.granted, phase]);

  useEffect(() => {
    // ID preview timer
    if (phase !== 'idPreview') return;
    const timer = setTimeout(() => {
      console.log('🔄 Entry - Auto-transitioning from idPreview to qrScan');
      setPhase('qrScan');
      setLastScanTime(0); // Reset debounce timer for fresh scanning
    }, 500);
    return () => clearTimeout(timer);
  }, [phase]);

  // KIOSKO countdown before capture
  useEffect(() => {
    if (captureCountdown > 0 && phase === 'idCapture') {
      const timer = setTimeout(() => {
        setCaptureCountdown(captureCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (captureCountdown === 0 && phase === 'idCapture') {
      setCaptureCountdown(-1);
      handleCaptureId();
    }
  }, [captureCountdown, phase]);

  const handleCaptureId = async () => {
    console.log('📸 Entry - ID Capture started:', {
      phase: phase,
      timestamp: new Date().toISOString()
    });

    try {
      if (!cameraReady) {
        setIdStatusType('error');
        setIdStatus('Cámara iniciando...');
        setTimeout(() => {
          setIdStatusType('ready');
          setIdStatus('Alinear documento');
        }, 1200);
        return;
      }

      console.log('📸 Entry - Setting status to detecting...');
      setIdStatusType('detecting');
      setIdStatus('Detectando...');

      console.log('📸 Entry - Taking ID photo...');
      console.log('📸 Entry - Camera ref available:', !!cameraRef.current);

      let photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      if (!photo?.uri) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      }

      console.log('📸 Entry - ID Photo capture result:', {
        success: !!photo,
        uri: photo?.uri,
        width: photo?.width,
        height: photo?.height
      });
      if (photo?.uri) {
        setIdStatusType('success');
        setIdStatus('¡Documento capturado!');
        setIdPhotoUri(photo.uri);

        // Optimize + upload in background — don't block navigation
        // KIOSKO: skip optimize (quality:0.5 capture is already small enough)
        const rawUri = photo.uri;
        const currentAppMode = appMode;
        uploadRef.current = (async () => {
          try {
            const uriToUpload = currentAppMode === 'KIOSKO'
              ? rawUri
              : (await preparePhotoForUpload(rawUri)).uri;
            return await startGuardMediaUpload('VISIT_ENTRY', uriToUpload);
          } catch {
            return null;
          }
        })();

        console.log('📸 Entry - ID Photo captured successfully, moving to preview...');

        // Wait a moment to show success, then move to preview
        console.log('⏰ Entry - Scheduling phase change to idPreview in 1 second...');
        setTimeout(() => {
          console.log('🔄 Entry - Changing phase to idPreview');
          setPhase('idPreview');
          setIdStatusType('ready');
          setIdStatus('Alinear documento');
        }, 250);
      } else {
        throw new Error('PHOTO_CAPTURE_EMPTY_URI');
      }
    } catch (error) {
      console.log('❌ Entry - ID Capture error:', {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      setIdStatusType('error');
      const captureErrorCode = error instanceof Error ? error.message : 'UNKNOWN_CAPTURE_ERROR';
      if (captureErrorCode === 'PHOTO_CAPTURE_EMPTY_URI') {
        setIdStatus('La cámara no devolvió imagen. Intente de nuevo.');
      } else {
        setIdStatus('Error al capturar. Intente nuevamente.');
      }

      console.log('📱 Entry - Showing ID capture error alert');
      Alert.alert(
        'Error',
        captureErrorCode === 'PHOTO_CAPTURE_EMPTY_URI'
          ? 'La cámara no devolvió imagen. Intente nuevamente.'
          : 'No se pudo capturar la foto'
      );

      setCaptureCountdown(-1); // Reset countdown

      console.log('⏰ Entry - Scheduling ID status reset in 2 seconds...');
      // Reset status after 2 seconds
      setTimeout(() => {
        console.log('🔄 Entry - Resetting ID status to ready');
        setIdStatusType('ready');
        setIdStatus('Alinear documento');
      }, 2000);
    }
  };

  const handleManualCapture = () => {
    if (phase === 'idCapture') {
      if (appMode === 'KIOSKO') {
        setCaptureCountdown(3); // Give visitor 3 seconds to position
      } else {
        handleCaptureId();
      }
    }
  };

  const handleRetakePhoto = () => {
    uploadRef.current = null;
    setIdPhotoUri(null);
    setEvidencePhotos([]);
    lastSpokenPhaseRef.current = null;
    setPhase('idCapture');
  };

  const handleCaptureEvidence = async () => {
    if (capturingEvidence || busy) return;
    try {
      setCapturingEvidence(true);
      let photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      if (!photo?.uri) {
        await new Promise(resolve => setTimeout(resolve, 180));
        photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      }
      if (!photo?.uri) {
        Alert.alert('Error', 'No se pudo tomar la foto');
        return;
      }
      const uri = photo.uri;
      setEvidencePhotos(prev => [...prev, uri]);
      const currentAppMode = appMode;
      (async () => {
        try {
          const uriToUpload = currentAppMode === 'KIOSKO'
            ? uri
            : (await preparePhotoForUpload(uri)).uri;
          await startGuardMediaUpload('VISIT_ENTRY', uriToUpload);
        } catch {
          // best-effort upload
        }
      })();
    } catch {
      Alert.alert('Error', 'No se pudo capturar la foto de evidencia');
    } finally {
      setCapturingEvidence(false);
    }
  };

  const handleScanned = async (data: string) => {
    const currentTime = Date.now();
    console.log('📱 Entry - QR Scanned - START:', {
      data: data,
      busy: busy,
      phase: phase,
      isScanning: isScanning,
      idPhotoAvailable: idPhotoUri ? 'YES' : 'NO',
      lastScanTime: lastScanTime,
      timeSinceLastScan: currentTime - lastScanTime,
      timestamp: new Date().toISOString()
    });

    if (busy || scanLockRef.current) {
      console.log('📱 Entry - Scan ignored - busy');
      return;
    }
    if (phase !== 'qrScan') {
      console.log('📱 Entry - Scan ignored - wrong phase:', phase);
      return;
    }
    if (isScanning) {
      console.log('📱 Entry - Scan ignored - already scanning');
      return; // Prevent multiple simultaneous scans
    }

    // Add timestamp-based debounce (2 seconds)
    if (currentTime - lastScanRef.current < 2000) {
      console.log('📱 Entry - Scan ignored - debounce active (2s)');
      return;
    }

    console.log('📱 Entry - QR Scanned - ACCEPTED:', data);
    console.log('🔍 Entry - Starting entry validation process...');
    console.log('📸 Entry - ID Photo available:', idPhotoUri ? 'YES' : 'NO');

    scanLockRef.current = true;
    lastScanRef.current = currentTime;
    setLastScanTime(currentTime); // Update last scan time
    setIsScanning(true); // Lock scanning
    setBusy(true);
    const code = String(data).trim();
    setQrCode(code);
    setStatus('Procesando código QR...');
    setStatusType('ready');

    console.log('📸 Entry - QR Code set:', code);
    console.log('📷 Entry - Starting API call with ID photo...');

    try {
      // Wait up to 500ms for pre-started upload (most time already elapsed during QR scan)
      let mediaKey: string | null = null;
      if (uploadRef.current) {
        mediaKey = await Promise.race([
          uploadRef.current,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
        ]);
      }

      console.log('📡 Entry - API Call - guardEntryWithCode:', {
        qrCode: code,
        hasMediaKey: !!mediaKey,
      });

      // Immediately mark INSIDE with media key from pre-upload
      await guardEntryWithCode({
        qrCode: code,
        mediaKey: mediaKey || undefined,
      });

      console.log('🎉 Entry - guardEntryWithCode successful! QR is valid');
      console.log('✅ Entry - QR Code validated:', code);
      console.log('📸 Entry - Media key used:', mediaKey ? 'YES' : 'NO (photo skipped or upload timed out)');

      // Welcome message on success
      const welcomeOptions = {
        language: 'es',
        pitch: 1.0,
        rate: 0.8,
        volume: 0.8,
      };

      console.log('🎤 Entry - Speaking success message: Bienvenido');
      Speech.speak('Bienvenido', welcomeOptions);

      if (appMode === 'GUARDIA') {
        setStatus('QR Válido - Presione Abrir puerta');
        setStatusType('success');
        setPhase('done');
        return;
      }

      setStatus('QR Válido - Abriendo puerta...');
      setStatusType('success');
      setPhase('opening');

      console.log('🚪 Entry - Starting door opening process...');
      try {
        await openPrimaryDoor();
        console.log('🎉 Door opened successfully!');
      } catch (err) {
        const doorErrorMsg = err instanceof Error ? err.message : 'No se pudo abrir la puerta';
        console.log('🚪 Entry - Door controller error:', {
          error: err,
          message: doorErrorMsg,
          timestamp: new Date().toISOString()
        });

        console.log('📱 Entry - Showing door error alert');
        Alert.alert('Advertencia', doorErrorMsg);
      }

      setPhase('done');
      console.log('✅ Entry - Process completed successfully');

      // Auto-return to home after 2 seconds
      console.log('🏠 Entry - Scheduling auto-return to home in 2 seconds...');
      setTimeout(() => {
        console.log('🏠 Entry - Navigating back to home');
        router.replace('/home');
      }, 2000);
    } catch (err: any) {
      // Log the detailed error for debugging
      console.log('🔍 Entry Code Error Details:', {
        error: err,
        message: err.message,
        stack: err.stack,
        qrCode: code,
        idPhotoAvailable: idPhotoUri ? 'YES' : 'NO',
        timestamp: new Date().toISOString(),
        errorType: err.constructor.name,
        statusCode: err.status,
        response: err.response
      });

      // Handle different error types
      let errorMsg = 'QR inválido';
      let voiceMsg = 'QR inválido';

      if (err.message) {
        const lowerMsg = err.message.toLowerCase();
        console.log('📝 Analyzing entry error message:', lowerMsg);

        if (lowerMsg.includes('antipaso') || lowerMsg.includes('inside') || lowerMsg.includes('already inside')) {
          errorMsg = 'ERROR ANTIPASO';
          voiceMsg = 'ERROR ANTIPASO';
          console.log('❌ Detected ANTIPASO error (Entry)');
        } else if (lowerMsg.includes('expir') || lowerMsg.includes('expired')) {
          errorMsg = 'CODIGO EXPIRADO';
          voiceMsg = 'CODIGO EXPIRADO';
          console.log('❌ Detected EXPIRED error (Entry)');
        } else if (lowerMsg.includes('usado') || lowerMsg.includes('used') || lowerMsg.includes('completed')) {
          errorMsg = 'CODIGO YA USADO';
          voiceMsg = 'CODIGO YA USADO';
          console.log('❌ Detected USED error (Entry)');
        } else if (lowerMsg.includes('network') || lowerMsg.includes('fetch') || lowerMsg.includes('connection')) {
          errorMsg = 'Error de red';
          voiceMsg = 'Error de conexión';
          console.log('❌ Detected NETWORK error (Entry)');
        } else if (lowerMsg.includes('timeout')) {
          errorMsg = 'Tiempo de espera agotado';
          voiceMsg = 'Error de conexión';
          console.log('❌ Detected TIMEOUT error (Entry)');
        } else if (lowerMsg.includes('file_too_large') || lowerMsg.includes('demasiado') || lowerMsg.includes('tamaño')) {
          errorMsg = 'Foto demasiado pesada';
          voiceMsg = 'Foto demasiado pesada';
          console.log('❌ Detected FILE_TOO_LARGE error (Entry)');
        } else {
          // For other errors, show the actual error message
          errorMsg = `Error: ${err.message}`;
          voiceMsg = 'Error de conexión';
          console.log('❌ Generic error (Entry) - showing full message');
        }
      } else {
        console.log('❌ No error message available (Entry)');
      }

      setErrorMessage(errorMsg);
      setStatus(errorMsg);
      setStatusType('error');
      setPhase('error');

      // Speak error message
      const errorOptions = {
        language: 'es',
        pitch: 1.0,
        rate: 0.8,
        volume: 0.8,
      };

      console.log('🎤 Entry - Speaking error message:', voiceMsg);
      Speech.speak(voiceMsg, errorOptions);

      console.log('📱 Entry - Showing error alert:', errorMsg);
      Alert.alert('Error', errorMsg);

      setPhase('error');
      setTimeout(() => {
        setPhase('qrScan');
        setIsScanning(false); // Unlock scanning
        setBusy(false);
        setLastScanTime(0); // Reset debounce timer
        scanLockRef.current = false;
        lastScanRef.current = 0;
      }, 3000);
    } finally {
      console.log('🏁 Entry - handleScanned finally block - cleaning up');
      setIsScanning(false); // Ensure scanning is unlocked
      setBusy(false);
      scanLockRef.current = false;
    }
  };

  if (!permission?.granted) {
    console.log('❌ Entry - Camera permission not granted - showing permission screen');
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Permiso de cámara requerido</Text>
        <TouchableOpacity style={styles.button} onPress={() => {
          console.log('📷 Entry - Permission button pressed');
          requestPermission();
        }}>
          <Text style={styles.buttonText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrada con Código</Text>
        <View style={{ width: 60 }} />
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraFacing}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onCameraReady={() => setCameraReady(true)}
        onBarcodeScanned={phase === 'qrScan' && !busy ? (ev: BarcodeScanningResult) => handleScanned(ev.data) : undefined}
      />

      {/* Overlays positioned absolutely over camera */}
      {phase === 'idCapture' && (
        <View style={styles.overlayContainer}>
          <IDScannerOverlay
            title="TASKontrol"
            subtitle="Coloque su Documento de Identificacion"
            status={idStatus}
            statusType={idStatusType}
            documentType="front"
            showScanLine={true}
            showTips={true}
            onCapture={handleManualCapture}
            isCapturing={idStatusType === 'detecting' || captureCountdown >= 0}
          />
        </View>
      )}

      {phase === 'qrScan' && (
        <View style={styles.overlayContainer}>
          <QRScannerOverlay
            title="TASKontrol"
            subtitle="Coloque su Código"
            status={status}
            statusType={statusType}
          />
        </View>
      )}

      {phase === 'qrScan' && appMode === 'GUARDIA' && (
        <TouchableOpacity style={styles.retakeButton} onPress={handleRetakePhoto}>
          <Text style={styles.retakeButtonText}>+ Nueva foto</Text>
        </TouchableOpacity>
      )}

      {/* Regular overlay for other phases */}
      <View style={styles.overlay}>
        {phase === 'idPreview' && (
          <>
            {idPhotoUri && (
              <Image
                source={{ uri: idPhotoUri }}
                style={styles.idPreview}
                resizeMode="contain"
              />
            )}
            <Text style={styles.overlayText}>Foto capturada</Text>
          </>
        )}
        {phase === 'opening' && (
          <View style={styles.row}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.overlayText}>Procesando...</Text>
          </View>
        )}
        {phase === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        {phase === 'done' && (
          appMode === 'GUARDIA' ? (
            <>
              <Text style={styles.overlayText}>{status}</Text>
              {evidencePhotos.length > 0 && (
                <ScrollView horizontal style={styles.evidenceRow} showsHorizontalScrollIndicator={false}>
                  {evidencePhotos.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.evidenceThumb} resizeMode="cover" />
                  ))}
                </ScrollView>
              )}
              <View style={styles.doneButtonRow}>
                <TouchableOpacity
                  style={styles.evidenceButton}
                  onPress={handleCaptureEvidence}
                  disabled={busy || capturingEvidence}
                >
                  <Text style={styles.evidenceButtonText}>
                    {capturingEvidence ? '...' : '+ Foto'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.doneButton, styles.doneButtonFlex]} onPress={handleManualOpenDoor} disabled={busy}>
                  <Text style={styles.doneText}>{busy ? 'Procesando...' : 'Abrir puerta'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.overlayText}>Completado</Text>
            </View>
          )
        )}
      </View>


      {/* Hidden Door Controller */}
      <DoorController ref={doorControllerRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    height: 64,
    paddingHorizontal: 16,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1220',
    zIndex: 1000,
  },
  back: { color: '#93C5FD', fontWeight: '800', width: 60 },
  headerTitle: { color: '#fff', fontWeight: '900' },
  camera: { flex: 1 },
  retakeButton: {
    position: 'absolute',
    top: 74,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#93C5FD',
    zIndex: 100,
  },
  retakeButtonText: {
    color: '#93C5FD',
    fontWeight: '800',
    fontSize: 13,
  },
  overlayContainer: {
    position: 'absolute',
    top: 64, // Start below header
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    bottom: 22,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  overlayText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: '#1E3A8A' },
  button: { backgroundColor: '#1E3A8A', padding: 14, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '800' },
  doneButton: { backgroundColor: '#16A34A', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center' },
  doneButtonFlex: { flex: 1, width: undefined },
  doneButtonRow: { flexDirection: 'row', gap: 8, width: '100%', marginTop: 8 },
  evidenceButton: {
    backgroundColor: 'rgba(30,58,138,0.9)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  evidenceButtonText: { color: '#93C5FD', fontWeight: '900', fontSize: 13 },
  evidenceRow: { width: '100%', marginBottom: 6 },
  evidenceThumb: { width: 60, height: 44, borderRadius: 6, marginRight: 6, backgroundColor: '#1E3A8A' },
  doneText: { color: '#fff', fontWeight: '900' },
  qrAlignmentBox: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    marginTop: -120,
    marginLeft: -120,
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  qrCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopColor: '#fff',
    borderLeftColor: '#fff',
    top: -3,
    left: -3,
  },
  qrCornerTopRight: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopColor: '#fff',
    borderRightColor: '#fff',
    borderLeftWidth: 0,
    left: 'auto',
    right: -3,
  },
  qrCornerBottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomColor: '#fff',
    borderLeftColor: '#fff',
    borderTopWidth: 0,
    top: 'auto',
    bottom: -3,
  },
  qrCornerBottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: '#fff',
    borderRightColor: '#fff',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    top: 'auto',
    bottom: -3,
    left: 'auto',
    right: -3,
  },
  // ID Alignment Box (larger for document)
  idAlignmentBox: {
    position: 'absolute',
    top: '17.5%',
    left: '50%',
    marginTop: -140,
    marginLeft: -140,
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  idCorner: {
    position: 'absolute',
    width: 35,
    height: 35,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopColor: '#fff',
    borderLeftColor: '#fff',
    top: -3,
    left: -3,
  },
  idCornerTopRight: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopColor: '#fff',
    borderRightColor: '#fff',
    borderLeftWidth: 0,
    left: 'auto',
    right: -3,
  },
  idCornerBottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomColor: '#fff',
    borderLeftColor: '#fff',
    borderTopWidth: 0,
    top: 'auto',
    bottom: -3,
  },
  idCornerBottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomColor: '#fff',
    borderRightColor: '#fff',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    top: 'auto',
    bottom: -3,
    left: 'auto',
    right: -3,
  },
  idPreview: {
    width: 200,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  captureButton: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    marginLeft: -60,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    padding: 16,
    width: 120,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
