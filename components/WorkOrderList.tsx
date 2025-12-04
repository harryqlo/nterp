import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Status, Area, Priority, WorkOrder } from '../types';
import { getDeadlineStatus, formatDate } from '../utils/dateUtils';
import { PERMISSIONS } from '../utils/roleUtils';
import { Icons } from './Icons';
import { WorkOrderDetailModal } from './WorkOrderDetailModal';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';

export const WorkOrderList: React.FC = () => {
  const { workOrders } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<'LIST' | 'BOARD'>('LIST');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterArea, setFilterArea] = useState<string>('ALL');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedOtId, setSelectedOtId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const canCreate = user ? PERMISSIONS[user.role].canCreateOT : false;
  const selectedOt = workOrders.find(ot => ot.id === selectedOtId) || null;

  const filteredOrders = workOrders.filter(ot => {
    const matchStatus = filterStatus === 'ALL' || ot.status === filterStatus;
    const matchArea = filterArea === 'ALL' || ot.area === filterArea;
    const matchSearch = searchTerm === '' || 
                        ot.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        ot.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        ot.clientId.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchUrgent = true;
    if (onlyUrgent) {
      const deadline = getDeadlineStatus(ot.estimatedCompletionDate, ot.status);
      matchUrgent = deadline.color.includes('red') || deadline.color.includes('yellow');
    }

    return matchStatus && matchArea && matchUrgent && matchSearch;
  });

  const handleExportExcel = () => {
    try {
        const dataToExport = filteredOrders.map(ot => {
            const deadline = getDeadlineStatus(ot.estimatedCompletionDate, ot.status);
            const progress = ot.tasks && ot.tasks.length > 0 
                ? Math.round((ot.tasks.filter(t => t.isCompleted).length / ot.tasks.length) * 100) 
                : 0;
            
            return {
                "N° OT": ot.id,
                "Cliente": ot.clientId,
                "Título / Descripción": ot.title,
                "Identificación": ot.identification || 'N/A',
                "Área": ot.area,
                "Estado": ot.status,
                "Prioridad": ot.priority,
                "Fecha Ingreso": formatDate(ot.creationDate),
                "Fecha Entrega": formatDate(ot.estimatedCompletionDate),
                "Situación Plazo": deadline.label,
                "Avance (%)": `${progress}%`,
                "Técnico Asignado": ot.technicianId || 'Pendiente'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ordenes de Trabajo");
        
        // Auto-width columns roughly
        const wscols = [
            {wch: 10}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 10}, {wch: 15}
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Reporte_OTs_${new Date().toISOString().split('T')[0]}.xlsx`);
        addToast("Reporte Excel generado exitosamente", "SUCCESS");
    } catch (error) {
        console.error("Export error:", error);
        addToast("Error al generar el Excel", "ERROR");
    }
  };

  // Kanban Columns Configuration
  const columns = [
    { status: Status.PENDING, title: 'Por Iniciar', color: 'border-l-4 border-slate-400' },
    { status: Status.IN_PROCESS, title: 'En Proceso', color: 'border-l-4 border-blue-500' },
    { status: Status.WAITING, title: 'En Espera / Pausa', color: 'border-l-4 border-orange-400' },
    { status: Status.FINISHED, title: 'Finalizado / Calidad', color: 'border-l-4 border-green-500' }
  ];

  const KanbanCard = ({ ot }: { ot: WorkOrder }) => {
    const deadline = getDeadlineStatus(ot.estimatedCompletionDate, ot.status);
    const progress = ot.tasks && ot.tasks.length > 0 
        ? Math.round((ot.tasks.filter(t => t.isCompleted).length / ot.tasks.length) * 100) 
        : 0;

    return (
      <div 
        onClick={() => setSelectedOtId(ot.id)}
        className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group mb-3 relative overflow-hidden"
      >
         {!ot.isBudgetApproved && <div className="absolute top-0 right-0 w-3 h-3 bg-orange-500 rounded-bl-lg" title="Presupuesto Pendiente"></div>}
         
         <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{ot.id}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${deadline.color}`}>
                {deadline.label === 'En plazo' ? formatDate(ot.estimatedCompletionDate) : deadline.label}
            </span>
         </div>
         
         <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 line-clamp-2">{ot.title}</h4>
         <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate">{ot.clientId}</p>
         
         <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
             <div className="flex items-center gap-2">
                 {ot.priority === Priority.URGENT && <Icons.Alert size={14} className="text-red-500" />}
                 <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{ot.area}</span>
             </div>
             {ot.status === Status.IN_PROCESS && (
                 <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                     <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div>
                     </div>
                     {progress}%
                 </div>
             )}
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Órdenes de Trabajo</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Gestión visual del flujo productivo.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={handleExportExcel}
                className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-sm"
                title="Exportar a Excel"
            >
                <Icons.Excel size={18} className="text-green-600" />
                <span className="hidden sm:inline text-sm font-bold">Exportar</span>
            </button>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 flex">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Vista Lista"
                >
                    <Icons.Orders size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('BOARD')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'BOARD' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Vista Tablero (Kanban)"
                >
                    <Icons.Dashboard size={18} />
                </button>
            </div>

            {canCreate && (
            <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                onClick={() => setIsCreateModalOpen(true)}
            >
                <Icons.Plus size={18} />
                <span>Nueva OT</span>
            </button>
            )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center transition-colors">
        <div className="flex items-center space-x-2">
          <Icons.Filter size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Filtros:</span>
        </div>
        
        {/* Search in Toolbar */}
        <div className="relative">
            <Icons.Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
                type="text" 
                placeholder="Buscar OT..." 
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {viewMode === 'LIST' && (
            <select 
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            >
            <option value="ALL">Todos los Estados</option>
            {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        )}

        <select 
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
          value={filterArea}
          onChange={(e) => setFilterArea(e.target.value)}
        >
          <option value="ALL">Todas las Áreas</option>
          {Object.values(Area).map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <label className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors">
          <input 
            type="checkbox" 
            checked={onlyUrgent} 
            onChange={(e) => setOnlyUrgent(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
          />
          <span>Solo Críticas</span>
        </label>
      </div>

      {viewMode === 'LIST' ? (
      /* Table View */
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-bold">Número</th>
                <th className="p-4 font-bold">Identificación</th>
                <th className="p-4 font-bold">Descripción / Cliente</th>
                <th className="p-4 font-bold">Estado</th>
                <th className="p-4 font-bold">Vencimiento</th>
                <th className="p-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">No se encontraron órdenes</td></tr>
              ) : filteredOrders.map(ot => {
                const deadline = getDeadlineStatus(ot.estimatedCompletionDate, ot.status);
                
                return (
                  <tr key={ot.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group cursor-pointer" onClick={() => setSelectedOtId(ot.id)}>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white font-mono">
                        {ot.id}
                        <div className="text-[10px] text-slate-400 font-normal">{formatDate(ot.creationDate)}</div>
                        
                        {!ot.isBudgetApproved && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 w-fit px-1.5 py-0.5 rounded font-bold border border-orange-200 dark:border-orange-800" title="Pendiente de Aprobación Comercial">
                                <Icons.Receipt size={10} /> Presup.
                            </div>
                        )}
                    </td>
                    <td className="p-4">
                        <div className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block border border-slate-200 dark:border-slate-700">
                            {ot.identification || '-'}
                        </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{ot.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{ot.clientId}</div>
                    </td>
                    <td className="p-4">
                       <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                         ot.status === Status.FINISHED ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' : 
                         ot.status === Status.IN_PROCESS ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 
                         ot.status === Status.WAITING ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' :
                         'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                       }`}>
                         {ot.status}
                       </span>
                    </td>
                    <td className="p-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium whitespace-nowrap ${
                          deadline.color.includes('red') ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
                          deadline.color.includes('yellow') ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800' :
                          deadline.color.includes('green') ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                          'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}>
                        <Icons.Clock size={12} className="mr-1.5" />
                        {formatDate(ot.estimatedCompletionDate)} 
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedOtId(ot.id); }}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                        title="Ver Detalle"
                      >
                        <Icons.More size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
            {columns.map(col => {
                const colOrders = filteredOrders.filter(ot => ot.status === col.status);
                return (
                    <div key={col.status} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
                        <div className={`p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-xl sticky top-0 z-10 ${col.color}`}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{col.title}</h3>
                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{colOrders.length}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            {colOrders.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">Sin OTs</div>
                            ) : (
                                colOrders.map(ot => <KanbanCard key={ot.id} ot={ot} />)
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* Modals */}
      {selectedOt && (
        <WorkOrderDetailModal ot={selectedOt} onClose={() => setSelectedOtId(null)} />
      )}

      {isCreateModalOpen && (
        <CreateWorkOrderModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
};