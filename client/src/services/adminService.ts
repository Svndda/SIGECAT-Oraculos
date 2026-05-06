import apiClient from './apiClient';

export interface OrgEntity {
  id: string;
  categoria: string;
  nombre: string;
  descripcion: string;
  codigo: string;
  fechaCreacion: string;
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
  job_class_id: string;
  created_by: string;
}

export interface ServiceError {
  code: string;
  message: string;
}

// Set to false once backend controllers are implemented
const USE_MOCK = true;

const INITIAL_ENTITIES: OrgEntity[] = [
  { id: '1', categoria: 'Área', nombre: 'Área de Reserva', descripcion: 'Área encargada de la gestión de reservas institucionales', codigo: '12345673', fechaCreacion: '2021-12-08' },
  { id: '2', categoria: 'Área', nombre: 'Área de Tecnología', descripcion: 'Área encargada de los recursos tecnológicos', codigo: '12345674', fechaCreacion: '2021-12-08' },
  { id: '3', categoria: 'Departamento', nombre: 'Recursos Humanos', descripcion: 'Departamento de gestión del talento humano', codigo: '12345675', fechaCreacion: '2021-12-08' },
  { id: '4', categoria: 'Unidad', nombre: 'Unidad Financiera', descripcion: 'Unidad encargada de la gestión financiera', codigo: '12345676', fechaCreacion: '2021-12-08' },
  { id: '5', categoria: 'Área', nombre: 'Área de Reserva', descripcion: 'Área encargada de la gestión de reservas institucionales', codigo: '12345673', fechaCreacion: '2021-12-08' },
  { id: '6', categoria: 'Departamento', nombre: 'Planificación', descripcion: 'Departamento de planificación estratégica institucional', codigo: '12345677', fechaCreacion: '2021-12-08' },
  { id: '7', categoria: 'Área', nombre: 'Área de Reserva', descripcion: 'Área encargada de la gestión de reservas institucionales', codigo: '12345673', fechaCreacion: '2021-12-08' },
];

const INITIAL_USERS: AdminUser[] = [
  { id: '01MOCK001', email: 'admin@ucr.ac.cr', first_name: 'Admin', last_name: 'UCR', role: 'admin' },
  { id: '01MOCK002', email: 'empleado@ucr.ac.cr', first_name: 'María', last_name: 'González', role: 'employee', job_class_id: '5200' },
];

let mockEntities: OrgEntity[] = [...INITIAL_ENTITIES];
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
  async getEntities(): Promise<OrgEntity[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return [...mockEntities];
    }
    try {
      const res = await apiClient.get<{ data: OrgEntity[] }>('/entities');
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async createEntity(payload: Omit<OrgEntity, 'id' | 'fechaCreacion'>): Promise<OrgEntity> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const entity: OrgEntity = {
        ...payload,
        id: Date.now().toString(),
        fechaCreacion: new Date().toISOString().split('T')[0],
      };
      mockEntities = [entity, ...mockEntities];
      return entity;
    }
    try {
      const res = await apiClient.post<{ data: OrgEntity }>('/entities', payload);
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async updateEntity(id: string, payload: Omit<OrgEntity, 'id' | 'fechaCreacion'>): Promise<OrgEntity> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      mockEntities = mockEntities.map((e) => (e.id === id ? { ...e, ...payload } : e));
      return mockEntities.find((e) => e.id === id)!;
    }
    try {
      const res = await apiClient.put<{ data: OrgEntity }>(`/entities/${id}`, payload);
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async deleteEntity(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      mockEntities = mockEntities.filter((e) => e.id !== id);
      return;
    }
    try {
      await apiClient.delete(`/entities/${id}`);
    } catch (e) { throw extractApiError(e); }
  },

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
        job_class_id: payload.job_class_id,
      };
      mockUsers = [user, ...mockUsers];
      return user;
    }
    try {
      const res = await apiClient.post<{ data: AdminUser }>('/users/register', payload);
      return res.data.data;
    } catch (e) { throw extractApiError(e); }
  },

  async updatePlaza(plazaNumber: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return;
    }
    try {
      await apiClient.put('/users/me', { plaza_number: plazaNumber });
    } catch (e) { throw extractApiError(e); }
  },
};
