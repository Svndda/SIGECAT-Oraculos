import { areaService } from './areaService';
import { declarationService } from './declarationsService';
import type { Declaration, DeclarationStatus } from './declarationsService';
import { departmentService } from './departmentService';
import { jobPositionService } from './jobPositionService';
import { logService } from './logService';
import type { SystemLog } from './logService';
import { sectionService } from './sectionService';
import { unitService } from './unitService';
import { userService } from './userService';

/**
 * Read-only aggregation layer for the admin dashboard.
 *
 * The backend has no dedicated metrics endpoint, so this module fans out to the
 * existing per-entity services in parallel and reduces their responses into a
 * single {@link DashboardData} snapshot. Each source is resolved independently
 * with `Promise.allSettled`, so a single failing endpoint degrades that widget
 * to zeros/empties instead of blanking the whole page.
 */

/** How many declarations we pull to compute the client-side breakdowns. */
const DECLARATIONS_SAMPLE = 500;
/** How many job positions we pull to compute occupancy. */
const JOB_POSITIONS_SAMPLE = 500;
/** How many recent log entries feed the activity panel. */
const ACTIVITY_SIZE = 8;
/** How many months the declarations time series spans (including current). */
const TREND_MONTHS = 6;

const ALL_STATUSES: DeclarationStatus[] = [
  'Incomplete',
  'Revision',
  'Approved',
  'Rejected',
  'Abandoned',
  'Completed',
];

export interface MonthlyPoint {
  /** Month key in `YYYY-MM` form, useful as a stable React key. */
  key: string;
  /** Localized short label, e.g. "jul". */
  label: string;
  count: number;
}

export interface DashboardData {
  users: { total: number; admins: number; employees: number };
  declarations: {
    total: number;
    byStatus: Record<DeclarationStatus, number>;
    monthly: MonthlyPoint[];
    /** Declarations awaiting admin review, newest first (actionable queue). */
    pending: Declaration[];
  };
  jobPositions: { total: number; occupied: number; vacant: number };
  org: { areas: number; departments: number; sections: number; units: number };
  activity: SystemLog[];
}

/** `value` when the promise resolved, otherwise `fallback`. */
function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

/**
 * Parses the date strings the API returns (ISO or Oracle `DD-MON-YY ...`) into a
 * JS Date, or null when unparseable.
 */
function toDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;

  const iso = new Date(raw);
  if (!isNaN(iso.getTime())) return iso;

  const parts = raw.trim().toUpperCase().split(/\s+/);
  if (parts.length < 1) return null;

  const [day, monthStr, yearStr] = parts[0].split('-');
  const months: Record<string, number> = {
    JAN: 0, ENE: 0, FEB: 1, MAR: 2, APR: 3, ABR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, AGO: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11, DIC: 11,
  };
  const month = months[monthStr];
  if (month === undefined) return null;

  let year = parseInt(yearStr, 10);
  if (isNaN(year)) return null;
  if (year < 100) year += 2000;

  const d = new Date(year, month, parseInt(day, 10) || 1);
  return isNaN(d.getTime()) ? null : d;
}

function emptyStatusCounts(): Record<DeclarationStatus, number> {
  return ALL_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<DeclarationStatus, number>);
}

/** Buckets declarations into the last {@link TREND_MONTHS} months by creation date. */
function buildMonthly(declarations: Declaration[]): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  const index = new Map<string, MonthlyPoint>();

  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const point: MonthlyPoint = {
      key,
      label: d.toLocaleDateString('es-CR', { month: 'short' }),
      count: 0,
    };
    buckets.push(point);
    index.set(key, point);
  }

  for (const dec of declarations) {
    const d = toDate(dec.created_at);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const point = index.get(key);
    if (point) point.count += 1;
  }

  return buckets;
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const [
      usersRes,
      declarationsRes,
      jobPositionsRes,
      areasRes,
      departmentsRes,
      sectionsRes,
      unitsRes,
      activityRes,
    ] = await Promise.allSettled([
      userService.getUsers(),
      declarationService.getDeclarations({ page: 1, limit: DECLARATIONS_SAMPLE }),
      jobPositionService.getJobPositions({ page: 1, limit: JOB_POSITIONS_SAMPLE }),
      areaService.getAreas({ page: 1, limit: 1 }),
      departmentService.getDepartmentsPage({ page: 1, limit: 1 }),
      sectionService.getSectionsPage({ page: 1, limit: 1 }),
      unitService.getUnits({ page: 1, limit: 1 }),
      logService.list({ page: 1, limit: ACTIVITY_SIZE }),
    ]);

    const users = settled(usersRes, []);
    const declarationsPage = settled(declarationsRes, { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } });
    const jobPositionsPage = settled(jobPositionsRes, { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } });
    const activity = settled(activityRes, { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } }).data;

    const declarations = declarationsPage.data;
    const byStatus = emptyStatusCounts();
    for (const dec of declarations) {
      if (byStatus[dec.current_status] !== undefined) byStatus[dec.current_status] += 1;
    }

    const pending = declarations
      .filter((d) => d.current_status === 'Revision')
      .sort((a, b) => (toDate(b.created_at)?.getTime() ?? 0) - (toDate(a.created_at)?.getTime() ?? 0));

    const jobPositions = jobPositionsPage.data;
    const occupied = jobPositions.filter((p) => p.user_id).length;
    const jobPositionsTotal = jobPositionsPage.meta.total || jobPositions.length;

    const orgTotal = (r: PromiseSettledResult<{ meta: { total: number } }>): number =>
      r.status === 'fulfilled' ? r.value.meta.total : 0;

    return {
      users: {
        total: users.length,
        admins: users.filter((u) => u.role === 'admin').length,
        employees: users.filter((u) => u.role === 'employee').length,
      },
      declarations: {
        total: declarationsPage.meta.total || declarations.length,
        byStatus,
        monthly: buildMonthly(declarations),
        pending: pending.slice(0, 6),
      },
      jobPositions: {
        total: jobPositionsTotal,
        occupied,
        vacant: Math.max(jobPositionsTotal - occupied, 0),
      },
      org: {
        areas: orgTotal(areasRes),
        departments: orgTotal(departmentsRes),
        sections: orgTotal(sectionsRes),
        units: orgTotal(unitsRes),
      },
      activity,
    };
  },
};
