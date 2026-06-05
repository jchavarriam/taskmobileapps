import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { guardExitWithCode, startGuardMediaUpload } from '@/lib/api';
import { DoorController, DoorControllerRef } from '../components/DoorController';
import { QRScannerOverlay } from '../components/QRScannerOverlay';
import { getControllerIp, getDoorNumber, getControllerUsername, getControllerPassword, getControllerIp2, getDoorNumber2, getControllerUsername2, getControllerPassword2, getAppMode, GuardAppMode } from '@/lib/storage';
import * as Speech from 'expo-speech';
import { OPTIMIZED_CAPTURE_OPTIONS } from '@/lib/capture-options';
import { preparePhotoForUpload } from '@/lib/photo-upload';

export default function ExitCodeScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const doorControllerRef = useRef<DoorControllerRef>(null);
  const scanLockRef = useRef(false);
  const lastScanRef = useRef(0);
  const lastSpokenPhaseRef = useRef<'scan' | null>(null);
  const exitUploadRef = useRef<Promise<string | null> | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<'scan' | 'photo' | 'opening' | 'done'>('scan');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('Listo para escanear');
  const [statusType, setStatusType] = useState<'ready' | 'success' | 'error'>('ready');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [appMode, setAppMode] = useState<GuardAppMode>('GUARDIA');
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    (async () => {
      const mode = await getAppMode();
      setAppMode(mode);
      setCameraFacing(mode === 'GUARDIA' ? 'back' : 'front');
    })();
  }, []);

  const processExitAfterQrValidation = async (code: string, mediaKey?: string) => {
    let resolvedMediaKey = mediaKey;

    if (!resolvedMediaKey) {
      console.log('📸 Taking photo and uploading for exit...');
      console.log('📸 Camera ref available:', !!cameraRef.current);

      if (!cameraReady) {
        throw new Error('CAMERA_NOT_READY');
      }

      let photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      if (!photo?.uri) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      }

      console.log('📸 Photo capture result:', {
        success: !!photo,
        uri: photo?.uri,
        width: photo?.width,
        height: photo?.height
      });

      if (!photo?.uri) {
        console.log('❌ Photo capture failed - no uri');
        throw new Error('No se pudo capturar la foto para validación de salida.');
      }

      // KIOSKO: skip optimization (quality:0.5 capture is already small enough)
      // GUARDIA: optimize to ensure consistent quality
      const uriToUpload = appMode === 'KIOSKO'
        ? photo.uri
        : (await preparePhotoForUpload(photo.uri)).uri;
      resolvedMediaKey = await startGuardMediaUpload('VISIT_EXIT', uriToUpload) || undefined;
    }

    console.log('📡 API Call - guardExitWithCode:', {
      qrCode: code,
      hasMediaKey: !!resolvedMediaKey,
    });

    await guardExitWithCode({
      qrCode: code,
      mediaKey: resolvedMediaKey,
    });

    console.log('🎉 guardExitWithCode successful! QR is valid');
    console.log('✅ QR Code validated:', code);
    console.log('📸 Face photo captured successfully');

    const welcomeOptions = {
      language: 'es',
      pitch: 1.0,
      rate: 0.8,
      volume: 0.8,
    };

    console.log('🎤 Speaking success message: Buen Viaje', welcomeOptions);
    Speech.speak('Buen Viaje', welcomeOptions);

    setStatus('QR Válido - Abriendo puerta...');
    setStatusType('success');
    setPhase('opening');

    console.log('🚪 Starting door opening process...');
    try {
      console.log('🔧 Getting controller settings from storage...');

      const currentAppMode = await getAppMode();

      const [ip, door, username, password] = currentAppMode === 'GUARDIA'
        ? await Promise.all([
          getControllerIp2(),
          getDoorNumber2(),
          getControllerUsername2(),
          getControllerPassword2()
        ])
        : await Promise.all([
          getControllerIp(),
          getDoorNumber(),
          getControllerUsername(),
          getControllerPassword()
        ]);

      console.log('🔧 Controller settings retrieved:', {
        currentAppMode,
        ip: ip || 'MISSING',
        door: door || 'MISSING',
        username: username || 'MISSING',
        password: password ? '***' : 'MISSING'
      });

      if (!ip || !door || !username || !password) {
        console.log('❌ Exit - Incomplete controller configuration', { currentAppMode });
        throw new Error(currentAppMode === 'GUARDIA'
          ? 'Configuración del segundo controlador incompleta'
          : 'Configuración del controlador incompleta');
      }

      console.log('🚪 Calling doorControllerRef.current?.openDoor...');
      console.log('🚪 Door controller ref exists:', !!doorControllerRef.current);

      const result = await doorControllerRef.current?.openDoor(
        ip,
        door,
        username,
        password
      );

      console.log('🚪 Door controller result:', result);

      if (result && result.success) {
        console.log('🎉 Door opened successfully!');
      } else {
        const errorMsg = result?.message || 'No se pudo abrir la puerta';
        console.log('❌ Door opening failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      const doorErrorMsg = err instanceof Error ? err.message : 'No se pudo abrir la puerta';
      console.log('🚪 Door controller error:', {
        error: err,
        message: doorErrorMsg,
        timestamp: new Date().toISOString()
      });

      setStatus('No se pudo abrir la puerta');
      setStatusType('error');

      const errorOptions = {
        language: 'es',
        pitch: 1.0,
        rate: 0.8,
        volume: 0.8,
      };

      console.log('🎤 Speaking door error: No se pudo abrir la puerta');
      Speech.speak('No se pudo abrir la puerta', errorOptions);

      console.log('📱 Showing door error alert');
      Alert.alert('Advertencia', doorErrorMsg);
    }

    setPhase('done');
    console.log('✅ Process completed successfully');

    console.log('🏠 Scheduling auto-return to home in 2 seconds...');
    setTimeout(() => {
      console.log('🏠 Navigating back to home');
      router.replace('/home');
    }, 2000);
  };

  const handleManualPhotoContinue = async () => {
    if (busy || phase !== 'photo' || !qrCode) return;

    setBusy(true);
    setStatus('Procesando salida...');
    setStatusType('ready');

    try {
      // Wait up to 500ms for pre-started upload (most time elapsed while guard pressed button)
      let mediaKey: string | null = null;
      if (exitUploadRef.current) {
        mediaKey = await Promise.race([
          exitUploadRef.current,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
        ]);
        exitUploadRef.current = null;
      }

      await processExitAfterQrValidation(qrCode, mediaKey || undefined);
    } catch (err: any) {
      let errorMsg = err?.message || 'QR inválido';
      const lowerMsg = String(errorMsg).toLowerCase();
      if (lowerMsg.includes('network') || lowerMsg.includes('fetch') || lowerMsg.includes('connection')) {
        errorMsg = 'Error de red';
      } else if (String(errorMsg).toUpperCase() === 'CAMERA_NOT_READY') {
        errorMsg = 'La cámara aún no está lista. Intente de nuevo.';
      }
      setStatus(errorMsg);
      setStatusType('error');
      Alert.alert('Error', errorMsg);
      setPhase('scan');
      setQrCode(null);
      setLastScanTime(0);
    } finally {
      setBusy(false);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    console.log('📷 Permission status changed:', {
      granted: permission?.granted,
      canAskAgain: permission?.canAskAgain,
      status: permission?.status
    });

    if (!permission) {
      console.log('📷 Permission not available yet');
      return;
    }

    if (!permission.granted) {
      console.log('📷 Requesting camera permission...');
      requestPermission();
    } else {
      console.log('📷 Camera permission granted ✅');
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

    if (phase === 'scan') {
      if (lastSpokenPhaseRef.current === 'scan') return;
      lastSpokenPhaseRef.current = 'scan';
      Speech.stop();
      const timer = setTimeout(() => {
        Speech.speak('Coloque su Código', speakOptions);
      }, 300);
      return () => clearTimeout(timer);
    }

    lastSpokenPhaseRef.current = null;
    Speech.stop();
  }, [permission?.granted, phase]);

  const handleScanned = async (data: string) => {
    const currentTime = Date.now();
    console.log('📱 QR Scanned - START:', {
      data: data,
      busy: busy,
      phase: phase,
      isScanning: isScanning,
      lastScanTime: lastScanTime,
      timeSinceLastScan: currentTime - lastScanTime,
      timestamp: new Date().toISOString()
    });

    if (busy || scanLockRef.current) {
      console.log('📱 Scan ignored - busy');
      return;
    }
    if (phase !== 'scan') {
      console.log('📱 Scan ignored - wrong phase:', phase);
      return;
    }
    if (isScanning) {
      console.log('📱 Scan ignored - already scanning');
      return; // Prevent multiple simultaneous scans
    }

    // Add timestamp-based debounce (2 seconds)
    if (currentTime - lastScanRef.current < 2000) {
      console.log('📱 Scan ignored - debounce active (2s)');
      return;
    }

    console.log('📱 QR Scanned - ACCEPTED:', data);
    console.log('🔍 Starting exit validation process...');

    scanLockRef.current = true;
    lastScanRef.current = currentTime;
    setLastScanTime(currentTime); // Update last scan time
    setIsScanning(true); // Lock scanning
    setBusy(true);

    const code = String(data).trim();
    setQrCode(code);
    setStatus('Procesando código QR...');
    setStatusType('ready');
    setPhase('photo');

    console.log('📸 QR Code set:', code);
    console.log('📷 Phase changed to photo for face capture...');

    try {
      if (appMode === 'GUARDIA') {
        setStatus('QR Válido - Presione Continuar para registrar salida');
        setStatusType('success');

        // Pre-capture photo and start upload while guard presses "Continuar"
        if (cameraReady && cameraRef.current) {
          exitUploadRef.current = (async () => {
            try {
              let photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
              if (!photo?.uri) {
                await new Promise((resolve) => setTimeout(resolve, 180));
                photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
              }
              if (photo?.uri) {
                const optimized = await preparePhotoForUpload(photo.uri);
                return await startGuardMediaUpload('VISIT_EXIT', optimized.uri);
              }
              return null;
            } catch {
              return null;
            }
          })();
        } else {
          exitUploadRef.current = null;
        }

        setBusy(false);
        setIsScanning(false);
        return;
      }

      await processExitAfterQrValidation(code);
    } catch (err: any) {
      // Log the detailed error for debugging
      console.log('🔍 Exit Code Error Details:', {
        error: err,
        message: err.message,
        stack: err.stack,
        qrCode: code,
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
        console.log('📝 Analyzing error message:', lowerMsg);

        if (lowerMsg.includes('antipaso') || lowerMsg.includes('inside') || lowerMsg.includes('already inside')) {
          errorMsg = 'ERROR ANTIPASO';
          voiceMsg = 'ERROR ANTIPASO';
          console.log('❌ Detected ANTIPASO error');
        } else if (lowerMsg.includes('expir') || lowerMsg.includes('expired')) {
          errorMsg = 'CODIGO EXPIRADO';
          voiceMsg = 'CODIGO EXPIRADO';
          console.log('❌ Detected EXPIRED error');
        } else if (lowerMsg.includes('usado') || lowerMsg.includes('used') || lowerMsg.includes('completed')) {
          errorMsg = 'CODIGO YA USADO';
          voiceMsg = 'CODIGO YA USADO';
          console.log('❌ Detected USED error');
        } else if (lowerMsg.includes('network') || lowerMsg.includes('fetch') || lowerMsg.includes('connection')) {
          errorMsg = 'Error de red';
          voiceMsg = 'Error de conexión';
          console.log('❌ Detected NETWORK error');
        } else if (lowerMsg.includes('timeout')) {
          errorMsg = 'Tiempo de espera agotado';
          voiceMsg = 'Error de conexión';
          console.log('❌ Detected TIMEOUT error');
        } else {
          // For other errors, show the actual error message
          errorMsg = `Error: ${err.message}`;
          voiceMsg = 'Error de conexión';
          console.log('❌ Generic error - showing full message');
        }
      } else {
        console.log('❌ No error message available');
      }

      setStatus(errorMsg);
      setStatusType('error');
      Alert.alert('Error', errorMsg);
      setPhase('scan');
      setQrCode(null);
      setLastScanTime(0); // Reset debounce timer
      scanLockRef.current = false;
      lastScanRef.current = 0;

      // Speak error message
      const errorOptions = {
        language: 'es',
        pitch: 1.0,
        rate: 0.8,
        volume: 0.8,
      };

      console.log('🎤 Speaking error message:', voiceMsg);
      Speech.speak(voiceMsg, errorOptions);

      console.log('📱 Showing error alert:', errorMsg);
      // Reset status after 2 seconds
      console.log('⏰ Scheduling status reset in 2 seconds...');
      setTimeout(() => {
        console.log('🔄 Resetting status to ready');
        setStatus('Listo para escanear');
        setStatusType('ready');
        setIsScanning(false); // Reset scanning lock
        scanLockRef.current = false;
        lastScanRef.current = 0;
      }, 2000);
    } finally {
      console.log('🏁 handleScanned finally block - cleaning up');
      setBusy(false);
      setIsScanning(false); // Reset scanning lock
      scanLockRef.current = false;
    }
  };

  if (!permission?.granted) {
    console.log('❌ Camera permission not granted - showing permission screen');
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Permiso de cámara requerido</Text>
        <TouchableOpacity style={styles.button} onPress={() => {
          console.log('📷 Permission button pressed');
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
        <Text style={styles.headerTitle}>Salida con Código</Text>
        <View style={{ width: 60 }} />
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraFacing}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onCameraReady={() => setCameraReady(true)}
        onBarcodeScanned={phase === 'scan' && !busy ? (ev: BarcodeScanningResult) => handleScanned(ev.data) : undefined}
      />

      {phase === 'scan' && (
        <View style={styles.overlayContainer}>
          <QRScannerOverlay
            title="TASKontrol"
            subtitle="Coloque su Código"
            status={status}
            statusType={statusType}
          />
        </View>
      )}
      {phase === 'photo' && (
        <View style={styles.overlay}>
          {appMode === 'GUARDIA' ? (
            <>
              <Text style={styles.overlayText}>Capture la foto manualmente y continúe</Text>
              <TouchableOpacity style={styles.doneButton} onPress={handleManualPhotoContinue} disabled={busy}>
                <Text style={styles.doneText}>{busy ? 'Procesando...' : 'Capturar foto y Continuar'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.overlayText}>Tomando foto...</Text>
            </View>
          )}
        </View>
      )}
      {phase === 'opening' && (
        <View style={styles.overlay}>
          <View style={styles.row}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.overlayText}>Procesando...</Text>
          </View>
        </View>
      )}
      {phase === 'done' && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.replace('/home')}>
            <Text style={styles.doneText}>Finalizar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!qrCode && phase !== 'scan' && <Text style={styles.codeText}>{qrCode}</Text>}

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
  doneText: { color: '#fff', fontWeight: '900' },
  codeText: { position: 'absolute', top: 72, alignSelf: 'center', color: '#fff', fontWeight: '900' },
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
});
