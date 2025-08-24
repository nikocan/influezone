import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const mockUsers: Record<string, User> = {
  influencer: {
    id: '1',
    name: 'Sarah İnfluencer',
    email: 'sarah@example.com',
    role: 'influencer',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?w=150&h=150&fit=crop&crop=face',
    verified: true
  },
  brand: {
    id: '2',
    name: 'Brand Manager',
    email: 'brand@example.com',
    role: 'brand',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop&crop=face'
  },
  admin: {
    id: '3',
    name: 'System Admin',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=150&h=150&fit=crop&crop=face'
  },
  consumer: {
    id: '4',
    name: 'Happy Customer',
    email: 'customer@example.com',
    role: 'consumer',
    avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?w=150&h=150&fit=crop&crop=face'
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, role: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    const mockUser = mockUsers[role as keyof typeof mockUsers];
    if (mockUser) {
      setUser(mockUser);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: string) => {
    const mockUser = mockUsers[role as keyof typeof mockUsers];
    if (mockUser) {
      setUser(mockUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};