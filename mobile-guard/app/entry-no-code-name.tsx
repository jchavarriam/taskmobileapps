import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';

const CustomKeyboard = ({ onKeyPress, onBackspace, onSpace }: {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
}) => {
  const rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  return (
    <View style={styles.keyboardContainer}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keyboardRow}>
          {rowIndex === 2 && (
            <TouchableOpacity style={styles.spaceKey} onPress={onSpace}>
              <Text style={styles.keyText}>ESPACIO</Text>
            </TouchableOpacity>
          )}
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.key}
              onPress={() => onKeyPress(key)}
            >
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          ))}
          {rowIndex === 2 && (
            <TouchableOpacity style={styles.backspaceKey} onPress={onBackspace}>
              <Text style={styles.keyText}>⌫</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};

export default function EntryNoCodeNameScreen() {
  const router = useRouter();
  const [visitorName, setVisitorName] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Speak instructions when component mounts
    const speakInstructions = async () => {
      setIsSpeaking(true);
      const options = {
        language: 'es',
        pitch: 1.0,
        rate: 0.8,
        volume: 0.8,
      };

      try {
        await Speech.speak('COLOQUE SU NOMBRE COMPLETO', options);
      } catch (error) {
        console.log('❌ Speech error:', error);
      } finally {
        setIsSpeaking(false);
      }
    };

    speakInstructions();
  }, []);

  const handleKeyPress = (key: string) => {
    setVisitorName(prev => prev + key);
  };

  const handleBackspace = () => {
    setVisitorName(prev => prev.slice(0, -1));
  };

  const handleSpace = () => {
    setVisitorName(prev => prev + ' ');
  };

  const handleContinue = () => {
    if (!visitorName.trim()) {
      Alert.alert('Error', 'Por favor ingrese el nombre completo del visitante');
      return;
    }

    // Navigate to ID capture with visitor name
    router.push({
      pathname: '/entry-no-code-id',
      params: { visitorName: visitorName.trim() }
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Text style={styles.back}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entrada sin Código</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionTitle}>Datos del Visitante</Text>
          <Text style={styles.instructionSubtitle}>
            Por favor, ingrese el nombre completo del visitante
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre Completo</Text>
          <TextInput
            ref={textInputRef}
            style={styles.nameInput}
            value={visitorName}
            onChangeText={setVisitorName}
            placeholder="Ej: Juan Pérez García"
            placeholderTextColor="#94A3B8"
            multiline={false}
            maxLength={100}
            autoFocus={true}
            selectionColor="#1E3A8A"
            showSoftInputOnFocus={false} // Disable default keyboard
            editable={false} // Make input read-only since we use custom keyboard
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !visitorName.trim() && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!visitorName.trim()}
        >
          <Text style={styles.continueButtonText}>
            {isSpeaking ? 'Hablando...' : 'Continuar'}
          </Text>
        </TouchableOpacity>

        <View style={styles.keyboardWrapper}>
          <CustomKeyboard
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onSpace={handleSpace}
          />
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
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 20, // Reduced padding
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 40,
  },
  label: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    minHeight: 60,
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
  keyboardWrapper: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderRadius: 12,
  },
  keyboardContainer: {
    padding: 8,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  key: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    width: 30,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  spaceKey: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginRight: 8,
  },
  backspaceKey: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    width: 50,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    marginLeft: 8,
  },
  keyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});
