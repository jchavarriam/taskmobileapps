import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCachedSiteMap, getSiteMap } from '@/lib/api';
import * as Speech from 'expo-speech';

type AreaOption = { id: string; name: string; fullLabel: string; subAreas: Array<{ id: string; name: string }> };

export default function EntryNoCodeAreaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [visitorName] = useState(String(params.visitorName || ''));
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    loadAreas();
    speakInstructions();
  }, []);

  const speakInstructions = async () => {
    setIsSpeaking(true);
    const options = {
      language: 'es',
      pitch: 1.0,
      rate: 0.8,
      volume: 0.8,
    };

    try {
      await Speech.speak('Seleccione Area a Visitar', options);
    } catch (error) {
      console.log('❌ Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const loadAreas = async () => {
    try {
      console.log('📍 Starting to load areas...');
      const cached = getCachedSiteMap();
      if (!cached) {
        setLoading(true);
      }

      console.log('🌐 Calling getSiteMap API...');
      const res: any = cached ?? await getSiteMap();
      console.log('📊 SiteMap response:', res);

      const areasList: AreaOption[] = [];

      const areaRows = res?.site?.areas ?? res?.areas ?? [];
      console.log('🏢 Areas found:', areaRows.length);

      for (const area of areaRows) {
        console.log('📍 Processing area:', area);
        areasList.push({
          id: area.id,
          name: area.name,
          fullLabel: area.fullLabel || area.name,
          subAreas: Array.isArray(area.subAreas) ? area.subAreas : [],
        });
      }

      console.log('✅ Final areas list:', areasList);
      setAreas(areasList);
      console.log('📍 Areas loaded successfully:', areasList.length);
    } catch (err) {
      console.log('❌ Error loading areas:', err);
      console.log('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack'
      });
      Alert.alert('Error', 'No se pudieron cargar las áreas');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaSelect = (areaId: string) => {
    setSelectedArea(areaId);
  };

  const handleContinue = () => {
    if (!selectedArea) {
      Alert.alert('Error', 'Por favor seleccione un área');
      return;
    }

    const selectedAreaData = areas.find(a => a.id === selectedArea);
    if (!selectedAreaData) {
      Alert.alert('Error', 'Área no válida');
      return;
    }

    if (selectedAreaData.subAreas.length > 0) {
      router.replace({
        pathname: '/entry-no-code-sub-area',
        params: {
          visitorName: visitorName,
          areaId: selectedArea,
          areaName: selectedAreaData.name,
        }
      });
      return;
    }

    router.replace({
      pathname: '/entry-no-code-sector',
      params: {
        visitorName: visitorName,
        areaId: selectedArea,
        areaName: selectedAreaData.name,
      }
    });
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
          <Text style={styles.loadingText}>Cargando áreas...</Text>
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
          <Text style={styles.instructionTitle}>Selección de Área</Text>
          <Text style={styles.instructionSubtitle}>
            Seleccione el área que el visitante desea visitar
          </Text>
          {isSpeaking && (
            <Text style={styles.speakingIndicator}>🔊 Hablando...</Text>
          )}
        </View>

        <View style={styles.listContainer}>
          <ScrollView style={styles.areaList} showsVerticalScrollIndicator={false}>
            {areas.map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.areaItem,
                  selectedArea === area.id && styles.areaItemSelected
                ]}
                onPress={() => handleAreaSelect(area.id)}
              >
                <Text style={[
                  styles.areaText,
                  selectedArea === area.id && styles.areaTextSelected
                ]}>
                  {area.fullLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedArea && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!selectedArea}
        >
          <Text style={styles.continueButtonText}>
            {isSpeaking ? 'Hablando...' : 'Continuar'}
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
    marginBottom: 24,
  },
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionSubtitle: {
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
  areaList: {
    flex: 1,
  },
  areaItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  areaItemSelected: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  areaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  areaTextSelected: {
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
