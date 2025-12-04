import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Icons } from './Icons';

export const ComponentList: React.FC = () => {
  const { components } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Catálogo de Componentes</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow hover:bg-blue-700">
          <Icons.Plus size={18} />
          <span>Nuevo Equipo</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="w-10 p-4"></th>
              <th className="p-4 text-left">Equipo / Modelo</th>
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-center">Repuestos Asociados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {components.map(comp => (
              <React.Fragment key={comp.id}>
                <tr 
                  className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${expandedId === comp.id ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  onClick={() => toggleExpand(comp.id)}
                >
                  <td className="p-4 text-center text-slate-400">
                    {expandedId === comp.id ? <Icons.Up size={16} /> : <Icons.Down size={16} />}
                  </td>
                  <td className="p-4 font-medium text-slate-800 dark:text-white">
                    {comp.name}
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">{comp.model}</span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{comp.client}</td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700">
                      {comp.spareParts.length} items
                    </span>
                  </td>
                </tr>
                
                {/* Expanded Nested Table */}
                {expandedId === comp.id && (
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                    <td colSpan={4} className="p-4 pl-14">
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs">
                             <tr>
                               <th className="p-2 text-left">Código</th>
                               <th className="p-2 text-left">Repuesto</th>
                               <th className="p-2 text-right">Cant. por Equipo</th>
                             </tr>
                           </thead>
                           <tbody className="text-slate-700 dark:text-slate-300">
                             {comp.spareParts.map(part => (
                               <tr key={part.id} className="border-t border-slate-100 dark:border-slate-700">
                                 <td className="p-2 font-mono text-xs">{part.code}</td>
                                 <td className="p-2">{part.name}</td>
                                 <td className="p-2 text-right">{part.quantity}</td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};