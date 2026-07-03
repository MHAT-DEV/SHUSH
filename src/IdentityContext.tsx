import React, { createContext, useContext } from 'react';

type IdentityContextType = {
  activeTheme: string;
  activeBadge: string | null;
  activeNameColor: string | null;
  isDarkMode: boolean;
  currentUserId: string | null;
};

export const IdentityContext = createContext<IdentityContextType>({
  activeTheme: 'default',
  activeBadge: null,
  activeNameColor: null,
  isDarkMode: true,
  currentUserId: null,
});

export const useIdentity = () => useContext(IdentityContext);
