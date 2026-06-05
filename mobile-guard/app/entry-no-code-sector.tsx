import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createApprovalRequest, getCachedSiteMap, getSiteMap } from '@/lib/api';
import { consumePendingApprovalUpload, clearEntryNoCodeDraft, getEntryNoCodeDraft } from '@/lib/entry-no-code-draft';
import * as Speech from 'expo-speech';
import { preparePhotoForUpload } from '@/lib/photo-upload';

type SectorOption = { id: string; name: string; fullLabel: string };

export default function EntryNoCodeSectorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const toParamString = (value: string | string[] | undefined) => {
    if (Array.isArray(value)) return String(value[0] || '');
    return String(value || '');
  };

  const visitorName = toParamString(params.visitorName as string | string[] | undefined);
  const routeIdPhotoUri = toParamString(
    (params.idPhotoUri as string | string[] | undefined)
    || (params.idPhoto as string | string[] | undefined)
  );
  const draft = getEntryNoCodeDraft();
  const idPhotoUri = draft.idPhotoUri || routeIdPhotoUri;
  const areaId = toParamString(params.areaId as string | string[] | undefined);
  const areaName = toParamString(params.areaName as string | string[] | undefined);
  const subAreaId = toParamString(params.subAreaId as string | string[] | undefined);
  const subAreaName = toParamString(params.subAreaName as string | string[] | undefined);
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSectors();
    speakInstructions();
  }, [areaId]);

  const speakInstructions = async () => {
    setIsSpeaking(true);
    const options = {
      language: 'es',
      pitch: 1.0,
      rate: 0.8,
      volume: 0.8,
    };

    try {
      await Speech.speak('Seleccione Sector a Visitar', options);
    } catch (error) {
      console.log('❌ Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const loadSectors = async () => {
    try {
      console.log('🏢 Starting to load sectors for area:', areaId);
      const cached = getCachedSiteMap();
      if (!cached) {
        setLoading(true);
      }

      console.log('🌐 Calling getSiteMap API for sectors...');
      const res: any = cached ?? await getSiteMap();
      console.log('📊 SiteMap response for sectors:', res);

      const sectorsList: SectorOption[] = [];

      const areas = res?.site?.areas ?? res?.areas ?? [];
      console.log('🏢 Total areas in response:', areas.length);

      const targetArea = areas.find((a: any) => a.id === areaId);
      console.log('🎯 Target area found:', targetArea);

      if (targetArea) {
        if (subAreaId) {
          const selectedSubArea = (targetArea.subAreas ?? []).find((sub: any) => sub.id === subAreaId);
          for (const sector of selectedSubArea?.sectors ?? []) {
            sectorsList.push({
              id: sector.id,
              name: sector.name,
              fullLabel: sector.fullLabel || sector.name,
            });
          }
        } else {
          for (const sector of targetArea.sectors ?? []) {
            sectorsList.push({
              id: sector.id,
              name: sector.name,
              fullLabel: sector.fullLabel || sector.name,
            });
          }
        }
      } else {
        console.log('❌ Area not found with ID:', areaId);
      }

      console.log('✅ Final sectors list:', sectorsList);
      setSectors(sectorsList);
      console.log('🏢 Sectors loaded for area', areaName, ':', sectorsList.length);
    } catch (err) {
      console.log('❌ Error loading sectors:', err);
      console.log('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack',
        areaId: areaId,
        areaName: areaName
      });
      Alert.alert('Error', 'No se pudieron cargar los sectores');
    } finally {
      setLoading(false);
    }
  };

  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);
  };

  const handleContinue = async () => {
    if (!selectedSector) {
      Alert.alert('Error', 'Por favor seleccione un sector');
      return;
    }

    const selectedSectorData = sectors.find(s => s.id === selectedSector);
    if (!selectedSectorData) {
      Alert.alert('Error', 'Sector no válido');
      return;
    }

    if (!idPhotoUri) {
      Alert.alert('Error', 'No se encontró la foto del documento');
      return;
    }

    try {
      setSubmitting(true);

      // Optimize photo first (may take several seconds on large source images)
      const optimized = await preparePhotoForUpload(idPhotoUri);

      // After blocking optimization, the pre-upload has had plenty of time — race with 3s grace
      const pending = consumePendingApprovalUpload();
      let mediaKey: string | null = null;
      if (pending) {
        mediaKey = await Promise.race([
          pending,
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
      }

      const res: any = await createApprovalRequest({
        flow: 'ENTRY',
        visitorName: visitorName.trim(),
        sectorId: selectedSector,
        photoUri: optimized.uri,
        mediaKey: mediaKey || undefined,
      });

      const requestId = String(res?.requestId ?? res?.request?.id ?? '');
      if (!requestId) {
        throw new Error('No se recibió ID de solicitud');
      }

      clearEntryNoCodeDraft();

      router.replace({
        pathname: '/wait-approval',
        params: {
          requestId,
          visitorName,
          areaName,
          sectorName: selectedSectorData.name,
        }
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.back}>Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Entrada sin Código</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#1E3A8A" size="large" />
          <Text style={styles.loadingText}>Cargando sectores...</Text>
        </View>
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

      <View style={styles.content}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>Selección de Sector</Text>
          <Text style={styles.instructionSubtitle}>
            Área: {areaName}
          </Text>
          {!!subAreaName && (
            <Text style={styles.instructionSubtitle}>
              Sub-sector: {subAreaName}
            </Text>
          )}
          <Text style={styles.instructionSubtext}>
            Seleccione el sector específico a visitar
          </Text>
          {isSpeaking && (
            <Text style={styles.speakingIndicator}>🔊 Hablando...</Text>
          )}
        </View>

        <View style={styles.listContainer}>
          <ScrollView style={styles.sectorList} showsVerticalScrollIndicator={false}>
            {sectors.map((sector) => (
              <TouchableOpacity
                key={sector.id}
                style={[
                  styles.sectorItem,
                  selectedSector === sector.id && styles.sectorItemSelected
                ]}
                onPress={() => handleSectorSelect(sector.id)}
              >
                <Text style={[
                  styles.sectorText,
                  selectedSector === sector.id && styles.sectorTextSelected
                ]}>
                  {sector.fullLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedSector || submitting) && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedSector || submitting}
        >
          <Text style={styles.continueButtonText}>
            {submitting ? 'Enviando...' : isSpeaking ? 'Hablando...' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 64,
    paddingHorizontal: 16,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A8A',
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
  content: {
    flex: 1,
    padding: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionSubtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 4,
    textAlign: 'center',
  },
  instructionSubtext: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  speakingIndicator: {
    fontSize: 14,
    color: '#16A34A',
    marginTop: 8,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    marginBottom: 20,
  },
  sectorList: {
    flex: 1,
  },
  sectorItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  sectorItemSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  sectorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  sectorTextSelected: {
    color: '#fff',
  },
  continueButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
});
