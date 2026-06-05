import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';

export default function EntryNoCodeRejectedScreen() {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    speakRejectionMessage();
    
    // Auto-return to home after 5 seconds
    const timer = setTimeout(() => {
      router.replace('/home');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const speakRejectionMessage = async () => {
    setIsSpeaking(true);
    const options = {
      language: 'es',
      pitch: 1.0,
      rate: 0.8,
      volume: 0.8,
    };
    
    try {
      await Speech.speak('Visita fue Rechazada, comunicarse con residente', options);
    } catch (error) {
      console.log('❌ Speech error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleReturnHome = () => {
    router.replace('/home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Rejection Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.rejectionIcon}>❌</Text>
        </View>

        {/* Rejection Message */}
        <Text style={styles.rejectionTitle}>VISITA RECHAZADA</Text>
        
        <Text style={styles.rejectionSubtitle}>
          El residente ha rechazado la solicitud de visita
        </Text>

        {/* Instructions */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>¿Qué hacer?</Text>
          <Text style={styles.instructionText}>
            Comuníquese directamente con el residente para coordinar la visita
          </Text>
        </View>

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isSpeaking ? '🔊 Hablando...' : '📞 Contacte al residente'}
          </Text>
        </View>

        {/* Auto-return notice */}
        <View style={styles.autoReturnContainer}>
          <Text style={styles.autoReturnText}>
            Regresando automáticamente al inicio en 5 segundos...
          </Text>
        </View>
      </View>

      {/* Manual Return Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.returnButton}
          onPress={handleReturnHome}
        >
          <Text style={styles.returnButtonText}>Volver al Inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEE2E2', // Red background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  rejectionIcon: {
    fontSize: 80,
    textAlign: 'center',
  },
  rejectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 16,
    textAlign: 'center',
  },
  rejectionSubtitle: {
    fontSize: 18,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  instructionContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#7F1D1D',
    textAlign: 'center',
    lineHeight: 24,
  },
  statusContainer: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
  },
  autoReturnContainer: {
    marginTop: 16,
  },
  autoReturnText: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 20,
  },
  returnButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  returnButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
});
