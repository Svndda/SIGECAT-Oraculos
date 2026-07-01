import apiClient from './apiClient';
import { extractApiError, type ListParams, type PageMeta, type Paginated } from './common';

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'employee';
}

export interface RegisterUserPayload {
  first_name: string;
  second_name?: string;
  first_last_name: string;
  second_last_name: string;
  email: string;
  role: 'admin' | 'employee';
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  second_name: string;
  first_last_name: string;
  second_last_name: string;
  role: string;
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
  { id: '01MOCK002', email: 'empleado@ucr.ac.cr', first_name: 'María', last_name: 'González', role: 'employee'},
];

let mockUsers: AdminUser[] = [...INITIAL_USERS];

export const userService = {
  async getUsers(): Promise<AdminUser[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return [...mockUsers];
    }
    try {
      // Page through the full list so callers that need every user (counts,
      // selection dropdowns) aren't silently capped at the server's page size.
      const first = await apiClient.get<{ data: AdminUser[]; meta?: PageMeta }>(
        '/users', { params: { page: 1, limit: 100 } }
      );
      const users = first.data.data ?? [];
      const totalPages = first.data.meta?.total_pages ?? 1;
      for (let page = 2; page <= totalPages; page++) {
        const res = await apiClient.get<{ data: AdminUser[] }>(
          '/users', { params: { page, limit: 100 } }
        );
        users.push(...(res.data.data ?? []));
      }
      return users;
    } catch (e) { throw extractApiError(e); }
  },

  /** A single paginated page of users (with meta) for the admin list view. */
  async getUsersPage(params: ListParams = {}): Promise<Paginated<AdminUser>> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return {
        data: [...mockUsers],
        meta: { page: 1, limit: mockUsers.length, total: mockUsers.length, total_pages: 1 },
      };
    }
    try {
      const res = await apiClient.get<{ data: AdminUser[]; meta: PageMeta }>('/users', { params });
      return { data: res.data.data ?? [], meta: res.data.meta };
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
        first_name: [payload.first_name, payload.second_name].filter(Boolean).join(' '),
        last_name: `${payload.first_last_name} ${payload.second_last_name}`,
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
        first_name: [payload.first_name, payload.second_name].filter(Boolean).join(' '),
        last_name: `${payload.first_last_name} ${payload.second_last_name}`,
        role: payload.role,
      };
    } catch (e) { throw extractApiError(e); }
  },

  async getProfile(): Promise<UserProfile> {
    try {
      const res = await apiClient.get<{ data: UserProfile }>('/users/me');
      return res.data.data;
    } catch (e) {
      throw extractApiError(e);
    }
  },

};
