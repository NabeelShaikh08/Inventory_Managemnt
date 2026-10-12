import api from './axios';
import type { Me } from '../types';

export async function getMe(): Promise<Me> {
  const response = await api.get<Me>('/me/');
  return response.data;
}
