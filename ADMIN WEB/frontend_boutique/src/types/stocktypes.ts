// src/types/stock.types.ts - CORRIGÉ POUR SERIALIZERS DJANGO

// ==================== TYPES DE BASE ====================

export interface Address {
  id: number;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  full_address?: string; // Calculé
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  category: string;
  brand?: string;
  unit: string;
  cost_price: number;
  base_price: number; // Votre serializer utilise base_price
  tax_rate: number;
  weight?: number;
  dimensions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  status?: string; // Basé sur votre ProductSerializer
  margin?: number; // Calculé
  total_variants?: number;
}

export interface ProductVariant {
  id: number;
  product: Product;
  name: string;
  sku: string;
  barcode?: string;
  size?: string;
  color?: string;
  material?: string;
  additional_cost: number;
  selling_price_adjustment: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  final_price?: number; // Calculé
}

export interface Store {
  id: number;
  name: string;
  code?: string;
  slug?: string;
  store_type?: number;
  network?: number;
  address?: Address;
  phone?: string;
  email?: string;
  manager?: number;
  opening_hours?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  store_type_name?: string;
  network_name?: string;
  address_details?: Address;
  total_employees?: number;
  total_products?: number;
  pending_orders?: number;
}

export interface Warehouse {
  id: number;
  name: string;
  code?: string;
  store: Store;
  address?: Address;
  capacity: number;
  current_usage?: number; // Calculé
  temperature_zone?: string;
  is_active: boolean;
  manager_id?: number;
  created_at: string;
  updated_at: string;
  store_name?: string;
  address_details?: Address;
}

export interface Batch {
  id: number;
  product: Product;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  supplier_batch?: string;
  certificate_number?: string;
  storage_conditions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  product_name?: string;
  product_sku?: string;
  is_expired?: boolean; // Calculé
}

// ==================== STOCK ====================

export interface Stock {
  id: number;
  product?: Product; // Optionnel car votre serializer a product_name
  variant?: ProductVariant;
  store?: Store; // Optionnel car store_name
  warehouse?: Warehouse; // Optionnel car warehouse_name
  
  // Champs de votre StockSerializer
  product_name?: string;
  product_sku?: string;
  store_name?: string;
  warehouse_name?: string;
  
  // Quantités
  quantity_on_hand: number;
  quantity_reserved?: number;
  quantity_in_transit?: number;
  quantity_committed?: number;
  quantity_available?: number;
  
  // Seuils et niveaux
  min_stock_level: number;
  reorder_quantity?: number;
  max_stock_level?: number;
  safety_stock_level?: number;
  
  // Métriques
  stock_turnover_rate?: number;
  days_of_supply?: number;
  last_restocked?: string;
  last_sold?: string;
  average_daily_sales?: number;
  
  // Statut (basé sur vos champs)
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_low_stock: boolean;
  needs_restock: boolean;
  
  // Localisation
  location_aisle?: string;
  location_shelf?: string;
  location_bin?: string;
  
  // Coûts (basé sur votre serializer)
  cost_price?: number;
  average_cost?: number;
  last_cost?: number;
  total_value?: number;
  
  // Audit
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
  
  // Calculés pour UI
  days_until_reorder?: number;
  reorder_suggestion?: number;
}

// ==================== MOUVEMENTS DE STOCK ====================

export type MovementType = 
  | 'IN'           // Entrée
  | 'OUT'          // Sortie
  | 'ADJUSTMENT'   // Ajustement
  | 'TRANSFER'     // Transfert
  | 'RETURN';      // Retour

export interface StockMovement {
  id: number;
  reference?: string;
  store: Store;
  warehouse?: Warehouse;
  movement_type: MovementType;
  
  // Champs de votre serializer
  movement_type_display?: string;
  store_name?: string;
  
  // Objet lié
  related_object_type?: string;
  related_object_id?: string;
  
  // Dates
  movement_date?: string;
  created_at: string;
  updated_at?: string;
  
  // Informations générales
  notes?: string;
  status?: string;
  total_items?: number;
  total_value?: number;
  total_quantity?: number;
  
  // Personnes
  created_by?: number;
  updated_by?: number;
  
  // Audit
  items?: StockMovementItem[];
}

export interface StockMovementItem {
  id: number;
  movement: StockMovement;
  product: Product;
  variant?: ProductVariant;
  batch?: Batch;
  
  // Champs de votre serializer
  product_name?: string;
  variant_name?: string;
  movement_type?: string;
  
  // Quantités
  quantity: number; // Dans votre serializer c'est quantity
  quantity_before?: number;
  quantity_after?: number;
  
