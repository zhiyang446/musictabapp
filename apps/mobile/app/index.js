import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { testConnection } from '../supabase/client';
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

      const response = await fetch('http://localhost:8000/jobs', {
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Music Tab App</Text>
        <Text style={styles.subtitle}>Transform your music into tabs</Text>
        <Text style={styles.description}>
          Welcome to the Music Tab App! Upload audio files or paste YouTube links
          to convert them into musical notation and tablature.
        </Text>

        {/* YouTube Input Section */}
        {isAuthenticated && (
          <View style={styles.youtubeSection}>
            <Text style={styles.sectionTitle}>🎬 YouTube to Tabs</Text>
            <Text style={styles.sectionSubtitle}>
              Paste a YouTube URL to extract and transcribe audio
            </Text>

            <TextInput
              style={styles.youtubeInput}
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline={false}
              editable={!isProcessingYoutube}
            />

            <TouchableOpacity
              style={[
                styles.youtubeButton,
                (!youtubeUrl.trim() || isProcessingYoutube) && styles.disabledButton
              ]}
              onPress={handleYouTubeSubmit}
              disabled={!youtubeUrl.trim() || isProcessingYoutube}
            >
              <Text style={styles.youtubeButtonText}>
                {isProcessingYoutube ? '🔄 Processing...' : '🎵 Create YouTube Job'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.youtubeNote}>
              💡 Tip: Works with YouTube music videos, covers, and performances
            </Text>
          </View>
        )}

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
      
        <Text style={styles.version}>T44 - YouTube Integration + T48 Demucs</Text>
        <StatusBar style="auto" />
      </View>
    </ScrollView>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
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
  youtubeNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
