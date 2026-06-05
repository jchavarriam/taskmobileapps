import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getMode, GaritaMode, getAppMode, GuardAppMode } from '@/lib/storage';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<GaritaMode>('ENTRY');
  const [appMode, setAppMode] = useState<GuardAppMode>('GUARDIA');

  // Responsive design - detect screen size
  const { width, height } = Dimensions.get('window');
  const isSmallScreen = width < 375; // iPhone SE
  const isMediumScreen = width >= 375 && width < 414; // iPhone standard
  const isLargeScreen = width >= 414; // iPhone Plus, tablets

  // Responsive font sizes
  const getFontSize = () => {
    if (isSmallScreen) return 36;  // Smaller phones
    if (isMediumScreen) return 42; // Standard phones
    if (isLargeScreen) return 48;  // Large phones/tablets
    return 42; // Default
  };

  const getButtonPadding = () => {
    if (isSmallScreen) return 15;
    if (isMediumScreen) return 20;
    if (isLargeScreen) return 25;
    return 20;
  };

  useEffect(() => {
    (async () => {
      const [storedMode, storedAppMode] = await Promise.all([getMode(), getAppMode()]);
      setMode(storedMode);
      setAppMode(storedAppMode);
    })();
  }, []);


  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.configArea}
        onLongPress={() => router.push('/settings')}
        delayLongPress={1000}
      />
      {appMode === 'GUARDIA' ? (
        <>
          <TouchableOpacity style={styles.topButton} onPress={() => router.push('/entry-code')}>
            <Text style={[styles.topButtonText, { fontSize: getFontSize() }]}>Entrada con Código</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.middleButton} onPress={() => router.push('/exit-code')}>
            <Text style={[styles.middleButtonText, { fontSize: getFontSize() }]}>Salida</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton} onPress={() => router.push('/entry-no-code-name')}>
            <Text style={[styles.bottomButtonText, { fontSize: getFontSize() }]}>Entrada sin Código</Text>
          </TouchableOpacity>
        </>
      ) : mode === 'ENTRY' ? (
        <>
          <TouchableOpacity style={styles.topButton} onPress={() => router.push('/entry-code')}>
            <Text style={[styles.topButtonText, { fontSize: getFontSize() }]}>Entrada con Código</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton} onPress={() => router.push('/entry-no-code-name')}>
            <Text style={[styles.bottomButtonText, { fontSize: getFontSize() }]}>Entrada sin Código</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.topButton} onPress={() => router.push('/exit-code')}>
            <Text style={[styles.topButtonText, { fontSize: getFontSize() }]}>Salida con Código</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  configArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    zIndex: 1,
  },
  topButton: {
    flex: 1,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  topButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 42, // Will be overridden by responsive style
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  bottomButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
  },
  middleButton: {
    flex: 1,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  middleButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 42,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  bottomButtonText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 42, // Will be overridden by responsive style
    textAlign: 'center',
    paddingHorizontal: 10,
  },
});
