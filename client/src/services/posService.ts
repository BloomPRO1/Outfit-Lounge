import api from './api';
import type { Sale } from '../types';

export const posService = {
  checkout: async (payload: any) => {
    const { data } = await api.post('/pos/checkout', payload);
    return data;
  },
  getSales: async (params?: Record<string, any>) => {
    const { data } = await api.get('/pos/sales', { params });
    return data as Sale[];
  },
  getSaleById: async (id: string) => {
    const { data } = await api.get(`/pos/sales/${id}`);
    return data as Sale;
  },
};
