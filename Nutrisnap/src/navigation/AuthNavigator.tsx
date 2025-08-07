import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { I18n } from 'i18n-js';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

// Create stack navigator
const Stack = createNativeStackNavigator();

const AuthNavigator = ({ language, setLanguage }: { language: string, setLanguage: (lang: string) => void }) => {
  i18n.locale = language;
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        options={{ title: i18n.t('login') }}
      >
        {(props) => <LoginScreen {...props} language={language} setLanguage={setLanguage} />}
      </Stack.Screen>
      
      <Stack.Screen 
        name="Signup" 
        options={{ title: i18n.t('signup') }}
      >
        {(props) => <SignupScreen {...props} language={language} setLanguage={setLanguage} />}
      </Stack.Screen>
      
      <Stack.Screen 
        name="ForgotPassword" 
        options={{ title: i18n.t('forgotPassword') }}
      >
        {(props) => <ForgotPasswordScreen {...props} language={language} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default AuthNavigator;