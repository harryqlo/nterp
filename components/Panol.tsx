import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';
import { Tool, ToolStatus, ToolLoan, ToolMaintenance, ToolCategory, Technician, WorkOrder } from '../types';
import { formatDate, formatDateTime } from '../utils/dateUtils';

type PanolTab = 'LOANS' | 'RETURNS' | 'INVENTORY' | 'MOVEMENTS' | 'MAINTENANCE';

const STATUS_BADGES: Record<ToolStatus, React.ReactNode> = {
  'AVAILABLE': <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-green-200 dark:border-green-800 uppercase tracking-wide">Disponible</span>,
  'IN_USE': <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-200 dark:border-blue-800 uppercase tracking-wide">En Uso</span>,
  'MAINTENANCE': <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-orange-200 dark:border-orange-800 uppercase tracking-wide">Mantención</span>,
  'BROKEN': <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200 dark:border-red-800 uppercase tracking-wide">Dañada</span>,
  'RETIRED': <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700 uppercase tracking-wide">De Baja</span>,
};

export const Panol: React.FC = () => {
  const { tools, toolLoans, technicians, debugLogs, settings, addTool, updateTool, checkoutTool, checkinTool, processToolReturns, addToolMaintenance, addDebugLog } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PanolTab>('LOANS');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [loanSearchTerm, setLoanSearchTerm] = useState(''); 
  const [maintSendSearch, setMaintSendSearch] = useState(''); 
  const [maintReturnSearch, setMaintReturnSearch] = useState(''); 
  const [returnSearchTech, setReturnSearchTech] = useState('');
  const [selectedReturnTechId, setSelectedReturnTechId] = useState<string | null>(null);
  const [returnSelection, setReturnSelection] = useState<Record<string, boolean>>({}); 
  const [returnConditions, setReturnConditions] = useState<Record<string, 'GOOD' | 'DAMAGED'>>({}); 
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyFilter, setHistoryFilter] = useState<'7DAYS' | '30DAYS' | '90DAYS' | 'ALL'>('ALL');
  const [selectedToolToSend, setSelectedToolToSend] = useState<Tool | null>(null);
  const [selectedToolToReturn, setSelectedToolToReturn] = useState<Tool | null>(null);
  const [sendFormData, setSendFormData] = useState({ date: new Date().toISOString().split('T')[0], type: 'EXTERNAL' as 'INTERNAL' | 'EXTERNAL', urgency: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH', reason: '', provider: '', responsible: user?.name || '', reference: '', estimatedReturnDate: '' });
  const [returnFormData, setReturnFormData] = useState({ date: new Date().toISOString().split('T')[0], status: 'AVAILABLE' as ToolStatus, observation: '', cost: 0, invoiceRef: '', nextScheduledDate: '' });
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<ToolLoan | null>(null);

  const filteredTools = useMemo(() => tools.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.code.toLowerCase().includes(searchTerm.toLowerCase())), [tools, searchTerm]);
  const filteredActiveLoans = useMemo(() => toolLoans.filter(l => l.status === 'ACTIVE' && (l.technicianName.toLowerCase().includes(loanSearchTerm.toLowerCase()) || l.toolName.toLowerCase().includes(loanSearchTerm.toLowerCase()) || l.toolId.toLowerCase().includes(loanSearchTerm.toLowerCase()))), [toolLoans, loanSearchTerm]);
  const techniciansWithLoans = useMemo(() => {
      const activeLoans = toolLoans.filter(l => l.status === 'ACTIVE');
      const techIds = Array.from(new Set(activeLoans.map(l => l.technicianId)));
      return techIds.map(id => ({ id, name: technicians.find(t => t.id === id)?.name || 'Desconocido', count: activeLoans.filter(l => l.technicianId === id).length })).filter(t => t.name.toLowerCase().includes(returnSearchTech.toLowerCase())).sort((a, b) => b.count - a.count);
  }, [toolLoans, technicians, returnSearchTech]);
  const selectedTechLoans = useMemo(() => selectedReturnTechId ? toolLoans.filter(l => l.status === 'ACTIVE' && l.technicianId === selectedReturnTechId) : [], [toolLoans, selectedReturnTechId]);
  const filteredHistory = useMemo(() => {
      const now = new Date();
      return toolLoans.filter(l => {
          if (historyFilter === 'ALL') return true;
          const diffDays = Math.ceil(Math.abs(now.getTime() - new Date(l.loanDate).getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= (historyFilter === '7DAYS' ? 7 : historyFilter === '30DAYS' ? 30 : 90);
      }).sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());
  }, [toolLoans, historyFilter]);
  const toolsForMaint = useMemo(() => tools.filter(t => (t.status === 'AVAILABLE' || t.status === 'BROKEN') && (t.name.toLowerCase().includes(maintSendSearch.toLowerCase()) || t.code.toLowerCase().includes(maintSendSearch.toLowerCase()))), [tools, maintSendSearch]);
  const toolsInMaint = useMemo(() => tools.filter(t => t.status === 'MAINTENANCE' && (t.name.toLowerCase().includes(maintReturnSearch.toLowerCase()) || t.code.toLowerCase().includes(maintReturnSearch.toLowerCase()))), [tools, maintReturnSearch]);

  const handleSendToMaintenance = () => {
      if (!selectedToolToSend || !sendFormData.reason) return;
      updateTool(selectedToolToSend.id, { status: 'MAINTENANCE', activeMaintenance: { ...sendFormData, provider: sendFormData.provider || 'Taller Interno' } });
      setSendFormData({ ...sendFormData, reason: '', provider: '', reference: '', estimatedReturnDate: '' }); setSelectedToolToSend(null);
  };
  const handleReturnFromMaintenance = () => {
      if (!selectedToolToReturn) return;
      addToolMaintenance({ id: `MT-${Date.now()}`, toolId: selectedToolToReturn.id, type: 'CORRECTIVE', date: returnFormData.date, performedBy: selectedToolToReturn.activeMaintenance?.provider || 'Desconocido', cost: returnFormData.cost, invoiceRef: returnFormData.invoiceRef, purchaseOrder: selectedToolToReturn.activeMaintenance?.reference, description: returnFormData.observation || 'Mantenimiento Finalizado', nextScheduledDate: returnFormData.nextScheduledDate });
      updateTool(selectedToolToReturn.id, { status: returnFormData.status, nextMaintenanceDate: returnFormData.nextScheduledDate, activeMaintenance: undefined });
      setReturnFormData({ ...returnFormData, observation: '', cost: 0, invoiceRef: '', status: 'AVAILABLE', nextScheduledDate: '' }); setSelectedToolToReturn(null);
  };
  const handleProcessReturns = () => {
      const selectedIds = Object.keys(returnSelection).filter(id => returnSelection[id]);
      if (selectedIds.length === 0) return;
      const returnsPayload = selectedIds.map(lid => {
          const loan = toolLoans.find(l => l.id === lid);
          if (!loan) return null;
          const isGood = (returnConditions[lid] || 'GOOD') === 'GOOD';
          return { loanId: loan.id, toolId: loan.toolId, condition: isGood ? 'Conforme' : 'Dañada', status: (isGood ? 'AVAILABLE' : 'BROKEN') as ToolStatus };
      }).filter(Boolean) as any[];
      processToolReturns(returnsPayload, returnDate);
      setReturnSelection({}); setReturnConditions({}); if (selectedTechLoans.length === selectedIds.length) setSelectedReturnTechId(null);
  };

  const renderKPIs = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[{ title: 'Préstamos Activos', value: toolLoans.filter(l => l.status === 'ACTIVE').length, icon: Icons.Checklist, color: 'bg-blue-500' }, { title: 'En Mantención', value: tools.filter(t => t.status === 'MAINTENANCE').length, icon: Icons.Tool, color: 'bg-orange-500' }, { title: 'Dañadas / Bajas', value: tools.filter(t => t.status === 'BROKEN').length, icon: Icons.Danger, color: 'bg-red-500' }, { title: 'Total Activos', value: tools.length, icon: Icons.Inventory, color: 'bg-slate-500' }].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${kpi.color} bg-opacity-10 text-${kpi.color.split('-')[1]}-600`}><kpi.icon size={24} className={kpi.color.replace('bg-', 'text-').replace('-500', '-600')} /></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{kpi.title}</p><h3 className="text-xl font-bold text-slate-800 dark:text-white">{kpi.value}</h3></div>
            </div>
        ))}
    </div>
  );

  const renderTabs = () => (
    <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto mb-6">
        <div className="flex space-x-1 min-w-max">
            {[{ id: 'LOANS', label: 'Mesón', icon: Icons.Checklist }, { id: 'RETURNS', label: 'Devoluciones', icon: Icons.ChevronsLeft }, { id: 'INVENTORY', label: 'Inventario', icon: Icons.Panol }, { id: 'MOVEMENTS', label: 'Historial', icon: Icons.History }, { id: 'MAINTENANCE', label: 'Mantenimiento', icon: Icons.LifeCycle }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as PanolTab)} className={`px-4 py-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}><tab.icon size={16}/>{tab.label}</button>
            ))}
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><Icons.Panol className="text-slate-700 dark:text-slate-300" /> Pañol {settings.debugModeEnabled && <button onClick={() => setIsDebugModalOpen(true)} className="ml-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-1.5 rounded hover:bg-red-200 dark:hover:bg-red-800"><Icons.Danger size={16} /></button>}</h2><p className="text-sm text-slate-500 dark:text-slate-400">Gestión de herramientas.</p></div></div>
      {renderKPIs()} {renderTabs()}

      {activeTab === 'LOANS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px]">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center"><h3 className="font-bold text-slate-700 dark:text-white">Préstamos en Curso</h3><div className="relative w-64"><Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Buscar..." className="input-std py-1.5 pl-9 text-xs" value={loanSearchTerm} onChange={(e) => setLoanSearchTerm(e.target.value)}/></div></div>
                  <div className="flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10"><tr><th className="p-3">Herramienta</th><th className="p-3">Técnico</th><th className="p-3">Salida</th></tr></thead><tbody className="divide-y divide-slate-50 dark:divide-slate-800">{filteredActiveLoans.length === 0 ? (<tr><td colSpan={3} className="p-8 text-center text-slate-400 dark:text-slate-500">Sin préstamos activos.</td></tr>) : filteredActiveLoans.map(loan => (<tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="p-3"><div className="font-bold text-slate-800 dark:text-white">{loan.toolName}</div><div className="text-xs text-slate-400 font-mono">{tools.find(t => t.id === loan.toolId)?.code}</div></td><td className="p-3"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">{loan.technicianName.charAt(0)}</div><span className="text-slate-700 dark:text-slate-300">{loan.technicianName}</span></div></td><td className="p-3 text-slate-600 dark:text-slate-400">{formatDateTime(loan.loanDate)}</td></tr>))}</tbody></table></div>
              </div>
              <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800 shadow-sm"><h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Acciones Rápidas</h3><button onClick={() => setIsCheckoutModalOpen(true)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex justify-center items-center gap-2"><Icons.ArrowRight size={20}/> Registrar Entrega</button></div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"><div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><h3 className="font-bold text-slate-700 dark:text-white text-sm">Últimas Devoluciones</h3></div><ul className="divide-y divide-slate-50 dark:divide-slate-800">{toolLoans.filter(l => l.status === 'RETURNED').slice(0, 5).map(loan => (<li key={loan.id} className="p-3 text-xs"><div className="flex justify-between mb-1"><span className="font-bold text-slate-700 dark:text-slate-200">{loan.toolName}</span><span className="text-slate-400">{formatDate(loan.returnDate)}</span></div><div className="text-slate-500">{loan.technicianName}</div></li>))}</ul></div>
              </div>
          </div>
      )}

      {activeTab === 'RETURNS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"><input type="text" placeholder="Filtrar Técnico..." className="input-std py-2 text-xs" value={returnSearchTech} onChange={(e) => setReturnSearchTech(e.target.value)}/></div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">{techniciansWithLoans.map(t => <button key={t.id} onClick={() => setSelectedReturnTechId(t.id)} className={`w-full text-left p-3 rounded-lg text-sm flex justify-between items-center transition-colors ${selectedReturnTechId === t.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}><span className="font-bold">{t.name}</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedReturnTechId === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{t.count}</span></button>)}</div>
            </div>
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center"><div><h3 className="font-bold text-slate-700 dark:text-white text-sm uppercase">Selección</h3></div><input type="date" className="input-std py-1 w-auto" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}/></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">{selectedTechLoans.map(loan => (<div key={loan.id} className={`border rounded-xl p-3 transition-all ${returnSelection[loan.id] ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 opacity-80'}`}><div className="flex items-center gap-3"><input type="checkbox" className="h-5 w-5 text-blue-600 rounded" checked={!!returnSelection[loan.id]} onChange={() => setReturnSelection(prev => ({ ...prev, [loan.id]: !prev[loan.id] }))}/><div className="flex-1"><p className="font-bold text-slate-800 dark:text-white text-sm">{loan.toolName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(loan.loanDate)}</p></div>{returnSelection[loan.id] && <div className="flex bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-1"><button onClick={() => setReturnConditions(prev => ({ ...prev, [loan.id]: 'GOOD' }))} className={`px-3 py-1 text-xs font-bold rounded ${(!returnConditions[loan.id] || returnConditions[loan.id] === 'GOOD') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'text-slate-400'}`}>Ok</button><button onClick={() => setReturnConditions(prev => ({ ...prev, [loan.id]: 'DAMAGED' }))} className={`px-3 py-1 text-xs font-bold rounded ${returnConditions[loan.id] === 'DAMAGED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'text-slate-400'}`}>Dañada</button></div>}</div></div>))}</div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end"><button onClick={handleProcessReturns} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2"><Icons.CheckCircle size={18}/> Confirmar ({Object.values(returnSelection).filter(Boolean).length})</button></div>
            </div>
          </div>
      )}

      {activeTab === 'INVENTORY' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col min-h-[500px] animate-in fade-in duration-300">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center"><div className="relative w-64"><Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Buscar..." className="input-std py-1.5 pl-9 text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div><button onClick={() => { setSelectedTool(null); setIsToolModalOpen(true); }} className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-900"><Icons.Plus size={14}/> Nuevo</button></div>
            <div className="flex-1 overflow-auto"><table className="w-full text-left text-sm"><thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10"><tr><th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Cat</th><th className="p-3 text-center">Estado</th><th className="p-3 text-right">Acción</th></tr></thead><tbody className="divide-y divide-slate-50 dark:divide-slate-800">{filteredTools.map(tool => (<tr key={tool.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{tool.code}</td><td className="p-3 font-bold text-slate-700 dark:text-white">{tool.name}</td><td className="p-3 text-xs text-slate-500 dark:text-slate-400">{tool.category}</td><td className="p-3 text-center">{STATUS_BADGES[tool.status]}</td><td className="p-3 text-right"><button onClick={() => { setSelectedTool(tool); setIsToolModalOpen(true); }} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold">Editar</button></td></tr>))}</tbody></table></div>
        </div>
      )}
      
      {/* Maintenance Tab (Keep structure, apply dark classes) */}
      {activeTab === 'MAINTENANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
             {/* Same logic as before but with dark classes */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[700px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-orange-50 dark:bg-orange-900/20 flex justify-between items-center"><h3 className="font-bold text-orange-800 dark:text-orange-200">Enviar a Mantención</h3><input type="text" placeholder="Buscar..." className="input-std py-1.5 w-48 text-xs" value={maintSendSearch} onChange={(e) => setMaintSendSearch(e.target.value)}/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
                    <div className="overflow-y-auto p-2 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        {toolsForMaint.map(t => <div key={t.id} onClick={() => setSelectedToolToSend(t)} className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all ${selectedToolToSend?.id === t.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-md' : 'border-white dark:border-slate-800 bg-white dark:bg-slate-900'}`}><span className="font-bold text-slate-700 dark:text-white text-sm">{t.name}</span><div className="flex justify-between mt-1 items-center"><span className="text-xs font-mono text-slate-500 dark:text-slate-400">{t.code}</span>{STATUS_BADGES[t.status]}</div></div>)}
                    </div>
                    <div className="p-4 overflow-y-auto bg-white dark:bg-slate-900">
                        {selectedToolToSend && <div className="space-y-4">
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-3 rounded-lg mb-2"><p className="font-bold text-slate-800 dark:text-white">{selectedToolToSend.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{selectedToolToSend.code}</p></div>
                            <div><label className="label-xs">Motivo</label><textarea className="input-std h-20" value={sendFormData.reason} onChange={e => setSendFormData({...sendFormData, reason: e.target.value})}/></div>
                            <button onClick={handleSendToMaintenance} className="w-full bg-orange-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-orange-700">Confirmar Envío</button>
                        </div>}
                    </div>
                </div>
             </div>
             {/* Reception Side */}
             <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[700px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-green-50 dark:bg-green-900/20 flex justify-between items-center"><h3 className="font-bold text-green-800 dark:text-green-200">Recepción</h3><input type="text" placeholder="Buscar..." className="input-std py-1.5 w-48 text-xs" value={maintReturnSearch} onChange={(e) => setMaintReturnSearch(e.target.value)}/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 h-full overflow-hidden">
                    <div className="overflow-y-auto p-2 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        {toolsInMaint.map(t => <div key={t.id} onClick={() => setSelectedToolToReturn(t)} className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all ${selectedToolToReturn?.id === t.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md' : 'border-white dark:border-slate-800 bg-white dark:bg-slate-900'}`}><span className="font-bold text-slate-700 dark:text-white text-sm">{t.name}</span><div className="flex justify-between mt-1 items-center"><span className="text-xs font-mono text-slate-500 dark:text-slate-400">{t.code}</span>{STATUS_BADGES[t.status]}</div></div>)}
                    </div>
                    <div className="p-4 overflow-y-auto bg-white dark:bg-slate-900">
                        {selectedToolToReturn && <div className="space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-3 rounded-lg mb-2"><p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">Referencia</p><p className="text-xs text-slate-600 dark:text-slate-300 italic">{selectedToolToReturn.activeMaintenance?.reason}</p></div>
                            <div><label className="label-xs">Informe Técnico</label><textarea className="input-std h-20" value={returnFormData.observation} onChange={e => setReturnFormData({...returnFormData, observation: e.target.value})}/></div>
                            <button onClick={handleReturnFromMaintenance} className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-700">Recibir</button>
                        </div>}
                    </div>
                </div>
             </div>
        </div>
      )}
      
      {/* Modals (Checkout, Checkin, ToolForm, Debug) - Apply dark classes to backgrounds and inputs */}
      {isCheckoutModalOpen && <CheckoutModal onClose={() => setIsCheckoutModalOpen(false)} tools={tools} technicians={technicians} onCheckout={checkoutTool} />}
      {isCheckinModalOpen && selectedLoan && <CheckinModal loan={selectedLoan} onClose={() => { setIsCheckinModalOpen(false); setSelectedLoan(null); }} onCheckin={checkinTool} />}
      {isToolModalOpen && <ToolFormModal tool={selectedTool} tools={tools} onClose={() => { setIsToolModalOpen(false); setSelectedTool(null); }} onSave={(t: Tool, qty: number) => { if(selectedTool) updateTool(selectedTool.id, t); else addTool(t); setIsToolModalOpen(false); }} />}
      {isDebugModalOpen && settings.debugModeEnabled && <DebugModal logs={debugLogs} onClose={() => setIsDebugModalOpen(false)} />}
    </div>
  );
};

