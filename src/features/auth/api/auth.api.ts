import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accessToken } from '@/lib/access-token';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { AuthResponse, PublicUser, TokenResponse } from '@/types/api';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas';

/**
 * Auth endpoints. The response's `refreshToken` is deliberately ignored: the backend also sets
 * it as an httpOnly cookie scoped to /api/v1/auth, which is the only copy the app relies on.
 * Session restore and the 401 → refresh flow are Part 02.
 */
export const authApi = {
  me: () => api.get<PublicUser>('/auth/me'),
  login: (input: LoginInput) => api.post<AuthResponse>('/auth/login', input),
  register: (input: RegisterInput) => api.post<AuthResponse>('/auth/register', input),
  refresh: () => api.post<TokenResponse>('/auth/refresh'),
  logout: () => api.post<void>('/auth/logout'),
  logoutAll: () => api.post<void>('/auth/logout-all'),
};

export function useMe(enabled = true) {
  return useQuery({ queryKey: queryKeys.me, queryFn: authApi.me, retry: false, enabled });
}

function useStartSession() {
  const qc = useQueryClient();
  return (session: AuthResponse) => {
    accessToken.set(session.accessToken);
    qc.setQueryData(queryKeys.me, session.user);
  };
}

export function useLogin() {
  const start = useStartSession();
  return useMutation({ mutationFn: authApi.login, onSuccess: start });
}

export function useRegister() {
  const start = useStartSession();
  return useMutation({ mutationFn: authApi.register, onSuccess: start });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      accessToken.clear();
      qc.clear();
    },
  });
}
