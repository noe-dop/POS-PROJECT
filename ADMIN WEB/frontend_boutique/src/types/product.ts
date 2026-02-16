// === TYPES DE BASE ===
export interface BaseModel {
  id: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata?: any;
}

export interface AuditModel extends BaseModel {
  created_by?: number;
  updated_by?: number;
}

// === DEVISE ===
export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
}

// === UTILISATEURS ===
export interface UserType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  phone: string;
  phone2?: string;
  address?: string;
  date_joined: string;
  updated_at: string;
}

export interface Owner {
  id: number;
  user: User;
  photo?: string;
  created_at: string;
}

export interface Shareholder {
  id: number;
  user: User;
  investment_amount: number;
  photo?: string;
}

export interface Customer {
  id: number;
  user: User;
  birth_date?: string;
  preferences?: any;
  loyalty_points: number;
  total_spent: number;
  first_purchase?: string;
  last_purchase?: string;
  photo?: string;
}

// === ADRESSES ===
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
}

// === BOUTIQUES ===
export interface StoreType {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface StoreNetwork {
  id: number;
  name: string;
  headquarters?: Address;
  contact_email?: string;
  contact_phone?: string;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  store_type?: StoreType;
  network?: StoreNetwork;
  address?: Address;
  phone?: string;
  email?: string;
  opening_hours: any;
  is_active: boolean;
  logo?: string;
  banner?: string;
  slogan?: string;
  configuration: any;
  created_at: string;
  owners: Owner[];
}

export interface StoreOwnership {
  id: number;
  store: Store;
  owner: Owner;
  is_primary: boolean;
  ownership_percentage: number;
}

export interface StoreShareholder {
  id: number;
  store: Store;
  shareholder: Shareholder;
  shares_percentage: number;
  investment_date: string;
}

export interface Department {
  id: number;
  store: Store;
  name: string;
  manager?: Employee;
  description?: string;
}

// === EMPLOYÉS ===
export interface EmployeeRole {
  id: number;
  code: string;
  name: string;
  permissions: any;
  description?: string;
}

export interface Employee {
  id: number;
  user: User;
  store: Store;
  department?: Department;
  role: EmployeeRole;
  hire_date: string;
  salary?: number;
  emergency_contact?: string;
  photo?: string;
  is_active: boolean;
}

// === SESSIONS ===
export interface Session {
  id: number;
  user: User;
  store?: Store;
  device_info?: any;
  login_time: string;
  logout_time?: string;
  ip_address?: string;
}

export interface ActivityLog {
  id: number;
  user: User;
  session?: Session;
  action: string;
  model_name?: string;
  object_id?: string;
  details?: any;
  timestamp: string;
}

export interface SousService {
  id: number;
  session: Session;
  nom_du_service: string;
  start_service: string;
  end_service?: string;
}

// === CARTES ET FIDÉLISATION ===
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
  type_card?: TypeCard;
  client?: Customer;
  solde: number;
  max_credit: number;
  plafond: number;
  remise: number;
  statut: string;
}

export interface CardTransaction {
  id: number;
  card: Card;
  type_transaction: 'depot' | 'achat' | 'retrait' | 'credit';
  montant: number;
  date_transaction: string;
}

export interface LoyaltyProgram {
  id: number;
  name: string;
  store: Store;
  points_per_amount: number;
  minimum_purchase: number;
  is_active: boolean;
}

export interface LoyaltyReward {
  id: number;
  program: LoyaltyProgram;
  name: string;
  points_required: number;
  discount_amount?: number;
  discount_percentage?: number;
  free_product?: Product;
}

// === FOURNISSEURS ===
export interface Supplier {
  phone: string;
  phone: string;
  is_active: undefined;
  store_name: string;
  id: number;
  store: Store;
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person: string;
  payment_terms: string;
}

export interface Supply {
  id: number;
  store: Store;
  ref_supply: string;
  supplier?: Supplier;
  total_command: number;
  utilisateur: Employee;
  date_supply: string;
  status: 'pending' | 'received' | 'cancelled';
}

export interface RetailSupply {
  id: number;
  ref: number;
  name_product: string;
  qt_add: number;
  total_pdx: number;
  supply: Supply;
}

// === PRODUITS, CATÉGORIES ET MARQUES ===
export interface ProductCategory extends AuditModel {
  name: string;
  slug: string;
  parent?: ProductCategory;
  description?: string;
  image?: string;
  sort_order: number;
}

export interface ProductBrand extends AuditModel {
  name: string;
  logo?: string;
  description?: string;
}

