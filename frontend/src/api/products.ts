import api from './axios';
import type { Product, PaginatedResponse, ProductFilters, ProductFormData } from '../types';

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.search) params.search = filters.search;
  if (filters.category) params.category = filters.category;
  if (filters.is_active !== '' && filters.is_active !== undefined) params.is_active = filters.is_active;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;
  if (filters.ordering) params.ordering = filters.ordering;

  const response = await api.get<PaginatedResponse<Product>>('/products/', { params });
  return response.data;
}

export async function getProduct(id: number): Promise<Product> {
  const response = await api.get<Product>(`/products/${id}/`);
  return response.data;
}

export async function createProduct(data: ProductFormData): Promise<Product> {
  const response = await api.post<Product>('/products/', data);
  return response.data;
}

export async function updateProduct(id: number, data: Partial<ProductFormData>): Promise<Product> {
  const response = await api.patch<Product>(`/products/${id}/`, data);
  return response.data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}/`);
}
