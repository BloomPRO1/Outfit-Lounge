import api from './api';
import type { PromotionCode } from '../types';

export const promotionCodeService = {
  getAll: async (): Promise<PromotionCode[]> => {
    const { data } = await api.get('/promotion-codes');
    return data;
  },
  validate: async (code: string, scope?: 'pos' | 'rental'): Promise<PromotionCode> => {
    const { data } = await api.get('/promotion-codes/validate', { params: { code, scope } });
    return data;
  },
  create: async (payload: any): Promise<PromotionCode> => {
    const { data } = await api.post('/promotion-codes', payload);
    return data;
  },
  update: async (id: string, payload: any): Promise<PromotionCode> => {
    const { data } = await api.patch(`/promotion-codes/${id}`, payload);
    return data;
  },
  toggle: async (id: string): Promise<PromotionCode> => {
    const { data } = await api.patch(`/promotion-codes/${id}/toggle`);
    return data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/promotion-codes/${id}`);
  },
};

export function calculateCodeDiscount(
  code: PromotionCode,
  subtotal: number,
): number {
  if (code.discount_type === 'percentage') {
    return subtotal * (code.discount_value / 100);
  }
  return Math.min(code.discount_value, subtotal);
}
