import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { JournalStackParamList } from '../types';

// Import API
import { getCurrentUser, insertData, getData } from '../api/supabase';
import { analyzeFoodImage } from '../api/gemini';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type AddFoodScreenNavigationProp = NativeStackNavigationProp<JournalStackParamList, 'AddFood'>;
type AddFoodScreenRouteProp = RouteProp<JournalStackParamList, 'AddFood'>;

const AddFoodScreen: React.FC = () => {
  const navigation = useNavigation<AddFoodScreenNavigationProp>();
  const route = useRoute<AddFoodScreenRouteProp>();
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('id');
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  
  // Food data state
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodName, setFoodName] = useState<string>('');
  const [portion, setPortion] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fiber, setFiber] = useState<string>('');
  const [mealType, setMealType] = useState<string>('Breakfast');
  
  // Camera state
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameraVisible, setCameraVisible] = useState<boolean>(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [cameraRef, setCameraRef] = useState<Camera | null>(null);
  
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
      }
    };
    
    loadUserData();
  }, []);
  
  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    })();
  }, []);
  
  // Set meal type based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 10) {
      setMealType('Breakfast');
    } else if (hour >= 10 && hour < 15) {
      setMealType('Lunch');
    } else if (hour >= 15 && hour < 18) {
      setMealType('Snack');
    } else if (hour >= 18 && hour < 22) {
      setMealType('Dinner');
    } else {
      setMealType('Snack');
    }
  }, []);
  
  // Function to pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFoodImage(asset.uri);
        
        // If the user has already entered a food name, analyze the image
        if (foodName.trim().length > 0) {
          analyzeFood(asset.base64 || '', foodName);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(i18n.t('error'), i18n.t('imagePickError'));
    }
  };
  
  // Function to take a photo
  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        
        setCameraVisible(false);
        setFoodImage(photo.uri);
        
        // If the user has already entered a food name, analyze the image
        if (foodName.trim().length > 0) {
          analyzeFood(photo.base64 || '', foodName);
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert(i18n.t('error'), i18n.t('cameraError'));
      }
    }
  };
  
  // Function to analyze food image using Gemini API
  const analyzeFood = async (base64Image: string, name: string) => {
    if (!base64Image || !name) {
      Alert.alert(i18n.t('error'), i18n.t('provideFoodNameAndImage'));
      return;
    }
    
    try {
      setAnalyzing(true);
      
      // Show interstitial ad for non-premium users
      if (!isPremium) {
        try {
          await AdMobInterstitial.setAdUnitID('ca-app-pub-3940256099942544/1033173712'); // Test ad unit ID
          await AdMobInterstitial.requestAdAsync();
          await AdMobInterstitial.showAdAsync();
        } catch (adError) {
          console.error('Ad error:', adError);
        }
      }
      
      const result = await analyzeFoodImage(base64Image, name, language);
      
      if (result) {
        setPortion(result.portion.toString());
        setCalories(result.calories.toString());
        setProtein(result.protein.toString());
        setFat(result.fat.toString());
        setCarbs(result.carbs.toString());
        setFiber(result.fiber.toString());
        
        // Set meal type based on food type and time if not already set by user
        if (result.mealType) {
          setMealType(result.mealType);
        }
      }
    } catch (error) {
      console.error('Error analyzing food:', error);
      Alert.alert(i18n.t('error'), i18n.t('analyzeError'));
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Function to save food entry
  const saveFood = async () => {
    if (!userId) {
      Alert.alert(i18n.t('error'), i18n.t('notLoggedIn'));
      return;
    }
    
    if (!foodName.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('enterFoodName'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Get current date and time
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().substring(0, 5);
      
      // Create food entry object
      const foodEntry = {
        userId,
        name: foodName.trim(),
        portion: parseInt(portion) || 100,
        calories: parseInt(calories) || 0,
        protein: parseInt(protein) || 0,
        fat: parseInt(fat) || 0,
        carbs: parseInt(carbs) || 0,
        fiber: parseInt(fiber) || 0,
        mealType,
        date,
        time,
        imageUrl: foodImage || null,
      };
      
      // Insert food entry into database
      const { data, error } = await insertData('foods', foodEntry);
      
      if (error) {
        throw error;
      }
      
      // Navigate back to journal screen
      navigation.goBack();
    } catch (error) {
      console.error('Error saving food:', error);
      Alert.alert(i18n.t('error'), i18n.t('saveFoodError'));
    } finally {
      setLoading(false);
    }
  };
  
  // Render camera view
  if (cameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        {cameraPermission ? (
          <Camera
            style={styles.camera}
            type={cameraType}
            ref={(ref) => setCameraRef(ref)}
          >
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setCameraVisible(false)}
              >
                <Ionicons name="close-outline" size={30} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setCameraType(
                  cameraType === Camera.Constants.Type.back
                    ? Camera.Constants.Type.front
                    : Camera.Constants.Type.back
                )}
              >
                <Ionicons name="camera-reverse-outline" size={30} color="#fff" />
              </TouchableOpacity>
            </View>
          </Camera>
        ) : (
          <View style={styles.noCameraPermission}>
            <Text style={styles.noCameraText}>{i18n.t('cameraPermissionRequired')}</Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={() => setCameraVisible(false)}
            >
              <Text style={styles.permissionButtonText}>{i18n.t('goBack')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
        <Text style={styles.headerTitle}>{i18n.t('addFood')}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageSection}>
          {foodImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: foodImage }} style={styles.foodImage} />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={pickImage}
              >
                <Text style={styles.changeImageText}>{i18n.t('changeImage')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageButtons}>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => setCameraVisible(true)}
              >
                <Ionicons name="camera-outline" size={30} color="#4CAF50" />
                <Text style={styles.imageButtonText}>{i18n.t('takePhoto')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.imageButton}
                onPress={pickImage}
              >
                <Ionicons name="image-outline" size={30} color="#4CAF50" />
                <Text style={styles.imageButtonText}>{i18n.t('chooseFromGallery')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{i18n.t('foodName')}</Text>
            <TextInput
              style={styles.input}
              value={foodName}
              onChangeText={setFoodName}
              placeholder={i18n.t('enterFoodName')}
              placeholderTextColor="#999"
            />
          </View>
          
          <View style={styles.analyzeButtonContainer}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={() => {
                if (foodImage && foodName.trim()) {
                  // We need to get the base64 image again since we only store the URI
                  // In a real app, you would store the base64 or use a proper image handling library
                  Alert.alert(i18n.t('analyzing'), i18n.t('analyzingMessage'));
                } else {
                  Alert.alert(i18n.t('error'), i18n.t('provideFoodNameAndImage'));
                }
              }}
              disabled={analyzing || !foodImage || !foodName.trim()}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.analyzeButtonText}>{i18n.t('analyzeFood')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.mealTypeSection}>
            <Text style={styles.sectionTitle}>{i18n.t('mealType')}</Text>
            
            <View style={styles.mealTypeButtons}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.mealTypeButton, mealType === type && styles.selectedMealType]}
                  onPress={() => setMealType(type)}
                >
                  <Text 
                    style={[styles.mealTypeText, mealType === type && styles.selectedMealTypeText]}
                  >
                    {i18n.t(type.toLowerCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.nutritionSection}>
            <Text style={styles.sectionTitle}>{i18n.t('nutritionInfo')}</Text>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>{i18n.t('portion')} (g)</Text>
                <TextInput
                  style={styles.input}
                  value={portion}
                  onChangeText={setPortion}
                  placeholder="100"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>{i18n.t('calories')}</Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>{i18n.t('protein')} (g)</Text>
                <TextInput
                  style={styles.input}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>{i18n.t('fat')} (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fat}
                  onChangeText={setFat}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>{i18n.t('carbs')} (g)</Text>
                <TextInput
                  style={styles.input}
                  value={carbs}
                  onChangeText={setCarbs}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>{i18n.t('fiber')} (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fiber}
                  onChangeText={setFiber}
                  placeholder="0"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveFood}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{i18n.t('saveToJournal')}</Text>
          )}
        </TouchableOpacity>
      </View>
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
  imageSection: {
    padding: 20,
    alignItems: 'center',
  },
  imageContainer: {
    alignItems: 'center',
  },
  foodImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  changeImageButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  changeImageText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  imageButton: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    width: '45%',
  },
  imageButtonText: {
    marginTop: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
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
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  analyzeButtonContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    width: '80%',
  },
  analyzeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  mealTypeSection: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
    minWidth: '18%',
    alignItems: 'center',
  },
  selectedMealType: {
    backgroundColor: '#4CAF50',
  },
  mealTypeText: {
    color: '#666',
    fontWeight: 'bold',
  },
  selectedMealTypeText: {
    color: '#fff',
  },
  nutritionSection: {
    marginVertical: 15,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  cameraButton: {
    padding: 15,
  },
  captureButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    backgroundColor: '#fff',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  noCameraPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  noCameraText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddFoodScreen;