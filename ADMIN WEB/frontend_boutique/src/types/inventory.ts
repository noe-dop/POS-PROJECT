// src/types/inventory.ts

// =============================================================================
// TYPES DE BASE POUR L'AUDIT
// =============================================================================

export interface BaseAudit {
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// =============================================================================
// CONFIGURATIONS ET PARAMÈTRES
// =============================================================================

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
  applicable_categories: string[];
}

export interface SaleStatus {
  id: string;
  code: string;
  name: string;
  is_terminal: boolean;
}

export interface ReturnReason extends BaseAudit {
  id: string;
  code: string;
  name: string;
  description?: string;
  requires_approval: boolean;
  refund_percentage: number;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  requires_reference: boolean;
  fee_percentage: number;
}

// =============================================================================
// UTILISATEURS ET AUTHENTIFICATION
// =============================================================================

export interface UserType {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: string;
  user_type_name: string;
  phone: string;
  phone2?: string;
  address?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login?: string;
  updated_at: string;
}

export interface Owner {
  id: string;
  user: User;
  full_name: string;
  email: string;
  phone: string;
  photo?: string;
  created_at: string;
}

export interface Shareholder {
  id: string;
  user: User;
  user_id: string;
  full_name: string;
  investment_amount: number;
  photo?: string;
}

export interface Customer {
  id: string;
  user: User;
  user_id: string;
  full_name: string;
  birth_date?: string;
  preferences?: Record<string, any>;
  loyalty_points: number;
  total_spent: number;
  first_purchase?: string;
  last_purchase?: string;
  photo?: string;
}

// =============================================================================
// ADRESSES
// =============================================================================

export interface Address {
  id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  full_address: string;
}

// =============================================================================
// BOUTIQUES ET MAGASINS
// =============================================================================

