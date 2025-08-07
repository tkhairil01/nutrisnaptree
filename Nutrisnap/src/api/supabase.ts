import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://mfytubwpqqrvdqgezvlu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meXR1YndwcXFydmRxZ2V6dmx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1ODE0NzAsImV4cCI6MjA3MDE1NzQ3MH0.wfe2Bl3kg_aaxwxCJO2p4fMwU-si5QbHPBPMqC-2aJA';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// User related functions
export const signUp = async (email: string, password: string, userData: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });

  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
};

// Database functions
export const insertData = async (table: string, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select();

  return { data: result, error };
};

export const updateData = async (table: string, id: string, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .select();

  return { data: result, error };
};

export const getData = async (table: string, column: string, value: any) => {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(column, value);

  return { data, error };
};

export const getAllData = async (table: string) => {
  const { data, error } = await supabase
    .from(table)
    .select('*');

  return { data, error };
};

export const deleteData = async (table: string, id: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  return { error };
};