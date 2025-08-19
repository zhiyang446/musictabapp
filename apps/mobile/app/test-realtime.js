import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/client';

export default function TestRealtimeScreen() {
  const [jobId, setJobId] = useState('');
  const [progress, setProgress] = useState('25');
  const [status, setStatus] = useState('running');
  const [loading, setLoading] = useState(false);
  const { session, isAuthenticated } = useAuth();

  const updateJobProgress = async () => {
    if (!jobId.trim()) {
      Alert.alert('Error', 'Please enter a Job ID');
      return;
    }

    setLoading(true);
    try {
      console.log('🧪 T41 Test: Updating job progress...', {
        jobId: jobId.trim(),
        progress: parseInt(progress),
        status
      });

      const { data, error } = await supabase
        .from('jobs')
        .update({
          progress: parseInt(progress),
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId.trim())
        .select();

      if (error) {
        console.error('❌ T41 Test: Update failed:', error);
        Alert.alert('Error', `Failed to update job: ${error.message}`);
      } else {
        console.log('✅ T41 Test: Job updated successfully:', data);
        Alert.alert(
          'Success! 🎉',
          `Job ${jobId.trim()} updated:\n• Progress: ${progress}%\n• Status: ${status.toUpperCase()}\n\nCheck the job details page to see if it updates automatically!`,
          [
            { text: 'OK' },
            { 
              text: 'View Job', 
              onPress: () => router.push(`/jobs/${jobId.trim()}`)
            }
          ]
        );
      }
    } catch (err) {
      console.error('❌ T41 Test: Exception:', err);
      Alert.alert('Error', `Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const simulateProgressSequence = async () => {
    if (!jobId.trim()) {
      Alert.alert('Error', 'Please enter a Job ID');
      return;
    }

    Alert.alert(
      'Simulate Progress Sequence',
      'This will update the job through multiple progress stages:\n0% → 25% → 50% → 75% → 100%\n\nMake sure you have the job details page open to see real-time updates!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Simulation', 
          onPress: async () => {
            const stages = [
              { progress: 0, status: 'queued' },
              { progress: 25, status: 'running' },
              { progress: 50, status: 'running' },
              { progress: 75, status: 'running' },
              { progress: 100, status: 'succeeded' }
            ];

            for (let i = 0; i < stages.length; i++) {
              const stage = stages[i];
              console.log(`🧪 T41 Test: Stage ${i + 1}/5 - ${stage.progress}% ${stage.status}`);
              
              try {
                const { error } = await supabase
                  .from('jobs')
                  .update({
                    progress: stage.progress,
                    status: stage.status,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', jobId.trim());

                if (error) {
                  console.error('❌ T41 Test: Stage failed:', error);
                  Alert.alert('Error', `Stage ${i + 1} failed: ${error.message}`);
                  return;
                }

                // Wait 2 seconds between updates
                if (i < stages.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              } catch (err) {
                console.error('❌ T41 Test: Stage exception:', err);
                Alert.alert('Error', `Stage ${i + 1} exception: ${err.message}`);
                return;
              }
            }

            Alert.alert('Complete! 🎉', 'Progress simulation completed. Check the job details page!');
          }
        }
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🧪 Test Realtime</Text>
        <Text style={styles.subtitle}>Please sign in to test Realtime functionality</Text>
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
        <Text style={styles.title}>🧪 Test Realtime Updates</Text>
        <Text style={styles.subtitle}>T41 - Test job progress updates</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job ID</Text>
          <TextInput
            style={styles.input}
            value={jobId}
            onChangeText={setJobId}
            placeholder="Enter job ID (e.g., 123e4567-e89b-12d3-a456-426614174000)"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>
            💡 Get the Job ID from the job details page URL or job list
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress (%)</Text>
          <TextInput
            style={styles.input}
            value={progress}
            onChangeText={setProgress}
            placeholder="0-100"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusButtons}>
            {['pending', 'queued', 'running', 'succeeded', 'failed'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusButton,
                  status === s && styles.selectedStatusButton
                ]}
                onPress={() => setStatus(s)}
              >
                <Text style={[
                  styles.statusButtonText,
                  status === s && styles.selectedStatusButtonText
                ]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={updateJobProgress}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Updating...' : 'Update Job Progress'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.simulateButton, loading && styles.disabledButton]}
            onPress={simulateProgressSequence}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Simulate Full Progress (0% → 100%)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.instructionTitle}>📋 How to Test:</Text>
          <Text style={styles.instruction}>
            1. Create a job and copy its ID{'\n'}
            2. Open the job details page{'\n'}
            3. Come back here and paste the Job ID{'\n'}
            4. Click "Simulate Full Progress"{'\n'}
            5. Watch the job details page update in real-time!
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>

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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  selectedStatusButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectedStatusButtonText: {
    color: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  simulateButton: {
    backgroundColor: '#34C759',
  },
  backButton: {
    backgroundColor: '#6C757D',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
