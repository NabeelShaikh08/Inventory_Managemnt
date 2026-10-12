import api from './axios';
import type {
  StockRequest,
  PaginatedResponse,
  CreateStockRequestInput,
  DecideRequestInput,
} from '../types';

export async function listRequests(params?: {
  page?: number;
}): Promise<PaginatedResponse<StockRequest>> {
  const response = await api.get<PaginatedResponse<StockRequest>>('/requests/', { params });
  return response.data;
}

export async function getRequest(id: number): Promise<StockRequest> {
  const response = await api.get<StockRequest>(`/requests/${id}/`);
  return response.data;
}

export async function createRequest(data: CreateStockRequestInput): Promise<StockRequest> {
  const response = await api.post<StockRequest>('/requests/', data);
  return response.data;
}

export async function withdrawRequest(id: number): Promise<StockRequest> {
  const response = await api.post<StockRequest>(`/requests/${id}/withdraw/`);
  return response.data;
}

export async function decideRequest(
  id: number,
  data: DecideRequestInput
): Promise<StockRequest> {
  const response = await api.post<StockRequest>(`/requests/${id}/decide/`, data);
  return response.data;
}
