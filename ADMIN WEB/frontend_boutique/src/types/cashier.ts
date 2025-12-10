// types/cashier.ts
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface Customer {
  id: number;
  user: User;
  loyalty_points: number;
  total_spent: number;
  first_purchase_date: string;
  last_purchase_date: string;
  preferred_store: number;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductVariant {
  id: number;
  name: string;
  barcode: string;
  prix_vente: number;
  prix_reduction: number;
  cost_price: number;
  quantity: number;
  weight: number;
  selection: boolean;
  photo: string | null;
  product: number;
}

export interface StoreProduct {
  id: number;
  store: number;
  product: number;
  store_base_price: number;
  store_compare_price: number;
  store_cost_price: number;
  quantity: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  dlv: string | null;
  dlc: string | null;
  dcr: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  cost_price: number;
  base_price: number;
  compare_at_price: number;
  category: Category;
  brand: any | null;
  supplier: any;
  variants: ProductVariant[];
  store_products: StoreProduct[];
  photo: string | null;
  additional_images: string[];
  status: string;
  qt_item: number;
  jour_ecart: number;
  is_active: boolean;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  requires_reference: boolean;
  requires_amount: boolean;
  fee_percentage: number;
  category: string;
}

export interface CashRegister {
  id: number;
  name: string;
  code: string;
  location: string;
  store: number;
  store_name: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  active_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: number;
  ticket_number: string;
  total_amount: number;
  created_at: string;
}