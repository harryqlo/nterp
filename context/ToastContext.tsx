
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Icons } from '../components/Icons';

type ToastType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'INFO') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-300 min-w-[300px]
              ${toast.type === 'SUCCESS' ? 'bg-white border-green-200 text-green-800' : ''}
              ${toast.type === 'ERROR' ? 'bg-white border-red-200 text-red-800' : ''}
              ${toast.type === 'INFO' ? 'bg-white border-blue-200 text-blue-800' : ''}
              ${toast.type === 'WARNING' ? 'bg-white border-amber-200 text-amber-800' : ''}
            `}
          >
            <div className={`
              p-1.5 rounded-full shrink-0
              ${toast.type === 'SUCCESS' ? 'bg-green-100 text-green-600' : ''}
              ${toast.type === 'ERROR' ? 'bg-red-100 text-red-600' : ''}
              ${toast.type === 'INFO' ? 'bg-blue-100 text-blue-600' : ''}
              ${toast.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : ''}
            `}>
              {toast.type === 'SUCCESS' && <Icons.CheckCircle size={16} />}
              {toast.type === 'ERROR' && <Icons.Alert size={16} />}
              {toast.type === 'INFO' && <Icons.Bell size={16} />}
              {toast.type === 'WARNING' && <Icons.Danger size={16} />}
            </div>
            
            <p className="text-sm font-medium flex-1">{toast.message}</p>

            <button 
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icons.X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
