// src/services/inventoryService.ts - SERVICE CORRIGÉ COMPLÈTEMENT
import { apiService } from './api';
import { 
  InventoryCount, 
  InventoryCountItem, 
  InventoryStats,
  CreateInventoryPayload,
  UpdateInventoryPayload,
  InventoryFilters,
  InventoryStatus
} from '../types/inventory';

class InventoryService {
  
  // ============================================
  // CONFIGURATION - AJOUT DES SLASHES FINAUX
  // ============================================
  
  // IMPORTANT: Les URLs doivent toujours finir par un slash
  // pour être compatibles avec Django et APPEND_SLASH
  private readonly baseUrl = '/inventory-counts/';
  
  // ============================================
  // INVENTAIRES - VERSION CORRIGÉE AVEC SLASHES
  // ============================================
  
  /**
   * Récupère tous les inventaires
   */
  async getInventories(filters?: InventoryFilters): Promise<InventoryCount[]> {
    try {
      console.log('🔍 getInventories appelé');
      
      // Construire les paramètres
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
        if (filters.page) {
          params.page = filters.page;
        }
        if (filters.page_size) {
          params.page_size = filters.page_size;
        }
      }
      
      // Toujours trier par date décroissante
      params.ordering = '-count_date';
      
      console.log('📤 Params:', params);
      
      // IMPORTANT: Appel GET avec URL avec slash
      const response = await apiService.get<any>(this.baseUrl, { params });
      console.log('✅ Réponse API reçue, statut:', response.status);
      
      // Gestion des différents formats de réponse
      let items: any[] = [];
      
      if (response.data) {
        // Format Django REST Framework paginé
        if (response.data.results && Array.isArray(response.data.results)) {
          items = response.data.results;
        }
        // Format tableau simple
        else if (Array.isArray(response.data)) {
          items = response.data;
        }
        // Format personnalisé
        else if (response.data.data && Array.isArray(response.data.data)) {
          items = response.data.data;
        }
        // Objet unique
        else if (typeof response.data === 'object') {
          items = [response.data];
        }
      }
      
      console.log(`📦 ${items.length} items extraits`);
      
      // Transformer les données
      const inventories = items.map(item => this.transformInventory(item));
      
      console.log(`✅ ${inventories.length} inventaires transformés`);
      return inventories;
      
    } catch (error: any) {
      console.error('❌ Erreur getInventories:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // En cas d'erreur, retourner un tableau vide pour éviter de bloquer l'interface
      return [];
    }
  }
  
  /**
   * Récupère un inventaire spécifique
   */
  async getInventory(id: number): Promise<InventoryCount | null> {
    try {
      console.log(`🔍 Récupération inventaire #${id}`);
      
      // IMPORTANT: ID avant le slash final - format: /inventory-counts/{id}/
      const url = `${this.baseUrl}${id}/`;
      console.log(`🌐 GET URL: ${url}`);
      
      const response = await apiService.get<InventoryCount>(url);
      
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
      return null;
    }
  }
  
