import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { billAPI } from '../../src/services/api';
import { Bill } from '../../src/types';
import { format } from 'date-fns';

export default function BillsScreen() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const fetchBills = async () => {
    try {
      const params: any = {};
      if (filter === 'paid') params.paid = true;
      if (filter === 'unpaid') params.paid = false;
      
      const data = await billAPI.getAll(params);
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const handlePayment = async (bill: Bill) => {
    Alert.alert(
      'Payment',
      `Pay ₹${bill.total} for ${getMonthName(bill.month)} ${bill.year}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              await billAPI.createPayment({
                bill_id: bill.id,
                amount: bill.total,
                payment_method: 'upi',
                transaction_id: `TXN${Date.now()}`,
              });
              Alert.alert('Success', 'Payment successful!');
              fetchBills();
            } catch (error) {
              Alert.alert('Error', 'Payment failed. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const renderBill = ({ item }: { item: Bill }) => (
    <View style={styles.billCard}>
      <View style={styles.billHeader}>
        <View>
          <Text style={styles.billMonth}>
            {getMonthName(item.month)} {item.year}
          </Text>
          <Text style={styles.billDate}>
            Due: {format(new Date(item.due_date), 'dd MMM yyyy')}
          </Text>
        </View>
        <View style={[styles.paidBadge, { backgroundColor: item.paid ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={[styles.paidText, { color: item.paid ? '#10B981' : '#EF4444' }]}>
            {item.paid ? 'PAID' : 'UNPAID'}
          </Text>
        </View>
      </View>

      <View style={styles.billDetails}>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Maintenance</Text>
          <Text style={styles.billValue}>₹{item.maintenance.toLocaleString()}</Text>
        </View>
        <View style={styles.billRow}>
          <Text style={styles.billLabel}>Parking</Text>
          <Text style={styles.billValue}>₹{item.parking.toLocaleString()}</Text>
        </View>
        {item.other_charges > 0 && (
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Other Charges</Text>
            <Text style={styles.billValue}>₹{item.other_charges.toLocaleString()}</Text>
          </View>
        )}
        {item.penalty > 0 && (
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: '#EF4444' }]}>Penalty</Text>
            <Text style={[styles.billValue, { color: '#EF4444' }]}>₹{item.penalty.toLocaleString()}</Text>
          </View>
        )}
        <View style={styles.divider} />
        <View style={styles.billRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>₹{item.total.toLocaleString()}</Text>
        </View>
      </View>

      {!item.paid && (
        <TouchableOpacity style={styles.payButton} onPress={() => handlePayment(item)}>
          <Ionicons name="card" size={20} color="#FFFFFF" />
          <Text style={styles.payButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}

      {item.paid && item.payment_id && (
        <View style={styles.paymentInfo}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.paymentId}>Payment ID: {item.payment_id}</Text>
        </View>
      )}
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
          style={[styles.filterButton, filter === 'unpaid' && styles.filterButtonActive]}
          onPress={() => setFilter('unpaid')}
        >
          <Text style={[styles.filterText, filter === 'unpaid' && styles.filterTextActive]}>
            Unpaid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'paid' && styles.filterButtonActive]}
          onPress={() => setFilter('paid')}
        >
          <Text style={[styles.filterText, filter === 'paid' && styles.filterTextActive]}>
            Paid
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bills}
        renderItem={renderBill}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No bills found</Text>
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
  listContent: {
    padding: 16,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  billMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  paidBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '600',
  },
  billDetails: {
    marginBottom: 16,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  paymentId: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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