export interface Product extends AuditModel {
  [x: string]: any;
  sku: string;
  name: string;
  description: string;
  category: ProductCategory;
  brand?: ProductBrand;
  supplier: Supplier;
  cost_price: number;
  base_price: number;
  compare_at_price?: number;
  qt_item: number;
  jour_ecart: number;
  photo?: string;
  additional_images: string[];
  status: 'draft' | 'active' | 'archived';
  variants?: ProductVariant[];
  stocks?: Stock[];
  store_products?: StoreProduct[];
}

export interface ProductVariant extends AuditModel {
  product: Product;
  barcode: string;
  name: string;
  cost_price?: number;
  prix_vente?: number;
  prix_reduction?: number;
  quantity: number;
  weight?: number;
  selection: boolean;
  photo?: string;
}

// === GESTION DES STOCKS ===
export interface Warehouse {
  id: number;
  name: string;
  address?: Address;
  store: Store;
  capacity: number;
  is_active: boolean;
}

export interface Batch {
  id: number;
  product: Product;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
}

export interface Stock extends AuditModel {
  product: Product;
  store: Store;
  warehouse?: Warehouse;
  quantity_package: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  ideal_stock_level: number;
  min_stock_threshold: number;
  qt_moy_appro: number;
  stock_turnover_rate: number;
  last_restocked?: string;
}

export interface ReorderRule {
  id: number;
  product: Product;
  store: Store;
  min_quantity: number;
  max_quantity: number;
  reorder_quantity: number;
  is_active: boolean;
}

export interface StockMovement extends AuditModel {
  reference: string;
  store: Store;
  movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'return' | 'loss';
  related_object_type?: string;
  related_object_id?: string;
  movement_date: string;
  notes?: string;
  total_items: number;
  total_value: number;
  items?: StockMovementItem[];
}

export interface StockMovementItem extends AuditModel {
  movement: StockMovement;
  product: Product;
  variant?: ProductVariant;
  batch?: Batch;
  quantity_before: number;
  quantity_after: number;
  quantity_change: number;
  unit_cost: number;
  total_value: number;
  batch_number?: string;
  expiry_date?: string;
}

export interface InventoryCount extends AuditModel {
  store: Store;
  reference: string;
  count_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  total_items_counted: number;
  total_discrepancies: number;
  discrepancy_value: number;
  items?: InventoryCountItem[];
}

export interface InventoryCountItem extends AuditModel {
  inventory_count: InventoryCount;
  product: Product;
  variant?: ProductVariant;
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
}

// === PRODUITS PAR BOUTIQUE ===
export interface StoreProduct extends AuditModel {
  status: string;
  qt_item: number;
  store: Store;
  product: Product;
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
  store_variants?: StoreProductVariant[];
}

export interface StoreProductVariant extends AuditModel {
  store_product: StoreProduct;
  variant: ProductVariant;
  store_variant_cost?: number;
  store_variant_price?: number;
}

// === CAISSES ===
export interface CashRegister {
  id: number;
  store: Store;
  name: string;
  code: string;
  location: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  created_by?: User;
  updated_by?: User;
  created_at: string;
  updated_at: string;
}

export interface CashRegisterSession {
  id: number;
  cash_register: CashRegister;
  employee: Employee;
  session: Session;
  start_time: string;
  end_time?: string;
  status: 'open' | 'closed' | 'suspended';
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
  created_by?: User;
  updated_by?: User;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: number;
  session: CashRegisterSession;
  transaction_type: 'open' | 'sale' | 'return' | 'payment' | 'withdrawal' | 'deposit' | 'close';
  reference: string;
  amount: number;
  currency?: Currency;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  sale?: Sale;
  customer?: Customer;
  notes?: string;
  transaction_time: string;
  created_by?: User;
  updated_by?: User;
  created_at: string;
  updated_at: string;
}

// === VENTES ET PAIEMENTS ===
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

export interface Sale {
  id: number;
  store: Store;
  ticket_number: string;
  customer?: Customer;
  employee: Employee;
  caisse: CashRegister;
  cash_session?: CashRegisterSession;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: SaleStatus;
  is_delivery: boolean;
  delivery_address?: DeliveryAddress;
  delivery_fee: number;
  notes?: string;
  sale_date: string;
  items?: SaleItem[];
  payments?: SalePayment[];
  delivery?: Delivery;
}

export interface SalePayment {
  id: number;
  sale: Sale;
  payment_method: PaymentMethod;
  amount: number;
  reference?: string;
  is_confirmed: boolean;
  notes?: string;
  payment_date: string;
  processed_by: Employee;
}

