// src/types/auth.ts

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    user_type: number;
  };
  tokens?: {
    access: string;
    refresh: string;
  };
  message?: string;
}

export interface RegisterData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  password: string;
  password_confirm: string;
  user_type: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  user_type: number;
  is_active?: boolean;
  date_joined?: string;
}