import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabase/client';

const ORCHESTRATOR_URL = 'http://localhost:8000';

export default function JobDetailsScreen() {
  const { id: jobId } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState('disconnected');
  const [artifacts, setArtifacts] = useState([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState(null);
  const { session, isAuthenticated } = useAuth();

  const fetchJobDetails = async () => {
    try {
      console.log('📋 T39: Fetching job details for ID:', jobId);

      const response = await fetch(`${ORCHESTRATOR_URL}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📋 T39: Job details response status:', response.status);

      if (response.ok) {
        const jobData = await response.json();
        console.log('✅ T39: Job details fetched:', jobData);
        setJob(jobData);
        setError(null);
      } else {
        const errorData = await response.json();
        console.error('❌ T39: Failed to fetch job details:', response.status, errorData);
        setError(errorData.message || `Failed to fetch job: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ T39: Exception fetching job details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobArtifacts = async () => {
    try {
      console.log('📦 T42: Fetching artifacts for job ID:', jobId);
      setArtifactsLoading(true);
      setArtifactsError(null);

      const response = await fetch(`${ORCHESTRATOR_URL}/jobs/${jobId}/artifacts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📦 T42: Artifacts response status:', response.status);

      if (response.ok) {
        const artifactsData = await response.json();
        console.log('✅ T42: Artifacts fetched:', artifactsData);
        setArtifacts(artifactsData.artifacts || []);
        setArtifactsError(null);
      } else {
        const errorData = await response.json();
        console.error('❌ T42: Failed to fetch artifacts:', response.status, errorData);
        setArtifactsError(errorData.message || `Failed to fetch artifacts: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ T42: Exception fetching artifacts:', err);
      setArtifactsError(err.message);
    } finally {
      setArtifactsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && jobId) {
      fetchJobDetails();

      // T41: Set up Realtime subscription for job updates
      console.log('🔄 T41: Setting up Realtime subscription for job:', jobId);

      const subscription = supabase
        .channel(`job-${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'jobs',
            filter: `id=eq.${jobId}`
          },
          (payload) => {
            console.log('🔄 T41: Received job update:', payload);
            const updatedJob = payload.new;

            if (updatedJob) {
              console.log('✅ T41: Updating job state with new data:', {
                status: updatedJob.status,
                progress: updatedJob.progress,
                error_message: updatedJob.error_message
              });

              // Update the job state with new data
              setJob(prevJob => ({
                ...prevJob,
                ...updatedJob,
                // Ensure we keep the original structure
                id: updatedJob.id,
                status: updatedJob.status,
                progress: updatedJob.progress || 0,
                error_message: updatedJob.error_message,
                updated_at: updatedJob.updated_at
              }));
            }
          }
        )
        .subscribe((status) => {
          console.log('📋 T41: Subscription status:', status);
          setRealtimeStatus(status.toLowerCase());

          if (status === 'SUBSCRIBED') {
            console.log('✅ T41: Successfully subscribed to job updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ T41: Subscription error');
          }
        });

      // Cleanup subscription on unmount
      return () => {
        console.log('🧹 T41: Cleaning up Realtime subscription');
        subscription.unsubscribe();
      };
    }
  }, [isAuthenticated, jobId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FFA500';
      case 'queued': return '#007AFF';
      case 'running': return '#34C759';
      case 'succeeded': return '#28A745';
      case 'failed': return '#DC3545';
      case 'canceled': return '#6C757D';
      default: return '#6C757D';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '⏳';
      case 'queued': return '📋';
      case 'running': return '⚙️';
      case 'succeeded': return '✅';
      case 'failed': return '❌';
      case 'canceled': return '🚫';
      default: return '❓';
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Job Details</Text>
        <Text style={styles.subtitle}>Please sign in to view job details</Text>
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Job Details</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>Loading job details...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Job Details</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={fetchJobDetails}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go Back</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Job Details</Text>
        <Text style={styles.subtitle}>Transcription Job #{jobId}</Text>

        {/* Job Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.realtimeIndicator}>
              <Text style={styles.realtimeIcon}>
                {realtimeStatus === 'subscribed' ? '🟢' : realtimeStatus === 'connecting' ? '🟡' : '🔴'}
              </Text>
              <Text style={styles.realtimeText}>
                {realtimeStatus === 'subscribed' ? 'Live' : realtimeStatus === 'connecting' ? 'Connecting' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>{getStatusIcon(job.status)}</Text>
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
              {job.status?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
          {job.progress !== undefined && job.progress >= 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>Progress</Text>
                <Text style={styles.progressPercentage}>{job.progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(0, Math.min(100, job.progress))}%`,
                      backgroundColor: job.progress === 100 ? '#28A745' : '#007AFF'
                    }
                  ]}
                />
              </View>
              {job.status === 'running' && (
                <Text style={styles.progressNote}>
                  🔄 Job is processing... Updates will appear automatically
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Job Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Source Type:</Text>
            <Text style={styles.configValue}>{job.source_type || 'upload'}</Text>
          </View>
          {job.instruments && (
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Instruments:</Text>
              <Text style={styles.configValue}>
                {Array.isArray(job.instruments) ? job.instruments.join(', ') : job.instruments}
              </Text>
            </View>
          )}
          {job.options && (
            <>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Source Separation:</Text>
                <Text style={styles.configValue}>
                  {job.options.separate ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Precision:</Text>
                <Text style={styles.configValue}>{job.options.precision}</Text>
              </View>
            </>
          )}
        </View>

        {/* Job Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Created:</Text>
            <Text style={styles.configValue}>
              {job.created_at ? new Date(job.created_at).toLocaleString() : 'Unknown'}
            </Text>
          </View>
          {job.updated_at && (
            <View style={styles.configItem}>
              <Text style={styles.configLabel}>Updated:</Text>
              <Text style={styles.configValue}>
                {new Date(job.updated_at).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* Error Message */}
        {job.error_message && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error</Text>
            <Text style={styles.errorMessage}>{job.error_message}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.button}
            onPress={fetchJobDetails}
          >
            <Text style={styles.buttonText}>Refresh Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.back()}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Go Back</Text>
          </TouchableOpacity>
        </View>

        <StatusBar style="auto" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  realtimeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  realtimeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  progressNote: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontStyle: 'italic',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  configValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  errorMessage: {
    fontSize: 14,
    color: '#DC3545',
    backgroundColor: '#f8d7da',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
