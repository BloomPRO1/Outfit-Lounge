import api from './api';
import type { Settings, User } from '../types';

export const settingsService = {
  getAll: async (category?: string) => {
    const { data } = await api.get('/settings', { params: category ? { category } : {} });
    return data as Settings;
  },
  update: async (updates: Record<string, string>) => {
    const { data } = await api.put('/settings', updates);
    return data;
  },
  getUsers: async () => {
    const { data } = await api.get('/users');
    return data as User[];
  },
  createUser: async (payload: any) => {
    const { data } = await api.post('/users', payload);
    return data as User;
  },
  updateUser: async (id: string, payload: any) => {
    const { data } = await api.put(`/users/${id}`, payload);
    return data as User;
  },
  resetPassword: async (id: string, newPassword: string) => {
    const { data } = await api.post(`/users/${id}/reset-password`, { newPassword });
    return data;
  },
  deactivateUser: async (id: string) => {
    await api.delete(`/users/${id}`);
  },
};
