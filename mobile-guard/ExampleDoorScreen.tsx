// Example usage in entry-code.tsx
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DoorController, DoorControllerRef } from './components/DoorController';
import { getControllerIp, getDoorNumber, getControllerUsername, getControllerPassword } from './lib/storage';
import { guardEntryWithCode } from './lib/api';

export default function ExampleDoorScreen() {
  const router = useRouter();
  const doorControllerRef = useRef<DoorControllerRef>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenDoor = async () => {
    if (isOpening) return;
    
    setIsOpening(true);

    try {
      // Get controller settings from storage
      const [ip, door, username, password] = await Promise.all([
        getControllerIp(),
        getDoorNumber(),
        getControllerUsername(),
        getControllerPassword()
      ]);

      if (!ip || !door || !username || !password) {
        Alert.alert('Error', 'Controller configuration incomplete');
        return;
      }

      const result = await doorControllerRef.current?.openDoor(
        ip,
        door,
        username,
        password
      );

      if (result?.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result?.message || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Hidden WebView controller */}
      <DoorController ref={doorControllerRef} />

      {/* Open Door Button */}
      <TouchableOpacity
        style={[styles.doorButton, isOpening && styles.doorButtonDisabled]}
        onPress={handleOpenDoor}
        disabled={isOpening}
      >
        <Text style={styles.doorButtonText}>
          {isOpening ? '🔄 Opening...' : '🚪 Open Door'}
        </Text>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  doorButton: {
    backgroundColor: '#34C759',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 20,
  },
  doorButtonDisabled: {
    backgroundColor: '#999',
  },
  doorButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
