// src/types/supply.ts

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
// TYPES POUR LES APPROVISIONNEMENTS
// =============================================================================

export type SupplyStatus = 'pending' | 'ordered' | 'received' | 'cancelled' | 'partial';

export interface Supply extends BaseAudit {
  id: number;
  ref_supply: string;              // Référence de l'approvisionnement
  total_command: string;            // Montant total (string pour éviter les problèmes de décimales)
  status: SupplyStatus;             // pending, ordered, received, cancelled, partial
  store: number;                    // ID du magasin
  supplier: number;                 // ID du fournisseur
  utilisateur: number;              // ID de l'utilisateur qui a créé
  
  // Champs optionnels
  supplier_name?: string;           // Nom du fournisseur (dénormalisé)
  store_name?: string;              // Nom du magasin (dénormalisé)
  user_name?: string;               // Nom de l'utilisateur
  notes?: string;                   // Notes
  expected_date?: string;           // Date de livraison prévue
  received_date?: string;           // Date de réception réelle
  items?: SupplyItem[];             // Articles de l'approvisionnement
  
  // Pour compatibilité UI
  progress?: number;                // Pourcentage de progression
  items_count?: number;             // Nombre total d'articles
  items_received?: number;          // Nombre d'articles reçus
  status_display?: string;          // Libellé du statut
}

export interface SupplyItem extends BaseAudit {
  id: number;
  supply: number;                    // ID de l'approvisionnement parent
  product: number;                   // ID du produit
  variant?: number | null;           // ID de la variante (optionnel)
  quantity_ordered: number;          // Quantité commandée
  quantity_received?: number | null; // Quantité reçue
  unit_price: string;                // Prix unitaire
  total_price: string;               // Prix total
  
  // Champs dénormalisés
  product_name?: string;
  product_sku?: string;
  variant_name?: string | null;
  
  // Champs calculés
  remaining_quantity?: number;       // Quantité restant à recevoir
  is_complete?: boolean;             // true si quantity_received >= quantity_ordered
}

export interface CreateSupplyPayload {
  ref_supply: string;
  store: number;
  supplier: number;
  utilisateur: number;
  status?: SupplyStatus;
  expected_date?: string;
  notes?: string;
  items?: Array<{
    product: number;
    variant?: number | null;
    quantity_ordered: number;
    unit_price: string;
  }>;
  metadata?: Record<string, any>;
}

export interface UpdateSupplyPayload {
  ref_supply?: string;
  status?: SupplyStatus;
  expected_date?: string;
  received_date?: string;
  notes?: string;
  items?: Array<{
    id?: number;
    product: number;
    variant?: number | null;
    quantity_ordered: number;
    quantity_received?: number | null;
    unit_price: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ReceiveSupplyPayload {
  items: Array<{
    id: number;                      // ID du SupplyItem
    quantity_received: number;        // Quantité reçue
  }>;
  received_date?: string;             // Date de réception (optionnelle)
  notes?: string;                     // Notes sur la réception
}

// =============================================================================
// FILTRES ET RECHERCHE
// =============================================================================

export interface SupplyFilters {
  search?: string;                    // Recherche texte
  status?: SupplyStatus | 'all';      // Filtre par statut
  store?: number | 'all';             // Filtre par magasin
  supplier?: number | 'all';           // Filtre par fournisseur
  date_from?: string;                  // Date de début
  date_to?: string;                    // Date de fin
  is_active?: boolean | 'all';         // Filtre actif/inactif
  page?: number;                       // Numéro de page
  page_size?: number;                  // Taille de page
  ordering?: string;                    // Tri (ex: '-created_at')
}

export interface SupplyItemFilters {
  search?: string;
  supply?: number;                     // Filtrer par approvisionnement
  product?: number;                    // Filtrer par produit
  is_received?: boolean;               // Filtrer reçus/non reçus
  page?: number;
  page_size?: number;
}

// =============================================================================
// STATISTIQUES ET RAPPORTS
// =============================================================================

export interface SupplyStats {
  total_supplies: number;              // Total approvisionnements
  pending_supplies: number;             // En attente
  ordered_supplies: number;             // Commandés
  received_supplies: number;            // Reçus
  cancelled_supplies: number;           // Annulés
  partial_supplies: number;             // Partiellement reçus
  total_value: number;                  // Valeur totale
  average_value: number;                 // Valeur moyenne
  recent_supplies_count: number;         // Approvisionnements récents (7 jours)
  
  // Statistiques détaillées
  by_store?: Record<number, number>;     // Par magasin
  by_supplier?: Record<number, number>;  // Par fournisseur
  by_status?: Record<SupplyStatus, number>; // Par statut
}

export interface SupplySummary {
  id: number;
  ref_supply: string;
  store_name: string;
  supplier_name: string;
  status: SupplyStatus;
  total_command: string;
  expected_date?: string;
  received_date?: string;
  items_count: number;
  items_received: number;
  progress: number;                      // Pourcentage de réception
  created_at: string;
}

// =============================================================================
// TYPES POUR L'IMPORT/EXPORT
// =============================================================================

export interface SupplyExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  date_range?: {
    start: string;
    end: string;
  };
  stores?: number[];
  suppliers?: number[];
  statuses?: SupplyStatus[];
  include_items: boolean;
}

export interface SupplyImportResult {
  success: boolean;
  created_count: number;
  updated_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// =============================================================================
// TYPES POUR L'HISTORIQUE
// =============================================================================

export interface SupplyHistoryEntry {
  id: number;
  supply_id: number;
  supply_reference: string;
  action: 'created' | 'updated' | 'ordered' | 'received' | 'cancelled' | 'item_received';
  action_label: string;
  user_id?: number;
  user_name?: string;
  details?: string;
  changes?: Record<string, { old: any; new: any }>;
  timestamp: string;
}

// =============================================================================
// TYPES POUR LES NOTIFICATIONS
// =============================================================================

export interface SupplyNotification {
  id: number;
  type: 'pending' | 'delayed' | 'received' | 'partial';
  supply_id: number;
  supply_reference: string;
  supplier_name: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  read: boolean;
  created_at: string;
  action_url?: string;
}

// =============================================================================
// TYPES POUR LE DASHBOARD
// =============================================================================

export interface SupplyDashboardData {
  stats: SupplyStats;
  recent_supplies: SupplySummary[];
  pending_deliveries: number;
  delayed_deliveries: number;
  notifications: SupplyNotification[];
  alerts: {
    pending_approval: number;
    delayed_supplies: number;
    items_to_receive: number;
  };
}

// =============================================================================
// TYPES POUR LES FOURNISSEURS
// =============================================================================

export interface Supplier {
  id: number;
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  delivery_terms?: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierPayload {
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  delivery_terms?: string;
  is_active?: boolean;
}

export interface UpdateSupplierPayload {
  name?: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  delivery_terms?: string;
  is_active?: boolean;
}