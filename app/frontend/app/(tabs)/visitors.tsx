import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { visitorAPI } from '../../src/services/api';
import { Visitor } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';
import { format } from 'date-fns';

export default function VisitorsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'inside' | 'exited'>('all');

  const fetchVisitors = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') {
        params.status = filter;
      }
      const data = await visitorAPI.getAll(params);
      setVisitors(data);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVisitors();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10B981';
      case 'inside':
        return '#3B82F6';
      case 'exited':
        return '#6B7280';
      default:
        return '#F59E0B';
    }
  };

  const renderVisitor = ({ item }: { item: Visitor }) => (
    <View style={styles.visitorCard}>
      <View style={styles.visitorHeader}>
        <View style={styles.visitorInfo}>
          <Text style={styles.visitorName}>{item.name}</Text>
          <Text style={styles.visitorPhone}>{item.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.visitorDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="clipboard-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>Purpose: {item.purpose}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>
            Entry: {format(new Date(item.entry_time), 'dd MMM, hh:mm a')}
          </Text>
        </View>
        {item.exit_time && (
          <View style={styles.detailRow}>
            <Ionicons name="exit-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Exit: {format(new Date(item.exit_time), 'dd MMM, hh:mm a')}
            </Text>
          </View>
        )}
        {item.vehicle_number && (
          <View style={styles.detailRow}>
            <Ionicons name="car-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>Vehicle: {item.vehicle_number}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'inside' && styles.filterButtonActive]}
          onPress={() => setFilter('inside')}
        >
          <Text style={[styles.filterText, filter === 'inside' && styles.filterTextActive]}>
            Inside
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'exited' && styles.filterButtonActive]}
          onPress={() => setFilter('exited')}
        >
          <Text style={[styles.filterText, filter === 'exited' && styles.filterTextActive]}>
            Exited
          </Text>
        </TouchableOpacity>
      </View>

      {user?.role === 'gatekeeper' && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/visitors/add')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Log New Visitor</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={visitors}
        renderItem={renderVisitor}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No visitors found</Text>
            {user?.role === 'gatekeeper' && (
              <Text style={styles.emptySubtext}>Tap the button above to log a visitor</Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  visitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visitorInfo: {
    flex: 1,
  },
  visitorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  visitorPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  visitorDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
