import React, { useState, useEffect, useRef } from 'react';
import { WorkOrder, Status, Comment, WorkOrderTask, LaborEntry, ServiceEntry } from '../types';
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
  const { updateWorkOrder, technicians, settings, addDebugLog, users } = useApp();
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

  const [photos, setPhotos] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableTechnicians = users.filter(u => u.role === 'TECHNICIAN' && u.active);
  const isSupervisor = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    if (activeTab === 'PHOTOS' && photos.length === 0) {
      setIsLoadingPhotos(true);
      setPhotoError(null);
      if (!settings.photoServerUrl) { setPhotoError('URL del servidor de fotos no configurada.'); setIsLoadingPhotos(false); return; }
      fetch(settings.photoServerUrl)
        .then(async (res) => {
          if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          let loadedPhotos: string[] = [];
          if (Array.isArray(data)) {
            loadedPhotos = data.map((item: any) => {
              if (typeof item === 'string') return item;
              return item.download_url || item.url || item.src || '';
            }).filter(url => url && typeof url === 'string' && url.length > 0);
          }
          const shuffled = loadedPhotos.sort(() => 0.5 - Math.random());
          setPhotos(shuffled.slice(0, 6)); 
        })
        .catch((err) => {
          console.error("Error cargando fotos:", err);
          addDebugLog('ERROR', 'Failed to load remote gallery', { error: err.message });
          setPhotoError('No se pudo cargar la galería remota.');
        })
        .finally(() => {
          setIsLoadingPhotos(false);
        });
    }
  }, [activeTab, settings.photoServerUrl, ot.id, photos.length, addDebugLog]);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const readPromises = fileList.map((file: File) => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target?.result as string); reader.readAsDataURL(file); }));
    try { 
      const resolvedPhotos = await Promise.all(readPromises);
      setPendingPhotos(prev => [...prev, ...resolvedPhotos]); 
    } catch (error) { console.error("Error reading files", error); }
    event.target.value = '';
  };

  const removePendingPhoto = (index: number) => setPendingPhotos(prev => prev.filter((_, i) => i !== index));
  const confirmUpload = () => { setPhotos(prev => [...prev, ...pendingPhotos]); setPendingPhotos([]); };
  const getTechnicianName = (id?: string) => { if (!id) return null; const userTech = users.find(u => u.id === id); if (userTech) return userTech.name; const tech = technicians.find(t => t.id === id); return tech ? tech.name : id; };
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => { const target = e.currentTarget; if (target.src.includes('text=Imagen+no+disponible')) return; target.src = 'https://placehold.co/400x300?text=Imagen+no+disponible'; target.className = 'w-full h-full object-cover opacity-50 grayscale p-8 bg-slate-100 dark:bg-slate-800'; };

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
          estimatedCompletionDate: ot.estimatedCompletionDate.split('T')[0], quoteNumber: ot.quoteNumber
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
          <input type={type} className={`input-std py-1 ${editErrors[field] ? 'border-red-500' : ''}`} value={value || ''} onChange={onChange} />
          {editErrors[field] && <span className="text-xs text-red-500">{editErrors[field]}</span>}
      </>
  );

  return (
    <>
    {/* --- PRINT ONLY LAYOUT --- */}
    <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 font-sans text-black">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold uppercase tracking-wide">Orden de Trabajo</h1>
                <p className="text-lg text-slate-600 font-bold">{settings.companyName}</p>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-mono font-bold">{ot.id}</h2>
                <p className="text-sm text-slate-500">Fecha Ingreso: {formatDate(ot.creationDate)}</p>
                <div className="mt-2 border border-slate-800 px-2 py-1 text-center font-bold">{ot.area}</div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-6">
            <div className="space-y-2">
                <div className="flex border-b border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs">Cliente:</span> <span>{ot.clientId}</span></div>
                <div className="flex border-b border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs">Identificación:</span> <span>{ot.identification || 'N/A'}</span></div>
                <div className="flex border-b border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs">Orden Compra:</span> <span>{ot.clientOC || 'N/A'}</span></div>
            </div>
            <div className="space-y-2">
                <div className="flex border-b border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs">Entrega Est.:</span> <span>{formatDate(ot.estimatedCompletionDate)}</span></div>
                <div className="flex border-b border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs">Prioridad:</span> <span>{ot.priority}</span></div>
                <div className="flex border-b border-slate-300 pb-1"><span className="w-32 font-bold uppercase text-xs">Técnico:</span> <span>{getTechnicianName(ot.technicianId) || 'Pendiente'}</span></div>
            </div>
        </div>

        <div className="mb-8 p-4 border border-slate-300 rounded bg-slate-50">
            <h3 className="font-bold uppercase text-xs mb-2 text-slate-500">Descripción del Trabajo</h3>
            <p className="whitespace-pre-wrap text-sm">{ot.description}</p>
        </div>

        <div className="mb-8">
             <h3 className="font-bold uppercase text-sm border-b-2 border-slate-800 mb-2">Planificación de Tareas</h3>
             <ul className="space-y-2">
                 {(ot.tasks || []).length > 0 ? (ot.tasks || []).map((t, i) => (
                     <li key={i} className="flex items-start gap-2">
                         <div className="w-4 h-4 border border-slate-400 mt-0.5"></div>
                         <span className="text-sm">{t.description}</span>
                     </li>
                 )) : <li className="text-sm italic text-slate-500">Sin tareas definidas.</li>}
             </ul>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-20 pt-10 border-t border-slate-200">
             <div className="text-center">
                 <div className="border-b border-black mb-2 mx-10"></div>
                 <p className="text-xs uppercase font-bold">Firma Técnico Responsable</p>
             </div>
             <div className="text-center">
                 <div className="border-b border-black mb-2 mx-10"></div>
                 <p className="text-xs uppercase font-bold">VºBº Supervisor / Control Calidad</p>
             </div>
        </div>
        
        <div className="fixed bottom-4 left-0 w-full text-center text-xs text-slate-400">
            Generado por Sistema North Chrome | {new Date().toLocaleString()}
        </div>
    </div>

    {/* --- NORMAL MODAL LAYOUT --- */}
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div className="flex-1">
            {isEditing ? (
                <div className="flex gap-2 flex-col">
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
                  <Icons.Download size={16} /> Imprimir
              </button>
              {isSupervisor && !isEditing && ot.status !== Status.FINISHED && (
                  <button onClick={startEditing} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full transition-colors"><Icons.Edit size={20} /></button>
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
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${ot.status === Status.FINISHED ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>{ot.status}</span>
                    </div>
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
                         {isEditing ? <textarea className="input-std h-20" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}/> : <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">{ot.description}</p>}
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
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-center border-dashed border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Icons.Upload size={24} />
                  </div>
                  <p className="font-bold text-slate-700 dark:text-slate-200">Subir Evidencia Fotográfica</p>
                  <p className="text-sm text-slate-400">Click para seleccionar imágenes</p>
               </div>

               {pendingPhotos.length > 0 && (
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                       <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-3 text-sm">Imágenes por subir ({pendingPhotos.length})</h4>
                       <div className="flex gap-3 overflow-x-auto pb-2">
                           {pendingPhotos.map((src, idx) => (
                               <div key={idx} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden group">
                                   <img src={src} alt="preview" className="w-full h-full object-cover" />
                                   <button onClick={() => removePendingPhoto(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Icons.X size={12}/></button>
                               </div>
                           ))}
                       </div>
                       <div className="mt-3 flex justify-end">
                           <button onClick={confirmUpload} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-blue-700 shadow-sm">Confirmar Carga</button>
                       </div>
                   </div>
               )}

               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {isLoadingPhotos ? (
                     [1,2,3].map(i => <div key={i} className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"></div>)
                  ) : photoError ? (
                     <div className="col-span-full text-center py-10 text-slate-400 dark:text-slate-500">
                        <Icons.Alert size={32} className="mx-auto mb-2 opacity-50"/>
                        <p>{photoError}</p>
                     </div>
                  ) : photos.length === 0 ? (
                     <div className="col-span-full text-center py-10 text-slate-400 dark:text-slate-500">Sin imágenes en la galería.</div>
                  ) : (
                      photos.map((url, idx) => (
                          <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative group shadow-sm hover:shadow-md transition-all">
                              <img src={url} alt={`Evidencia ${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={handleImageError} loading="lazy" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40 backdrop-blur-sm"><Icons.Search size={20}/></button>
                                  <button className="p-2 bg-white/20 text-white rounded-full hover:bg-red-500/80 backdrop-blur-sm"><Icons.Trash size={20}/></button>
                              </div>
                          </div>
                      ))
                  )}
               </div>
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