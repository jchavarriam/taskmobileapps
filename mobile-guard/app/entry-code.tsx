import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { guardEntryWithCode, startGuardMediaUpload, createApprovalRequest } from '@/lib/api';
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
  const [phase, setPhase] = useState<'idCapture' | 'idPreview' | 'qrScan' | 'notesReview' | 'opening' | 'done' | 'error'>('idCapture');
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
  const [eventLimit, setEventLimit] = useState<{ visitId: string; sectorId: string; eventName: string } | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [pendingNotes, setPendingNotes] = useState<string | null>(null);
  const [pendingVisitorName, setPendingVisitorName] = useState<string>('');

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

  // Finish a successful entry: GUARDIA waits for a manual door press; KIOSKO opens
  // the door automatically and returns home. Shared by the normal flow and the
  // "Revisado → Continuar" button on the notes-review screen.
  const proceedAfterEntry = async () => {
    if (appMode === 'GUARDIA') {
      setStatus('QR Válido - Presione Abrir puerta');
      setStatusType('success');
      setPhase('done');
      return;
    }

    setStatus('QR Válido - Abriendo puerta...');
    setStatusType('success');
    setPhase('opening');

    try {
      await openPrimaryDoor();
      console.log('🎉 Door opened successfully!');
    } catch (err) {
      const doorErrorMsg = err instanceof Error ? err.message : 'No se pudo abrir la puerta';
      console.log('🚪 Entry - Door controller error:', doorErrorMsg);
      Alert.alert('Advertencia', doorErrorMsg);
    }

    setPhase('done');

    // Auto-return to home after 2 seconds
    setTimeout(() => {
      router.replace('/home');
    }, 2000);
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

  // Event "Solicitar Acceso": request a 1-entry approval from the event resident.
  const handleSolicitarAcceso = async () => {
    if (!eventLimit || requestingAccess) return;
    if (!idPhotoUri) {
      Alert.alert('Foto requerida', 'No hay foto del visitante para enviar la solicitud.');
      return;
    }
    try {
      setRequestingAccess(true);
      const res: any = await createApprovalRequest({
        flow: 'ENTRY',
        visitorName: `Invitado de evento (${eventLimit.eventName})`,
        sectorId: eventLimit.sectorId,
        photoUri: idPhotoUri,
        eventVisitId: eventLimit.visitId,
      });
      const requestId = String(res?.requestId ?? '');
      if (!requestId) throw new Error('No se recibió ID de solicitud');
      router.replace({
        pathname: '/wait-approval',
        params: { requestId, visitorName: eventLimit.eventName, areaName: eventLimit.eventName },
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setRequestingAccess(false);
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
    lastSpokenPhaseRef.current = null;
    setPhase('idCapture');
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
      const entryResp: any = await guardEntryWithCode({
        qrCode: code,
        mediaKey: mediaKey || undefined,
      });

      // Event pass WITH a named roster: hand off to the per-guest check-in screen.
      // The roster screen captures each guest's ID and opens the gate per guest,
      // so we do NOT increment/open here.
      if (entryResp?.accessType === 'EVENT' && entryResp?.hasGuestList) {
        Speech.stop();
        router.replace({ pathname: '/event-guests', params: { qrCode: code } });
        return;
      }

      // Event pass (count-only): show event info; door opens like a normal entry below.
      if (entryResp?.accessType === 'EVENT' && entryResp?.event) {
        const ev = entryResp.event;
        const left = ev.entriesLeft != null ? ` · Quedan ${ev.entriesLeft}` : '';
        setStatus(`Evento: ${ev.eventName} (${ev.entriesUsed}${ev.guestCount != null ? `/${ev.guestCount}` : ''})${left}`);
      }

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

      // If the visit has notes, pause and show them to the guard before opening.
      if (entryResp?.visit?.notes) {
        setPendingNotes(String(entryResp.visit.notes));
        setPendingVisitorName(String(entryResp.visit.visitorName || ''));
        setStatus('QR Válido');
        setStatusType('success');
        setPhase('notesReview');
        return;
      }

      await proceedAfterEntry();
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

      // Event entry limit reached (still in schedule): offer "Solicitar Acceso".
      const limitMsg = err?.data?.message || err?.message;
      if (limitMsg === 'EVENT_ENTRY_LIMIT_REACHED') {
        const ev = err?.data?.event || {};
        setEventLimit({
          visitId: String(ev.visitId || ''),
          sectorId: String(ev.sectorId || ''),
          eventName: String(ev.eventName || 'Evento'),
        });
        setStatus('Límite de Entradas a Evento Agotado');
        setStatusType('error');
        setPhase('error');
        Speech.speak('Límite de entradas agotado', { language: 'es', rate: 0.8 });
        setIsScanning(false);
        setBusy(false);
        scanLockRef.current = false;
        return;
      }

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
        {phase === 'error' && eventLimit && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Límite de Entradas a Evento Agotado</Text>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleSolicitarAcceso}
              disabled={requestingAccess}
            >
              <Text style={styles.doneText}>{requestingAccess ? 'Enviando...' : 'Solicitar Acceso'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: '#475569', marginTop: 8 }]} onPress={() => router.replace('/home')}>
              <Text style={styles.doneText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
        {phase === 'error' && !eventLimit && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}
        {phase === 'done' && (
          appMode === 'GUARDIA' ? (
            <>
              <Text style={styles.overlayText}>{status}</Text>
              <TouchableOpacity style={styles.doneButton} onPress={handleManualOpenDoor} disabled={busy}>
                <Text style={styles.doneText}>{busy ? 'Procesando...' : 'Abrir puerta'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.overlayText}>Completado</Text>
            </View>
          )
        )}
      </View>

      {phase === 'notesReview' && (
        <View style={styles.notesContainer}>
          <View style={styles.notesCard}>
            <Text style={styles.notesVisitorName}>{pendingVisitorName}</Text>
            <View style={styles.notesDivider} />
            <Text style={styles.notesLabel}>Notas del residente</Text>
            <ScrollView style={styles.notesScroll} contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={styles.notesText}>{pendingNotes}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.notesButton}
              onPress={() => {
                setPendingNotes(null);
                setPendingVisitorName('');
                void proceedAfterEntry();
              }}
            >
              <Text style={styles.notesButtonText}>✓ Revisado → Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Hidden Door Controller */}
      <DoorController ref={doorControllerRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  notesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 2000,
  },
  notesCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  notesVisitorName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  notesDivider: {
    height: 1,
    backgroundColor: '#2c2c2e',
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8e8e93',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 200,
    marginBottom: 20,
  },
  notesText: {
    fontSize: 16,
    color: '#e5e5ea',
    lineHeight: 24,
  },
  notesButton: {
    backgroundColor: '#30d158',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  notesButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
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
