export interface Category {
  id: number;
  name: string;
  code: string;
  product_count: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  category: number;
  category_name: string;
  category_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductFilters {
  search?: string;
  category?: number | '';
  is_active?: boolean | '';
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: number;
  category: number;
  is_active: boolean;
}
