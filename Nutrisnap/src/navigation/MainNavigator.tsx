import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { I18n } from 'i18n-js';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import JournalScreen from '../screens/JournalScreen';
import ExerciseScreen from '../screens/ExerciseScreen';
import MissionsScreen from '../screens/MissionsScreen';
import StoreScreen from '../screens/StoreScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CameraScreen from '../screens/CameraScreen';
import FoodDetailsScreen from '../screens/FoodDetailsScreen';
import ExerciseDetailsScreen from '../screens/ExerciseDetailsScreen';
import WeightTrackingScreen from '../screens/WeightTrackingScreen';

// Import translations
import { en, id } from '../translations';

// Create i18n instance
const i18n = new I18n({
  en,
  id,
});

// Create navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom camera button component
const CameraButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={styles.cameraButton}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons name="camera" size={28} color="white" />
  </TouchableOpacity>
);

// Home stack navigator
const HomeStack = ({ language }: { language: string }) => {
  i18n.locale = language;
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="WeightTracking" 
        component={WeightTrackingScreen} 
        options={{ title: i18n.t('weightTracking') }}
      />
    </Stack.Navigator>
  );
};

// Journal stack navigator
const JournalStack = ({ language }: { language: string }) => {
  i18n.locale = language;
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="JournalScreen" 
        component={JournalScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="FoodDetails" 
        component={FoodDetailsScreen} 
        options={{ title: i18n.t('editFood') }}
      />
    </Stack.Navigator>
  );
};

// Exercise stack navigator
const ExerciseStack = ({ language }: { language: string }) => {
  i18n.locale = language;
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ExerciseScreen" 
        component={ExerciseScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ExerciseDetails" 
        component={ExerciseDetailsScreen} 
        options={{ title: i18n.t('addExercise') }}
      />
    </Stack.Navigator>
  );
};

// Missions stack navigator
const MissionsStack = ({ language }: { language: string }) => {
  i18n.locale = language;
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MissionsScreen" 
        component={MissionsScreen} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Main tab navigator
const MainTabs = ({ language, setLanguage }: { language: string, setLanguage: (lang: string) => void }) => {
  i18n.locale = language;
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Journal') {
            iconName = focused ? 'journal' : 'journal-outline';
          } else if (route.name === 'Exercise') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Missions') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Store') {
            iconName = focused ? 'cart' : 'cart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: styles.tabBar,
      })}
    >
      <Tab.Screen 
        name="Home" 
        options={{ 
          title: i18n.t('home'),
          headerShown: false,
        }}
      >
        {() => <HomeStack language={language} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Journal" 
        options={{ 
          title: i18n.t('journal'),
          headerShown: false,
        }}
      >
        {() => <JournalStack language={language} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={({ navigation }) => ({
          tabBarButton: () => (
            <CameraButton onPress={() => navigation.navigate('Camera')} />
          ),
          tabBarLabel: () => null,
          headerShown: false,
        })}
      />
      
      <Tab.Screen 
        name="Exercise" 
        options={{ 
          title: i18n.t('exercise'),
          headerShown: false,
        }}
      >
        {() => <ExerciseStack language={language} />}
      </Tab.Screen>
      
      <Tab.Screen 
        name="Missions" 
        options={{ 
          title: i18n.t('missionsAndPoints'),
          headerShown: false,
        }}
      >
        {() => <MissionsStack language={language} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

// Main navigator with additional screens
const MainNavigator = ({ language, setLanguage }: { language: string, setLanguage: (lang: string) => void }) => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        options={{ headerShown: false }}
      >
        {() => <MainTabs language={language} setLanguage={setLanguage} />}
      </Stack.Screen>
      
      <Stack.Screen 
        name="Store" 
        component={StoreScreen} 
        options={{ title: i18n.t('store') }}
      />
      
      <Stack.Screen 
        name="Profile" 
        options={{ title: i18n.t('profile') }}
      >
        {() => <ProfileScreen language={language} setLanguage={setLanguage} />}
      </Stack.Screen>
      
      <Stack.Screen 
        name="Camera" 
        component={CameraScreen} 
        options={{ headerShown: false }}
      />
      
      <Stack.Screen 
        name="FoodDetails" 
        component={FoodDetailsScreen} 
        options={{ title: i18n.t('confirmFood') }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
  },
  cameraButton: {
    backgroundColor: '#4CAF50',
    width: 60,
    height: 60,
    borderRadius: 30,
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
});

export default MainNavigator;