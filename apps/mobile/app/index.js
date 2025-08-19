import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { testConnection } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [sessionStatus, setSessionStatus] = useState('Unknown');
  const { user, session, loading, signOut, isAuthenticated } = useAuth();

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

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'You have been signed out');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const navigateToLogin = () => {
    router.push('/login');
  };

  const navigateToUpload = () => {
    router.push('/upload');
  };

  const navigateToInstruments = () => {
    router.push('/instruments');
  };

  const navigateToJobs = () => {
    router.push('/jobs');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Music Tab App</Text>
        <Text style={styles.subtitle}>Loading...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎵 Music Tab App</Text>
      <Text style={styles.subtitle}>Transform your music into tabs</Text>
      <Text style={styles.description}>
        Welcome to the Music Tab App! This app will help you convert audio files
        into musical notation and tablature.
      </Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>T35 - Authentication Status</Text>
        <Text style={styles.statusText}>Connection: {connectionStatus}</Text>
        <Text style={styles.statusText}>
          User: {isAuthenticated ? `${user?.email}` : 'Not signed in'}
        </Text>
        <Text style={styles.statusText}>
          Session: {isAuthenticated ? 'Authenticated ✅' : 'Anonymous'}
        </Text>
        {isAuthenticated && session?.access_token && (
          <Text style={styles.statusText}>
            Access Token: Present ✅
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {isAuthenticated ? (
          <>
            <TouchableOpacity
              style={styles.button}
              onPress={navigateToUpload}
            >
              <Text style={styles.buttonText}>Upload Audio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={navigateToInstruments}
            >
              <Text style={styles.buttonText}>Select Instruments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={navigateToJobs}
            >
              <Text style={styles.buttonText}>My Jobs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={navigateToLogin}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.version}>T38 - Instrument Selection Integration</Text>
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
  signOutButton: {
    backgroundColor: '#FF3B30',
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
