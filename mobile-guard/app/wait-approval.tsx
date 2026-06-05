import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { getApprovalStatus } from '@/lib/api';
import { getControllerIp, getDoorNumber, getControllerUsername, getControllerPassword, getAppMode } from '@/lib/storage';
import { DoorController, DoorControllerRef } from '../components/DoorController';

export default function WaitApprovalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = String(params.requestId ?? '').trim();
  const doorControllerRef = useRef<DoorControllerRef>(null);

  const [status, setStatus] = useState<string>('PENDING');
  const [visitId, setVisitId] = useState<string | null>(null);
  const [visitQrCode, setVisitQrCode] = useState<string>('');
  const [visitVisitorName, setVisitVisitorName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [autoOpening, setAutoOpening] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [autoOpenError, setAutoOpenError] = useState<string>('');
  const [appMode, setAppMode] = useState<'KIOSKO' | 'GUARDIA' | null>(null);
  const autoOpenTriggeredRef = useRef(false);
  const approvedRedirectTriggeredRef = useRef(false);

  useEffect(() => {
    (async () => {
      const mode = await getAppMode();
      setAppMode(mode);
    })();
  }, []);

  const openDoor = async () => {
    const [ipRaw, doorRaw, usernameRaw, passwordRaw] = await Promise.all([
      getControllerIp(),
      getDoorNumber(),
      getControllerUsername(),
      getControllerPassword(),
    ]);

    const ip = String(ipRaw || '').trim();
    const door = String(doorRaw || '').trim();
    const username = String(usernameRaw || '').trim();
    const password = String(passwordRaw || '').trim();

    if (!ip || !door || !username || !password) {
      throw new Error('Configuración del controlador incompleta');
    }

    const result = await doorControllerRef.current?.openDoor(ip, door, username, password);
    if (!result?.success) {
      throw new Error(result?.message || 'No se pudo abrir la puerta');
    }
  };

  const triggerAutoOpen = async () => {
    if (autoOpenTriggeredRef.current || autoOpened || autoOpening) return;
    autoOpenTriggeredRef.current = true;

    try {
      setAutoOpening(true);
      setAutoOpenError('');
      await openDoor();
      setAutoOpened(true);
    } catch (err) {
      setAutoOpenError(err instanceof Error ? err.message : 'No se pudo abrir automáticamente');
      autoOpenTriggeredRef.current = false;
    } finally {
      setAutoOpening(false);
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const res: any = await getApprovalStatus(requestId);
      const s = String(res?.request?.status ?? 'PENDING').toUpperCase();
      setStatus(s);
      setVisitId(res?.request?.visitId ?? null);
      setVisitQrCode(String(res?.visit?.qrCode ?? '').trim());
      setVisitVisitorName(String(res?.visit?.visitorName ?? '').trim());
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo consultar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== 'APPROVED') return;
    if (appMode !== 'KIOSKO') return;
    void triggerAutoOpen();
  }, [status, appMode]);

  useEffect(() => {
    if (!requestId) return;
    autoOpenTriggeredRef.current = false;
    approvedRedirectTriggeredRef.current = false;
    setAutoOpened(false);
    setAutoOpenError('');
    refresh();
  }, [requestId]);

  useEffect(() => {
    if (status !== 'APPROVED') return;
    if (!visitQrCode) return;
    if (appMode !== 'KIOSKO') return;
    if (approvedRedirectTriggeredRef.current) return;

    approvedRedirectTriggeredRef.current = true;
    const id = setTimeout(() => {
      router.replace('/home');
    }, 2000);

    return () => clearTimeout(id);
  }, [status, visitQrCode, router, appMode]);

  useEffect(() => {
    if (!requestId) return;
    if (status !== 'PENDING') return;

    const id = setInterval(() => {
      void refresh();
    }, 1000);

    return () => clearInterval(id);
  }, [requestId, status]);

  const handleOpen = async () => {
    try {
      await openDoor();
      router.replace('/home');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo abrir');
    }
  };

  if (!requestId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Solicitud inválida</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/home')}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'REJECTED') {
    return (
      <View style={styles.deniedContainer}>
        <Text style={styles.deniedTitle}>visita no aprobada por residente</Text>
        <TouchableOpacity style={styles.deniedButton} onPress={() => router.replace('/home')}>
          <Text style={styles.deniedButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Esperando Aprobación</Text>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color="#1E3A8A" />
          <Text style={styles.status}>Consultando...</Text>
        </View>
      ) : (
        <Text style={styles.status}>Estado: {status}</Text>
      )}

      {status === 'APPROVED' ? (
        <>
          {appMode === 'GUARDIA' ? (
            <Text style={styles.subtitle}>Aprobado. Presione Abrir para abrir puerta.</Text>
          ) : (
            <>
              {autoOpening && <Text style={styles.subtitle}>Aprobado. Abriendo puerta automáticamente...</Text>}
              {!autoOpening && !!visitQrCode && <Text style={styles.subtitle}>Aprobado. Regresando al inicio...</Text>}
            </>
          )}
          {!!autoOpenError && <Text style={styles.errorText}>Error auto-apertura: {autoOpenError}</Text>}
          {!!visitQrCode && (
            <View style={styles.qrContainer}>
              <Text style={styles.qrTitle}>QR de salida</Text>
              {!!visitVisitorName && <Text style={styles.qrSubtitle}>{visitVisitorName}</Text>}
              <View style={styles.qrBox}>
                <QRCode value={visitQrCode} size={180} />
              </View>
              <Text style={styles.qrCodeText}>{visitQrCode}</Text>
              <Text style={styles.qrHint}>Pida al visitante tomar foto de este QR para su salida.</Text>
            </View>
          )}
          {(appMode === 'GUARDIA' || (!autoOpened && !autoOpening)) && (
            <TouchableOpacity style={styles.openButton} onPress={handleOpen}>
              <Text style={styles.openText}>Abrir</Text>
            </TouchableOpacity>
          )}
        </>
      ) : status === 'EXPIRED' ? (
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/home')}>
          <Text style={styles.buttonText}>Volver</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>Actualizar</Text>
        </TouchableOpacity>
      )}

      <DoorController ref={doorControllerRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: '#1E3A8A',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
  openButton: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  openText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  errorText: {
    marginTop: 10,
    color: '#DC2626',
    textAlign: 'center',
    fontWeight: '700',
  },
  deniedContainer: {
    flex: 1,
    backgroundColor: '#B91C1C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deniedTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'lowercase',
  },
  deniedButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  deniedButtonText: {
    color: '#B91C1C',
    fontWeight: '900',
  },
  qrContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
  },
  qrTitle: {
    color: '#166534',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 6,
  },
  qrSubtitle: {
    color: '#334155',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8,
  },
  qrCodeText: {
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 2,
    marginBottom: 8,
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 8,
  },
  qrHint: {
    color: '#334155',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
});