// Sub-modals adapted for Dark Mode
const CheckoutModal = ({ onClose, tools, technicians, onCheckout }: any) => {
    const [techId, setTechId] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
    const available = tools.filter((t:Tool) => t.status === 'AVAILABLE' && !selectedTools.find(st => st.id === t.id));
    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center"><h3 className="text-white font-bold">Registrar Entrega</h3><button onClick={onClose}><Icons.X className="text-white"/></button></div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="label-xs">Técnico</label><select className="input-std" value={techId} onChange={e => setTechId(e.target.value)}><option value="">- Seleccione -</option>{technicians.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                        <div><label className="label-xs">Fecha</label><input type="date" className="input-std" value={date} onChange={e => setDate(e.target.value)}/></div>
                    </div>
                    <div className="flex gap-4 h-64">
                        <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50">{available.map((t:Tool) => <div key={t.id} onClick={() => setSelectedTools([...selectedTools, t])} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer text-sm dark:text-slate-200">{t.name} <span className="text-xs text-slate-400">{t.code}</span></div>)}</div>
                        <div className="flex-1 border border-blue-200 dark:border-blue-800 rounded overflow-y-auto p-2 bg-blue-50/50 dark:bg-blue-900/20">{selectedTools.map((t:Tool) => <div key={t.id} onClick={() => setSelectedTools(selectedTools.filter(st => st.id !== t.id))} className="p-2 hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer text-sm dark:text-slate-200">{t.name}</div>)}</div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50"><button onClick={onClose} className="btn-secondary">Cancelar</button><button onClick={() => { selectedTools.forEach(t => onCheckout({ id: `LN-${Date.now()}`, toolId: t.id, toolName: t.name, technicianId: techId, technicianName: technicians.find((tech:any) => tech.id === techId)?.name, loanDate: date, status: 'ACTIVE' })); onClose(); }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold">Confirmar</button></div>
            </div>
        </div>
    );
};

