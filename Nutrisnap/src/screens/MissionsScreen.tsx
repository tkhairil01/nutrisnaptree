import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import { LinearGradient } from 'expo-linear-gradient';

// Import types
import { MissionsStackParamList } from '../types';

// Import API
import { getCurrentUser, getData, updateData, insertData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Import components
import KoalaCharacter from '../components/KoalaCharacter';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type MissionsScreenNavigationProp = NativeStackNavigationProp<MissionsStackParamList, 'Missions'>;

// Mission types
type Mission = {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  points: number;
  progress: number;
  target: number;
  completed: boolean;
  expiresAt: string;
  createdAt: string;
};

// Badge types
type Badge = {
  id: string;
  userId: string;
  title: string;
  description: string;
  imageUrl: string;
  earnedAt: string;
  category: string;
};

const MissionsScreen: React.FC = () => {
  const navigation = useNavigation<MissionsScreenNavigationProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState<boolean>(false);
  const [koalaExpression, setKoalaExpression] = useState<string>('neutral');
  const [koalaMessage, setKoalaMessage] = useState<string>('');
  
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
  
  // Load user data and missions
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
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
          setUserPoints(userData[0].points || 0);
        }
        
        // Get user missions
        const { data: missionsData, error: missionsError } = await getData('missions', 'userId', data.user.id);
        
        if (missionsError) {
          throw missionsError;
        }
        
        if (missionsData) {
          // Sort missions: daily first, then weekly, then special
          // Within each type, sort by completed (false first), then by expiresAt
          const sortedMissions = [...missionsData].sort((a, b) => {
            // First sort by type
            const typeOrder = { daily: 0, weekly: 1, special: 2 };
            const typeComparison = typeOrder[a.type] - typeOrder[b.type];
            if (typeComparison !== 0) return typeComparison;
            
            // Then sort by completion status (incomplete first)
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            
            // Then sort by expiration date (soonest first)
            return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
          });
          
          setMissions(sortedMissions);
          
          // Check if we need to generate new missions
          await checkAndGenerateMissions(data.user.id, sortedMissions);
        }
        
        // Get user badges
        const { data: badgesData, error: badgesError } = await getData('badges', 'userId', data.user.id);
        
        if (badgesError) {
          throw badgesError;
        }
        
        if (badgesData) {
          // Sort badges by earned date (newest first)
          const sortedBadges = [...badgesData].sort((a, b) => {
            return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
          });
          
          setBadges(sortedBadges);
        }
        
        // Set koala expression and message based on mission completion
        updateKoalaState(missionsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(i18n.t('error'), i18n.t('loadDataError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Update koala state based on missions
  const updateKoalaState = (missionsData: Mission[]) => {
    if (!missionsData || missionsData.length === 0) {
      setKoalaExpression('neutral');
      setKoalaMessage(i18n.t('noMissionsYet'));
      return;
    }
    
    const completedMissions = missionsData.filter(mission => mission.completed);
    const completionRate = completedMissions.length / missionsData.length;
    
    if (completionRate === 1) {
      // All missions completed
      setKoalaExpression('excited');
      setKoalaMessage(i18n.t('allMissionsCompleted'));
    } else if (completionRate >= 0.5) {
      // More than half completed
      setKoalaExpression('happy');
      setKoalaMessage(i18n.t('halfwayThere'));
    } else if (completionRate > 0) {
      // Some completed
      setKoalaExpression('motivated');
      setKoalaMessage(i18n.t('keepGoing'));
    } else {
      // None completed
      setKoalaExpression('thinking');
      setKoalaMessage(i18n.t('startMissions'));
    }
  };
  
  // Check if we need to generate new missions
  const checkAndGenerateMissions = async (userId: string, currentMissions: Mission[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check for daily missions
    const dailyMissions = currentMissions.filter(mission => 
      mission.type === 'daily' && new Date(mission.expiresAt) >= today
    );
    
    // If no active daily missions, generate new ones
    if (dailyMissions.length === 0) {
      await generateDailyMissions(userId);
    }
    
    // Check for weekly missions
    const weeklyMissions = currentMissions.filter(mission => 
      mission.type === 'weekly' && new Date(mission.expiresAt) >= today
    );
    
    // If no active weekly missions, generate new ones
    if (weeklyMissions.length === 0) {
      await generateWeeklyMissions(userId);
    }
  };
  
  // Generate daily missions
  const generateDailyMissions = async (userId: string) => {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      
      // Daily mission templates
      const dailyMissionTemplates = [
        {
          title: i18n.t('logFoodTwice'),
          description: i18n.t('logFoodTwiceDesc'),
          type: 'daily',
          points: 10,
          target: 2,
          progress: 0,
          completed: false,
        },
        {
          title: i18n.t('logExerciseOnce'),
          description: i18n.t('logExerciseOnceDesc'),
          type: 'daily',
          points: 15,
          target: 1,
          progress: 0,
          completed: false,
        },
        {
          title: i18n.t('consumeFiber'),
          description: i18n.t('consumeFiberDesc'),
          type: 'daily',
          points: 20,
          target: 25,
          progress: 0,
          completed: false,
        },
      ];
      
      // Create new missions
      for (const template of dailyMissionTemplates) {
        const mission = {
          userId,
          title: template.title,
          description: template.description,
          type: template.type,
          points: template.points,
          target: template.target,
          progress: template.progress,
          completed: template.completed,
          expiresAt: tomorrow.toISOString(),
          createdAt: now.toISOString(),
        };
        
        await insertData('missions', mission);
      }
      
      // Reload missions
      await loadData();
    } catch (error) {
      console.error('Error generating daily missions:', error);
    }
  };
  
  // Generate weekly missions
  const generateWeeklyMissions = async (userId: string) => {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      
      // Weekly mission templates
      const weeklyMissionTemplates = [
        {
          title: i18n.t('burnCalories'),
          description: i18n.t('burnCaloriesDesc'),
          type: 'weekly',
          points: 50,
          target: 1000,
          progress: 0,
          completed: false,
        },
        {
          title: i18n.t('noFriedFood'),
          description: i18n.t('noFriedFoodDesc'),
          type: 'weekly',
          points: 40,
          target: 3,
          progress: 0,
          completed: false,
        },
        {
          title: i18n.t('proteinIntake'),
          description: i18n.t('proteinIntakeDesc'),
          type: 'weekly',
          points: 45,
          target: 50,
          progress: 0,
          completed: false,
        },
      ];
      
      // Create new missions
      for (const template of weeklyMissionTemplates) {
        const mission = {
          userId,
          title: template.title,
          description: template.description,
          type: template.type,
          points: template.points,
          target: template.target,
          progress: template.progress,
          completed: template.completed,
          expiresAt: nextWeek.toISOString(),
          createdAt: now.toISOString(),
        };
        
        await insertData('missions', mission);
      }
      
      // Reload missions
      await loadData();
    } catch (error) {
      console.error('Error generating weekly missions:', error);
    }
  };
  
  // Update mission progress
  const updateMissionProgress = async (missionId: string, newProgress: number) => {
    try {
      const mission = missions.find(m => m.id === missionId);
      
      if (!mission) return;
      
      // Calculate if mission is completed
      const completed = newProgress >= mission.target;
      
      // Update mission in database
      const { error } = await updateData('missions', missionId, {
        progress: newProgress,
        completed,
      });
      
      if (error) throw error;
      
      // If mission is newly completed, award points
      if (completed && !mission.completed) {
        // Update user points
        const newPoints = userPoints + mission.points;
        
        if (userId) {
          await updateData('users', userId, { points: newPoints });
          setUserPoints(newPoints);
          
          // Show congratulation message
          Alert.alert(
            i18n.t('missionCompleted'),
            i18n.t('earnedPoints', { points: mission.points }),
            [{ text: i18n.t('great'), style: 'default' }]
          );
        }
      }
      
      // Reload missions
      await loadData();
    } catch (error) {
      console.error('Error updating mission progress:', error);
      Alert.alert(i18n.t('error'), i18n.t('updateProgressError'));
    }
  };
  
  // Handle mission action (redirect to appropriate screen)
  const handleMissionAction = (mission: Mission) => {
    switch (mission.title) {
      case i18n.t('logFoodTwice'):
      case i18n.t('consumeFiber'):
        // Navigate to Add Food screen
        navigation.navigate('AddFood');
        break;
      case i18n.t('logExerciseOnce'):
      case i18n.t('burnCalories'):
        // Navigate to Add Exercise screen
        navigation.navigate('AddExercise');
        break;
      default:
        // For other missions, just show description
        Alert.alert(mission.title, mission.description);
        break;
    }
  };
  
  // View badge details
  const viewBadgeDetails = (badge: Badge) => {
    setSelectedBadge(badge);
    setShowBadgeModal(true);
  };
  
  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };
  
  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );
  
  // Render mission item
  const renderMissionItem = ({ item }: { item: Mission }) => {
    const progress = Math.min(item.progress, item.target);
    const progressPercentage = (progress / item.target) * 100;
    
    return (
      <View style={[styles.missionCard, item.completed && styles.completedMissionCard]}>
        <View style={styles.missionHeader}>
          <View style={styles.missionTitleContainer}>
            <Text style={styles.missionType}>
              {item.type === 'daily' ? i18n.t('daily') : 
               item.type === 'weekly' ? i18n.t('weekly') : i18n.t('special')}
            </Text>
            <Text style={styles.missionTitle}>{item.title}</Text>
          </View>
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{item.points}</Text>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
          </View>
        </View>
        
        <Text style={styles.missionDescription}>{item.description}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress} / {item.target}
          </Text>
        </View>
        
        <View style={styles.missionFooter}>
          <Text style={styles.expiresText}>
            {item.type === 'daily' ? i18n.t('expiresDaily') : 
             item.type === 'weekly' ? i18n.t('expiresWeekly') : ''}
          </Text>
          
          {!item.completed ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleMissionAction(item)}
            >
              <Text style={styles.actionButtonText}>{i18n.t('startNow')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.completedText}>{i18n.t('completed')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };
  
  // Render badge item
  const renderBadgeItem = ({ item }: { item: Badge }) => {
    return (
      <TouchableOpacity 
        style={styles.badgeItem}
        onPress={() => viewBadgeDetails(item)}
      >
        <View style={styles.badgeIconContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.badgeIcon} />
          ) : (
            <FontAwesome5 name="medal" size={30} color="#FFD700" />
          )}
        </View>
        <Text style={styles.badgeName} numberOfLines={1}>{item.title}</Text>
      </TouchableOpacity>
    );
  };
  
  // Render badge modal
  const renderBadgeModal = () => {
    if (!selectedBadge) return null;
    
    return (
      <Modal
        visible={showBadgeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBadgeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.badgeModalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowBadgeModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <View style={styles.badgeModalIconContainer}>
              {selectedBadge.imageUrl ? (
                <Image source={{ uri: selectedBadge.imageUrl }} style={styles.badgeModalIcon} />
              ) : (
                <FontAwesome5 name="medal" size={60} color="#FFD700" />
              )}
            </View>
            
            <Text style={styles.badgeModalTitle}>{selectedBadge.title}</Text>
            <Text style={styles.badgeModalDescription}>{selectedBadge.description}</Text>
            
            <Text style={styles.badgeModalDate}>
              {i18n.t('earnedOn')} {new Date(selectedBadge.earnedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Modal>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>{i18n.t('loadingMissions')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('missions')}</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.koalaSection}>
          <KoalaCharacter expression={koalaExpression} message={koalaMessage} size={120} />
        </View>
        
        <View style={styles.pointsSummaryCard}>
          <View style={styles.pointsContent}>
            <View>
              <Text style={styles.pointsLabel}>{i18n.t('yourPoints')}</Text>
              <Text style={styles.pointsValue}>{userPoints}</Text>
            </View>
            <View style={styles.pointsIconContainer}>
              <MaterialCommunityIcons name="star-circle" size={50} color="#6200EE" />
            </View>
          </View>
        </View>
        
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('activeMissions')}</Text>
          </View>
          
          {missions.length > 0 ? (
            <FlatList
              data={missions}
              renderItem={renderMissionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="flag-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>{i18n.t('noMissions')}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('yourBadges')}</Text>
          </View>
          
          {badges.length > 0 ? (
            <View style={styles.badgesContainer}>
              <FlatList
                data={badges}
                renderItem={renderBadgeItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesList}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="medal-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>{i18n.t('noBadges')}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('pointsUsage')}</Text>
          </View>
          
          <View style={styles.pointsUsageContent}>
            <View style={styles.pointsUsageItem}>
              <Ionicons name="pricetag-outline" size={24} color="#6200EE" />
              <View style={styles.pointsUsageTextContainer}>
                <Text style={styles.pointsUsageTitle}>{i18n.t('removeAds')}</Text>
                <Text style={styles.pointsUsageDescription}>{i18n.t('removeAdsDesc')}</Text>
              </View>
              <View style={styles.pointsUsageValueContainer}>
                <Text style={styles.pointsUsageValue}>500</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.pointsUsageItem}>
              <Ionicons name="gift-outline" size={24} color="#6200EE" />
              <View style={styles.pointsUsageTextContainer}>
                <Text style={styles.pointsUsageTitle}>{i18n.t('redeemVoucher')}</Text>
                <Text style={styles.pointsUsageDescription}>{i18n.t('redeemVoucherDesc')}</Text>
              </View>
              <View style={styles.pointsUsageValueContainer}>
                <Text style={styles.pointsUsageValue}>1000</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {renderBadgeModal()}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  koalaSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  pointsSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  pointsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 16,
    color: '#666',
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  pointsIconContainer: {
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    borderRadius: 25,
    padding: 10,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  missionCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6200EE',
  },
  completedMissionCard: {
    backgroundColor: '#f8f8f8',
    borderLeftColor: '#4CAF50',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  missionTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  missionType: {
    fontSize: 12,
    color: '#6200EE',
    fontWeight: 'bold',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200EE',
    marginRight: 4,
  },
  missionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6200EE',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expiresText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  badgesContainer: {
    padding: 16,
  },
  badgesList: {
    paddingRight: 16,
  },
  badgeItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgeIcon: {
    width: 40,
    height: 40,
  },
  badgeName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  pointsUsageContent: {
    padding: 16,
  },
  pointsUsageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  pointsUsageTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  pointsUsageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pointsUsageDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  pointsUsageValueContainer: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pointsUsageValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  badgeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  badgeModalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  badgeModalIcon: {
    width: 70,
    height: 70,
  },
  badgeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  badgeModalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  badgeModalDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: 20,
  },
});

export default MissionsScreen;