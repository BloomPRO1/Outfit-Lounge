import api from './api';

export const returnService = {
  getPending: async () => {
    const { data } = await api.get('/returns/pending');
    return data;
  },
  getFineCalc: async (rentalId: string, returnDate?: string) => {
    const { data } = await api.get(`/returns/${rentalId}/fine`, {
      params: returnDate ? { returnDate } : {},
    });
    return data;
  },
  processReturn: async (rentalId: string, payload: any) => {
    const { data } = await api.post(`/returns/${rentalId}/process`, payload);
    return data;
  },
};
