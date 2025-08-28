import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import PDFViewer from '../../components/PDFViewer';
import { supabase } from '../../supabase/client';

const ORCHESTRATOR_URL = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8000';

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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      {detail && (
        <View style={styles.card}>
          <Text style={styles.title}>Job {String(detail.id || '').slice(0, 8)}...</Text>
          <Text style={styles.row}>Status: {detail.status}</Text>
          <Text style={styles.row}>Progress: {detail.progress}%</Text>
          {detail.error_message ? <Text style={styles.error}>Error: {detail.error_message}</Text> : null}
        </View>
      )}

      <Text style={styles.sectionTitle}>Artifacts</Text>
      <FlatList
        data={artifacts}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.artifact} onPress={() => openArtifact(item)}>
            <Text style={styles.artifactText}>{item.kind}{item.instrument ? ` (${item.instrument})` : ''}</Text>
            <Text style={styles.artifactSub}>{new Date(item.created_at).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No artifacts yet</Text>}
      />

      <PDFViewer visible={pdfVisible} pdfUrl={pdfUrl} fileName={'artifact.pdf'} onClose={() => setPdfVisible(false)} />
    </View>
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
});
