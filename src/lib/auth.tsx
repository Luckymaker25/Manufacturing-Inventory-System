import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 
  | 'Admin' 
  | 'Warehouse Staff' 
  | 'Production Manager' 
  | 'Finance Staff' 
  | 'Sales Officer' 
  | 'Purchasing Officer'
  | 'Guest';

interface AuthContextType {
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('user_role');
    return (saved as UserRole) || null;
  });

  const isAuthenticated = role !== null;

  const login = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
  };

  const logout = () => {
    setRoleState(null);
    localStorage.removeItem('user_role');
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
  };

  const hasPermission = (requiredRoles: UserRole[]) => {
    if (!role) return false;
    if (role === 'Admin') return true;
    return requiredRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ role, isAuthenticated, login, logout, setRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
