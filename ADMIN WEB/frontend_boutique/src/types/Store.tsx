// src/types/store.ts

// =============================================================================
// TYPE PRINCIPAL POUR STORE - CORRESPOND EXACTEMENT AU JSON DE L'API
// =============================================================================

export interface Store {
  // Champs du JSON (tous requis)
  name: string;
  phone: string;
  email: string;
  slogan: string;
  store_type: number;
  network: number;
  is_active: boolean;
  configuration: Record<string, any>;
  opening_hours: Record<string, any>;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  
  // Champs supplémentaires probablement présents
  id?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// TYPE POUR LA CRÉATION/MODIFICATION
// =============================================================================

export interface StoreFormData {
  name: string;
  phone: string;
  email: string;
  slogan: string;
  store_type: number;
  network: number;
  is_active: boolean;
  configuration?: Record<string, any>;
  opening_hours?: Record<string, any>;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
}

// =============================================================================
// TYPES POUR LES FILTRES ET PAGINATION
// =============================================================================

export interface StoreFilters {
  search?: string;
  is_active?: boolean;
  store_type?: number;
  network?: number;
  city?: string;
  country?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =============================================================================
// TYPES POUR LES RÉPONSES API
// =============================================================================

export interface ApiError {
  message: string;
  details?: { [key: string]: string[] };
  status?: number;
}

// =============================================================================
// TYPES POUR L'AUTHENTIFICATION
// =============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string;
  date_joined: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginFormData {
  email: string;
  password: string;
  remember_me?: boolean;
}