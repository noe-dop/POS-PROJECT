// src/types/inventory.ts

// =============================================================================
// TYPES DE BASE
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
// TYPES SPÉCIFIQUES POUR LE SERVICE INVENTORY
// =============================================================================

export type InventoryStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface InventoryCount extends BaseAudit {
  id: number;
  reference: string;
  store: number;
  store_name: string;
  status: InventoryStatus;
  count_date: string;
  planned_date?: string;
  started_at?: string;
  completed_at?: string;
  notes: string;
  total_items_counted: number;
  total_discrepancies: number;
  discrepancy_value: number;
  
  // Pour compatibilité avec le composant
  name?: string;
  items_count?: number;
  progress?: number;
  items?: InventoryCountItem[];
}

export interface InventoryCountItem extends BaseAudit {
  id: number;
  inventory_count: number;
  product: number;
  variant?: number;
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
  
  // Champs calculés/dérivés
  inventory_reference?: string;
  product_name?: string;
  product_sku?: string;
  variant_name?: string;
  discrepancy_value?: number;
  discrepancy_percentage?: number;
}

export interface InventoryStats {
  total_inventories: number;
  in_progress_inventories: number;
  completed_inventories: number;
  planned_inventories: number;
  cancelled_inventories: number;
  total_discrepancies: number;
  total_discrepancy_value: number;
  average_discrepancy_rate: number;
  recent_inventories_count: number;
}

export interface InventorySummary {
  inventory: InventoryCount;
  items: InventoryCountItem[];
  stats: {
    total_items: number;
    items_with_discrepancy: number;
    discrepancy_rate: number;
    total_discrepancy_value: number;
    average_discrepancy: number;
    highest_discrepancy_item?: InventoryCountItem;
  };
}

export interface CreateInventoryPayload {
  reference: string;
  store: number;
  status?: InventoryStatus;
  count_date?: string;
  notes?: string;
}

export interface UpdateInventoryPayload {
  reference?: string;
  store?: number;
  status?: InventoryStatus;
  count_date?: string;
  notes?: string;
  started_at?: string;
  completed_at?: string;
}

export interface CreateInventoryItemPayload {
  product: number;
  variant?: number;
  expected_quantity: number;
  counted_quantity: number;
  notes?: string;
}

export interface UpdateInventoryItemPayload {
  expected_quantity?: number;
  counted_quantity?: number;
  notes?: string;
  discrepancy?: number;
}

export interface InventoryFilters {
  search?: string;
  status?: InventoryStatus | 'all';
  store?: string | number | 'all';
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// =============================================================================
// TYPES POUR LES PRODUITS ET STOCKS (utilisés dans l'inventaire)
// =============================================================================

export interface Product {
  id: number;
  sku: string;
  name: string;
  category_name: string;
  brand_name?: string;
  cost_price: number;
  base_price: number;
  quantity: number;
  photo?: string;
}

export interface Stock {
  id: number;
  product_id: number;
  store_id: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  min_stock_threshold: number;
  ideal_stock_level: number;
  is_low_stock: boolean;
}

// =============================================================================
// TYPES POUR LES MAGASINS
// =============================================================================

export interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

// =============================================================================
// TYPES POUR LES RÉPONSES PAGINÉES
// =============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// =============================================================================
// TYPES UTILITAIRES
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

// =============================================================================
// ÉVÈNEMENTS ET NOTIFICATIONS
// =============================================================================

export interface InventoryEvent {
  id: number;
  inventory_id: number;
  event_type: 'created' | 'started' | 'completed' | 'item_added' | 'item_updated' | 'cancelled';
  user_id: number;
  user_name: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface InventoryAlert {
  id: number;
  inventory_id: number;
  product_name: string;
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved';
  resolved_by?: string;
  resolved_at?: string;
}

// =============================================================================
// RAPPORTS ET ANALYTIQUES
// =============================================================================

export interface InventoryReport {
  period: string;
  total_inventories: number;
  total_items_counted: number;
  total_discrepancies: number;
  total_discrepancy_value: number;
  discrepancy_rate: number;
  most_discrepant_product?: {
    product_id: number;
    product_name: string;
    total_discrepancy: number;
  };
}

export interface DiscrepancyAnalysis {
  inventory_id: number;
  inventory_reference: string;
  store_name: string;
  total_items: number;
  items_with_discrepancy: number;
  total_discrepancy_value: number;
  top_discrepancies: Array<{
    product_name: string;
    expected: number;
    counted: number;
    discrepancy: number;
  }>;
}

// =============================================================================
// TYPES POUR L'IMPORT/EXPORT
// =============================================================================

export interface InventoryImportItem {
  product_sku: string;
  expected_quantity: number;
  counted_quantity: number;
  notes?: string;
}

export interface InventoryExportFormat {
  id: number;
  reference: string;
  store_name: string;
  count_date: string;
  status: string;
  total_items: number;
  total_discrepancies: number;
  discrepancy_value: number;
  items: Array<{
    product_sku: string;
    product_name: string;
    expected_quantity: number;
    counted_quantity: number;
    discrepancy: number;
    notes?: string;
  }>;
}

// =============================================================================
// GARDIENS DE TYPE
// =============================================================================

export const isInventoryCount = (obj: any): obj is InventoryCount => {
  return obj && typeof obj === 'object' && 'reference' in obj && 'store' in obj && 'status' in obj;
};

export const isInventoryCountItem = (obj: any): obj is InventoryCountItem => {
  return obj && typeof obj === 'object' && 'product' in obj && 'expected_quantity' in obj && 'counted_quantity' in obj;
};

export const isInventoryStats = (obj: any): obj is InventoryStats => {
  return obj && typeof obj === 'object' && 'total_inventories' in obj && 'completed_inventories' in obj;
};

// =============================================================================
// CONSTANTES
// =============================================================================

export const INVENTORY_STATUSES = {
  PLANNED: 'planned' as InventoryStatus,
  IN_PROGRESS: 'in_progress' as InventoryStatus,
  COMPLETED: 'completed' as InventoryStatus,
  CANCELLED: 'cancelled' as InventoryStatus,
} as const;

export const INVENTORY_STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'planned', label: 'Planifié' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
];

export const DISCREPANCY_IMPACT_LEVELS = {
  LOW: { threshold: 5, label: 'Faible', color: 'bg-blue-100 text-blue-800' },
  MEDIUM: { threshold: 10, label: 'Moyen', color: 'bg-yellow-100 text-yellow-800' },
  HIGH: { threshold: Infinity, label: 'Élevé', color: 'bg-red-100 text-red-800' },
} as const;

// =============================================================================
// TYPES POUR LES REQUÊTES ET RÉPONSES API
// =============================================================================

export interface ApiRequestConfig {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ErrorResponse {
  detail?: string;
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

// =============================================================================
// TYPES POUR LES COMPOSANTS UI
// =============================================================================

export interface InventoryTableRow {
  id: number;
  reference: string;
  store_name: string;
  count_date: string;
  status: InventoryStatus;
  progress: number;
  total_items: number;
  total_discrepancies: number;
  discrepancy_value: number;
  actions?: string[];
}

export interface InventoryFilterState {
  search: string;
  status: InventoryStatus | 'all';
  store: string | 'all';
  date_from?: string;
  date_to?: string;
}

export interface InventoryFormData {
  reference: string;
  store: number;
  count_date: string;
  status: InventoryStatus;
  notes?: string;
}