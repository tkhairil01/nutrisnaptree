import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

type KoalaWidgetProps = {
  onPress?: () => void;
  reminderType?: 'food' | 'weight' | 'exercise' | 'general';
  customMessage?: string;
};

const KoalaWidget: React.FC<KoalaWidgetProps> = ({
  onPress,
  reminderType = 'general',
  customMessage,
}) => {
  const [language, setLanguage] = useState<string>('id');
  const [message, setMessage] = useState<string>('');
  const [bounceAnim] = useState(new Animated.Value(0));
  
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
  
  // Set message based on reminder type
  useEffect(() => {
    if (customMessage) {
      setMessage(customMessage);
    } else {
      switch (reminderType) {
        case 'food':
          setMessage(i18n.t('foodReminderMessage'));
          break;
        case 'weight':
          setMessage(i18n.t('weightReminderMessage'));
          break;
        case 'exercise':
          setMessage(i18n.t('exerciseReminderMessage'));
          break;
        default:
          setMessage(i18n.t('generalReminderMessage'));
          break;
      }
    }
  }, [reminderType, customMessage, language]);
  
  // Start bounce animation
  useEffect(() => {
    const startBounceAnimation = () => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Wait for 2 seconds before starting the animation again
        setTimeout(startBounceAnimation, 2000);
      });
    };
    
    startBounceAnimation();
    
    return () => {
      // Clean up animation
      bounceAnim.stopAnimation();
    };
  }, [bounceAnim]);
  
  // Get icon based on reminder type
  const getIcon = () => {
    switch (reminderType) {
      case 'food':
        return 'restaurant-outline';
      case 'weight':
        return 'fitness-outline';
      case 'exercise':
        return 'barbell-outline';
      default:
        return 'notifications-outline';
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.widgetContent}>
        <View style={styles.koalaContainer}>
          <Animated.View style={[styles.koala, { transform: [{ translateY: bounceAnim }] }]}>
            {/* Koala Face */}
            <View style={styles.koalaFace}>
              {/* Ears */}
              <View style={[styles.ear, styles.leftEar]} />
              <View style={[styles.ear, styles.rightEar]} />
              
              {/* Eyes */}
              <View style={styles.eyes}>
                <View style={styles.eye} />
                <View style={styles.eye} />
              </View>
              
              {/* Nose */}
              <View style={styles.nose} />
            </View>
          </Animated.View>
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.iconContainer}>
            <Ionicons name={getIcon()} size={20} color="#FF5722" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  widgetContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  koalaContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  koala: {
    width: 50,
    height: 50,
  },
  koalaFace: {
    width: 50,
    height: 50,
    backgroundColor: '#A9A9A9',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ear: {
    width: 20,
    height: 20,
    backgroundColor: '#A9A9A9',
    borderRadius: 10,
    position: 'absolute',
    top: -5,
  },
  leftEar: {
    left: 0,
  },
  rightEar: {
    right: 0,
  },
  eyes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 30,
    marginBottom: 5,
  },
  eye: {
    width: 10,
    height: 10,
    backgroundColor: '#000',
    borderRadius: 5,
  },
  nose: {
    width: 15,
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  messageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#FFF3E0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default KoalaWidget;