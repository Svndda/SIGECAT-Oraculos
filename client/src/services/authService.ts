import apiClient from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export interface ServiceError {
  code: string;
  message: string;
}

interface LoginResponseData {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}

interface BackendLoginData {
  ACCESS_TOKEN: string;
  REFRESH_TOKEN: string;
  USER_ID: string;
  EMAIL: string;
  NAME: string;
  ROLE: string;
}

interface BackendUserData {
  USER_ID: string;
  EMAIL: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  ROLE: string;
}

const USE_MOCK = false;

const MOCK_USER: AuthUser = {
  id: '01JQWXYZ1234567890ABCDEF',
  email: 'usuario@ucr.ac.cr',
  first_name: 'Usuario',
  last_name: 'Demo',
  role: 'EMPLOYEE',
};

function extractApiError(error: unknown): ServiceError {
  if (error && typeof error === 'object') {
    if ('response' in error) {
      const axiosError = error as { response?: { data?: unknown } };
      const raw = axiosError.response?.data;

      if (raw && typeof raw === 'object' && 'errors' in raw) {
        const errors = (raw as { errors?: ServiceError[] }).errors;
        if (errors?.length) return errors[0];
      }

      // PHP echo pollution: body arrived as string, try to extract JSON errors
      if (typeof raw === 'string') {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed.errors?.length) return parsed.errors[0];
          } catch { /* ignore */ }
        }
        return { code: 'SERVER_ERROR', message: raw.trim() };
      }
    }

    if ('message' in error) {
      return { code: 'NETWORK_ERROR', message: (error as { message: string }).message };
    }
  }
  return { code: 'INTERNAL_ERROR', message: 'Error desconocido del servidor.' };
}

function mapRole(role: string): 'ADMIN' | 'EMPLOYEE' {
  return role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponseData> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      if (password === 'Demo1234!') {
        return {
          user: { ...MOCK_USER, email },
          access_token: 'mock_access_' + Date.now(),
          refresh_token: 'mock_refresh_' + Date.now(),
        };
      }
      throw { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas.' } satisfies ServiceError;
    }
    try {
      const response = await apiClient.post<{ data: BackendLoginData }>('/auth/login', { email, password });
      const d = response.data.data;
      localStorage.setItem('sigecat_user_id', d.USER_ID);
      const [firstName, ...rest] = d.NAME.split(' ');
      return {
        user: {
          id: d.USER_ID,
          email: d.EMAIL,
          first_name: firstName ?? '',
          last_name: rest.join(' '),
          role: mapRole(d.ROLE),
        },
        access_token: d.ACCESS_TOKEN,
        refresh_token: d.REFRESH_TOKEN,
      };
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return;
    }
    localStorage.removeItem('sigecat_user_id');
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async getMe(): Promise<AuthUser> {
    if (USE_MOCK) {
      const token = localStorage.getItem('sigecat_access_token');
      if (!token) throw { code: 'MISSING_AUTH_TOKEN', message: 'No autenticado.' } satisfies ServiceError;
      return { ...MOCK_USER };
    }
    try {
      const userId = localStorage.getItem('sigecat_user_id');
      if (!userId) throw { code: 'MISSING_AUTH_TOKEN', message: 'No autenticado.' } satisfies ServiceError;
      const response = await apiClient.get<{ data: BackendUserData }>(`/users/${userId}`);
      const d = response.data.data;
      return {
        id: d.USER_ID,
        email: d.EMAIL,
        first_name: d.FIRST_NAME,
        last_name: d.LAST_NAME,
        role: mapRole(d.ROLE),
      };
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      if (currentPassword !== 'Demo1234!') {
        throw { code: 'INVALID_CREDENTIALS', message: 'La contraseña actual es incorrecta.' } satisfies ServiceError;
      }
      return;
    }
    void currentPassword;
    try {
      await apiClient.put('/users/me', { password: newPassword });
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async recoverPassword(email: string, newPassword: string): Promise<void> {
    // Mock only — no backend endpoint defined for password recovery
    await new Promise((r) => setTimeout(r, 800));
    void email;
    void newPassword;
  },
};
