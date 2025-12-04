
import React, { useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icons } from './Icons';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security check - double layer (Sidebar handles navigation, this handles rendering)
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 dark:text-slate-500">
        <Icons.Lock size={48} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-slate-600 dark:text-slate-400">Acceso Restringido</h2>
        <p>Esta sección es solo para administradores.</p>
      </div>
    );
  }

  const handleResetDatabase = () => {
      const confirmText = "ELIMINAR";
      const input = prompt(`ADVERTENCIA: Esto borrará TODA la información local (OTs, Inventario, Usuarios, etc.) y reiniciará la aplicación a los datos de fábrica.\n\nPara confirmar escriba "${confirmText}":`);
      
      if (input === confirmText) {
          localStorage.clear();
          addToast("Base de datos reiniciada. Recargando...", "WARNING");
          setTimeout(() => {
              window.location.reload();
          }, 1500);
      } else {
          addToast("Operación cancelada.", "INFO");
      }
  };

  const handleBackup = () => {
      const data: Record<string, any> = {};
      // Collect all keys starting with 'north_chrome_'
      for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('north_chrome_')) {
              try {
                data[key] = JSON.parse(localStorage.getItem(key) || 'null');
              } catch (e) {
                data[key] = localStorage.getItem(key);
              }
          }
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_north_chrome_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast("Copia de seguridad descargada.", "SUCCESS");
  };

  const handleRestoreClick = () => {
      fileInputRef.current?.click();
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (window.confirm("¿Está seguro? Esto sobrescribirá los datos actuales con los del archivo de respaldo.")) {
                  Object.keys(json).forEach(key => {
                      if (key.startsWith('north_chrome_')) {
                          localStorage.setItem(key, JSON.stringify(json[key]));
                      }
                  });
                  addToast("Datos restaurados correctamente. Recargando...", "SUCCESS");
                  setTimeout(() => window.location.reload(), 1500);
              }
          } catch (err) {
              console.error(err);
              addToast("Error al leer el archivo de respaldo.", "ERROR");
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
             <Icons.Settings size={32} className="text-slate-700 dark:text-slate-200" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configuración del Sistema</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ajustes generales y preferencias de la aplicación.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          
          {/* General Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Icons.Dashboard size={18} className="text-blue-600 dark:text-blue-400" />
                      General
                  </h3>
              </div>
              <div className="p-6 space-y-4">
                  <div>
                      <label className="label-xs">Nombre de la Empresa</label>
                      <input 
                        type="text" 
                        className="input-std" 
                        value={settings.companyName}
                        onChange={(e) => updateSettings({ companyName: e.target.value })}
                      />
                  </div>
                  <div>
                      <label className="label-xs">Servidor de Imágenes (URL)</label>
                      <input 
                        type="text" 
                        className="input-std" 
                        value={settings.photoServerUrl}
                        onChange={(e) => updateSettings({ photoServerUrl: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Endpoint para cargar galería de OTs.</p>
                  </div>
                  
                  {/* Theme Toggle */}
                   <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${settings.theme === 'dark' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-slate-100 text-slate-400'}`}>
                              <Icons.Users size={24} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Modo Oscuro (Dark Mode)</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Cambia la apariencia de la interfaz para entornos de baja luz.</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.theme === 'dark'}
                            onChange={(e) => updateSettings({ theme: e.target.checked ? 'dark' : 'light' })}
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>
              </div>
          </div>

          {/* Developer / Maintenance Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Icons.Cpu size={18} className="text-purple-600 dark:text-purple-400" />
                      Sistema & Desarrollo
                  </h3>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 px-2 py-1 rounded uppercase">Admin Only</span>
              </div>
              <div className="p-6 space-y-4">
                  
                  {/* Debug Mode Toggle */}
                  <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${settings.debugModeEnabled ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                              <Icons.Danger size={24} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Modo Depuración (Debug Mode)</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Habilita consolas de errores y logs técnicos visibles en los módulos (ej: Pañol).</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.debugModeEnabled}
                            onChange={(e) => updateSettings({ debugModeEnabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>

                  {/* Notification Toggle */}
                  <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full ${settings.notificationsEnabled ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                              <Icons.Bell size={24} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800 dark:text-white text-sm">Notificaciones de Sistema</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Habilita alertas visuales en la barra superior.</p>
                          </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.notificationsEnabled}
                            onChange={(e) => updateSettings({ notificationsEnabled: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>

                  {/* Data Management (Backup / Restore / Reset) */}
                   <div className="p-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10 rounded-lg mt-6">
                      <div className="flex items-start gap-4">
                          <div className="p-3 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                              <Icons.Upload size={24} />
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-blue-800 dark:text-blue-200 text-sm">Respaldo de Datos</h4>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Descargue una copia de seguridad o restaure datos anteriores.</p>
                              
                              <div className="flex flex-col sm:flex-row gap-2">
                                  <button 
                                    onClick={handleBackup}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex-1 flex items-center justify-center gap-2"
                                  >
                                    <Icons.Download size={16} /> Descargar Backup
                                  </button>
                                  <button 
                                    onClick={handleRestoreClick}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-bold rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm flex-1 flex items-center justify-center gap-2"
                                  >
                                    <Icons.Upload size={16} /> Restaurar Backup
                                  </button>
                                  <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".json" 
                                    onChange={handleRestoreFile}
                                  />
                              </div>
                          </div>
                      </div>
                  </div>

                   <div className="p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-lg mt-4">
                      <div className="flex items-start gap-4">
                          <div className="p-3 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                              <Icons.Trash size={24} />
                          </div>
                          <div className="flex-1">
                              <h4 className="font-bold text-red-800 dark:text-red-200 text-sm">Zona de Peligro</h4>
                              <p className="text-xs text-red-600 dark:text-red-400 mb-3">Las acciones aquí no se pueden deshacer.</p>
                              <button 
                                onClick={handleResetDatabase}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 shadow-sm w-full sm:w-auto"
                              >
                                Reiniciar Base de Datos Local
                              </button>
                          </div>
                      </div>
                  </div>

              </div>
          </div>
      </div>
    </div>
  );
};