const CheckinModal = ({ loan, onClose, onCheckin }: any) => {
    const [status, setStatus] = useState<ToolStatus>('AVAILABLE');
    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-green-600 px-6 py-4 flex justify-between items-center"><h3 className="text-white font-bold">Devolución</h3><button onClick={onClose}><Icons.X className="text-white"/></button></div>
                <div className="p-6 space-y-4">
                    <p className="font-bold text-slate-800 dark:text-white">{loan.toolName}</p>
                    <div><label className="label-xs">Estado</label><select className="input-std" value={status} onChange={e => setStatus(e.target.value as any)}><option value="AVAILABLE">Bueno</option><option value="BROKEN">Dañado</option></select></div>
                    <button onClick={() => { onCheckin(loan.id, status==='AVAILABLE'?'Conforme':'Dañado', status); onClose(); }} className="w-full bg-green-600 text-white py-2 rounded font-bold">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const ToolFormModal = ({ tool, onClose, onSave }: any) => {
    const [data, setData] = useState<Partial<Tool>>(tool || { code: '', name: '', category: 'POWER_TOOLS', status: 'AVAILABLE' });
    return (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="bg-slate-800 dark:bg-slate-950 px-6 py-4 flex justify-between items-center"><h3 className="text-white font-bold">{tool ? 'Editar' : 'Nueva'} Herramienta</h3><button onClick={onClose}><Icons.X className="text-white"/></button></div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4"><div><label className="label-xs">Código</label><input type="text" className="input-std" value={data.code} onChange={e => setData({...data, code: e.target.value})}/></div><div><label className="label-xs">Categoría</label><select className="input-std" value={data.category} onChange={e => setData({...data, category: e.target.value as any})}><option value="POWER_TOOLS">Eléctrica</option><option value="HAND_TOOLS">Manual</option></select></div></div>
                    <div><label className="label-xs">Nombre</label><input type="text" className="input-std" value={data.name} onChange={e => setData({...data, name: e.target.value})}/></div>
                    <button onClick={() => onSave(data)} className="w-full bg-blue-600 text-white py-2 rounded font-bold">Guardar</button>
                </div>
            </div>
        </div>
    );
};

const DebugModal = ({ logs, onClose }: any) => (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 font-mono text-xs">
        <div className="bg-slate-900 w-full max-w-3xl h-[80vh] rounded border border-slate-700 flex flex-col">
            <div className="flex justify-between p-3 bg-slate-800"><h3 className="text-green-400">Debug Console</h3><button onClick={onClose} className="text-white"><Icons.X size={16}/></button></div>
            <div className="flex-1 overflow-y-auto p-4 text-slate-300">{logs.map((l:any, i:number) => <div key={i} className="mb-1 border-b border-slate-800 pb-1">[{formatDateTime(l.timestamp)}] {l.message}</div>)}</div>
        </div>
    </div>
);