
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  WorkOrder, InventoryItem, Component, Technician, 
  ActivityLogEntry, AppSettings, Status, Area, Priority, User,
  SupplyDocument, ConsumptionRecord, Tool, ToolLoan, ToolMaintenance, ToolStatus, DebugLogEntry
} from '../types';

// --- SEED DATA ---
const INITIAL_USERS: User[] = [
  { id: 'U1', name: 'Administrador', email: 'admin@northchrome.cl', password: 'admin', role: 'ADMIN', active: true },
  { id: 'U2', name: 'Jefe Planta', email: 'jefe@northchrome.cl', password: 'user', role: 'MANAGER', active: true },
  { id: 'U3', name: 'Técnico Juan', email: 'tech@northchrome.cl', password: 'user', role: 'TECHNICIAN', active: true },
  { id: 'U4', name: 'Encargado Bodega', email: 'bodega@northchrome.cl', password: 'user', role: 'WAREHOUSE', active: true },
];

const INITIAL_OTS: WorkOrder[] = [
  {
    id: 'OT.1001',
    title: 'Reparación Eje Principal',
    clientId: 'Mining Corp',
    status: Status.IN_PROCESS,
    isBudgetApproved: true,
    area: Area.CNC,
    priority: Priority.HIGH,
    creationDate: new Date(Date.now() - 172800000).toISOString(), 
    startDate: new Date(Date.now() - 86400000).toISOString(), 
    estimatedCompletionDate: new Date(Date.now() + 86400000).toISOString(), 
    description: 'Rectificado de eje principal según plano 404.',
    assignedOperators: ['Pedro', 'Luis'],
    technicianId: 'U3',
    materials: [{ itemId: 'MAT-001', quantity: 2, name: 'Acero Inoxidable 304', unitPriceAtUsage: 5000, totalCost: 10000, dateAdded: new Date().toISOString() }],
    labor: [
        { id: 'L1', technicianId: 'U3', technicianName: 'Técnico Juan', hours: 4, date: new Date(Date.now() - 86400000).toISOString(), description: 'Desmontaje y Limpieza' }
    ],
    services: [],
    tasks: [
        { id: 'tk1', description: 'Desmontaje inicial y limpieza', isCompleted: true, completedAt: new Date().toISOString() },
        { id: 'tk2', description: 'Rectificado primera etapa', isCompleted: false },
        { id: 'tk3', description: 'Control dimensional final', isCompleted: false }
    ],
    comments: []
  },
  {
    id: 'OT.1002',
    title: 'Soldadura Estructura Base',
    clientId: 'Constructora X',
    status: Status.PENDING,
    isBudgetApproved: true,
    area: Area.WELDING,
    priority: Priority.MEDIUM,
    creationDate: new Date().toISOString(),
    estimatedCompletionDate: new Date(Date.now() - 86400000).toISOString(), 
    description: 'Soldadura MIG en base de soporte. Requiere certificación.',
    assignedOperators: [],
    materials: [],
    labor: [],
    services: [],
    tasks: [],
    comments: []
  },
  {
    id: 'OT.1003',
    title: 'Mecanizado Camisa Hidráulica',
    clientId: 'HydraSystems',
    status: Status.FINISHED,
    isBudgetApproved: true,
    area: Area.MECHANICS,
    priority: Priority.LOW,
    creationDate: new Date(Date.now() - 604800000).toISOString(), 
    startDate: new Date(Date.now() - 518400000).toISOString(), 
    finishedDate: new Date(Date.now() - 172800000).toISOString(), 
    estimatedCompletionDate: new Date(Date.now() - 259200000).toISOString(), 
    description: 'Fabricación de camisa según muestra.',
    finalNotes: 'Se entregó pintado y embalado. Cliente conforme.',
    assignedOperators: [],
    materials: [],
    labor: [],
    services: [],
    tasks: [],
    comments: []
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'MAT-001', sku: 'ST-304', name: 'Acero Inoxidable 304', category: 'Metal', stock: 5, minStock: 10, unit: 'kg', location: 'A1', price: 5000 },
  { id: 'MAT-002', sku: 'BOLT-M10', name: 'Perno M10 Hex', category: 'Insumos', stock: 200, minStock: 50, unit: 'un', location: 'B2', price: 150 },
  { id: 'MAT-003', sku: 'WELD-7018', name: 'Electrodo 7018 1/8"', category: 'Soldadura', stock: 20, minStock: 5, unit: 'kg', location: 'C5', price: 3500 },
  { id: 'MAT-004', sku: 'OIL-ISO68', name: 'Aceite Hidráulico ISO 68', category: 'Lubricantes', stock: 200, minStock: 20, unit: 'L', location: 'D1', price: 4200 },
];

