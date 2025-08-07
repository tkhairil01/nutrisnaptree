import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { ExerciseStackParamList } from '../types';

// Import API
import { getCurrentUser, getData, insertData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type AddExerciseScreenNavigationProp = NativeStackNavigationProp<ExerciseStackParamList, 'AddExercise'>;

// Exercise types with estimated calories burned per minute (for 70kg person)
const exerciseTypes = [
  { name: 'Walking', caloriesPerMinute: 4 },
  { name: 'Running', caloriesPerMinute: 10 },
  { name: 'Cycling', caloriesPerMinute: 8 },
  { name: 'Swimming', caloriesPerMinute: 9 },
  { name: 'Yoga', caloriesPerMinute: 3 },
  { name: 'Weight Training', caloriesPerMinute: 5 },
  { name: 'HIIT', caloriesPerMinute: 12 },
  { name: 'Dancing', caloriesPerMinute: 6 },
  { name: 'Basketball', caloriesPerMinute: 8 },
  { name: 'Soccer', caloriesPerMinute: 9 },
  { name: 'Tennis', caloriesPerMinute: 7 },
  { name: 'Volleyball', caloriesPerMinute: 6 },
  { name: 'Badminton', caloriesPerMinute: 5 },
  { name: 'Table Tennis', caloriesPerMinute: 4 },
  { name: 'Aerobics', caloriesPerMinute: 7 },
  { name: 'Pilates', caloriesPerMinute: 4 },
  { name: 'Zumba', caloriesPerMinute: 7 },
  { name: 'Kickboxing', caloriesPerMinute: 10 },
  { name: 'Jump Rope', caloriesPerMinute: 11 },
  { name: 'Stair Climbing', caloriesPerMinute: 8 },
  { name: 'Elliptical Trainer', caloriesPerMinute: 6 },
  { name: 'Rowing', caloriesPerMinute: 7 },
  { name: 'Hiking', caloriesPerMinute: 6 },
  { name: 'Martial Arts', caloriesPerMinute: 9 },
];

const AddExerciseScreen: React.FC = () => {
  const navigation = useNavigation<AddExerciseScreenNavigationProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Exercise data state
  const [exerciseType, setExerciseType] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [caloriesBurned, setCaloriesBurned] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExerciseModal, setShowExerciseModal] = useState<boolean>(false);
  
  // Stopwatch state
  const [isStopwatchMode, setIsStopwatchMode] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // User weight for calorie calculation
  const [userWeight, setUserWeight] = useState<number>(70); // Default weight in kg
  
  // Set i18n locale
  useEffect(() => {
    const getLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        if (savedLanguage) {
          setLanguage(savedLanguage);
          i18n.locale = savedLanguage;
        }
      } catch (e) {
        console.error('Failed to get language preference', e);
      }
    };
    
    getLanguage();
  }, []);
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data, error } = await getCurrentUser();
        
        if (error) {
          throw error;
        }
        
        if (data?.user) {
          setUserId(data.user.id);
          
          // Get user profile data from database
          const { data: userData, error: userError } = await getData('users', 'id', data.user.id);
          
          if (userError) {
            throw userError;
          }
          
          if (userData && userData.length > 0) {
            // Set user weight for more accurate calorie calculation
            setUserWeight(userData[0].currentWeight || 70);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);
  
  // Stopwatch effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);
  
  // Update duration and calories when stopwatch changes
  useEffect(() => {
    if (isStopwatchMode) {
      const minutes = Math.floor(seconds / 60);
      setDuration(minutes.toString());
      
      // Calculate calories if exercise type is selected
      if (exerciseType) {
        const selectedExercise = exerciseTypes.find(e => e.name === exerciseType);
        if (selectedExercise) {
          // Adjust calories based on user weight (70kg is the reference weight)
          const weightFactor = userWeight / 70;
          const calories = Math.round(selectedExercise.caloriesPerMinute * minutes * weightFactor);
          setCaloriesBurned(calories.toString());
        }
      }
    }
  }, [seconds, isStopwatchMode, exerciseType, userWeight]);
  
  // Calculate calories burned when duration or exercise type changes
  useEffect(() => {
    if (!isStopwatchMode && exerciseType && duration) {
      const durationMinutes = parseInt(duration) || 0;
      const selectedExercise = exerciseTypes.find(e => e.name === exerciseType);
      
      if (selectedExercise) {
        // Adjust calories based on user weight (70kg is the reference weight)
        const weightFactor = userWeight / 70;
        const calories = Math.round(selectedExercise.caloriesPerMinute * durationMinutes * weightFactor);
        setCaloriesBurned(calories.toString());
      }
    }
  }, [duration, exerciseType, isStopwatchMode, userWeight]);
  
  // Toggle stopwatch mode
  const toggleStopwatchMode = () => {
    if (isRunning) {
      // Stop the stopwatch if it's running
      setIsRunning(false);
    }
    
    setIsStopwatchMode(!isStopwatchMode);
    setSeconds(0);
    setDuration('0');
  };
  
  // Start or stop the stopwatch
  const toggleStopwatch = () => {
    setIsRunning(!isRunning);
  };
  
  // Reset the stopwatch
  const resetStopwatch = () => {
    setIsRunning(false);
    setSeconds(0);
    setDuration('0');
    setCaloriesBurned('0');
  };
  
  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Filter exercise types based on search query
  const filteredExerciseTypes = exerciseTypes.filter(exercise => 
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Select exercise type from modal
  const selectExerciseType = (type: string) => {
    setExerciseType(type);
    setShowExerciseModal(false);
    
    // Calculate calories if duration is already set
    if (!isStopwatchMode && duration) {
      const durationMinutes = parseInt(duration) || 0;
      const selectedExercise = exerciseTypes.find(e => e.name === type);
      
      if (selectedExercise) {
        // Adjust calories based on user weight (70kg is the reference weight)
        const weightFactor = userWeight / 70;
        const calories = Math.round(selectedExercise.caloriesPerMinute * durationMinutes * weightFactor);
        setCaloriesBurned(calories.toString());
      }
    }
  };
  
  // Function to save exercise entry
  const saveExercise = async () => {
    if (!userId) {
      Alert.alert(i18n.t('error'), i18n.t('notLoggedIn'));
      return;
    }
    
    if (!exerciseType) {
      Alert.alert(i18n.t('error'), i18n.t('selectExerciseType'));
      return;
    }
    
    if (!duration || parseInt(duration) <= 0) {
      Alert.alert(i18n.t('error'), i18n.t('enterValidDuration'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Get current date and time
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().substring(0, 5);
      
      // Create exercise entry object
      const exerciseEntry = {
        userId,
        type: exerciseType,
        duration: parseInt(duration),
        caloriesBurned: parseInt(caloriesBurned) || 0,
        notes: notes.trim(),
        date,
        time,
      };
      
      // Insert exercise entry into database
      const { data, error } = await insertData('exercises', exerciseEntry);
      
      if (error) {
        throw error;
      }
      
      // Navigate back to exercise screen
      navigation.goBack();
    } catch (error) {
      console.error('Error saving exercise:', error);
      Alert.alert(i18n.t('error'), i18n.t('saveExerciseError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Render exercise type modal
  const renderExerciseTypeModal = () => {
    return (
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{i18n.t('selectExerciseType')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowExerciseModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={i18n.t('searchExercises')}
                placeholderTextColor="#999"
              />
            </View>
            
            <FlatList
              data={filteredExerciseTypes}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseTypeItem}
                  onPress={() => selectExerciseType(item.name)}
                >
                  <Text style={styles.exerciseTypeName}>{item.name}</Text>
                  <Text style={styles.exerciseTypeCalories}>
                    ~{item.caloriesPerMinute} {i18n.t('calPerMin')}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.exerciseTypeList}
            />
          </View>
        </View>
      </Modal>
    );
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('addExercise')}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{i18n.t('exerciseType')}</Text>
            <TouchableOpacity
              style={styles.exerciseTypeButton}
              onPress={() => setShowExerciseModal(true)}
            >
              <Text style={[styles.exerciseTypeText, !exerciseType && styles.placeholderText]}>
                {exerciseType || i18n.t('selectExerciseType')}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.durationSection}>
            <View style={styles.durationHeader}>
              <Text style={styles.sectionTitle}>{i18n.t('duration')}</Text>
              
              <TouchableOpacity
                style={styles.modeToggle}
                onPress={toggleStopwatchMode}
              >
                <Text style={styles.modeToggleText}>
                  {isStopwatchMode ? i18n.t('manualMode') : i18n.t('stopwatchMode')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {isStopwatchMode ? (
              <View style={styles.stopwatchContainer}>
                <Text style={styles.stopwatchTime}>{formatTime(seconds)}</Text>
                
                <View style={styles.stopwatchControls}>
                  <TouchableOpacity
                    style={[styles.stopwatchButton, isRunning ? styles.stopButton : styles.startButton]}
                    onPress={toggleStopwatch}
                  >
                    <Text style={styles.stopwatchButtonText}>
                      {isRunning ? i18n.t('stop') : i18n.t('start')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.stopwatchButton, styles.resetButton]}
                    onPress={resetStopwatch}
                    disabled={seconds === 0}
                  >
                    <Text style={[styles.stopwatchButtonText, seconds === 0 && styles.disabledText]}>
                      {i18n.t('reset')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.manualDurationContainer}>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.durationInput}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />
                  <Text style={styles.durationUnit}>{i18n.t('minutes')}</Text>
                </View>
              </View>
            )}
          </View>
          
          <View style={styles.caloriesSection}>
            <Text style={styles.sectionTitle}>{i18n.t('caloriesBurned')}</Text>
            
            <View style={styles.caloriesContainer}>
              <TextInput
                style={styles.caloriesInput}
                value={caloriesBurned}
                onChangeText={setCaloriesBurned}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={styles.caloriesUnit}>{i18n.t('calories')}</Text>
            </View>
          </View>
          
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>{i18n.t('notes')}</Text>
            
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder={i18n.t('addNotes')}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveExercise}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{i18n.t('saveExercise')}</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {renderExerciseTypeModal()}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 30,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  exerciseTypeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  exerciseTypeText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  durationSection: {
    marginVertical: 15,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modeToggle: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  modeToggleText: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: 'bold',
  },
  stopwatchContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  stopwatchTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stopwatchControls: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stopwatchButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF5722',
  },
  resetButton: {
    backgroundColor: '#2196F3',
  },
  stopwatchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledText: {
    opacity: 0.5,
  },
  manualDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  durationUnit: {
    position: 'absolute',
    right: 12,
    fontSize: 16,
    color: '#666',
  },
  caloriesSection: {
    marginVertical: 15,
  },
  caloriesContainer: {
    position: 'relative',
  },
  caloriesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  caloriesUnit: {
    position: 'absolute',
    right: 12,
    top: 14,
    fontSize: 16,
    color: '#666',
  },
  notesSection: {
    marginVertical: 15,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    height: 100,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    margin: 15,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  exerciseTypeList: {
    paddingHorizontal: 15,
  },
  exerciseTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  exerciseTypeName: {
    fontSize: 16,
    color: '#333',
  },
  exerciseTypeCalories: {
    fontSize: 14,
    color: '#FF5722',
  },
});

export default AddExerciseScreen;