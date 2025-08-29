import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import type { User as AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
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

  // This function is correct from your code. No changes needed here.
  const fetchUserProfile = async (authUser: User | null) => {
  if (!authUser) {
    setUser(null);
    setLoading(false);
    return;
  }
  try {
    // Now it ONLY fetches the profile. The database trigger handles creation.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error.message);
      // It's okay if this errors sometimes, especially right after sign up
      // as the trigger might take a split second to run.
    } else {
      setUser(data);
    }
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    setUser(null);
  } finally {
    setLoading(false);
  }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change detected:', event, session);
      setSession(session);
      fetchUserProfile(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- FIX IS HERE ---
  // 1. Correctly implement the signUp function
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // The options object with the user's name belongs here
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  // --- AND HERE ---
  // 2. Restore the signIn function to its original state
  const signIn = async (email: string, password: string) => {
    // No 'options' or 'fullName' here
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