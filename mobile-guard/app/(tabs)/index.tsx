// mobile/app/(tabs)/index.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';

export default function HomeTab() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido</Text>
      {user && (
        <Text style={styles.subtitle}>
          {user.username || user.email}
        </Text>
      )}
      <Text style={styles.placeholder}>Próximamente</Text>
      <Text style={styles.description}>
        Esta pantalla mostrará el dashboard principal con información relevante del condominio.
      </Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 32,
  },
  placeholder: {
    fontSize: 24,
    color: '#94A3B8',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
