export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_stores: number;
  max_users: number;
  max_products: number;
  analytics: boolean;
  support_level: 'basic' | 'priority' | 'dedicated';
  is_active: boolean;
  is_popular: boolean;
  trial_days: number;
  metadata?: Record<string, any>;
}

export interface CurrentSubscription {
  id: number;
  plan: SubscriptionPlan;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'past_due';
  start_date: string;
  end_date: string;
  trial_end: string | null;
  auto_renew: boolean;
  payment_method: string;
  next_billing_date: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  metadata?: Record<string, any>;
}

export interface BillingHistory {
  id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  payment_method: string;
  billing_date: string;
  due_date: string;
  invoice_url: string;
  invoice_number: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  billing_date: string;
  due_date: string;
  paid_date: string | null;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  pdf_url: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PaymentMethod {
  id: number;
  type: 'card' | 'bank_account' | 'mobile_money';
  brand: string;
  last4: string;
  expiry_month: number | null;
  expiry_year: number | null;
  is_default: boolean;
  created_at: string;
}

export interface CreateSubscriptionPayload {
  plan_id: number;
  billing_cycle: 'monthly' | 'yearly';
  payment_method_id?: number;
  coupon_code?: string;
  trial_period_days?: number;
}

export interface UpdateSubscriptionPayload {
  plan_id?: number;
  billing_cycle?: 'monthly' | 'yearly';
  auto_renew?: boolean;
  payment_method_id?: number;
}

export interface UsageStats {
  store_count: number;
  user_count: number;
  product_count: number;
  storage_used: number; // en MB
  storage_limit: number; // en MB
  usage_percentage: number;
}

export interface PaymentIntent {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_until: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
}