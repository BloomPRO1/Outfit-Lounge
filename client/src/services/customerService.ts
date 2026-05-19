import api from './api';
import type { Customer, PaginatedResponse } from '../types';

export const customerService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get('/customers', { params });
    return data as PaginatedResponse<Customer>;
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/customers/${id}`);
    return data;
  },
  search: async (q: string) => {
    const { data } = await api.get('/customers/search', { params: { q } });
    return data as Customer[];
  },
  create: async (payload: Partial<Customer>) => {
    const { data } = await api.post('/customers', payload);
    return data as Customer;
  },
  update: async (id: string, payload: Partial<Customer>) => {
    const { data } = await api.put(`/customers/${id}`, payload);
    return data as Customer;
  },
  delete: async (id: string) => {
    await api.delete(`/customers/${id}`);
  },
};
