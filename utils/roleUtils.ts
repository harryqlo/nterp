
import { Role, View } from '../types';

// Definición de permisos por Rol
export const PERMISSIONS = {
  ADMIN: {
    allowedViews: ['DASHBOARD', 'ORDERS', 'INVENTORY', 'COMPONENTS', 'REPORTS', 'SETTINGS', 'USERS', 'PANOL'] as View[],
    canCreateOT: true,
    canEditInventory: true,
    canExportReports: true,
    label: 'Administrador'
  },
  MANAGER: {
    allowedViews: ['DASHBOARD', 'ORDERS', 'COMPONENTS', 'REPORTS'] as View[], // Removed PANOL
    canCreateOT: true,
    canEditInventory: false,
    canExportReports: true,
    label: 'Jefe de Planta'
  },
  TECHNICIAN: {
    allowedViews: ['DASHBOARD', 'ORDERS', 'COMPONENTS'] as View[], // Removed PANOL
    canCreateOT: false,
    canEditInventory: false,
    canExportReports: false,
    label: 'Técnico'
  },
  WAREHOUSE: {
    allowedViews: ['DASHBOARD', 'INVENTORY', 'ORDERS', 'PANOL'] as View[],
    canCreateOT: false,
    canEditInventory: true,
    canExportReports: false,
    label: 'Bodega'
  }
};

export const hasPermission = (role: Role, permission: keyof typeof PERMISSIONS['ADMIN']) => {
  return PERMISSIONS[role][permission as keyof typeof PERMISSIONS[typeof role]];
};

export const getRoleLabel = (role: Role) => {
  return PERMISSIONS[role].label;
};
