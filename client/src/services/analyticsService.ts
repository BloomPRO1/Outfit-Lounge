import api from './api';

export const analyticsService = {
  getData: async (fromMonth?: string, toMonth?: string) => {
    const { data } = await api.get('/analytics', { params: { fromMonth, toMonth } });
    return data;
  },
  listCapital: async (params?: Record<string, any>) => {
    const { data } = await api.get('/analytics/capital', { params });
    return data;
  },
  addCapital: async (payload: { amount: number; category: string; note?: string; investedAt: string }) => {
    const { data } = await api.post('/analytics/capital', payload);
    return data;
  },
  deleteCapital: async (id: string) => {
    const { data } = await api.delete(`/analytics/capital/${id}`);
    return data;
  },
};
