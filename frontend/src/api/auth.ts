import axios from 'axios';
import type { LoginCredentials, AuthTokens } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const response = await axios.post<AuthTokens>(`${BASE_URL}/auth/login/`, credentials);
  return response.data;
}
