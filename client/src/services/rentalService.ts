import api from './api';
import type { Rental, PaginatedResponse } from '../types';

export const rentalService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get('/rentals', { params });
    return data as PaginatedResponse<Rental>;
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/rentals/${id}`);
    return data as Rental;
  },
  getUpcomingReturns: async () => {
    const { data } = await api.get('/rentals/upcoming-returns');
    return data as Rental[];
  },
  create: async (payload: any) => {
    const { data } = await api.post('/rentals', payload);
    return data as Rental;
  },
  updateStatus: async (id: string, status: string, notes?: string) => {
    const { data } = await api.patch(`/rentals/${id}/status`, { status, notes });
    return data as Rental;
  },
  addPayment: async (id: string, payload: any) => {
    const { data } = await api.post(`/rentals/${id}/payments`, payload);
    return data;
  },
};
