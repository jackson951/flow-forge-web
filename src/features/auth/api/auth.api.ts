import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AuthResponse, PublicUser, TokenResponse } from '@/types/api';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas';
import { session } from '../session/session';

/**
 * Auth endpoints. The response's `refreshToken` is deliberately ignored: the backend also sets
 * it as an httpOnly cookie scoped to /api/v1/auth, which is the only copy the app relies on.
 * Login, register, refresh and logout skip the 401 → refresh retry (they are the session).
 */
export const authApi = {
  me: () => api.get<PublicUser>('/auth/me'),
  login: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input, { skipAuth: true }),
  register: (input: RegisterInput) =>
    api.post<AuthResponse>('/auth/register', input, { skipAuth: true }),
  refresh: () => api.post<TokenResponse>('/auth/refresh', undefined, { skipAuth: true }),
  logout: () => api.post<void>('/auth/logout', undefined, { skipAuth: true }),
  logoutAll: () => api.post<void>('/auth/logout-all'),
};

export function useLogin() {
  return useMutation({ mutationFn: authApi.login, onSuccess: (res) => session.start(res) });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register, onSuccess: (res) => session.start(res) });
}

export function useLogout() {
  return useMutation({ mutationFn: () => session.logout() });
}

export function useLogoutAll() {
  return useMutation({ mutationFn: () => session.logoutAll() });
}
