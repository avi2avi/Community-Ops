import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { visitorAPI, unitAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { Unit } from '../../src/types';

export default function AddVisitorScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: '',
    unit_id: '',
    vehicle_number: '',
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const data = await unitAPI.getAll();
      setUnits(data);
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.purpose || !formData.unit_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const selectedUnit = units.find(u => u.id === formData.unit_id);
    if (!selectedUnit || !selectedUnit.owner_id) {
      Alert.alert('Error', 'Selected unit does not have an owner assigned');
      return;
    }

    setSubmitting(true);
    try {
      await visitorAPI.create({
        name: formData.name,
        phone: formData.phone,
        purpose: formData.purpose,
        unit_id: formData.unit_id,
        resident_id: selectedUnit.owner_id,
        vehicle_number: formData.vehicle_number || undefined,
      });
      
      Alert.alert('Success', 'Visitor logged successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to log visitor');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Log Visitor',
            headerStyle: { backgroundColor: '#4F46E5' },
            headerTintColor: '#FFFFFF',
          }}
        />
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: 'Log Visitor',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Visitor Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Enter visitor name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <Text style={styles.label}>Phone Number *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.label}>Purpose of Visit *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="clipboard-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="e.g., Personal visit, Delivery, Service"
              value={formData.purpose}
              onChangeText={(text) => setFormData({ ...formData, purpose: text })}
            />
          </View>

          <Text style={styles.label}>Visiting Unit *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitsScroll}>
            {units.map((unit) => (
              <TouchableOpacity
                key={unit.id}
                style={[
                  styles.unitChip,
                  formData.unit_id === unit.id && styles.unitChipActive,
                ]}
                onPress={() => setFormData({ ...formData, unit_id: unit.id })}
              >
                <Text
                  style={[
                    styles.unitChipText,
                    formData.unit_id === unit.id && styles.unitChipTextActive,
                  ]}
                >
                  {unit.building ? `${unit.building}-` : ''}{unit.unit_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Vehicle Number (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="car-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="e.g., MH01AB1234"
              value={formData.vehicle_number}
              onChangeText={(text) => setFormData({ ...formData, vehicle_number: text })}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Logging Visitor...' : 'Log Visitor Entry'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  unitsScroll: {
    marginTop: 8,
    marginBottom: 8,
  },
  unitChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  unitChipTextActive: {
    color: '#4F46E5',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
