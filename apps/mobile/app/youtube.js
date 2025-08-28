import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

import { getOrchestratorUrl } from './config/orchestrator';
const ORCHESTRATOR_URL = getOrchestratorUrl();

export default function YouTubeJobScreen() {
  const { isAuthenticated, session } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [meta, setMeta] = useState(null);

  const createYoutubeJob = async () => {
    if (!isAuthenticated || !session?.access_token) {
      Alert.alert('Not signed in', 'Please sign in first.');
      return;
    }
    if (!youtubeUrl || !/^https?:\/\//.test(youtubeUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube URL.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        source_type: 'youtube',
        youtube_url: youtubeUrl.trim(),
        instruments: ['drums'],
        options: {
          separate: false,
          precision: 'balanced',
          audio_format: 'webm'
        }
      };

      const resp = await fetch(`${ORCHESTRATOR_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${errText}`);
      }

      const data = await resp.json();
      const jobId = data.jobId || data.id;
      Alert.alert('Job Created', `YouTube job created.\nJob ID: ${jobId}`, [
        { text: 'View', onPress: () => router.push(`/jobs/${jobId}`) },
        { text: 'OK' }
      ]);
    } catch (e) {
      Alert.alert('Create Failed', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    if (!youtubeUrl) {
      Alert.alert('Enter URL', 'Please paste a YouTube URL first.');
      return;
    }
    setMetaLoading(true);
    try {
      const resp = await fetch(`${ORCHESTRATOR_URL}/youtube/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ youtube_url: youtubeUrl.trim() })
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${t}`);
      }
      const data = await resp.json();
      setMeta(data);
    } catch (e) {
      Alert.alert('Fetch metadata failed', String(e?.message || e));
      setMeta(null);
    } finally {
      setMetaLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>YouTube Job</Text>
        <Text style={styles.subtitle}>Please sign in to create jobs</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>🎥 YouTube Link → Job</Text>
        <Text style={styles.subtitle}>Paste a YouTube URL to create a job</Text>

        <TextInput
          style={styles.input}
          placeholder="https://www.youtube.com/watch?v=..."
          autoCapitalize="none"
          autoCorrect={false}
          value={youtubeUrl}
          onChangeText={setYoutubeUrl}
        />

        <TouchableOpacity style={[styles.button, metaLoading && styles.disabled]} onPress={fetchMetadata} disabled={metaLoading}>
          {metaLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Get Info</Text>}
        </TouchableOpacity>

        {meta && (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 6 }}>{meta.title || 'Unknown Title'}</Text>
            <Text style={{ color: '#666', marginBottom: 4 }}>Uploader: {meta.uploader || 'Unknown'}</Text>
            <Text style={{ color: '#666', marginBottom: 8 }}>Duration: {meta.duration != null ? `${Math.floor(meta.duration/60)}:${String(meta.duration%60).padStart(2,'0')}` : 'N/A'}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={createYoutubeJob} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create YouTube Job</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondaryButton]} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <StatusBar style="auto" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 10, marginBottom: 6, color: '#333' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 20 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e5e5e5', marginBottom: 16 },
  button: { backgroundColor: '#007AFF', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 }
});


