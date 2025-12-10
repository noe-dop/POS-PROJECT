// src/services/inventoryService.ts
import { api } from './api';

// Types correspondant à vos modèles Django
export interface InventoryCount {
  id: number;
  reference: string;
  name?: string;
  store_id: number;
  store_name?: string;
  count_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  items_count?: number;
  total_discrepancy_value?: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface InventoryCountItem {
  id: number;
  inventory_count: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  expected_quantity: number;
  counted_quantity: number;
  discrepancy: number;
  discrepancy_percentage: number;
  discrepancy_value: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryStats {
  total_inventories: number;
  in_progress_inventories: number;
  completed_inventories: number;
  planned_inventories: number;
  total_discrepancies: number;
  total_discrepancy_value: number;
}

export interface CreateInventoryData {
  name: string;
  store_id: number;
  count_date: string;
  notes?: string;
}

class InventoryService {
  /**
   * Récupère tous les inventaires
   */
  async getInventories(filters?: {
    status?: string;
    search?: string;
    store?: string;
  }): Promise<InventoryCount[]> {
    try {
      console.log('🔄 Chargement des inventaires...');

      const params: any = {};
      if (filters?.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters?.search) {
        params.search = filters.search;
      }

      // Appel à l'API Django
      const response = await api.get<any>('/inventory-counts/', params);
      
      console.log('📦 Réponse API:', response);

      // Vérifier la structure de la réponse
      let inventoryData: any[] = [];
      
      if (Array.isArray(response)) {
        // Simple tableau
        inventoryData = response;
      } else if (response?.results && Array.isArray(response.results)) {
        // Réponse paginée Django
        inventoryData = response.results;
      } else if (response?.data?.results) {
        // Autre structure possible
        inventoryData = response.data.results;
      } else if (response?.data && Array.isArray(response.data)) {
        inventoryData = response.data;
      }

      console.log('📊 Données brutes:', inventoryData);

      // Transformer les données
      const transformed = inventoryData.map((item: any) => ({
        id: item.id,
        reference: item.reference || `INV-${item.id}`,
        name: item.name || item.reference || `Inventaire ${item.id}`,
        store_id: item.store_id || item.store?.id || 0,
        store_name: item.store_name || item.store?.name || '',
        count_date: item.count_date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: this.normalizeStatus(item.status),
        notes: item.notes,
        items_count: item.items_count || 0,
        total_discrepancy_value: item.total_discrepancy_value || 0,
        created_at: item.created_at,
        updated_at: item.updated_at,
        started_at: item.started_at,
        completed_at: item.completed_at
      }));

      console.log('✅ Inventaires transformés:', transformed.length);
      return transformed;

    } catch (error: any) {
      console.error('❌ Erreur getInventories:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw new Error(`Impossible de charger les inventaires: ${error.message}`);
    }
  }

  /**
   * Récupère les statistiques
   */
  async getInventoryStats(): Promise<InventoryStats> {
    try {
      console.log('📊 Chargement des statistiques...');
      
      // Essayer l'endpoint stats
      try {
        const response = await api.get<any>('/inventory-counts/stats/');
        console.log('📈 Stats reçues:', response);
        
        return {
          total_inventories: response.total_counts || response.total_inventories || 0,
          in_progress_inventories: response.counts_in_progress || response.in_progress_inventories || 0,
          completed_inventories: response.counts_completed || response.completed_inventories || 0,
          planned_inventories: response.counts_pending || response.planned_inventories || 0,
          total_discrepancies: response.items_with_discrepancy || response.total_discrepancies || 0,
          total_discrepancy_value: response.total_discrepancy_value || 0
        };
      } catch (statsError: any) {
        console.log('❌ Erreur stats endpoint:', statsError.message);
        
        // Fallback: calculer depuis les inventaires
        const inventories = await this.getInventories();
        return this.calculateStatsFromInventories(inventories);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur getInventoryStats:', error);
      
      throw new Error(`Impossible de charger les statistiques: ${error.message}`);
    }
  }

  /**
   * Récupère les items d'un inventaire
   */
  async getInventoryItems(inventoryId: number): Promise<InventoryCountItem[]> {
    try {
      console.log(`📋 Chargement des items pour inventaire ${inventoryId}...`);
      
      // Essayer plusieurs endpoints possibles
      const endpoints = [
        `/inventory-counts/${inventoryId}/items/`,
        `/inventory-count-items/?inventory_count=${inventoryId}`,
        `/inventory-count-items/?inventory_count_id=${inventoryId}`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await api.get<any>(endpoint);
          
          let itemsData: any[] = [];
          if (Array.isArray(response)) {
            itemsData = response;
          } else if (response?.results) {
            itemsData = response.results;
          } else if (response?.items) {
            itemsData = response.items;
          }

          if (itemsData.length > 0) {
            console.log(`✅ ${itemsData.length} items trouvés via ${endpoint}`);
            
            return itemsData.map((item: any) => ({
              id: item.id,
              inventory_count: item.inventory_count || item.inventory_count_id || inventoryId,
              product_id: item.product_id || item.product?.id,
              product_name: item.product_name || item.product?.name || '',
              product_sku: item.product_sku || item.product?.sku || '',
              expected_quantity: item.expected_quantity || 0,
              counted_quantity: item.counted_quantity || 0,
              discrepancy: item.discrepancy || 0,
              discrepancy_percentage: item.discrepancy_percentage || 0,
              discrepancy_value: item.discrepancy_value || 0,
              notes: item.notes,
              created_at: item.created_at,
              updated_at: item.updated_at
            }));
          }
        } catch (endpointError: any) {
          if (endpointError.response?.status !== 404) {
            console.log(`❌ Endpoint ${endpoint} erreur:`, endpointError.message);
          }
        }
      }

      console.log('⚠️ Aucun item trouvé');
      return [];
      
    } catch (error: any) {
      console.error('❌ Erreur getInventoryItems:', error);
      throw new Error(`Impossible de charger les items de l'inventaire: ${error.message}`);
    }
  }

  /**
   * Crée un nouvel inventaire
   */
  async createInventory(data: CreateInventoryData): Promise<InventoryCount> {
    try {
      console.log('🔄 Création d\'inventaire:', data);
      
      const inventoryData = {
        store_id: data.store_id,
        count_date: data.count_date,
        name: data.name,
        notes: data.notes || '',
        status: 'planned'
      };

      const response = await api.post<InventoryCount>('/inventory-counts/', inventoryData);
      console.log('✅ Inventaire créé:', response);
      
      return response;
      
    } catch (error: any) {
      console.error('❌ Erreur createInventory:', error);
      
      let errorMessage = 'Impossible de créer l\'inventaire';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData, null, 2);
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Démarre un inventaire
   */
  async startInventory(id: number): Promise<void> {
    try {
      console.log(`▶️ Démarrage de l'inventaire ${id}`);
      
      // Essayer l'endpoint spécifique
      try {
        await api.post(`/inventory-counts/${id}/start/`, {});
        console.log('✅ Inventaire démarré');
        return;
      } catch (startError: any) {
        console.log('❌ Endpoint start non disponible, mise à jour manuelle');
      }

      // Fallback: mettre à jour le statut manuellement
      await api.patch(`/inventory-counts/${id}/`, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      
      console.log('✅ Statut mis à jour via PATCH');
      
    } catch (error: any) {
      console.error('❌ Erreur startInventory:', error);
      throw new Error(`Impossible de démarrer l'inventaire: ${error.message}`);
    }
  }

  /**
   * Termine un inventaire
   */
  async completeInventory(id: number): Promise<void> {
    try {
      console.log(`✅ Terminaison de l'inventaire ${id}`);
      
      // Essayer l'endpoint spécifique
      try {
        await api.post(`/inventory-counts/${id}/complete/`, {});
        console.log('✅ Inventaire terminé');
        return;
      } catch (completeError: any) {
        console.log('❌ Endpoint complete non disponible, mise à jour manuelle');
      }

      // Fallback: mettre à jour le statut manuellement
      await api.patch(`/inventory-counts/${id}/`, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      
      console.log('✅ Statut mis à jour via PATCH');
      
    } catch (error: any) {
      console.error('❌ Erreur completeInventory:', error);
      throw new Error(`Impossible de terminer l'inventaire: ${error.message}`);
    }
  }

  /**
   * Exporte un inventaire
   */
  async exportInventory(id: number, format: 'pdf' | 'excel'): Promise<Blob> {
    try {
      console.log(`📤 Export de l'inventaire ${id} en ${format}`);
      
      const endpoint = `/inventory-counts/${id}/export/`;
      const params = { format };
      
      const response = await api.get(endpoint, params, {
        responseType: 'blob'
      });
      
      return response;
      
    } catch (error: any) {
      console.error('❌ Erreur exportInventory:', error);
      throw new Error(`Impossible d'exporter l'inventaire: ${error.message}`);
    }
  }

  /**
   * Supprime un inventaire
   */
  async deleteInventory(id: number): Promise<void> {
    try {
      console.log(`🗑️ Suppression de l'inventaire ${id}`);
      await api.delete(`/inventory-counts/${id}/`);
      console.log('✅ Inventaire supprimé');
    } catch (error: any) {
      console.error('❌ Erreur deleteInventory:', error);
      throw new Error(`Impossible de supprimer l'inventaire: ${error.message}`);
    }
  }

  /**
   * Met à jour un inventaire
   */
  async updateInventory(id: number, data: Partial<CreateInventoryData>): Promise<InventoryCount> {
    try {
      console.log(`✏️ Mise à jour de l'inventaire ${id}:`, data);
      
      const response = await api.patch<InventoryCount>(`/inventory-counts/${id}/`, data);
      console.log('✅ Inventaire mis à jour:', response);
      
      return response;
      
    } catch (error: any) {
      console.error('❌ Erreur updateInventory:', error);
      
      let errorMessage = 'Impossible de mettre à jour l\'inventaire';
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData, null, 2);
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Méthodes utilitaires
   */
  private normalizeStatus(status: any): InventoryCount['status'] {
    if (!status) return 'planned';
    
    const statusMap: Record<string, InventoryCount['status']> = {
      'pending': 'planned',
      'en_cours': 'in_progress',
      'terminé': 'completed',
      'annulé': 'cancelled',
      'planned': 'planned',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    
    const normalized = statusMap[status?.toLowerCase()] || 'planned';
    return normalized;
  }

  private calculateStatsFromInventories(inventories: InventoryCount[]): InventoryStats {
    const inProgress = inventories.filter(inv => inv.status === 'in_progress').length;
    const completed = inventories.filter(inv => inv.status === 'completed').length;
    const planned = inventories.filter(inv => inv.status === 'planned').length;
    
    return {
      total_inventories: inventories.length,
      in_progress_inventories: inProgress,
      completed_inventories: completed,
      planned_inventories: planned,
      total_discrepancies: 0, // Ne peut pas être calculé sans les items
      total_discrepancy_value: inventories.reduce((sum, inv) => sum + (inv.total_discrepancy_value || 0), 0)
    };
  }
}

export const inventoryService = new InventoryService();

// Utilitaires
export class InventoryUtils {
  static getProgressPercentage(inventory: InventoryCount): number {
    if (inventory.status === 'completed') return 100;
    if (inventory.status === 'cancelled') return 0;
    if (inventory.status === 'in_progress') return 50;
    return 0;
  }

  static getStatusColor(status: string): string {
    const statusColors = {
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'planned': 'bg-gray-100 text-gray-800 border-gray-200',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  static getStatusDisplay(status: string): string {
    const statusDisplay = {
      'completed': 'Terminé',
      'planned': 'Planifié',
      'in_progress': 'En cours',
      'cancelled': 'Annulé'
    };
    return statusDisplay[status] || status;
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  static formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  static validateInventoryData(data: CreateInventoryData): string[] {
    const errors: string[] = [];
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Le nom est obligatoire');
    }
    
    if (data.name && data.name.length > 200) {
      errors.push('Le nom ne peut pas dépasser 200 caractères');
    }
    
    if (!data.store_id || data.store_id <= 0) {
      errors.push('Le magasin est obligatoire');
    }
    
    if (!data.count_date) {
      errors.push('La date de comptage est obligatoire');
    }
    
    return errors;
  }
}