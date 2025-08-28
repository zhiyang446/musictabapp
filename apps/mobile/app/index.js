import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { testConnection } from '../supabase/client';
const ORCHESTRATOR_URL = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8000';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [sessionStatus, setSessionStatus] = useState('Unknown');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessingYoutube, setIsProcessingYoutube] = useState(false);
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

  const isValidYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/;
    return youtubeRegex.test(url);
  };

  const handleYouTubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Error', 'Please sign in to process YouTube videos');
      return;
    }

    setIsProcessingYoutube(true);

    try {
      console.log('🎬 T44: Creating YouTube transcription job...');
      console.log('📋 T44: YouTube URL:', youtubeUrl);

      const jobData = {
        source_type: 'youtube',
        youtube_url: youtubeUrl,
        instruments: ['drums'], // Default to drums for now
        options: {
          separate: true, // Enable separation for YouTube videos
          precision: 'balanced'
        }
      };

      const response = await fetch(`${ORCHESTRATOR_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(jobData)
      });

      console.log('📋 T44: Job creation response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        const jobId = result.jobId || result.id;

        console.log('✅ T44: YouTube job created successfully!');
        console.log('📋 T44: Job ID:', jobId);

        Alert.alert(
          'YouTube Job Created! 🎉',
          `Your YouTube transcription job has been created.\nJob ID: ${jobId}\n\nThe video will be downloaded and processed automatically.`,
          [
            {
              text: 'View Job Details',
              onPress: () => {
                setYoutubeUrl(''); // Clear the input
                router.push(`/jobs/${jobId}`);
              }
            }
          ]
        );
      } else {
        const errorData = await response.json();
        console.error('❌ T44: YouTube job creation failed:', response.status, errorData);
        throw new Error(errorData.message || `Job creation failed: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ T44: Exception during YouTube job creation:', error);
      Alert.alert(
        'YouTube Job Creation Failed',
        `Failed to create YouTube transcription job: ${error.message}`,
        [
          { text: 'OK' },
          { text: 'Retry', onPress: handleYouTubeSubmit }
        ]
      );
    } finally {
      setIsProcessingYoutube(false);
    }
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
      <StatusBar style="auto" />
      
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🎵 Music Tab App</Text>
          <Text style={styles.subtitle}>AI-Powered Music Transcription</Text>
        </View>

        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>System Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Supabase:</Text>
            <Text style={[styles.statusValue, connectionStatus.includes('✅') ? styles.statusSuccess : styles.statusError]}>
              {connectionStatus}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Session:</Text>
            <Text style={[styles.statusValue, sessionStatus === 'Authenticated' ? styles.statusSuccess : styles.statusWarning]}>
              {sessionStatus}
            </Text>
          </View>
        </View>

        {isAuthenticated ? (
          <View style={styles.authenticatedSection}>
            <Text style={styles.welcomeText}>Welcome, {user?.email || 'User'}! 👋</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={navigateToUpload}>
                <Text style={styles.primaryButtonText}>🎵 Upload Audio</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={navigateToInstruments}>
                <Text style={styles.secondaryButtonText}>⚙️ Configure Instruments</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={navigateToJobs}>
                <Text style={styles.secondaryButtonText}>📋 View Jobs</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.youtubeSection}>
              <Text style={styles.sectionTitle}>🎬 Process YouTube Video</Text>
              <TextInput
                style={styles.youtubeInput}
                placeholder="Enter YouTube URL..."
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={[styles.youtubeButton, isProcessingYoutube && styles.disabledButton]}
                onPress={handleYouTubeSubmit}
                disabled={isProcessingYoutube}
              >
                <Text style={styles.youtubeButtonText}>
                  {isProcessingYoutube ? 'Processing...' : 'Process Video'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.unauthenticatedSection}>
            <Text style={styles.loginPrompt}>Please sign in to start transcribing music</Text>
            <TouchableOpacity style={styles.loginButton} onPress={navigateToLogin}>
              <Text style={styles.loginButtonText}>Sign In / Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.version}>T35 - Home Screen Implementation</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
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
  statusSection: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSuccess: {
    color: 'green',
  },
  statusError: {
    color: 'red',
  },
  statusWarning: {
    color: 'orange',
  },
  authenticatedSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'column',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#e0e0e0',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  youtubeSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  youtubeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
    color: '#333',
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  youtubeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  unauthenticatedSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  loginPrompt: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  version: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
