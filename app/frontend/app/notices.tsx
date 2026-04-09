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
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { noticeAPI } from '../src/services/api';
import { Notice } from '../src/types';
import { useAuthStore } from '../src/store/authStore';
import { format } from 'date-fns';

export default function NoticesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotices = async () => {
    try {
      const data = await noticeAPI.getAll();
      setNotices(data);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  const renderNotice = ({ item }: { item: Notice }) => (
    <View style={styles.noticeCard}>
      <View style={styles.noticeHeader}>
        <View style={[styles.priorityBadge, item.priority === 'urgent' && styles.urgentBadge]}>
          <Ionicons
            name={item.priority === 'urgent' ? 'alert-circle' : 'information-circle'}
            size={16}
            color={item.priority === 'urgent' ? '#EF4444' : '#6B7280'}
          />
          <Text style={[styles.priorityText, item.priority === 'urgent' && styles.urgentText]}>
            {item.priority === 'urgent' ? 'URGENT' : 'NORMAL'}
          </Text>
        </View>
        <Text style={styles.noticeDate}>
          {format(new Date(item.created_at), 'dd MMM yyyy')}
        </Text>
      </View>
      <Text style={styles.noticeTitle}>{item.title}</Text>
      <Text style={styles.noticeContent}>{item.content}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Notices',
            headerStyle: { backgroundColor: '#4F46E5' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notices',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#FFFFFF',
          headerRight: () =>
            (user?.role === 'admin' || user?.role === 'manager') && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/notices/add')}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ),
        }}
      />
      <FlatList
        data={notices}
        renderItem={renderNotice}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notices posted yet</Text>
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
  addButton: {
    marginRight: 12,
  },
  listContent: {
    padding: 16,
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  urgentText: {
    color: '#EF4444',
  },
  noticeDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  noticeContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
});
