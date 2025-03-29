"use client";

// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthChange, loginAnonymously } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { AuthContextType } from '@/types';

// Create a more reliable context
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthChange((authUser) => {
      console.log("Auth state changed, user:", authUser?.uid || "null");
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth state listener");
      unsubscribe();
    };
  }, []);

  const login = async () => {
    try {
      return await loginAnonymously();
    } catch (error) {
      console.error("Login error:", error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login
  };

  console.log("Auth context value:", { loading, userId: user?.uid || "null" });
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};