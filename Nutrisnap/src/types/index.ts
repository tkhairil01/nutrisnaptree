// User related types
export interface User {
  id: string;
  fullName: string;
  age: number;
  dateOfBirth: string;
  currentWeight: number;
  targetWeight: number;
  height: number;
  gender: 'male' | 'female';
  occupation: string;
  activityLevel: 'passive' | 'moderate' | 'active';
  foodPreference: string;
  exercisePreference: string;
  isPremium: boolean;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// Food related types
export interface Food {
  id: string;
  userId: string;
  name: string;
  foodType: string;
  estimatedWeight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink';
  imageUrl?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// Exercise related types
export interface Exercise {
  id: string;
  userId: string;
  type: string;
  duration: number; // in minutes
  caloriesBurned: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// Weight tracking related types
export interface WeightRecord {
  id: string;
  userId: string;
  weight: number;
  date: string;
  createdAt: string;
}

// Mission related types
export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  type: 'daily' | 'weekly' | 'challenge';
  target: number;
  current: number;
  completed: boolean;
  expiresAt: string;
}

// Badge related types
export interface Badge {
  id: string;
  userId: string;
  name: string;
  description: string;
  imageUrl: string;
  earnedAt: string;
}

// Store item related types
export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'food' | 'fitness' | 'supplements';
  imageUrl: string;
  discount?: number;
  isPromo: boolean;
}

// Premium code related types
export interface PremiumCode {
  code: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
}

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  Store: undefined;
  Profile: undefined;
  Camera: undefined;
  FoodDetails: { imageUri?: string; base64?: string; };
  WeightTracking: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  FoodDetails: { imageUri?: string; base64?: string; };
  ForgotPassword: undefined;
};

export type TabParamList = {
  Home: undefined;
  Journal: undefined;
  Camera: undefined;
  Exercise: undefined;
  Missions: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  WeightTracking: undefined;
};

export type JournalStackParamList = {
  JournalScreen: undefined;
  FoodDetails: { food: Food };
};

export type ExerciseStackParamList = {
  ExerciseScreen: undefined;
  ExerciseDetails: { exercise?: Exercise };
};

export type MissionsStackParamList = {
  MissionsScreen: undefined;
};