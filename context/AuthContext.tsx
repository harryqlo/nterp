
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useApp } from './AppContext';

interface AuthContextProps {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, logActivity, addDebugLog, updateSettings, settings } = useApp();
  
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('north_chrome_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to parse active user from storage", e);
      return null;
    }
  });
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('north_chrome_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('north_chrome_active_user');
    }
  }, [user]);

  // Automatic Admin Debug Mode Enforcement
  useEffect(() => {
      if (user && user.role === 'ADMIN' && !settings.debugModeEnabled) {
          updateSettings({ debugModeEnabled: true });
          addDebugLog('INFO', 'Debug Mode auto-enabled for Admin');
      }
  }, [user, settings.debugModeEnabled, updateSettings, addDebugLog]);

  const login = async (email: string, password: string) => {
    setError(null);
    addDebugLog('INFO', `Attempting login for: ${email}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.active);
    
    if (!foundUser) {
      setError("Usuario no encontrado o inactivo.");
      addDebugLog('WARN', `Login failed: User not found or inactive`, { email });
      logActivity('AUTH_ERROR', 'SYSTEM', `Intento fallido login: ${email}`);
      return;
    }

    if (foundUser.password !== password) {
      setError("Contraseña incorrecta.");
      addDebugLog('WARN', `Login failed: Incorrect password`, { email });
      logActivity('AUTH_ERROR', 'SYSTEM', `Password incorrecta: ${email}`);
      return;
    }

    // Remove password from state memory for safety (basic)
    const { password: _, ...safeUser } = foundUser;
    setUser(foundUser); 
    
    // Force enable debug mode for Admin immediately upon login
    if (foundUser.role === 'ADMIN') {
        updateSettings({ debugModeEnabled: true });
    }

    addDebugLog('INFO', `Login successful`, { userId: foundUser.id, role: foundUser.role });
    logActivity('LOGIN', 'SYSTEM', `Login exitoso: ${foundUser.name} (${foundUser.role})`);
  };

  const logout = () => {
    if (user) {
      logActivity('LOGIN', 'SYSTEM', `Logout: ${user.name}`);
      addDebugLog('INFO', `User logged out`, { userId: user.id });
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
