import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import PDFViewer from '../../components/PDFViewer';
import AudioPlayer from '../../components/AudioPlayer';
import { supabase } from '../../supabase/client';

const ORCHESTRATOR_URL = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8000';

// T48 Audio Player wrapper component
function T48AudioPlayer({ artifact, getSignedUrl, title, stemType }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        const url = await getSignedUrl();
        setAudioUrl(url);
      } catch (error) {
        console.error('❌ T48: Failed to fetch audio URL:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUrl();
  }, [artifact.id]);

  if (loading) {
    return (
      <View style={styles.audioPlayerLoading}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.audioPlayerLoadingText}>Loading {title}...</Text>
      </View>
    );
  }

  if (!audioUrl) {
    return (
      <View style={styles.audioPlayerError}>
        <Text style={styles.audioPlayerErrorText}>❌ Failed to load {title}</Text>
      </View>
    );
  }

  return (
    <AudioPlayer
      audioUrl={audioUrl}
      title={title}
      stemType={stemType}
      onPlaybackStatusUpdate={(status) => {
        console.log(`🎵 T48: ${stemType || 'audio'} playback:`, status.isPlaying ? 'playing' : 'paused');
      }}
    />
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [artifacts, setArtifacts] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfVisible, setPdfVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const H = { Authorization: `Bearer ${session?.access_token}` };

  const fetchDetail = async () => {
    try {
      console.log('🔍 Fetching job detail for ID:', id);
      const res = await fetch(`${ORCHESTRATOR_URL}/jobs/${id}`, { headers: H });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Job not found');
        } else if (res.status === 403) {
          throw new Error('Access denied');
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      }
      
      const d = await res.json();
      console.log('✅ Job detail fetched successfully:', d);
      setDetail(d);
      setErrorMsg(null);
    } catch (e) {
      console.error('❌ Error fetching job detail:', e);
      setErrorMsg(e.message || 'Failed to load job detail');
    }
  };

  const fetchArtifacts = async () => {
    try {
      console.log('🔍 Fetching artifacts for job ID:', id);
      const res = await fetch(`${ORCHESTRATOR_URL}/jobs/${id}/artifacts`, { headers: H });
      
      if (!res.ok) {
        console.warn('⚠️ Failed to fetch artifacts:', res.status);
        return; // Don't fail the UI for artifacts
      }
      
      const a = await res.json();
      console.log('✅ Artifacts fetched successfully:', a.artifacts?.length || 0, 'items');
      setArtifacts(a.artifacts || []);
    } catch (e) {
      console.error('❌ Error fetching artifacts:', e);
      // Do not hard fail UI, just keep current artifacts
    }
  };

  useEffect(() => {
    let timer;
    let channel;
    (async () => {
      setLoading(true);
      await fetchDetail();
      await fetchArtifacts();
      setLoading(false);
      // realtime subscription to jobs row
      try {
        channel = supabase
          .channel(`jobs-${id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${id}` },
            (payload) => {
              if (payload?.new) {
                setDetail((prev) => ({ ...(prev || {}), ...payload.new }));
              }
            }
          )
          .subscribe();
      } catch (e) {
        // fallback to polling if subscription fails
        timer = setInterval(async () => {
          await fetchDetail();
          await fetchArtifacts();
        }, 2000);
      }
      // also keep a light polling in case artifacts change
      if (!timer) {
        timer = setInterval(async () => {
          await fetchArtifacts();
        }, 4000);
      }
    })();
    return () => {
      if (timer) clearInterval(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [id]);

  const openArtifact = async (artifact) => {
    try {
      const su = await fetch(`${ORCHESTRATOR_URL}/artifacts/${artifact.id}/signed-url`, { headers: H }).then(r => r.json());
      if (artifact.kind === 'pdf') {
        setPdfUrl(su.signed_url);
        setPdfVisible(true);
      } else {
        const Linking = (await import('expo-linking')).default;
        Linking.openURL(su.signed_url);
      }
    } catch (e) {
      Alert.alert('Open Failed', e.message || 'Could not open artifact');
    }
  };

  const getArtifactSignedUrl = async (artifactId) => {
    try {
      const response = await fetch(`${ORCHESTRATOR_URL}/artifacts/${artifactId}/signed-url`, { headers: H });
      const data = await response.json();
      return data.signed_url;
    } catch (error) {
      console.error('❌ T48: Failed to get signed URL:', error);
      return null;
    }
  };

  const isAudioArtifact = (artifact) => {
    return artifact.kind === 'audio' ||
           artifact.kind === 'wav' ||
           artifact.kind === 'mp3' ||
           (artifact.storage_path && (
             artifact.storage_path.endsWith('.wav') ||
             artifact.storage_path.endsWith('.mp3') ||
             artifact.storage_path.endsWith('.m4a')
           ));
  };

  const getStemType = (artifact) => {
    if (artifact.storage_path) {
      if (artifact.storage_path.includes('drums')) return 'drums';
      if (artifact.storage_path.includes('bass')) return 'bass';
      if (artifact.storage_path.includes('vocals')) return 'vocals';
      if (artifact.storage_path.includes('other')) return 'other';
    }
    return artifact.instrument || null;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      {detail && (
        <View style={styles.card}>
          <Text style={styles.title}>🎵 T48 Job {String(detail.id || '').slice(0, 8)}...</Text>
          <Text style={styles.row}>Status: {detail.status}</Text>
          <Text style={styles.row}>Progress: {detail.progress}%</Text>

          {/* Visual Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${detail.progress || 0}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{detail.progress || 0}%</Text>
          </View>

          {detail.error_message ? <Text style={styles.error}>Error: {detail.error_message}</Text> : null}

          {/* T48 Separation Info */}
          {detail.options && (
            <View style={styles.t48Info}>
              <Text style={styles.t48Title}>🔧 T48 Configuration</Text>
              <Text style={styles.t48Text}>
                Separation: {detail.options.separate ? 'Enabled (Demucs)' : 'Disabled (None)'}
              </Text>
              <Text style={styles.t48Text}>
                Precision: {detail.options.precision || 'balanced'}
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>🎵 Audio Results (T48)</Text>

      {/* Audio Players for T48 stems */}
      {artifacts.filter(isAudioArtifact).map((artifact) => (
        <T48AudioPlayer
          key={artifact.id}
          artifact={artifact}
          getSignedUrl={() => getArtifactSignedUrl(artifact.id)}
          title={`${artifact.kind} - ${getStemType(artifact) || 'audio'}`}
          stemType={getStemType(artifact)}
        />
      ))}

      <Text style={styles.sectionTitle}>📄 Other Artifacts</Text>

      {/* Non-audio artifacts */}
      {artifacts.filter(artifact => !isAudioArtifact(artifact)).map((artifact) => (
        <TouchableOpacity
          key={artifact.id}
          style={styles.artifact}
          onPress={() => openArtifact(artifact)}
        >
          <Text style={styles.artifactText}>
            {artifact.kind}{artifact.instrument ? ` (${artifact.instrument})` : ''}
          </Text>
          <Text style={styles.artifactSub}>
            {new Date(artifact.created_at).toLocaleString()}
          </Text>
        </TouchableOpacity>
      ))}

      {artifacts.length === 0 && (
        <Text style={styles.empty}>No artifacts yet</Text>
      )}

      <View style={styles.t48Footer}>
        <Text style={styles.t48FooterText}>
          🎵 T48 Mobile Test - Audio separation and playback
        </Text>
      </View>

      <PDFViewer visible={pdfVisible} pdfUrl={pdfUrl} fileName={'artifact.pdf'} onClose={() => setPdfVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 },
  row: { fontSize: 14, color: '#555', marginBottom: 4 },
  error: { fontSize: 14, color: '#d32f2f', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginVertical: 8 },
  artifact: { backgroundColor: 'white', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  artifactText: { fontSize: 15, color: '#333' },
  artifactSub: { fontSize: 12, color: '#777', marginTop: 4 },
  empty: { textAlign: 'center', color: '#777', marginTop: 20 },

  // T48 specific styles
  t48Info: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  t48Title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  t48Text: {
    fontSize: 13,
    color: '#1565c0',
    marginBottom: 2,
  },
  t48Footer: {
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  t48FooterText: {
    fontSize: 12,
    color: '#7b1fa2',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Progress bar styles
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    minWidth: 35,
    textAlign: 'right',
  },

  // Audio player loading/error styles
  audioPlayerLoading: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  audioPlayerLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6c757d',
  },
  audioPlayerError: {
    backgroundColor: '#f8d7da',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  audioPlayerErrorText: {
    fontSize: 14,
    color: '#721c24',
    textAlign: 'center',
  },
});
