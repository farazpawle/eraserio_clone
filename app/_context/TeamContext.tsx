"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TEAM {
  createdBy: string;
  teamName: string;
  _id: string;
}

interface TeamContextType {
  activeTeam: TEAM | null;
  setActiveTeam: (team: TEAM | null) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const [activeTeam, setActiveTeam] = useState<TEAM | null>(null);

  return (
    <TeamContext.Provider value={{ activeTeam, setActiveTeam }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};