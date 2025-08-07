import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import { LineChart } from 'react-native-chart-kit';

// Import types
import { RootStackParamList, User, WeightRecord } from '../types';

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

type WeightTrackingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WeightTracking'>;

const WeightTrackingScreen: React.FC = () => {
  const navigation = useNavigation<WeightTrackingScreenNavigationProp>();
  const screenWidth = Dimensions.get('window').width;
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showAddWeightModal, setShowAddWeightModal] = useState<boolean>(false);
  const [newWeight, setNewWeight] = useState<string>('');
  const [koalaExpression, setKoalaExpression] = useState<string>('neutral');
  const [koalaMessage, setKoalaMessage] = useState<string>('');
  const [weightTrend, setWeightTrend] = useState<'increasing' | 'decreasing' | 'stagnant' | null>(null);
  const [addingWeight, setAddingWeight] = useState<boolean>(false);
  
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
  
  // Load user data and weight records
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
          setUserData(userData[0] as User);
          
          // Get weight records
          const { data: weightData, error: weightError } = await getData('weight_records', 'userId', data.user.id);
          
          if (weightError) {
            throw weightError;
          }
          
          if (weightData) {
            // Sort weight records by date (newest first)
            const sortedRecords = [...weightData].sort((a, b) => {
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            
            setWeightRecords(sortedRecords as WeightRecord[]);
            
            // Check if it's time to prompt for weekly weight input
            const lastRecord = sortedRecords[0] as WeightRecord;
            if (lastRecord) {
              const lastRecordDate = new Date(lastRecord.date);
              const currentDate = new Date();
              const diffTime = Math.abs(currentDate.getTime() - lastRecordDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays >= 7) {
                // It's been 7 or more days since the last weight record
                setShowAddWeightModal(true);
              }
            }
            
            // Determine weight trend
            if (sortedRecords.length >= 2) {
              const latestWeight = sortedRecords[0].weight;
              const previousWeight = sortedRecords[1].weight;
              
              if (latestWeight < previousWeight) {
                setWeightTrend('decreasing');
                setKoalaExpression('excited');
                setKoalaMessage(i18n.t('weightLossMessage'));
              } else if (latestWeight > previousWeight) {
                setWeightTrend('increasing');
                setKoalaExpression('thinking');
                setKoalaMessage(i18n.t('weightGainMessage'));
              } else {
                setWeightTrend('stagnant');
                setKoalaExpression('neutral');
                setKoalaMessage(i18n.t('weightStagnantMessage'));
              }
            } else {
              setKoalaExpression('neutral');
              setKoalaMessage(i18n.t('weightTrackingWelcomeMessage'));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(i18n.t('error'), i18n.t('loadDataError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Add new weight record
  const addWeightRecord = async () => {
    if (!newWeight.trim() || isNaN(parseFloat(newWeight))) {
      Alert.alert(i18n.t('error'), i18n.t('invalidWeightError'));
      return;
    }
    
    try {
      setAddingWeight(true);
      
      const weight = parseFloat(newWeight);
      const currentDate = new Date().toISOString();
      
      if (userId) {
        // Insert new weight record
        const { error } = await insertData('weight_records', {
          userId,
          weight,
          date: currentDate,
        });
        
        if (error) {
          throw error;
        }
        
        // Update current weight in user profile
        await updateData('users', userId, { currentWeight: weight });
        
        // Update local state
        const newRecord: WeightRecord = {
          id: Date.now().toString(), // Temporary ID
          userId,
          weight,
          date: currentDate,
        };
        
        setWeightRecords([newRecord, ...weightRecords]);
        
        if (userData) {
          setUserData({
            ...userData,
            currentWeight: weight,
          });
        }
        
        // Determine trend and update koala expression
        if (weightRecords.length > 0) {
          const previousWeight = weightRecords[0].weight;
          
          if (weight < previousWeight) {
            setWeightTrend('decreasing');
            setKoalaExpression('excited');
            setKoalaMessage(i18n.t('weightLossMessage'));
          } else if (weight > previousWeight) {
            setWeightTrend('increasing');
            setKoalaExpression('thinking');
            setKoalaMessage(i18n.t('weightGainMessage'));
          } else {
            setWeightTrend('stagnant');
            setKoalaExpression('neutral');
            setKoalaMessage(i18n.t('weightStagnantMessage'));
          }
        }
        
        setShowAddWeightModal(false);
        setNewWeight('');
      }
    } catch (error) {
      console.error('Error adding weight record:', error);
      Alert.alert(i18n.t('error'), i18n.t('addWeightError'));
    } finally {
      setAddingWeight(false);
    }
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
  
  // Prepare chart data
  const prepareChartData = () => {
    // Get last 12 weeks of data (or less if not available)
    const last12Weeks = weightRecords.slice(0, 12).reverse();
    
    const labels = last12Weeks.map(record => {
      const date = new Date(record.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    const weightData = last12Weeks.map(record => record.weight);
    
    // Add target weight as a horizontal line
    const targetWeight = userData?.targetWeight || 0;
    const targetData = Array(labels.length).fill(targetWeight);
    
    return {
      labels,
      datasets: [
        {
          data: weightData,
          color: (opacity = 1) => `rgba(255, 87, 34, ${opacity})`, // Orange
          strokeWidth: 2,
        },
        {
          data: targetData,
          color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
          strokeWidth: 2,
          strokeDashArray: [5, 5],
        },
      ],
      legend: [i18n.t('actualWeight'), i18n.t('targetWeight')],
    };
  };
  
  // Render add weight modal
  const renderAddWeightModal = () => {
    return (
      <Modal
        visible={showAddWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddWeightModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowAddWeightModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <FontAwesome5 name="weight" size={40} color="#FF5722" style={styles.weightIcon} />
            
            <Text style={styles.modalTitle}>{i18n.t('updateWeeklyWeight')}</Text>
            <Text style={styles.modalDescription}>{i18n.t('enterCurrentWeight')}</Text>
            
            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={newWeight}
                onChangeText={setNewWeight}
                placeholder="0.0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={addWeightRecord}
              disabled={addingWeight}
            >
              {addingWeight ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{i18n.t('saveWeight')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render weight trend indicator
  const renderWeightTrend = () => {
    if (!weightTrend) return null;
    
    return (
      <View style={[styles.trendContainer, 
        weightTrend === 'decreasing' ? styles.trendDecreasing : 
        weightTrend === 'increasing' ? styles.trendIncreasing : 
        styles.trendStagnant
      ]}>
        <Ionicons 
          name={
            weightTrend === 'decreasing' ? 'arrow-down' : 
            weightTrend === 'increasing' ? 'arrow-up' : 
            'remove'
          } 
          size={20} 
          color={
            weightTrend === 'decreasing' ? '#4CAF50' : 
            weightTrend === 'increasing' ? '#F44336' : 
            '#FF9800'
          } 
        />
        <Text style={[styles.trendText, 
          weightTrend === 'decreasing' ? styles.trendDecreasingText : 
          weightTrend === 'increasing' ? styles.trendIncreasingText : 
          styles.trendStagnantText
        ]}>
          {weightTrend === 'decreasing' ? i18n.t('weightTrendDecreasing') : 
           weightTrend === 'increasing' ? i18n.t('weightTrendIncreasing') : 
           i18n.t('weightTrendStagnant')}
        </Text>
      </View>
    );
  };
  
  // Render weight difference
  const renderWeightDifference = () => {
    if (weightRecords.length < 2) return null;
    
    const latestWeight = weightRecords[0].weight;
    const firstWeight = weightRecords[weightRecords.length - 1].weight;
    const difference = latestWeight - firstWeight;
    const percentChange = (difference / firstWeight) * 100;
    
    return (
      <View style={styles.differenceContainer}>
        <Text style={styles.differenceLabel}>{i18n.t('totalChange')}:</Text>
        <Text style={[styles.differenceValue, 
          difference < 0 ? styles.decreaseText : 
          difference > 0 ? styles.increaseText : 
          styles.stagnantText
        ]}>
          {difference < 0 ? '' : '+'}{difference.toFixed(1)} kg ({percentChange.toFixed(1)}%)
        </Text>
      </View>
    );
  };
  
  // Render tips based on weight trend
  const renderWeightTips = () => {
    if (!weightTrend) return null;
    
    return (
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>{i18n.t('tipsTitle')}</Text>
        
        {weightTrend === 'decreasing' && (
          <>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightLossTip1')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightLossTip2')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightLossTip3')}</Text>
            </View>
          </>
        )}
        
        {weightTrend === 'increasing' && (
          <>
            <View style={styles.tipItem}>
              <Ionicons name="alert-circle" size={20} color="#F44336" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightGainTip1')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="alert-circle" size={20} color="#F44336" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightGainTip2')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="alert-circle" size={20} color="#F44336" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightGainTip3')}</Text>
            </View>
          </>
        )}
        
        {weightTrend === 'stagnant' && (
          <>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={20} color="#FF9800" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightStagnantTip1')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={20} color="#FF9800" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightStagnantTip2')}</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={20} color="#FF9800" style={styles.tipIcon} />
              <Text style={styles.tipText}>{i18n.t('weightStagnantTip3')}</Text>
            </View>
          </>
        )}
      </View>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>{i18n.t('loadingWeightData')}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('weightTracking')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddWeightModal(true)}
        >
          <Ionicons name="add-circle" size={28} color="#6200EE" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.koalaContainer}>
          <KoalaCharacter expression={koalaExpression} message={koalaMessage} size={120} />
        </View>
        
        <View style={styles.weightSummaryCard}>
          <View style={styles.weightSummaryHeader}>
            <Text style={styles.cardTitle}>{i18n.t('weightSummary')}</Text>
          </View>
          
          <View style={styles.weightSummaryContent}>
            <View style={styles.weightInfoContainer}>
              <View style={styles.weightInfoItem}>
                <Text style={styles.weightInfoLabel}>{i18n.t('currentWeight')}</Text>
                <Text style={styles.weightInfoValue}>
                  {userData?.currentWeight || 0}<Text style={styles.weightUnit}>kg</Text>
                </Text>
              </View>
              
              <View style={styles.weightInfoDivider} />
              
              <View style={styles.weightInfoItem}>
                <Text style={styles.weightInfoLabel}>{i18n.t('targetWeight')}</Text>
                <Text style={styles.weightInfoValue}>
                  {userData?.targetWeight || 0}<Text style={styles.weightUnit}>kg</Text>
                </Text>
              </View>
            </View>
            
            <View style={styles.weightDifferenceContainer}>
              {renderWeightDifference()}
            </View>
            
            <View style={styles.weightTrendContainer}>
              {renderWeightTrend()}
            </View>
          </View>
        </View>
        
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>{i18n.t('weightHistory')}</Text>
          </View>
          
          {weightRecords.length > 0 ? (
            <LineChart
              data={prepareChartData()}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 1,
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
                propsForBackgroundLines: {
                  strokeDasharray: '',
                  stroke: '#E0E0E0',
                  strokeWidth: 1
                },
              }}
              bezier
              style={styles.chart}
              fromZero
              yAxisSuffix=" kg"
              yAxisInterval={1}
              segments={5}
              formatYLabel={(value) => parseFloat(value).toFixed(1)}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="analytics-outline" size={50} color="#ccc" />
              <Text style={styles.noDataText}>{i18n.t('noWeightRecords')}</Text>
              <TouchableOpacity
                style={styles.addFirstRecordButton}
                onPress={() => setShowAddWeightModal(true)}
              >
                <Text style={styles.addFirstRecordButtonText}>{i18n.t('addFirstWeightRecord')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Text style={styles.cardTitle}>{i18n.t('tipsTitle')}</Text>
          </View>
          
          <View style={styles.tipsContent}>
            {weightTrend === 'decreasing' && (
              <>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightLossTip1')}</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightLossTip2')}</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightLossTip3')}</Text>
                </View>
              </>
            )}
            
            {weightTrend === 'increasing' && (
              <>
                <View style={styles.tipItem}>
                  <Ionicons name="alert-circle" size={20} color="#F44336" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightGainTip1')}</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="alert-circle" size={20} color="#F44336" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightGainTip2')}</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="alert-circle" size={20} color="#F44336" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightGainTip3')}</Text>
                </View>
              </>
            )}
            
            {weightTrend === 'stagnant' && (
              <>
                <View style={styles.tipItem}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightStagnantTip1')}</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightStagnantTip2')}</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="information-circle" size={20} color="#FF9800" style={styles.tipIcon} />
                  <Text style={styles.tipText}>{i18n.t('weightStagnantTip3')}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        
        <View style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <Text style={styles.cardTitle}>{i18n.t('weightRecords')}</Text>
          </View>
          
          {weightRecords.length > 0 ? (
            weightRecords.map((record, index) => {
              const date = new Date(record.date);
              const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
              
              // Calculate difference from previous record
              let difference = 0;
              let differenceText = '';
              
              if (index < weightRecords.length - 1) {
                difference = record.weight - weightRecords[index + 1].weight;
                differenceText = difference === 0 ? '0' : 
                                 difference > 0 ? `+${difference.toFixed(1)}` : 
                                 difference.toFixed(1);
              }
              
              return (
                <View key={record.id} style={styles.recordItem}>
                  <View style={styles.recordDateContainer}>
                    <Text style={styles.recordDate}>{formattedDate}</Text>
                    {index === 0 && (
                      <View style={styles.latestBadge}>
                        <Text style={styles.latestBadgeText}>{i18n.t('latest')}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.recordWeightContainer}>
                    <Text style={styles.recordWeight}>{record.weight} kg</Text>
                    
                    {index < weightRecords.length - 1 && (
                      <Text style={[styles.recordDifference, 
                        difference < 0 ? styles.decreaseText : 
                        difference > 0 ? styles.increaseText : 
                        styles.neutralText]}>
                        {differenceText} kg
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noRecordsContainer}>
              <Text style={styles.noRecordsText}>{i18n.t('noWeightRecords')}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <Modal
        visible={showAddWeightModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddWeightModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowAddWeightModal(false)}
            >
              <Ionicons name="close" size={24} color="#999" />
            </TouchableOpacity>
            
            <Ionicons name="scale-outline" size={40} color="#6200EE" style={styles.weightIcon} />
            <Text style={styles.modalTitle}>{i18n.t('addWeightRecord')}</Text>
            <Text style={styles.modalDescription}>{i18n.t('addWeightDescription')}</Text>
            
            <View style={styles.weightInputContainer}>
              <TextInput
                style={styles.weightInput}
                value={newWeight}
                onChangeText={setNewWeight}
                keyboardType="numeric"
                placeholder="0.0"
                maxLength={5}
              />
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddWeight}
            >
              <Text style={styles.saveButtonText}>{i18n.t('saveWeight')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  koalaContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  weightSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  weightSummaryHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  weightSummaryContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  weightInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weightInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  weightInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  weightInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  weightInfoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  weightUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
    marginLeft: 2,
  },
  weightDifferenceContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  weightTrendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendIcon: {
    marginRight: 8,
  },
  trendText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  decreaseText: {
    color: '#4CAF50',
  },
  increaseText: {
    color: '#F44336',
  },
  neutralText: {
    color: '#FF9800',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  chartHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
    paddingRight: 16,
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  tipsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tipsContent: {
    padding: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  recordsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  recordsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 14,
    color: '#333',
  },
  latestBadge: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  latestBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  recordWeightContainer: {
    alignItems: 'flex-end',
  },
  recordWeight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordDifference: {
    fontSize: 12,
    marginTop: 3,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  addFirstRecordButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 15,
  },
  addFirstRecordButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  noRecordsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noRecordsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  weightIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  weightInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    width: 120,
  },
  weightUnit: {
    fontSize: 20,
    color: '#666',
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  bottomPadding: {
    height: 30,
  },
});

export default WeightTrackingScreen;