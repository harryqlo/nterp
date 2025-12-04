
import { format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Status } from '../types';

export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = parseISO(dateString);
  if (!isValid(date)) return '-';
  return format(date, 'dd-MM-yyyy', { locale: es });
};

export const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = parseISO(dateString);
  if (!isValid(date)) return '-';
  return format(date, 'dd-MM-yyyy HH:mm', { locale: es });
};

export type DeadlineColor = 'bg-red-100 text-red-800 border-red-200' | 'bg-yellow-100 text-yellow-800 border-yellow-200' | 'bg-gray-100 text-gray-800 border-gray-200' | 'bg-green-100 text-green-800 border-green-200';

export const getDeadlineStatus = (dateString: string, status: Status): { color: DeadlineColor; label: string } => {
  if (status === Status.FINISHED || status === Status.CANCELLED) {
    return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cerrada' };
  }

  const targetDate = parseISO(dateString);
  if (!isValid(targetDate)) return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'S/F' };

  const today = new Date();
  const diff = differenceInCalendarDays(targetDate, today);

  // Logic: 
  // < 0: Atrasado (Rojo)
  // <= 1: Vence hoy/mañana (Rojo)
  // 2-3: Vence pronto (Amarillo)
  // > 3: Tiempo normal (Verde/Gris conceptual, usaremos verde suave o defecto)

  if (diff < 0) {
    return { color: 'bg-red-100 text-red-800 border-red-200', label: `${Math.abs(diff)} días atrasado` };
  } else if (diff <= 1) {
    return { color: 'bg-red-100 text-red-800 border-red-200', label: diff === 0 ? 'Vence hoy' : 'Vence mañana' };
  } else if (diff <= 3) {
    return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: `Vence en ${diff} días` };
  } else {
    return { color: 'bg-green-100 text-green-800 border-green-200', label: 'En plazo' };
  }
};

export const getStatusColor = (status: Status): string => {
  switch (status) {
    case Status.PENDING: return 'bg-blue-100 text-blue-800';
    case Status.IN_PROCESS: return 'bg-purple-100 text-purple-800';
    case Status.WAITING: return 'bg-orange-100 text-orange-800';
    case Status.FINISHED: return 'bg-green-100 text-green-800';
    case Status.CANCELLED: return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};
