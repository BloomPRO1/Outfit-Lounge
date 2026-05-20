import api from './api';
import type { DashboardStats } from '../types';

export const reportService = {
  getDashboard: async () => {
    const { data } = await api.get('/reports/dashboard');
    return data as DashboardStats;
  },
  getRevenueChart: async (period: 'week' | 'month' | 'year' = 'month') => {
    const { data } = await api.get('/reports/revenue-chart', { params: { period } });
    return data;
  },
  getSalesReport: async (params?: Record<string, any>) => {
    const { data } = await api.get('/reports/sales', { params });
    return data;
  },
  getRentalReport: async (params?: Record<string, any>) => {
    const { data } = await api.get('/reports/rentals', { params });
    return data;
  },
  getInventoryReport: async () => {
    const { data } = await api.get('/reports/inventory');
    return data;
  },
  getExpensesReport: async (params?: Record<string, any>) => {
    const { data } = await api.get('/reports/expenses', { params });
    return data;
  },
};
