import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router'

const BACKEND_URL = 'http://192.168.0.101:3001'; // Update with your IP

type ThreatType = 'deforestation' | 'illegal_logging' | 'fire' | 'encroachment' | 'poaching' | 'other';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface ReportData {
  threatType: ThreatType;
  location: string;
  description: string;
  severity: Severity;
  latitude: number;
  longitude: number;
}

interface AnonymousReportModalProps {
  visible: boolean;
  onClose: () => void;                   
  onLocationSelect?: (lat: number, lon: number) => void;  
}

export default function AnonymousReportModal({
  visible,
  onClose,
  onLocationSelect,
}: AnonymousReportModalProps){
   
  const [threatType, setThreatType] = useState<ThreatType>('deforestation');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('-0.4583');
  const [longitude, setLongitude] = useState('35.9167');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const router = useRouter();

  const resetForm = () => {
    setThreatType('deforestation');
    setSeverity('medium');
    setDescription('');
    setLatitude('-0.4583');
    setLongitude('35.9167');
    setSubmitted(false);
    setTransactionId(null);
  };

  const handleClose = () => {
    resetForm();
   if(onClose) onClose();
  };

  const submitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the threat');
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        threatType,
        location: `${latitude}, ${longitude}`,
        description: description.trim(),
        severity,
        photoHash: null,
      };

      const response = await fetch(`${BACKEND_URL}/api/reports/anonymous`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit report');
      }

      setTransactionId(result.transactionId);
      setSubmitted(true);

      Alert.alert(
        'Report Submitted Anonymously',
        `Your threat report has been recorded on Hedera HCS immutably.\n\nTransaction ID: ${result.transactionId}\n\nNo personal information was recorded.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', `Failed to submit report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Error', 'Invalid latitude/longitude');
      return;
    }

    onLocationSelect?.(lat, lon);
    Alert.alert('Location Selected', `Coordinates: ${lat}, ${lon}`);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Report Threat Anonymously</Text>
            <TouchableOpacity onPress={ () => {handleClose(); router.replace('/')}}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {!submitted ? (
              <>
                {/* Threat Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Type of Threat *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={threatType}
                      onValueChange={(value) => setThreatType(value as ThreatType)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Deforestation" value="deforestation" />
                      <Picker.Item label="Illegal Logging" value="illegal_logging" />
                      <Picker.Item label="Fire" value="fire" />
                      <Picker.Item label="Encroachment" value="encroachment" />
                      <Picker.Item label="Poaching" value="poaching" />
                      <Picker.Item label="Other" value="other" />
                    </Picker>
                  </View>
                </View>

                {/* Severity */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Severity Level *</Text>
                  <View style={styles.severityButtons}>
                    {(['low', 'medium', 'high', 'critical'] as Severity[]).map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.severityBtn,
                          severity === level && styles.severityBtnActive,
                          level === 'critical' && styles.severityBtnCritical,
                          level === 'high' && styles.severityBtnHigh,
                        ]}
                        onPress={() => setSeverity(level)}
                      >
                        <Text
                          style={[
                            styles.severityBtnText,
                            severity === level && styles.severityBtnTextActive,
                          ]}
                        >
                          {level.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Location */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Location Coordinates *</Text>
                  <View style={styles.coordsContainer}>
                    <TextInput
                      style={styles.coordInput}
                      placeholder="Latitude"
                      value={latitude}
                      onChangeText={setLatitude}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                    />
                    <TextInput
                      style={styles.coordInput}
                      placeholder="Longitude"
                      value={longitude}
                      onChangeText={setLongitude}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                    />
                  </View>
                  <TouchableOpacity style={styles.selectLocationBtn} onPress={handleLocationSelect}>
                    <Text style={styles.selectLocationText}>📍 Select from Map</Text>
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="Describe the threat in detail (what you observed, when, etc.)"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#999"
                    textAlignVertical="top"
                  />
                </View>

                {/* Privacy Notice */}
                <View style={styles.privacyNotice}>
                  <Text style={styles.privacyText}>
                    <Text style={styles.privacyBold}>Complete Anonymity:</Text> Your report uses a temporary
                    blockchain account. No personal data is recorded.
                  </Text>
                  <Text style={styles.privacyText}>
                    <Text style={styles.privacyBold}>Immutable:</Text> Once submitted, your report cannot be altered or
                    deleted.
                  </Text>
                  <Text style={styles.privacyText}>
                    <Text style={styles.privacyBold}>Powered by Hedera:</Text> Reports stored on Hedera HCS for
                    transparency.
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={submitReport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="#121212" size="small" />
                      <Text style={styles.submitBtnText}>Submitting...</Text>
                    </>
                  ) : (
                    <Text style={styles.submitBtnText}>📤 Submit Report Anonymously</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              // Success Screen
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>Report Submitted Successfully</Text>
                <Text style={styles.successText}>
                  Your threat report has been securely recorded on the Hedera blockchain.
                </Text>

                <View style={styles.transactionCard}>
                  <Text style={styles.transactionLabel}>Transaction ID:</Text>
                  <Text style={styles.transactionId}>{transactionId}</Text>
                  <Text style={styles.transactionHint}>Save this for your records (optional)</Text>
                </View>

                <View style={styles.benefitsContainer}>
                  <Text style={styles.benefitTitle}>Why blockchain?</Text>
                  <Text style={styles.benefitItem}>✓ Permanent record - cannot be deleted or altered</Text>
                  <Text style={styles.benefitItem}>✓ Fully anonymous - no personal data linked</Text>
                  <Text style={styles.benefitItem}>✓ Transparent - admin can verify authenticity</Text>
                  <Text style={styles.benefitItem}>✓ Time-stamped - exact timestamp recorded</Text>
                </View>

                <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '95%',
    borderTopWidth: 3,
    borderTopColor: '#4caf50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  closeButton: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#333',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  picker: {
    color: '#fff',
    backgroundColor: '#333',
  },
  severityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
  },
  severityBtnActive: {
    borderColor: '#4caf50',
    backgroundColor: '#4caf50',
  },
  severityBtnHigh: {
    borderColor: '#ff9800',
  },
  severityBtnCritical: {
    borderColor: '#f44336',
  },
  severityBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#bbb',
  },
  severityBtnTextActive: {
    color: '#121212',
  },
  coordsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  coordInput: {
    flex: 1,
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 12,
  },
  selectLocationBtn: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#2196f3',
    borderRadius: 8,
    alignItems: 'center',
  },
  selectLocationText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  descriptionInput: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 12,
    minHeight: 100,
  },
  privacyNotice: {
    backgroundColor: '#1b5e20',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  privacyText: {
    color: '#c8e6c9',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 18,
  },
  privacyBold: {
    fontWeight: 'bold',
    color: '#fff',
  },
  submitBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 80,
    color: '#4caf50',
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  successText: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  transactionCard: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 10,
    padding: 15,
    width: '90%',
    marginBottom: 20,
  },
  transactionLabel: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 5,
  },
  transactionId: {
    color: '#4caf50',
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  transactionHint: {
    color: '#999',
    fontSize: 11,
    fontStyle: 'italic',
  },
  benefitsContainer: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    padding: 15,
    width: '90%',
    marginBottom: 20,
  },
  benefitTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 10,
  },
  benefitItem: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 6,
  },
  doneBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});