export interface SaleItem {
  id: number;
  sale: Sale;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  unit_price: number;
  discount_rate: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

// === LIVRAISONS ===
export interface DeliveryAddress {
  id: number;
  customer: Customer;
  address: Address;
  title: string;
  is_primary: boolean;
  instructions?: string;
}

export interface DeliveryVehicle {
  id: number;
  store: Store;
  plate_number: string;
  vehicle_type: string;
  capacity: number;
  is_active: boolean;
}

export interface DeliveryRoute {
  id: number;
  name: string;
  store: Store;
  driver: Employee;
  vehicle: DeliveryVehicle;
  estimated_duration: string;
}

export interface Delivery {
  id: number;
  sale: Sale;
  delivery_address: DeliveryAddress;
  assigned_driver?: Employee;
  route?: DeliveryRoute;
  status: 'pending' | 'preparing' | 'on_way' | 'delivered' | 'cancelled';
  fee: number;
  estimated_time: string;
  actual_delivery_time?: string;
  customer_notes?: string;
  driver_notes?: string;
}

export interface DeliverySchedule {
  id: number;
  delivery: Delivery;
  route: DeliveryRoute;
  scheduled_time: string;
  actual_departure?: string;
  actual_arrival?: string;
}

// === RETOURS ET REMBOURSEMENTS ===
export interface ReturnReason extends AuditModel {
  code: string;
  name: string;
  description?: string;
  requires_approval: boolean;
  refund_percentage: number;
}

export interface ProductReturn extends AuditModel {
  return_number: string;
  original_sale: Sale;
  store: Store;
  customer: Customer;
  return_reason: ReturnReason;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'inspected' | 'refunded' | 'exchanged' | 'completed';
  return_date: string;
  total_refund_amount: number;
  restocking_fee: number;
  requested_by: Employee;
  approved_by?: Employee;
  approval_date?: string;
  notes?: string;
  items?: ReturnItem[];
  refund?: Refund;
}

export interface ReturnItem extends AuditModel {
  product_return: ProductReturn;
  sale_item: SaleItem;
  quantity_sold: number;
  quantity_returned: number;
  unit_price: number;
  refund_amount: number;
  condition: 'new' | 'opened' | 'damaged' | 'defective';
  inspection_notes?: string;
  is_restockable: boolean;
}

export interface Refund extends AuditModel {
  product_return: ProductReturn;
  refund_number: string;
  refund_method: PaymentMethod;
  refund_amount: number;
  refund_date: string;
  processed_by: Employee;
  refund_reference?: string;
  notes?: string;
}

export interface ReturnedProduct {
  id: number;
  employee: Employee;
  sell: Sale;
  variant_code: string;
  quantity: number;
  reason: string;
  refund_amount: number;
  return_date: string;
}

// === TRANSACTIONS FINANCIÈRES ===
export interface Transaction {
  id: number;
  user: Employee;
  amount: number;
  type_transaction: 'vente' | 'depot' | 'retrait' | 'remboursement' | 'frais';
  description?: string;
  payment_method?: string;
  date_transaction: string;
}

export interface MobileMoney {
  id: number;
  number: string;
  amount: number;
  action: string;
  employee?: Employee;
  caisse_session: CashRegisterSession;
  date: string;
}

export interface Unite {
  id: number;
  number: number;
  amount: number;
  date: string;
  employee?: Employee;
}

export interface WithdrawalCode {
  id: number;
  code: string;
  amount: number;
  created_at: string;
  expires_at: string;
  status: 'unused' | 'used' | 'expired';
  employee?: Employee;
}

// === PROMOTIONS ET MARKETING ===
export interface Promotion {
  id: number;
  product?: Product;
  variante?: ProductVariant;
  discount: number;
  start_date: string;
  end_date: string;
  store?: Store;
}

export interface Campaign {
  id: number;
  name: string;
  store: Store;
  campaign_type: 'email' | 'sms' | 'social' | 'in_store';
  start_date: string;
  end_date: string;
  target_customers: Customer[];
  budget: number;
}

// === COMPTABILITÉ ===
export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  parent?: ExpenseCategory;
}

export interface Expense {
  id: number;
  store: Store;
  category: ExpenseCategory;
  amount: number;
  description: string;
  expense_date: string;
  receipt_number?: string;
  approved_by: Employee;
}

export interface TaxRate {
  id: number;
  name: string;
  rate: number;
  is_active: boolean;
  applicable_categories: ProductCategory[];
}

export interface AccountingPeriod extends AuditModel {
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at?: string;
  closed_by?: User;
}

export interface GeneralLedger extends AuditModel {
  period: AccountingPeriod;
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
}

