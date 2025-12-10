// src/types/store.ts

// =============================================================================
// TYPES FONDAMENTAUX
// =============================================================================

// Types pour l'adresse
export interface AddressDetails {
  id: number;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  full_address: string;
  created_at?: string;
  updated_at?: string;
}

// Types pour les horaires d'ouverture
export interface OpeningHours {
  monday?: { open: string; close: string };
  tuesday?: { open: string; close: string };
  wednesday?: { open: string; close: string };
  thursday?: { open: string; close: string };
  friday?: { open: string; close: string };
  saturday?: { open: string; close: string };
  sunday?: { open: string; close: string };
}

// Types pour la configuration du store
export interface StoreConfiguration {
  currency?: string;
  timezone?: string;
  language?: string;
  tax_rate?: number;
  shipping_enabled?: boolean;
  reservation_enabled?: boolean;
  [key: string]: any;
}

// =============================================================================
// TYPES PRINCIPAUX
// =============================================================================

// Type principal pour un store
export interface Store {
  id: number;
  name: string;
  slug: string;
  store_type: number | null;
  store_type_name: string | null;
  network: number | null;
  network_name: string | null;
  address: number | null;
  address_details: AddressDetails | null;
  phone: string | null;
  email: string | null;
  opening_hours: OpeningHours;
  is_active: boolean;
  logo: string | null;
  banner: string | null;
  slogan: string;
  description?: string;
  configuration: StoreConfiguration;
  created_at: string;
  updated_at: string;
  total_employees: number;
  total_products: number;
  total_customers?: number;
  monthly_revenue?: number;
}

// Type pour le formulaire de création/modification
export interface StoreFormData {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  store_type?: number;
  network?: number;
  slogan?: string;
  description?: string;
  configuration?: StoreConfiguration;
  opening_hours?: OpeningHours;
  is_active?: boolean;
}

// Type pour les statistiques
export interface StoreStats {
  total: number;
  active: number;
  inactive: number;
  totalEmployees: number;
  totalProducts: number;
  totalCustomers?: number;
  totalRevenue?: number;
  averageEmployees: number;
  monthlyGrowth: number;
  storesByType?: { [key: string]: number };
  storesByRegion?: { [key: string]: number };
}

// Type pour les types de store
export interface StoreType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stores_count?: number;
}

// Type pour les réseaux de store
export interface StoreNetwork {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stores_count?: number;
  contact_email?: string;
  contact_phone?: string;
}

// =============================================================================
// TYPES POUR LES DONNÉES ASSOCIÉES
// =============================================================================

// Types pour les employés
export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position: string;
  is_active: boolean;
  store: number;
  store_name?: string;
  hire_date: string;
  created_at: string;
  updated_at: string;
}

// Types pour les produits
export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  price: number;
  cost_price?: number;
  quantity: number;
  category: number;
  category_name?: string;
  store: number;
  store_name?: string;
  is_active: boolean;
  image?: string;
  barcode?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les clients
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: AddressDetails;
  store: number;
  store_name?: string;
  total_orders?: number;
  total_spent?: number;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
}

// Types pour les commandes
export interface Order {
  id: number;
  order_number: string;
  customer: number;
  customer_name?: string;
  store: number;
  store_name?: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  order_items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// =============================================================================
// TYPES POUR LES RAPPORTS ET ANALYTIQUES
// =============================================================================

// Types pour les rapports
export interface SalesReport {
  period: string;
  total_sales: number;
  total_orders: number;
  average_order_value: number;
  top_products: { product: string; quantity: number; revenue: number }[];
  sales_by_hour?: { [key: string]: number };
  sales_by_day?: { [key: string]: number };
}

export interface InventoryReport {
  low_stock_products: Product[];
  out_of_stock_products: Product[];
  total_inventory_value: number;
  inventory_turnover: number;
}

// Types pour les graphiques et dashboard
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface DashboardStats {
  total_stores: number;
  total_employees: number;
  total_products: number;
  total_customers: number;
  total_revenue: number;
  active_orders: number;
  low_stock_products: number;
  monthly_growth: number;
}

// =============================================================================
// TYPES POUR LA GESTION DES DONNÉES
// =============================================================================

// Types pour la pagination
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
  total_pages?: number;
  current_page?: number;
}

// Types pour les filtres
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

// Types pour le tri
export type StoreSortField = 'name' | 'created_at' | 'updated_at' | 'total_employees' | 'total_products' | 'city' | 'is_active';
export type SortOrder = 'asc' | 'desc';

// Types pour les états du composant
export type StatusFilter = 'all' | 'active' | 'inactive';

// =============================================================================
// TYPES POUR L'AUTHENTIFICATION ET UTILISATEURS
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
  stores?: number[]; // IDs des stores associées
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Types pour les formulaires d'authentification
export interface LoginFormData {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  last_name: string;
}

export interface PasswordResetFormData {
  email: string;
}

export interface PasswordResetConfirmFormData {
  password: string;
  password_confirmation: string;
  token: string;
  uid: string;
}

// =============================================================================
// TYPES POUR LES RÉPONSES ET ERREURS API
// =============================================================================

// Types génériques pour les réponses API
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface ListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Types pour les réponses d'erreur
export interface ApiError {
  code: string;
  message: string;
  details?: { [key: string]: string[] };
  status: number;
}

export interface ValidationError {
  [field: string]: string[];
}

// =============================================================================
// TYPES POUR LES COMPOSANTS
// =============================================================================

