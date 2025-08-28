import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TextInput, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const ORCHESTRATOR_URL = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL || 'http://localhost:8000';

export default function JobsListScreen() {
  const { session, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchJobs = async (reset = false) => {
    if (!isAuthenticated) return;
    
    try {
      if (reset) {
        setCursor(null);
        setItems([]);
      }
      
      const url = new URL(`${ORCHESTRATOR_URL}/jobs`);
      if (cursor) url.searchParams.set('cursor', cursor);
      url.searchParams.set('limit', '10');
      if (statusFilter && statusFilter !== 'ALL') {
        url.searchParams.set('status', statusFilter);
      }
      
      console.log('🔍 Fetching jobs:', url.toString());
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      console.log('✅ Jobs fetched successfully:', data.jobs?.length || 0, 'items');
      
      setHasMore(data.has_more);
      setCursor(data.next_cursor || null);
      setItems((prev) => (reset ? data.jobs : [...prev, ...data.jobs]));
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    }
  };

  useEffect(() => { 
    (async () => { 
      setLoading(true); 
      await fetchJobs(true); 
      setLoading(false); 
    })(); 
  }, [isAuthenticated, statusFilter]);

  const onRefresh = async () => { 
    setRefreshing(true); 
    await fetchJobs(true); 
    setRefreshing(false); 
  };
  
  const loadMore = async () => { 
    if (hasMore && !loading) await fetchJobs(false); 
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Text>Please sign in to view jobs</Text>
      </View>
    );
  }

  const filteredItems = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const instr = Array.isArray(it.instruments) ? it.instruments.join(',') : '';
    return (
      instr.toLowerCase().includes(q) ||
      (it.source_type || '').toLowerCase().includes(q) ||
      (it.status || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by instrument/status..."
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.filters}>
        {['ALL','PENDING','RUNNING','SUCCEEDED','FAILED','CANCELED'].map((s) => (
          <TouchableOpacity 
            key={s} 
            style={[styles.filterChip, statusFilter===s && styles.filterChipActive]} 
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterText, statusFilter===s && styles.filterTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => router.push(`/jobs/${item.id}`)}
            >
              <Text style={styles.title}>
                {item.instruments?.join(', ') || item.source_type}
              </Text>
              <Text style={styles.subtitle}>
                {item.status} · {new Date(item.created_at).toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ margin: 12 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    padding: 12 
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: 10, 
    padding: 16, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  title: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333' 
  },
  subtitle: { 
    fontSize: 13, 
    color: '#666', 
    marginTop: 4 
  },
  filters: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 8 
  },
  search: { 
    backgroundColor: 'white', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderWidth: 1, 
    borderColor: '#eee', 
    marginBottom: 8 
  },
  filterChip: { 
    paddingVertical: 6, 
    paddingHorizontal: 10, 
    borderRadius: 14, 
    backgroundColor: '#eee', 
    marginRight: 6, 
    marginBottom: 6 
  },
  filterChipActive: { 
    backgroundColor: '#007AFF22', 
    borderWidth: 1, 
    borderColor: '#007AFF' 
  },
  filterText: { 
    fontSize: 12, 
    color: '#444' 
  },
  filterTextActive: { 
    color: '#007AFF', 
    fontWeight: '600' 
  },
});
