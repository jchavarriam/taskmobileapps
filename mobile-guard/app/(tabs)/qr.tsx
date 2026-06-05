// mobile/app/(tabs)/qr.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function QRTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR de Acceso Temporal</Text>
      <Text style={styles.placeholder}>Próximamente</Text>
      <Text style={styles.description}>
        Aquí podrás generar códigos QR temporales para acceso de visitantes.
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
