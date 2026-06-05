// mobile/app/(tabs)/visits.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function VisitsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear Visita</Text>
      <Text style={styles.placeholder}>Próximamente</Text>
      <Text style={styles.description}>
        Aquí podrás registrar visitantes y gestionar sus accesos.
      </Text>
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
  },
});
