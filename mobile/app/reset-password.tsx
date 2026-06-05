import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getServerUrl } from '@/lib/storage';

function mapErrorCodeToMessage(errorCode: string | null): string {
    switch (errorCode) {
        case 'missing':
            return 'Completa todos los campos';
        case 'otp':
            return 'El OTP debe tener 6 dígitos';
        case 'weak':
            return 'La contraseña debe tener al menos 8 caracteres';
        case 'nomatch':
            return 'Las contraseñas no coinciden';
        case 'invalid':
            return 'OTP inválido o expirado';
        default:
            return 'No se pudo restablecer la contraseña';
    }
}

export default function ResetPassword() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();

    const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !otp || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Completa todos los campos');
            return;
        }

        const serverUrl = await getServerUrl();
        if (!serverUrl) {
            Alert.alert('Error', 'No hay servidor configurado');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('email', normalizedEmail);
            formData.append('otp', otp.trim());
            formData.append('newPassword', newPassword);
            formData.append('confirmPassword', confirmPassword);

            const response = await fetch(`${serverUrl}/api/resident/auth/reset-password`, {
                method: 'POST',
                body: formData,
            });

            const finalUrl = response.url || '';
            if (finalUrl.includes('/resident/login?ok=reset')) {
                Alert.alert('Éxito', 'Contraseña restablecida. Inicia sesión.');
                router.replace({ pathname: '/login', params: { email: normalizedEmail } });
                return;
            }

            let errorCode: string | null = null;
            try {
                const url = new URL(finalUrl);
                errorCode = url.searchParams.get('e');
            } catch {
                errorCode = null;
            }

            Alert.alert('Error', mapErrorCodeToMessage(errorCode));
        } catch {
            Alert.alert('Error', 'No se pudo restablecer la contraseña');
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
                    <Text style={styles.title}>Restablecer contraseña</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Correo"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="OTP (6 dígitos)"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={6}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Nueva contraseña"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Confirmar contraseña"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        autoCapitalize="none"
                    />

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Procesando...' : 'Guardar contraseña'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton} onPress={() => router.back()}>
                        <Text style={styles.linkText}>Volver</Text>
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
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 24 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 16 },
    button: { backgroundColor: '#1E3A8A', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    linkButton: { marginTop: 16, alignItems: 'center' },
    linkText: { color: '#3B82F6', fontSize: 14 },
});
