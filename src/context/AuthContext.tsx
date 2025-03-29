"use client";

// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Tipe untuk konteks autentikasi
interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  anonymousLogin: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

// Buat konteks dengan nilai default
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  anonymousLogin: async () => {},
  logout: async () => {},
  loading: true
});

// Custom hook untuk menggunakan AuthContext
export const useAuth = () => useContext(AuthContext);

// Provider untuk AuthContext
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Periksa status autentikasi saat load
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        // Cek local storage untuk ID pengguna
        const storedUserId = localStorage.getItem('anon_chat_user_id');
        
        if (storedUserId) {
          setUserId(storedUserId);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setUserId(null);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login anonim
  const anonymousLogin = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Generate ID pengguna baru
      const newUserId = `user_${uuidv4()}`;
      localStorage.setItem('anon_chat_user_id', newUserId);
      
      setUserId(newUserId);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during anonymous login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Hapus ID pengguna dari storage
      localStorage.removeItem('anon_chat_user_id');
      
      setIsAuthenticated(false);
      setUserId(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userId, 
      anonymousLogin, 
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;