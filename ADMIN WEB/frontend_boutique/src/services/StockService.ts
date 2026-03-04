// src/services/StockService.ts - VERSION CORRIGÉE
import api from './api';
import { 
  Stock, 
  StockStats, 
  StockFilters, 
  CreateStockData, 
  UpdateStockData,
  PaginatedResponse 
} from '@/types/stock.types.ts';

// Interface pour la réponse paginée Django
interface DjangoPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class StockService {
  private baseEndpoint = '/stocks/';

  /**
   * Récupère tous les stocks avec pagination
   */
  async getStocks(filters?: StockFilters): Promise<PaginatedResponse<Stock>> {
    try {
      console.log('📡 Récupération des stocks avec filtres:', filters);
      
      const params = this.buildQueryParams(filters);
      
      // AJOUT: Toujours inclure les détails des relations
      params.expand = 'product,store,warehouse';
      params.page_size = filters?.page_size || 20;
      
      const response = await api.getFullResponse<DjangoPaginatedResponse<Stock>>(this.baseEndpoint, { params });
      
      console.log('✅ Stocks récupérés:', response.data.results?.length || 0, 'sur', response.data.count || 0);
      
      // Debug: vérifier les données reçues
      if (response.data.results && response.data.results.length > 0) {
        const sampleStock = response.data.results[0];
        console.log('🔍 Exemple de données reçues:', {
          productId: sampleStock.product,
          productName: sampleStock.product_details?.name || 'NON DISPONIBLE',
          storeName: sampleStock.store_details?.name || 'NON DISPONIBLE',
          warehouseName: sampleStock.warehouse_details?.name || 'NON DISPONIBLE'
        });
      }
      
      return {
        data: response.data.results || [],
        total: response.data.count || 0,
        page: filters?.page || 1,
        page_size: filters?.page_size || 20,
        next: response.data.next || null,
        previous: response.data.previous || null
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stocks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Récupère un stock spécifique par ID
   */
  async getStock(id: number): Promise<Stock> {
    try {
      console.log(`📡 Récupération du stock ${id}`);
      const response = await api.get<Stock>(`${this.baseEndpoint}${id}/?expand=product,store,warehouse`);
      return response;
    } catch (error) {
      console.error(`❌ Erreur récupération stock ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Crée un nouveau stock
   */
  async createStock(stockData: CreateStockData): Promise<Stock> {
    try {
      console.log('📡 Création d\'un nouveau stock:', stockData);
      
      const data = {
        ...stockData,
        quantity_available: (stockData.quantity_on_hand || 0) - (stockData.quantity_reserved || 0)
      };
      
      return await api.post<Stock>(this.baseEndpoint, data);
    } catch (error) {
      console.error('❌ Erreur création stock:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Met à jour un stock existant
   */
  async updateStock(id: number, stockData: UpdateStockData): Promise<Stock> {
    try {
      console.log(`📡 Mise à jour du stock ${id}:`, stockData);
      
      if (stockData.quantity_on_hand !== undefined || stockData.quantity_reserved !== undefined) {
        const currentStock = await this.getStock(id);
        const newOnHand = stockData.quantity_on_hand ?? currentStock.quantity_on_hand;
        const newReserved = stockData.quantity_reserved ?? currentStock.quantity_reserved;
        
        stockData.quantity_available = newOnHand - newReserved;
      }
      
      return await api.patch<Stock>(`${this.baseEndpoint}${id}/`, stockData);
    } catch (error) {
      console.error(`❌ Erreur mise à jour stock ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Supprime un stock
   */
  async deleteStock(id: number): Promise<void> {
    try {
      console.log(`📡 Suppression du stock ${id}`);
      await api.delete(`${this.baseEndpoint}${id}/`);
    } catch (error) {
      console.error(`❌ Erreur suppression stock ${id}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Récupère les statistiques de stock - VERSION CORRIGÉE
   */
  async getStats(params?: { store?: number; warehouse?: number }): Promise<StockStats> {
    try {
      console.log('📡 Calcul des statistiques localement...');
      
      // NE PAS appeler /stocks/stats/ - Calculez localement
      const filters: StockFilters = {};
      if (params?.store) filters.store = params.store;
      if (params?.warehouse) filters.warehouse = params.warehouse;
      filters.page_size = 1000;
      
      const stocksData = await this.getStocks(filters);
      return this.calculateLocalStats(stocksData.data);
      
    } catch (error) {
      console.error('❌ Erreur calcul statistiques:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Exporte les stocks en JSON
   */
  async exportStocks(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      console.log('📡 Export des stocks en', format);
      
      // Note: Cet endpoint n'existe peut-être pas non plus
      // Vous pouvez le commenter temporairement
      console.warn('⚠️ Endpoint /stocks/export/ peut ne pas exister');
      
      // Pour l'instant, retourner un Blob vide
      return new Blob([JSON.stringify([])], { type: 'application/json' });
      
    } catch (error) {
      console.error('❌ Erreur export stocks:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Recherche dans les stocks
   */
  async searchStocks(query: string, filters?: StockFilters): Promise<Stock[]> {
    try {
      console.log(`🔍 Recherche stocks: "${query}"`);
      
      const searchFilters: StockFilters = {
        ...filters,
        search: query,
        page_size: 50
      };
      
      const response = await this.getStocks(searchFilters);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur recherche stocks:', error);
      return [];
    }
  }

  /**
   * Récupère les stocks en alerte
   */
  async getAlertStocks(threshold?: number): Promise<Stock[]> {
    try {
      console.log('⚠️ Récupération des alertes stock');
      
      const filters: StockFilters = {
        stock_status: 'low_stock,out_of_stock',
        ordering: 'quantity_available',
        page_size: 100
      };
      
      if (threshold !== undefined) {
        filters.max_quantity = threshold;
      }
      
      const response = await this.getStocks(filters);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur récupération alertes:', error);
      return [];
    }
  }

  /**
   * Test la connexion à l'API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔗 Test connexion API...');
      
      const endpoints = [
        { path: '/stocks/', name: 'Stocks' },
        { path: '/products/', name: 'Produits' },
        { path: '/stores/', name: 'Magasins' }
      ];
      
      let availableEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          await api.getFullResponse(endpoint.path, { params: { page_size: 1 } });
          console.log(`✅ ${endpoint.name} accessible`);
          availableEndpoints++;
        } catch (err) {
          console.log(`⚠️ ${endpoint.name} non accessible:`, err.message);
        }
      }
      
      if (availableEndpoints === endpoints.length) {
        return { success: true, message: '✅ API complètement accessible' };
      } else if (availableEndpoints > 0) {
        return { success: true, message: `⚠️ API partiellement accessible (${availableEndpoints}/${endpoints.length})` };
      } else {
        return { success: false, message: '❌ API non accessible' };
      }
    } catch (error) {
      console.error('❌ Test connexion échoué:', error);
      return { success: false, message: '❌ Impossible de contacter le serveur' };
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private calculateLocalStats(stocks: Stock[]): StockStats {
    if (!stocks || stocks.length === 0) {
      return this.getEmptyStats();
    }
    
    const totalStock = stocks.reduce((sum, stock) => sum + (stock.quantity_on_hand || 0), 0);
    const outOfStock = stocks.filter(s => s.stock_status === 'out_of_stock').length;
    const lowStock = stocks.filter(s => s.stock_status === 'low_stock').length;
    const inStock = stocks.filter(s => s.stock_status === 'in_stock').length;
    const overStock = stocks.filter(s => s.stock_status === 'over_stock').length;
    
    // Pour votre modèle, il n'y a pas de champ cost_price
    // Donc totalValue = 0
    const totalValue = 0;
    const averageStockValue = 0;
    
    const averageTurnover = stocks.length > 0 
      ? stocks.reduce((sum, stock) => sum + (stock.stock_turnover_rate || 0), 0) / stocks.length
      : 0;
    
    return {
      totalProducts: stocks.length,
      totalStock,
      outOfStock,
      lowStock,
      inStock,
      over_stock_count: overStock,
      totalValue,
      averageStockValue,
      total_quantity: totalStock,
      average_turnover: averageTurnover
    };
  }

  private getEmptyStats(): StockStats {
    return {
      totalProducts: 0,
      totalStock: 0,
      outOfStock: 0,
      lowStock: 0,
      inStock: 0,
      over_stock_count: 0,
      totalValue: 0,
      averageStockValue: 0,
      total_quantity: 0,
      average_turnover: 0
    };
  }

  private buildQueryParams(filters?: StockFilters): Record<string, any> {
    if (!filters) return {};

    const params: Record<string, any> = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    });

    // AJOUT CRITIQUE: Toujours inclure les détails des relations
    params.expand = 'product,store,warehouse';
    
    return params;
  }

  private handleError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Erreur validation: ${this.formatValidationError(data)}`);
        case 401:
          return new Error('Non authentifié - Veuillez vous reconnecter');
        case 403:
          return new Error('Permission refusée');
        case 404:
          return new Error('Ressource non trouvée');
        case 500:
          return new Error('Erreur serveur - Veuillez réessayer plus tard');
        default:
          return new Error(`Erreur ${status}: ${data?.detail || 'Erreur inconnue'}`);
      }
    } else if (error.request) {
      return new Error('Pas de réponse du serveur - Vérifiez votre connexion');
    } else {
      return new Error('Erreur de configuration');
    }
  }

  private formatValidationError(data: any): string {
    if (typeof data === 'string') return data;
    
    let errorMessage = '';
    
    if (Array.isArray(data)) {
      errorMessage = data.join(', ');
    } else if (typeof data === 'object') {
      Object.entries(data).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          errorMessage += `${field}: ${messages.join(', ')}; `;
        } else {
          errorMessage += `${field}: ${messages}; `;
        }
      });
    } else {
      errorMessage = JSON.stringify(data);
    }
    
    return errorMessage;
  }
}

// Export singleton
const stockServiceInstance = new StockService();
export default stockServiceInstance;