// Database and API Response Types
export interface SupabaseResponse<T = unknown> {
  data: T | null;
  error: {
    message: string;
    details: string;
    hint: string;
    code: string;
  } | null;
  count?: number;
  status: number;
  statusText: string;
}

export interface DatabaseRow {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  column: string;
  ascending?: boolean;
}

export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
  statusCode?: number;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isSubmitting: boolean;
  errors: ValidationError[];
  success?: boolean;
}