  // Coûts
  unit_cost?: number;
  total_cost?: number;
  
  // Informations lot
  batch_number?: string;
  expiry_date?: string;
  
  // Localisation
  from_location?: string;
  to_location?: string;
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
  
  // Audit
  created_at: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

// ==================== RÈGLES DE RÉAPPROVISIONNEMENT ====================

export interface ReorderRule {
  id: number;
  product: Product;
  variant?: ProductVariant;
  store: Store;
  warehouse?: Warehouse;
  
  // Champs de votre serializer
  product_name?: string;
  store_name?: string;
  
  // Seuils
  min_quantity: number;
  max_quantity?: number;
  reorder_quantity: number;
  safety_stock?: number;
  
  // Méthode de réapprovisionnement
  reorder_method?: string;
  lead_time_days?: number;
  review_period_days?: number;
  
  // Paramètres dynamiques
  service_level?: number;
  demand_variability?: number;
  lead_time_variability?: number;
  
  // Calculs automatiques
  economic_order_quantity?: number;
  reorder_point?: number;
  
  // Activation
  is_active: boolean;
  last_reviewed?: string;
  next_review?: string;
  
  // Audit
  created_at: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

// ==================== INVENTAIRES PHYSIQUES ====================

export type InventoryStatus = 
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'validated';

export interface InventoryCount {
  id: number;
  reference?: string;
  store: Store;
  warehouse?: Warehouse;
  
  // Champs de votre serializer
  store_name?: string;
  status_display?: string;
  
  // Planning
  count_date?: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  
  // Statut
  status: InventoryStatus;
  is_cycle_count?: boolean;
  counting_method?: string;
  
  // Résultats
  total_items_counted?: number;
  total_items_expected?: number;
  total_discrepancies?: number;
  discrepancy_value?: number;
  accuracy_rate?: number;
  
  // Équipe
  team_leader_id?: number;
  counters?: number[];
  
  // Informations
  notes?: string;
  adjustments_made?: boolean;
  
  // Audit
  created_at: string;
  updated_at?: string;
  created_by?: number;
  validated_by?: number;
  
  // Relations
  items?: InventoryCountItem[];
}

export interface InventoryCountItem {
  id: number;
  inventory_count: InventoryCount;
  product: Product;
  variant?: ProductVariant;
  
  // Champs de votre serializer
  product_name?: string;
  variant_name?: string;
  
  // Quantités
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
  
  // Informations lot
  batch?: Batch;
  batch_number?: string;
  
  // Localisation
  location_aisle?: string;
  location_shelf?: string;
  location_bin?: string;
  
  // État
  condition?: string;
  notes?: string;
  
  // Validation
  is_validated?: boolean;
  validated_by?: number;
  validation_date?: string;
  
  // Audit
  created_at: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

// ==================== STATISTIQUES DE STOCK ====================

export interface StockStats {
  // Basé sur les calculs de votre useStock
  totalProducts: number;
  totalStock: number;
  outOfStock: number;
  lowStock: number;
  totalValue: number;
  averageStockValue?: number;
  
  // Champs optionnels pour UI
  totalMovements?: number;
  recentMovements?: number;
  inventoryAccuracy?: number;
  averageTurnover?: number;
  
  // Par catégorie
  by_category?: Array<{
    category: string;
    count: number;
    value: number;
    low_stock_count: number;
  }>;
  
  // Alertes
  activeAlerts?: number;
  criticalAlerts?: number;
}

// ==================== ALERTES ====================

export interface StockAlert {
  id: number;
  alert_type: string;
  
  // Produit concerné
  product: Product;
  variant?: ProductVariant;
  batch?: Batch;
  store: Store;
  warehouse?: Warehouse;
  
  // Champs UI
  product_name?: string;
  store_name?: string;
  warehouse_name?: string;
  
  // Détails
  message: string;
  details?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Seuils
  threshold_value?: number;
  current_value?: number;
  
  // Statut
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  resolution_notes?: string;
  
  // Actions suggérées
  suggested_actions?: string[];
  
  // Dates
  created_at: string;
  updated_at?: string;
  acknowledged_at?: string;
  acknowledged_by?: number;
  
