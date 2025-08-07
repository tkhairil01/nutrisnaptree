import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Navigation
import MainNavigator from './src/navigation/MainNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

// Translations
import { en, id } from './src/translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

// Set the locale once at the beginning of your app
i18n.locale = Localization.locale.split('-')[0];
i18n.enableFallback = true;
i18n.defaultLocale = 'id';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [language, setLanguage] = useState<string>('id');

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setIsAuthenticated(!!token);
      } catch (e) {
        console.error('Failed to get auth token', e);
        setIsAuthenticated(false);
      }
    };

    // Get saved language preference
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

    checkAuth();
    getLanguage();
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? (
          <MainNavigator language={language} setLanguage={setLanguage} />
        ) : (
          <AuthNavigator language={language} setLanguage={setLanguage} />
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}