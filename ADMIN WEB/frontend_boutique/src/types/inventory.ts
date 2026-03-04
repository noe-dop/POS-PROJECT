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
  started_at?: string | null;  // <-- CORRIGÉ: permet null
  completed_at?: string | null; // <-- CORRIGÉ: permet null
  notes?: string;  // <-- AJOUTÉ (optionnel)
  total_items_counted: number;
  total_discrepancies: number;
  discrepancy_value: number;    // <-- CORRIGÉ: number (pas string)
  
  // Pour compatibilité avec le composant
  name?: string;
  items_count?: number;
  progress?: number;
  items?: InventoryCountItem[];
  status_display?: string;
}

export interface InventoryCountItem extends BaseAudit {
  id: number;
  inventory_count: number;
  product: number;
  variant?: number | null;      // <-- CORRIGÉ: permet null
  expected_quantity: number;
  counted_quantity: number | null; // <-- CORRIGÉ: permet null (pas encore compté)
  discrepancy: number;
  notes?: string | null;        // <-- CORRIGÉ: permet null
  
  // Champs calculés/dérivés
  inventory_reference?: string;
  product_name?: string;
  product_sku?: string;
  variant_name?: string | null; // <-- CORRIGÉ: permet null
  unit_price?: number;
  discrepancy_value?: number;
  discrepancy_percentage?: number;
}

export interface CreateInventoryPayload {
  reference: string;
  store: number;
  status?: InventoryStatus;
  count_date?: string;          // <-- L'API l'attend
  notes?: string;               // <-- Pour compatibilité (sera mis dans metadata)
  // Champs optionnels pour l'API
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateInventoryPayload {
  reference?: string;
  store?: number;
  status?: InventoryStatus;
  count_date?: string;
  notes?: string;               // <-- Pour compatibilité
  started_at?: string | null;   // <-- CORRIGÉ: permet null
  completed_at?: string | null; // <-- CORRIGÉ: permet null
  total_items_counted?: number;
  total_discrepancies?: number;
  discrepancy_value?: number;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

// =============================================================================
// FILTRES ET PARAMÈTRES DE RECHERCHE
// =============================================================================

export interface InventoryFilters {
  search?: string;
  status?: InventoryStatus | 'all';
  store?: number | 'all';
  is_active?: boolean | 'all';  // <-- AJOUTÉ
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface InventoryItemFilters {
  search?: string;
  has_discrepancy?: boolean;
  counted?: boolean;
  product?: number;
  category?: number;
  page?: number;
  page_size?: number;
}

// =============================================================================
// STATISTIQUES ET RAPPORTS
// =============================================================================

export interface InventoryStats {
  total_inventories: number;
  inventories_by_status: Record<InventoryStatus, number>;
  total_items_counted: number;
  total_discrepancies: number;
  total_discrepancy_value: number;
  average_accuracy: number;
  recent_activity: {
    last_7_days: number;
    last_30_days: number;
  };
}

export interface InventorySummary {
  id: number;
  reference: string;
  store_name: string;
  status: InventoryStatus;
  count_date: string;
  progress: number;              // Pourcentage de progression
  items_counted: number;
  total_items: number;
  discrepancies_count: number;
  discrepancy_value: number;
}

// =============================================================================
// TYPES POUR L'IMPORT/EXPORT
// =============================================================================

export interface InventoryExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  include_items: boolean;
  include_discrepancies: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  stores?: number[];
}

export interface InventoryImportResult {
  success: boolean;
  created_count: number;
  updated_count: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

// =============================================================================
// TYPES POUR L'HISTORIQUE
// =============================================================================

export interface InventoryHistoryEntry {
  id: number;
  inventory_id: number;
  inventory_reference: string;
  action: 'created' | 'started' | 'completed' | 'cancelled' | 'updated' | 'item_counted';
  action_label: string;
  user_id?: number;
  user_name?: string;
  store_name?: string;
  details?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// TYPES POUR LE STORE (MAGASIN)
// =============================================================================

export interface Store {
  id: number;
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}

// =============================================================================
// TYPES POUR LES ACTIONS EN VRAC (BULK OPERATIONS)
// =============================================================================

export interface BulkInventoryAction {
  action: 'delete' | 'start' | 'complete' | 'cancel' | 'archive';
  inventory_ids: number[];
  confirm: boolean;
  reason?: string;
}

export interface BulkActionResult {
  success: boolean;
  processed_count: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    id: number;
    message: string;
  }>;
}

// =============================================================================
// TYPES POUR LES NOTIFICATIONS
// =============================================================================

export interface InventoryNotification {
  id: number;
  type: 'discrepancy' | 'pending' | 'completed' | 'started';
  inventory_id: number;
  inventory_reference: string;
  store_name: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
  action_url?: string;
}

// =============================================================================
// TYPES POUR LE DASHBOARD
// =============================================================================

export interface InventoryDashboardData {
  stats: InventoryStats;
  recent_inventories: InventorySummary[];
  pending_actions: number;
  notifications: InventoryNotification[];
  alerts: {
    high_discrepancies: number;
    uncompleted_inventories: number;
    items_to_count: number;
  };
}