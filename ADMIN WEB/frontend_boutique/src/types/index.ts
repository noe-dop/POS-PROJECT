// =============================================================================
// TYPES DE BASE ET INTERFACES PRINCIPALES
// =============================================================================

export interface BaseModel {
  id: number;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface AuditModel extends BaseModel {
  created_by?: User | string;
  updated_by?: User | string;
}

export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =============================================================================
// UTILISATEURS ET AUTHENTIFICATION
// =============================================================================

export interface UserType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface User {
  permissions: any;
  role: string;
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: number | UserType;
  user_type_name?: string;
  phone: string;
  phone2?: string;
  address?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login?: string;
  updated_at: string;
  password?: string;
  password_confirm?: string;
}

export interface Owner {
  id: number;
  user: User;
  full_name?: string;
  email?: string;
  phone?: string;
  photo?: string;
  created_at: string;
}

export interface Shareholder {
  id: number;
  user: User;
  user_id?: number;
  full_name?: string;
  investment_amount: number;
  photo?: string;
}

export interface Customer {
  id: number;
  user: User;
  user_id?: number;
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
  id: number;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  full_address?: string;
}

// =============================================================================
// BOUTIQUES ET MAGASINS
// =============================================================================

export interface StoreType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface StoreNetwork {
  id: number;
  name: string;
  headquarters?: number | Address;
  headquarters_address?: Address;
  contact_email?: string;
  contact_phone?: string;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  store_type?: number | StoreType;
  store_type_name?: string;
  network?: number | StoreNetwork;
  network_name?: string;
  address?: number | Address;
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
  total_employees?: number;
  total_products?: number;
}

export interface StoreOwnership {
  id: number;
  store: number | Store;
  store_name?: string;
  owner: number | Owner;
  owner_name?: string;
  is_primary: boolean;
  ownership_percentage: number;
}

export interface StoreShareholder {
  id: number;
  store: number | Store;
  store_name?: string;
  shareholder: number | Shareholder;
  shareholder_name?: string;
  shares_percentage: number;
  investment_date: string;
}

export interface Department {
  id: number;
  store: number | Store;
  store_name?: string;
  name: string;
  manager?: number | Employee;
  manager_name?: string;
  description?: string;
}

// =============================================================================
// EMPLOYÉS ET RÔLES
// =============================================================================

export interface EmployeeRole {
  id: number;
  code: string;
  name: string;
  permissions: Record<string, any>;
  description?: string;
}

export interface Employee {
  id: number;
  user: User;
  user_id?: number;
  store: number | Store;
  store_name?: string;
  department?: number | Department;
  department_name?: string;
  role: number | EmployeeRole;
  role_name?: string;
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
  id: number;
  user: number | User;
  user_name?: string;
  store?: number | Store;
  store_name?: string;
  device_info?: Record<string, any>;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
  duration?: string;
}

export interface ActivityLog {
  id: number;
  user: number | User;
  user_name?: string;
  session?: number | Session;
  action: string;
  model_name?: string;
  object_id?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SousService {
  id: number;
  session: number | Session;
  session_info?: string;
  nom_du_service: string;
  start_service: string;
  end_service?: string;
  duration?: string;
}

// =============================================================================
// CARTES ET FIDÉLISATION
// =============================================================================

export interface TypeCard {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  num_card: string;
  type_card?: number | TypeCard;
  type_card_name?: string;
  client?: number | Customer;
  client_name?: string;
  client_email?: string;
  solde: number;
  max_credit: number;
  plafond: number;
  remise: number;
  statut: string;
  total_transactions?: number;
}

export interface CardTransaction {
  id: number;
  card: number | Card;
  card_number?: string;
  client_name?: string;
  type_transaction: 'depot' | 'achat' | 'retrait' | 'credit';
  type_transaction_display?: string;
  montant: number;
  date_transaction: string;
}

export interface LoyaltyProgram {
  id: number;
  name: string;
  store: number | Store;
  store_name?: string;
  points_per_amount: number;
  minimum_purchase: number;
  is_active: boolean;
  total_rewards?: number;
}

export interface LoyaltyReward {
  id: number;
  program: number | LoyaltyProgram;
  program_name?: string;
  name: string;
  points_required: number;
  discount_amount?: number;
  discount_percentage?: number;
  free_product?: number | Product;
  free_product_name?: string;
}

// =============================================================================
// FOURNISSEURS ET APPROVISIONNEMENTS
// =============================================================================

export interface Supplier {
  id: number;
  store: number | Store;
  store_name?: string;
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person?: string;
  payment_terms?: string;
  total_supplies?: number;
}

export interface Supply {
  id: number;
  store: number | Store;
  store_name?: string;
  ref_supply: string;
  supplier?: number | Supplier;
  supplier_name?: string;
  total_command: number;
  utilisateur: number | Employee;
  utilisateur_name?: string;
  date_supply: string;
  status: 'pending' | 'received' | 'cancelled';
  status_display?: string;
  total_items?: number;
}

export interface RetailSupply {
  id: number;
  ref: number;
  name_product: string;
  qt_add: number;
  total_pdx: number;
  supply: number | Supply;
  supply_reference?: string;
}

// =============================================================================
// PRODUITS, CATÉGORIES ET MARQUES
// =============================================================================

export interface ProductCategory extends AuditModel {
  id: number;
  name: string;
  slug: string;
  parent?: number | ProductCategory;
  parent_name?: string;
  description?: string;
  image?: string;
  sort_order: number;
  children_count?: number;
  products_count?: number;
}

export interface ProductBrand extends AuditModel {
  id: number;
  name: string;
  logo?: string;
  description?: string;
  products_count?: number;
}

export interface ProductVariant extends AuditModel {
  id: number;
  product: number | Product;
  product_name?: string;
  product_sku?: string;
  barcode: string;
  name: string;
  cost_price?: number;
  prix_vente?: number;
  prix_reduction?: number;
  quantity: number;
  weight?: number;
  selection: boolean;
  photo?: string;
  final_price?: number;
}

export interface Product extends AuditModel {
  stocks: any;
  stocks: any;
  id: number;
  category: number | ProductCategory;
  category_name?: string;
  brand?: number | ProductBrand;
  brand_name?: string;
  supplier: number | Supplier;
  supplier_name?: string;
  sku: string;
  name: string;
  description?: string;
  cost_price: number;
  base_price: number;
  compare_at_price?: number;
  qt_item: number;
  jour_ecart: number;
  photo?: string;
  additional_images: string[];
  status: 'draft' | 'active' | 'archived';
  status_display?: string;
  variants?: ProductVariant[];
  total_variants?: number;
  margin?: number;
}

// =============================================================================
// GESTION DES STOCKS
// =============================================================================

export interface Warehouse {
  id: number;
  name: string;
  address?: number | Address;
  address_details?: Address;
  store: number | Store;
  store_name?: string;
  capacity: number;
  is_active: boolean;
  current_usage?: number;
}

export interface Batch {
  id: number;
  product: number | Product;
  product_name?: string;
  product_sku?: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  is_expired?: boolean;
}

export interface Stock extends AuditModel {
  id: number;
  product: number | Product;
  product_name?: string;
  product_sku?: string;
  store: number | Store;
  store_name?: string;
  warehouse?: number | Warehouse;
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
  is_low_stock?: boolean;
  needs_restock?: boolean;
}

export interface ReorderRule {
  id: number;
  product: number | Product;
  product_name?: string;
  store: number | Store;
  store_name?: string;
  min_quantity: number;
  max_quantity: number;
  reorder_quantity: number;
  is_active: boolean;
}

export interface StockMovementItem extends AuditModel {
  id: number;
  movement: number | StockMovement;
  product: number | Product;
  product_name?: string;
  variant?: number | ProductVariant;
  variant_name?: string;
  batch?: number | Batch;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  unit_cost: number;
  total_value: number;
  batch_number?: string;
  expiry_date?: string;
  movement_type?: string;
}

export interface StockMovement extends AuditModel {
  id: number;
  reference: string;
  store: number | Store;
  store_name?: string;
  movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'return' | 'loss';
  movement_type_display?: string;
  related_object_type?: string;
  related_object_id?: string;
  movement_date: string;
  notes?: string;
  total_items: number;
  total_value: number;
  items?: StockMovementItem[];
}

export interface InventoryCountItem extends AuditModel {
  id: number;
  inventory_count: number | InventoryCount;
  product: number | Product;
  product_name?: string;
  variant?: number | ProductVariant;
  variant_name?: string;
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
}

export interface InventoryCount extends AuditModel {
  id: number;
  store: number | Store;
  store_name?: string;
  reference: string;
  count_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  status_display?: string;
  total_items_counted: number;
  total_discrepancies: number;
  discrepancy_value: number;
  items?: InventoryCountItem[];
}

export interface StoreProduct extends AuditModel {
  id: number;
  store: number | Store;
  store_name?: string;
  product: number | Product;
  product_name?: string;
  product_sku?: string;
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
  effective_cost_price?: number;
  effective_base_price?: number;
  margin?: number;
  is_promotion_active?: boolean;
}

export interface StoreProductVariant extends AuditModel {
  id: number;
  store_product: number | StoreProduct;
  store_product_name?: string;
  variant: number | ProductVariant;
  variant_name?: string;
  store_variant_cost?: number;
  store_variant_price?: number;
  effective_cost?: number;
  effective_price?: number;
}

// =============================================================================
// CAISSES ET SESSIONS DE CAISSE
// =============================================================================

export interface CashRegister {
  id: number;
  store: number | Store;
  store_name?: string;
  name: string;
  code: string;
  location?: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  created_by?: number | User;
  created_by_name?: string;
  updated_by?: number | User;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  active_sessions?: number;
}

export interface CashRegisterSession {
  id: number;
  cash_register: number | CashRegister;
  cash_register_name?: string;
  employee: number | Employee;
  employee_name?: string;
  store_name?: string;
  session: number | Session;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed' | 'suspended';
  status_display?: string;
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
  created_by?: number | User;
  created_by_name?: string;
  updated_by?: number | User;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  duration?: string;
}

export interface CashTransaction {
  id: number;
  session: number | CashRegisterSession;
  session_reference?: string;
  cash_register_name?: string;
  employee_name?: string;
  transaction_type: 'open' | 'sale' | 'return' | 'payment' | 'withdrawal' | 'deposit' | 'close';
  transaction_type_display?: string;
  reference: string;
  amount: number;
  currency?: number | Currency;
  currency_code?: string;
  payment_method?: number | PaymentMethod;
  payment_method_name?: string;
  payment_reference?: string;
  sale?: number | Sale;
  customer?: number | Customer;
  customer_name?: string;
  notes?: string;
  transaction_time: string;
  created_by?: number | User;
  created_by_name?: string;
  updated_by?: number | User;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// VENTES ET PAIEMENTS
// =============================================================================

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  requires_reference: boolean;
  fee_percentage: number;
}

export interface SaleStatus {
  id: number;
  code: string;
  name: string;
  is_terminal: boolean;
}

export interface SaleItem {
  id: number;
  sale: number | Sale;
  product: number | Product;
  product_name?: string;
  product_sku?: string;
  variant?: number | ProductVariant;
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
  id: number;
  sale: number | Sale;
  payment_method: number | PaymentMethod;
  payment_method_name?: string;
  amount: number;
  reference?: string;
  is_confirmed: boolean;
  notes?: string;
  payment_date: string;
  processed_by: number | Employee;
  processed_by_name?: string;
}

export interface Sale {
  id: number;
  store: number | Store;
  store_name?: string;
  ticket_number: string;
  customer?: number | Customer;
  customer_name?: string;
  employee: number | Employee;
  employee_name?: string;
  caisse: number | CashRegister;
  caisse_name?: string;
  cash_session?: number | CashRegisterSession;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status?: number | SaleStatus;
  status_name?: string;
  is_delivery: boolean;
  delivery_address?: number | DeliveryAddress;
  delivery_fee: number;
  notes?: string;
  sale_date: string;
  items?: SaleItem[];
  payments?: SalePayment[];
  total_paid?: number;
  remaining_amount?: number;
  is_fully_paid?: boolean;
}

// =============================================================================
// LIVRAISONS
// =============================================================================

export interface DeliveryAddress {
  id: number;
  customer: number | Customer;
  customer_name?: string;
  address: number | Address;
  full_address?: string;
  title: string;
  is_primary: boolean;
  instructions?: string;
}

export interface DeliveryVehicle {
  id: number;
  store: number | Store;
  store_name?: string;
  plate_number: string;
  vehicle_type: string;
  capacity: number;
  is_active: boolean;
}

export interface DeliveryRoute {
  id: number;
  name: string;
  store: number | Store;
  store_name?: string;
  driver: number | Employee;
  driver_name?: string;
  vehicle: number | DeliveryVehicle;
  vehicle_plate?: string;
  estimated_duration: string;
}

export interface Delivery {
  id: number;
  sale: number | Sale;
  sale_ticket?: string;
  customer_name?: string;
  delivery_address: number | DeliveryAddress;
  delivery_address_full?: string;
  assigned_driver?: number | Employee;
  assigned_driver_name?: string;
  route?: number | DeliveryRoute;
  route_name?: string;
  status: 'pending' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  status_display?: string;
  fee: number;
  estimated_time: string;
  actual_delivery_time?: string;
  customer_notes?: string;
  driver_notes?: string;
}

export interface DeliverySchedule {
  id: number;
  delivery: number | Delivery;
  delivery_info?: string;
  route: number | DeliveryRoute;
  route_name?: string;
  scheduled_time: string;
  actual_departure?: string;
  actual_arrival?: string;
}

// =============================================================================
// RETOURS ET REMBOURSEMENTS
// =============================================================================

export interface ReturnReason extends AuditModel {
  id: number;
  code: string;
  name: string;
  description?: string;
  requires_approval: boolean;
  refund_percentage: number;
}

export interface ReturnItem extends AuditModel {
  id: number;
  product_return: number | ProductReturn;
  sale_item: number | SaleItem;
  product_name?: string;
  variant_name?: string;
  quantity_sold: number;
  quantity_returned: number;
  unit_price: number;
  refund_amount: number;
  condition: 'new' | 'opened' | 'damaged' | 'defective';
  condition_display?: string;
  inspection_notes?: string;
  is_restockable: boolean;
}

export interface ProductReturn extends AuditModel {
  id: number;
  return_number: string;
  original_sale: number | Sale;
  original_sale_ticket?: string;
  store: number | Store;
  store_name?: string;
  customer: number | Customer;
  customer_name?: string;
  return_reason: number | ReturnReason;
  return_reason_name?: string;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'inspected' | 'refunded' | 'exchanged' | 'completed';
  status_display?: string;
  return_date: string;
  total_refund_amount: number;
  restocking_fee: number;
  requested_by: number | Employee;
  requested_by_name?: string;
  approved_by?: number | Employee;
  approved_by_name?: string;
  approval_date?: string;
  notes?: string;
  items?: ReturnItem[];
}

export interface Refund extends AuditModel {
  id: number;
  product_return: number | ProductReturn;
  product_return_number?: string;
  refund_number: string;
  refund_method: number | PaymentMethod;
  refund_method_name?: string;
  refund_amount: number;
  refund_date: string;
  processed_by: number | Employee;
  processed_by_name?: string;
  refund_reference?: string;
  notes?: string;
}

export interface ReturnedProduct {
  id: number;
  employee: number | Employee;
  employee_name?: string;
  sell: number | Sale;
  sale_ticket?: string;
  variant_code: string;
  quantity: number;
  reason: string;
  refund_amount: number;
  return_date: string;
}

// =============================================================================
// TRANSACTIONS FINANCIÈRES
// =============================================================================

export interface Transaction {
  id: number;
  user: number | Employee;
  user_name?: string;
  amount: number;
  type_transaction: 'vente' | 'depot' | 'retrait' | 'remboursement' | 'frais';
  type_transaction_display?: string;
  description?: string;
  payment_method?: string;
  date_transaction: string;
}

export interface MobileMoney {
  id: number;
  number: string;
  amount: number;
  action: string;
  employee?: number | Employee;
  employee_name?: string;
  caisse_session: number | CashRegisterSession;
  caisse_session_info?: string;
  date: string;
}

export interface Unite {
  id: number;
  number: number;
  amount: number;
  date: string;
  employee?: number | Employee;
  employee_name?: string;
}

export interface WithdrawalCode {
  id: number;
  code: string;
  amount: number;
  created_at: string;
  expires_at: string;
  status: 'unused' | 'used' | 'expired';
  status_display?: string;
  employee?: number | Employee;
  employee_name?: string;
  is_expired?: boolean;
}

// =============================================================================
// PROMOTIONS ET MARKETING
// =============================================================================

export interface Promotion {
  id: number;
  product?: number | Product;
  product_name?: string;
  variante?: number | ProductVariant;
  variante_name?: string;
  discount: number;
  start_date: string;
  end_date: string;
  store?: number | Store;
  store_name?: string;
  is_active?: boolean;
}

export interface Campaign {
  id: number;
  name: string;
  store: number | Store;
  store_name?: string;
  campaign_type: 'email' | 'sms' | 'social' | 'in_store';
  campaign_type_display?: string;
  start_date: string;
  end_date: string;
  target_customers: number[] | Customer[];
  budget: number;
  target_customers_count?: number;
  is_active?: boolean;
}

// =============================================================================
// COMPTABILITÉ ET ANALYSE
// =============================================================================

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  parent?: number | ExpenseCategory;
  parent_name?: string;
  expenses_count?: number;
}

export interface Expense {
  id: number;
  store: number | Store;
  store_name?: string;
  category: number | ExpenseCategory;
  category_name?: string;
  amount: number;
  description: string;
  expense_date: string;
  receipt_number?: string;
  approved_by: number | Employee;
  approved_by_name?: string;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  is_active: boolean;
  applicable_categories: number[] | ProductCategory[];
}

export interface AccountingPeriod extends AuditModel {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string;
  closed_by?: number | User;
  closed_by_name?: string;
  created_by_name?: string;
}

export interface GeneralLedger extends AuditModel {
  id: number;
  period: number | AccountingPeriod;
  period_name?: string;
  entry_date: string;
  reference: string;
  account_number: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  source_document: string;
  source_id: string;
  account_details?: string;
}

export interface FinancialReport extends AuditModel {
  id: number;
  store?: number | Store;
  store_name?: string;
  report_type: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'sales' | 'inventory';
  report_type_display?: string;
  period: number | AccountingPeriod;
  period_name?: string;
  report_data: Record<string, any>;
  generated_at: string;
  generated_by: number | User;
  generated_by_name?: string;
  file_path?: string;
}

export interface KPI {
  id: number;
  name: string;
  code: string;
  description?: string;
  calculation_formula: string;
  target_value: number;
  unit: string;
  measurements_count?: number;
}

export interface KPIMeasurement {
  id: number;
  kpi: number | KPI;
  kpi_name?: string;
  store: number | Store;
  store_name?: string;
  period_start: string;
  period_end: string;
  value: number;
  achievement_rate?: number;
}

export interface Dashboard {
  id: number;
  name: string;
  user: number | User;
  user_name?: string;
  layout_config: Record<string, any>;
  is_default: boolean;
}

// =============================================================================
// SÉCURITÉ ET MAINTENANCE
// =============================================================================

export interface SecurityIncident {
  id: number;
  store: number | Store;
  store_name?: string;
  incident_type: 'theft' | 'fraud' | 'system_breach' | 'physical_breach';
  incident_type_display?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  severity_display?: string;
  reported_by: number | Employee;
  reported_by_name?: string;
  resolution_status: string;
}

export interface DataBackup {
  id: number;
  backup_type: 'full' | 'incremental' | 'differential';
  backup_type_display?: string;
  file_path: string;
  file_size: number;
  file_size_mb?: number;
  backup_date: string;
  is_verified: boolean;
}

export interface MaintenanceTask {
  id: number;
  store: number | Store;
  store_name?: string;
  equipment: string;
  task_type: 'preventive' | 'corrective' | 'predictive';
  task_type_display?: string;
  scheduled_date: string;
  completed_date?: string;
  assigned_to: number | Employee;
  assigned_to_name?: string;
  status: string;
  status_display?: string;
  is_overdue?: boolean;
}

export interface SupportTicket {
  id: number;
  store: number | Store;
  store_name?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priority_display?: string;
  status: string;
  status_display?: string;
  created_by: number | Employee;
  created_by_name?: string;
  assigned_to?: number | Employee;
  assigned_to_name?: string;
}

// =============================================================================
// GESTION DES ERREURS
// =============================================================================

export interface ErrorReport {
  id: number;
  user?: number | Employee;
  user_name?: string;
  message: string;
  traceback?: string;
  created_at: string;
  resolved: boolean;
}

// =============================================================================
// CONFIGURATIONS DIVERSES
// =============================================================================

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

// =============================================================================
// TYPES POUR LES FORMULAIRES ET REQUÊTES
// =============================================================================

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthResponse {
  refresh: any;
  access: any;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  address: string | undefined;
  phone: string;
  user_type: number | UserType;
  last_name: string;
  email: string;
  first_name: string;
  id: number;
  username: any;
  key: string;
  access_token: string;
  token: string;
  user: User;
  store?: Store;
}

export interface CreateUserData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: number;
  phone: string;
  phone2?: string;
  address?: string;
  password: string;
  password_confirm: string;
}

