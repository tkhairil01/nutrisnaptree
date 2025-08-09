import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { ExerciseStackParamList, Exercise } from '../types';

// Import API
import { getCurrentUser, getData, deleteData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type ExerciseScreenNavigationProp = NativeStackNavigationProp<ExerciseStackParamList, 'ExerciseScreen'>;

const ExerciseScreen: React.FC = () => {
  const navigation = useNavigation<ExerciseScreenNavigationProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exerciseEntries, setExerciseEntries] = useState<Exercise[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateList, setDateList] = useState<string[]>([]);
  
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
            setIsPremium(userData[0].isPremium);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  // Load exercise entries
  useEffect(() => {
    if (userId) {
      loadExerciseEntries();
    }
  }, [userId, selectedDate]);
  
  const loadExerciseEntries = async () => {
    try {
      setLoading(true);
      
      // Get exercise entries for the user
      const { data: exerciseData, error: exerciseError } = await getData('exercises', 'userId', userId);
      
      if (exerciseError) {
        throw exerciseError;
      }
      
      if (exerciseData) {
        // Get unique dates from exercise entries
        const dates = [...new Set(exerciseData.map((exercise: Exercise) => exercise.date))].sort().reverse();
        setDateList(dates);
        
        // Filter exercise entries for selected date
        const filteredEntries = exerciseData.filter((exercise: Exercise) => exercise.date === selectedDate);
        
        // Sort by time
        const sortedEntries = filteredEntries.sort((a: Exercise, b: Exercise) => {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });
        
        setExerciseEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Error loading exercise entries:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadExerciseEntries();
    setRefreshing(false);
  };
  
  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      i18n.t('deleteEntry'),
      i18n.t('deleteEntryConfirm'),
      [
        {
          text: i18n.t('cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteData('exercises', id);
              
              if (error) {
                throw error;
              }
              
              // Refresh the list
              loadExerciseEntries();
            } catch (error) {
              console.error('Error deleting exercise entry:', error);
              Alert.alert(i18n.t('error'), i18n.t('deleteError'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const handleEditEntry = (exercise: Exercise) => {
    navigation.navigate('EditExercise', { exercise });
  };
  
  const renderDateItem = ({ item }: { item: string }) => {
    const isSelected = item === selectedDate;
    const date = new Date(item);
    const day = date.getDate();
    const month = date.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'short' });
    
    return (
      <TouchableOpacity
        style={[styles.dateItem, isSelected && styles.selectedDateItem]}
        onPress={() => setSelectedDate(item)}
      >
        <Text style={[styles.dateDay, isSelected && styles.selectedDateText]}>{day}</Text>
        <Text style={[styles.dateMonth, isSelected && styles.selectedDateText]}>{month}</Text>
      </TouchableOpacity>
    );
  };
  
  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    // Calculate intensity level based on duration and calories burned
    const getIntensityLevel = (duration: number, caloriesBurned: number) => {
      const caloriesPerMinute = caloriesBurned / duration;
      
      if (caloriesPerMinute >= 10) {
        return 'high';
      } else if (caloriesPerMinute >= 5) {
        return 'medium';
      } else {
        return 'low';
      }
    };
    
    const intensityLevel = getIntensityLevel(item.duration, item.caloriesBurned);
    
    return (
      <View style={styles.exerciseItem}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseTypeContainer}>
            <Ionicons name="fitness-outline" size={20} color="#FF5722" />
            <Text style={styles.exerciseType}>{item.type}</Text>
          </View>
          <Text style={styles.exerciseTime}>{item.time.substring(0, 5)}</Text>
        </View>
        
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={18} color="#666" />
                <Text style={styles.detailText}>{item.duration} {i18n.t('minutes')}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="flame-outline" size={18} color="#FF5722" />
                <Text style={styles.detailText}>{item.caloriesBurned} {i18n.t('calories')}</Text>
              </View>
            </View>
            
            <View style={styles.intensityContainer}>
              <Text style={styles.intensityLabel}>{i18n.t('intensity')}:</Text>
              <View style={styles.intensityLevelContainer}>
                <View 
                  style={[
                    styles.intensityLevel, 
                    intensityLevel === 'low' && styles.lowIntensity,
                    intensityLevel === 'medium' && styles.mediumIntensity,
                    intensityLevel === 'high' && styles.highIntensity,
                  ]}
                />
                <Text style={styles.intensityText}>{i18n.t(intensityLevel)}</Text>
              </View>
            </View>
            
            {item.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>{i18n.t('notes')}:</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.exerciseActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditEntry(item)}
          >
            <Ionicons name="pencil-outline" size={18} color="#2196F3" />
            <Text style={[styles.actionText, { color: '#2196F3' }]}>{i18n.t('edit')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteEntry(item.id)}
          >
            <Ionicons name="trash-outline" size={18} color="#FF5722" />
            <Text style={[styles.actionText, { color: '#FF5722' }]}>{i18n.t('delete')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('exercise')}</Text>
      </View>
      
      <View style={styles.dateListContainer}>
        <FlatList
          data={dateList}
          renderItem={renderDateItem}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
        />
      </View>
      
      {!isPremium && (
        <View style={styles.adContainer}>
          <AdMobBanner
            bannerSize="smartBannerPortrait"
            adUnitID="ca-app-pub-3940256099942544/6300978111" // Test ad unit ID
            servePersonalizedAds={true}
          />
        </View>
      )}
      
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>{i18n.t('activitySummary')}</Text>
        </View>
        <View style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {exerciseEntries.reduce((sum, exercise) => sum + exercise.duration, 0)}
            </Text>
            <Text style={styles.summaryLabel}>{i18n.t('totalMinutes')}</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {exerciseEntries.reduce((sum, exercise) => sum + exercise.caloriesBurned, 0)}
            </Text>
            <Text style={styles.summaryLabel}>{i18n.t('caloriesBurned')}</Text>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{exerciseEntries.length}</Text>
            <Text style={styles.summaryLabel}>{i18n.t('activities')}</Text>
          </View>
        </View>
      </View>
      
      {exerciseEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="fitness-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>{i18n.t('noExerciseEntries')}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddExercise')}
          >
            <Text style={styles.addButtonText}>{i18n.t('addExercise')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.exerciseListContainer}>
          <View style={styles.exerciseListHeader}>
            <Text style={styles.exerciseListTitle}>{i18n.t('yourActivities')}</Text>
          </View>
          <FlatList
            data={exerciseEntries}
            renderItem={renderExerciseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.exerciseList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListFooterComponent={<View style={styles.listFooter} />}
          />
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('AddExercise')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateListContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateList: {
    paddingHorizontal: 10,
  },
  dateItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 70,
    borderRadius: 10,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  selectedDateItem: {
    backgroundColor: '#6200EE',
  },
  dateDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  dateMonth: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateText: {
    color: '#fff',
  },
  adContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  exerciseListContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  exerciseListHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  exerciseListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseList: {
    padding: 10,
  },
  exerciseItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6200EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200EE',
    marginLeft: 5,
  },
  exerciseTime: {
    fontSize: 14,
    color: '#666',
  },
  exerciseContent: {
    flexDirection: 'row',
  },
  exerciseDetails: {
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  detailText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  intensityLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  intensityLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intensityLevel: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  lowIntensity: {
    backgroundColor: '#4CAF50',
  },
  mediumIntensity: {
    backgroundColor: '#FFC107',
  },
  highIntensity: {
    backgroundColor: '#6200EE',
  },
  intensityText: {
    fontSize: 14,
    color: '#333',
  },
  notesContainer: {
    marginTop: 5,
  },
  notesLabel: {
    fontSize: 14,
    color: '#666',
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
  },
  exerciseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  actionText: {
    fontSize: 14,
    color: '#6200EE',
    marginLeft: 5,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200EE',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listFooter: {
    height: 80,
  },
});

export default ExerciseScreen;