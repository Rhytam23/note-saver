import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { supabase } from '../services/supabase';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSubmitting: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedFields: Partial<User>) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const getInitialCachedUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase')) && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sessionUser = parsed?.user || parsed?.currentSession?.user;
          if (sessionUser?.id) {
            return {
              id: sessionUser.id,
              name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
              email: sessionUser.email || '',
              avatarUrl: sessionUser.user_metadata?.avatar_url || null,
            };
          }
        }
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return null;
};

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(() => getInitialCachedUser());
  const [loading, setLoading] = useState<boolean>(() => !getInitialCachedUser());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error('[useAuth] Session check error:', error);

        if (session?.user) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            avatarUrl: session.user.user_metadata.avatar_url || null,
          });
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatarUrl: session.user.user_metadata.avatar_url || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getSafeOrigin = (): string => {
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
      return window.location.origin;
    }
    return 'https://notenirman.vercel.app';
  };

  const login = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getSafeOrigin(),
          scopes: 'https://www.googleapis.com/auth/calendar.readonly'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google Login failed:", error);
      throw error;
    } finally {
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } catch (error) {
      console.error("Email Login failed:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getSafeOrigin(),
          data: {
            full_name: name,
          }
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Signup failed:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const updateUser = useCallback(async (updatedFields: Partial<User>): Promise<void> => {
    if (user) {
      setUser({ ...user, ...updatedFields });

      if (updatedFields.name || updatedFields.avatarUrl) {
        await supabase.auth.updateUser({
          data: {
            full_name: updatedFields.name,
            avatar_url: updatedFields.avatarUrl
          }
        });
      }
    }
  }, [user]);

  const updatePassword = useCallback(async (password: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error) {
      console.error("Password update failed:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Reset password failed:", error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    user,
    loading,
    isSubmitting,
    login,
    loginWithEmail,
    signup,
    logout,
    updateUser,
    updatePassword,
    resetPassword,
  };
}

