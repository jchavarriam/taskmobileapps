import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getServerUrl } from '@/lib/storage';

export default function ForgotPassword() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email?: string }>();
    const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async () => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
            Alert.alert('Error', 'Ingresa tu correo');
            return;
        }

        if (!normalizedEmail.includes('@')) {
            Alert.alert('Error', 'El correo debe contener @');
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

            await fetch(`${serverUrl}/api/resident/auth/forgot-password`, {
                method: 'POST',
                body: formData,
            });

            Alert.alert('Éxito', 'Si el correo existe, enviamos un código OTP. Revisa tu correo.');
            router.replace({ pathname: '/reset-password', params: { email: normalizedEmail } });
        } catch {
            Alert.alert('Error', 'No se pudo solicitar recuperación de contraseña');
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
                    <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
                    <Text style={styles.description}>Ingresa tu correo para recibir un código OTP</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Correo"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSendOtp} disabled={loading}>
                        <Text style={styles.buttonText}>{loading ? 'Enviando...' : 'Enviar código OTP'}</Text>
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
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8 },
    description: { fontSize: 14, color: '#64748B', marginBottom: 24 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 16 },
    button: { backgroundColor: '#1E3A8A', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    linkButton: { marginTop: 16, alignItems: 'center' },
    linkText: { color: '#3B82F6', fontSize: 14 },
});
