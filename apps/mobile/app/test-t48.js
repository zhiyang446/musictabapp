import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

const ORCHESTRATOR_URL = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8080';

export default function TestT48Screen() {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState(null);
  const [storagePath, setStoragePath] = useState(null);
  const [separationMethod, setSeparationMethod] = useState('demucs');
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', 'uploading'
  const [statusMessage, setStatusMessage] = useState('');

  const selectAudioFile = async () => {
    try {
      console.log('🎵 T48 Test: Starting audio file selection...');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('✅ T48 Test: Audio file selected:', {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          uri: file.uri
        });
        
        setSelectedFile(file);
        setUploadUrl(null);
        setStoragePath(null);
      }
    } catch (error) {
      console.error('❌ T48 Test: Error selecting file:', error);
      Alert.alert('Error', 'Failed to select audio file');
    }
  };

  const getUploadUrl = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setUploadStatus(null); // 清除之前的上传状态
    setStatusMessage('');
    try {
      console.log('🔗 T48 Test: Requesting signed upload URL...');

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ T48 Test: Signed upload URL received');
      console.log('📋 T48 Test: Storage path:', data.storagePath);

      setUploadUrl(data.url);
      setStoragePath(data.storagePath);

      Alert.alert('Success', `Upload URL obtained!\nStorage path: ${data.storagePath}`);
    } catch (error) {
      console.error('❌ T48 Test: Exception getting upload URL:', error);
      Alert.alert('Error', `Failed to get upload URL: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!uploadUrl || !selectedFile) return;

    setLoading(true);
    setUploadStatus('uploading');
    setStatusMessage('正在上传文件...');
    try {
      console.log('📤 T48 Test: Starting file upload...');
      console.log('📋 T48 Test: Upload URL:', uploadUrl);
      console.log('📋 T48 Test: File URI:', selectedFile.uri);

      // Handle different file URI formats for web/mobile compatibility
      let fileBlob;
      if (selectedFile.uri.startsWith('blob:') || selectedFile.uri.startsWith('data:')) {
        // Web: Convert blob URI to actual blob
        const response = await fetch(selectedFile.uri);
        fileBlob = await response.blob();
      } else if (selectedFile.uri.startsWith('file://')) {
        // Mobile: Use FileSystem to read file
        const fileInfo = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const byteCharacters = atob(fileInfo);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        fileBlob = new Blob([byteArray], { type: selectedFile.mimeType || 'audio/mpeg' });
      } else {
        // Fallback: try to create blob from file object
        fileBlob = selectedFile;
      }

      console.log('📋 T48 Test: File blob size:', fileBlob.size);

      // Upload using fetch API (works on both web and mobile)
      // Note: Supabase signed URLs are sensitive to headers - only include necessary ones
      const contentType = selectedFile.mimeType || 'audio/mpeg';
      console.log('📋 T48 Test: About to upload with Content-Type:', contentType);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: fileBlob,
      });

      console.log('📋 T48 Test: Upload response status:', response.status);
      console.log('📋 T48 Test: Upload response headers:', response.headers);

      if (response.status >= 200 && response.status < 300) {
        console.log('✅ T48 Test: File upload successful!');

        // Update UI status
        setUploadStatus('success');
        setStatusMessage(`✅ 文件上传成功！\n存储路径: ${storagePath}`);

        console.log('✅ T48 Test: Upload success status updated in UI');
      } else {
        // Get detailed error information
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Unable to read error response';
        }

        console.error('❌ T48 Test: Upload failed with status:', response.status);
        console.error('❌ T48 Test: Response statusText:', response.statusText);
        console.error('❌ T48 Test: Error response body:', errorText);
        console.error('❌ T48 Test: Upload URL was:', uploadUrl);
        console.error('❌ T48 Test: File blob size:', fileBlob.size);
        console.error('❌ T48 Test: File blob type:', fileBlob.type);

        // Update UI status with error
        setUploadStatus('error');
        setStatusMessage(`❌ 上传失败\n状态码: ${response.status}\n错误: ${errorText || response.statusText}`);

        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ T48 Test: Exception during upload:', error);
      console.error('❌ T48 Test: Error stack:', error.stack);

      // Update UI status with exception error
      setUploadStatus('error');
      setStatusMessage(`❌ 上传异常\n错误: ${error.message}`);
    } finally {
      console.log('🔄 T48 Test: Upload process finished, setting loading to false');
      setLoading(false);
    }
  };

  const createT48Job = async () => {
    if (!storagePath) {
      Alert.alert('Error', 'Please upload a file first');
      return;
    }

    setLoading(true);
    try {
      console.log('🎯 T48 Test: Creating T48 job...');
      
      const jobData = {
        source_type: 'upload',
        source_object_path: storagePath,
        instruments: ['drums'],
        options: {
          separate: separationMethod === 'demucs', // Convert to boolean
          precision: 'balanced'
        }
      };

      console.log('📋 T48 Test: Job parameters:', jobData);
      console.log('🔧 T48 Test: separate value:', separationMethod === 'demucs');

      const response = await fetch(`${ORCHESTRATOR_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(jobData)
      });

      console.log('📋 T48 Test: Job creation response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        const jobId = result.jobId || result.id;

        console.log('✅ T48 Test: Job created successfully!');
        console.log('📋 T48 Test: Job ID:', jobId);

        Alert.alert(
          'T48 Job Created! 🎉',
          `Job ID: ${jobId}\n\nSeparation: ${separationMethod}\n\nRedirecting to job details...`,
          [
            {
              text: 'View Job Details',
              onPress: () => router.push(`/jobs/${jobId}`)
            }
          ]
        );

        // Auto-redirect
        setTimeout(() => {
          router.push(`/jobs/${jobId}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ T48 Test: Job creation failed:', response.status, errorData);
        throw new Error(`Job creation failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ T48 Test: Exception during job creation:', error);
      Alert.alert('Job Creation Failed', `Failed to create T48 job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🎵 T48 Source Separation Test</Text>
      
      {/* Step 1: File Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Select Audio File</Text>
        <TouchableOpacity style={styles.button} onPress={selectAudioFile} disabled={loading}>
          <Text style={styles.buttonText}>Select Audio File</Text>
        </TouchableOpacity>
        {selectedFile && (
          <View style={styles.fileInfo}>
            <Text>📁 {selectedFile.name}</Text>
            <Text>📊 {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text>
            <Text>🎵 {selectedFile.mimeType}</Text>
          </View>
        )}
      </View>

      {/* Step 2: Upload URL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Get Upload URL</Text>
        <TouchableOpacity 
          style={[styles.button, !selectedFile && styles.buttonDisabled]} 
          onPress={getUploadUrl} 
          disabled={loading || !selectedFile}
        >
          <Text style={styles.buttonText}>Get Upload URL</Text>
        </TouchableOpacity>
        {uploadUrl && (
          <Text style={styles.success}>✅ Upload URL Ready</Text>
        )}
      </View>

      {/* Step 3: Upload File */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 3: Upload File</Text>
        <TouchableOpacity
          style={[styles.button, !uploadUrl && styles.buttonDisabled]}
          onPress={uploadFile}
          disabled={loading || !uploadUrl}
        >
          <Text style={styles.buttonText}>Upload File</Text>
        </TouchableOpacity>

        {/* Upload Status Display */}
        {uploadStatus && (
          <View style={[
            styles.statusContainer,
            uploadStatus === 'success' && styles.statusSuccess,
            uploadStatus === 'error' && styles.statusError,
            uploadStatus === 'uploading' && styles.statusUploading
          ]}>
            <Text style={[
              styles.statusText,
              uploadStatus === 'success' && styles.statusTextSuccess,
              uploadStatus === 'error' && styles.statusTextError,
              uploadStatus === 'uploading' && styles.statusTextUploading
            ]}>
              {statusMessage}
            </Text>
          </View>
        )}
      </View>

      {/* Step 4: Separation Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 4: Choose Separation Method</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={[styles.radioOption, separationMethod === 'none' && styles.radioSelected]}
            onPress={() => setSeparationMethod('none')}
          >
            <Text style={styles.radioText}>🚫 None (Original Audio)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.radioOption, separationMethod === 'demucs' && styles.radioSelected]}
            onPress={() => setSeparationMethod('demucs')}
          >
            <Text style={styles.radioText}>🤖 Demucs (AI Separation)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step 5: Create Job */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 5: Create T48 Job</Text>
        <TouchableOpacity 
          style={[styles.button, styles.createButton, !storagePath && styles.buttonDisabled]} 
          onPress={createT48Job} 
          disabled={loading || !storagePath}
        >
          <Text style={styles.buttonText}>Create T48 Job</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loading}>
          <Text>⏳ Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  createButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fileInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  success: {
    color: '#34C759',
    marginTop: 10,
    fontWeight: 'bold',
  },
  radioGroup: {
    gap: 10,
  },
  radioOption: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loading: {
    padding: 20,
    alignItems: 'center',
  },
  statusContainer: {
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusUploading: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  statusTextSuccess: {
    color: '#155724',
  },
  statusTextError: {
    color: '#721c24',
  },
  statusTextUploading: {
    color: '#0c5460',
  },
});
