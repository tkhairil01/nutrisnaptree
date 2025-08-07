import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import types
import { AuthStackParamList } from '../types';

// Import API
import { signIn } from '../api/supabase';

// Import translations
import { en, id } from '../translations';

// Import components
import KoalaCharacter from '../components/KoalaCharacter';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  language: string;
  setLanguage: (lang: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ language, setLanguage }) => {
  i18n.locale = language;
  
  const navigation = useNavigation<LoginScreenNavigationProp>();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [koalaExpression, setKoalaExpression] = useState<'neutral' | 'happy' | 'sad'>('neutral');
  const [koalaMessage, setKoalaMessage] = useState<string | undefined>(undefined);
  
  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('loginError'));
      return;
    }
    
    setLoading(true);
    
    try {
      // For demo purposes, we're using email format with phone number as username
      const email = `${phoneNumber}@nutrikoala.com`;
      const { data, error } = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      if (data?.user) {
        // Store the session token
        await AsyncStorage.setItem('userToken', data.session?.access_token || '');
        
        // Store user data
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));
        
        setKoalaExpression('happy');
        setKoalaMessage('Login successful!');
        
        // Wait a moment to show the happy koala
        setTimeout(() => {
          // This will trigger App.tsx to switch to MainNavigator
          // No need to navigate here
        }, 1000);
      }
    } catch (error) {
      console.error('Login error:', error);
      setKoalaExpression('sad');
      setKoalaMessage(i18n.t('loginError'));
    } finally {
      setLoading(false);
    }
  };
  
  const toggleLanguage = () => {
    const newLanguage = language === 'id' ? 'en' : 'id';
    setLanguage(newLanguage);
    AsyncStorage.setItem('language', newLanguage);
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.languageSelector}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.languageButton}>
            <Text style={styles.languageText}>
              {language === 'id' ? '🇮🇩 Bahasa Indonesia' : '🇬🇧 English'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.header}>
          <KoalaCharacter 
            expression={koalaExpression} 
            size={150} 
            message={koalaMessage}
          />
          <Text style={styles.title}>NutriKoala</Text>
        </View>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={24} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={i18n.t('phoneNumber')}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
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
          
          <TouchableOpacity 
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>{i18n.t('forgotPassword')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{i18n.t('login')}</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>{i18n.t('noAccount')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>{i18n.t('signup')}</Text>
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
  languageSelector: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  languageButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  languageText: {
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#4CAF50',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  signupText: {
    fontSize: 16,
    color: '#666',
  },
  signupLink: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default LoginScreen;