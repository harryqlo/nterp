
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';
import { Role } from '../types';

export const LoginScreen: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bypass function for development
  const handleQuickLogin = async (role: Role) => {
    setIsSubmitting(true);
    try {
        switch (role) {
            case 'ADMIN': await login('admin@northchrome.cl', 'admin'); break;
            case 'MANAGER': await login('jefe@northchrome.cl', 'user'); break;
            case 'TECHNICIAN': await login('tech@northchrome.cl', 'user'); break;
            case 'WAREHOUSE': await login('bodega@northchrome.cl', 'user'); break;
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-300">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative">
          <div className="mx-auto w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center text-white mb-4 shadow-inner border border-slate-700 backdrop-blur-sm">
            <Icons.Dashboard size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">North Chrome</h1>
          <p className="text-slate-400 text-xs font-medium mt-1 tracking-wide opacity-80">Control Operacional & Gestión</p>
        </div>

        {/* Form Container */}
        <div className="p-8 bg-white">
            
          {/* --- DEV BYPASS START --- */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Acceso Rápido (Dev Mode)</p>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleQuickLogin('ADMIN')} className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-lg flex flex-col items-center transition-all group">
                    <Icons.Lock size={20} className="text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-purple-700">Admin</span>
                </button>
                <button onClick={() => handleQuickLogin('MANAGER')} className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg flex flex-col items-center transition-all group">
                    <Icons.Dashboard size={20} className="text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-blue-700">Jefe Planta</span>
                </button>
                <button onClick={() => handleQuickLogin('TECHNICIAN')} className="p-3 bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-lg flex flex-col items-center transition-all group">
                    <Icons.Tool size={20} className="text-orange-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-orange-700">Técnico</span>
                </button>
                <button onClick={() => handleQuickLogin('WAREHOUSE')} className="p-3 bg-green-50 hover:bg-green-100 border border-green-100 rounded-lg flex flex-col items-center transition-all group">
                    <Icons.Inventory size={20} className="text-green-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-green-700">Bodega</span>
                </button>
            </div>
          </div>
          {/* --- DEV BYPASS END --- */}

          <form onSubmit={handleSubmit} className="space-y-5 opacity-50 hover:opacity-100 transition-opacity">
            
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
                <Icons.Alert size={16} className="mt-0.5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Icons.User size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm"
                  placeholder="admin@northchrome.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Icons.Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Icons.Clock className="animate-spin" size={18} />
                  <span>Ingresando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <Icons.More className="rotate-90" size={18} />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
