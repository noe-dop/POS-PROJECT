// src/services/StockService.ts - CORRECTION DES TYPES ERROR
import api from './api';
import { 
  Stock, 
  StockMovement, 
  InventoryCount,
  ReorderRule,
  Warehouse,
  Batch,
  StockStats
} from '@/types/stocktypes';

// Définir localement l'interface PaginatedResponse 
// pour correspondre à ce que votre API retourne
interface DjangoPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Interface pour la réponse paginée simplifiée (pour notre service)
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  page_size?: number;
  next?: string | null;
  previous?: string | null;
}

// Type pour les erreurs
interface ApiError extends Error {
  response?: {
    status?: number;
    data?: any;
    statusText?: string;
  };
  request?: any;
  config?: any;
}

class StockService {
  private endpointStatus: Record<string, boolean> = {};
  
  // ==================== STOCKS (ESSENTIEL) ====================
  async getStocks(params?: {
    store_id?: number;
    search?: string;
    page?: number;
    page_size?: number;
    status?: string;
    product_id?: number;
    warehouse_id?: number;
    category?: string;
    is_low_stock?: boolean;
  }): Promise<PaginatedResponse<Stock>> {
    try {
      // Votre API retourne directement les résultats (pas l'objet paginé)
      const data: Stock[] = await api.get('/stocks/', { params });
      this.endpointStatus['/stocks/'] = true;
      
      console.log(`📦 Récupéré ${data?.length || 0} stocks depuis API`);
      
      // Pour vérifier si on a une réponse paginée complète
      try {
        // Essayer de récupérer la réponse complète pour les métadonnées
        const fullResponse = await api.getFullResponse('/stocks/', { params });
        
        // Vérifier si c'est un objet paginé Django
        const responseData = fullResponse.data;
        if (responseData && typeof responseData === 'object' && 'results' in responseData) {
          const paginatedData = responseData as DjangoPaginatedResponse<Stock>;
          return {
            data: paginatedData.results || [],
            total: paginatedData.count || paginatedData.results?.length || 0,
            page: params?.page || 1,
            page_size: params?.page_size || 10,
            next: paginatedData.next,
            previous: paginatedData.previous
          };
        }
      } catch (metaError: unknown) {
        // Si la récupération des métadonnées échoue, on continue avec les données de base
        const errorMessage = metaError instanceof Error ? metaError.message : 'Erreur inconnue';
        console.log('ℹ️ Métadonnées de pagination non disponibles:', errorMessage);
      }
      
      // Format simple (votre API retourne directement un tableau)
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0,
        page: params?.page || 1,
        page_size: params?.page_size || 10
      };
    } catch (error: unknown) {
      this.endpointStatus['/stocks/'] = false;
      
      // Convertir l'erreur en ApiError pour accéder aux propriétés
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      console.warn('⚠️ Erreur getStocks:', errorMessage);
      
      // Pour les erreurs 404, retourner des données vides
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /stocks/ non disponible');
        return {
          data: [],
          total: 0,
          page: params?.page || 1,
          page_size: params?.page_size || 10
        };
      }
      
