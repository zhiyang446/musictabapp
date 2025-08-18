import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable automatic token refresh for now
    autoRefreshToken: true,
    // Persist session in AsyncStorage
    persistSession: true,
    // Detect session from URL (for magic links)
    detectSessionInUrl: false,
  },
});

// Helper function to get current session
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error in getCurrentSession:', error);
    return null;
  }
};

// Helper function to get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
};

// Test connection function
export const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Anon Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...');
    
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.log('⚠️  Connection test error (expected for anonymous user):', error.message);
    } else {
      console.log('✅ Connection test successful:', data);
    }
    
    // Get current session
    const session = await getCurrentSession();
    console.log('📋 Current session:', session ? 'Authenticated' : 'Anonymous (null)');
    
    return { success: true, session };
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return { success: false, error };
  }
};
