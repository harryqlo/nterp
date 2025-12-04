
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Icons } from './Icons';
import { WorkOrder, Status, Area, Priority } from '../types';
import { isNotEmpty } from '../utils/validationUtils';

interface Props {
  onClose: () => void;
}

export const CreateWorkOrderModal: React.FC<Props> = ({ onClose }) => {
  const { addWorkOrder, technicians } = useApp();
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<Partial<WorkOrder>>({
    id: '', title: '', identification: '', clientId: '', clientGuide: '', clientOC: '',
    area: Area.MECHANICS, priority: Priority.MEDIUM, technicianId: '',
    creationDate: new Date().toISOString().split('T')[0], estimatedCompletionDate: '',
    description: '', isBudgetApproved: true, quoteNumber: ''
  });

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({ ...prev, estimatedCompletionDate: tomorrow.toISOString().split('T')[0] }));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isNotEmpty(formData.id)) newErrors.id = 'El número de OT es obligatorio.';
    if (!isNotEmpty(formData.title)) newErrors.title = 'El título es obligatorio.';
    if (!isNotEmpty(formData.clientId)) newErrors.clientId = 'El cliente es obligatorio.';
    if (!isNotEmpty(formData.creationDate)) newErrors.creationDate = 'Fecha de ingreso requerida.';
    if (!isNotEmpty(formData.estimatedCompletionDate)) newErrors.estimatedCompletionDate = 'Fecha de entrega requerida.';
    
    if (formData.creationDate && formData.estimatedCompletionDate) {
        if (new Date(formData.estimatedCompletionDate) < new Date(formData.creationDate)) {
            newErrors.estimatedCompletionDate = 'La entrega no puede ser anterior al ingreso.';
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    if (!window.confirm(`¿Confirmar creación de OT ${formData.id}?`)) return;

    const newOT: WorkOrder = {
      id: formData.id!, 
      title: formData.title!, 
      identification: formData.identification,
      clientId: formData.clientId!, 
      clientGuide: formData.clientGuide, 
      clientOC: formData.clientOC,
      isBudgetApproved: formData.isBudgetApproved!, 
      quoteNumber: formData.quoteNumber,
      status: Status.PENDING, 
      area: formData.area as Area, 
      priority: formData.priority as Priority,
      technicianId: formData.technicianId || undefined, 
      assignedOperators: [], materials: [], labor: [], services: [], tasks: [], comments: [],
      description: formData.description || formData.title!,
      creationDate: new Date(formData.creationDate!).toISOString(),
      estimatedCompletionDate: new Date(formData.estimatedCompletionDate!).toISOString(),
    };
    addWorkOrder(newOT);
    onClose();
  };

  const handleInputChange = (field: keyof WorkOrder, value: any) => {
      setFormData({ ...formData, [field]: value });
      // Clear error when user types
      if (errors[field]) {
          setErrors(prev => {
              const newErr = { ...prev };
              delete newErr[field];
              return newErr;
          });
      }
  };

  const InputError = ({ field }: { field: string }) => {
      if (!errors[field]) return null;
      return <span className="text-xs text-red-500 font-medium mt-1 block animate-in slide-in-from-top-1">{errors[field]}</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        <div className="bg-slate-800 dark:bg-slate-950 px-6 py-4 flex justify-between items-center shrink-0">
          <div><h3 className="text-white font-bold flex items-center gap-2 text-lg"><Icons.Plus size={20} className="text-blue-400"/> Ingreso OT</h3><p className="text-slate-400 text-xs mt-0.5">Complete los datos obligatorios (*).</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><Icons.X size={24}/></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                 <label className="label-xs text-blue-700 dark:text-blue-400">Número OT *</label>
                 <input type="text" className={`input-std font-mono font-bold ${errors.id ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}`} placeholder="Ej: 8987" value={formData.id} onChange={e => handleInputChange('id', e.target.value)} autoFocus />
                 <InputError field="id" />
             </div>
             <div>
                 <label className="label-xs">Ingreso *</label>
                 <input type="date" className={`input-std ${errors.creationDate ? 'border-red-500' : ''}`} value={formData.creationDate} onChange={e => handleInputChange('creationDate', e.target.value)} />
                 <InputError field="creationDate" />
             </div>
             <div>
                 <label className="label-xs">Entrega Est. *</label>
                 <input type="date" className={`input-std ${errors.estimatedCompletionDate ? 'border-red-500' : ''}`} value={formData.estimatedCompletionDate} onChange={e => handleInputChange('estimatedCompletionDate', e.target.value)} />
                 <InputError field="estimatedCompletionDate" />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
             <div className="md:col-span-3">
                 <label className="label-xs">Cliente *</label>
                 <input type="text" className={`input-std ${errors.clientId ? 'border-red-500' : ''}`} placeholder="Nombre Cliente" value={formData.clientId} onChange={e => handleInputChange('clientId', e.target.value)} />
                 <InputError field="clientId" />
             </div>
             <div><label className="label-xs">Guía Despacho</label><input type="text" className="input-std" placeholder="Nº Guía" value={formData.clientGuide} onChange={e => setFormData({...formData, clientGuide: e.target.value})} /></div>
             <div><label className="label-xs">OC / Factura</label><input type="text" className="input-std" placeholder="Nº OC" value={formData.clientOC} onChange={e => setFormData({...formData, clientOC: e.target.value})} /></div>
             <div><label className="label-xs">Prioridad</label><select className="input-std" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as Priority})}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Urgente">Urgente</option></select></div>
          </div>

          <div className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="label-xs">Identificación</label><input type="text" className="input-std" placeholder="Tag/Serie" value={formData.identification} onChange={e => setFormData({...formData, identification: e.target.value})} /></div>
                <div className="md:col-span-2">
                    <label className="label-xs">Título *</label>
                    <input type="text" className={`input-std ${errors.title ? 'border-red-500' : ''}`} placeholder="Descripción Corta" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} />
                    <InputError field="title" />
                </div>
             </div>
             <div><label className="label-xs">Área</label><select className="input-std w-1/3" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value as Area})}>{Object.values(Area).map(a => <option key={a} value={a}>{a}</option>)}</select></div>
             <div><label className="label-xs">Detalle Trabajo</label><textarea className="input-std h-24 resize-none" placeholder="Descripción detallada..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
          </div>

           <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
             <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Icons.Receipt size={14}/> Comercial</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="label-xs mb-2 block">Presupuesto</label>
                    <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700"><input type="radio" name="budget" checked={formData.isBudgetApproved === true} onChange={() => setFormData({...formData, isBudgetApproved: true})}/><span className="text-sm font-bold text-slate-700 dark:text-slate-300">Aprobado</span></label>
                        <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700"><input type="radio" name="budget" checked={formData.isBudgetApproved === false} onChange={() => setFormData({...formData, isBudgetApproved: false})}/><span className="text-sm font-bold text-slate-700 dark:text-slate-300">Pendiente</span></label>
                    </div>
                 </div>
                 <div><label className="label-xs">Cotización (Op)</label><input type="text" className="input-std font-mono" value={formData.quoteNumber} onChange={e => setFormData({...formData, quoteNumber: e.target.value})} /></div>
             </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
             <label className="label-xs">Técnico Principal</label>
             <select className="input-std" value={formData.technicianId} onChange={e => setFormData({...formData, technicianId: e.target.value})}><option value="">-- Sin Asignar --</option>{technicians.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </div>
        </form>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 shadow-lg">Guardar OT</button>
        </div>
      </div>
    </div>
  );
};
