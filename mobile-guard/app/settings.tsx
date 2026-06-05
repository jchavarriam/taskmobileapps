import { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { getServerUrl, setServerUrl, getControllerIp, setControllerIp, getDoorNumber, setDoorNumber, getMode, setMode, getControllerUsername, setControllerUsername, getControllerPassword, setControllerPassword, getAuthToken, GaritaMode, getAppMode, setAppMode, GuardAppMode, getControllerIp2, setControllerIp2, getDoorNumber2, setDoorNumber2, getControllerUsername2, setControllerUsername2, getControllerPassword2, setControllerPassword2 } from '@/lib/storage';
import { apiCall } from '@/lib/api';
import { DoorController, DoorControllerRef } from '../components/DoorController';
import { runNetworkDiagnostics } from '@/lib/network-test';

const CONFIG_PASSWORD = 'TASConfig1996';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const doorControllerRef = useRef<DoorControllerRef>(null);

  const [serverUrl, setServerUrlState] = useState('');
  const [controllerIp, setControllerIpState] = useState('');
  const [controllerUsername, setControllerUsernameState] = useState('');
  const [controllerPassword, setControllerPasswordState] = useState('');
  const [doorNumber, setDoorNumberState] = useState('');
  const [mode, setModeState] = useState<GaritaMode>('ENTRY');
  const [appMode, setAppModeState] = useState<GuardAppMode>('GUARDIA');
  const [controllerIp2, setControllerIp2State] = useState('');
  const [controllerUsername2, setControllerUsername2State] = useState('');
  const [controllerPassword2, setControllerPassword2State] = useState('');
  const [doorNumber2, setDoorNumber2State] = useState('');

  const normalizeServerEndpoint = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    return withProtocol.replace(/\/$/, '');
  };

  useEffect(() => {
    (async () => {
      const url = await getServerUrl() || '';
      setServerUrlState(url);

      setControllerIpState(await getControllerIp() || '');
      setControllerUsernameState(await getControllerUsername() || '');
      setControllerPasswordState(await getControllerPassword() || '');
      setDoorNumberState(await getDoorNumber() || '');
      setModeState(await getMode() || 'ENTRY');
      setAppModeState(await getAppMode() || 'GUARDIA');
      setControllerIp2State(await getControllerIp2() || '');
      setControllerUsername2State(await getControllerUsername2() || '');
      setControllerPassword2State(await getControllerPassword2() || '');
      setDoorNumber2State(await getDoorNumber2() || '');
    })();
  }, []);

  const handleUnlock = () => {
    if (password === CONFIG_PASSWORD) {
      setUnlocked(true);
      setPassword('');
    } else {
      Alert.alert('Error', 'Contraseña incorrecta');
    }
  };

  const handleSave = async () => {
    try {
      const normalizedServerUrl = normalizeServerEndpoint(serverUrl);
      await setServerUrl(normalizedServerUrl);
      setServerUrlState(normalizedServerUrl);
      await setControllerIp(controllerIp);
      await setDoorNumber(doorNumber);
      await setMode(mode);
      await setAppMode(appMode);
      await setControllerUsername(controllerUsername);
      await setControllerPassword(controllerPassword);
      await setControllerIp2(controllerIp2);
      await setDoorNumber2(doorNumber2);
      await setControllerUsername2(controllerUsername2);
      await setControllerPassword2(controllerPassword2);
      Alert.alert('Éxito', 'Configuración guardada', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  const testServerConnection = async (baseUrl: string, token?: string) => {
    const result = {
      reachability: 'fail' as 'ok' | 'fail',
      auth: 'skipped' as 'ok' | 'missing-token' | 'unauthorized' | 'error' | 'skipped',
      healthStatusCode: 0,
      guardStatusCode: 0,
      healthLatencyMs: 0,
      guardLatencyMs: 0,
      message: '',
      timestamp: new Date().toISOString(),
    };

    const normalizedUrl = baseUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      result.message = 'Server URL must start with http:// or https://';
      return result;
    }

    // Test 1: Health check (no auth required)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const startTime = Date.now();
      const healthResponse = await fetch(`${normalizedUrl}/api/health`, {
        signal: controller.signal,
      });
      const healthLatency = Date.now() - startTime;
      clearTimeout(timeoutId);

      result.healthStatusCode = healthResponse.status;
      result.healthLatencyMs = healthLatency;

      if (healthResponse.ok) {
        result.reachability = 'ok';
        const healthData = await healthResponse.json();
        console.log('Health response:', healthData);
      } else {
        result.message = `Health check failed: HTTP ${healthResponse.status}`;
        return result;
      }
    } catch (error) {
      result.message = `Server unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`;
      return result;
    }

    // Test 2: Guard auth (if token exists)
    if (!token) {
      result.auth = 'missing-token';
      result.message = 'Server reachable, login required for guard APIs';
      return result;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const startTime = Date.now();
      const guardResponse = await fetch(`${normalizedUrl}/api/guard/site-map`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      const guardLatency = Date.now() - startTime;
      clearTimeout(timeoutId);

      result.guardStatusCode = guardResponse.status;
      result.guardLatencyMs = guardLatency;

      if (guardResponse.ok) {
        result.auth = 'ok';
        result.message = 'Server + auth OK';
      } else if (guardResponse.status === 401 || guardResponse.status === 403) {
        result.auth = 'unauthorized';
        result.message = 'Server OK, session expired/unauthorized';
      } else {
        result.auth = 'error';
        result.message = `Server OK, guard endpoint error: HTTP ${guardResponse.status}`;
      }
    } catch (error) {
      result.auth = 'error';
      result.message = `Guard API error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  };

  const [testResult, setTestResult] = useState<string>('');

  const handleTestServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Server URL es requerido para la prueba');
      return;
    }

    try {
      const normalizedServerUrl = normalizeServerEndpoint(serverUrl);
      setServerUrlState(normalizedServerUrl);
      setTestResult('Testing server connection...');
      const token = await getAuthToken();
      const result = await testServerConnection(normalizedServerUrl, token || undefined);

      const status = {
        color: result.reachability === 'ok' && (result.auth === 'ok' || result.auth === 'missing-token') ? '#16A34A' :
          result.reachability === 'ok' ? '#F59E0B' : '#DC2626',
        icon: result.reachability === 'ok' && (result.auth === 'ok' || result.auth === 'missing-token') ? '✅' :
          result.reachability === 'ok' ? '⚠️' : '❌',
      };

      const details = `
${status.icon} ${result.message}

📊 Details:
    • URL: ${normalizedServerUrl}
• Health: ${result.healthStatusCode} (${result.healthLatencyMs}ms)
• Auth: ${result.auth.toUpperCase()}
${result.guardStatusCode > 0 ? `• Guard: ${result.guardStatusCode} (${result.guardLatencyMs}ms)` : ''}
• Time: ${new Date(result.timestamp).toLocaleString()}
      `.trim();

      setTestResult(details);
    } catch (error) {
      const errorMsg = `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setTestResult(errorMsg);
    }
  };

  const handleNetworkDiagnostics = async () => {
    Alert.alert(
      'Network Diagnostics',
      'Running comprehensive network tests...',
      [{ text: 'OK' }]
    );

    try {
      await runNetworkDiagnostics();
      Alert.alert(
        'Diagnostics Complete',
        'Check console logs for detailed results.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Diagnostics Failed',
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestController = async () => {
    if (!controllerIp.trim() || !controllerUsername.trim() || !controllerPassword.trim() || !doorNumber.trim()) {
      Alert.alert('Error', 'Configuración del controlador incompleta');
      return;
    }

    try {
      Alert.alert('Probando', 'Enviando comando al controlador...');
      const result = await doorControllerRef.current?.openDoor(
        controllerIp,
        doorNumber,
        controllerUsername,
        controllerPassword
      );

      if (result && result.success) {
        Alert.alert('✅ Éxito', result.message);
      } else {
        Alert.alert('❌ Error', result?.message || 'Error desconocido');
      }
    } catch (error: any) {
      Alert.alert('Error', `Fallo en controlador: ${error.message}`);
    }
  };

  const handleTestController2 = async () => {
    if (!controllerIp2.trim() || !controllerUsername2.trim() || !controllerPassword2.trim() || !doorNumber2.trim()) {
      Alert.alert('Error', 'Configuración del segundo controlador incompleta');
      return;
    }

    try {
      Alert.alert('Probando', 'Enviando comando al segundo controlador...');
      const result = await doorControllerRef.current?.openDoor(
        controllerIp2,
        doorNumber2,
        controllerUsername2,
        controllerPassword2
      );

      if (result && result.success) {
        Alert.alert('✅ Éxito', result.message);
      } else {
        Alert.alert('❌ Error', result?.message || 'Error desconocido');
      }
    } catch (error: any) {
      Alert.alert('Error', `Fallo en segundo controlador: ${error.message}`);
    }
  };

  if (!unlocked) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Configuración</Text>
        <Text style={styles.subtitle}>Ingrese la contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleUnlock}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Configuración</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servidor</Text>
        <TextInput
          style={styles.input}
          placeholder="URL o IP completa (ej: http://179.63.252.22:4100 o https://taskontrol-saas.vercel.app)"
          value={serverUrl}
          onChangeText={setServerUrlState}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Controlador</Text>
        <TextInput
          style={styles.input}
          placeholder="IP del controlador"
          value={controllerIp}
          onChangeText={setControllerIpState}
        />
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          value={controllerUsername}
          onChangeText={setControllerUsernameState}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={controllerPassword}
          onChangeText={setControllerPasswordState}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Número de puerta"
          value={doorNumber}
          onChangeText={setDoorNumberState}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modo de Atención</Text>
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[styles.modeButton, appMode === 'KIOSKO' && styles.modeButtonActive]}
            onPress={() => setAppModeState('KIOSKO')}
          >
            <Text style={[styles.modeButtonText, appMode === 'KIOSKO' && styles.modeButtonTextActive]}>Kiosko</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, appMode === 'GUARDIA' && styles.modeButtonActive]}
            onPress={() => setAppModeState('GUARDIA')}
          >
            <Text style={[styles.modeButtonText, appMode === 'GUARDIA' && styles.modeButtonTextActive]}>Guardia</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modo</Text>
        {appMode === 'GUARDIA' && (
          <Text style={styles.noteText}>En Modo Guardia, esta selección no afecta la pantalla principal.</Text>
        )}
        <View style={styles.modeButtons}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'ENTRY' && styles.modeButtonActive]}
            onPress={() => setModeState('ENTRY')}
          >
            <Text style={[styles.modeButtonText, mode === 'ENTRY' && styles.modeButtonTextActive]}>Entrada</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'EXIT' && styles.modeButtonActive]}
            onPress={() => setModeState('EXIT')}
          >
            <Text style={[styles.modeButtonText, mode === 'EXIT' && styles.modeButtonTextActive]}>Salida</Text>
          </TouchableOpacity>
        </View>
      </View>

      {appMode === 'GUARDIA' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segundo Controlador (Salida Manual)</Text>
          <TextInput
            style={styles.input}
            placeholder="IP del segundo controlador"
            value={controllerIp2}
            onChangeText={setControllerIp2State}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario (segundo controlador)"
            value={controllerUsername2}
            onChangeText={setControllerUsername2State}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña (segundo controlador)"
            value={controllerPassword2}
            onChangeText={setControllerPassword2State}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            placeholder="Número de puerta (segundo controlador)"
            value={doorNumber2}
            onChangeText={setDoorNumber2State}
          />
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Guardar</Text>
      </TouchableOpacity>

      <View style={styles.testSection}>
        <Text style={styles.testSectionTitle}>Pruebas</Text>

        <TouchableOpacity style={styles.testButton} onPress={handleTestServer}>
          <Text style={styles.testButtonText}>Probar Servidor</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.testButton, { backgroundColor: '#6366F1' }]} onPress={handleNetworkDiagnostics}>
          <Text style={styles.testButtonText}>Network Diagnostics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={handleTestController}>
          <Text style={styles.testButtonText}>Probar Controlador</Text>
        </TouchableOpacity>

        {appMode === 'GUARDIA' && (
          <TouchableOpacity style={styles.testButton} onPress={handleTestController2}>
            <Text style={styles.testButtonText}>Probar Segundo Controlador</Text>
          </TouchableOpacity>
        )}

        {testResult ? (
          <View style={styles.testResult}>
            <Text style={styles.testResultText}>{testResult}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Hidden Door Controller */}
      <DoorController
        ref={doorControllerRef}
      />

      {/* Bottom padding for sign out button visibility */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 26,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#1E3A8A',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  testSection: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  testSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 16,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  testResult: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testResultText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  noteText: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 8,
  },
});
