import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('🔍 T35: Getting initial session...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ T35: Error getting session:', error);
        } else {
          console.log('📋 T35: Initial session:', session ? 'AUTHENTICATED' : 'ANONYMOUS');
          if (session) {
            console.log('📋 T35 DoD Check - access_token preserved:', session.access_token ? 'YES' : 'NO');
          }
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('❌ T35: Exception getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 T35: Auth state changed:', event);
        console.log('📋 T35: New session:', session ? 'AUTHENTICATED' : 'ANONYMOUS');
        
        if (session) {
          console.log('📋 T35 DoD Check - access_token in auth change:', session.access_token ? 'YES' : 'NO');
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🚪 T35: Signing out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ T35: Error signing out:', error);
        throw error;
      }
      console.log('✅ T35: Sign out successful');
    } catch (error) {
      console.error('❌ T35: Exception during sign out:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
