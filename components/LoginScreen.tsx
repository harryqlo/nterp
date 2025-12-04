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
    <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-100 to-slate-200 dark:from-slate-800 dark:via-slate-900 dark:to-black">
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-800 overflow-hidden animate-slide-up">
        
        {/* Brand Header */}
        <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 mb-6 transform rotate-3 hover:rotate-6 transition-transform">
            <Icons.Dashboard size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">North Chrome</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Sistema de Control Operacional</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 flex items-start gap-3 text-red-600 dark:text-red-400 text-sm animate-fade-in">
                <Icons.Alert size={18} className="mt-0.5 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Correo Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Icons.User size={20} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="usuario@northchrome.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1">Contraseña</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Icons.Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {isSubmitting ? <Icons.Clock className="animate-spin" size={20} /> : <span className="flex items-center gap-2">Iniciar Sesión <Icons.ArrowRight size={18} /></span>}
            </button>
          </form>

          {/* Dev Tools / Quick Login */}
          <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 text-center uppercase tracking-wider mb-4">Entorno de Desarrollo (Acceso Rápido)</p>
            <div className="grid grid-cols-4 gap-2">
                {[
                  { role: 'ADMIN', label: 'Admin', color: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' },
                  { role: 'MANAGER', label: 'Jefe', color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' },
                  { role: 'TECHNICIAN', label: 'Tech', color: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' },
                  { role: 'WAREHOUSE', label: 'Bodega', color: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' }
                ].map((item) => (
                  <button 
                    key={item.role}
                    onClick={() => handleQuickLogin(item.role as any)} 
                    className={`p-2 rounded-lg border text-[10px] font-bold uppercase transition-transform hover:-translate-y-1 ${item.color}`}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};