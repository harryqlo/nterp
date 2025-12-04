
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { User, Role } from '../types';
import { Icons } from './Icons';
import { getRoleLabel } from '../utils/roleUtils';
import { isValidEmail, isNotEmpty } from '../utils/validationUtils';
import { useToast } from '../context/ToastContext';

export const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, deleteUser } = useApp();
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
  const [formData, setFormData] = useState<Partial<User>>({ name: '', email: '', role: 'TECHNICIAN', password: '', active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenModal = (user?: User) => {
    setErrors({});
    if (user) { setEditingUser(user); setFormData({ ...user }); } 
    else { setEditingUser(null); setFormData({ name: '', email: '', role: 'TECHNICIAN', password: '', active: true }); }
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!isNotEmpty(formData.name)) newErrors.name = 'Nombre requerido.';
      
      if (!isNotEmpty(formData.email)) {
          newErrors.email = 'Email requerido.';
      } else if (!isValidEmail(formData.email!)) {
          newErrors.email = 'Formato de email inválido.';
      } else {
          // Check duplicate email only if creating new user or changing email
          const existing = users.find(u => u.email.toLowerCase() === formData.email!.toLowerCase());
          if (existing && (!editingUser || existing.id !== editingUser.id)) {
              newErrors.email = 'Este correo ya está registrado.';
          }
      }

      // Password required for new users, optional for edits
      if (!editingUser && !isNotEmpty(formData.password)) {
          newErrors.password = 'Contraseña requerida para nuevos usuarios.';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
        addToast("Corrija los errores del formulario.", "ERROR");
        return;
    }

    if (editingUser) {
        updateUser(editingUser.id, formData);
        addToast("Usuario actualizado correctamente.", "SUCCESS");
    } else {
        addUser({ ...formData as User, id: `U${Date.now()}` });
        addToast("Usuario creado correctamente.", "SUCCESS");
    }
    setIsModalOpen(false);
  };

  const handleSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key]; const bValue = b[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const SortIcon = ({ columnKey }: { columnKey: keyof User }) => {
    if (sortConfig?.key !== columnKey) return <Icons.More className="text-slate-300 opacity-0 group-hover:opacity-50 transition-opacity ml-1" size={14} />;
    return sortConfig.direction === 'asc' ? <Icons.Up className="text-blue-600 ml-1" size={14} /> : <Icons.Down className="text-blue-600 ml-1" size={14} />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión de Usuarios</h2><p className="text-sm text-slate-500 dark:text-slate-400">Administre el acceso del personal.</p></div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow hover:bg-blue-700 transition-all"><Icons.Plus size={18} /><span>Nuevo Usuario</span></button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group" onClick={() => handleSort('name')}><div className="flex items-center">Usuario <SortIcon columnKey="name" /></div></th>
              <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group" onClick={() => handleSort('role')}><div className="flex items-center">Rol <SortIcon columnKey="role" /></div></th>
              <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group" onClick={() => handleSort('email')}><div className="flex items-center">Correo <SortIcon columnKey="email" /></div></th>
              <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group" onClick={() => handleSort('active')}><div className="flex items-center">Estado <SortIcon columnKey="active" /></div></th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedUsers.map(u => (
              <tr key={u.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors duration-200 group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-slate-700 group-hover:ring-blue-100 transition-all ${u.role === 'ADMIN' ? 'bg-purple-500' : u.role === 'MANAGER' ? 'bg-blue-500' : u.role === 'TECHNICIAN' ? 'bg-orange-500' : 'bg-green-500'}`}>{u.name.charAt(0)}</div>
                    <div><span className="font-bold text-slate-800 dark:text-white block">{u.name}</span><span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">ID: {u.id}</span></div>
                  </div>
                </td>
                <td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${u.role === 'ADMIN' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800' : u.role === 'MANAGER' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800' : u.role === 'TECHNICIAN' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-800'}`}>{getRoleLabel(u.role)}</span></td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400 font-medium">{u.email}</td>
                <td className="p-4">{u.active ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Activo</span> : <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full border border-red-100 dark:border-red-800"><span className="w-2 h-2 rounded-full bg-red-500"></span> Inactivo</span>}</td>
                <td className="p-4 text-right"><div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenModal(u)} className="text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors"><Icons.Edit size={16} /></button>{u.role !== 'ADMIN' && <button onClick={() => { if(confirm('¿Eliminar?')) deleteUser(u.id); }} className="text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 p-2 rounded-lg"><Icons.Trash size={16} /></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => setIsModalOpen(false)}><Icons.X size={20} className="text-slate-400 hover:text-white"/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                   <label className="label-xs">Nombre</label>
                   <input type="text" className={`input-std ${errors.name ? 'border-red-500' : ''}`} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}/>
                   {errors.name && <span className="text-xs text-red-500 font-medium">{errors.name}</span>}
               </div>
               <div>
                   <label className="label-xs">Correo</label>
                   <input type="email" className={`input-std ${errors.email ? 'border-red-500' : ''}`} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}/>
                   {errors.email && <span className="text-xs text-red-500 font-medium">{errors.email}</span>}
               </div>
               <div>
                   <label className="label-xs">Contraseña</label>
                   <input type="text" placeholder={editingUser ? "Vacío para mantener" : "Requerido"} className={`input-std font-mono ${errors.password ? 'border-red-500' : ''}`} value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})}/>
                   {errors.password && <span className="text-xs text-red-500 font-medium">{errors.password}</span>}
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div><label className="label-xs">Rol</label><select className="input-std" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as Role})}><option value="ADMIN">Admin</option><option value="MANAGER">Jefe Planta</option><option value="TECHNICIAN">Técnico</option><option value="WAREHOUSE">Bodega</option></select></div>
                   <div><label className="label-xs">Estado</label><select className="input-std" value={formData.active ? "active" : "inactive"} onChange={(e) => setFormData({...formData, active: e.target.value === "active"})}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div>
               </div>
               <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                   <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg">Guardar</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
