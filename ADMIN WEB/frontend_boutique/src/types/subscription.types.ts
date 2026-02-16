// src/types/subscription.types.ts
export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: 'EUR' | 'XOF' | 'USD';
  features: string[];
  max_stores: number;
  max_users: number;
  max_products: number;
  analytics: boolean;
  support_level: 'basic' | 'priority' | 'dedicated';
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  store: number;
  plan: SubscriptionPlan;
  owner: number | null;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'trial';
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  cancelled_at: string | null;
  auto_renew: boolean;
  billing_cycle: 'monthly' | 'yearly';
  payment_method: string;
  next_billing_date: string | null;
  last_billing_date: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface SubscriptionInvoice {
  id: number;
  subscription: number;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  billing_period_start: string;
  billing_period_end: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_at: string | null;
  payment_method: string;
  transaction_id: string;
  invoice_file: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionLimit {
  id: number;
  subscription: number;
  resource_type: 'stores' | 'employees' | 'products' | 'customers';
  current_usage: number;
  max_allowed: number;
  updated_at: string;
}

// Pour créer un abonnement
export interface CreateSubscriptionDto {
  plan_id: number;
  billing_cycle: 'monthly' | 'yearly';
  store_id: number;
  payment_method_id?: number;
}

// Pour mettre à jour un abonnement
export interface UpdateSubscriptionDto {
  auto_renew?: boolean;
  payment_method_id?: number;
  billing_cycle?: 'monthly' | 'yearly';
}