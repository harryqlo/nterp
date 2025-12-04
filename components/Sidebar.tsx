
import React from 'react';
import { useView } from '../context/ViewContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';
import { View, Status } from '../types';
import { getDeadlineStatus } from '../utils/dateUtils';
import { PERMISSIONS, getRoleLabel } from '../utils/roleUtils';

export const Sidebar: React.FC = () => {
  const { currentView, setView } = useView();
  const { workOrders } = useApp();
  const { user } = useAuth();

  if (!user) return null;

  const userPermissions = PERMISSIONS[user.role];

  // Calculate urgent OTs badge
  const urgentCount = workOrders.filter(ot => {
    if (ot.status === Status.FINISHED || ot.status === Status.CANCELLED) return false;
    const status = getDeadlineStatus(ot.estimatedCompletionDate, ot.status);
    return status.color.includes('bg-red');
  }).length;

  const NavItem = ({ view, icon: Icon, label, badge }: { view: View; icon: any; label: string; badge?: number }) => {
    // Check if user is allowed to see this view
    if (!userPermissions.allowedViews.includes(view)) return null;

    return (
      <button
        onClick={() => setView(view)}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
          currentView === view 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
        {badge && badge > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 h-screen shadow-xl shadow-slate-200 dark:shadow-slate-950 flex flex-col sticky top-0 left-0 border-r border-slate-100 dark:border-slate-800 z-10 transition-colors duration-300">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 mb-1">
            <Icons.Dashboard className="w-7 h-7" />
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">North Chrome</h1>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 pl-9">Control Operacional v2.1</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavItem view="DASHBOARD" icon={Icons.Dashboard} label="Dashboard" />
        <NavItem view="ORDERS" icon={Icons.Orders} label="Órdenes (OT)" badge={urgentCount} />
        <NavItem view="INVENTORY" icon={Icons.Inventory} label="Inventario" />
        <NavItem view="PANOL" icon={Icons.Panol} label="Pañol" />
        <NavItem view="COMPONENTS" icon={Icons.Components} label="Componentes" />
        <NavItem view="REPORTS" icon={Icons.Reports} label="Reportes" />
        
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Sistema</p>
            <NavItem view="USERS" icon={Icons.Users} label="Usuarios" />
            <NavItem view="SETTINGS" icon={Icons.Settings} label="Configuración" />
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm
            ${user.role === 'ADMIN' ? 'bg-purple-600' : 
              user.role === 'MANAGER' ? 'bg-blue-600' : 
              user.role === 'TECHNICIAN' ? 'bg-orange-50 dark:bg-orange-900/50 text-orange-700 dark:text-orange-200' : 'bg-green-600'}`}>
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{getRoleLabel(user.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
