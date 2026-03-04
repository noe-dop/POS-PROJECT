// src/services/warehouseService.ts
import api from './api';
import { AxiosResponse } from 'axios';

// Types de base
export interface Warehouse {
  id: number;
  name: string;
  address?: number;
  store: number;
  capacity: string;
  is_active: boolean;
  store_details?: {
    id: number;
    name: string;
    code?: string;
  };
  address_details?: {
    id: number;
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

export interface WarehouseFilters {
  store?: number;
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class WarehouseService {
  // ✅ CORRECTION 1: Ajustez le baseURL selon votre configuration
  // Si votre API est sur /api/warehouses/
  private baseURL = '/warehouses/';
  // Si votre API est sur /warehouses/ (sans préfixe)
  // private baseURL = '/warehouses/';
  
  // ✅ CORRECTION 2: Ajout d'une méthode pour tester la connexion
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await api.get(this.baseURL, { params: { page_size: 1 } });
      return { success: true, message: 'Connecté à l\'API des entrepôts' };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Impossible de se connecter' 
      };
    }
  }

  /**
   * Récupérer tous les entrepôts avec filtres
   */
  async getAllWarehouses(filters?: WarehouseFilters): Promise<Warehouse[] | PaginatedResponse<Warehouse>> {
    try {
      console.log('📡 Chargement des entrepôts...', this.baseURL, filters);
      
      const response: AxiosResponse<Warehouse[] | PaginatedResponse<Warehouse>> = await api.get(this.baseURL, { 
        params: {
          is_active: true,
          ...filters
        } 
      });
      
      console.log('✅ Entrepôts chargés:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur chargement entrepôts:', error.message);
      
      // ✅ CORRECTION 3: Message d'erreur plus explicite
      if (error.code === 'ERR_NETWORK') {
        console.error('🔌 Problème de connexion au serveur');
      } else if (error.response?.status === 404) {
        console.error('🔍 Endpoint non trouvé. Vérifiez baseURL:', this.baseURL);
      } else if (error.response?.status === 403) {
        console.error('🔒 Problème d\'authentification');
      }
      
      throw error;
    }
  }

  /**
   * Récupérer les entrepôts par magasin
   */
  async getWarehousesByStore(storeId: number, onlyActive: boolean = true): Promise<Warehouse[] | PaginatedResponse<Warehouse>> {
    try {
      console.log(`📡 Chargement des entrepôts du magasin ${storeId}...`);
      
      const response: AxiosResponse<Warehouse[] | PaginatedResponse<Warehouse>> = await api.get(this.baseURL, { 
        params: { 
          store: storeId,
          is_active: onlyActive ? true : undefined
        } 
      });
      
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur chargement entrepôts du magasin ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un entrepôt par son ID
   */
  async getWarehouse(id: number): Promise<Warehouse> {
    try {
      const response: AxiosResponse<Warehouse> = await api.get(`${this.baseURL}${id}/`);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur chargement entrepôt ${id}:`, error);
      throw error;
    }
  }

  /**
   * Créer un nouvel entrepôt
   */
  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    try {
      const response: AxiosResponse<Warehouse> = await api.post(this.baseURL, data);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur création entrepôt:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un entrepôt
   */
  async updateWarehouse(id: number, data: Partial<Warehouse>): Promise<Warehouse> {
    try {
      const response: AxiosResponse<Warehouse> = await api.put(`${this.baseURL}${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur mise à jour entrepôt ${id}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un entrepôt
   */
  async deleteWarehouse(id: number): Promise<void> {
    try {
      await api.delete(`${this.baseURL}${id}/`);
    } catch (error) {
      console.error(`❌ Erreur suppression entrepôt ${id}:`, error);
      throw error;
    }
  }

  /**
   * Activer/Désactiver un entrepôt
   */
  async toggleWarehouseStatus(id: number, isActive: boolean): Promise<Warehouse> {
    try {
      const response: AxiosResponse<Warehouse> = await api.patch(`${this.baseURL}${id}/`, {
        is_active: isActive
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur changement statut entrepôt ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les statistiques des entrepôts
   */
  async getWarehouseStats(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await api.get(`${this.baseURL}stats/`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur chargement statistiques:', error);
      throw error;
    }
  }

  /**
   * Rechercher des entrepôts
   */
  async searchWarehouses(query: string): Promise<Warehouse[] | PaginatedResponse<Warehouse>> {
    try {
      const response: AxiosResponse<Warehouse[] | PaginatedResponse<Warehouse>> = await api.get(this.baseURL, {
        params: { search: query }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erreur recherche entrepôts:', error);
      throw error;
    }
  }
}

// Export une instance unique
export const warehouseService = new WarehouseService();
export default warehouseService;