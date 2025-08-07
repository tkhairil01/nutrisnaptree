import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { ExerciseStackParamList } from '../types';

// Import API
import { getCurrentUser, getData, updateData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type EditExerciseScreenNavigationProp = NativeStackNavigationProp<ExerciseStackParamList, 'EditExercise'>;
type EditExerciseScreenRouteProp = RouteProp<ExerciseStackParamList, 'EditExercise'>;

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

const EditExerciseScreen: React.FC = () => {
  const navigation = useNavigation<EditExerciseScreenNavigationProp>();
  const route = useRoute<EditExerciseScreenRouteProp>();
  const { exerciseId } = route.params;
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  
  // Exercise data state
  const [exerciseType, setExerciseType] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [caloriesBurned, setCaloriesBurned] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExerciseModal, setShowExerciseModal] = useState<boolean>(false);
  
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
  
  // Load user data and exercise data
  useEffect(() => {
    const loadData = async () => {
      try {
        setInitialLoading(true);
        
        // Get current user
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
          
          // Get exercise data
          const { data: exerciseData, error: exerciseError } = await getData('exercises', 'id', exerciseId);
          
          if (exerciseError) {
            throw exerciseError;
          }
          
          if (exerciseData && exerciseData.length > 0) {
            const exercise = exerciseData[0];
            
            // Set exercise data
            setExerciseType(exercise.type || '');
            setDuration(exercise.duration ? exercise.duration.toString() : '0');
            setCaloriesBurned(exercise.caloriesBurned ? exercise.caloriesBurned.toString() : '0');
            setNotes(exercise.notes || '');
            setDate(exercise.date || '');
            setTime(exercise.time || '');
          } else {
            // Exercise not found
            Alert.alert(i18n.t('error'), i18n.t('exerciseNotFound'));
            navigation.goBack();
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert(i18n.t('error'), i18n.t('loadDataError'));
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadData();
  }, [exerciseId, navigation]);
  
  // Calculate calories burned when duration or exercise type changes
  useEffect(() => {
    if (exerciseType && duration) {
      const durationMinutes = parseInt(duration) || 0;
      const selectedExercise = exerciseTypes.find(e => e.name === exerciseType);
      
      if (selectedExercise) {
        // Adjust calories based on user weight (70kg is the reference weight)
        const weightFactor = userWeight / 70;
        const calories = Math.round(selectedExercise.caloriesPerMinute * durationMinutes * weightFactor);
        setCaloriesBurned(calories.toString());
      }
    }
  }, [duration, exerciseType, userWeight]);
  
  // Filter exercise types based on search query
  const filteredExerciseTypes = exerciseTypes.filter(exercise => 
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Select exercise type from modal
  const selectExerciseType = (type: string) => {
    setExerciseType(type);
    setShowExerciseModal(false);
    
    // Calculate calories if duration is already set
    if (duration) {
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
  
  // Function to update exercise entry
  const updateExercise = async () => {
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
      
      // Create updated exercise entry object
      const updatedExercise = {
        type: exerciseType,
        duration: parseInt(duration),
        caloriesBurned: parseInt(caloriesBurned) || 0,
        notes: notes.trim(),
        // Keep original date and time
        date,
        time,
      };
      
      // Update exercise entry in database
      const { data, error } = await updateData('exercises', exerciseId, updatedExercise);
      
      if (error) {
        throw error;
      }
      
      // Navigate back to exercise screen
      navigation.goBack();
    } catch (error) {
      console.error('Error updating exercise:', error);
      Alert.alert(i18n.t('error'), i18n.t('updateExerciseError'));
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
  
  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>{i18n.t('loadingExercise')}</Text>
      </View>
    );
  }
  
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
        <Text style={styles.headerTitle}>{i18n.t('editExercise')}</Text>
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
            <Text style={styles.sectionTitle}>{i18n.t('duration')}</Text>
            
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
          
          <View style={styles.dateTimeSection}>
            <Text style={styles.dateTimeText}>
              {i18n.t('originalDateTime')}: {date} {time}
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={updateExercise}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>{i18n.t('updateExercise')}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
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
  dateTimeSection: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  updateButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
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

export default EditExerciseScreen;