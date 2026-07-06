import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  getEventGuests,
  eventGuestCheckin,
  startGuardMediaUpload,
  createApprovalRequest,
  EventGuest,
} from '@/lib/api';
import { DoorController, DoorControllerRef } from '../components/DoorController';
import { IDScannerOverlay } from '../components/IDScannerOverlay';
import {
  getControllerIp,
  getDoorNumber,
  getControllerUsername,
  getControllerPassword,
  getAppMode,
} from '@/lib/storage';
import { OPTIMIZED_CAPTURE_OPTIONS } from '@/lib/capture-options';
import { preparePhotoForUpload } from '@/lib/photo-upload';

type EventInfo = {
  visitId: string;
  eventName: string;
  guestCount: number | null;
  entriesUsed: number;
  sectorId: string;
};

type Result =
  | { kind: 'ok'; guestName: string }
  | { kind: 'limit'; guestName: string; photoUri: string; sectorId: string };

export default function EventGuestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const qrCode = String(params.qrCode ?? '').trim();

  const cameraRef = useRef<CameraView>(null);
  const doorControllerRef = useRef<DoorControllerRef>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guests, setGuests] = useState<EventGuest[]>([]);
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [search, setSearch] = useState('');

  const [mode, setMode] = useState<'list' | 'capture' | 'result'>('list');
  const [selectedGuest, setSelectedGuest] = useState<EventGuest | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [appMode, setAppMode] = useState<'KIOSKO' | 'GUARDIA'>('GUARDIA');

  useEffect(() => {
    (async () => {
      const m = await getAppMode();
      setAppMode(m);
    })();
  }, []);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  const loadRoster = async () => {
    if (!qrCode) {
      setError('QR de evento no recibido');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await getEventGuests({ qrCode });
      setGuests(Array.isArray(res.guests) ? res.guests : []);
      setEvent({
        visitId: res.event.visitId,
        eventName: res.event.eventName,
        guestCount: res.event.guestCount,
        entriesUsed: res.event.entriesUsed,
        sectorId: '', // populated from check-in/limit responses when needed
      });
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCode]);

  const openPrimaryDoor = async () => {
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
    const r = await doorControllerRef.current?.openDoor(ip, door, username, password);
    if (!r?.success) throw new Error(r?.message || 'No se pudo abrir la puerta');
  };

  const handleSelectGuest = (guest: EventGuest) => {
    if (guest.checkedInAt) {
      Alert.alert('Ya registrado', `${guest.firstName} ${guest.lastName} ya fue registrado.`);
      return;
    }
    setSelectedGuest(guest);
    setCameraReady(false);
    setMode('capture');
  };

  // Capture the selected guest's ID, upload it, and check the guest in.
  const handleCaptureId = async () => {
    if (busy || !selectedGuest) return;
    if (!cameraReady) {
      Alert.alert('Cámara', 'La cámara aún está iniciando, intente de nuevo.');
      return;
    }
    setBusy(true);
    let capturedUri = '';
    try {
      let photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      if (!photo?.uri) {
        await new Promise((r) => setTimeout(r, 180));
        photo = await cameraRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      }
      if (!photo?.uri) throw new Error('La cámara no devolvió imagen. Intente de nuevo.');

      const uriToUpload =
        appMode === 'KIOSKO' ? photo.uri : (await preparePhotoForUpload(photo.uri)).uri;
      capturedUri = uriToUpload;
      const mediaKey = await startGuardMediaUpload('VISIT_ENTRY', uriToUpload);

      const res: any = await eventGuestCheckin({
        qrCode,
        guestId: selectedGuest.id,
        mediaKey: mediaKey || undefined,
      });

      // Mark guest checked in locally + bump counter.
      const checkedAt = res?.guest?.checkedInAt || new Date().toISOString();
      setGuests((prev) =>
        prev.map((g) => (g.id === selectedGuest.id ? { ...g, checkedInAt: checkedAt } : g))
      );
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              entriesUsed:
                res?.event?.entriesUsed != null ? res.event.entriesUsed : prev.entriesUsed + 1,
            }
          : prev
      );
      setResult({ kind: 'ok', guestName: `${selectedGuest.firstName} ${selectedGuest.lastName}` });
      setMode('result');
    } catch (err: any) {
      const msg = err?.data?.message || err?.message;
      if (msg === 'EVENT_ENTRY_LIMIT_REACHED') {
        const ev = err?.data?.event || {};
        setResult({
          kind: 'limit',
          guestName: `${selectedGuest.firstName} ${selectedGuest.lastName}`,
          photoUri: capturedUri, // reuse the ID photo we just captured for the approval
          sectorId: String(ev.sectorId || ''),
        });
        setMode('result');
      } else if (msg === 'GUEST_ALREADY_CHECKED_IN') {
        Alert.alert('Ya registrado', 'Este invitado ya fue registrado.');
        setGuests((prev) =>
          prev.map((g) =>
            g.id === selectedGuest.id ? { ...g, checkedInAt: new Date().toISOString() } : g
          )
        );
        setMode('list');
      } else {
        Alert.alert('Error', msg || 'No se pudo registrar al invitado');
        setMode('list');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDoor = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await openPrimaryDoor();
      backToList();
    } catch (err) {
      Alert.alert('Advertencia', err instanceof Error ? err.message : 'No se pudo abrir la puerta');
    } finally {
      setBusy(false);
    }
  };

  // Limit reached for a listed guest -> request a one-off approval from the resident,
  // reusing the ID photo captured during the failed check-in.
  const handleSolicitarAcceso = async () => {
    if (!result || result.kind !== 'limit' || !event || requestingAccess) return;
    if (!result.photoUri) {
      Alert.alert('Foto requerida', 'No hay foto del invitado para enviar la solicitud.');
      return;
    }
    try {
      setRequestingAccess(true);
      const res: any = await createApprovalRequest({
        flow: 'ENTRY',
        visitorName: `${result.guestName} (${event.eventName})`,
        sectorId: result.sectorId,
        photoUri: result.photoUri,
        eventVisitId: event.visitId,
      });
      const requestId = String(res?.requestId ?? '');
      if (!requestId) throw new Error('No se recibió ID de solicitud');
      router.replace({
        pathname: '/wait-approval',
        params: { requestId, visitorName: result.guestName, areaName: event.eventName },
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setRequestingAccess(false);
    }
  };

  const backToList = () => {
    setResult(null);
    setSelectedGuest(null);
    setCameraReady(false);
    setMode('list');
  };

  const filteredGuests = guests.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${g.firstName} ${g.lastName}`.toLowerCase().includes(q);
  });

  const checkedInCount = guests.filter((g) => g.checkedInAt).length;

  // ---- Capture screen ----
  if (mode === 'capture' && selectedGuest) {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Permiso de cámara requerido</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => requestPermission()}>
            <Text style={styles.primaryBtnText}>Permitir</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode('list')}>
            <Text style={styles.back}>Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedGuest.firstName} {selectedGuest.lastName}
          </Text>
          <View style={{ width: 60 }} />
        </View>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={appMode === 'GUARDIA' ? 'back' : 'front'}
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={styles.overlayContainer}>
          <IDScannerOverlay
            title="Foto de Documento"
            subtitle={`${selectedGuest.firstName} ${selectedGuest.lastName}`}
            status={busy ? 'Procesando...' : 'Alinear documento y capturar'}
            statusType={busy ? 'detecting' : 'ready'}
            documentType="front"
            showScanLine
            showTips
            onCapture={handleCaptureId}
            isCapturing={busy}
          />
        </View>
        <DoorController ref={doorControllerRef} />
      </View>
    );
  }

  // ---- Result screen ----
  if (mode === 'result' && result) {
    return (
      <View style={styles.center}>
        {result.kind === 'ok' ? (
          <>
            <Text style={styles.successTitle}>✓ Registrado</Text>
            <Text style={styles.resultName}>{result.guestName}</Text>
            {event && (
              <Text style={styles.counterText}>
                Entradas: {event.entriesUsed}
                {event.guestCount != null ? `/${event.guestCount}` : ''}
              </Text>
            )}
            <TouchableOpacity style={styles.openBtn} onPress={handleOpenDoor} disabled={busy}>
              <Text style={styles.openBtnText}>{busy ? 'Abriendo...' : 'Abrir puerta'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={backToList} disabled={busy}>
              <Text style={styles.secondaryBtnText}>Volver a la lista</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.limitTitle}>Límite de Entradas a Evento Agotado</Text>
            <Text style={styles.resultName}>{result.guestName}</Text>
            <TouchableOpacity
              style={styles.openBtn}
              onPress={handleSolicitarAcceso}
              disabled={requestingAccess}
            >
              <Text style={styles.openBtnText}>
                {requestingAccess ? 'Enviando...' : 'Solicitar Acceso'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={backToList}>
              <Text style={styles.secondaryBtnText}>Volver a la lista</Text>
            </TouchableOpacity>
          </>
        )}
        <DoorController ref={doorControllerRef} />
      </View>
    );
  }

  // ---- List screen ----
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')}>
          <Text style={styles.back}>Inicio</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {event?.eventName || 'Invitados del evento'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1E3A8A" />
          <Text style={styles.muted}>Cargando lista...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={loadRoster}>
            <Text style={styles.primaryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              Registrados {checkedInCount}/{guests.length}
            </Text>
            {event && (
              <Text style={styles.summaryText}>
                Entradas {event.entriesUsed}
                {event.guestCount != null ? `/${event.guestCount}` : ''}
              </Text>
            )}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar invitado..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          <FlatList
            data={filteredGuests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, gap: 8 }}
            ListEmptyComponent={
              <Text style={styles.muted}>No hay invitados que coincidan.</Text>
            }
            renderItem={({ item }) => {
              const done = !!item.checkedInAt;
              return (
                <TouchableOpacity
                  style={[styles.guestRow, done && styles.guestRowDone]}
                  onPress={() => handleSelectGuest(item)}
                  disabled={done}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>
                      {item.firstName} {item.lastName}
                    </Text>
                  </View>
                  {done ? (
                    <Text style={styles.badgeDone}>✓ Registrado</Text>
                  ) : (
                    <Text style={styles.badgePending}>Registrar →</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
      <DoorController ref={doorControllerRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: {
    height: 64,
    paddingHorizontal: 16,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B1220',
  },
  back: { color: '#93C5FD', fontWeight: '800', width: 60 },
  headerTitle: { color: '#fff', fontWeight: '900', flex: 1, textAlign: 'center' },
  camera: { flex: 1 },
  overlayContainer: { position: 'absolute', top: 64, left: 0, right: 0, bottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0B1220', gap: 12 },
  muted: { color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: '#fff' },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111C30',
  },
  summaryText: { color: '#CBD5E1', fontWeight: '800', fontSize: 13 },
  searchInput: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: '#1E293B',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
  },
  guestRowDone: { backgroundColor: '#E2E8F0', opacity: 0.85 },
  guestName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  badgeDone: { color: '#16A34A', fontWeight: '900', fontSize: 13 },
  badgePending: { color: '#2563EB', fontWeight: '900', fontSize: 13 },
  successTitle: { fontSize: 26, fontWeight: '900', color: '#16A34A', textAlign: 'center' },
  limitTitle: { fontSize: 20, fontWeight: '900', color: '#DC2626', textAlign: 'center' },
  resultName: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 6 },
  counterText: { fontSize: 15, fontWeight: '700', color: '#CBD5E1', textAlign: 'center', marginTop: 4 },
  openBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  openBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryBtn: {
    backgroundColor: '#475569',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  secondaryBtnText: { color: '#fff', fontWeight: '800' },
  primaryBtn: { backgroundColor: '#1E3A8A', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  errorText: { color: '#FCA5A5', fontWeight: '700', textAlign: 'center' },
});
