import apiClient from './apiClient';

export interface Area {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface Unit {
  id: string;
  section_id: string | null;
  department_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface Plaza {
  id: string;
  name: string;
  description: string | null;
  job_position_type_id: string;
  area_id: string | null;
  department_id: string | null;
  section_id: string | null;
  unit_id: string | null;
  user_id: string | null;
  created_at: string;
  is_deleted: number;
  deleted_at: string | null;
}

export interface JobPositionType {
  job_position_type_id: string;
  name: string;
}

/** A selectable org entity (area/department/section/unit) for the plaza parent. */
export interface OrgOption {
  id: string;
  name: string;
}

/** The four parent entity kinds a plaza can hang from (mutually exclusive). */
export type PlazaParentType = 'area' | 'department' | 'section' | 'unit';

export interface CreatePlazaPayload {
  name: string;
  description?: string;
  job_position_type_id: string;
  area_id?: string;
  department_id?: string;
  section_id?: string;
  unit_id?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ListParams {
  page?: number;
  limit?: number;
  filter?: string;
  status?: 'active' | 'deleted' | 'all';
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'employee';
  job_class_id?: string;
}

export interface RegisterUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'employee';
  password: string;
  created_by: string;
}

export interface ServiceError {
  code: string;
  message: string;
}

const USE_MOCK = false;

const INITIAL_USERS: AdminUser[] = [
  { id: '01MOCK001', email: 'admin@ucr.ac.cr', first_name: 'Admin', last_name: 'UCR', role: 'admin' },
  { id: '01MOCK002', email: 'empleado@ucr.ac.cr', first_name: 'María', last_name: 'González', role: 'employee', job_class_id: '5200' },
];

let mockUsers: AdminUser[] = [...INITIAL_USERS];

function extractApiError(error: unknown): ServiceError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { errors?: ServiceError[] } } };
    const errors = axiosError.response?.data?.errors;
    if (errors?.length) return errors[0];
  }
  return { code: 'INTERNAL_ERROR', message: 'Error del servidor. Intente de nuevo más tarde.' };
}

export const adminService = {
  // ---- Areas ----
  async getAreas(params: ListParams = {}): Promise<Paginated<Area>> {
    try {
      const res = await apiClient.get<{ data: Area[]; meta: PageMeta }>('/areas', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async createArea(payload: { name: string; description?: string }): Promise<void> {
    try {
      await apiClient.post('/areas', payload);
    } catch (e) { throw extractApiError(e); }
  },

  async updateArea(id: string, payload: { name?: string; description?: string }): Promise<void> {
    try {
      await apiClient.patch(`/areas/${id}`, payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deleteArea(id: string): Promise<void> {
    try {
      await apiClient.delete(`/areas/${id}`);
    } catch (e) { throw extractApiError(e); }
  },

  // ---- Units ----
  async getUnits(params: ListParams = {}): Promise<Paginated<Unit>> {
    try {
      const res = await apiClient.get<{ data: Unit[]; meta: PageMeta }>('/units', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  // ---- Plazas (job positions) ----
  async getPlazas(params: ListParams = {}): Promise<Paginated<Plaza>> {
    try {
      const res = await apiClient.get<{ data: Plaza[]; meta: PageMeta }>('/plazas', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
    } catch (e) { throw extractApiError(e); }
  },

  async getJobPositionTypes(): Promise<JobPositionType[]> {
    try {
      const res = await apiClient.get<{ data: JobPositionType[] }>('/job-position-types');
      return res.data.data ?? [];
    } catch (e) { throw extractApiError(e); }
  },

  // Parent-entity option sources for the plaza form (normalized to {id, name}).
  async getDepartments(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: Array<{ id?: string; department_id?: string; name: string }> }>('/departments', { params });
      return (res.data.data ?? []).map((d) => ({ id: d.id ?? d.department_id ?? '', name: d.name }));
    } catch (e) { throw extractApiError(e); }
  },

  async getSections(params: ListParams = {}): Promise<OrgOption[]> {
    try {
      const res = await apiClient.get<{ data: OrgOption[] }>('/sections', { params });
      return res.data.data ?? [];
    } catch (e) { throw extractApiError(e); }
  },

  async createPlaza(payload: CreatePlazaPayload): Promise<void> {
    try {
      await apiClient.post('/plazas', payload);
    } catch (e) { throw extractApiError(e); }
  },

  async deletePlaza(id: string): Promise<void> {
    try {
      await apiClient.delete(`/plazas/${id}`);
    } catch (e) { throw extractApiError(e); }
  },

  // ---- Users ----
  async getUsers(): Promise<AdminUser[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return [...mockUsers];
    }
    try {
      const res = await apiClient.get<{ data: AdminUser[] }>('/users');
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async registerUser(payload: RegisterUserPayload): Promise<AdminUser> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      const user: AdminUser = {
        id: Date.now().toString(),
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: payload.role,
      };
      mockUsers = [user, ...mockUsers];
      return user;
    }
    try {
      await apiClient.post('/users/register', payload);
      return {
        id: '',
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        role: payload.role,
      };
    } catch (e) { throw extractApiError(e); }
  },

  async updatePlaza(plazaNumber: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return;
    }
    try {
      await apiClient.patch('/users/me/plaza', { plaza_number: plazaNumber });
    } catch (e) { throw extractApiError(e); }
  },
};