  // Métriques
  recurrence_count?: number;
  last_occurrence?: string;
}

// ==================== RÉPONSES API POUR SERIALIZERS DJANGO ====================

export interface PaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
  data?: T[]; // Votre API peut utiliser 'data' au lieu de 'results'
  total?: number;
  page?: number;
  page_size?: number;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    count: number;
    pages: number;
    current_page: number;
    page_size: number;
  };
}

// ==================== TYPES POUR LE FORMULAIRE D'AJOUT DE PRODUIT ====================

export interface AddProductFormData {
  name: string;
  sku?: string;
  category: string;
  description?: string;
  cost_price: number;
  base_price: number;
  min_stock_level: number;
  reorder_quantity: number;
  unit: string;
  store_id: number;
  warehouse_id?: number;
  tax_rate?: number;
  is_active?: boolean;
  initial_quantity?: number;
  brand?: string;
  barcode?: string;
  weight?: number;
  dimensions?: string;
}

// ==================== TYPES POUR MOUVEMENT DE STOCK ====================

export interface CreateMovementData {
  product_id: number;
  store_id?: number;
  warehouse_id?: number;
  movement_type: MovementType;
  quantity: number;
  unit_price?: number;
  notes?: string;
  reference?: string;
  batch_number?: string;
  performed_by?: number;
}

// ==================== TYPES POUR LE TABLEAU DE BORD ====================

export interface StockDashboardData {
  overview: StockStats;
  recentMovements: StockMovement[];
  lowStockProducts: Stock[];
  activeAlerts: StockAlert[];
  topProducts: Array<{
    product: Product;
    movement_count: number;
    total_quantity: number;
  }>;
  expiringProducts: Array<{
    product: Product;
    batch: Batch;
    days_left: number;
  }>;
}

// ==================== TYPES POUR FILTRES ====================

export interface StockFilters {
  store_id?: number;
  search?: string;
  page?: number;
  page_size?: number;
  status?: string;
  product_id?: number;
  warehouse_id?: number;
  category?: string;
  is_low_stock?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface MovementFilters {
  store_id?: number;
  product_id?: number;
  movement_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// ==================== TYPES POUR UTILITAIRES UI ====================

export interface StockCalculations {
  marginPercentage: number;
  marginValue: number;
  daysOfSupply: number;
  reorderPoint: number;
  serviceLevel: number;
}

export interface StockChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }>;
}

// ==================== ENUMS POUR TYPES FIXES ====================

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock'
}

export enum MovementTypeEnum {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN'
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// ==================== TYPES POUR LE HOOK useStock ====================

export interface UseStockReturn {
  // Données
  stocks: Stock[];
  stockStats: StockStats | null;
  movements: StockMovement[];
  inventoryCounts?: InventoryCount[];
  reorderRules?: ReorderRule[];
  warehouses?: Warehouse[];
  batches?: Batch[];
  alerts?: StockAlert[];
  
  // États
  loading: {
    stocks: boolean;
    stats: boolean;
    movements: boolean;
    inventoryCounts?: boolean;
    reorderRules?: boolean;
    warehouses?: boolean;
    batches?: boolean;
    alerts?: boolean;
    all: boolean;
  };
  error: { message: string; details?: any } | null;
  apiStatus: string;
  availableEndpoints: string[];
  hasData: boolean;
  isLoading: boolean;
  hasError: boolean;
  
  // Actions
  fetchStocks: (params?: StockFilters) => Promise<any>;
  fetchStockStats: () => Promise<StockStats>;
  fetchMovements: (params?: MovementFilters) => Promise<any>;
  createStockMovement: (data: CreateMovementData) => Promise<any>;
  refreshAll: () => Promise<void>;
  resetError: () => void;
  
  // Utilitaires
  getLowStockProducts: () => Stock[];
  getProductStock: (productId: number) => Stock | undefined;
  calculateStockValue: () => number;
}

// ==================== TYPES POUR LE SERVICE ====================

export interface StockServiceMethods {
  getStocks: (params?: StockFilters) => Promise<PaginatedResponse<Stock>>;
  getStockStats: (store_id?: number) => Promise<StockStats>;
  getStockMovements: (params?: MovementFilters) => Promise<PaginatedResponse<StockMovement>>;
  createStockMovement: (data: CreateMovementData) => Promise<StockMovement>;
  getWarehouses: (params?: any) => Promise<PaginatedResponse<Warehouse>>;
  getInventoryCounts: (params?: any) => Promise<PaginatedResponse<InventoryCount>>;
  getReorderRules: (params?: any) => Promise<PaginatedResponse<ReorderRule>>;
  getBatches: (params?: any) => Promise<PaginatedResponse<Batch>>;
  getStockAlerts: (params?: any) => Promise<PaginatedResponse<StockAlert>>;
  testConnection: () => Promise<{ success: boolean; message: string; endpoints?: string[] }>;
  updateStock: (id: number, data: Partial<Stock>) => Promise<Stock>;
  createProduct: (data: AddProductFormData) => Promise<any>;
}