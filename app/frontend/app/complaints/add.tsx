import React, { useState } from 'react';
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
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { complaintAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

export default function AddComplaintScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user?.unit_id) {
      Alert.alert('Error', 'You must be assigned to a unit to raise a complaint');
      return;
    }

    setSubmitting(true);
    try {
      await complaintAPI.create({
        title: formData.title,
        description: formData.description,
        unit_id: user.unit_id,
        priority: formData.priority,
      });
      
      Alert.alert('Success', 'Complaint submitted successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen
        options={{
          title: 'Raise Complaint',
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#FFFFFF',
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#4F46E5" />
            <Text style={styles.infoText}>
              Describe your issue clearly. Our team will address it promptly.
            </Text>
          </View>

          <Text style={styles.label}>Issue Title *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="create-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.input}
              placeholder="e.g., Broken elevator, Water leakage"
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <Text style={styles.label}>Description *</Text>
          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the issue in detail..."
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.label}>Priority *</Text>
          <View style={styles.priorityContainer}>
            <TouchableOpacity
              style={[
                styles.priorityChip,
                formData.priority === 'low' && styles.priorityChipActive,
                { borderColor: '#6B7280' },
              ]}
              onPress={() => setFormData({ ...formData, priority: 'low' })}
            >
              <Text
                style={[
                  styles.priorityText,
                  formData.priority === 'low' && { color: '#6B7280' },
                ]}
              >
                Low
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priorityChip,
                formData.priority === 'medium' && styles.priorityChipActive,
                { borderColor: '#F59E0B' },
              ]}
              onPress={() => setFormData({ ...formData, priority: 'medium' })}
            >
              <Text
                style={[
                  styles.priorityText,
                  formData.priority === 'medium' && { color: '#F59E0B' },
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priorityChip,
                formData.priority === 'high' && styles.priorityChipActive,
                { borderColor: '#EF4444' },
              ]}
              onPress={() => setFormData({ ...formData, priority: 'high' })}
            >
              <Text
                style={[
                  styles.priorityText,
                  formData.priority === 'high' && { color: '#EF4444' },
                ]}
              >
                High
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
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
  scrollContent: {
    padding: 20,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4F46E5',
    lineHeight: 20,
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
    minHeight: 56,
    gap: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 120,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityChipActive: {
    backgroundColor: '#FFFFFF',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
    shadowColor: '#EF4444',
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
