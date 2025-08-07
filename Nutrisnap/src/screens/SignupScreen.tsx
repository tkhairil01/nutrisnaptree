import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { I18n } from 'i18n-js';

// Import types
import { AuthStackParamList } from '../types';

// Import API
import { signUp } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Import components
import KoalaCharacter from '../components/KoalaCharacter';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type SignupScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

interface SignupScreenProps {
  language: string;
  setLanguage: (lang: string) => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ language, setLanguage }) => {
  i18n.locale = language;
  
  const navigation = useNavigation<SignupScreenNavigationProp>();
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('male');
  const [occupation, setOccupation] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [foodPreference, setFoodPreference] = useState('');
  const [exercisePreference, setExercisePreference] = useState('');
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [koalaExpression, setKoalaExpression] = useState<'neutral' | 'happy' | 'sad' | 'excited'>('neutral');
  const [koalaMessage, setKoalaMessage] = useState<string | undefined>(undefined);
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      // Calculate age
      const today = new Date();
      let calculatedAge = today.getFullYear() - selectedDate.getFullYear();
      const m = today.getMonth() - selectedDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge.toString());
    }
  };
  
  const validateStep1 = () => {
    if (!fullName || !phoneNumber || !password || !confirmPassword) {
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('error') + ': ' + i18n.t('Please fill all required fields'));
      return false;
    }
    
    if (password !== confirmPassword) {
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('error') + ': ' + i18n.t('Passwords do not match'));
      return false;
    }
    
    if (password.length < 6) {
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('error') + ': ' + i18n.t('Password must be at least 6 characters'));
      return false;
    }
    
    return true;
  };
  
  const validateStep2 = () => {
    if (!age || !currentWeight || !targetWeight || !height) {
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('error') + ': ' + i18n.t('Please fill all required fields'));
      return false;
    }
    
    return true;
  };
  
  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setKoalaExpression('excited');
      setKoalaMessage(i18n.t('Great! Now let\'s set up your health profile'));
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setKoalaExpression('happy');
      setKoalaMessage(i18n.t('Almost there! Just a few more details'));
      setCurrentStep(3);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setKoalaExpression('neutral');
      setKoalaMessage(undefined);
    }
  };
  
  const handleSignup = async () => {
    if (!occupation || !activityLevel) {
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('error') + ': ' + i18n.t('Please fill all required fields'));
      return;
    }
    
    setLoading(true);
    
    try {
      // For demo purposes, we're using email format with phone number as username
      const email = `${phoneNumber}@nutrikoala.com`;
      
      const userData = {
        fullName,
        phoneNumber,
        age: parseInt(age),
        dateOfBirth: dateOfBirth.toISOString(),
        currentWeight: parseFloat(currentWeight),
        targetWeight: parseFloat(targetWeight),
        height: parseFloat(height),
        gender,
        occupation,
        activityLevel,
        foodPreference,
        exercisePreference,
        isPremium: false,
        points: 0,
      };
      
      const { data, error } = await signUp(email, password, userData);
      
      if (error) {
        throw error;
      }
      
      setKoalaExpression('excited');
      setKoalaMessage(i18n.t('success') + '! ' + i18n.t('Your account has been created'));
      
      // Wait a moment to show the success message
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
      
    } catch (error) {
      console.error('Signup error:', error);
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('signupError'));
    } finally {
      setLoading(false);
    }
  };
  
  const renderStep1 = () => (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('fullName')}
          value={fullName}
          onChangeText={setFullName}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('phoneNumber')}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons 
            name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('Confirm Password')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons 
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>
    </>
  );
  
  const renderStep2 = () => (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="calendar-outline" size={24} color="#666" style={styles.inputIcon} />
        <TouchableOpacity 
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            {dateOfBirth.toLocaleDateString()} ({i18n.t('dateOfBirth')})
          </Text>
        </TouchableOpacity>
      </View>
      
      {showDatePicker && (
        <DateTimePicker
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
      
      <View style={styles.inputContainer}>
        <Ionicons name="body-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('currentWeight')}
          value={currentWeight}
          onChangeText={setCurrentWeight}
          keyboardType="decimal-pad"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="trending-down-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('targetWeight')}
          value={targetWeight}
          onChangeText={setTargetWeight}
          keyboardType="decimal-pad"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="resize-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('height')}
          value={height}
          onChangeText={setHeight}
          keyboardType="decimal-pad"
        />
      </View>
      
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>{i18n.t('gender')}</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={gender}
            onValueChange={(itemValue) => setGender(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label={i18n.t('male')} value="male" />
            <Picker.Item label={i18n.t('female')} value="female" />
          </Picker>
        </View>
      </View>
    </>
  );
  
  const renderStep3 = () => (
    <>
      <View style={styles.inputContainer}>
        <Ionicons name="briefcase-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('occupation')}
          value={occupation}
          onChangeText={setOccupation}
        />
      </View>
      
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>{i18n.t('activityLevel')}</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={activityLevel}
            onValueChange={(itemValue) => setActivityLevel(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label={i18n.t('passive')} value="passive" />
            <Picker.Item label={i18n.t('moderate')} value="moderate" />
            <Picker.Item label={i18n.t('active')} value="active" />
          </Picker>
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="restaurant-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('foodPreference')}
          value={foodPreference}
          onChangeText={setFoodPreference}
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="fitness-outline" size={24} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={i18n.t('exercisePreference')}
          value={exercisePreference}
          onChangeText={setExercisePreference}
        />
      </View>
    </>
  );
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <KoalaCharacter 
            expression={koalaExpression} 
            size={120} 
            message={koalaMessage}
          />
          <Text style={styles.title}>{i18n.t('signup')}</Text>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, currentStep >= 1 && styles.activeStepDot]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, currentStep >= 2 && styles.activeStepDot]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, currentStep >= 3 && styles.activeStepDot]} />
          </View>
        </View>
        
        <View style={styles.formContainer}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          
          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={[styles.button, styles.backButton]} 
                onPress={prevStep}
              >
                <Text style={styles.backButtonText}>{i18n.t('back')}</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < 3 ? (
              <TouchableOpacity 
                style={[styles.button, styles.nextButton]} 
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>{i18n.t('next')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.signupButton]} 
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signupButtonText}>{i18n.t('signup')}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{i18n.t('haveAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{i18n.t('login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  activeStepDot: {
    backgroundColor: '#4CAF50',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  datePickerButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    marginLeft: 5,
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 55,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    width: '48%',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    width: currentStep === 1 ? '100%' : '48%',
  },
  signupButton: {
    backgroundColor: '#4CAF50',
    width: '100%',
  },
  backButtonText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default SignupScreen;