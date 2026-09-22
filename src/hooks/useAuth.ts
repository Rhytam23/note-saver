import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { supabase } from '../services/supabase';
import { clearUserLocalData, getQueue } from '../services/localDb';
import { processSyncQueue } from '../services/syncEngine';
import { detectPlatform } from '../services/platform/platformAdapterFactory';

const PUBLIC_WEB_ORIGIN = 'https://notenirman.vercel.app';
const LOGOUT_FLUSH_TIMEOUT_MS = 5000;


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
  } catch {
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

  // The desktop and Android apps run on tauri.localhost / capacitor localhost, which
  // an email link opened on another device or browser can never reach.
  const getSafeOrigin = (): string => {
    if (detectPlatform() !== 'web') return PUBLIC_WEB_ORIGIN;
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
      return window.location.origin;
    }
    return PUBLIC_WEB_ORIGIN;
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
      setIsSubmitting(false);
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
      const userIdToClean = user?.id;

      // Push unsynced notes while the session is still valid, so signing out
      // never throws away work that only exists on this device.
      if (userIdToClean) {
        await Promise.race([
          processSyncQueue(userIdToClean),
          new Promise<void>(resolve => setTimeout(resolve, LOGOUT_FLUSH_TIMEOUT_MS)),
        ]).catch(() => undefined);
      }
      const hasUnsyncedWork = userIdToClean ? (await getQueue(userIdToClean).catch(() => [])).length > 0 : false;

      await supabase.auth.signOut();
      setUser(null);

      // SECURITY: wipe this user's local data on shared devices, but never while
      // unsynced changes remain; they stay on disk until the next sign-in syncs them.
      if (userIdToClean && !hasUnsyncedWork) {
        await clearUserLocalData(userIdToClean).catch(err =>
          console.warn('[useAuth] IndexedDB cleanup after logout failed (non-fatal):', err)
        );
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [user]);


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
        redirectTo: getSafeOrigin(),
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

