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

// Set to false once AuthController and UserController are implemented in the backend
const USE_MOCK = true;

const MOCK_USER: AuthUser = {
  id: '01JQWXYZ1234567890ABCDEF',
  email: 'usuario@ucr.ac.cr',
  first_name: 'Usuario',
  last_name: 'Demo',
  role: 'EMPLOYEE',
};

function extractApiError(error: unknown): ServiceError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { errors?: ServiceError[] } } };
    const errors = axiosError.response?.data?.errors;
    if (errors?.length) return errors[0];
  }
  return { code: 'INTERNAL_ERROR', message: 'Error del servidor. Intente de nuevo más tarde.' };
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
      const response = await apiClient.post<{ data: LoginResponseData }>('/auth/login', { email, password });
      return response.data.data;
    } catch (error) {
      throw extractApiError(error);
    }
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return;
    }
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
      const response = await apiClient.get<{ data: { user: AuthUser } }>('/users/me');
      return response.data.data.user;
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
    try {
      await apiClient.put('/users/me', { current_password: currentPassword, password: newPassword });
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