// Types pour les props des composants
export interface StoreCardProps {
  store: Store;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
  onToggleStatus: (storeId: number) => void;
  className?: string;
}

export interface StoreFormProps {
  store?: Store;
  onSubmit: (data: StoreFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface StoreTableProps {
  stores: Store[];
  loading?: boolean;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
  onToggleStatus: (storeId: number) => void;
  sortBy: StoreSortField;
  sortOrder: SortOrder;
  onSort: (field: StoreSortField) => void;
}

export interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onRefresh: () => void;
  storeTypes: StoreType[];
  storeNetworks: StoreNetwork[];
  selectedStoreType?: number;
  onStoreTypeChange: (value?: number) => void;
  selectedNetwork?: number;
  onNetworkChange: (value?: number) => void;
}

// =============================================================================
// TYPES POUR LES HOOKS ET CONTEXTES
// =============================================================================

// Types pour les hooks
export interface UseStoresReturn {
  stores: Store[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
  createStore: (data: StoreFormData) => Promise<void>;
  updateStore: (id: number, data: StoreFormData) => Promise<void>;
  deleteStore: (id: number) => Promise<void>;
  toggleStoreStatus: (id: number, isActive: boolean) => Promise<void>;
}

export interface UseStoreStatsReturn {
  stats: StoreStats;
  loading: boolean;
  error: ApiError | null;
  refetch: () => void;
}

// Types pour les contextes
export interface AppContextType {
  user: User | null;
  stores: Store[];
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  loading: boolean;
  refreshData: () => void;
}

// =============================================================================
// TYPES DIVERS
// =============================================================================

// Types pour les événements
export interface StoreEvent {
  id: number;
  title: string;
  description: string;
  event_type: 'maintenance' | 'promotion' | 'closure' | 'other';
  store: number;
  store_name?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Types pour les paramètres
export interface StoreSettings {
  id: number;
  store: number;
  notifications_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  auto_backup: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  low_stock_alert: number;
  created_at: string;
  updated_at: string;
}

// Types pour les notifications
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  action_url?: string;
  action_text?: string;
}

// Types pour les permissions
export interface Permission {
  id: number;
  name: string;
  codename: string;
  content_type: number;
}

export interface UserPermission {
  user: number;
  permissions: Permission[];
  store_permissions: { [storeId: number]: string[] };
}

// Types pour les logs d'activité
export interface ActivityLog {
  id: number;
  user: number;
  user_name?: string;
  action: string;
  model: string;
  object_id: number;
  object_repr: string;
  changes: Record<string, any>;
  ip_address: string;
  timestamp: string;
}

// Types pour les utilitaires
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  include: ('stores' | 'employees' | 'products' | 'customers')[];
  filters?: StoreFilters;
  start_date?: string;
  end_date?: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; errors: string[] }[];
  file_name: string;
}

// Types pour les uploads de fichiers
export interface FileUpload {
  id: number;
  file: string;
  file_name: string;
  file_size: number;
  file_type: string;
  uploaded_by: number;
  uploaded_at: string;
  description?: string;
}

// =============================================================================
// TYPES POUR LES ÉTATS DE L'APPLICATION
// =============================================================================

// État global pour la gestion des stores
export interface StoreState {
  stores: Store[];
  currentStore: Store | null;
  loading: boolean;
  error: string | null;
  filters: StoreFilters;
  stats: StoreStats | null;
}

// Actions pour le reducer des stores
export type StoreAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_STORES'; payload: Store[] }
  | { type: 'SET_CURRENT_STORE'; payload: Store | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTERS'; payload: StoreFilters }
  | { type: 'SET_STATS'; payload: StoreStats }
  | { type: 'ADD_STORE'; payload: Store }
  | { type: 'UPDATE_STORE'; payload: Store }
  | { type: 'DELETE_STORE'; payload: number };

// =============================================================================
// TYPES POUR LES FORMULAIRES AVANCÉS
// =============================================================================

// Types pour les formulaires de recherche avancée
export interface AdvancedSearchFilters {
  name?: string;
  city?: string;
  country?: string;
  store_type?: number[];
  network?: number[];
  is_active?: boolean;
  created_after?: string;
  created_before?: string;
  has_employees?: boolean;
  min_employees?: number;
  max_employees?: number;
  min_products?: number;
  max_products?: number;
}

// Types pour les formulaires d'import/export
export interface ImportStoreData {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  store_type?: string;
  network?: string;
  is_active?: boolean;
}

// =============================================================================
// TYPES POUR LES RÉPONSES API SPÉCIFIQUES
// =============================================================================

// Réponses API pour les endpoints courants
export interface StoreListResponse extends PaginatedResponse<Store> {}
export interface EmployeeListResponse extends PaginatedResponse<Employee> {}
export interface ProductListResponse extends PaginatedResponse<Product> {}
export interface CustomerListResponse extends PaginatedResponse<Customer> {}
export interface OrderListResponse extends PaginatedResponse<Order> {}

// Réponses pour les statistiques
export interface StoreStatsResponse {
  stats: StoreStats;
  period: string;
  comparison_period?: string;
  growth_rate?: number;
}

// =============================================================================
// TYPES POUR LES PARAMÈTRES D'API
// =============================================================================

// Paramètres pour les requêtes API
export interface ApiParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: any;
}

export interface StoreApiParams extends ApiParams {
  is_active?: boolean;
  store_type?: number;
  network?: number;
  city?: string;
  country?: string;
}