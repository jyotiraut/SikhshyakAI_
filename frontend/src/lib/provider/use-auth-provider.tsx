import React, { useState } from 'react';
import type { Role } from '../types/role';

type User = {
  email: string;
  fullName: string;
  id: string;
  role: Role;
  schoolId?: string;
  departmentId?: string;
};

type UserContextType = {
  user: User | undefined;
  setUser: React.Dispatch<React.SetStateAction<User | undefined>>;
  role: Role | undefined;
  setRole: React.Dispatch<React.SetStateAction<Role | undefined>>;
  schoolId: string | undefined;
  setSchoolId: React.Dispatch<React.SetStateAction<string | undefined>>;
  departmentId: string | undefined;
  setDepartmentId: React.Dispatch<React.SetStateAction<string | undefined>>;
};
const userContext = React.createContext<UserContextType | null>(null);
function UserProvider({ children }: { children: React.ReactNode }) {
  const getCurrentUser = (): User | undefined => {
    try {
      const currentUser = localStorage.getItem('currentUser');
      return currentUser ? JSON.parse(currentUser) : undefined;
    } catch (error) {
      console.error('Failed to parse currentUser from localStorage:', error);
      localStorage.removeItem('currentUser');
      return undefined;
    }
  };

  const getCurrentRole = (): Role | undefined => {
    try {
      const currentRole = localStorage.getItem('role');
      return currentRole ? (currentRole as Role) : undefined;
    } catch (error) {
      console.error('Failed to get role from localStorage:', error);
      localStorage.removeItem('role');
      return undefined;
    }
  };

  const getCurrentSchoolId = (): string | undefined => {
    try {
      const currentSchoolId = localStorage.getItem('schoolId');
      return currentSchoolId || undefined;
    } catch (error) {
      console.error('Failed to get schoolId from localStorage:', error);
      localStorage.removeItem('schoolId');
      return undefined;
    }
  };

  const getCurrentDepartmentId = (): string | undefined => {
    try {
      const currentDepartmentId = localStorage.getItem('departmentId');
      return currentDepartmentId || undefined;
    } catch (error) {
      console.error('Failed to get departmentId from localStorage:', error);
      localStorage.removeItem('departmentId');
      return undefined;
    }
  };

  const [user, setUser] = useState<User | undefined>(getCurrentUser());
  const [role, setRole] = useState<Role | undefined>(getCurrentRole());
  const [schoolId, setSchoolId] = useState<string | undefined>(getCurrentSchoolId());
  const [departmentId, setDepartmentId] = useState<string | undefined>(getCurrentDepartmentId());

  return (
    <userContext.Provider
      value={{
        user,
        setUser,
        role,
        setRole,
        schoolId,
        setSchoolId,
        departmentId,
        setDepartmentId,
      }}
    >
      {children}
    </userContext.Provider>
  );
}
export default UserProvider;

export function useAuth() {
  const context = React.useContext(userContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
