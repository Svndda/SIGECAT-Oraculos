import { type DeclarationStatus } from './declarationsService';

export const STATUS_TRANSITIONS: Record<DeclarationStatus, DeclarationStatus[]> = {
  Incomplete: ['Completed', 'Abandoned'],
  Revision: ['Approved', 'Rejected', 'Abandoned'],
  Approved: ['Rejected'],
  Rejected: [],
  Abandoned: [],
  Completed: ['Revision'],
};

export const ADMIN_ONLY_STATUSES: DeclarationStatus[] = ['Revision', 'Approved', 'Rejected'];

export const STATUS_TRANSLATIONS: Record<DeclarationStatus, string> = {
  Incomplete: 'Incompleta',
  Revision: 'Revisión',
  Approved: 'Aprobada',
  Rejected: 'Rechazada',
  Abandoned: 'Abandonada',
  Completed: 'Completada',
};

export const STATUS_COLORS: Record<DeclarationStatus, string> = {
  Incomplete: '#808080',
  Revision: '#5376f3',
  Approved: '#2e7d32',
  Rejected: '#c62828',
  Abandoned: '#fc7651',
  Completed: '#4a4949',
};

export function canChangeStatus(
  currentStatus: DeclarationStatus,
  newStatus: DeclarationStatus,
  userRole: 'ADMIN' | 'EMPLOYEE',
  isOwner: boolean
): boolean {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) return false;

  if (ADMIN_ONLY_STATUSES.includes(newStatus) && userRole !== 'ADMIN') {
    return false;
  }

  if (newStatus === 'Abandoned' && !isOwner && userRole !== 'ADMIN') {
    return false;
  }

  return true;
}