import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'musictab_instrument_selection';

const INSTRUMENTS = [
  { id: 'drums', name: 'Drums', icon: '🥁', description: 'Drum kit transcription' },
  { id: 'bass', name: 'Bass', icon: '🎸', description: 'Bass line transcription' },
  { id: 'guitar', name: 'Guitar', icon: '🎸', description: 'Guitar parts transcription' },
  { id: 'piano', name: 'Piano', icon: '🎹', description: 'Piano/keyboard transcription' },
  { id: 'chords', name: 'Chords', icon: '🎵', description: 'Chord progression analysis' },
];

const SEPARATION_OPTIONS = [
  { id: 'separate', name: 'Source Separation', description: 'Separate instruments before transcription' },
];

const PRECISION_OPTIONS = [
  { id: 'fast', name: 'Fast', description: 'Quick processing, good quality' },
  { id: 'balanced', name: 'Balanced', description: 'Moderate speed, better quality' },
  { id: 'high', name: 'High Precision', description: 'Slower processing, best quality' },
];

export default function InstrumentsScreen() {
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [separateEnabled, setSeparateEnabled] = useState(false);
  const [precision, setPrecision] = useState('balanced');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Load saved selections on component mount
  useEffect(() => {
    loadSavedSelections();
  }, []);

  // Save selections whenever they change
  useEffect(() => {
    if (!loading) {
      saveSelections();
    }
  }, [selectedInstrument, separateEnabled, precision, loading]);

  const loadSavedSelections = async () => {
    try {
      console.log('🎵 T38: Loading saved instrument selections...');
      
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('✅ T38: Loaded saved selections:', parsed);
        
        setSelectedInstrument(parsed.instrument || null);
        setSeparateEnabled(parsed.separate || false);
        setPrecision(parsed.precision || 'balanced');
      } else {
        console.log('📋 T38: No saved selections found, using defaults');
      }
    } catch (error) {
      console.error('❌ T38: Error loading selections:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSelections = async () => {
    try {
      const dataToSave = {
        instrument: selectedInstrument,
        separate: separateEnabled,
        precision: precision,
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('💾 T38: Selections saved to local store:', dataToSave);
    } catch (error) {
      console.error('❌ T38: Error saving selections:', error);
    }
  };

  const selectInstrument = (instrumentId) => {
    console.log(`🎵 T38: Selecting instrument: ${instrumentId}`);

    const newSelection = selectedInstrument === instrumentId ? null : instrumentId;
    setSelectedInstrument(newSelection);

    console.log('📋 T38: Updated instrument selection:', newSelection);
  };

  const toggleSeparation = () => {
    console.log('🔄 T38: Toggling source separation:', !separateEnabled);
    setSeparateEnabled(!separateEnabled);
  };

  const selectPrecision = (precisionLevel) => {
    console.log('⚙️ T38: Setting precision level:', precisionLevel);
    setPrecision(precisionLevel);
  };

  const clearSelections = () => {
    Alert.alert(
      'Clear Selections',
      'Are you sure you want to clear all selections?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ T38: Clearing all selections');
            setSelectedInstrument(null);
            setSeparateEnabled(false);
            setPrecision('balanced');
          }
        }
      ]
    );
  };

  const proceedToProcessing = () => {
    if (!selectedInstrument) {
      Alert.alert('No Instrument Selected', 'Please select an instrument to transcribe.');
      return;
    }

    console.log('🚀 T38: Proceeding with selections:', {
      instrument: selectedInstrument,
      separate: separateEnabled,
      precision: precision
    });

    Alert.alert(
      'Processing Configuration',
      `Selected: ${selectedInstrument}\nSeparation: ${separateEnabled ? 'Yes' : 'No'}\nPrecision: ${precision}`,
      [
        { text: 'OK' },
        { text: 'Continue to Processing', onPress: () => {
          // TODO: Navigate to processing/job creation page
          console.log('📋 T38: Ready for T39 - Create Job');
        }}
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Instrument Selection</Text>
        <Text style={styles.subtitle}>Please sign in to select instruments</Text>
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
        <Text style={styles.title}>🎵 Instrument Selection</Text>
        <Text style={styles.subtitle}>Loading saved selections...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>🎵 Instrument Selection</Text>
        <Text style={styles.subtitle}>Choose instruments to transcribe</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instruments</Text>
          <Text style={styles.sectionDescription}>
            Select one instrument to transcribe from your audio
          </Text>
          
          {INSTRUMENTS.map((instrument) => (
            <TouchableOpacity
              key={instrument.id}
              style={[
                styles.instrumentCard,
                selectedInstrument === instrument.id && styles.selectedCard
              ]}
              onPress={() => selectInstrument(instrument.id)}
            >
              <View style={styles.instrumentHeader}>
                <Text style={styles.instrumentIcon}>{instrument.icon}</Text>
                <View style={styles.instrumentInfo}>
                  <Text style={[
                    styles.instrumentName,
                    selectedInstrument === instrument.id && styles.selectedText
                  ]}>
                    {instrument.name}
                  </Text>
                  <Text style={styles.instrumentDescription}>
                    {instrument.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  selectedInstrument === instrument.id && styles.selectedRadio
                ]}>
                  {selectedInstrument === instrument.id && (
                    <View style={styles.radioDot} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Processing Options</Text>
          
          <TouchableOpacity
            style={[
              styles.optionCard,
              separateEnabled && styles.selectedCard
            ]}
            onPress={toggleSeparation}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionInfo}>
                <Text style={[
                  styles.optionName,
                  separateEnabled && styles.selectedText
                ]}>
                  Source Separation
                </Text>
                <Text style={styles.optionDescription}>
                  Separate instruments before transcription for better accuracy
                </Text>
              </View>
              <View style={[
                styles.checkbox,
                separateEnabled && styles.checkedBox
              ]}>
                {separateEnabled && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precision Level</Text>
          <Text style={styles.sectionDescription}>
            Choose processing speed vs quality trade-off
          </Text>
          
          {PRECISION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.precisionCard,
                precision === option.id && styles.selectedCard
              ]}
              onPress={() => selectPrecision(option.id)}
            >
              <View style={styles.precisionHeader}>
                <View style={styles.precisionInfo}>
                  <Text style={[
                    styles.precisionName,
                    precision === option.id && styles.selectedText
                  ]}>
                    {option.name}
                  </Text>
                  <Text style={styles.precisionDescription}>
                    {option.description}
                  </Text>
                </View>
                <View style={[
                  styles.radioButton,
                  precision === option.id && styles.selectedRadio
                ]}>
                  {precision === option.id && (
                    <View style={styles.radioDot} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={[styles.button, styles.clearButton]} 
            onPress={clearSelections}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.proceedButton,
              !selectedInstrument && styles.disabledButton
            ]}
            onPress={proceedToProcessing}
            disabled={!selectedInstrument}
          >
            <Text style={styles.buttonText}>
              Continue {selectedInstrument ? `(${selectedInstrument})` : '(none selected)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>T38 - Instrument Selection</Text>
        </View>
      </View>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
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
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  instrumentCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  instrumentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instrumentIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  instrumentInfo: {
    flex: 1,
  },
  instrumentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instrumentDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedText: {
    color: '#007AFF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fafafa',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  precisionCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  precisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  precisionInfo: {
    flex: 1,
  },
  precisionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  precisionDescription: {
    fontSize: 14,
    color: '#666',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: '#007AFF',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  proceedButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  version: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
