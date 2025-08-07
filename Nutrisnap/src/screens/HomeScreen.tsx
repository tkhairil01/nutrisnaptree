import React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import { AdMobBanner } from 'expo-ads-admob';

// Import types
import { HomeStackParamList, User, Food, Exercise } from '../types';

// Import API
import { getCurrentUser, getData } from '../api/supabase';
import { getHealthTips, getFoodRecommendations, getExerciseRecommendations } from '../api/gemini';

// Import translations
import { en, id } from '../translations';

// Import components
import KoalaCharacter from '../components/KoalaCharacter';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;

const screenWidth = Dimensions.get('window').width;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [koalaExpression, setKoalaExpression] = useState<'neutral' | 'happy' | 'motivated'>('neutral');
  
  // Data state
  const [dailyTip, setDailyTip] = useState<{ tip: string; category: string } | null>(null);
  const [caloriesIn, setCaloriesIn] = useState<number>(0);
  const [caloriesOut, setCaloriesOut] = useState<number>(0);
  const [netCalories, setNetCalories] = useState<number>(0);
  const [calorieStatus, setCalorieStatus] = useState<'surplus' | 'deficit'>('deficit');
  const [weeklyCaloriesData, setWeeklyCaloriesData] = useState<{ in: number[]; out: number[] }>({ in: [0, 0, 0, 0, 0, 0, 0], out: [0, 0, 0, 0, 0, 0, 0] });
  const [macroData, setMacroData] = useState<{ protein: number; fat: number; carbs: number }>({ protein: 0, fat: 0, carbs: 0 });
  const [recommendedFoods, setRecommendedFoods] = useState<any[]>([]);
  const [recommendedExercises, setRecommendedExercises] = useState<any[]>([]);
  const [weightTrend, setWeightTrend] = useState<'increasing' | 'decreasing' | 'stagnant'>('stagnant');
  
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
          // Get user profile data from database
          const { data: userData, error: userError } = await getData('users', 'id', data.user.id);
          
          if (userError) {
            throw userError;
          }
          
          if (userData && userData.length > 0) {
            setUser(userData[0]);
            setIsPremium(userData[0].isPremium);
            
            // Set koala expression based on user's progress
            if (userData[0].currentWeight < userData[0].targetWeight) {
              setKoalaExpression('happy');
            } else if (userData[0].currentWeight > userData[0].targetWeight) {
              setKoalaExpression('motivated');
            }
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
  
  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, language]);
  
  const loadDashboardData = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Get food entries for today
      const { data: foodData, error: foodError } = await getData('foods', 'userId', user?.id);
      
      if (foodError) {
        throw foodError;
      }
      
      // Get exercise entries for today
      const { data: exerciseData, error: exerciseError } = await getData('exercises', 'userId', user?.id);
      
      if (exerciseError) {
        throw exerciseError;
      }
      
      // Calculate calories in/out for today
      const todayFoods = foodData?.filter((food: Food) => food.date === today) || [];
      const todayExercises = exerciseData?.filter((exercise: Exercise) => exercise.date === today) || [];
      
      const totalCaloriesIn = todayFoods.reduce((sum: number, food: Food) => sum + food.calories, 0);
      const totalCaloriesOut = todayExercises.reduce((sum: number, exercise: Exercise) => sum + exercise.caloriesBurned, 0);
      
      setCaloriesIn(totalCaloriesIn);
      setCaloriesOut(totalCaloriesOut);
      setNetCalories(totalCaloriesIn - totalCaloriesOut);
      setCalorieStatus(totalCaloriesIn > totalCaloriesOut ? 'surplus' : 'deficit');
      
      // Calculate weekly calories data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();
      
      const weeklyIn = last7Days.map(date => {
        const dayFoods = foodData?.filter((food: Food) => food.date === date) || [];
        return dayFoods.reduce((sum: number, food: Food) => sum + food.calories, 0);
      });
      
      const weeklyOut = last7Days.map(date => {
        const dayExercises = exerciseData?.filter((exercise: Exercise) => exercise.date === date) || [];
        return dayExercises.reduce((sum: number, exercise: Exercise) => sum + exercise.caloriesBurned, 0);
      });
      
      setWeeklyCaloriesData({ in: weeklyIn, out: weeklyOut });
      
      // Calculate macro data (average over the past week)
      const last7DaysFoods = foodData?.filter((food: Food) => {
        const foodDate = new Date(food.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return foodDate >= sevenDaysAgo;
      }) || [];
      
      const totalProtein = last7DaysFoods.reduce((sum: number, food: Food) => sum + food.protein, 0);
      const totalFat = last7DaysFoods.reduce((sum: number, food: Food) => sum + food.fat, 0);
      const totalCarbs = last7DaysFoods.reduce((sum: number, food: Food) => sum + food.carbs, 0);
      
      const daysCount = Math.max(1, last7DaysFoods.length > 0 ? 7 : 0);
      
      setMacroData({
        protein: Math.round(totalProtein / daysCount),
        fat: Math.round(totalFat / daysCount),
        carbs: Math.round(totalCarbs / daysCount),
      });
      
      // Get weight trend
      const { data: weightData, error: weightError } = await getData('weight_records', 'userId', user?.id);
      
      if (weightError) {
        throw weightError;
      }
      
      if (weightData && weightData.length >= 2) {
        const sortedWeights = [...weightData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestWeight = sortedWeights[0].weight;
        const previousWeight = sortedWeights[1].weight;
        
        if (latestWeight < previousWeight) {
          setWeightTrend('decreasing');
        } else if (latestWeight > previousWeight) {
          setWeightTrend('increasing');
        } else {
          setWeightTrend('stagnant');
        }
      }
      
      // Get daily tip
      const tip = await getHealthTips(language);
      setDailyTip(tip);
      
      // Get food recommendations
      const foodRecommendations = await getFoodRecommendations({
        currentWeight: user?.currentWeight,
        targetWeight: user?.targetWeight,
        activityLevel: user?.activityLevel,
        foodPreference: user?.foodPreference,
        calorieStatus,
      }, language);
      
      setRecommendedFoods(foodRecommendations.recommendations || []);
      
      // Get exercise recommendations
      const exerciseRecommendations = await getExerciseRecommendations({
        currentWeight: user?.currentWeight,
        targetWeight: user?.targetWeight,
        activityLevel: user?.activityLevel,
        exercisePreference: user?.exercisePreference,
        calorieStatus,
      }, language);
      
      setRecommendedExercises(exerciseRecommendations.recommendations || []);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {i18n.t('Hello')},
          </Text>
          <Text style={styles.userName}>{user?.fullName?.split(' ')[0]}</Text>
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
        
        <View style={styles.koalaCard}>
          <View style={styles.koalaMessageContainer}>
            <KoalaCharacter 
              expression={koalaExpression} 
              size={80} 
              message={`Halo! Saya Koko, teman sehat Anda!`}
            />
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>{i18n.t('caloriesSummary')}</Text>
          </View>
          <View style={styles.summaryContent}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{caloriesIn}</Text>
              <Text style={styles.calorieLabel}>{i18n.t('caloriesIn')}</Text>
            </View>
            
            <View style={styles.calorieDivider} />
            
            <View style={styles.calorieItem}>
              <Text style={styles.calorieValue}>{caloriesOut}</Text>
              <Text style={styles.calorieLabel}>{i18n.t('caloriesOut')}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.netCalorieCard}>
          <View style={styles.netCalorieHeader}>
            <Ionicons 
              name={calorieStatus === 'deficit' ? "trending-down-outline" : "trending-up-outline"} 
              size={24} 
              color={calorieStatus === 'deficit' ? "#6200EE" : "#FF9800"} 
            />
            <Text style={styles.netCalorieTitle}>
              {calorieStatus === 'deficit' ? i18n.t('deficit') : i18n.t('surplus')}
            </Text>
          </View>
          <Text style={styles.netCalorieValue}>{Math.abs(netCalories)} kcal</Text>
          <Text style={styles.netCalorieDesc}>
            {i18n.t(calorieStatus === 'deficit' ? 'deficitDescription' : 'surplusDescription')}
          </Text>
          
          <TouchableOpacity 
            style={styles.addActivityButton}
            onPress={() => navigation.navigate('Exercise')}
          >
            <Ionicons name="add-outline" size={20} color="#fff" />
            <Text style={styles.addActivityButtonText}>{i18n.t('addExercise')}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{i18n.t('weeklyCaloriesChart')}</Text>
          </View>
          
          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [
                {
                  data: weeklyCaloriesData.in,
                  color: () => '#6200EE',
                  strokeWidth: 2,
                },
              ],
            }}
            width={screenWidth - 40}
            height={220}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#6200EE',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
        
        <View style={styles.tipsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{i18n.t('dailyTip')}</Text>
          </View>
          <View style={styles.tipsContent}>
            <View style={styles.tipsIconContainer}>
              <Ionicons name="bulb-outline" size={24} color="#6200EE" />
            </View>
            <Text style={styles.tipsText}>
              {dailyTip?.tip || i18n.t('defaultTip')}
            </Text>
          </View>
        </View>
        
        <View style={styles.predictionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{i18n.t('weightPrediction')}</Text>
          </View>
          <View style={styles.predictionContent}>
            <Ionicons 
              name={weightTrend === 'decreasing' ? "trending-down" : weightTrend === 'increasing' ? "trending-up" : "remove"} 
              size={24} 
              color={weightTrend === 'decreasing' ? "#4CAF50" : weightTrend === 'increasing' ? "#FF9800" : "#757575"} 
            />
            <Text style={styles.predictionText}>
              {i18n.t('weightPredictionPrefix')}
              {weightTrend === 'decreasing' ? i18n.t('decrease') : weightTrend === 'increasing' ? i18n.t('increase') : i18n.t('stayTheSame')} 
              {i18n.t('weightPredictionSuffix')}
            </Text>
          </View>
        </View>
        
        {!isPremium && (
          <View style={styles.premiumBanner}>
            <View style={styles.premiumContent}>
              <Ionicons name="star" size={24} color="#6200EE" />
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>{i18n.t('goPremium')}</Text>
                <Text style={styles.premiumDescription}>{i18n.t('premiumDescription')}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>{i18n.t('upgrade')}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 18,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  adContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  koalaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  koalaMessageContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
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
    padding: 16,
  },
  calorieItem: {
    flex: 1,
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  calorieLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  calorieDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  netCalorieCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  netCalorieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  netCalorieTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  netCalorieValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
    marginVertical: 8,
  },
  netCalorieDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  addActivityButton: {
    backgroundColor: '#6200EE',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addActivityButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    paddingRight: 16,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tipsContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipsIconContainer: {
    backgroundColor: '#F3E5F5',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipsText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  predictionContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  predictionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 16,
  },
  premiumBanner: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  premiumDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  upgradeButton: {
    backgroundColor: '#6200EE',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 80,
  },
});

export default HomeScreen;