      // Ne pas throw pour éviter de bloquer l'interface
      console.log('⚠️ Erreur non critique getStocks, retourne vide');
      return {
        data: [],
        total: 0,
        page: params?.page || 1,
        page_size: params?.page_size || 10
      };
    }
  }

  // ==================== MOUVEMENTS DE STOCK (ESSENTIEL) ====================
  async getStockMovements(params?: {
    store_id?: number;
    product_id?: number;
    movement_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<StockMovement>> {
    try {
      // Votre API retourne directement les résultats
      const data: StockMovement[] = await api.get('/stock-movements/', { params });
      this.endpointStatus['/stock-movements/'] = true;
      
      console.log(`📊 Récupéré ${data?.length || 0} mouvements depuis API`);
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0,
        page: params?.page || 1,
        page_size: params?.page_size || 10
      };
    } catch (error: unknown) {
      this.endpointStatus['/stock-movements/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      // Pour les erreurs 404, retourner des données vides
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /stock-movements/ non disponible, retourne vide');
        return {
          data: [],
          total: 0,
          page: params?.page || 1,
          page_size: params?.page_size || 10
        };
      }
      
      console.warn('⚠️ Erreur getStockMovements:', errorMessage);
      // Ne pas throw, retourner vide
      return {
        data: [],
        total: 0,
        page: params?.page || 1,
        page_size: params?.page_size || 10
      };
    }
  }

  async createStockMovement(movementData: {
    product_id: number;
    store_id?: number;
    warehouse_id?: number;
    movement_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
    quantity: number;
    unit_price?: number;
    notes?: string;
    reference?: string;
    batch_number?: string;
    performed_by?: number;
  }): Promise<StockMovement> {
    try {
      const data = await api.post<StockMovement>('/stock-movements/', movementData);
      console.log('✅ Mouvement créé avec succès:', data);
      return data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('❌ Erreur createStockMovement:', apiError);
      
      if (apiError.response?.status === 400) {
        const errors = apiError.response.data;
        throw new Error(`Validation: ${JSON.stringify(errors)}`);
      }
      
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      throw new Error(`Création mouvement impossible: ${errorMessage}`);
    }
  }

  // ==================== STATISTIQUES (ESSENTIEL AVEC FALLBACK) ====================
  async getStockStats(store_id?: number): Promise<StockStats> {
    try {
      // Essayer l'endpoint dédié
      const stats = await api.get<StockStats>('/stocks/stats/', { params: { store_id } });
      this.endpointStatus['/stocks/stats/'] = true;
      
      return stats;
    } catch (error: unknown) {
      this.endpointStatus['/stocks/stats/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      console.warn('⚠️ Endpoint /stocks/stats/ non disponible, calcul local:', errorMessage);
      
      try {
        // Fallback: Calculer à partir des stocks
        const stocksResult = await this.getStocks({ 
          store_id, 
          page_size: 1000 
        });
        const stocks = stocksResult.data;
        
        // Calcul basé sur les champs de vos serializers
        const totalStock = stocks.reduce((sum, stock) => sum + (stock.quantity_on_hand || 0), 0);
        const outOfStock = stocks.filter(s => s.stock_status === 'out_of_stock').length;
        const lowStock = stocks.filter(s => s.is_low_stock === true || s.stock_status === 'low_stock').length;
        const totalValue = stocks.reduce((sum, stock) => {
          const quantity = stock.quantity_on_hand || 0;
          const costPrice = stock.product?.cost_price || 0;
          return sum + (quantity * costPrice);
        }, 0);
        
        const stats = {
          totalProducts: stocks.length,
          totalStock,
          outOfStock,
          lowStock,
          totalValue,
          averageStockValue: stocks.length > 0 ? totalValue / stocks.length : 0
        };
        
        console.log('📊 Statistiques calculées localement:', stats);
        return stats;
      } catch (fallbackError: unknown) {
        const fallbackApiError = fallbackError as ApiError;
        const fallbackErrorMessage = fallbackApiError instanceof Error ? fallbackApiError.message : 'Erreur inconnue';
        
        console.warn('⚠️ Impossible de calculer les stats:', fallbackErrorMessage);
        
        // Valeurs par défaut minimales
        return {
          totalProducts: 0,
          totalStock: 0,
          outOfStock: 0,
          lowStock: 0,
          totalValue: 0,
          averageStockValue: 0
        };
      }
    }
  }

  // ==================== RÈGLES DE RÉAPPROVISIONNEMENT ====================
  async getReorderRules(params?: {
    store_id?: number;
    product_id?: number;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<ReorderRule>> {
    try {
      const data = await api.get<ReorderRule[]>('/reorder-rules/', { params });
      this.endpointStatus['/reorder-rules/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/reorder-rules/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /reorder-rules/ non disponible');
      } else {
        console.warn('⚠️ Erreur getReorderRules:', errorMessage);
      }
      
      // Retourner vide sans throw
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== ALERTES DE STOCK ====================
  async getStockAlerts(params?: {
    store_id?: number;
    severity?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<any>> {
    try {
      const data = await api.get<any[]>('/stock-alerts/', { params });
      this.endpointStatus['/stock-alerts/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/stock-alerts/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /stock-alerts/ non disponible');
      } else {
        console.warn('⚠️ Erreur getStockAlerts:', errorMessage);
      }
      
      // Retourner vide sans throw
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== ENTREPÔTS (WAREHOUSES) ====================
  async getWarehouses(params?: {
    store_id?: number;
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<PaginatedResponse<Warehouse>> {
    try {
      const data = await api.get<Warehouse[]>('/warehouses/', { params });
      this.endpointStatus['/warehouses/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/warehouses/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /warehouses/ non disponible');
      } else {
        console.warn('⚠️ Erreur getWarehouses:', errorMessage);
      }
      
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== INVENTORY COUNTS ====================
  async getInventoryCounts(params?: {
    store_id?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<InventoryCount>> {
    try {
      const data = await api.get<InventoryCount[]>('/inventory-counts/', { params });
      this.endpointStatus['/inventory-counts/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/inventory-counts/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /inventory-counts/ non disponible');
      } else {
        console.warn('⚠️ Erreur getInventoryCounts:', errorMessage);
      }
      
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== BATCHES (LOTS) ====================
  async getBatches(params?: {
    store_id?: number;
    product_id?: number;
    expired?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Batch>> {
    try {
      const data = await api.get<Batch[]>('/batches/', { params });
      this.endpointStatus['/batches/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/batches/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /batches/ non disponible');
      } else {
        console.warn('⚠️ Erreur getBatches:', errorMessage);
      }
      
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== PRODUITS (PRODUCTS) ====================
  async getProducts(params?: {
    store_id?: number;
    category?: string;
    brand?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<PaginatedResponse<any>> {
    try {
      const data = await api.get<any[]>('/products/', { params });
      this.endpointStatus['/products/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/products/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /products/ non disponible');
      } else {
        console.warn('⚠️ Erreur getProducts:', errorMessage);
      }
      
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== STORE PRODUCTS (PRODUITS PAR MAGASIN) ====================
  async getStoreProducts(params?: {
    store_id?: number;
    product_id?: number;
    page?: number;
    page_size?: number;
    is_active?: boolean;
  }): Promise<PaginatedResponse<any>> {
    try {
      const data = await api.get<any[]>('/store-products/', { params });
      this.endpointStatus['/store-products/'] = true;
      
      return {
        data: Array.isArray(data) ? data : [],
        total: Array.isArray(data) ? data.length : 0
      };
    } catch (error: unknown) {
      this.endpointStatus['/store-products/'] = false;
      
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      if (apiError.response?.status === 404) {
        console.log('ℹ️ Endpoint /store-products/ non disponible');
      } else {
        console.warn('⚠️ Erreur getStoreProducts:', errorMessage);
      }
      
      return {
        data: [],
        total: 0
      };
    }
  }

  // ==================== ACTIONS ====================
  
  async updateStock(id: number, stockData: Partial<Stock>): Promise<Stock> {
    try {
      const data = await api.patch<Stock>(`/stocks/${id}/`, stockData);
      return data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error(`❌ Erreur updateStock(${id}):`, apiError);
      throw apiError;
    }
  }

  async createProduct(productData: {
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
  }): Promise<any> {
    try {
      const data = await api.post<any>('/products/', productData);
      return data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('❌ Erreur createProduct:', apiError);
      
      if (apiError.response?.status === 400) {
        const errors = apiError.response.data;
        throw new Error(`Validation: ${JSON.stringify(errors)}`);
      }
      
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      throw new Error(`Création produit impossible: ${errorMessage}`);
    }
  }

  async createInventoryCount(countData: any): Promise<InventoryCount> {
    try {
      const data = await api.post<InventoryCount>('/inventory-counts/', countData);
      return data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('❌ Erreur createInventoryCount:', apiError);
      throw apiError;
    }
  }

  async transferStock(transferData: {
    product_id: number;
    from_warehouse_id: number;
    to_warehouse_id: number;
    quantity: number;
    notes?: string;
    reference?: string;
  }): Promise<any> {
    try {
      const data = await api.post<any>('/stock-transfers/', transferData);
      return data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      console.error('❌ Erreur transferStock:', apiError);
      throw apiError;
    }
  }

  // ==================== TEST DE CONNEXION INTELLIGENT ====================
  async testConnection(): Promise<{ success: boolean; message: string; endpoints?: string[] }> {
    try {
      // Vérifier l'authentification
      const token = localStorage.getItem('access_token') || 
                    localStorage.getItem('token');
      const isAuthenticated = !!token;

      // Tester les endpoints essentiels
      const essentialEndpoints = [
        { path: '/stocks/', name: 'Stocks' },
        { path: '/stock-movements/', name: 'Mouvements' }
      ];

      const availableEndpoints: string[] = [];

      // Tester chaque endpoint
      for (const endpoint of essentialEndpoints) {
        try {
          await api.get(endpoint.path, { page_size: 1 });
          availableEndpoints.push(endpoint.name);
          console.log(`✅ ${endpoint.name} accessible`);
        } catch (err: unknown) {
          const apiErr = err as ApiError;
          const errMessage = apiErr instanceof Error ? apiErr.message : 'Erreur inconnue';
          console.warn(`⚠️ ${endpoint.name}:`, errMessage);
        }
      }

      // Déterminer le statut
      let message = '';
      let success = false;

      if (availableEndpoints.length === essentialEndpoints.length) {
        success = true;
        message = '✅ API connectée';
      } else if (availableEndpoints.length > 0) {
        success = true;
        message = `🟡 API partielle (${availableEndpoints.join(', ')})`;
      } else if (isAuthenticated) {
        message = '🟡 Token valide mais API non accessible';
      } else {
        message = '🟡 Connexion en cours...';
      }

      return {
        success,
        message,
        endpoints: availableEndpoints
      };

    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      console.error('🔴 Erreur test connexion:', apiError);
      
      let message = '🟡 Connexion en cours...';
      
      if (apiError.response) {
        const status = apiError.response.status;
        if (status === 401) {
          message = '🟡 Token invalide ou expiré';
        } else if (status === 403) {
          message = '🔴 Accès interdit';
        } else if (status === 404) {
          message = '🟡 Routes API non trouvées';
        }
      } else if (apiError.message?.includes('timeout') || apiError.message?.includes('ECONNABORTED')) {
        message = '🔴 Timeout - Serveur non accessible';
      } else if (apiError.message?.includes('Network Error')) {
        message = '🔴 Aucune connexion réseau';
      }
      
      return { 
        success: false, 
        message 
      };
    }
  }

  // ==================== UTILITAIRES ====================
  
  getEndpointStatus(endpoint: string): boolean {
    return this.endpointStatus[endpoint] || false;
  }

  getAllEndpointStatuses(): Record<string, boolean> {
    return { ...this.endpointStatus };
  }

  async exportStockData(format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<Blob> {
    try {
      const response = await api.getFullResponse<Blob>('/stocks/export/', {
        params: { format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      console.error('❌ Erreur exportStockData:', apiError);
      throw new Error(`Export impossible: ${errorMessage}`);
    }
  }

  async importStockData(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/stocks/import/', formData);
      
      return {
        success: true,
        message: '✅ Importation réussie'
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError instanceof Error ? apiError.message : 'Erreur inconnue';
      
      console.error('❌ Erreur importStockData:', apiError);
      return {
        success: false,
        message: `❌ Importation impossible: ${errorMessage}`
      };
    }
  }
}

// Export singleton instance
export default new StockService();