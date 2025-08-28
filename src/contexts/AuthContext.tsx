import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { User as AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateConsent: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Centralized user profile fetching
  const fetchUserProfile = async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: newUser, error: insertError } = await supabase
          .from('profiles')
          .insert([{ id: authUser.id, email: authUser.email, role: 'user' }])
          .select()
          .single();
        
        if (insertError) throw insertError;
        setUser(newUser);
      } else if (error) {
        throw error;
      } else {
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching or creating user profile:', error);
      // In case of error, ensure user is logged out to avoid inconsistent states
      setUser(null);
      await supabase.auth.signOut();
    } finally {
      // This is the crucial part: ensure loading is always set to false
      setLoading(false);
    }
  };

  useEffect(() => {
    // On initial load, get the session and set up the listener
    // This will fire once with the initial session state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change detected:', event, session);
      setSession(session);
      fetchUserProfile(session?.user ?? null);
    });

    // Cleanup function to unsubscribe from the listener
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // ... (rest of your functions: signUp, signIn, etc.)
  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updateConsent = async () => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_given_consent: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating consent:', error);
        return { error };
      }

      // Update local user state
      setUser(prev => prev ? { ...prev, has_given_consent: true } : null);
      return { error: null };
    } catch (error) {
      console.error('Error in updateConsent:', error);
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateConsent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};