export interface CreateProductData {
  name: string;
  category: number;
  supplier: number;
  cost_price: number;
  base_price: number;
  description?: string;
  brand?: number;
  compare_at_price?: number;
  qt_item?: number;
  jour_ecart?: number;
  status?: 'draft' | 'active' | 'archived';
}

export interface CreateSaleData {
  store: number;
  customer?: number;
  employee: number;
  caisse: number;
  items: SaleItemData[];
  is_delivery?: boolean;
  delivery_address?: number;
  delivery_fee?: number;
  notes?: string;
}

export interface SaleItemData {
  product: number;
  variant?: number;
  quantity: number;
  unit_price: number;
  discount_rate?: number;
  tax_rate?: number;
}

// =============================================================================
// TYPES POUR LES FILTRES ET RECHERCHES
// =============================================================================

export interface ProductFilter {
  category?: number;
  brand?: number;
  supplier?: number;
  status?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  in_stock?: boolean;
}

export interface SaleFilter {
  store?: number;
  employee?: number;
  customer?: number;
  start_date?: string;
  end_date?: string;
  status?: number;
  min_amount?: number;
  max_amount?: number;
}

export interface StockFilter {
  store?: number;
  product?: number;
  category?: number;
  low_stock?: boolean;
  needs_restock?: boolean;
}

// =============================================================================
// TYPES POUR LES STATISTIQUES ET RAPPORTS
// =============================================================================

export interface SalesStats {
  total_sales: number;
  total_revenue: number;
  average_sale: number;
  total_customers: number;
  best_selling_products: Array<{
    product: Product;
    quantity_sold: number;
    revenue: number;
  }>;
  sales_by_period: Array<{
    period: string;
    sales: number;
    revenue: number;
  }>;
}

export interface InventoryStats {
  total_products: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  stock_turnover_rate: number;
}

export interface DashboardStats {
  sales: SalesStats;
  inventory: InventoryStats;
  customers: {
    total: number;
    new_this_month: number;
    loyal_customers: number;
  };
  financials: {
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  };
}
// Dans votre fichier @types (ex: src/types/index.ts)

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