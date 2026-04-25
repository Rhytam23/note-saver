import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from '@/src/hooks/useAuth';

// Inline types
interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  passwordHash?: string;
  themePreference?: any; // avoid circular dep on SeasonalTheme
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentialOrEmail: any, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthHook() as any;
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
