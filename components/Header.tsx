
import React, { useMemo, useState } from 'react';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/dateUtils';

export const Header: React.FC = () => {
  const { activityLog, workOrders, settings, updateSettings } = useApp();
  const { logout, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);

  // Simple search logic
  const suggestions = useMemo(() => {
    if (searchTerm.length <= 1) return [];
    return workOrders
      .filter((ot) =>
        ot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ot.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5);
  }, [searchTerm, workOrders]);

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm transition-colors duration-300">
      {/* Search Bar */}
      <div className="relative w-96">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Icons.Search className="text-slate-400" size={18} />
        </div>
        <input
          type="text"
          placeholder="Buscar OT por ID o Título..."
          className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent text-slate-900 dark:text-white placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 rounded-lg text-sm transition-all border dark:border-slate-700 focus:border-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {/* Search Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-2 animate-in fade-in zoom-in-95 duration-200">
            {suggestions.map(ot => (
              <div key={ot.id} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ot.id}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate w-32">{ot.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4">

        {/* Theme Toggle */}
        <button
          className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {settings.theme === 'dark' ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setShowNotifs(!showNotifs)}
          >
            <Icons.Bell size={20} />
            {activityLog.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Actividad Reciente</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {activityLog.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">Sin actividad reciente</div>
                ) : (
                  activityLog.map((log) => (
                    <div key={log.id} className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <p className="text-xs text-slate-400 mb-1">{formatDateTime(log.timestamp)}</p>
                      <p className="text-sm text-slate-800 dark:text-slate-300">{log.details}</p>
                      <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded font-bold 
                        ${log.action === 'CREATE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {log.entity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2"></div>

        <button 
          onClick={logout}
          className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Icons.Logout size={16} />
          Salir
        </button>

      </div>
    </header>
  );
};
