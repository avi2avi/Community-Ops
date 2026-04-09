import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { dashboardAPI, noticeAPI } from '../../src/services/api';
import { DashboardStats, Notice } from '../../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (user?.role === 'admin' || user?.role === 'manager') {
        const dashboardStats = await dashboardAPI.getStats();
        setStats(dashboardStats);
      }
      const noticeList = await noticeAPI.getAll();
      setNotices(noticeList.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {(user?.role === 'admin' || user?.role === 'manager') && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="home" size={24} color="#4F46E5" />
              <Text style={styles.statValue}>{stats.total_units}</Text>
              <Text style={styles.statLabel}>Total Units</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="people" size={24} color="#10B981" />
              <Text style={styles.statValue}>{stats.total_residents}</Text>
              <Text style={styles.statLabel}>Residents</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="receipt" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.pending_bills}</Text>
              <Text style={styles.statLabel}>Pending Bills</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="person-add" size={24} color="#3B82F6" />
              <Text style={styles.statValue}>{stats.today_visitors}</Text>
              <Text style={styles.statLabel}>Today's Visitors</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.statValue}>{stats.open_complaints}</Text>
              <Text style={styles.statLabel}>Open Complaints</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="cash" size={24} color="#A855F7" />
              <Text style={styles.statValue}>₹{stats.balance.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Balance</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsGrid}>
          {user?.role === 'gatekeeper' && (
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/visitors/add')}>
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="person-add" size={28} color="#4F46E5" />
              </View>
              <Text style={styles.actionText}>Log Visitor</Text>
            </TouchableOpacity>
          )}
          {user?.role === 'resident' && (
            <>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/bills')}>
                <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="receipt" size={28} color="#F59E0B" />
                </View>
                <Text style={styles.actionText}>Pay Bills</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/complaints/add')}>
                <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={28} color="#EF4444" />
                </View>
                <Text style={styles.actionText}>Raise Complaint</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/visitors')}>
            <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="people" size={28} color="#3B82F6" />
            </View>
            <Text style={styles.actionText}>View Visitors</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Notices</Text>
          <TouchableOpacity onPress={() => router.push('/notices')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {notices.length > 0 ? (
          notices.map((notice) => (
            <View key={notice.id} style={styles.noticeCard}>
              <View style={styles.noticeHeader}>
                <View style={[styles.priorityBadge, notice.priority === 'urgent' && styles.urgentBadge]}>
                  <Text style={[styles.priorityText, notice.priority === 'urgent' && styles.urgentText]}>
                    {notice.priority === 'urgent' ? 'URGENT' : 'NORMAL'}
                  </Text>
                </View>
                <Text style={styles.noticeDate}>
                  {new Date(notice.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.noticeTitle}>{notice.title}</Text>
              <Text style={styles.noticeContent} numberOfLines={2}>
                {notice.content}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No notices yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAll: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '31%',
    marginHorizontal: '1%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  actionCard: {
    width: '48%',
    marginHorizontal: '1%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
  },
  priorityText: {
    fontSize: 10,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  noticeContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
