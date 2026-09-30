import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { User } from '@/types/api';
import type { LoginInput, RegisterInput } from '../schemas/auth.schemas';

export const authApi = {
  me: () => api.get<User>('/auth/me'),
  login: (input: LoginInput) => api.post<unknown>('/auth/login', input),
  register: (input: RegisterInput) => api.post<unknown>('/auth/register', input),
  logout: () => api.post<void>('/auth/logout'),
};

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: authApi.me, retry: false });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.logout, onSuccess: () => qc.clear() });
}