export interface StoreType {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface StoreNetwork {
  id: string;
  name: string;
  headquarters?: string;
  headquarters_address?: Address;
  contact_email?: string;
  contact_phone?: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  store_type?: string;
  store_type_name?: string;
  network?: string;
  network_name?: string;
  address?: string;
  address_details?: Address;
  phone?: string;
  email?: string;
  opening_hours: Record<string, any>;
  is_active: boolean;
  logo?: string;
  banner?: string;
  slogan?: string;
  configuration: Record<string, any>;
  created_at: string;
  total_employees: number;
  total_products: number;
}

export interface StoreOwnership {
  id: string;
  store: string;
  store_name: string;
  owner: string;
  owner_name: string;
  is_primary: boolean;
  ownership_percentage: number;
}

export interface Department {
  id: string;
  store: string;
  store_name: string;
  name: string;
  manager?: string;
  manager_name?: string;
  description?: string;
}

// =============================================================================
// EMPLOYÉS ET RÔLES
// =============================================================================

export interface EmployeeRole {
  id: string;
  code: string;
  name: string;
  permissions: Record<string, any>;
  description?: string;
}

export interface Employee {
  id: string;
  user: User;
  user_id: string;
  store: string;
  store_name: string;
  department?: string;
  department_name?: string;
  role: string;
  role_name: string;
  full_name: string;
  hire_date: string;
  salary?: number;
  emergency_contact?: string;
  photo?: string;
  is_active: boolean;
}

// =============================================================================
// SESSIONS ET JOURNALISATION
// =============================================================================

export interface Session {
  id: string;
  user: string;
  user_name: string;
  store?: string;
  store_name?: string;
  device_info?: Record<string, any>;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
  duration?: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  user_name: string;
  session?: string;
  action: string;
  model_name?: string;
  object_id?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SousService {
  id: string;
  session: string;
  session_info: string;
  nom_du_service: string;
  start_service: string;
  end_service?: string;
  duration?: string;
}

// =============================================================================
// CARTES ET FIDÉLISATION
// =============================================================================

export interface TypeCard {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  num_card: string;
  type_card?: string;
  type_card_name?: string;
  client?: string;
  client_name?: string;
  client_email?: string;
  solde: number;
  max_credit: number;
  plafond: number;
  remise: number;
  statut: string;
  total_transactions: number;
}

export interface CardTransaction {
  id: string;
  card: string;
  card_number: string;
  type_transaction: 'depot' | 'achat' | 'retrait' | 'credit';
  type_transaction_display: string;
  montant: number;
  date_transaction: string;
  client_name?: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  store: string;
  store_name: string;
  points_per_amount: number;
  minimum_purchase: number;
  is_active: boolean;
  total_rewards: number;
}

export interface LoyaltyReward {
  id: string;
  program: string;
  program_name: string;
  name: string;
  points_required: number;
  discount_amount?: number;
  discount_percentage?: number;
  free_product?: string;
  free_product_name?: string;
}

// =============================================================================
// FOURNISSEURS ET APPROVISIONNEMENTS
// =============================================================================

export interface Supplier {
  id: string;
  store: string;
  store_name: string;
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person?: string;
  payment_terms?: string;
  total_supplies: number;
}

export interface Supply {
  id: string;
  store: string;
  store_name: string;
  ref_supply: string;
  supplier?: string;
  supplier_name?: string;
  total_command: number;
  utilisateur: string;
  utilisateur_name: string;
  date_supply: string;
  status: 'pending' | 'received' | 'cancelled';
  status_display: string;
  total_items: number;
}

export interface RetailSupply {
  id: string;
  ref: number;
  name_product: string;
  qt_add: number;
  total_pdx: number;
  supply: string;
  supply_reference: string;
}

// =============================================================================
// PRODUITS, CATÉGORIES ET MARQUES
// =============================================================================

export interface ProductCategory extends BaseAudit {
  id: string;
  name: string;
  slug: string;
  parent?: string;
  parent_name?: string;
  description?: string;
  image?: string;
  sort_order: number;
  children_count: number;
  products_count: number;
}

export interface ProductBrand extends BaseAudit {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  products_count: number;
}

export interface Product extends BaseAudit {
  id: string;
  sku: string;
  name: string;
  category: string;
  category_name: string;
  brand?: string;
  brand_name?: string;
  supplier: string;
  supplier_name: string;
  cost_price: number;
  base_price: number;
  compare_at_price?: number;
  qt_item: number;
  jour_ecart: number;
  photo?: string;
  additional_images: string[];
  status: 'draft' | 'active' | 'archived';
  status_display: string;
  variants: ProductVariant[];
  total_variants: number;
  margin: number;
}

export interface ProductVariant extends BaseAudit {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  barcode: string;
  name: string;
  cost_price?: number;
  prix_vente?: number;
  prix_reduction?: number;
  quantity: number;
  weight?: number;
  selection: boolean;
  photo?: string;
  final_price: number;
}

// =============================================================================
// GESTION DES STOCKS - TYPES PRINCIPAUX POUR L'INVENTAIRE
// =============================================================================

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  address_details?: Address;
  store: string;
  store_name: string;
  capacity: number;
  is_active: boolean;
  current_usage: number;
}

export interface Batch {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  is_expired: boolean;
}

export interface Stock extends BaseAudit {
  id: string;
  product: Product;
  product_name: string;
  product_sku: string;
  store: string;
  store_name: string;
  warehouse?: string;
  warehouse_name?: string;
  quantity_package: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  ideal_stock_level: number;
  min_stock_threshold: number;
  qt_moy_appro: number;
  stock_turnover_rate: number;
  last_restocked?: string;
  is_low_stock: boolean;
  needs_restock: boolean;
}

export interface StockMovementItem extends BaseAudit {
  id: string;
  movement: string;
  product: string;
  product_name: string;
  variant?: string;
  variant_name?: string;
  batch?: string;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  unit_cost: number;
  total_value: number;
  batch_number?: string;
  expiry_date?: string;
  movement_type?: string;
}

export interface StockMovement extends BaseAudit {
  id: string;
  reference: string;
  store: string;
  store_name: string;
  movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'return' | 'loss';
  movement_type_display: string;
  related_object_type?: string;
  related_object_id?: string;
  movement_date: string;
  notes?: string;
  total_items: number;
  total_value: number;
  items: StockMovementItem[];
}

export interface InventoryCountItem extends BaseAudit {
  id: string;
  inventory_count: string;
  product: string;
  product_name: string;
  variant?: string;
  variant_name?: string;
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
}

export interface InventoryCount extends BaseAudit {
  id: string;
  reference: string;
  store: string;
  store_name: string;
  count_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  status_display: string;
  items: InventoryCountItem[];
  total_items_counted: number;
  total_discrepancies: number;
  discrepancy_value: number;
}

export interface StoreProduct extends BaseAudit {
  id: string;
  store: string;
  store_name: string;
  product: string;
  product_name: string;
  product_sku: string;
  store_cost_price?: number;
  store_base_price?: number;
  store_compare_at_price?: number;
  dlv?: string;
  dlc?: string;
  dcr?: string;
  is_active: boolean;
  display_order: number;
  min_stock_threshold?: number;
  reorder_quantity?: number;
  effective_cost_price: number;
  effective_base_price: number;
  margin: number;
  is_promotion_active: boolean;
}

export interface StoreProductVariant extends BaseAudit {
  id: string;
  store_product: string;
  store_product_name: string;
  variant: string;
  variant_name: string;
  store_variant_cost?: number;
  store_variant_price?: number;
  effective_cost: number;
  effective_price: number;
}

// =============================================================================
// CAISSES ET SESSIONS DE CAISSE
// =============================================================================

export interface CashRegister {
  id: string;
  store: string;
  store_name: string;
  name: string;
  code: string;
  location?: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  active_sessions: number;
}

export interface CashRegisterSession {
  id: string;
  cash_register: string;
  cash_register_name: string;
  employee: string;
  employee_name: string;
  session: string;
  store_name: string;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed' | 'suspended';
  status_display: string;
  opening_balance: number;
  expected_balance: number;
  actual_balance: number;
  difference: number;
  total_sales: number;
  total_returns: number;
  total_transactions: number;
  espece_balance: number;
  wave_balance: number;
  om_balance: number;
  cb_balance: number;
  momo_balance: number;
  moovm_balance: number;
  versement_balance: number;
  total_mobile: number;
  total_sales_amount: number;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  duration?: string;
}

export interface CashTransaction {
  id: string;
  session: string;
  session_reference: string;
  cash_register_name: string;
  transaction_type: 'open' | 'sale' | 'return' | 'payment' | 'withdrawal' | 'deposit' | 'close';
  transaction_type_display: string;
  reference: string;
  amount: number;
  currency?: string;
  currency_code?: string;
  payment_method?: string;
  payment_method_name?: string;
  payment_reference?: string;
  sale?: string;
  customer?: string;
  customer_name?: string;
  employee_name: string;
  notes?: string;
  transaction_time: string;
  created_by?: string;
  created_by_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// VENTES ET PAIEMENTS
// =============================================================================

export interface SaleItem {
  id: string;
  sale: string;
  product: string;
  product_name: string;
  product_sku: string;
  variant?: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

export interface SalePayment {
  id: string;
  sale: string;
  payment_method: string;
  payment_method_name: string;
  amount: number;
  reference?: string;
  is_confirmed: boolean;
  notes?: string;
  payment_date: string;
  processed_by: string;
  processed_by_name: string;
}

export interface Sale {
  id: string;
  store: string;
  store_name: string;
  ticket_number: string;
  customer?: string;
  customer_name?: string;
  employee: string;
  employee_name: string;
  caisse: string;
  caisse_name: string;
  cash_session?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status?: string;
  status_name?: string;
  is_delivery: boolean;
  delivery_address?: string;
  delivery_fee: number;
  notes?: string;
  sale_date: string;
  items: SaleItem[];
  payments: SalePayment[];
  total_paid: number;
  remaining_amount: number;
  is_fully_paid: boolean;
}

// =============================================================================
// TYPES SPÉCIFIQUES POUR LA PAGE INVENTAIRE
// =============================================================================

export interface InventoryItem {
  id: string;
  product: Product;
  stock: Stock;
  variant?: ProductVariant;
  batch?: Batch;
}

export interface InventoryStats {
  total_items: number;
  out_of_stock: number;
  low_stock: number;
  total_value: number;
  need_restock: number;
  total_products: number;
  total_variants: number;
}

export interface InventoryFilters {
  search?: string;
  category?: string;
  store?: string;
  status?: 'all' | 'low' | 'out' | 'over' | 'normal';
  brand?: string;
  supplier?: string;
  page?: number;
  page_size?: number;
}

export interface StockAdjustment {
  product_id: string;
  variant_id?: string;
  quantity_change: number;
  adjustment_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'return' | 'loss';
  reason: string;
  notes?: string;
  movement_date?: string;
}

// =============================================================================
// RÉPONSES PAGINÉES
// =============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =============================================================================
// TYPES POUR LES FORMULAIRES
// =============================================================================

export interface ProductFormData {
  name: string;
  category: string;
  brand?: string;
  supplier: string;
  cost_price: number;
  base_price: number;
  compare_at_price?: number;
  qt_item: number;
  jour_ecart: number;
  photo?: File | string;
  status: 'draft' | 'active' | 'archived';
}

export interface StockAdjustmentFormData {
  product_id: string;
  variant_id?: string;
  quantity_change: number;
  adjustment_type: string;
  reason: string;
  notes?: string;
}

// =============================================================================
// TYPES POUR LES RAPPORTS ET STATISTIQUES
// =============================================================================

export interface InventoryReport {
  period: string;
  total_products: number;
  total_value: number;
  stock_turnover: number;
  out_of_stock_count: number;
  low_stock_count: number;
  expiring_products: number;
}

export interface StockAlert {
  type: 'out_of_stock' | 'low_stock' | 'expiring' | 'over_stock';
  product: Product;
  stock: Stock;
  variant?: ProductVariant;
  batch?: Batch;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

// =============================================================================
// UTILITAIRES ET GARDIENS DE TYPE
// =============================================================================

export type StockStatus = 'out-of-stock' | 'low-stock' | 'over-stock' | 'in-stock';

export const isLowStock = (stock: Stock): boolean => 
  stock.quantity_available <= stock.min_stock_threshold && stock.quantity_available > 0;

export const isOutOfStock = (stock: Stock): boolean => 
  stock.quantity_available === 0;

export const isOverStock = (stock: Stock): boolean => 
  stock.quantity_available > stock.ideal_stock_level;

export const getStockStatus = (stock: Stock): StockStatus => {
  if (isOutOfStock(stock)) return 'out-of-stock';
  if (isLowStock(stock)) return 'low-stock';
  if (isOverStock(stock)) return 'over-stock';
  return 'in-stock';
};

// Gardiens de type
export const isProduct = (item: any): item is Product => {
  return item && typeof item === 'object' && 'sku' in item && 'name' in item;
};

export const isStock = (item: any): item is Stock => {
  return item && typeof item === 'object' && 'quantity_on_hand' in item && 'quantity_available' in item;
};

export const isInventoryItem = (item: any): item is InventoryItem => {
  return item && typeof item === 'object' && isProduct(item.product) && isStock(item.stock);
};