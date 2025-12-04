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
    if (!userPermissions.allowedViews.includes(view)) return null;

    const isActive = currentView === view;

    return (
      <button
        onClick={() => setView(view)}
        className={`group w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1 relative overflow-hidden
          ${isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-semibold' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
      >
        <Icon size={20} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
        <span className="truncate">{label}</span>
        {badge && badge > 0 && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-72 bg-white dark:bg-slate-900 h-screen shadow-2xl shadow-slate-200 dark:shadow-slate-950 flex flex-col sticky top-0 left-0 border-r border-slate-100 dark:border-slate-800 z-50 transition-colors duration-300 font-sans">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Icons.Dashboard className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-lg font-extrabold tracking-tight leading-none">North Chrome</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control Operacional</p>
            </div>
        </div>
      </div>

      <div className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">Principal</p>
        <NavItem view="DASHBOARD" icon={Icons.Dashboard} label="Dashboard" />
        <NavItem view="ORDERS" icon={Icons.Orders} label="Órdenes (OT)" badge={urgentCount} />
        
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">Logística</p>
        <NavItem view="INVENTORY" icon={Icons.Inventory} label="Inventario" />
        <NavItem view="PANOL" icon={Icons.Panol} label="Pañol Herramientas" />
        <NavItem view="COMPONENTS" icon={Icons.Components} label="Componentes" />
        
        <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">Gestión</p>
        <NavItem view="REPORTS" icon={Icons.Reports} label="Reportes" />
        <NavItem view="USERS" icon={Icons.Users} label="Usuarios" />
        <NavItem view="SETTINGS" icon={Icons.Settings} label="Configuración" />
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
        <div className="flex items-center space-x-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md
            ${user.role === 'ADMIN' ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 
              user.role === 'MANAGER' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 
              user.role === 'TECHNICIAN' ? 'bg-gradient-to-br from-orange-500 to-orange-700' : 'bg-gradient-to-br from-emerald-500 to-emerald-700'}`}>
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-semibold uppercase tracking-wide">{getRoleLabel(user.role)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};