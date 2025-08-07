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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { JournalStackParamList, Food } from '../types';

// Import API
import { updateData } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type EditFoodScreenNavigationProp = NativeStackNavigationProp<JournalStackParamList, 'EditFood'>;
type EditFoodScreenRouteProp = RouteProp<JournalStackParamList, 'EditFood'>;

const EditFoodScreen: React.FC = () => {
  const navigation = useNavigation<EditFoodScreenNavigationProp>();
  const route = useRoute<EditFoodScreenRouteProp>();
  const { food } = route.params;
  
  // State
  const [language, setLanguage] = useState<string>('id');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Food data state
  const [foodImage, setFoodImage] = useState<string | null>(food.imageUrl);
  const [foodName, setFoodName] = useState<string>(food.name);
  const [portion, setPortion] = useState<string>(food.portion.toString());
  const [calories, setCalories] = useState<string>(food.calories.toString());
  const [protein, setProtein] = useState<string>(food.protein.toString());
  const [fat, setFat] = useState<string>(food.fat.toString());
  const [carbs, setCarbs] = useState<string>(food.carbs.toString());
  const [fiber, setFiber] = useState<string>(food.fiber ? food.fiber.toString() : '0');
  const [mealType, setMealType] = useState<string>(food.mealType);
  
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
  
  // Function to pick image from gallery
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFoodImage(asset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(i18n.t('error'), i18n.t('imagePickError'));
    }
  };
  
  // Function to update food entry
  const updateFood = async () => {
    if (!foodName.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('enterFoodName'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Create updated food entry object
      const updatedFood = {
        name: foodName.trim(),
        portion: parseInt(portion) || 100,
        calories: parseInt(calories) || 0,
        protein: parseInt(protein) || 0,
        fat: parseInt(fat) || 0,
        carbs: parseInt(carbs) || 0,
        fiber: parseInt(fiber) || 0,
        mealType,
        imageUrl: foodImage,
      };
      
      // Update food entry in database
      const { data, error } = await updateData('foods', food.id, updatedFood);
      
      if (error) {
        throw error;
      }
      
      // Navigate back to journal screen
      navigation.goBack();
    } catch (error) {
      console.error('Error updating food:', error);
      Alert.alert(i18n.t('error'), i18n.t('updateFoodError'));
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>{i18n.t('editFood')}</Text>
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
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={40} color="#4CAF50" />
              <Text style={styles.addImageText}>{i18n.t('addImage')}</Text>
            </TouchableOpacity>
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
          
          <View style={styles.dateTimeSection}>
            <Text style={styles.sectionTitle}>{i18n.t('dateAndTime')}</Text>
            
            <View style={styles.dateTimeInfo}>
              <View style={styles.dateTimeItem}>
                <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                <Text style={styles.dateTimeText}>{food.date}</Text>
              </View>
              
              <View style={styles.dateTimeItem}>
                <Ionicons name="time-outline" size={20} color="#4CAF50" />
                <Text style={styles.dateTimeText}>{food.time}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={updateFood}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.updateButtonText}>{i18n.t('updateFood')}</Text>
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
  addImageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  addImageText: {
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
  dateTimeSection: {
    marginVertical: 15,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    width: '48%',
  },
  dateTimeText: {
    marginLeft: 10,
    color: '#333',
    fontSize: 16,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EditFoodScreen;