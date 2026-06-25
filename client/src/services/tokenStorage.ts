/**
 * Centralized auth-token storage.
 *
 * Tokens live in `sessionStorage` (not cookies, not localStorage): they are sent
 * to the API as `Authorization: Bearer` headers and are cleared automatically
 * when the browser tab is closed, so a session does not outlive the tab.
 */

const ACCESS_TOKEN_KEY = 'sigecat_access_token';
const REFRESH_TOKEN_KEY = 'sigecat_refresh_token';
const USER_ID_KEY = 'sigecat_user_id';

export const tokenStorage = {
  getAccessToken: (): string | null => sessionStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: (): string | null => sessionStorage.getItem(REFRESH_TOKEN_KEY),
  getUserId: (): string | null => sessionStorage.getItem(USER_ID_KEY),

  setAccessToken: (token: string): void => sessionStorage.setItem(ACCESS_TOKEN_KEY, token),
  setRefreshToken: (token: string): void => sessionStorage.setItem(REFRESH_TOKEN_KEY, token),
  setUserId: (userId: string): void => sessionStorage.setItem(USER_ID_KEY, userId),

  /** Persists a full session (after a successful login). */
  setSession: (session: { accessToken: string; refreshToken: string; userId: string }): void => {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    sessionStorage.setItem(USER_ID_KEY, session.userId);
  },

  /** Removes every auth artifact (on logout or an unrecoverable auth error). */
  clear: (): void => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
  },
};
