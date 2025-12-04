
import React, { createContext, useContext, useState, useEffect } from 'react';
import { View } from '../types';
import { useApp } from './AppContext';

interface ViewContextProps {
  currentView: View;
  setView: (view: View) => void;
}

const ViewContext = createContext<ViewContextProps | undefined>(undefined);

export const ViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setViewInternal] = useState<View>('DASHBOARD');
  const { addDebugLog } = useApp();

  const setView = (view: View) => {
      addDebugLog('INFO', `Navigation: ${currentView} -> ${view}`);
      setViewInternal(view);
  };

  return (
    <ViewContext.Provider value={{ currentView, setView }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) throw new Error("useView must be used within ViewProvider");
  return context;
};
