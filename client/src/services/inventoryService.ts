import api from './api';

export const inventoryService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get('/inventory', { params });
    return data;
  },
  getSummary: async () => {
    const { data } = await api.get('/inventory/summary');
    return data;
  },
  getLowStock: async () => {
    const { data } = await api.get('/inventory/low-stock');
    return data;
  },
  getMovements: async (params?: Record<string, any>) => {
    const { data } = await api.get('/inventory/movements', { params });
    return data;
  },
  recordMovement: async (payload: any) => {
    const { data } = await api.post('/inventory/movements', payload);
    return data;
  },
};
