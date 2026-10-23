'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '@/lib/types';
import { SEED_USERS } from '@/lib/db/seedData';

interface IntegrationInfo {
  gemini: { isConfigured: boolean; model: string; provider: string };
  maps: { isConfigured: boolean; provider: string };
  firebase: { isConfigured: boolean; projectId: string; mode: string };
}

interface RoleContextType {
  currentUser: UserProfile;
  currentRole: UserRole;
  allUsers: UserProfile[];
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  integrations: IntegrationInfo;
  refreshSession: () => Promise<void>;
}

const defaultIntegrations: IntegrationInfo = {
  gemini: { isConfigured: false, model: 'gemini-2.5-flash', provider: 'Google Cloud Gemini API' },
  maps: { isConfigured: false, provider: 'Google Maps Platform Routes API' },
  firebase: { isConfigured: false, projectId: 'rescuegrid-demo-local', mode: 'LOCAL_DEMO_ADAPTER' },
};

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // Default to Elena Rostova (Coordinator) for full platform visibility
  const [currentUser, setCurrentUser] = useState<UserProfile>(SEED_USERS[6]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(SEED_USERS);
  const [integrations, setIntegrations] = useState<IntegrationInfo>(defaultIntegrations);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.allUsers) setAllUsers(data.allUsers);
        if (data.integrations) setIntegrations(data.integrations);

        // Check if there's a stored userId in localStorage
        const savedUserId = localStorage.getItem('rescuegrid_user_id');
        if (savedUserId) {
          const found = data.allUsers?.find((u: UserProfile) => u.id === savedUserId);
          if (found) setCurrentUser(found);
        }
      }
    } catch {
      // Use seeded state
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const switchUser = (userId: string) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('rescuegrid_user_id', user.id);
    }
  };

  const switchRole = (role: UserRole) => {
    const user = allUsers.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('rescuegrid_user_id', user.id);
    }
  };

  return (
    <RoleContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        allUsers,
        switchUser,
        switchRole,
        integrations,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
