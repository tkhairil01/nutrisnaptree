import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import * as ImagePicker from 'expo-image-picker';

// Import types
import { RootStackParamList, User } from '../types';

// Import API
import { getCurrentUser, signOut, getData, updateData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Import components
import KoalaCharacter from '../components/KoalaCharacter';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [koalaExpression, setKoalaExpression] = useState<string>('neutral');
  const [koalaMessage, setKoalaMessage] = useState<string>('');
  const [showLogoutHistory, setShowLogoutHistory] = useState<boolean>(false);
  const [logoutHistory, setLogoutHistory] = useState<{date: string, device: string}[]>([]);
  const [updatingProfile, setUpdatingProfile] = useState<boolean>(false);
  
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
  const loadUserData = useCallback(async () => {
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
          
          // Set koala expression based on user data
          if (userData[0].isPremium) {
            setKoalaExpression('excited');
            setKoalaMessage(i18n.t('premiumUserMessage'));
          } else if (userData[0].points > 500) {
            setKoalaExpression('happy');
            setKoalaMessage(i18n.t('highPointsMessage'));
          } else {
            setKoalaExpression('neutral');
            setKoalaMessage(i18n.t('welcomeProfileMessage'));
          }
          
          // Get logout history
          if (userData[0].logoutHistory) {
            setLogoutHistory(userData[0].logoutHistory);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(i18n.t('error'), i18n.t('loadDataError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Handle language change
  const handleLanguageChange = async (lang: string) => {
    try {
      setLanguage(lang);
      i18n.locale = lang;
      await AsyncStorage.setItem('language', lang);
      
      // Update user language preference in database
      if (userId) {
        await updateData('users', userId, { language: lang });
      }
      
      setShowLanguageModal(false);
      
      // Update koala message
      setKoalaMessage(i18n.t('languageChangedMessage'));
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(i18n.t('error'), i18n.t('languageChangeError'));
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Add logout history
      if (userId && userData) {
        const now = new Date().toISOString();
        const device = 'Mobile App';
        
        const newLogoutHistory = [
          ...(userData.logoutHistory || []),
          { date: now, device }
        ];
        
        // Keep only last 10 entries
        if (newLogoutHistory.length > 10) {
          newLogoutHistory.splice(0, newLogoutHistory.length - 10);
        }
        
        await updateData('users', userId, { logoutHistory: newLogoutHistory });
      }
      
      // Sign out from Supabase
      const { error } = await signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('userToken');
      
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert(i18n.t('error'), i18n.t('logoutError'));
    }
  };
  
  // Handle delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== userData?.fullName) {
      Alert.alert(i18n.t('error'), i18n.t('deleteConfirmNameError'));
      return;
    }
    
    try {
      if (userId) {
        // Mark account as deleted in database
        // Note: In a real app, you might want to actually delete the data or implement a proper deletion process
        await updateData('users', userId, { isDeleted: true, deletedAt: new Date().toISOString() });
        
        // Sign out
        await signOut();
        
        // Clear AsyncStorage
        await AsyncStorage.removeItem('userToken');
        
        // Navigate to Login screen
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(i18n.t('error'), i18n.t('deleteAccountError'));
    } finally {
      setShowDeleteConfirmModal(false);
    }
  };
  
  // Handle edit profile field
  const handleEditField = (field: string, value: string, title: string) => {
    setEditField(field);
    setEditValue(value);
    setEditTitle(title);
    setShowEditModal(true);
  };
  
  // Save edited profile field
  const saveEditedField = async () => {
    if (!editField || !userId) return;
    
    try {
      setUpdatingProfile(true);
      
      // Update field in database
      await updateData('users', userId, { [editField]: editValue });
      
      // Update local state
      if (userData) {
        setUserData({
          ...userData,
          [editField]: editValue,
        });
      }
      
      setShowEditModal(false);
      
      // Show success message
      Alert.alert(i18n.t('success'), i18n.t('profileUpdated'));
      
      // Update koala expression
      setKoalaExpression('happy');
      setKoalaMessage(i18n.t('profileUpdatedMessage'));
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(i18n.t('error'), i18n.t('updateProfileError'));
    } finally {
      setUpdatingProfile(false);
    }
  };
  
  // Handle profile picture change
  const handleProfilePictureChange = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(i18n.t('error'), i18n.t('cameraPermissionDenied'));
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Update profile picture in database
        if (userId) {
          await updateData('users', userId, { profilePicture: base64Image });
          
          // Update local state
          if (userData) {
            setUserData({
              ...userData,
              profilePicture: base64Image,
            });
          }
          
          // Show success message
          Alert.alert(i18n.t('success'), i18n.t('profilePictureUpdated'));
          
          // Update koala expression
          setKoalaExpression('happy');
          setKoalaMessage(i18n.t('profilePictureUpdatedMessage'));
        }
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      Alert.alert(i18n.t('error'), i18n.t('updateProfilePictureError'));
    }
  };
  
  // Refresh data
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
  };
  
  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );
  
  // Render edit modal
  const renderEditModal = () => {
    return (
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowEditModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>{editTitle}</Text>
            
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`${i18n.t('enter')} ${editTitle.toLowerCase()}`}
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType={editField === 'targetWeight' || editField === 'height' ? 'numeric' : 'default'}
            />
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveEditedField}
              disabled={updatingProfile}
            >
              {updatingProfile ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>{i18n.t('save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render language modal
  const renderLanguageModal = () => {
    return (
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>{i18n.t('selectLanguage')}</Text>
            
            <TouchableOpacity
              style={[styles.languageOption, language === 'id' && styles.selectedLanguage]}
              onPress={() => handleLanguageChange('id')}
            >
              <Text style={styles.languageFlag}>🇮🇩</Text>
              <Text style={styles.languageName}>Bahasa Indonesia</Text>
              {language === 'id' && (
                <Ionicons name="checkmark-circle" size={24} color="#FF5722" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.selectedLanguage]}
              onPress={() => handleLanguageChange('en')}
            >
              <Text style={styles.languageFlag}>🇬🇧</Text>
              <Text style={styles.languageName}>English</Text>
              {language === 'en' && (
                <Ionicons name="checkmark-circle" size={24} color="#FF5722" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Render delete account confirmation modal
  const renderDeleteConfirmModal = () => {
    return (
      <Modal
        visible={showDeleteConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowDeleteConfirmModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            
            <Ionicons name="warning" size={50} color="#FF5722" style={styles.warningIcon} />
            
            <Text style={styles.modalTitle}>{i18n.t('deleteAccount')}</Text>
            <Text style={styles.deleteWarningText}>{i18n.t('deleteAccountWarning')}</Text>
            
            <Text style={styles.deleteConfirmText}>
              {i18n.t('deleteConfirmText')} <Text style={styles.deleteNameText}>{userData?.fullName}</Text>
            </Text>
            
            <TextInput
              style={styles.deleteConfirmInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={i18n.t('enterFullName')}
              placeholderTextColor="#999"
            />
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Text style={styles.deleteButtonText}>{i18n.t('permanentlyDelete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.loadingText}>{i18n.t('loadingProfile')}</Text>
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
        <Text style={styles.headerTitle}>{i18n.t('profile')}</Text>
        <View style={{width: 32}} />
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
        
        <View style={styles.profileHeader}>
          <View style={styles.profilePictureContainer}>
            <TouchableOpacity onPress={handleSelectImage}>
              {userData?.profilePicture ? (
                <Image 
                  source={{ uri: userData.profilePicture }} 
                  style={styles.profilePicture} 
                />
              ) : (
                <View style={styles.profilePicturePlaceholder}>
                  <Ionicons name="person" size={40} color="#ccc" />
                </View>
              )}
              <View style={styles.editPictureButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userData?.fullName || i18n.t('noName')}</Text>
            <Text style={styles.profileAge}>{userData?.age ? `${userData.age} ${i18n.t('yearsOld')}` : ''}</Text>
            {userData?.isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.premiumText}>{i18n.t('premium')}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData?.points || 0}</Text>
            <Text style={styles.statLabel}>{i18n.t('points')}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData?.currentWeight || 0}<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>{i18n.t('currentWeight')}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userData?.targetWeight || 0}<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>{i18n.t('targetWeight')}</Text>
          </View>
        </View>
        
        {!userData?.isPremium && (
          <View style={styles.premiumBanner}>
            <View style={styles.premiumBannerContent}>
              <View style={styles.premiumBannerTextContainer}>
                <Text style={styles.premiumBannerTitle}>{i18n.t('upgradeToPremium')}</Text>
                <Text style={styles.premiumBannerDescription}>{i18n.t('premiumBenefits')}</Text>
              </View>
              <TouchableOpacity style={styles.premiumButton}>
                <Text style={styles.premiumButtonText}>{i18n.t('upgrade')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('personalInfo')}</Text>
          </View>
          
          <View style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <Ionicons name="person-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('fullName')}</Text>
                <Text style={styles.profileItemValue}>{userData?.fullName || ''}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditField('fullName', userData?.fullName || '', i18n.t('fullName'))}
            >
              <Ionicons name="pencil" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <Ionicons name="calendar-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('age')}</Text>
                <Text style={styles.profileItemValue}>{userData?.age || ''} {i18n.t('yearsOld')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditField('age', userData?.age?.toString() || '', i18n.t('age'))}
            >
              <Ionicons name="pencil" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <Ionicons name="body-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('height')}</Text>
                <Text style={styles.profileItemValue}>{userData?.height || ''} cm</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditField('height', userData?.height?.toString() || '', i18n.t('height'))}
            >
              <Ionicons name="pencil" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <FontAwesome5 name="weight" size={18} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('targetWeight')}</Text>
                <Text style={styles.profileItemValue}>{userData?.targetWeight || ''} kg</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditField('targetWeight', userData?.targetWeight?.toString() || '', i18n.t('targetWeight'))}
            >
              <Ionicons name="pencil" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <Ionicons name="briefcase-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('occupation')}</Text>
                <Text style={styles.profileItemValue}>{userData?.occupation || ''}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditField('occupation', userData?.occupation || '', i18n.t('occupation'))}
            >
              <Ionicons name="pencil" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileItem}>
            <View style={styles.profileItemLeft}>
              <Ionicons name="fitness-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('activityLevel')}</Text>
                <Text style={styles.profileItemValue}>
                  {userData?.activityLevel === 'passive' ? i18n.t('passive') :
                   userData?.activityLevel === 'moderate' ? i18n.t('moderate') :
                   userData?.activityLevel === 'active' ? i18n.t('active') : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditField('activityLevel', userData?.activityLevel || '', i18n.t('activityLevel'))}
            >
              <Ionicons name="pencil" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('preferences')}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.profileItemLeft}>
              <Ionicons name="language" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('language')}</Text>
                <Text style={styles.profileItemValue}>
                  {language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.profileItem}
            onPress={() => setShowLogoutHistory(!showLogoutHistory)}
          >
            <View style={styles.profileItemLeft}>
              <Ionicons name="time-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
              <View>
                <Text style={styles.profileItemLabel}>{i18n.t('loginHistory')}</Text>
                <Text style={styles.profileItemValue}>{i18n.t('viewLoginHistory')}</Text>
              </View>
            </View>
            <Ionicons 
              name={showLogoutHistory ? "chevron-down" : "chevron-forward"} 
              size={18} 
              color="#666" 
            />
          </TouchableOpacity>
          
          {showLogoutHistory && (
            <View style={styles.logoutHistoryContainer}>
              {logoutHistory.length > 0 ? (
                logoutHistory.map((item, index) => {
                  const date = new Date(item.date);
                  const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                  
                  return (
                    <View key={index} style={styles.logoutHistoryItem}>
                      <Ionicons name="log-out-outline" size={16} color="#666" />
                      <Text style={styles.logoutHistoryText}>
                        {formattedDate} - {item.device}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noHistoryText}>{i18n.t('noLoginHistory')}</Text>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#6200EE" style={styles.profileItemIcon} />
            <Text style={styles.logoutButtonText}>{i18n.t('logout')}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{i18n.t('dangerZone')}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={() => setShowDeleteConfirmModal(true)}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.dangerButtonText}>{i18n.t('deleteAccount')}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>NutriKoala v1.0.0</Text>
        </View>
      </ScrollView>
      
      {renderEditModal()}
      {renderLanguageModal()}
      {renderDeleteConfirmModal()}
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
  scrollView: {
    flex: 1,
  },
  koalaContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editPictureButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6200EE',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#666',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
  },
  premiumBanner: {
    backgroundColor: '#6200EE',
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
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  premiumBannerTextContainer: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  premiumBannerDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  premiumButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  premiumButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6200EE',
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
  profileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemIcon: {
    marginRight: 12,
  },
  profileItemLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  profileItemValue: {
    fontSize: 14,
    color: '#333',
  },
  editButton: {
    padding: 8,
  },
  logoutHistoryContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginTop: 5,
    marginBottom: 10,
  },
  logoutHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutHistoryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  noHistoryText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#6200EE',
    fontWeight: 'bold',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5252',
    padding: 15,
    margin: 16,
    borderRadius: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
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
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedLanguage: {
    backgroundColor: '#F3E5F5',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  languageName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  warningIcon: {
    marginBottom: 15,
  },
  deleteWarningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  deleteNameText: {
    fontWeight: 'bold',
  },
  deleteConfirmInput: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ProfileScreen;