import type { SystemLog } from './logService';

/**
 * Business-activity view model derived on the client from the existing
 * SYSTEM_LOGS entries (see {@link SystemLog}).
 *
 * The API already emits rich domain events through its Logger — e.g.
 * `declaration.create`, `user.change_role`, `area.delete`, `auth.login` — mixed
 * in the same table as purely technical/server noise (`http.request`,
 * `rate_limit.*`, `unhandled.exception`). Rather than change the backend, this
 * module classifies each row, hides the server noise, and maps the business
 * events into the fields the admin "Bitácora" renders: an action verb, the
 * affected entity, a business severity, and a human-readable label.
 */

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

/** Spanish labels + palette for the severity badge. */
export const SEVERITY_META: Record<Severity, { label: string; color: 'success' | 'warning' | 'error' }> = {
  LOW: { label: 'Bajo', color: 'success' },
  MEDIUM: { label: 'Medio', color: 'warning' },
  HIGH: { label: 'Alto', color: 'error' },
};

/**
 * Actions emitted by the Logger that are purely technical/server events and
 * must never appear in the business activity view. Everything else follows the
 * `entity.verb` convention and is a domain event.
 */
const TECHNICAL_ACTIONS = new Set([
  'http.request',
  'rate_limit.error',
  'rate_limit.exceeded',
  'unhandled.exception',
]);

/** True when a log row is a business-domain event rather than server noise. */
export function isBusinessEvent(log: SystemLog): boolean {
  return log.action !== null && log.action !== '' && !TECHNICAL_ACTIONS.has(log.action);
}

/** Human-readable entity name keyed by the action's entity prefix. */
const ENTITY_LABELS: Record<string, string> = {
  declaration: 'Declaración',
  user: 'Usuario',
  auth: 'Sesión',
  area: 'Área',
  unit: 'Unidad',
  section: 'Sección',
  department: 'Departamento',
  job: 'Puesto',
  job_position: 'Plaza',
  license_type: 'Tipo de licencia',
  license: 'Licencia',
  rest_time: 'Tiempo de descanso',
  official_function: 'Función oficial',
  custom_function: 'Función personalizada',
  job_function: 'Función de declaración',
};

/** Human-readable action verb keyed by the action's verb suffix. */
const VERB_LABELS: Record<string, string> = {
  create: 'Crear',
  update: 'Modificar',
  delete: 'Eliminar',
  restore: 'Restaurar',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  login_failed: 'Inicio fallido',
  login_locked: 'Cuenta bloqueada',
  change_status: 'Cambio de estado',
  change_role: 'Cambio de rol',
  change_password: 'Cambio de contraseña',
  password_reset: 'Restablecer contraseña',
  update_justification: 'Actualizar justificación',
};

/** Spanish labels for the known context keys shown in the detail view. */
const CONTEXT_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  email: 'Correo electrónico',
  role: 'Rol',
  previous_role: 'Rol anterior',
  new_role: 'Rol nuevo',
  status: 'Estado',
  previous_status: 'Estado anterior',
  new_status: 'Estado nuevo',
  declaration_id: 'ID de declaración',
  area_id: 'ID de área',
  created_by: 'Creado por',
  deleted_by: 'Eliminado por',
  updated_by: 'Modificado por',
};

export interface ActivityMeta {
  /** Entity prefix of the action, e.g. `declaration`. */
  entitySlug: string;
  /** Verb suffix of the action, e.g. `create`. */
  verb: string;
  /** Localized entity label, e.g. `Declaración`. */
  entityLabel: string;
  /** Localized action label, e.g. `Crear`. */
  actionLabel: string;
  /** Business severity driving the badge. */
  severity: Severity;
}

function titleCase(slug: string): string {
  if (slug === '') return 'Evento';
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ');
}

function severityFor(verb: string, level: SystemLog['level']): Severity {
  if (level === 'ERROR' || level === 'CRITICAL') return 'HIGH';
  if (verb === 'delete') return 'HIGH';
  if (verb === 'login' || verb === 'logout') return 'LOW';
  return 'MEDIUM';
}

/** Splits an `entity.verb` action into its parts (verb may be empty). */
function splitAction(action: string | null): [string, string] {
  const raw = action ?? '';
  const dot = raw.indexOf('.');
  if (dot === -1) return [raw, ''];
  return [raw.slice(0, dot), raw.slice(dot + 1)];
}

/** Derives the business-activity metadata for a single log row. */
export function activityMeta(log: SystemLog): ActivityMeta {
  const [entitySlug, verb] = splitAction(log.action);
  return {
    entitySlug,
    verb,
    entityLabel: ENTITY_LABELS[entitySlug] ?? titleCase(entitySlug),
    actionLabel: VERB_LABELS[verb] ?? titleCase(verb),
    severity: severityFor(verb, log.level),
  };
}

/**
 * A best-effort human label for the specific record a business event touched,
 * pulled from the event's context (e.g. the created area's name). Returns null
 * when the context carries nothing name-like.
 */
export function affectedLabel(log: SystemLog): string | null {
  const ctx = log.context;
  if (!ctx) return null;
  for (const key of ['name', 'title', 'label', 'email']) {
    const value = ctx[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

/**
 * Flattens the event context into labelled rows for the detail view, skipping
 * empty values. Keys without a known label are title-cased as a fallback.
 */
export function contextRows(log: SystemLog): { label: string; value: string }[] {
  const ctx = log.context;
  if (!ctx) return [];
  return Object.entries(ctx)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => ({
      label: CONTEXT_LABELS[key] ?? titleCase(key),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
}
