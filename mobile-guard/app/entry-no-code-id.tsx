import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { IDScannerOverlay } from '@/components/IDScannerOverlay';
import * as Speech from 'expo-speech';
import { Image } from 'react-native';
import { getSiteMap, startGuardMediaUpload } from '@/lib/api';
import { setEntryNoCodeDraft, setPendingApprovalUpload } from '@/lib/entry-no-code-draft';
import { getAppMode } from '@/lib/storage';
import { OPTIMIZED_CAPTURE_OPTIONS } from '@/lib/capture-options';
import { preparePhotoForUpload } from '@/lib/photo-upload';

export default function EntryNoCodeIdScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [visitorName] = useState(String(params.visitorName || ''));
  const [phase, setPhase] = useState<'capture' | 'preview' | 'processing'>('capture');
  const [idPhotoUri, setIdPhotoUri] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number>(-1);
  const [idStatus, setIdStatus] = useState<string>('Alinear documento');
  const [idStatusType, setIdStatusType] = useState<'ready' | 'detecting' | 'success' | 'error'>('ready');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    (async () => {
      const appMode = await getAppMode();
      setCameraFacing(appMode === 'GUARDIA' ? 'back' : 'front');
    })();
  }, []);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      console.log('📷 Requesting camera permission...');
      requestPermission();
    } else {
      console.log('📷 Camera permission granted ✅');
      // Speak instructions when permission is granted
      speakInstructions();
    }
  }, [permission]);

  const speakInstructions = async () => {
    const options = {
      language: 'es',
      pitch: 1.0,
      rate: 0.8,
      volume: 0.8,
    };

    try {
      await Speech.speak('Coloque su Documento de Identificacion', options);
    } catch (error) {
      console.log('❌ Speech error:', error);
    }
  };

  const handleCaptureId = async () => {
    if (phase !== 'capture') return;
    if (!cameraReady) {
      setIdStatusType('error');
      setIdStatus('Cámara iniciando...');
      setTimeout(() => {
        setIdStatusType('ready');
        setIdStatus('Alinear documento');
      }, 1200);
      return;
    }

    console.log('📸 Starting ID capture...');
    setIdStatusType('detecting');
    setIdStatus('Capturando...');

    try {
      if (!cameraRef.current) {
        throw new Error('Camera not available');
      }

      let photo = await cameraRef.current.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);

      if (!photo?.uri) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        photo = await cameraRef.current.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      }

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      console.log('📸 ID Photo captured successfully');
      setIdPhotoUri(photo.uri);
      setEntryNoCodeDraft({
        visitorName,
        idPhotoUri: photo.uri,
      });

      // Pre-upload starts immediately while guard navigates through the multi-step form
      (async () => {
        try {
          const optimized = await preparePhotoForUpload(photo.uri);
          setPendingApprovalUpload(startGuardMediaUpload('APPROVAL_ENTRY', optimized.uri));
        } catch {
          // silently ignore; submit screen handles missing upload
        }
      })();
      setIdStatusType('success');
      setIdStatus('¡Documento capturado!');

      // Show preview immediately and keep it visible for 1 second
      setPhase('preview');
      setIdStatusType('ready');
      setIdStatus('Documento capturado');

      // Prefetch map while preview is visible to speed next screen loading
      void getSiteMap().catch(() => {
        // ignore prefetch errors; area screen handles real error path
      });

      setTimeout(() => {
        setPhase('processing');
        router.replace({
          pathname: '/entry-no-code-area',
          params: {
            visitorName: visitorName,
          }
        });
      }, 1000);

    } catch (error) {
      console.log('❌ ID Capture error:', error);
      setIdStatusType('error');
      setIdStatus('Error al capturar. Intente nuevamente.');
      Alert.alert('Error', 'No se pudo capturar la foto');

      // Reset after 2 seconds
      setTimeout(() => {
        setIdStatusType('ready');
        setIdStatus('Alinear documento');
      }, 2000);
    }
  };

  const handleManualCapture = () => {
    if (phase === 'capture') {
      console.log('📸 Manual capture triggered');
      setCaptureCountdown(3);
    }
  };

  useEffect(() => {
    if (captureCountdown > 0 && phase === 'capture') {
      const timer = setTimeout(() => {
        setCaptureCountdown(captureCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (captureCountdown === 0 && phase === 'capture') {
      handleCaptureId();
    }
  }, [captureCountdown, phase]);

  const handleBack = () => {
    router.back();
  };

  const handleEditName = () => {
    // Go back to name screen to edit
    router.push({
      pathname: '/entry-no-code-name',
      params: { visitorName: visitorName }
    });
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Permiso de cámara requerido</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrada sin Código</Text>
        <TouchableOpacity onPress={handleEditName}>
          <Text style={styles.edit}>Editar</Text>
        </TouchableOpacity>
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraFacing}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onCameraReady={() => setCameraReady(true)}
      />

      {/* ID Scanner Overlay */}
      {phase === 'capture' && (
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
            isCapturing={captureCountdown >= 0}
          />
        </View>
      )}

      {/* Preview Phase */}
      {phase === 'preview' && (
        <View style={styles.overlayContainer}>
          <View style={styles.previewContainer}>
            {!!idPhotoUri && (
              <Image
                source={{ uri: idPhotoUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.previewTitle}>Documento Capturado</Text>
            <Text style={styles.previewSubtitle}>Continuando...</Text>
          </View>
        </View>
      )}

      {/* Processing Overlay */}
      {phase === 'processing' && (
        <View style={styles.overlayContainer}>
          <View style={styles.processingContainer}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.processingText}>Procesando...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1220',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  back: {
    color: '#93C5FD',
    fontWeight: '800',
    width: 60,
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  edit: {
    color: '#93C5FD',
    fontWeight: '800',
    width: 60,
    fontSize: 16,
    textAlign: 'right',
  },
  camera: {
    flex: 1,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 220,
    height: 140,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#93C5FD',
    marginBottom: 12,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewSubtitle: {
    color: '#93C5FD',
    fontSize: 16,
    textAlign: 'center',
  },
  processingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    color: '#1E3A8A',
  },
  button: {
    backgroundColor: '#1E3A8A',
    padding: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
