import { declarationService } from './declarationsService';
import type { Declaration, DeclarationStatus } from './declarationsService';

/**
 * Read-only aggregation layer for the employee ("funcionario") dashboard.
 *
 * The backend has no per-user metrics endpoint, so this module samples the
 * employee's own declarations (GET /declarations/me) and the incomplete-check
 * endpoint, then reduces them into a single {@link EmployeeDashboardData}
 * snapshot — mirroring how the admin dashboard aggregates system-wide data, but
 * scoped to the signed-in user.
 */

/** How many of the employee's declarations to sample for the breakdowns. */
const DECLARATIONS_SAMPLE = 200;
/** How many recent declarations the dashboard highlights. */
const RECENT_SIZE = 5;

const ALL_STATUSES: DeclarationStatus[] = [
  'Incomplete',
  'Revision',
  'Approved',
  'Rejected',
  'Abandoned',
  'Completed',
];

export interface EmployeeDashboardData {
  total: number;
  byStatus: Record<DeclarationStatus, number>;
  /** The employee's most recent declarations, newest first. */
  recent: Declaration[];
  /** Whether the employee has an unfinished declaration, and which one. */
  incomplete: { has: boolean; declarationId?: string };
}

function emptyStatusCounts(): Record<DeclarationStatus, number> {
  return ALL_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<DeclarationStatus, number>);
}

export const employeeDashboardService = {
  async getDashboard(): Promise<EmployeeDashboardData> {
    const [declarationsRes, incompleteRes] = await Promise.allSettled([
      declarationService.getMyDeclarations({ page: 1, limit: DECLARATIONS_SAMPLE }),
      declarationService.checkIncomplete(),
    ]);

    const page =
      declarationsRes.status === 'fulfilled'
        ? declarationsRes.value
        : { data: [], meta: { page: 1, limit: 0, total: 0, total_pages: 0 } };

    const declarations = page.data;
    const byStatus = emptyStatusCounts();
    for (const dec of declarations) {
      if (byStatus[dec.current_status] !== undefined) byStatus[dec.current_status] += 1;
    }

    const incomplete =
      incompleteRes.status === 'fulfilled'
        ? { has: incompleteRes.value.has_incomplete, declarationId: incompleteRes.value.declaration_id }
        : { has: false };

    return {
      // The list comes back newest-first from the API, so the total reflects the
      // full server count and the recent slice is simply the head of the page.
      total: page.meta.total || declarations.length,
      byStatus,
      recent: declarations.slice(0, RECENT_SIZE),
      incomplete,
    };
  },
};