const INITIAL_SUPPLY_DOCS: SupplyDocument[] = [
    {
        id: 'RCP-2024-001',
        externalReference: 'FAC-9921',
        provider: 'AceroMundo S.A.',
        type: 'FACTURA',
        date: new Date(Date.now() - 432000000).toISOString(), 
        items: [
            { itemId: 'MAT-001', sku: 'ST-304', name: 'Acero Inoxidable 304', quantity: 10, unitPrice: 4800 }
        ],
        netAmount: 48000,
        tax: 9120,
        totalAmount: 57120,
        receivedBy: 'Administrador',
        timestamp: new Date(Date.now() - 432000000).toISOString()
    }
];

const INITIAL_COMPONENTS: Component[] = [
  { 
    id: 'CMP-001', name: 'Bomba Hidráulica ZX', client: 'Mining Corp', model: 'ZX-2000',
    spareParts: [
      { id: 'SP-01', name: 'Sello Viton', code: 'SV-20', quantity: 2 },
      { id: 'SP-02', name: 'Rodamiento 6204', code: 'R-6204', quantity: 1 },
      { id: 'SP-03', name: 'O-Ring Kit', code: 'ORK-99', quantity: 1 }
    ]
  },
  { 
    id: 'CMP-002', name: 'Cilindro Telescópico', client: 'Constructora X', model: 'CT-500',
    spareParts: [
      { id: 'SP-04', name: 'Vástago Cromado', code: 'VC-50', quantity: 1 },
      { id: 'SP-05', name: 'Juego Empaquetaduras', code: 'JE-500', quantity: 1 }
    ]
  }
];

const INITIAL_TOOLS: Tool[] = [
    { id: 'T-001', code: 'TAL-01', name: 'Taladro Percutor 18V', brand: 'Makita', model: 'DHP482', category: 'POWER_TOOLS', purchaseDate: '2023-01-15', status: 'AVAILABLE', location: 'P-1' },
    { id: 'T-002', code: 'ESM-01', name: 'Esmeril Angular 4.5"', brand: 'Bosch', model: 'GWS 700', category: 'POWER_TOOLS', purchaseDate: '2023-02-20', status: 'IN_USE', location: 'P-2' },
    { id: 'T-003', code: 'CAL-01', name: 'Pie de Metro Digital', brand: 'Mitutoyo', model: '500-196', category: 'MEASURING', purchaseDate: '2023-06-01', status: 'AVAILABLE', location: 'M-1' },
    { id: 'T-004', code: 'MIC-01', name: 'Micrómetro Exterior 0-25mm', brand: 'Mitutoyo', model: '103-137', category: 'MEASURING', purchaseDate: '2022-11-10', status: 'MAINTENANCE', location: 'M-2' },
];

interface BulkUpsertResult {
    created: number;
    updated: number;
    errors: string[];
}

interface AppContextProps {
  workOrders: WorkOrder[];
  inventory: InventoryItem[];
  components: Component[];
  technicians: Technician[];
  activityLog: ActivityLogEntry[];
  debugLogs: DebugLogEntry[];
  settings: AppSettings;
  users: User[];
  supplyDocuments: SupplyDocument[];
  consumptionHistory: ConsumptionRecord[];
  
  // Pañol State
  tools: Tool[];
  toolLoans: ToolLoan[];
  toolMaintenances: ToolMaintenance[];
  
