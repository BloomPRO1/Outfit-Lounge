import api from './api';
import type { User } from '../types';

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data as { token: string; user: User };
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data as User;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
    return data;
  },
};
