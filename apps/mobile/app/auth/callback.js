import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../supabase/client';

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState('Processing...');
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔗 T35: Processing auth callback...');
        console.log('📋 T35: Callback params:', params);

        // Handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ T35: Auth callback error:', error);
          setStatus('Authentication failed');
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
          return;
        }

        if (data.session) {
          console.log('✅ T35: Magic link authentication successful');
          console.log('📋 T35 DoD Check - access_token from magic link:', data.session.access_token ? 'PRESENT' : 'MISSING');
          setStatus('Authentication successful! Redirecting...');
          
          setTimeout(() => {
            router.replace('/');
          }, 1000);
        } else {
          console.log('⚠️ T35: No session found in callback');
          setStatus('No session found. Redirecting to login...');
          setTimeout(() => {
            router.replace('/login');
          }, 2000);
        }
      } catch (error) {
        console.error('❌ T35: Exception in auth callback:', error);
        setStatus('Authentication error');
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.title}>🎵 Music Tab App</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.subtitle}>T35 - Magic Link Processing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
