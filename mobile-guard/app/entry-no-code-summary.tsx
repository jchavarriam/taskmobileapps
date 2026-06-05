import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createApprovalRequest } from '@/lib/api';
import { consumePendingApprovalUpload } from '@/lib/entry-no-code-draft';
import * as Speech from 'expo-speech';
import { preparePhotoForUpload } from '@/lib/photo-upload';

export default function EntryNoCodeSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [visitorName] = useState(String(params.visitorName || ''));
  const [idPhotoUri] = useState(String(params.idPhotoUri || params.idPhoto || ''));
  const [areaId] = useState(String(params.areaId || ''));
  const [areaName] = useState(String(params.areaName || ''));
  const [sectorId] = useState(String(params.sectorId || ''));
  const [sectorName] = useState(String(params.sectorName || ''));
  const [submitting, setSubmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
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
      await Speech.speak('Notificando a Residente, Esperando por Aprobacion', options);
    } catch (error) {
      console.log('❌ Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      console.log('📤 Creating approval request...');
      console.log('👤 Visitor:', visitorName);
      console.log('📍 Area:', areaName);
      console.log('🏢 Sector:', sectorName);

      if (!idPhotoUri) {
        throw new Error('No se encontró la foto del visitante');
      }

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
        sectorId: sectorId,
        photoUri: optimized.uri,
        mediaKey: mediaKey || undefined,
      });

      const requestId = String(res?.requestId ?? '');
      if (!requestId) {
        throw new Error('No se recibió ID de solicitud');
      }

      console.log('✅ Approval request created:', requestId);

      // Navigate to wait approval screen
      router.replace({
        pathname: '/wait-approval',
        params: {
          requestId: requestId,
          visitorName: visitorName,
          areaName: areaName,
          sectorName: sectorName
        }
      });

    } catch (err) {
      console.log('❌ Error creating approval request:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'No se pudo enviar la solicitud'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleEdit = () => {
    // Go back to name screen to edit
    router.push({
      pathname: '/entry-no-code-name',
      params: { visitorName: visitorName }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrada sin Código</Text>
        <TouchableOpacity onPress={handleEdit}>
          <Text style={styles.edit}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen de Visita</Text>

          {/* Visitor Photo */}
          {idPhotoUri && (
            <View style={styles.photoContainer}>
              <Image
                source={{ uri: idPhotoUri }}
                style={styles.visitorPhoto}
                resizeMode="cover"
              />
              <Text style={styles.photoLabel}>Foto del Visitante</Text>
            </View>
          )}

          {/* Visit Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Nombre:</Text>
              <Text style={styles.detailValue}>{visitorName}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Área:</Text>
              <Text style={styles.detailValue}>{areaName}</Text>
            </View>

            <View style={[styles.detailItem, styles.detailItemLastChild]}>
              <Text style={styles.detailLabel}>Sector:</Text>
              <Text style={styles.detailValue}>{sectorName}</Text>
            </View>
          </View>

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <ActivityIndicator color="#1E3A8A" size="small" />
            <Text style={styles.statusText}>
              {isSpeaking ? '🔊 Notificando...' : '📧 Esperando aprobación'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Enviando...' : 'Enviar para Aprobación'}
            </Text>
          </TouchableOpacity>
        </View>
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
  summaryContainer: {
    flex: 1,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 24,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  visitorPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  photoLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailItemLastChild: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    marginTop: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 12,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  submitButton: {
    backgroundColor: '#16A34A',
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
  submitButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
});
