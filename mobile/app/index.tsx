// mobile/app/index.tsx
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const router = useRouter();
  const { isLoading, isActivated, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isActivated) {
        router.replace('/activate');
      } else if (!isLoggedIn) {
        router.replace('/login');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, isActivated, isLoggedIn]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1E3A8A" />
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});
