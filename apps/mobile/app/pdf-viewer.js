import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import PDFViewer from '../components/PDFViewer';

/**
 * T43 - PDF Viewer Page
 * 
 * A dedicated page for viewing PDF artifacts using WebView
 * Handles navigation, URL fetching, and error states
 */
export default function PDFViewerScreen() {
  const { artifactId, fileName } = useLocalSearchParams();
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { session, isAuthenticated } = useAuth();

  const ORCHESTRATOR_URL = 'http://localhost:8000';

  useEffect(() => {
    if (isAuthenticated && artifactId) {
      fetchPDFUrl();
    } else {
      setError('Authentication required');
      setLoading(false);
    }
  }, [isAuthenticated, artifactId]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      handleClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const fetchPDFUrl = async () => {
    try {
      console.log('📄 T43: Fetching signed URL for artifact:', artifactId);
      setLoading(true);
      setError(null);

      const response = await fetch(`${ORCHESTRATOR_URL}/artifacts/${artifactId}/signed-url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📄 T43: Signed URL response status:', response.status);

      if (response.ok) {
        const urlData = await response.json();
        console.log('✅ T43: Signed URL obtained for PDF');
        setPdfUrl(urlData.signed_url);
        setError(null);
      } else {
        const errorData = await response.json();
        console.error('❌ T43: Failed to get signed URL:', response.status, errorData);
        setError(errorData.message || 'Failed to get PDF URL');
      }
    } catch (err) {
      console.error('❌ T43: Exception fetching PDF URL:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('📄 T43: PDF viewer closed, navigating back');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/jobs');
    }
  };

  const handleRetry = () => {
    console.log('📄 T43: Retrying PDF URL fetch');
    fetchPDFUrl();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingIcon}>📄</Text>
          <Text style={styles.loadingTitle}>Loading PDF</Text>
          <Text style={styles.loadingMessage}>
            {fileName ? `Preparing ${fileName}...` : 'Fetching PDF URL...'}
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Cannot Load PDF</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]} 
              onPress={handleRetry}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.closeButton]} 
              onPress={handleClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // PDF Viewer
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <PDFViewer
        pdfUrl={pdfUrl}
        fileName={fileName}
        onClose={handleClose}
        visible={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  loadingMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  closeButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
