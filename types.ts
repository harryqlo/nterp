
// Enums
export enum Status {
  PENDING = 'Pendiente',
  IN_PROCESS = 'En Proceso',
  WAITING = 'En Espera',
  FINISHED = 'Finalizado',
  CANCELLED = 'Cancelado',
}

export enum Area {
  CNC = 'CNC',
  MECHANICS = 'Mecánica',
  WELDING = 'Soldadura',
  QUALITY = 'Calidad',
}

export enum Priority {
  LOW = 'Baja',
  MEDIUM = 'Media',
  HIGH = 'Alta',
  URGENT = 'Urgente'
}

export type Role = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'WAREHOUSE';

// --- PAÑOL ENUMS ---
export type ToolStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN' | 'RETIRED';
export type ToolCategory = 'POWER_TOOLS' | 'HAND_TOOLS' | 'MEASURING' | 'SAFETY' | 'CONSUMABLES' | 'MACHINERY';

// Entities
export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  password?: string; // In a real backend this would be hashed. LocalStorage demo stores plain.
  active: boolean;
  avatar?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: string;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
  price: number;
}

export interface SparePart {
  id: string;
  name: string;
  code: string;
  quantity: number;
}

export interface Component {
  id: string;
  name: string;
  client: string;
  model: string;
  spareParts: SparePart[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string; // ISO Date
}

export interface MaterialUsage {
  itemId: string;
  quantity: number;
  name: string; // Denormalized for ease
  unitPriceAtUsage?: number; // Capture cost at moment of use
  totalCost?: number;
  dateAdded?: string;
}

// NEW: Man-Hours Tracking
export interface LaborEntry {
    id: string;
    technicianId: string;
    technicianName: string;
    hours: number;
    date: string;
    description: string; // What did they do?
    hourlyRate?: number; // Optional: Internal cost calculation
}

// NEW: External Services (Outsourcing)
export interface ServiceEntry {
    id: string;
    provider: string;
    description: string;
    cost: number;
    referenceDoc?: string; // OC or Invoice
    date: string;
}

export interface WorkOrderTask {
  id: string;
  description: string;
  isCompleted: boolean;
  completedBy?: string; // User ID
  completedAt?: string;
}

export interface WorkOrder {
  id: string; // "OT Number" (Editable manual)
  title: string; // "Descripción" column in Excel
  identification?: string; // "Identificación" column in Excel (Serial/Tag/Code)
  
  clientId: string;
  clientGuide?: string; // "Guía de Despacho Cliente"
  clientOC?: string; // "OC / Factura Cliente"
  receptionDoc?: string; // Internal Reception Doc Reference

  // Commercial Status
  isBudgetApproved: boolean; // True: Active, False: Waiting for client approval
  quoteNumber?: string; // Número de Cotización
  quotedValue?: number; // Net Value quoted to client

  status: Status;
  area: Area;
  machine?: string;
  technicianId?: string; // Main technician (Linked to User.id)
  assignedOperators: string[]; // IDs of helpers
  
  // Resources
  materials: MaterialUsage[];
  labor: LaborEntry[]; // NEW
  services: ServiceEntry[]; // NEW

  tasks: WorkOrderTask[]; // New Checklist feature
  
  creationDate: string; // "Fecha" column in Excel (Ingreso)
  startDate?: string; // Real Start Date
  estimatedCompletionDate: string; // ISO Date
  finishedDate?: string; // ISO Date
  
  priority: Priority;
  description: string; // Detailed description
  finalNotes?: string; // Final observations upon completion
  comments: Comment[];
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'AUTH_ERROR' | 'RECEIVE_STOCK' | 'DISPATCH_STOCK' | 'TOOL_LOAN' | 'TOOL_RETURN' | 'TOOL_MAINTENANCE';
  entity: 'OT' | 'INVENTORY' | 'COMPONENT' | 'SYSTEM' | 'USER' | 'DOCUMENT' | 'CONSUMPTION' | 'TOOL';
  details: string;
  userId: string; // Who did it
}

export interface DebugLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: any;
}

