import api from './api';
import type { Product, ProductCategory, ProductVariant, PaginatedResponse } from '../types';

export const productService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get('/products', { params });
    return data as PaginatedResponse<Product>;
  },
  getById: async (id: string) => {
    const { data } = await api.get(`/products/${id}`);
    return data as Product;
  },
  getByBarcode: async (barcode: string) => {
    const { data } = await api.get(`/products/barcode/${barcode}`);
    return data;
  },
  create: async (payload: any) => {
    const { data } = await api.post('/products', payload);
    return data as Product;
  },
  update: async (id: string, payload: any) => {
    const { data } = await api.put(`/products/${id}`, payload);
    return data as Product;
  },
  delete: async (id: string) => {
    await api.delete(`/products/${id}`);
  },
  uploadImage: async (id: string, file: File, isPrimary: boolean) => {
    const form = new FormData();
    form.append('image', file);
    form.append('isPrimary', String(isPrimary));
    const { data } = await api.post(`/products/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  getCategories: async () => {
    const { data } = await api.get('/products/categories');
    return data as ProductCategory[];
  },
  createCategory: async (payload: any) => {
    const { data } = await api.post('/products/categories', payload);
    return data as ProductCategory;
  },
  createVariant: async (productId: string, payload: any) => {
    const { data } = await api.post(`/products/${productId}/variants`, payload);
    return data as ProductVariant;
  },
  updateVariant: async (productId: string, variantId: string, payload: any) => {
    const { data } = await api.put(`/products/${productId}/variants/${variantId}`, payload);
    return data as ProductVariant;
  },
  deleteVariant: async (productId: string, variantId: string) => {
    await api.delete(`/products/${productId}/variants/${variantId}`);
  },
  splitVariantToRental: async (productId: string, variantId: string, quantity: number) => {
    const { data } = await api.post(`/products/${productId}/variants/${variantId}/split-to-rental`, { quantity });
    return data as { sourceVariant: any; rentVariant: any };
  },
};
