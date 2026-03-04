// profile.types.ts

/**
 * Correspond exactement à la réponse de UserProfileView
 */
export interface UserProfile {
  success: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    address: string | null;
    is_staff: boolean;
    is_superuser: boolean;
    date_joined: string;
    last_login: string | null;
    
    // Rôle et profils spécifiques
    role?: 'owner' | 'employee' | 'shareholder' | 'customer' | 'user';
    
    // Owner profile
    owner_profile?: {
      id: number;
      photo: string | null;
      created_at: string;
    };
    
    // Employee profile
    employee_profile?: {
      id: number;
      store_id: number;
      store_name: string;
      role_id: number;
      role_name: string;
      department: string | null;
      hire_date: string;
      salary: number | null;
      is_active: boolean;
      photo: string | null;
    };
    
    // Shareholder profile
    shareholder_profile?: {
      id: number;
      investment_amount: number;
      photo: string | null;
    };
    
    // Customer profile
    customer_profile?: {
      id: number;
      birth_date: string | null;
      loyalty_points: number;
      total_spent: number;
      first_purchase: string | null;
      last_purchase: string | null;
      
      // Champs calculés/agrégés
      purchase_count?: number;
      average_basket?: number;
    };
  };
  
  // Profils à la racine (pour compatibilité)
  owner_profile?: UserProfile['user']['owner_profile'];
  employee_profile?: UserProfile['user']['employee_profile'];
  shareholder_profile?: UserProfile['user']['shareholder_profile'];
  customer_profile?: UserProfile['user']['customer_profile'];
}

/**
 * Correspond à la réponse de LoginView
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    is_staff: boolean;
    is_superuser: boolean;
    last_login: string | null;
    created_at: string;
    
    role?: string;
    
    // Owner
    owner_profile?: {
      id: number;
      photo: string | null;
      created_at: string;
    };
    
    // Employee
    employee_id?: number;
    store_id?: number;
    role_name?: string;
    department?: string | null;
    
    // Shareholder
    shareholder_id?: number;
    investment_amount?: number;
    
    // Customer
    customer_id?: number;
    loyalty_points?: number;
  };
  expires_in: number;
}

/**
 * Pour la mise à jour du profil
 */
export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  photo?: File;
  
  // Pour Customer
  birth_date?: string;
  
  // Pour Employee
  emergency_contact?: string;
}

/**
 * Pour le changement de mot de passe
 */
export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Réponse pour le changement de mot de passe
 */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Pour les préférences (à stocker dans Customer.preferences)
 */
export interface CustomerPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  darkMode: boolean;
  notifications: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    promotions: boolean;
  };
}

/**
 * Session utilisateur (depuis vos modèles)
 */
export interface UserSession {
  id: number;
  login_time: string;
  logout_time: string | null;
  device_info: Record<string, any> | null;
  ip_address: string | null;
  store: number | null;
}

/**
 * Activité utilisateur (depuis ActivityLog)
 */
export interface UserActivity {
  id: number;
  action: string;
  model_name: string | null;
  object_id: string | null;
  details: Record<string, any> | null;
  timestamp: string;
}

/**
 * Statistiques utilisateur
 */
export interface UserStats {
  total_logins: number;
  last_login_ip: string | null;
  total_sales?: number; // Pour employés
  total_orders?: number; // Pour clients
  loyalty_points?: number; // Pour clients
  total_spent?: number; // Pour clients
}

/**
 * Réponse API standard
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}