import api from './axios';
import type { Category } from '../types';

export async function getCategories(): Promise<Category[]> {
  const response = await api.get<Category[]>('/categories/');
  return response.data;
}
