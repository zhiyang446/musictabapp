import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

const ORCHESTRATOR_URL = 'http://localhost:8000';

export default function JobsListScreen() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const { session, isAuthenticated } = useAuth();

  const fetchJobs = async (cursor = null, isRefresh = false) => {
    try {
      console.log('📋 T40: Fetching jobs list...', { cursor, isRefresh });
      
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '10');
      
      const url = `${ORCHESTRATOR_URL}/jobs?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('📋 T40: Jobs list response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ T40: Jobs fetched:', data);
        
        if (isRefresh) {
          setJobs(data.jobs || []);
        } else {
          setJobs(prev => [...prev, ...(data.jobs || [])]);
        }
        
        setHasMore(data.has_more || false);
        setNextCursor(data.next_cursor || null);
        setError(null);
      } else {
        const errorData = await response.json();
        console.error('❌ T40: Failed to fetch jobs:', response.status, errorData);
        setError(errorData.message || `Failed to fetch jobs: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ T40: Exception fetching jobs:', err);
      setError(err.message);
    }
  };

  const loadInitialJobs = async () => {
    setLoading(true);
    await fetchJobs(null, true);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs(null, true);
    setRefreshing(false);
  }, []);

  const loadMoreJobs = async () => {
    if (loadingMore || !hasMore || !nextCursor) return;
    
    setLoadingMore(true);
    await fetchJobs(nextCursor, false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialJobs();
    }
  }, [isAuthenticated]);

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

  const renderJobItem = ({ item }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => router.push(`/jobs/${item.id}`)}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobId}>Job #{item.id.slice(-8)}</Text>
          <Text style={styles.jobInstruments}>
            {Array.isArray(item.instruments) ? item.instruments.join(', ') : item.instruments}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>
      
      {item.progress !== undefined && item.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${item.progress}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      )}
      
      <View style={styles.jobFooter}>
        <Text style={styles.jobDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown'}
        </Text>
        <Text style={styles.jobSource}>{item.source_type}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Loading more jobs...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No Jobs Yet</Text>
      <Text style={styles.emptyText}>
        Create your first transcription job by uploading an audio file.
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={() => router.push('/instruments')}
      >
        <Text style={styles.createButtonText}>Create Job</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 My Jobs</Text>
        <Text style={styles.subtitle}>Please sign in to view your jobs</Text>
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
        <Text style={styles.title}>🎵 My Jobs</Text>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        <Text style={styles.loadingText}>Loading your jobs...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 My Jobs</Text>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={loadInitialJobs}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎵 My Jobs</Text>
      <Text style={styles.subtitle}>Your transcription jobs</Text>
      
      <FlatList
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        onEndReached={loadMoreJobs}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={jobs.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/instruments')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
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
    marginBottom: 20,
  },
  list: {
    paddingBottom: 80,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  jobInfo: {
    flex: 1,
  },
  jobId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  jobInstruments: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 35,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobDate: {
    fontSize: 12,
    color: '#999',
  },
  jobSource: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
