
import React from 'react';
import { AppProvider } from './context/AppContext';
import { ViewProvider, useView } from './context/ViewContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { WorkOrderList } from './components/WorkOrderList';
import { InventoryList } from './components/InventoryList';
import { ComponentList } from './components/ComponentList';
import { Reports } from './components/Reports';
import { LoginScreen } from './components/LoginScreen';
import { UserManagement } from './components/UserManagement';
import { Panol } from './components/Panol';
import { Settings } from './components/Settings';

const MainContent: React.FC = () => {
  const { currentView } = useView();
  const { user } = useAuth();

  // Secure View Rendering
  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard />;
      case 'ORDERS': return <WorkOrderList />;
      case 'INVENTORY': return <InventoryList />;
      case 'COMPONENTS': return <ComponentList />;
      case 'REPORTS': return <Reports />;
      case 'PANOL': return <Panol />;
      case 'USERS': 
        if (user?.role !== 'ADMIN') return <Dashboard />;
        return <UserManagement />;
      case 'SETTINGS': 
        if (user?.role !== 'ADMIN') return <Dashboard />;
        return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <main className="flex-1 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Header />
      <div className="p-8 max-w-7xl mx-auto">
        {renderView()}
      </div>
    </main>
  );
};

const AppLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen font-sans text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <MainContent />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <ToastProvider>
        <AuthProvider>
          <ViewProvider>
            <AppLayout />
          </ViewProvider>
        </AuthProvider>
      </ToastProvider>
    </AppProvider>
  );
};

export default App;
