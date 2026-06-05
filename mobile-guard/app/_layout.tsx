// mobile/app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '@/lib/auth';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    if (!__DEV__) {
      console.log = () => { };
      console.info = () => { };
      console.debug = () => { };
    }
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="home" />
        <Stack.Screen name="entry-code" />
        <Stack.Screen name="exit-code" />
        <Stack.Screen name="entry-no-code" />
        <Stack.Screen name="wait-approval" />
        {/* New entry-no-code flow screens */}
        <Stack.Screen name="entry-no-code-name" />
        <Stack.Screen name="entry-no-code-id" />
        <Stack.Screen name="entry-no-code-area" />
        <Stack.Screen name="entry-no-code-sector" />
        <Stack.Screen name="entry-no-code-summary" />
        <Stack.Screen name="entry-no-code-approval" />
        <Stack.Screen name="entry-no-code-rejected" />
      </Stack>
    </AuthProvider>
  );
}
