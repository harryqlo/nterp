
import React, { useState } from 'react';
import { WorkOrder, Status, Comment, WorkOrderTask, LaborEntry, ServiceEntry, Priority, Area } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Icons } from './Icons';
import { formatDateTime, formatDate } from '../utils/dateUtils';
import { isNotEmpty } from '../utils/validationUtils';
import { useToast } from '../context/ToastContext';

interface Props {
  ot: WorkOrder;
  onClose: () => void;
}

export const WorkOrderDetailModal: React.FC<Props> = ({ ot, onClose }) => {
  const { updateWorkOrder, technicians, settings, users } = useApp();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState<'INFO' | 'RESOURCES' | 'COMMENTS' | 'PHOTOS'>('INFO');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [laborForm, setLaborForm] = useState<{ techId: string, hours: number, desc: string }>({ techId: '', hours: 0, desc: '' });
  const [serviceForm, setServiceForm] = useState<{ provider: string, desc: string, cost: number, ref: string }>({ provider: '', desc: '', cost: 0, ref: '' });

  const availableTechnicians = users.filter(u => u.role === 'TECHNICIAN' && u.active);
  const isSupervisor = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = { id: Date.now().toString(), userId: user?.id || 'u1', userName: user?.name || 'Admin', text: newComment, timestamp: new Date().toISOString() };
    updateWorkOrder(ot.id, { comments: [...ot.comments, comment] });
    setNewComment('');
  };

  const handleAddTask = () => {
      if (!newTaskText.trim()) return;
      const newTask: WorkOrderTask = { id: `tk-${Date.now()}`, description: newTaskText, isCompleted: false };
      updateWorkOrder(ot.id, { tasks: [...(ot.tasks || []), newTask] });
      setNewTaskText('');
  };

  const toggleTask = (taskId: string) => {
      const updatedTasks = (ot.tasks || []).map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted, completedBy: !t.isCompleted ? user?.id : undefined, completedAt: !t.isCompleted ? new Date().toISOString() : undefined } : t);
      updateWorkOrder(ot.id, { tasks: updatedTasks });
  };

  const handleAddLabor = () => {
      if(!laborForm.techId || laborForm.hours <= 0) return alert("Seleccione técnico y horas válidas.");
      const tech = technicians.find(t => t.id === laborForm.techId);
      const entry: LaborEntry = { id: `LB-${Date.now()}`, technicianId: laborForm.techId, technicianName: tech ? tech.name : 'Desconocido', hours: laborForm.hours, description: laborForm.desc || 'Trabajo General', date: new Date().toISOString() };
      updateWorkOrder(ot.id, { labor: [...(ot.labor || []), entry] });
      setLaborForm({ techId: '', hours: 0, desc: '' });
  };

  const handleAddService = () => {
      if(!serviceForm.provider || !serviceForm.desc || serviceForm.cost <= 0) return alert("Complete los datos del servicio.");
      const entry: ServiceEntry = { id: `SV-${Date.now()}`, provider: serviceForm.provider, description: serviceForm.desc, cost: serviceForm.cost, referenceDoc: serviceForm.ref, date: new Date().toISOString() };
      updateWorkOrder(ot.id, { services: [...(ot.services || []), entry] });
      setServiceForm({ provider: '', desc: '', cost: 0, ref: '' });
  };

  const getTechnicianName = (id?: string) => { if (!id) return null; const userTech = users.find(u => u.id === id); if (userTech) return userTech.name; const tech = technicians.find(t => t.id === id); return tech ? tech.name : id; };

  const handleStartOT = () => {
    if (!ot.isBudgetApproved) { alert('No se puede iniciar el trabajo. El presupuesto aún está PENDIENTE DE APROBACIÓN.'); return; }
    if (window.confirm('¿Confirmar inicio de trabajos?')) { updateWorkOrder(ot.id, { status: Status.IN_PROCESS, startDate: new Date().toISOString() }); }
  };
  const handleFinishOT = () => {
    const pendingTasks = (ot.tasks || []).filter(t => !t.isCompleted).length;
    if (pendingTasks > 0 && !window.confirm(`Aún quedan ${pendingTasks} tareas pendientes. ¿Desea finalizar la OT de todos modos?`)) return;
    const notes = window.prompt('Ingrese observaciones finales:', 'Trabajo terminado conforme.');
    if (notes !== null) { updateWorkOrder(ot.id, { status: Status.FINISHED, finishedDate: new Date().toISOString(), finalNotes: notes }); onClose(); }
  };
  const handleApproveBudget = () => { if(window.confirm(`¿Confirmar que el cliente ha aprobado el presupuesto?`)) { updateWorkOrder(ot.id, { isBudgetApproved: true }); } };

  const startEditing = () => {
      setEditForm({
          title: ot.title, clientId: ot.clientId, priority: ot.priority, area: ot.area, description: ot.description,
          identification: ot.identification, clientGuide: ot.clientGuide, clientOC: ot.clientOC,
          estimatedCompletionDate: ot.estimatedCompletionDate.split('T')[0], quoteNumber: ot.quoteNumber,
          technicianId: ot.technicianId, status: ot.status
      });
      setEditErrors({});
      setIsEditing(true);
  };

  const saveEditing = () => {
      // Validate Edit Form
      const errors: Record<string, string> = {};
      if (!isNotEmpty(editForm.title)) errors.title = "Título requerido";
      if (!isNotEmpty(editForm.clientId)) errors.clientId = "Cliente requerido";
      if (!isNotEmpty(editForm.estimatedCompletionDate)) errors.estimatedCompletionDate = "Fecha entrega requerida";
      
      if (Object.keys(errors).length > 0) {
          setEditErrors(errors);
          addToast("Complete los campos obligatorios", "ERROR");
          return;
      }

      if (window.confirm('¿Guardar cambios en la Orden de Trabajo?')) {
          let isoDate = ot.estimatedCompletionDate;
          if (editForm.estimatedCompletionDate && editForm.estimatedCompletionDate !== ot.estimatedCompletionDate.split('T')[0]) {
              isoDate = new Date(editForm.estimatedCompletionDate).toISOString();
          }
          updateWorkOrder(ot.id, { ...editForm, estimatedCompletionDate: isoDate });
          setIsEditing(false);
          addToast("Orden de Trabajo actualizada", "SUCCESS");
      }
  };

  const handlePrint = () => { 
      window.print();
  };

  const totalTasks = ot.tasks?.length || 0;
  const completedTasks = ot.tasks?.filter(t => t.isCompleted).length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalMatCost = ot.materials.reduce((acc, m) => acc + (m.totalCost || 0), 0);
  const totalLaborHours = (ot.labor || []).reduce((acc, l) => acc + l.hours, 0);
  const estimatedLaborCost = totalLaborHours * 15000; 
  const totalServiceCost = (ot.services || []).reduce((acc, s) => acc + s.cost, 0);
  const totalCost = totalMatCost + estimatedLaborCost + totalServiceCost;

  const EditInput = ({ field, value, onChange, type = "text" }: any) => (
      <>
          <input type={type} className={`input-std py-1 text-sm ${editErrors[field] ? 'border-red-500' : ''}`} value={value || ''} onChange={onChange} />
          {editErrors[field] && <span className="text-xs text-red-500">{editErrors[field]}</span>}
      </>
  );

  return (
    <>
    {/* --- PRINT ONLY LAYOUT --- */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-sans text-black">
        <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
                <h1 className="text-4xl font-extrabold uppercase tracking-wide">Orden de Trabajo</h1>
                <p className="text-lg text-slate-700 font-bold mt-1">{settings.companyName}</p>
                <div className="text-xs mt-2 text-slate-500">Documento Interno de Control de Producción</div>
            </div>
            <div className="text-right flex flex-col items-end">
                <div className="text-5xl font-mono font-bold tracking-tighter mb-2">{ot.id}</div>
                {/* CSS Barcode Simulation */}
                <div className="h-12 w-48 bg-[repeating-linear-gradient(90deg,black,black_2px,transparent_2px,transparent_4px)] mb-1"></div>
                <p className="text-[10px] font-mono">{ot.id}-{Date.now().toString().slice(-4)}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6 border border-slate-300 p-4">
            <div className="space-y-3">
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Cliente:</span> <span className="font-bold text-lg">{ot.clientId}</span></div>
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Identificación:</span> <span className="font-mono">{ot.identification || 'N/A'}</span></div>
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Orden Compra:</span> <span>{ot.clientOC || 'N/A'}</span></div>
            </div>
            <div className="space-y-3">
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Fecha Ingreso:</span> <span>{formatDate(ot.creationDate)}</span></div>
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Entrega Est.:</span> <span className="font-bold">{formatDate(ot.estimatedCompletionDate)}</span></div>
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Prioridad:</span> <span className="uppercase font-bold">{ot.priority}</span></div>
                <div className="flex border-b border-dashed border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs text-slate-600">Área:</span> <span className="uppercase font-bold">{ot.area}</span></div>
            </div>
        </div>

        <div className="mb-6">
            <h3 className="bg-slate-200 px-2 py-1 font-bold uppercase text-xs mb-2 border-l-4 border-slate-800">Descripción del Trabajo</h3>
            <div className="p-4 border border-slate-300 bg-slate-50 min-h-[100px]">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ot.description}</p>
            </div>
        </div>

        <div className="mb-8">
             <h3 className="bg-slate-200 px-2 py-1 font-bold uppercase text-xs mb-2 border-l-4 border-slate-800">Planificación de Tareas (Checklist)</h3>
             <ul className="border border-slate-300 divide-y divide-slate-200">
                 {(ot.tasks || []).length > 0 ? (ot.tasks || []).map((t, i) => (
                     <li key={i} className="flex items-center gap-4 p-2">
                         <div className="w-6 h-6 border-2 border-slate-400 rounded-sm"></div>
                         <span className="text-sm font-medium">{t.description}</span>
                     </li>
                 )) : (
                     <li className="p-4 text-center text-slate-400 italic">Espacio para tareas manuales...</li>
                 )}
                 {/* Empty lines for manual writing */}
                 {[1,2,3].map(i => <li key={`e-${i}`} className="h-10 border-b border-dashed border-slate-200"></li>)}
             </ul>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-auto pt-20">
             <div className="text-center">
                 <div className="border-b-2 border-slate-800 mb-2 mx-10"></div>
                 <p className="text-xs uppercase font-bold">Firma Técnico Responsable</p>
                 <p className="text-[10px] text-slate-500 mt-1">Declaro haber completado los trabajos según especificación.</p>
             </div>
             <div className="text-center">
                 <div className="border-b-2 border-slate-800 mb-2 mx-10"></div>
                 <p className="text-xs uppercase font-bold">VºBº Supervisor / Control Calidad</p>
                 <p className="text-[10px] text-slate-500 mt-1">Trabajo liberado para entrega.</p>
             </div>
        </div>
        
        <div className="fixed bottom-0 left-0 w-full text-center border-t border-slate-300 pt-2 pb-4">
            <p className="text-[10px] font-mono text-slate-400">Generado por Sistema North Chrome | {new Date().toLocaleString()} | ID: {ot.id}</p>
        </div>
    </div>

    {/* --- NORMAL MODAL LAYOUT (HIDDEN WHEN PRINTING) --- */}
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex-1">
            {isEditing ? (
                <div className="flex gap-2 flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase">Título de OT</label>
                    <input 
                        className={`text-xl font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-900 border rounded px-2 ${editErrors.title ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                        value={editForm.title}
                        onChange={e => setEditForm({...editForm, title: e.target.value})}
                    />
                    {editErrors.title && <span className="text-xs text-red-500">{editErrors.title}</span>}
                </div>
            ) : (
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">{ot.title}</h2>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-2">
                <span className="bg-slate-800 dark:bg-slate-700 text-white px-1.5 rounded">#{ot.id}</span> 
                {isEditing ? <EditInput field="clientId" value={editForm.clientId} onChange={(e:any) => setEditForm({...editForm, clientId: e.target.value})} /> : <span>{ot.clientId}</span>}
                {!isEditing && ot.identification && <span className="text-slate-400 px-1 border-l border-slate-300 dark:border-slate-600">Ref: {ot.identification}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-colors text-xs font-bold shadow-sm">
                  <Icons.Download size={16} /> Imprimir Hoja Ruta
              </button>
              {isSupervisor && !isEditing && (
                  <button onClick={startEditing} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full transition-colors" title="Editar OT"><Icons.Edit size={20} /></button>
              )}
              {isEditing && (
                  <div className="flex gap-1 mr-2">
                      <button onClick={() => setIsEditing(false)} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold">Cancelar</button>
                      <button onClick={saveEditing} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold">Guardar</button>
                  </div>
              )}
              <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"><Icons.X size={24} /></button>
          </div>
        </div>

        {!ot.isBudgetApproved && (
            <div className="bg-orange-500 text-white px-6 py-3 flex justify-between items-center shadow-inner shrink-0">
                <div className="flex items-center gap-2"><Icons.Alert size={20} /><span className="font-bold text-sm uppercase tracking-wide">Presupuesto Pendiente</span></div>
                {isSupervisor && <button onClick={handleApproveBudget} className="bg-white text-orange-600 px-4 py-1 rounded-full text-xs font-bold hover:bg-orange-50 transition-colors shadow-sm">Aprobar & Activar</button>}
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 shrink-0">
          {[{id: 'INFO', label: 'Planificación'}, {id: 'RESOURCES', label: 'Costos & Recursos'}, {id: 'COMMENTS', label: 'Bitácora'}, {id: 'PHOTOS', label: 'Evidencia'}].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{tab.label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950">
          {activeTab === 'INFO' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Información General</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Estado</span>
                        {isEditing ? (
                            <select className="input-std py-0 text-xs w-auto" value={editForm.status} onChange={(e) => setEditForm({...editForm, status: e.target.value as Status})}>
                                {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        ) : (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${ot.status === Status.FINISHED ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>{ot.status}</span>
                        )}
                    </div>
                    
                    {/* Campos adicionales editables */}
                    {isEditing && (
                        <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-50 dark:border-slate-800">
                             <div>
                                <span className="label-xs block">Prioridad</span>
                                <select className="input-std py-1 text-sm" value={editForm.priority} onChange={(e) => setEditForm({...editForm, priority: e.target.value as Priority})}>
                                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div>
                                <span className="label-xs block">Área</span>
                                <select className="input-std py-1 text-sm" value={editForm.area} onChange={(e) => setEditForm({...editForm, area: e.target.value as Area})}>
                                    {Object.values(Area).map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                             <div className="col-span-2">
                                <span className="label-xs block">Técnico Principal</span>
                                <select className="input-std py-1 text-sm" value={editForm.technicianId || ''} onChange={(e) => setEditForm({...editForm, technicianId: e.target.value})}>
                                    <option value="">-- Sin Asignar --</option>
                                    {availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="label-xs block">Identificación</span>
                            {isEditing ? <EditInput field="identification" value={editForm.identification} onChange={(e:any)=>setEditForm({...editForm, identification:e.target.value})} /> : <span className="text-sm font-mono dark:text-slate-300">{ot.identification || '-'}</span>}
                        </div>
                         <div>
                            <span className="label-xs block">Cotización</span>
                            {isEditing ? <EditInput field="quoteNumber" value={editForm.quoteNumber} onChange={(e:any)=>setEditForm({...editForm, quoteNumber:e.target.value})} /> : <span className="text-sm font-mono dark:text-slate-300">{ot.quoteNumber || '-'}</span>}
                        </div>
                    </div>
                    <div>
                         <span className="label-xs block">Descripción</span>
                         {isEditing ? <textarea className="input-std h-20 text-sm" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/> : <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">{ot.description}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-800">
                        <div>
                            <span className="block font-bold text-slate-400">Inicio</span>
                            {formatDateTime(ot.startDate)}
                        </div>
                        <div>
                            <span className="block font-bold text-slate-400">Entrega Estimada</span>
                            {isEditing ? <input type="date" className="input-std py-0 text-xs" value={editForm.estimatedCompletionDate} onChange={e => setEditForm({...editForm, estimatedCompletionDate: e.target.value})}/> : formatDateTime(ot.estimatedCompletionDate)}
                        </div>
                    </div>
                  </div>
                </div>
                
                {/* Documentos */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Documentos Referencia</h4>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Guía Cliente</span>
                            {isEditing ? <EditInput field="clientGuide" value={editForm.clientGuide} onChange={(e:any)=>setEditForm({...editForm, clientGuide:e.target.value})} /> : <span className="font-mono font-bold dark:text-slate-200">{ot.clientGuide || 'N/A'}</span>}
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">OC Cliente</span>
                            {isEditing ? <EditInput field="clientOC" value={editForm.clientOC} onChange={(e:any)=>setEditForm({...editForm, clientOC:e.target.value})} /> : <span className="font-mono font-bold dark:text-slate-200">{ot.clientOC || 'N/A'}</span>}
                        </div>
                    </div>
                </div>
              </div>

              {/* Task List */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan de Trabajo</h4>
                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{progressPercent}%</span>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-4 overflow-hidden">
                    <div className="bg-blue-600 h-full transition-all duration-500" style={{width: `${progressPercent}%`}}></div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {(ot.tasks || []).map(task => (
                        <div key={task.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors group">
                            <button onClick={() => toggleTask(task.id)} className={`mt-0.5 ${task.isCompleted ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-blue-500'}`}>
                                {task.isCompleted ? <Icons.CheckCircle size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-current"></div>}
                            </button>
                            <div className="flex-1">
                                <p className={`text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{task.description}</p>
                                {task.isCompleted && <p className="text-[10px] text-slate-400">Completado el {formatDateTime(task.completedAt)}</p>}
                            </div>
                        </div>
                    ))}
                    {(ot.tasks || []).length === 0 && <p className="text-center text-slate-400 text-sm py-4 italic">No hay tareas definidas.</p>}
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <input 
                        type="text" 
                        className="input-std text-sm"
                        placeholder="Nueva tarea..." 
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                    />
                    <button onClick={handleAddTask} className="bg-slate-800 dark:bg-slate-700 text-white p-2 rounded hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors"><Icons.Plus size={20}/></button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'RESOURCES' && (
            <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase">Materiales</p>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">${totalMatCost.toLocaleString()}</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase">Mano de Obra (Est.)</p>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">${estimatedLaborCost.toLocaleString()}</h3>
                        <p className="text-[10px] text-slate-400">{totalLaborHours} hrs registradas</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm">
                        <p className="text-xs font-bold text-blue-500 dark:text-blue-300 uppercase">Costo Total</p>
                        <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-200">${totalCost.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Materiales */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-200">Materiales Utilizados</div>
                        <div className="p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"><tr><th className="p-3">Item</th><th className="p-3 text-right">Cant</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {ot.materials.length === 0 ? (<tr><td colSpan={3} className="p-4 text-center text-slate-400 italic">Sin materiales cargados</td></tr>) : 
                                    ot.materials.map((m, i) => (
                                        <tr key={i}><td className="p-3 dark:text-slate-300">{m.name}</td><td className="p-3 text-right dark:text-slate-300">{m.quantity}</td><td className="p-3 text-right font-mono dark:text-slate-300">${(m.totalCost || 0).toLocaleString()}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mano de Obra Input */}
                    <div className="space-y-6">
                         <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-200">Registro HH</div>
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2">
                                    <select className="input-std text-sm flex-1" value={laborForm.techId} onChange={e => setLaborForm({...laborForm, techId: e.target.value})}>
                                        <option value="">- Técnico -</option>
                                        {availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <input type="number" className="input-std w-20 text-sm" placeholder="Hrs" value={laborForm.hours} onChange={e => setLaborForm({...laborForm, hours: parseFloat(e.target.value)})}/>
                                </div>
                                <input type="text" className="input-std text-sm" placeholder="Descripción tarea..." value={laborForm.desc} onChange={e => setLaborForm({...laborForm, desc: e.target.value})}/>
                                <button onClick={handleAddLabor} className="w-full bg-slate-800 dark:bg-slate-700 text-white py-2 rounded text-sm font-bold hover:bg-slate-900 dark:hover:bg-slate-600">Registrar Horas</button>

                                <ul className="mt-4 space-y-2">
                                    {(ot.labor || []).map(l => (
                                        <li key={l.id} className="text-xs flex justify-between border-b border-slate-50 dark:border-slate-800 pb-1">
                                            <span className="dark:text-slate-300"><b>{l.technicianName}</b>: {l.description}</span>
                                            <span className="font-mono font-bold dark:text-slate-200">{l.hours}h</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </div>

                         <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-700 dark:text-slate-200">Servicios Externos</div>
                            <div className="p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" className="input-std text-sm" placeholder="Proveedor" value={serviceForm.provider} onChange={e => setServiceForm({...serviceForm, provider: e.target.value})}/>
                                    <input type="number" className="input-std text-sm" placeholder="Costo" value={serviceForm.cost} onChange={e => setServiceForm({...serviceForm, cost: parseFloat(e.target.value)})}/>
                                </div>
                                <input type="text" className="input-std text-sm" placeholder="Descripción..." value={serviceForm.desc} onChange={e => setServiceForm({...serviceForm, desc: e.target.value})}/>
                                <button onClick={handleAddService} className="w-full bg-slate-800 dark:bg-slate-700 text-white py-2 rounded text-sm font-bold hover:bg-slate-900 dark:hover:bg-slate-600">Agregar Servicio</button>
                                
                                 <ul className="mt-4 space-y-2">
                                    {(ot.services || []).map(s => (
                                        <li key={s.id} className="text-xs flex justify-between border-b border-slate-50 dark:border-slate-800 pb-1">
                                            <span className="dark:text-slate-300"><b>{s.provider}</b>: {s.description}</span>
                                            <span className="font-mono font-bold dark:text-slate-200">${s.cost.toLocaleString()}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'COMMENTS' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4 mb-4 pr-2">
                {ot.comments.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 py-10">No hay comentarios registrados.</div>
                ) : (
                  ot.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 items-start animate-in slide-in-from-bottom-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
                        {comment.userName.charAt(0)}
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl shadow-sm border border-slate-100 dark:border-slate-800 max-w-[80%]">
                        <div className="flex justify-between items-center mb-1 gap-4">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{comment.userName}</span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-auto">
                <textarea
                  className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50 dark:bg-slate-800 dark:text-white"
                  placeholder="Escribir comentario..."
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <div className="flex justify-end mt-2">
                  <button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Enviar Comentario
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PHOTOS' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
               <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
                   <Icons.Upload size={32} className="text-slate-400 dark:text-slate-500"/>
               </div>
               <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">En Construcción</h3>
               <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                   Estamos trabajando en el servidor de evidencia multimedia. Esta funcionalidad estará disponible en la próxima actualización.
               </p>
               <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                   Próximamente
               </span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
           <div className="text-xs text-slate-400">
               Creada: {formatDateTime(ot.creationDate)}
           </div>
           <div className="flex gap-3">
                {ot.status === Status.PENDING && (
                   <button onClick={handleStartOT} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all">
                       Iniciar Trabajo
                   </button>
                )}
                {ot.status === Status.IN_PROCESS && (
                   <button onClick={handleFinishOT} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none transition-all">
                       Finalizar OT
                   </button>
                )}
                {ot.status === Status.FINISHED && (
                   <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-bold text-sm border border-green-200 dark:border-green-800 flex items-center gap-2">
                       <Icons.CheckCircle size={18} /> Trabajo Finalizado
                   </div>
                )}
           </div>
        </div>

      </div>
    </div>
    </>
  );
};