  addWorkOrder: (ot: WorkOrder) => void;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  
  bulkUpsertInventory: (items: Partial<InventoryItem>[]) => BulkUpsertResult;

  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addSupplyDocument: (doc: SupplyDocument) => void;
  addConsumption: (record: ConsumptionRecord) => void;

  // Pañol Methods
  addTool: (tool: Tool) => void;
  updateTool: (id: string, updates: Partial<Tool>) => void;
  checkoutTool: (loan: ToolLoan) => void;
  checkinTool: (loanId: string, conditionIn: string, status: 'AVAILABLE' | 'BROKEN' | 'MAINTENANCE') => void;
  processToolReturns: (returns: { loanId: string, toolId: string, condition: string, status: ToolStatus }[], returnDate: string) => void;
  addToolMaintenance: (maint: ToolMaintenance) => void;

  logActivity: (action: ActivityLogEntry['action'], entity: ActivityLogEntry['entity'], details: string) => void;
  addDebugLog: (level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: Record<string, unknown>) => void;
  
  // Settings Method
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Helper for safe JSON parsing to prevent crashes
const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`Error parsing ${key} from localStorage, using fallback.`, error);
    return fallback;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() => safeParse('north_chrome_ots', INITIAL_OTS));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => safeParse('north_chrome_inventory', INITIAL_INVENTORY));
  const [supplyDocuments, setSupplyDocuments] = useState<SupplyDocument[]>(() => safeParse('north_chrome_supply_docs', INITIAL_SUPPLY_DOCS));
  const [consumptionHistory, setConsumptionHistory] = useState<ConsumptionRecord[]>(() => safeParse('north_chrome_consumption', []));
  const [components, setComponents] = useState<Component[]>(() => safeParse('north_chrome_components', INITIAL_COMPONENTS));
  
  const [technicians, setTechnicians] = useState<Technician[]>(() => safeParse('north_chrome_techs', [
     { id: 'U3', name: 'Técnico Juan', specialty: 'CNC', active: true },
     { id: 'T2', name: 'Carlos Mecánico', specialty: 'Mecánica', active: true }
  ]));

  const [users, setUsers] = useState<User[]>(() => safeParse('north_chrome_users_db', INITIAL_USERS));

  // --- PAÑOL STATE INITIALIZATION ---
  const [tools, setTools] = useState<Tool[]>(() => safeParse('north_chrome_tools', INITIAL_TOOLS));
  const [toolLoans, setToolLoans] = useState<ToolLoan[]>(() => safeParse('north_chrome_tool_loans', []));
  const [toolMaintenances, setToolMaintenances] = useState<ToolMaintenance[]>(() => safeParse('north_chrome_tool_maintenances', []));

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);

  const [settings, setSettings] = useState<AppSettings>(() => safeParse('north_chrome_settings', {
      companyName: 'North Chrome Ltda.',
      photoServerUrl: 'https://picsum.photos/v2/list', 
      notificationsEnabled: true,
      debugModeEnabled: false,
      theme: 'light'
  }));

  // Persistence Effects
  useEffect(() => localStorage.setItem('north_chrome_ots', JSON.stringify(workOrders)), [workOrders]);
  useEffect(() => localStorage.setItem('north_chrome_inventory', JSON.stringify(inventory)), [inventory]);
  useEffect(() => localStorage.setItem('north_chrome_components', JSON.stringify(components)), [components]);
  useEffect(() => localStorage.setItem('north_chrome_techs', JSON.stringify(technicians)), [technicians]);
  useEffect(() => localStorage.setItem('north_chrome_users_db', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('north_chrome_supply_docs', JSON.stringify(supplyDocuments)), [supplyDocuments]);
  useEffect(() => localStorage.setItem('north_chrome_consumption', JSON.stringify(consumptionHistory)), [consumptionHistory]);
  
  // Pañol Persistence
  useEffect(() => localStorage.setItem('north_chrome_tools', JSON.stringify(tools)), [tools]);
  useEffect(() => localStorage.setItem('north_chrome_tool_loans', JSON.stringify(toolLoans)), [toolLoans]);
  useEffect(() => localStorage.setItem('north_chrome_tool_maintenances', JSON.stringify(toolMaintenances)), [toolMaintenances]);
  
  // Settings Persistence
  useEffect(() => localStorage.setItem('north_chrome_settings', JSON.stringify(settings)), [settings]);

  // --- THEME EFFECT ---
  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
  }, [settings.theme]);

  // Initialize logs
  useEffect(() => {
    if(settings.debugModeEnabled) {
        console.log("[System] App Initialized. Data loaded from LocalStorage.");
    }
  }, [settings.debugModeEnabled]);

  const logActivity = useCallback((action: ActivityLogEntry['action'], entity: ActivityLogEntry['entity'], details: string) => {
    const newEntry: ActivityLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      action,
      entity,
      details,
      userId: 'CURRENT_USER' 
    };
    if (settings.debugModeEnabled) {
        console.log(`%c[ACTIVITY] ${action} on ${entity}:`, "color: #0ea5e9; font-weight: bold;", details);
    }
    setActivityLog(prev => [newEntry, ...prev].slice(0, 50));
  }, [settings.debugModeEnabled]);

  const addDebugLog = useCallback((level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: Record<string, unknown>) => {
      if (settings.debugModeEnabled) {
         const color = level === 'ERROR' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : '#10b981';
         console.log(`%c[DEBUG-${level}] ${message}`, `color: ${color}; font-weight: bold;`, data || '');
      }
      const entry: DebugLogEntry = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          level,
          message,
          data
      };
      setDebugLogs(prev => [entry, ...prev].slice(0, 100));
  }, [settings.debugModeEnabled]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
      const keys = Object.keys(newSettings);
      if (!keys.includes('theme')) {
          logActivity('UPDATE', 'SYSTEM', `Configuración actualizada: ${keys.join(', ')}`);
      }
  }, [logActivity]);

  const addWorkOrder = useCallback((ot: WorkOrder) => {
    const safeOT = { ...ot, tasks: ot.tasks || [], labor: ot.labor || [], services: ot.services || [], isBudgetApproved: ot.isBudgetApproved !== undefined ? ot.isBudgetApproved : true };
    setWorkOrders(prev => [safeOT, ...prev]);
    logActivity('CREATE', 'OT', `Creada OT ${ot.id} (${ot.isBudgetApproved ? 'Activa' : 'Pendiente Presupuesto'})`);
  }, [logActivity]);

  const updateWorkOrder = useCallback((id: string, updates: Partial<WorkOrder>) => {
    const currentOt = workOrders.find(ot => ot.id === id);
    setWorkOrders(prev => prev.map(ot => ot.id === id ? { ...ot, ...updates } : ot));
    if (currentOt) {
        if (updates.status && updates.status !== currentOt.status) {
             logActivity('STATUS_CHANGE', 'OT', `OT ${id}: Cambio de estado de "${currentOt.status}" a "${updates.status}"`);
        } else {
             const keys = Object.keys(updates).filter(k => k !== 'comments' && k !== 'tasks').join(', ');
             if (keys) logActivity('UPDATE', 'OT', `Actualizada OT ${id}`);
        }
    }
  }, [workOrders, logActivity]);

  const addInventoryItem = useCallback((item: InventoryItem) => {
    setInventory(prev => [...prev, item]);
    logActivity('CREATE', 'INVENTORY', `Agregado item ${item.sku}`);
  }, [logActivity]);

  const updateInventoryItem = useCallback((id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    logActivity('UPDATE', 'INVENTORY', `Actualizado item ${id}`);
  }, [logActivity]);

  const bulkUpsertInventory = useCallback((items: Partial<InventoryItem>[]) => {
    const result: BulkUpsertResult = { created: 0, updated: 0, errors: [] };
    let newInventory = [...inventory];
    const inventoryMap = new Map(newInventory.map(item => [item.sku.toUpperCase().trim(), item]));

    items.forEach((incomingItem, index) => {
        const rowNum = index + 2;
        const rawSku = incomingItem.sku ? String(incomingItem.sku).trim().toUpperCase() : '';
        if (!rawSku) { result.errors.push(`Fila ${rowNum}: SKU vacío.`); return; }
        const stock = incomingItem.stock !== undefined ? Number(incomingItem.stock) : undefined;
        const price = incomingItem.price !== undefined ? Number(incomingItem.price) : undefined;
        const minStock = incomingItem.minStock !== undefined ? Number(incomingItem.minStock) : undefined;

        const existingItem = inventoryMap.get(rawSku);
        if (existingItem) {
            const updatedItem = { ...existingItem, ...incomingItem, sku: rawSku, stock: stock !== undefined ? stock : existingItem.stock, price: price !== undefined ? price : existingItem.price, minStock: minStock !== undefined ? minStock : existingItem.minStock, name: incomingItem.name || existingItem.name, category: incomingItem.category || existingItem.category, unit: incomingItem.unit || existingItem.unit, location: incomingItem.location || existingItem.location };
            const arrayIndex = newInventory.findIndex(i => i.id === existingItem.id);
            if (arrayIndex !== -1) { newInventory[arrayIndex] = updatedItem; inventoryMap.set(rawSku, updatedItem); result.updated++; }
        } else {
            const newItem: InventoryItem = { id: `MAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, sku: rawSku, name: incomingItem.name || 'Sin Nombre', category: incomingItem.category || 'General', stock: stock || 0, minStock: minStock || 5, unit: incomingItem.unit || 'un', location: incomingItem.location || 'Bodega', price: price || 0 };
            newInventory.push(newItem); inventoryMap.set(rawSku, newItem); result.created++;
        }
    });

    if (result.created > 0 || result.updated > 0) {
        setInventory(newInventory);
        logActivity('UPDATE', 'INVENTORY', `Carga Masiva: ${result.created} creados, ${result.updated} actualizados.`);
    }
    return result;
  }, [inventory, logActivity]);

  const addUser = useCallback((user: User) => {
    setUsers(prev => [...prev, user]);
    logActivity('CREATE', 'USER', `Creado usuario ${user.email}`);
  }, [logActivity]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    logActivity('UPDATE', 'USER', `Actualizado usuario ${id}`);
  }, [logActivity]);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    logActivity('DELETE', 'USER', `Eliminado usuario ${id}`);
  }, [logActivity]);

  const addSupplyDocument = useCallback((doc: SupplyDocument) => {
    setSupplyDocuments(prev => [doc, ...prev]);
    setInventory(prevInventory => prevInventory.map(item => {
        const suppliedItem = doc.items.find(si => si.itemId === item.id);
        if (suppliedItem) return { ...item, stock: item.stock + suppliedItem.quantity };
        return item;
    }));
    logActivity('RECEIVE_STOCK', 'DOCUMENT', `Recepción ${doc.id} (${doc.type})`);
  }, [logActivity]);

  const addConsumption = useCallback((record: ConsumptionRecord) => {
    setConsumptionHistory(prev => [record, ...prev]);
    setInventory(prevInventory => {
        const newInventory = [...prevInventory];
        record.items.forEach(consumed => {
            const index = newInventory.findIndex(i => i.id === consumed.itemId);
            if (index !== -1) newInventory[index] = { ...newInventory[index], stock: Math.max(0, newInventory[index].stock - consumed.quantity) };
        });
        return newInventory;
    });
    setWorkOrders(prevOrders => prevOrders.map(ot => {
        if (ot.id === record.workOrderId) {
            const newMaterials = [...ot.materials];
            record.items.forEach(consumed => newMaterials.push({ itemId: consumed.itemId, name: consumed.name, quantity: consumed.quantity, unitPriceAtUsage: consumed.unitPrice, totalCost: consumed.total, dateAdded: record.date }));
            return { ...ot, materials: newMaterials };
        }
        return ot;
    }));
    logActivity('DISPATCH_STOCK', 'CONSUMPTION', `Despacho ${record.id} para OT ${record.workOrderId}`);
  }, [logActivity]);

  const addTool = useCallback((tool: Tool) => {
      setTools(prev => [...prev, tool]);
      logActivity('CREATE', 'TOOL', `Herramienta registrada: ${tool.code}`);
  }, [logActivity]);

  const updateTool = useCallback((id: string, updates: Partial<Tool>) => {
      setTools(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      logActivity('UPDATE', 'TOOL', `Herramienta actualizada: ${id}`);
  }, [logActivity]);

  const checkoutTool = useCallback((loan: ToolLoan) => {
      setToolLoans(prev => [loan, ...prev]);
      setTools(prev => prev.map(t => t.id === loan.toolId ? { ...t, status: 'IN_USE' } : t));
      logActivity('TOOL_LOAN', 'TOOL', `Préstamo: ${loan.toolName} a ${loan.technicianName}`);
  }, [logActivity]);

  const checkinTool = useCallback((loanId: string, conditionIn: string, status: 'AVAILABLE' | 'BROKEN' | 'MAINTENANCE') => {
      const loan = toolLoans.find(l => l.id === loanId);
      if(!loan) return;
      setToolLoans(prev => prev.map(l => l.id === loanId ? { ...l, returnDate: new Date().toISOString(), conditionIn, status: 'RETURNED' } : l));
      setTools(prev => prev.map(t => t.id === loan.toolId ? { ...t, status: status } : t));
      logActivity('TOOL_RETURN', 'TOOL', `Devolución: ${loan.toolName} (Estado: ${status})`);
  }, [toolLoans, logActivity]);

  const processToolReturns = useCallback((returns: { loanId: string, toolId: string, condition: string, status: ToolStatus }[], returnDate: string) => {
      if (returns.length === 0) return;
      const loanUpdates = new Map(returns.map(r => [r.loanId, r]));
      const toolUpdates = new Map(returns.map(r => [r.toolId, r]));
      
      setToolLoans(prev => prev.map(l => {
          const update = loanUpdates.get(l.id);
          return update ? { ...l, returnDate: returnDate, conditionIn: update.condition, status: 'RETURNED' as const } : l;
      }));

      setTools(prev => prev.map(t => {
          const update = toolUpdates.get(t.id);
          return update ? { ...t, status: update.status } : t;
      }));
      
      logActivity('TOOL_RETURN', 'TOOL', `Devolución masiva: ${returns.length} herramientas`);
  }, [logActivity]);

  const addToolMaintenance = useCallback((maint: ToolMaintenance) => {
      setToolMaintenances(prev => [maint, ...prev]);
      setTools(prev => prev.map(t => t.id === maint.toolId ? { ...t, status: 'MAINTENANCE', nextMaintenanceDate: maint.nextScheduledDate } : t));
      logActivity('TOOL_MAINTENANCE', 'TOOL', `Mantenimiento registrado: ${maint.toolId}`);
  }, [logActivity]);


  const value = useMemo(() => ({
    workOrders, inventory, components, technicians, activityLog, debugLogs, settings, users, supplyDocuments, consumptionHistory,
    tools, toolLoans, toolMaintenances,
    addWorkOrder, updateWorkOrder, addInventoryItem, updateInventoryItem, bulkUpsertInventory, addUser, updateUser, deleteUser, addSupplyDocument, addConsumption,
    addTool, updateTool, checkoutTool, checkinTool, processToolReturns, addToolMaintenance, logActivity, addDebugLog, updateSettings
  }), [
    workOrders, inventory, components, technicians, activityLog, debugLogs, settings, users, supplyDocuments, consumptionHistory,
    tools, toolLoans, toolMaintenances,
    addWorkOrder, updateWorkOrder, addInventoryItem, updateInventoryItem, bulkUpsertInventory, addUser, updateUser, deleteUser, addSupplyDocument, addConsumption,
    addTool, updateTool, checkoutTool, checkinTool, processToolReturns, addToolMaintenance, logActivity, addDebugLog, updateSettings
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
