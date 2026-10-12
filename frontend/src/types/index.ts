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

export type UserRole = 'maker' | 'checker' | 'superadmin';

export interface Me {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
}

export type LineAction = 'stock_in' | 'new_product' | 'edit_product';
export type LineStatus = 'pending' | 'approved' | 'rejected';
export type RequestStatus =
  | 'pending'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'withdrawn';

export interface RequestLine {
  id: number;
  action: LineAction;
  product: number | null;
  product_name: string | null;
  quantity: string | null;
  unit_cost: string | null;
  supplier: string;
  proposed_name: string;
  proposed_price: string | null;
  proposed_stock: number | null;
  proposed_category: number | null;
  proposed_category_name: string | null;
  proposed_description: string;
  line_status: LineStatus;
  rejection_reason: string;
}

export interface StockRequest {
  id: number;
  status: RequestStatus;
  document_ref: string;
  remarks: string;
  created_by: number;
  created_by_username: string;
  decided_by: number | null;
  decided_by_username: string | null;
  created_at: string;
  decided_at: string | null;
  lines: RequestLine[];
  line_count?: number;
}

export interface RequestLineInput {
  action: LineAction;
  product?: number | null;
  quantity?: string;
  unit_cost?: string;
  supplier?: string;
  proposed_name?: string;
  proposed_price?: string;
  proposed_stock?: number;
  proposed_category?: number | null;
  proposed_description?: string;
}

export interface CreateStockRequestInput {
  document_ref?: string;
  remarks?: string;
  lines: RequestLineInput[];
}

export interface LineDecision {
  line_id: number;
  decision: 'approved' | 'rejected';
  rejection_reason?: string;
}

export interface DecideRequestInput {
  lines: LineDecision[];
  remarks?: string;
}
