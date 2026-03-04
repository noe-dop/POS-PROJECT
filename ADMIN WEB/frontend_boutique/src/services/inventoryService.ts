// src/services/inventoryService.ts - VERSION CORRIGÉE AVEC API RÉELLE
import { apiService } from './api';
import { 
  InventoryCount, 
  InventoryCountItem, 
  InventoryStats,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  InventoryFilters,
  InventoryStatus,
  Store
} from '../types/inventory';

class InventoryService {
  
  // ============================================
  // CONFIGURATION
  // ============================================
  
  private readonly baseUrl = '/inventory-counts/';
  
  // ============================================
  // INVENTAIRES
  // ============================================
  
  /**
   * Récupère tous les inventaires
   */
  async getInventories(filters?: InventoryFilters): Promise<InventoryCount[]> {
    try {
      console.log('🔍 getInventories appelé avec filtres:', filters);
      
      const params: Record<string, any> = {};
      
      if (filters) {
        if (filters.status && filters.status !== 'all') {
          params.status = filters.status;
        }
        if (filters.store && filters.store !== 'all') {
          params.store = filters.store;
        }
        if (filters.search) {
          params.search = filters.search;
        }
        if (filters.is_active !== undefined) {
          params.is_active = filters.is_active;
        }
        if (filters.page) {
          params.page = filters.page;
        }
        if (filters.page_size) {
          params.page_size = filters.page_size;
        }
      }
      
      // Toujours trier par date décroissante
      params.ordering = '-count_date';
      
      console.log('📤 Params envoyés:', params);
      
      const response = await apiService.get<any>(this.baseUrl, { params });
      console.log('✅ Réponse API reçue, statut:', response.status);
      
      let items: any[] = [];
      
      // Gestion des différents formats de réponse Django
      if (response.data) {
        if (response.data.results && Array.isArray(response.data.results)) {
          items = response.data.results;
          console.log('📦 Format paginé Django détecté');
        }
        else if (Array.isArray(response.data)) {
          items = response.data;
          console.log('📦 Format tableau simple détecté');
        }
        else if (response.data.data && Array.isArray(response.data.data)) {
          items = response.data.data;
          console.log('📦 Format avec propriété data détecté');
        }
        else if (typeof response.data === 'object' && response.data.id) {
          items = [response.data];
          console.log('📦 Objet unique détecté');
        }
      }
      
      console.log(`📦 ${items.length} items extraits de la réponse`);
      
      const inventories = items.map(item => this.transformInventory(item));
      
      console.log(`✅ ${inventories.length} inventaires transformés`);
      return inventories;
      
    } catch (error: any) {
      console.error('❌ Erreur getInventories:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // En cas d'erreur, on retourne un tableau vide
      return [];
    }
  }
  
  /**
   * Récupère un inventaire spécifique
   */
  async getInventory(id: number): Promise<InventoryCount | null> {
    try {
      console.log(`🔍 Récupération inventaire #${id}`);
      
      const url = `${this.baseUrl}${id}/`;
      console.log(`🌐 GET URL: ${url}`);
      
      const response = await apiService.get<any>(url);
      
      if (!response.data) {
        console.warn(`⚠️ Inventaire #${id} - réponse vide`);
        return null;
      }
      
      console.log(`✅ Inventaire #${id} récupéré, statut:`, response.status);
      return this.transformInventory(response.data);
      
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`⚠️ Inventaire #${id} non trouvé`);
        return null;
      }
      console.error(`❌ Erreur getInventory #${id}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Crée un nouvel inventaire
   */
  async createInventory(payload: CreateInventoryPayload): Promise<InventoryCount> {
    try {
      console.log(`🔄 Création inventaire:`, payload);
      
      // Validation
      if (!payload.reference?.trim()) {
        throw new Error('La référence est obligatoire');
      }
      if (!payload.store || payload.store <= 0) {
        throw new Error('Le magasin est obligatoire');
      }
      
      // Construction du payload selon la structure API Django
      const apiPayload: Record<string, any> = {
        reference: payload.reference.trim(),
        store: payload.store,
        status: payload.status || 'planned',
        count_date: payload.count_date || new Date().toISOString(),
        is_active: true
      };
      
      // Ajouter metadata si notes est présent
      if (payload.notes) {
        apiPayload.metadata = {
          notes: payload.notes
        };
      }
      
      console.log('📦 Payload API (création):', apiPayload);
      console.log(`🌐 POST URL: ${this.baseUrl}`);
      
      const response = await apiService.post<any>(this.baseUrl, apiPayload);
      
      console.log(`✅ Réponse reçue, statut: ${response.status}`);
      
      if (!response.data) {
        throw new Error('Réponse vide du serveur');
      }
      
      const inventory = this.transformInventory(response.data);
      console.log(`✅ Inventaire créé: ${inventory.reference} (ID: ${inventory.id})`);
      
      return inventory;
      
    } catch (error: any) {
      console.error('❌ Erreur createInventory:', error);
      
      // Extraire le message d'erreur Django
      let errorMessage = 'Erreur lors de la création';
      if (error.response?.data) {
        const data = error.response.data;
        
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.reference) {
          errorMessage = `Référence: ${Array.isArray(data.reference) ? data.reference.join(', ') : data.reference}`;
        } else if (data.store) {
          errorMessage = `Magasin: ${Array.isArray(data.store) ? data.store.join(', ') : data.store}`;
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors.join(', ') 
            : data.non_field_errors;
        } else {
          errorMessage = JSON.stringify(data);
        }
      }
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Met à jour un inventaire
   */
  async updateInventory(id: number, payload: UpdateInventoryPayload): Promise<InventoryCount> {
    try {
      console.log(`✏️ Mise à jour inventaire #${id}:`, payload);
      
      const url = `${this.baseUrl}${id}/`;
      console.log(`🌐 PATCH URL: ${url}`);
      
      // Construction du payload pour PATCH
      const apiPayload: Record<string, any> = {};
      
      if (payload.reference !== undefined) apiPayload.reference = payload.reference;
      if (payload.store !== undefined) apiPayload.store = payload.store;
      if (payload.status !== undefined) apiPayload.status = payload.status;
      if (payload.count_date !== undefined) apiPayload.count_date = payload.count_date;
      if (payload.started_at !== undefined) apiPayload.started_at = payload.started_at;
      if (payload.completed_at !== undefined) apiPayload.completed_at = payload.completed_at;
      if (payload.is_active !== undefined) apiPayload.is_active = payload.is_active;
      
      // Gestion des notes dans metadata
      if (payload.notes !== undefined) {
        // Récupérer d'abord l'inventaire pour merger les metadata
        const currentInventory = await this.getInventory(id);
        apiPayload.metadata = {
          ...(currentInventory?.metadata || {}),
          notes: payload.notes
        };
      }
      
      const response = await apiService.patch<any>(url, apiPayload);
      
      if (!response.data) {
        throw new Error('Réponse vide du serveur');
      }
      
      console.log(`✅ Inventaire #${id} mis à jour`);
      return this.transformInventory(response.data);
      
    } catch (error: any) {
      console.error(`❌ Erreur updateInventory #${id}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Supprime un inventaire
   */
  async deleteInventory(id: number): Promise<void> {
    try {
      console.log(`🗑️ Suppression inventaire #${id}`);
      
      const url = `${this.baseUrl}${id}/`;
      console.log(`🌐 DELETE URL: ${url}`);
      
      await apiService.delete(url);
      console.log(`✅ Inventaire #${id} supprimé`);
      
    } catch (error: any) {
      console.error(`❌ Erreur deleteInventory #${id}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Démarre un inventaire
   */
  async startInventory(id: number): Promise<InventoryCount> {
    try {
      console.log(`▶️ Démarrage inventaire #${id}`);
      
      return await this.updateInventory(id, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error(`❌ Erreur startInventory #${id}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Termine un inventaire
   */
  async completeInventory(id: number): Promise<InventoryCount> {
    try {
      console.log(`✅ Terminaison inventaire #${id}`);
      
      return await this.updateInventory(id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error(`❌ Erreur completeInventory #${id}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Annule un inventaire
   */
  async cancelInventory(id: number): Promise<InventoryCount> {
    try {
      console.log(`⏹️ Annulation inventaire #${id}`);
      
      return await this.updateInventory(id, {
        status: 'cancelled'
      });
      
    } catch (error: any) {
      console.error(`❌ Erreur cancelInventory #${id}:`, error.message);
      throw error;
    }
  }
  
  // ============================================
  // ITEMS D'INVENTAIRE
  // ============================================
  
  /**
   * Récupère les items d'un inventaire
   */
  async getInventoryItems(inventoryId: number): Promise<InventoryCountItem[]> {
    try {
      console.log(`📋 Récupération items inventaire #${inventoryId}`);
      
      // Endpoint standard Django Rest Framework
      const endpoint = `/inventory-count-items/?inventory_count=${inventoryId}`;
      
      console.log(`🌐 GET: ${endpoint}`);
      const response = await apiService.get<any>(endpoint);
      
      let items: any[] = [];
      
      if (response.data?.results && Array.isArray(response.data.results)) {
        items = response.data.results;
      } else if (Array.isArray(response.data)) {
        items = response.data;
      }
      
      console.log(`✅ ${items.length} items trouvés`);
      return items.map(item => this.transformInventoryItem(item, inventoryId));
      
    } catch (error: any) {
      console.error(`❌ Erreur getInventoryItems #${inventoryId}:`, error.message);
      return [];
    }
  }
  
  /**
   * Met à jour un item d'inventaire
   */
  async updateInventoryItem(itemId: number, countedQuantity: number): Promise<InventoryCountItem> {
    try {
      console.log(`✏️ Mise à jour item #${itemId} -> ${countedQuantity}`);
      
      const url = `/inventory-count-items/${itemId}/`;
      
      const payload = {
        counted_quantity: countedQuantity
      };
      
      const response = await apiService.patch<any>(url, payload);
      
      return this.transformInventoryItem(response.data);
      
    } catch (error: any) {
      console.error(`❌ Erreur updateInventoryItem #${itemId}:`, error.message);
      throw error;
    }
  }
  
  // ============================================
  // STATISTIQUES
  // ============================================
  
  /**
   * Récupère les statistiques globales
   */
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      console.log('📊 Calcul des statistiques');
      
      const inventories = await this.getInventories();
      
      const stats = this.calculateStats(inventories);
      
      console.log('✅ Statistiques calculées:', stats);
      return stats;
      
    } catch (error: any) {
      console.error('❌ Erreur calcul statistiques:', error);
      throw error;
    }
  }
  
  // ============================================
  // DONNÉES ASSOCIÉES
  // ============================================
  
  /**
   * Récupère les magasins disponibles
   */
  async getStores(): Promise<Store[]> {
    try {
      console.log('🏪 Récupération magasins');
      
      const url = '/stores/';
      console.log(`🌐 GET URL: ${url}`);
      
      const response = await apiService.get<any>(url);
      
      let stores: Store[] = [];
      
      if (response.data?.results && Array.isArray(response.data.results)) {
        stores = response.data.results;
      } else if (Array.isArray(response.data)) {
        stores = response.data;
      }
      
      console.log(`✅ ${stores.length} magasins récupérés`);
      return stores;
      
    } catch (error: any) {
      console.error('❌ Erreur récupération magasins:', error.message);
      throw error;
    }
  }
  
  // ============================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ============================================
  
  /**
   * Transforme les données d'API en modèle InventoryCount
   */
  private transformInventory(data: any): InventoryCount {
    // Extraire notes depuis metadata si présent
    const notes = data.metadata?.notes || data.notes || '';
    
    return {
      id: data.id,
      reference: data.reference,
      store: data.store,
      store_name: data.store_name || '',
      status: data.status,
      count_date: data.count_date,
      planned_date: data.planned_date,
      started_at: data.started_at,
      completed_at: data.completed_at,
      notes: notes,
      total_items_counted: data.total_items_counted || 0,
      total_discrepancies: data.total_discrepancies || 0,
      discrepancy_value: typeof data.discrepancy_value === 'string' 
        ? parseFloat(data.discrepancy_value) || 0 
        : data.discrepancy_value || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      updated_by: data.updated_by,
      is_active: data.is_active,
      metadata: data.metadata || {},
      
      // Champs de compatibilité
      name: data.reference,
      items_count: data.total_items_counted || 0,
      progress: 0,
      items: [],
      status_display: this.getStatusDisplay(data.status)
    };
  }
  
  /**
   * Transforme les données d'API en modèle InventoryCountItem
   */
  private transformInventoryItem(data: any, inventoryId?: number): InventoryCountItem {
    const expected = data.expected_quantity || 0;
    const counted = data.counted_quantity;
    const discrepancy = counted !== null && counted !== undefined ? counted - expected : 0;
    
    return {
      id: data.id,
      inventory_count: data.inventory_count || inventoryId || 0,
      product: data.product,
      variant: data.variant,
      expected_quantity: expected,
      counted_quantity: counted,
      discrepancy: discrepancy,
      notes: data.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      updated_by: data.updated_by,
      is_active: data.is_active,
      
      inventory_reference: data.inventory_reference || '',
      product_name: data.product_name || '',
      product_sku: data.product_sku || '',
      variant_name: data.variant_name,
      unit_price: data.unit_price || 0,
      discrepancy_value: data.discrepancy_value || Math.abs(discrepancy) * (data.unit_price || 1),
      discrepancy_percentage: data.discrepancy_percentage || 0
    };
  }
  
  /**
   * Obtient le libellé d'affichage pour un statut
   */
  private getStatusDisplay(status: string): string {
    const displayMap: Record<string, string> = {
      'planned': 'Planifié',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return displayMap[status] || status;
  }
  
  /**
   * Calcule les statistiques à partir des inventaires
   */
  private calculateStats(inventories: InventoryCount[]): InventoryStats {
    const now = new Date();
    const weekAgo = new Date(now.setDate(now.getDate() - 7));
    
    const recentInventories = inventories.filter(inv => 
      inv.created_at && new Date(inv.created_at) >= weekAgo
    ).length;
    
    return {
      total_inventories: inventories.length,
      in_progress_inventories: inventories.filter(i => i.status === 'in_progress').length,
      completed_inventories: inventories.filter(i => i.status === 'completed').length,
      planned_inventories: inventories.filter(i => i.status === 'planned').length,
      cancelled_inventories: inventories.filter(i => i.status === 'cancelled').length,
      total_discrepancies: inventories.reduce((sum, i) => sum + (i.total_discrepancies || 0), 0),
      total_discrepancy_value: inventories.reduce((sum, i) => sum + (i.discrepancy_value || 0), 0),
      average_discrepancy_rate: inventories.length > 0 
        ? (inventories.reduce((sum, i) => sum + (i.total_discrepancies || 0), 0) / inventories.length) 
        : 0,
      recent_inventories_count: recentInventories
    };
  }
}

// ============================================
// UTILITAIRES EXPORTÉS
// ============================================

export class InventoryUtils {
  
  /**
   * Calcule le pourcentage de progression d'un inventaire
   */
  static getProgressPercentage(
    inventory: InventoryCount, 
    items?: InventoryCountItem[]
  ): number {
    if (inventory.status === 'completed') return 100;
    if (inventory.status === 'cancelled') return 0;
    
    if (items && items.length > 0) {
      const countedItems = items.filter(item => item.counted_quantity !== null).length;
      return Math.round((countedItems / items.length) * 100);
    }
    
    if (inventory.status === 'in_progress') return 50;
    return 0;
  }
  
  /**
   * Obtient la configuration d'affichage pour un statut
   */
  static getStatusConfig(status: InventoryStatus): {
    label: string;
    color: string;
    icon: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  } {
    const configs = {
      planned: {
        label: 'Planifié',
        color: 'yellow',
        icon: 'calendar',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200'
      },
      in_progress: {
        label: 'En cours',
        color: 'blue',
        icon: 'refresh-cw',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200'
      },
      completed: {
        label: 'Terminé',
        color: 'green',
        icon: 'check-circle',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-200'
      },
      cancelled: {
        label: 'Annulé',
        color: 'red',
        icon: 'x-circle',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-200'
      }
    };
    
    return configs[status] || configs.planned;
  }
  
  /**
   * Formate une date pour l'affichage
   */
  static formatDate(
    dateString: string | null | undefined, 
    includeTime: boolean = false
  ): string {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
      }
      
      return date.toLocaleDateString('fr-FR', options);
    } catch {
      return dateString;
    }
  }
}

// ============================================
// EXPORT DE L'INSTANCE UNIQUE
// ============================================

export const inventoryService = new InventoryService();

// Export des types pour faciliter l'import
export type {
  InventoryCount,
  InventoryCountItem,
  InventoryStats,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  InventoryStatus,
  InventoryFilters,
  Store
};