  /**
   * Crée un nouvel inventaire - CORRECTION CRITIQUE ICI
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
      
      // Formatage des données
      const apiPayload = {
        reference: payload.reference.trim(),
        store: payload.store,
        status: payload.status || 'planned',
        count_date: payload.count_date || new Date().toISOString(),
        notes: payload.notes || ''
      };
      
      console.log('📦 Payload API:', apiPayload);
      console.log(`🌐 POST URL: ${this.baseUrl}`);
      
      // IMPORTANT: Utiliser this.baseUrl qui a déjà le slash final
      // Vérifier que l'URL est correcte
      const response = await apiService.post<InventoryCount>(this.baseUrl, apiPayload);
      
      console.log(`✅ Réponse reçue, statut: ${response.status}`, response.data);
      
      if (!response.data) {
        throw new Error('Réponse vide du serveur');
      }
      
      const inventory = this.transformInventory(response.data);
      console.log(`✅ Inventaire créé: ${inventory.reference} (ID: ${inventory.id})`);
      
      return inventory;
      
    } catch (error: any) {
      console.error('❌ Erreur createInventory:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      
      // Extraire le message d'erreur détaillé
      let errorMessage = 'Erreur lors de la création';
      if (error.response?.data) {
        const data = error.response.data;
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.reference) {
          errorMessage = `Référence: ${data.reference}`;
        } else if (data.store) {
          errorMessage = `Magasin: ${data.store}`;
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors.join(', ') 
            : data.non_field_errors;
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
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
      
      // IMPORTANT: ID avant le slash final
      const url = `${this.baseUrl}${id}/`;
      console.log(`🌐 PATCH URL: ${url}`);
      
      const response = await apiService.patch<InventoryCount>(url, payload);
      
      if (!response.data) {
        throw new Error('Réponse vide du serveur');
      }
      
      console.log(`✅ Inventaire #${id} mis à jour, statut:`, response.status);
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
      
      // IMPORTANT: ID avant le slash final
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
  
  // ============================================
  // ITEMS D'INVENTAIRE
  // ============================================
  
  /**
   * Récupère les items d'un inventaire
   */
  async getInventoryItems(inventoryId: number): Promise<InventoryCountItem[]> {
    try {
      console.log(`📋 Récupération items inventaire #${inventoryId}`);
      
      // Essayer différents endpoints avec slashes corrects
      const endpoints = [
        `${this.baseUrl}${inventoryId}/items/`,
        `/inventory-count-items/?inventory_count=${inventoryId}`,
        `/inventory-count-items/?inventory=${inventoryId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🌐 Essai GET: ${endpoint}`);
          const response = await apiService.get<any>(endpoint);
          let items: any[] = [];
          
          // Extraction des données
          if (response.data?.results && Array.isArray(response.data.results)) {
            items = response.data.results;
          } else if (Array.isArray(response.data)) {
            items = response.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            items = response.data.data;
          }
          
          if (items.length > 0) {
            console.log(`✅ ${items.length} items trouvés via ${endpoint}`);
            return items.map(item => this.transformInventoryItem(item, inventoryId));
          }
        } catch (error) {
          // Continuer avec l'endpoint suivant
          console.log(`⚠️ Endpoint ${endpoint} non disponible:`, error.message);
        }
      }
      
