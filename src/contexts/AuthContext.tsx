
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔐 Initializing auth context...');
    
    const initializeAuth = async () => {
      try {
        // Set up auth state listener first
        console.log('👂 Setting up auth state listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email || 'no user');
            setSession(session);
            setUser(session?.user ?? null);
            setError(null);
            
            // Only set loading to false after we get the first auth event
            if (loading) {
              setLoading(false);
            }
          }
        );

        // Then check for existing session
        console.log('🔍 Checking for existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Error getting session:', sessionError);
          setError(`Auth initialization failed: ${sessionError.message}`);
        } else {
          console.log('📋 Initial session check:', session?.user?.email || 'no session');
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        setLoading(false);

        return () => {
          console.log('🧹 Cleaning up auth subscription');
          subscription.unsubscribe();
        };
      } catch (error: any) {
        console.error('💥 Auth initialization error:', error);
        setError(`Failed to initialize authentication: ${error.message}`);
        setLoading(false);
      }
    };

    const cleanup = initializeAuth();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Attempting sign in for:', email);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error('❌ Sign in error:', error);
      } else {
        console.log('✅ Sign in successful');
      }
      return { error };
    } catch (error: any) {
      console.error('💥 Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('📝 Attempting sign up for:', email);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || email,
          }
        }
      });
      if (error) {
        console.error('❌ Sign up error:', error);
      } else {
        console.log('✅ Sign up successful');
      }
      return { error };
    } catch (error: any) {
      console.error('💥 Sign up exception:', error);
      return { error };
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      // Force redirect even if signout fails
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };

  console.log('🎯 Auth context state:', { 
    hasUser: !!user, 
    hasSession: !!session, 
    loading, 
    error: error ? 'has error' : 'no error' 
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