export interface FinancialReport extends AuditModel {
  store?: Store;
  report_type: 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'sales' | 'inventory';
  period: AccountingPeriod;
  report_data: any;
  generated_at: string;
  generated_by: User;
  file_path?: string;
}

// === KPI ET TABLEAUX DE BORD ===
export interface KPI {
  id: number;
  name: string;
  code: string;
  description?: string;
  calculation_formula: string;
  target_value: number;
  unit: string;
}

export interface KPIMeasurement {
  id: number;
  kpi: KPI;
  store: Store;
  period_start: string;
  period_end: string;
  value: number;
}

export interface Dashboard {
  id: number;
  name: string;
  user: User;
  layout_config: any;
  is_default: boolean;
}

// === SÉCURITÉ ET MAINTENANCE ===
export interface SecurityIncident {
  id: number;
  store: Store;
  incident_type: 'theft' | 'fraud' | 'system_breach' | 'physical_breach';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reported_by: Employee;
  resolution_status: string;
}

export interface DataBackup {
  id: number;
  backup_type: 'full' | 'incremental' | 'differential';
  file_path: string;
  file_size: number;
  backup_date: string;
  is_verified: boolean;
}

export interface MaintenanceTask {
  id: number;
  store: Store;
  equipment: string;
  task_type: 'preventive' | 'corrective' | 'predictive';
  scheduled_date: string;
  completed_date?: string;
  assigned_to: Employee;
  status: string;
}

export interface SupportTicket {
  id: number;
  store: Store;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  created_by: Employee;
  assigned_to?: Employee;
}

// === RAPPORTS D'ERREUR ===
export interface ErrorReport {
  id: number;
  user?: Employee;
  message: string;
  traceback?: string;
  created_at: string;
  resolved: boolean;
}

// === TYPES POUR LES RÉPONSES API ===
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  average_margin: number;
  total_inventory_value: number;
  top_categories?: { category: ProductCategory; count: number; revenue: number }[];
  top_brands?: { brand: ProductBrand; count: number; revenue: number }[];
}

export interface StockAlert {
  product: Product;
  current_stock: number;
  min_threshold: number;
  alert_type: 'low_stock' | 'out_of_stock' | 'over_stock';
}

// === TYPES POUR LES FILTRES ===
export interface ProductFilter {
  category?: string;
  brand?: string;
  supplier?: number;
  status?: string;
  search?: string;
  low_stock?: boolean;
  store?: number;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface StockFilter {
  product?: number;
  store?: number;
  low_stock?: boolean;
  out_of_stock?: boolean;
  warehouse?: number;
  page?: number;
  page_size?: number;
}

// === TYPES POUR LES FORMULAIRES ===
export interface ProductFormData {
  search_vector: string;
  additional_images: {};
  metadata: {};
  is_active: boolean | undefined;
  category: any;
  sku: any;
  brand: boolean;
  supplier: number;
  supplier_name: boolean;
  supplier_store_name: string;
  store_products: boolean;
  type: any;
  name: string;
  description: string;
  category_id: number;
  brand_id?: number;
  supplier_id: number;
  cost_price: number;
  base_price: number;
  compare_at_price?: number;
  qt_item?: number;
  jour_ecart?: number;
  status?: 'draft' | 'active' | 'archived';
  photo?: File;
}

export interface ProductVariantFormData {
  product_id: number;
  barcode: string;
  name: string;
  cost_price?: number;
  prix_vente?: number;
  prix_reduction?: number;
  quantity: number;
  weight?: number;
  selection?: boolean;
  photo?: File;
}

// === TYPES POUR LES RÉSULTATS DE RECHERCHE ===
export interface SearchResults {
  products: Product[];
  categories: ProductCategory[];
  brands: ProductBrand[];
  total_count: number;
}

// === TYPES POUR LES RAPPORTS ===
export interface SalesReport {
  period: string;
  total_sales: number;
  total_products_sold: number;
  average_transaction: number;
  top_products: { product: Product; quantity: number; revenue: number }[];
}

export interface InventoryReport {
  total_products: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  stock_turnover_rate: number;
}

// === TYPES POUR LES NOTIFICATIONS ===
export interface StockNotification {
  id: number;
  product: Product;
  type: 'low_stock' | 'out_of_stock' | 'expiring_soon';
  message: string;
  created_at: string;
  is_read: boolean;
}

// === TYPES POUR LES IMPORT/EXPORT ===
export interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
  total: number;
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'excel';
  include_variants: boolean;
  include_stock: boolean;
  include_prices: boolean;
  filters?: ProductFilter;
}