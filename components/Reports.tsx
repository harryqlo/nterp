import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { useApp } from '../context/AppContext';
import { Icons } from './Icons';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Status } from '../types';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Reports: React.FC = () => {
  const { workOrders, technicians } = useApp();
  const { addToast } = useToast();
  const [dateRange, setDateRange] = useState<'30DAYS' | '90DAYS' | 'YEAR'>('30DAYS');

  // --- DATA PROCESSING HELPERS ---

  const filterDate = useMemo(() => {
      const now = new Date();
      if (dateRange === '30DAYS') return subDays(now, 30);
      if (dateRange === '90DAYS') return subDays(now, 90);
      return subDays(now, 365);
  }, [dateRange]);

  const filteredOTs = useMemo(() => {
      return workOrders.filter(ot => {
          const date = parseISO(ot.creationDate);
          return isAfter(date, filterDate);
      });
  }, [workOrders, filterDate]);

  // 1. KPI CARDS DATA
  const kpis = useMemo(() => {
      const completed = filteredOTs.filter(ot => ot.status === Status.FINISHED);
      const onTime = completed.filter(ot => {
         if (!ot.finishedDate) return false;
         return parseISO(ot.finishedDate) <= parseISO(ot.estimatedCompletionDate);
      });

      const totalLaborCost = filteredOTs.reduce((acc, ot) => {
          const otLabor = (ot.labor || []).reduce((lAcc, l) => lAcc + (l.hours * 15000), 0); // Est. $15k/hr
          return acc + otLabor;
      }, 0);

      const totalMaterialCost = filteredOTs.reduce((acc, ot) => {
          const otMat = (ot.materials || []).reduce((mAcc, m) => mAcc + (m.totalCost || 0), 0);
          return acc + otMat;
      }, 0);
      
      const totalServiceCost = filteredOTs.reduce((acc, ot) => {
          const otServ = (ot.services || []).reduce((sAcc, s) => sAcc + (s.cost || 0), 0);
          return acc + otServ;
      }, 0);

      const totalCost = totalLaborCost + totalMaterialCost + totalServiceCost;
      
      // Simulated Revenue (Assume 30% margin over cost for demo purposes if quote is missing)
      const totalRevenue = filteredOTs.reduce((acc, ot) => {
          return acc + (ot.quotedValue || (totalCost > 0 ? (totalCost / filteredOTs.length * 1.3) : 0) || 0);
      }, 0);

      return {
          otCount: filteredOTs.length,
          completionRate: filteredOTs.length > 0 ? Math.round((completed.length / filteredOTs.length) * 100) : 0,
          onTimeRate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 0,
          totalCost,
          totalLaborCost,
          totalMaterialCost,
          totalServiceCost,
          totalRevenue,
          margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
      };
  }, [filteredOTs]);

  // 2. CHART: OT Evolution (Area Chart)
  const evolutionData = useMemo(() => {
      // Group by day/week would be better, keeping simple by Creation Date
      const dataMap = new Map<string, { date: string, creadas: number, finalizadas: number }>();
      
      // Inicializar mapa ordenado
      filteredOTs.forEach(ot => {
          const d = format(parseISO(ot.creationDate), 'dd/MM', { locale: es });
          if (!dataMap.has(d)) dataMap.set(d, { date: d, creadas: 0, finalizadas: 0 });
          dataMap.get(d)!.creadas += 1;
      });

      workOrders.filter(ot => ot.status === Status.FINISHED && ot.finishedDate && isAfter(parseISO(ot.finishedDate), filterDate)).forEach(ot => {
          const d = format(parseISO(ot.finishedDate!), 'dd/MM', { locale: es });
          if (!dataMap.has(d)) dataMap.set(d, { date: d, creadas: 0, finalizadas: 0 });
          dataMap.get(d)!.finalizadas += 1;
      });

      return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOTs, workOrders, filterDate]);

  // 3. CHART: Technician Performance (Bar Chart)
  const techData = useMemo(() => {
      const techMap = new Map<string, { name: string, hours: number, ots: number }>();
      
      technicians.forEach(t => techMap.set(t.id, { name: t.name, hours: 0, ots: 0 }));

      filteredOTs.forEach(ot => {
          if (ot.technicianId && techMap.has(ot.technicianId)) {
              techMap.get(ot.technicianId)!.ots += 1;
          }
          (ot.labor || []).forEach(l => {
              if (techMap.has(l.technicianId)) {
                  techMap.get(l.technicianId)!.hours += l.hours;
              }
          });
      });

      return Array.from(techMap.values()).filter(t => t.hours > 0 || t.ots > 0);
  }, [filteredOTs, technicians]);

  // 4. CHART: Cost Distribution (Pie Chart)
  const costData = [
      { name: 'Materiales', value: kpis.totalMaterialCost },
      { name: 'Mano de Obra', value: kpis.totalLaborCost },
      { name: 'Terceros', value: kpis.totalServiceCost },
  ].filter(i => i.value > 0);

  const handleExportReport = () => {
    try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: KPIs Summary
        const kpiData = [
            ["Indicador", "Valor"],
            ["Total OTs Gestionadas", kpis.otCount],
            ["Tasa Finalización", `${kpis.completionRate}%`],
            ["Cumplimiento Plazos", `${kpis.onTimeRate}%`],
            ["Ingresos Estimados", kpis.totalRevenue],
            ["Costo Operativo Total", kpis.totalCost],
            ["  - Costo Materiales", kpis.totalMaterialCost],
            ["  - Costo Mano Obra", kpis.totalLaborCost],
            ["  - Costo Servicios", kpis.totalServiceCost],
            ["Margen Comercial", `${kpis.margin.toFixed(2)}%`]
        ];
        const wsKPI = XLSX.utils.aoa_to_sheet(kpiData);
        XLSX.utils.book_append_sheet(wb, wsKPI, "Resumen KPI");

        // Sheet 2: Detailed Costs per OT
        const detailsData = filteredOTs.map(ot => {
            const matCost = (ot.materials || []).reduce((acc, m) => acc + (m.totalCost || 0), 0);
            const labCost = (ot.labor || []).reduce((acc, l) => acc + (l.hours * 15000), 0);
            const servCost = (ot.services || []).reduce((acc, s) => acc + (s.cost || 0), 0);
            return {
                "OT": ot.id,
                "Cliente": ot.clientId,
                "Título": ot.title,
                "Estado": ot.status,
                "Costo Materiales": matCost,
                "Costo HH": labCost,
                "Costo Servicios": servCost,
                "Costo Total": matCost + labCost + servCost
            };
        });
        const wsDetails = XLSX.utils.json_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(wb, wsDetails, "Detalle Costos OT");

        XLSX.writeFile(wb, `Reporte_Financiero_${dateRange}.xlsx`);
        addToast("Reporte Financiero exportado", "SUCCESS");
    } catch (e) {
        console.error(e);
        addToast("Error al exportar reporte", "ERROR");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Reportes & Analítica</h2>
            <p className="text-sm text-slate-500">Indicadores clave de rendimiento (KPIs) y financieros.</p>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleExportReport}
                className="flex items-center gap-2 bg-white text-green-700 border border-green-200 px-4 py-1.5 rounded text-xs font-bold hover:bg-green-50 transition-colors shadow-sm"
            >
                <Icons.Excel size={16}/> Descargar Excel
            </button>
            <div className="w-px h-6 bg-slate-300 mx-2"></div>
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button 
                    onClick={() => setDateRange('30DAYS')}
                    className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${dateRange === '30DAYS' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    30 Días
                </button>
                <button 
                    onClick={() => setDateRange('90DAYS')}
                    className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${dateRange === '90DAYS' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Trimestre
                </button>
                <button 
                    onClick={() => setDateRange('YEAR')}
                    className={`px-4 py-1.5 text-xs font-bold rounded transition-colors ${dateRange === 'YEAR' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    Anual
                </button>
            </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">OTs Gestionadas</p>
              <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-bold text-slate-800">{kpis.otCount}</h3>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold border border-green-100">{kpis.completionRate}% Finalizadas</span>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cumplimiento Plazos</p>
               <div className="flex justify-between items-end">
                  <h3 className="text-2xl font-bold text-slate-800">{kpis.onTimeRate}%</h3>
                  <Icons.Calendar className={`mb-1 ${kpis.onTimeRate > 80 ? 'text-green-500' : 'text-orange-500'}`} size={20}/>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className={`h-full rounded-full ${kpis.onTimeRate > 80 ? 'bg-green-500' : 'bg-orange-500'}`} style={{width: `${kpis.onTimeRate}%`}}></div>
              </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Costo Operativo Total</p>
              <h3 className="text-2xl font-bold text-slate-800">${(kpis.totalCost / 1000000).toFixed(2)}M</h3>
              <p className="text-[10px] text-slate-400 mt-1">Materiales + HH + Servicios</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Margen Estimado</p>
              <div className="flex justify-between items-end">
                  <h3 className={`text-2xl font-bold ${kpis.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpis.margin.toFixed(1)}%
                  </h3>
                  <Icons.TrendingUp size={20} className={kpis.margin > 0 ? "text-green-600 mb-1" : "text-red-600 mb-1"}/>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CHART: Evolution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Icons.FileBarChart size={18} className="text-blue-600"/> Flujo de Órdenes (Entradas vs Salidas)</h3>
              <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={evolutionData}>
                          <defs>
                              <linearGradient id="colorCreadas" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorFin" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false}/>
                          <Tooltip 
                            contentStyle={{borderRadius: '8px', border:'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                          />
                          <Area type="monotone" dataKey="creadas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCreadas)" strokeWidth={2} name="Ingresadas" />
                          <Area type="monotone" dataKey="finalizadas" stroke="#10b981" fillOpacity={1} fill="url(#colorFin)" strokeWidth={2} name="Finalizadas" />
                          <Legend verticalAlign="top" height={36}/>
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* CHART: Cost Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Icons.Receipt size={18} className="text-purple-600"/> Estructura de Costos</h3>
              <div className="flex flex-col md:flex-row items-center h-72">
                  <div className="flex-1 w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={costData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {costData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`}/>
                        </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-48 space-y-3">
                      {costData.map((entry, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                  <span className="text-slate-600">{entry.name}</span>
                              </div>
                              <span className="font-bold text-slate-800">${(entry.value/1000).toFixed(0)}k</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* CHART: Tech Performance */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Icons.Users size={18} className="text-orange-600"/> Productividad por Técnico (Horas Hombre vs OTs)</h3>
              <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={techData} layout="vertical" barSize={20}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                          <XAxis type="number" hide/>
                          <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12, fill: '#334155'}} axisLine={false} tickLine={false}/>
                          <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px'}}/>
                          <Legend />
                          <Bar dataKey="hours" name="Horas Registradas" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="ots" name="OTs Participadas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};