import { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { setServerUrl } from '@/lib/storage';
import { base64UrlDecode } from '@/lib/utils';

type AccountState = 'ACTIVE' | 'PENDING_ACTIVATION';

function resolveServerUrlFromActivationCode(activationCode: string): string {
    const [serverUrlPart] = activationCode.split(':');
    if (!serverUrlPart) {
        throw new Error('Código inválido');
    }

    const decoded = base64UrlDecode(serverUrlPart).trim();
    const withProtocol = /^https?:\/\//i.test(decoded) ? decoded : `http://${decoded}`;
    return withProtocol.replace(/\/+$/, '');
}

async function parseApiError(response: Response, fallbackMessage: string) {
    const raw = await response.text().catch(() => '');
    if (!raw) return fallbackMessage;

    try {
        const parsed = JSON.parse(raw);
        return parsed?.message || fallbackMessage;
    } catch {
        if (response.status === 404) {
            return 'El servidor no tiene disponible la validación de activación';
        }
        return fallbackMessage;
    }
}

export default function SiteActivation() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();

    const initialEmail = useMemo(() => {
        const value = typeof params.email === 'string' ? params.email : '';
        return value.trim().toLowerCase();
    }, [params.email]);

    const [email, setEmail] = useState(initialEmail);
    const [siteActivationCode, setSiteActivationCode] = useState('');
    const [password, setPassword] = useState('');
    const [accountState, setAccountState] = useState<AccountState | null>(null);
    const [loading, setLoading] = useState(false);

    const detectAccountState = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        const activationCode = siteActivationCode.trim();

        if (!normalizedEmail) {
            Alert.alert('Error', 'Ingresa el correo');
            return null;
        }

        if (!normalizedEmail.includes('@')) {
            Alert.alert('Error', 'El correo debe contener @');
            return null;
        }

        if (!activationCode) {
            Alert.alert('Error', 'Ingresa el Código de Activación del Sitio');
            return null;
        }

        let serverUrl = '';
        try {
            serverUrl = resolveServerUrlFromActivationCode(activationCode);
            await setServerUrl(serverUrl);
        } catch {
            Alert.alert('Error', 'Código de activación inválido');
            return null;
        }

        const statusRes = await fetch(`${serverUrl}/api/resident/activation/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, activationCode }),
        });

        if (!statusRes.ok) {
            const message = await parseApiError(statusRes, 'No se pudo validar la cuenta');
            Alert.alert('Error', message);
            return null;
        }

        const statusData = await statusRes.json().catch(() => ({}));
        if (!statusData?.success) {
            Alert.alert('Error', statusData?.message || 'No se pudo validar la cuenta');
            return null;
        }

        const nextState = statusData.accountState as AccountState;
        setAccountState(nextState);
        return { nextState, serverUrl, normalizedEmail, activationCode };
    };

    const handleContinue = async () => {
        setLoading(true);
        try {
            let state = accountState;
            let normalizedEmail = email.trim().toLowerCase();
            let activationCode = siteActivationCode.trim();
            let serverUrl = '';

            if (!state) {
                const detection = await detectAccountState();
                if (!detection) return;
                state = detection.nextState;
                normalizedEmail = detection.normalizedEmail;
                activationCode = detection.activationCode;
                serverUrl = detection.serverUrl;
                return;
            }

            if (!password) {
                Alert.alert('Error', state === 'ACTIVE' ? 'Ingresa tu contraseña actual' : 'Ingresa una nueva contraseña');
                return;
            }

            if (!serverUrl) {
                serverUrl = resolveServerUrlFromActivationCode(activationCode);
            }

            if (state === 'ACTIVE') {
                const loginRes = await fetch(`${serverUrl}/api/resident/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: normalizedEmail, password }),
                });
                const loginData = await loginRes.json().catch(() => ({}));
                if (!loginRes.ok || !loginData?.success) {
                    Alert.alert('Error', loginData?.message || 'Contraseña actual inválida');
                    return;
                }
            } else {
                if (password.length < 8) {
                    Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres');
                    return;
                }

                const activationRes = await fetch(`${serverUrl}/api/resident/activate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activationCode, newPassword: password }),
                });
                const activationData = await activationRes.json().catch(() => ({}));
                if (!activationRes.ok || !activationData?.success) {
                    Alert.alert('Error', activationData?.message || 'No se pudo activar la cuenta');
                    return;
                }
            }

            router.replace({ pathname: '/login', params: { email: normalizedEmail } });
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo continuar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.logo}>TAS-Kontrol</Text>
                    <Text style={styles.subtitle}>Residente</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.title}>{accountState ? 'Contraseña' : 'Código de Activación del Sitio'}</Text>
                    <Text style={styles.description}>
                        {accountState
                            ? (accountState === 'ACTIVE' ? 'Tu cuenta ya está activa, ingresa tu contraseña actual' : 'Tu cuenta no está activa, crea una nueva contraseña')
                            : 'Ingresa el código de activación del sitio recibido por correo'}
                    </Text>

                    {!accountState && (
                        <>
                            <TextInput
                                style={styles.codeInput}
                                placeholder="Código de Activación del Sitio"
                                value={siteActivationCode}
                                onChangeText={setSiteActivationCode}
                                multiline
                                numberOfLines={4}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                                <Text style={styles.backButtonText}>Volver</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {accountState && (
                        <TextInput
                            style={styles.input}
                            placeholder={accountState === 'ACTIVE' ? 'Contraseña actual' : 'Nueva contraseña'}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoCapitalize="none"
                        />
                    )}

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleContinue} disabled={loading}>
                        <Text style={styles.buttonText}>
                            {loading ? 'Procesando...' : 'Continuar'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    logo: { fontSize: 32, fontWeight: 'bold', color: '#1E3A8A' },
    subtitle: { fontSize: 18, color: '#64748B', marginTop: 4 },
    form: { width: '100%' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8 },
    description: { fontSize: 14, color: '#64748B', marginBottom: 24 },
    codeInput: {
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 16 },
    button: { backgroundColor: '#1E3A8A', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    backButton: {
        marginTop: -4,
        marginBottom: 12,
        paddingVertical: 6,
        alignItems: 'flex-start',
    },
    backButtonText: {
        color: '#1E3A8A',
        fontWeight: '700',
        fontSize: 14,
    },
});