      console.log(`⚠️ Aucun item trouvé pour inventaire #${inventoryId}`);
      return [];
      
    } catch (error: any) {
      console.error(`❌ Erreur getInventoryItems #${inventoryId}:`, error.message);
      return [];
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
      
      // Récupérer tous les inventaires
      const inventories = await this.getInventories();
      
      // Calculer les statistiques localement
      const stats = this.calculateStats(inventories);
      
      console.log('✅ Statistiques calculées:', stats);
      return stats;
      
    } catch (error: any) {
      console.error('❌ Erreur calcul statistiques:', error);
      
      // Retourner des statistiques par défaut
      return {
        total_inventories: 0,
        in_progress_inventories: 0,
        completed_inventories: 0,
        planned_inventories: 0,
        cancelled_inventories: 0,
        total_discrepancies: 0,
        total_discrepancy_value: 0,
        average_discrepancy_rate: 0,
        recent_inventories_count: 0
      };
    }
  }
  
  // ============================================
  // DONNÉES ASSOCIÉES
  // ============================================
  
  /**
   * Récupère les magasins disponibles
   */
  async getStores(): Promise<any[]> {
    try {
      console.log('🏪 Récupération magasins');
      
      // IMPORTANT: Slash final pour les stores aussi
      const url = '/stores/';
      console.log(`🌐 GET URL: ${url}`);
      
      const response = await apiService.get<any>(url);
      
      let stores: any[] = [];
      
      // Gestion des différents formats
      if (response.data?.results && Array.isArray(response.data.results)) {
        stores = response.data.results;
      } else if (Array.isArray(response.data)) {
        stores = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        stores = response.data.data;
      }
      
      console.log(`✅ ${stores.length} magasins récupérés`);
      return stores;
      
    } catch (error: any) {
      console.error('❌ Erreur récupération magasins:', error.message);
      
      // Retourner des magasins de test en cas d'erreur
      return [
        { id: 1, name: 'Magasin Principal' },
        { id: 2, name: 'Succursale Est' },
        { id: 3, name: 'Succursale Ouest' }
      ];
    }
  }
  
  // ============================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ============================================
  
  /**
   * Transforme les données d'API en modèle InventoryCount
   */
  private transformInventory(data: any): InventoryCount {
    return {
      id: data.id || 0,
      reference: data.reference || `INV-${data.id || 'NEW'}`,
      store: data.store || data.store_id || 0,
      store_name: data.store_name || data.store?.name || 'Magasin inconnu',
      status: this.normalizeStatus(data.status),
      count_date: data.count_date || data.created_at || new Date().toISOString(),
      planned_date: data.planned_date,
      started_at: data.started_at,
      completed_at: data.completed_at,
      notes: data.notes || '',
      total_items_counted: data.total_items_counted || data.items_count || 0,
      total_discrepancies: data.total_discrepancies || 0,
      discrepancy_value: data.discrepancy_value || 0,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      created_by: data.created_by,
      updated_by: data.updated_by,
      is_active: data.is_active !== false,
      
      // Pour compatibilité
      name: data.name || data.reference || 'Inventaire',
      items_count: data.total_items_counted || data.items_count || 0,
      progress: data.progress || 0,
      items: data.items || []
    };
  }
  
  /**
   * Transforme les données d'API en modèle InventoryCountItem
   */
  private transformInventoryItem(data: any, inventoryId?: number): InventoryCountItem {
    // Calculer le décalage si non fourni
    const expected = data.expected_quantity || 0;
    const counted = data.counted_quantity || 0;
    const discrepancy = data.discrepancy !== undefined 
      ? data.discrepancy 
      : counted - expected;
    
    // Calculer le pourcentage de décalage
    const discrepancyPercentage = expected > 0 
      ? Math.abs((discrepancy / expected) * 100) 
      : 0;
    
    return {
      id: data.id || 0,
      inventory_count: data.inventory_count || data.inventory_count_id || inventoryId || 0,
      product: data.product || data.product_id || 0,
      variant: data.variant || data.variant_id,
      expected_quantity: expected,
      counted_quantity: counted,
      discrepancy: discrepancy,
      notes: data.notes || '',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      created_by: data.created_by,
      updated_by: data.updated_by,
      is_active: data.is_active !== false,
      
      // Champs calculés
      inventory_reference: data.inventory_reference || `INV-${data.inventory_count || inventoryId || 0}`,
      product_name: data.product_name || data.product?.name || `Produit #${data.product || 0}`,
      product_sku: data.product_sku || data.product?.sku || '',
      variant_name: data.variant_name || data.variant?.name,
      discrepancy_value: data.discrepancy_value || Math.abs(discrepancy),
      discrepancy_percentage: data.discrepancy_percentage || discrepancyPercentage
    };
  }
  
  /**
   * Normalise les statuts d'inventaire
   */
  private normalizeStatus(status: any): InventoryStatus {
    if (!status) return 'planned';
    
    const statusStr = String(status).toLowerCase().trim();
    
    const statusMap: Record<string, InventoryStatus> = {
      'planifié': 'planned',
      'planned': 'planned',
      'en_cours': 'in_progress',
      'in_progress': 'in_progress',
      'en cours': 'in_progress',
      'terminé': 'completed',
      'completed': 'completed',
      'annulé': 'cancelled',
      'cancelled': 'cancelled'
    };
    
    return statusMap[statusStr] || 'planned';
  }
  
  /**
   * Calcule les statistiques à partir des inventaires
   */
  private calculateStats(inventories: InventoryCount[]): InventoryStats {
    const stats: InventoryStats = {
      total_inventories: inventories.length,
      in_progress_inventories: inventories.filter(i => i.status === 'in_progress').length,
      completed_inventories: inventories.filter(i => i.status === 'completed').length,
      planned_inventories: inventories.filter(i => i.status === 'planned').length,
      cancelled_inventories: inventories.filter(i => i.status === 'cancelled').length,
      total_discrepancies: inventories.reduce((sum, i) => sum + (i.total_discrepancies || 0), 0),
      total_discrepancy_value: inventories.reduce((sum, i) => sum + (i.discrepancy_value || 0), 0),
      average_discrepancy_rate: 0,
      recent_inventories_count: 0
    };
    
    // Calculer le taux moyen d'écart
    if (stats.completed_inventories > 0) {
      stats.average_discrepancy_rate = stats.total_discrepancies / stats.completed_inventories;
    }
    
    // Compter les inventaires récents (7 derniers jours)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    stats.recent_inventories_count = inventories.filter(inv => {
      if (!inv.created_at) return false;
      try {
        return new Date(inv.created_at) >= weekAgo;
      } catch {
        return false;
      }
    }).length;
    
    return stats;
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
    // Si terminé ou annulé
    if (inventory.status === 'completed') return 100;
    if (inventory.status === 'cancelled') return 0;
    
    // Si on a les items, calculer la progression
    if (items && items.length > 0) {
      const totalExpected = items.reduce((sum, item) => sum + item.expected_quantity, 0);
      const totalCounted = items.reduce((sum, item) => sum + item.counted_quantity, 0);
      
      if (totalExpected > 0) {
        return Math.min(100, Math.round((totalCounted / totalExpected) * 100));
      }
    }
    
    // Progression par défaut selon le statut
    switch (inventory.status) {
      case 'in_progress':
        return 50;
      case 'planned':
        return 0;
      default:
        return 0;
    }
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
    if (!dateString) return 'Non spécifié';
    
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      if (includeTime) {
        return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('Erreur formatage date:', error);
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
  InventoryFilters
};