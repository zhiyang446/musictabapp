import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'Music Tab App',
            headerStyle: {
              backgroundColor: '#f5f5f5',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            title: 'Sign In',
            headerStyle: {
              backgroundColor: '#f5f5f5',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="auth/callback"
          options={{
            title: 'Authenticating...',
            headerStyle: {
              backgroundColor: '#f5f5f5',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
        <Stack.Screen
          name="upload"
          options={{
            title: 'Upload Audio',
            headerStyle: {
              backgroundColor: '#f5f5f5',
            },
            headerTintColor: '#333',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
