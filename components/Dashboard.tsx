
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Status, Area, ToolStatus } from '../types';
import { Icons } from './Icons';
import { getDeadlineStatus, formatDateTime } from '../utils/dateUtils';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { workOrders, inventory, tools, toolLoans } = useApp();

  if (!user) return null;

  // --- DASHBOARD TÉCNICO ---
  if (user.role === 'TECHNICIAN') {
    const myOTs = workOrders.filter(ot => ot.technicianId === user.id);
    const myPending = myOTs.filter(ot => ot.status === Status.PENDING || ot.status === Status.IN_PROCESS);
    const myLoans = toolLoans.filter(l => l.technicianId === user.id && l.status === 'ACTIVE');
    
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
             <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Hola, {user.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Panel de Técnico • Resumen de actividades</p>
             </div>
             <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-orange-200 dark:shadow-none">
                Área Técnica
             </div>
        </div>

        {/* Technician KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow flex items-center space-x-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 z-10">
                    <Icons.Orders size={24} />
                </div>
                <div className="z-10">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tareas Activas</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{myPending.length}</h3>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow flex items-center space-x-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 z-10">
                    <Icons.Tool size={24} />
                </div>
                <div className="z-10">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Herramientas</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{myLoans.length}</h3>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow flex items-center space-x-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 z-10">
                    <Icons.CheckCircle size={24} />
                </div>
                <div className="z-10">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completadas</p>
                    <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{myOTs.filter(ot => ot.status === Status.FINISHED).length}</h3>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Pending Tasks List */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Mis Órdenes Asignadas</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="p-3 pl-5 font-bold">OT</th>
                                <th className="p-3 font-bold">Título / Cliente</th>
                                <th className="p-3 font-bold text-center">Prioridad</th>
                                <th className="p-3 font-bold text-center">Vencimiento</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {myPending.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No tienes tareas pendientes. ¡Buen trabajo!</td></tr>
                            ) : myPending.map(ot => {
                                const deadline = getDeadlineStatus(ot.estimatedCompletionDate, ot.status);
                                return (
                                    <tr key={ot.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="p-3 pl-5 font-mono font-bold text-blue-600 dark:text-blue-400">{ot.id}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{ot.title}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{ot.clientId}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                             <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                 ot.priority === 'Urgente' 
                                                 ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900' 
                                                 : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700'
                                             }`}>{ot.priority}</span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${deadline.color}`}>
                                                {deadline.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* My Tools List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">Mis Herramientas (Pañol)</h3>
                </div>
                <div className="p-0">
                    {myLoans.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No tienes herramientas retiradas.</div>
                    ) : (
                        <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                            {myLoans.map(loan => (
                                <li key={loan.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{loan.toolName}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1"><Icons.Clock size={10}/> {formatDateTime(loan.loanDate)}</p>
                                    </div>
                                    <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] px-2.5 py-1 rounded-full font-bold border border-blue-100 dark:border-blue-800 shadow-sm">En Uso</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD DEFAULT (ADMIN / MANAGER / WAREHOUSE) ---
  // (Combining logic for simpler rendering, checking role for specific widgets)

  const totalOTs = workOrders.length;
  const inProcessOTs = workOrders.filter(ot => ot.status === Status.IN_PROCESS).length;
  const finishedOTs = workOrders.filter(ot => ot.status === Status.FINISHED).length;
  const lowStockItems = inventory.filter(i => i.stock <= i.minStock).length;
  
  // Warehouse Specific
  const activeLoansCount = toolLoans.filter(l => l.status === 'ACTIVE').length;
  const maintenanceToolsCount = tools.filter(t => t.status === 'MAINTENANCE').length;

  const statusData = Object.values(Status).map(status => ({
    name: status,
    count: workOrders.filter(ot => ot.status === status).length
  }));

  const areaData = Object.values(Area).map(area => ({
    name: area,
    value: workOrders.filter(ot => ot.area === area).length
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

  const KPICard = ({ title, value, icon: Icon, colorClass, gradientFrom, gradientTo }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center space-x-4 relative overflow-hidden hover:shadow-md transition-all duration-300 group">
      {/* Background Decoration */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
      
      <div className={`p-4 rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-lg shadow-${colorClass}-100 dark:shadow-none relative z-10`}>
        <Icon size={24} />
      </div>
      <div className="relative z-10">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {user.role === 'WAREHOUSE' ? 'Panel de Logística' : 'Panel de Control'}
             </h2>
             <p className="text-sm text-slate-500 dark:text-slate-400">
                {user.role === 'WAREHOUSE' ? 'Gestión de Inventario y Pañol' : 'Visión global operativa'}
             </p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg 
              ${user.role === 'ADMIN' ? 'bg-gradient-to-r from-purple-500 to-purple-700 shadow-purple-200 dark:shadow-none' : 
                user.role === 'WAREHOUSE' ? 'bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-emerald-200 dark:shadow-none' : 
                'bg-gradient-to-r from-blue-500 to-blue-700 shadow-blue-200 dark:shadow-none'}`}>
             {user.role === 'ADMIN' ? 'Administración' : user.role === 'WAREHOUSE' ? 'Bodega Central' : 'Gerencia'}
          </div>
      </div>
      
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {user.role === 'WAREHOUSE' ? (
            <>
                <KPICard title="Stock Crítico" value={lowStockItems} icon={Icons.Alert} colorClass="red" gradientFrom="from-red-500" gradientTo="to-red-600" />
                <KPICard title="Préstamos Activos" value={activeLoansCount} icon={Icons.Checklist} colorClass="blue" gradientFrom="from-blue-500" gradientTo="to-blue-600" />
                <KPICard title="En Mantención" value={maintenanceToolsCount} icon={Icons.LifeCycle} colorClass="orange" gradientFrom="from-orange-500" gradientTo="to-orange-600" />
                <KPICard title="Valor Inventario" value={"$8.5M"} icon={Icons.ShoppingBag} colorClass="emerald" gradientFrom="from-emerald-500" gradientTo="to-emerald-600" />
            </>
        ) : (
            <>
                <KPICard title="Total OTs" value={totalOTs} icon={Icons.Orders} colorClass="blue" gradientFrom="from-blue-500" gradientTo="to-blue-600" />
                <KPICard title="En Proceso" value={inProcessOTs} icon={Icons.Clock} colorClass="yellow" gradientFrom="from-yellow-400" gradientTo="to-yellow-600" />
                <KPICard title="Finalizadas" value={finishedOTs} icon={Icons.Check} colorClass="green" gradientFrom="from-green-500" gradientTo="to-green-600" />
                <KPICard title="Stock Bajo" value={lowStockItems} icon={Icons.Alert} colorClass="red" gradientFrom="from-red-500" gradientTo="to-red-600" />
            </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
              <Icons.FileBarChart className="text-blue-500" size={20}/> 
              Estado de Órdenes
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2">
              <Icons.Dashboard className="text-purple-500" size={20}/>
              Distribución por Área
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={areaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {areaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
