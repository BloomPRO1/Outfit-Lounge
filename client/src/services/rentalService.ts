import api from './api';
import type { Rental, PaginatedResponse } from '../types';

export interface AvailabilityItem {
  product_id: string;
  product_name: string;
  category_name: string | null;
  product_image: string | null;
  variant_id: string;
  sku: string;
  size: string | null;
  color: string | null;
  material: string | null;
  price_per_day: number;
  rental_stock: number;
  booked_qty: number;
  available_qty: number;
}

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
  updateStatus: async (id: string, status: string, notes?: string, pickupTime?: string, security?: { securityType?: string; securityDeposit?: number; securityIdNumber?: string }) => {
    const { data } = await api.patch(`/rentals/${id}/status`, { status, notes, pickupTime, ...security });
    return data as Rental;
  },
  addPayment: async (id: string, payload: any) => {
    const { data } = await api.post(`/rentals/${id}/payments`, payload);
    return data;
  },
  getAvailability: async (date: string, search?: string) => {
    const { data } = await api.get('/rentals/availability', { params: { date, search: search || undefined } });
    return data as AvailabilityItem[];
  },
};
