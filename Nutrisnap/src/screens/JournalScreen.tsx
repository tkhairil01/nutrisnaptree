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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { JournalStackParamList, Food } from '../types';

// Import API
import { getCurrentUser, getData, deleteData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type JournalScreenNavigationProp = NativeStackNavigationProp<JournalStackParamList, 'JournalScreen'>;

const JournalScreen: React.FC = () => {
  const navigation = useNavigation<JournalScreenNavigationProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [foodEntries, setFoodEntries] = useState<Food[]>([]);
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
  
  // Load food entries
  useEffect(() => {
    if (userId) {
      loadFoodEntries();
    }
  }, [userId, selectedDate]);
  
  const loadFoodEntries = async () => {
    try {
      setLoading(true);
      
      // Get food entries for the user
      const { data: foodData, error: foodError } = await getData('foods', 'userId', userId);
      
      if (foodError) {
        throw foodError;
      }
      
      if (foodData) {
        // Get unique dates from food entries
        const dates = [...new Set(foodData.map((food: Food) => food.date))].sort().reverse();
        setDateList(dates);
        
        // Filter food entries for selected date
        const filteredEntries = foodData.filter((food: Food) => food.date === selectedDate);
        
        // Sort by time
        const sortedEntries = filteredEntries.sort((a: Food, b: Food) => {
          return new Date(a.time).getTime() - new Date(b.time).getTime();
        });
        
        setFoodEntries(sortedEntries);
      }
    } catch (error) {
      console.error('Error loading food entries:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadFoodEntries();
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
              const { error } = await deleteData('foods', id);
              
              if (error) {
                throw error;
              }
              
              // Refresh the list
              loadFoodEntries();
            } catch (error) {
              console.error('Error deleting food entry:', error);
              Alert.alert(i18n.t('error'), i18n.t('deleteError'));
            }
          },
        },
      ],
      { cancelable: true }
    );
  };
  
  const handleEditEntry = (food: Food) => {
    navigation.navigate('EditFood', { food });
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
  
  const renderFoodItem = ({ item }: { item: Food }) => {
    const mealTypeIcons: { [key: string]: string } = {
      breakfast: 'sunny-outline',
      lunch: 'restaurant-outline',
      dinner: 'moon-outline',
      snack: 'cafe-outline',
      drink: 'water-outline',
    };
    
    return (
      <View style={styles.foodItem}>
        <View style={styles.foodItemHeader}>
          <View style={styles.mealTypeContainer}>
            <Ionicons 
              name={mealTypeIcons[item.mealType.toLowerCase()] || 'restaurant-outline'} 
              size={20} 
              color="#4CAF50" 
            />
            <Text style={styles.mealType}>{i18n.t(item.mealType.toLowerCase())}</Text>
          </View>
          <Text style={styles.foodTime}>{item.time.substring(0, 5)}</Text>
        </View>
        
        <View style={styles.foodItemContent}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
          )}
          
          <View style={styles.foodDetails}>
            <Text style={styles.foodName}>{item.name}</Text>
            <Text style={styles.foodPortion}>{item.portion} {i18n.t('grams')}</Text>
            
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{item.calories}</Text>
                <Text style={styles.macroLabel}>{i18n.t('calories')}</Text>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{item.protein}g</Text>
                <Text style={styles.macroLabel}>{i18n.t('protein')}</Text>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{item.fat}g</Text>
                <Text style={styles.macroLabel}>{i18n.t('fat')}</Text>
              </View>
              
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{item.carbs}g</Text>
                <Text style={styles.macroLabel}>{i18n.t('carbs')}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.foodItemActions}>
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
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('foodJournal')}</Text>
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
      
      {foodEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>{i18n.t('noFoodEntries')}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddFood')}
          >
            <Text style={styles.addButtonText}>{i18n.t('addFood')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={foodEntries}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.foodList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={<View style={styles.listFooter} />}
        />
      )}
    </View>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateListContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  foodList: {
    padding: 10,
  },
  foodItem: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  foodItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 5,
  },
  foodTime: {
    fontSize: 14,
    color: '#666',
  },
  foodItemContent: {
    flexDirection: 'row',
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  foodPortion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
  },
  foodItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
  },
  listFooter: {
    height: 80,
  },
});

export default JournalScreen;