// Supply / Warehouse Management
export type SupplyDocType = 'FACTURA' | 'GUIA_DESPACHO' | 'BOLETA';

export interface SupplyItem {
  itemId: string; // Links to InventoryItem.id
  sku: string;    // Denormalized
  name: string;   // Denormalized
  quantity: number;
  unitPrice: number;
}

export interface SupplyDocument {
  id: string; // Internal System ID (RCP-YYYY-XXXX)
  externalReference: string; // Invoice Number from Provider
  provider: string;
  type: SupplyDocType;
  date: string; // ISO Date
  items: SupplyItem[];
  netAmount: number;
  tax: number; // IVA
  totalAmount: number;
  receivedBy: string; // User Name
  timestamp: string; // Creation timestamp
}

// Consumption / Dispatch Management
export interface ConsumptionRecord {
    id: string; // DSP-YYYY-XXXX
    workOrderId: string; // Link to OT
    technicianId: string; // Who received it
    technicianName: string; // Denormalized
    date: string;
    items: ConsumptionItem[];
    totalCost: number;
    dispatchedBy: string; // Warehouse user
    timestamp: string;
}

export interface ConsumptionItem {
    itemId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number; // Historical cost
    total: number;
}

// --- PAÑOL (TOOL CRIB) ENTITIES ---

export interface Tool {
  id: string; // T-001
  code: string; // Internal Code/Barcode
  name: string; // Descripción
  brand: string;
  model: string;
  serialNumber?: string;
  category: ToolCategory;
  status: ToolStatus;
  location: string; // Shelf/Bin
  accumulatedUsageHours?: number; // Estimated
  description?: string; // Observaciones / Additional details
  
  // Purchase Data
  purchaseDate: string;
  purchasePrice?: number; // Costo Adquisición
  provider?: string; // Proveedor Compra
  invoiceRef?: string; // Nº Factura

  // Calibration Data
  calibration?: {
      requires: boolean;
      lastDate?: string;
      intervalDays?: number;
      nextDate?: string;
      certificateUrl?: string;
  };

  nextMaintenanceDate?: string;
  image?: string;
  
  // activeMaintenance allows us to track where the tool is when status is MAINTENANCE
  activeMaintenance?: {
      date: string; // Dispatch Date
      type: 'INTERNAL' | 'EXTERNAL'; // Taller interno o externo
      urgency: 'LOW' | 'MEDIUM' | 'HIGH';
      reason: string;
      provider: string;
      responsible: string; // Who authorized/sent it
      reference: string; // OC Number or Work Order
      estimatedReturnDate?: string;
  };
}

export interface ToolLoan {
  id: string;
  toolId: string;
  toolName: string; // Denormalized
  technicianId: string;
  technicianName: string; // Denormalized
  workOrderId?: string; // Optional link to OT
  loanDate: string; // Check-out
  returnDate?: string; // Check-in
  conditionOut: string;
  conditionIn?: string;
  status: 'ACTIVE' | 'RETURNED';
}

export interface ToolMaintenance {
  id: string;
  toolId: string;
  type: 'PREVENTATIVE' | 'CORRECTIVE';
  date: string; // Return Date
  performedBy: string; // Vendor or Internal
  cost: number;
  invoiceRef?: string; // Factura del proveedor
  purchaseOrder?: string; // OC reference
  description: string; // Technical Report
  nextScheduledDate?: string;
}

// App Settings
export interface AppSettings {
  companyName: string;
  photoServerUrl: string;
  notificationsEnabled: boolean;
  debugModeEnabled: boolean; // New flag for Debug UI
  theme: 'light' | 'dark'; // New Theme Property
}

// Navigation Views
export type View = 'DASHBOARD' | 'ORDERS' | 'INVENTORY' | 'COMPONENTS' | 'REPORTS' | 'SETTINGS' | 'USERS' | 'PANOL';
