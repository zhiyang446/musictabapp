import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';

const ORCHESTRATOR_URL = 'http://localhost:8000'; // TODO: Move to env

export default function UploadScreen() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState(null);
  const [storagePath, setStoragePath] = useState(null);
  const { session, isAuthenticated } = useAuth();

  const selectAudioFile = async () => {
    try {
      console.log('🎵 T36: Starting audio file selection...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('✅ T36: Audio file selected:', {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          uri: file.uri
        });
        
        setSelectedFile(file);
        setUploadUrl(null);
        setStoragePath(null);
      } else {
        console.log('⚠️ T36: File selection cancelled');
      }
    } catch (error) {
      console.error('❌ T36: Error selecting file:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  const getSignedUploadUrl = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select an audio file first');
      return;
    }

    if (!isAuthenticated || !session?.access_token) {
      Alert.alert('Error', 'Please sign in to upload files');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔗 T36: Requesting signed upload URL...');
      console.log('📋 T36: File details:', {
        fileName: selectedFile.name,
        contentType: selectedFile.mimeType,
        size: selectedFile.size
      });

      const response = await fetch(`${ORCHESTRATOR_URL}/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          contentType: selectedFile.mimeType || 'audio/mpeg',
        }),
      });

      console.log('📋 T36: Upload URL response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ T36: Upload URL request failed:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ T36: Signed upload URL received');
      console.log('📋 T36 DoD Check - storagePath:', data.storagePath);
      console.log('📋 T36: Upload URL data:', {
        url: data.url ? 'PRESENT' : 'MISSING',
        storagePath: data.storagePath,
        expiresIn: data.expiresIn || 'Not specified'
      });

      setUploadUrl(data.url);
      setStoragePath(data.storagePath);

      Alert.alert(
        'Success',
        `Signed upload URL obtained!\nStorage path: ${data.storagePath}`,
        [
          { text: 'OK' },
          { text: 'Next: Upload File', onPress: () => router.push('/upload-file') }
        ]
      );

    } catch (error) {
      console.error('❌ T36: Exception getting upload URL:', error);
      Alert.alert('Error', `Failed to get upload URL: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setUploadUrl(null);
    setStoragePath(null);
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Upload Audio</Text>
        <Text style={styles.subtitle}>Please sign in to upload audio files</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Upload Audio</Text>
        <Text style={styles.subtitle}>Select an audio file to get started</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Select Audio File</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.selectButton]} 
            onPress={selectAudioFile}
          >
            <Text style={styles.buttonText}>
              {selectedFile ? 'Change File' : 'Select Audio File'}
            </Text>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.fileInfo}>
              <Text style={styles.fileInfoTitle}>Selected File:</Text>
              <Text style={styles.fileInfoText}>Name: {selectedFile.name}</Text>
              <Text style={styles.fileInfoText}>
                Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
              <Text style={styles.fileInfoText}>Type: {selectedFile.mimeType}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 2: Get Upload URL</Text>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.uploadButton,
              (!selectedFile || loading) && styles.disabledButton
            ]} 
            onPress={getSignedUploadUrl}
            disabled={!selectedFile || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Get Signed Upload URL</Text>
            )}
          </TouchableOpacity>

          {uploadUrl && storagePath && (
            <View style={styles.successInfo}>
              <Text style={styles.successTitle}>✅ Upload URL Ready!</Text>
              <Text style={styles.successText}>Storage Path: {storagePath}</Text>
              <Text style={styles.successText}>
                URL: {uploadUrl.substring(0, 50)}...
              </Text>
            </View>
          )}
        </View>

        {selectedFile && (
          <TouchableOpacity 
            style={[styles.button, styles.clearButton]} 
            onPress={clearSelection}
          >
            <Text style={styles.clearButtonText}>Clear Selection</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.version}>T36 - Upload URL Implementation</Text>
        </View>
      </View>
      <StatusBar style="auto" />
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
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  selectButton: {
    backgroundColor: '#34C759',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fileInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  fileInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  successInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d5a2d',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#2d5a2d',
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  version: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
