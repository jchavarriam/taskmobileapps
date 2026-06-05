import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createApprovalRequest, getSiteMap } from '@/lib/api';
import { OPTIMIZED_CAPTURE_OPTIONS } from '@/lib/capture-options';
import { preparePhotoForUpload } from '@/lib/photo-upload';

type SectorOption = { id: string; fullLabel: string };

export default function EntryNoCodeScreen() {
  const router = useRouter();
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [visitorName, setVisitorName] = useState('');
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [sectorId, setSectorId] = useState<string>('');

  const [loadingMap, setLoadingMap] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission]);

  const loadMap = async () => {
    try {
      setLoadingMap(true);
      const res: any = await getSiteMap();
      const areas = res?.site?.areas ?? res?.areas ?? [];
      const list: SectorOption[] = [];
      for (const a of areas) {
        for (const s of a.sectors ?? []) {
          list.push({ id: s.id, fullLabel: s.fullLabel });
        }
        for (const sa of a.subAreas ?? []) {
          for (const s of sa.sectors ?? []) {
            list.push({ id: s.id, fullLabel: s.fullLabel });
          }
        }
      }
      setSectors(list);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cargar');
    } finally {
      setLoadingMap(false);
    }
  };

  useEffect(() => {
    loadMap();
  }, []);

  const submit = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Error', 'Ingrese el nombre');
      return;
    }
    if (!sectorId) {
      Alert.alert('Error', 'Seleccione un sector');
      return;
    }

    try {
      setSubmitting(true);
      if (!cameraReady) {
        Alert.alert('Error', 'La cámara aún no está lista. Intente de nuevo.');
        return;
      }

      let photo = await camRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      if (!photo?.uri) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        photo = await camRef.current?.takePictureAsync(OPTIMIZED_CAPTURE_OPTIONS);
      }
      if (!photo?.uri) {
        Alert.alert('Error', 'No se pudo tomar la foto');
        return;
      }

      const optimized = await preparePhotoForUpload(photo.uri);

      const res: any = await createApprovalRequest({
        flow: 'ENTRY',
        visitorName: visitorName.trim(),
        sectorId,
        photoUri: optimized.uri,
      });

      const requestId = String(res?.requestId ?? '');
      if (!requestId) throw new Error('No requestId');

      router.replace({ pathname: '/wait-approval', params: { requestId } });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar');
    } finally {
      setSubmitting(false);
    }
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
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrada sin Código</Text>
        <View style={{ width: 60 }} />
      </View>

      <CameraView ref={camRef} style={styles.camera} facing="front" onCameraReady={() => setCameraReady(true)} />

      <View style={styles.panel}>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={visitorName}
          onChangeText={setVisitorName}
          placeholder="Nombre del visitante"
        />

        <Text style={styles.label}>Sector</Text>
        {loadingMap ? (
          <View style={styles.row}>
            <ActivityIndicator color="#1E3A8A" />
            <Text style={styles.small}>Cargando...</Text>
          </View>
        ) : (
          <ScrollView style={styles.sectorList}>
            {sectors.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sectorItem, sectorId === s.id && styles.sectorItemActive]}
                onPress={() => setSectorId(s.id)}
              >
                <Text style={[styles.sectorText, sectorId === s.id && styles.sectorTextActive]}>
                  {s.fullLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity style={[styles.submit, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? 'Enviando...' : 'Enviar a Aprobación'}</Text>
        </TouchableOpacity>
      </View>
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
  },
  back: { color: '#93C5FD', fontWeight: '800', width: 60 },
  headerTitle: { color: '#fff', fontWeight: '900' },
  camera: { flex: 1 },
  panel: {
    position: 'absolute',
    top: 70,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    padding: 14,
    maxHeight: '82%',
  },
  label: { color: '#0F172A', fontWeight: '900', marginTop: 6, marginBottom: 6 },
  input: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12 },
  sectorList: { maxHeight: 210, borderRadius: 10, marginBottom: 10 },
  sectorItem: { padding: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  sectorItemActive: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
  sectorText: { color: '#0F172A', fontWeight: '800' },
  sectorTextActive: { color: '#fff' },
  submit: { backgroundColor: '#16A34A', borderRadius: 10, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  small: { color: '#334155', fontWeight: '700' },
  center: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '900', marginBottom: 12, color: '#1E3A8A' },
  button: { backgroundColor: '#1E3A8A', padding: 14, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
