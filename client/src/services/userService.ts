import apiClient from './apiClient';
import { extractApiError } from './common';

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

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  job_class_id?: string | null;
}

export interface UpdateProfilePayload {
  first_name?: string;
  second_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  email?: string;
}

const USE_MOCK = false;

const INITIAL_USERS: AdminUser[] = [
  { id: '01MOCK001', email: 'admin@ucr.ac.cr', first_name: 'Admin', last_name: 'UCR', role: 'admin' },
  { id: '01MOCK002', email: 'empleado@ucr.ac.cr', first_name: 'María', last_name: 'González', role: 'employee', job_class_id: '5200' },
];

let mockUsers: AdminUser[] = [...INITIAL_USERS];

export const userService = {
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

  async assignJobClass(userId: string, jobClassId: string): Promise<void> {
    try {
      await apiClient.patch(`/users/${userId}/job-class`, { job_class_id: jobClassId });
    } catch (e) { throw extractApiError(e); }
  },

  async changeRole(userId: string, role: 'admin' | 'employee'): Promise<void> {
    try {
      await apiClient.patch(`/users/${userId}/role`, { role });
    } catch (e) { throw extractApiError(e); }
  },

  async deleteUser(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${userId}`);
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

  async getProfile(): Promise<UserProfile> {
    try {
      // Consume el endpoint GET /users/me del UserController
      const res = await apiClient.get<{ data: UserProfile }>('/users/me');
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<void> {
    try {
      // Consume el endpoint PATCH /users/me mapeado al UpdateUserDTO
      await apiClient.patch('/users/me', payload);
    } catch (e) {
      throw extractApiError(e);
    }
  },
};
