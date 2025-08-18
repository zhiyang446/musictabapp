import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { testConnection } from '../supabase/client';

export default function HomeScreen() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [sessionStatus, setSessionStatus] = useState('Unknown');

  useEffect(() => {
    // Test Supabase connection on component mount
    const runConnectionTest = async () => {
      console.log('🚀 T34: Starting Supabase connection test...');

      const result = await testConnection();

      if (result.success) {
        setConnectionStatus('✅ Connected');
        setSessionStatus(result.session ? 'Authenticated' : 'Anonymous (null)');

        // T34 DoD: Console should print session:null
        console.log('📋 T34 DoD Check - session:', result.session);
      } else {
        setConnectionStatus('❌ Failed');
        setSessionStatus('Error');
      }
    };

    runConnectionTest();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎵 Music Tab App</Text>
      <Text style={styles.subtitle}>Transform your music into tabs</Text>
      <Text style={styles.description}>
        Welcome to the Music Tab App! This app will help you convert audio files
        into musical notation and tablature.
      </Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>T34 - Supabase Integration</Text>
        <Text style={styles.statusText}>Connection: {connectionStatus}</Text>
        <Text style={styles.statusText}>Session: {sessionStatus}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Upload Audio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Browse Library</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.version}>T34 - Supabase Client Integrated</Text>
      <StatusBar style="auto" />
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
