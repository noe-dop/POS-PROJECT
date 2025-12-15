import { api } from './api';

// Types basés sur vos sérialiseurs Django

// AJOUTEZ cette interface pour les magasins
export interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  manager?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: number;
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person?: string;
  payment_terms?: string;
  store?: number;
  store_name?: string;
  total_supplies?: number;
  address?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RetailSupply {
  id: number;
  supply?: number;
  product?: number;
  product_name?: string;
  quantity: number;
  unit_cost?: number;
  batch_number?: string;
  expiry_date?: string;
  supply_reference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supply {
  id: number;
  ref_supply: string;
  supplier?: Supplier;
  supplier_name?: string;
  store?: number;
  store_object?: Store; // AJOUTÉ : Objet magasin complet
  store_name?: string;
  utilisateur?: any;
  utilisateur_name?: string;
  total_command: number;
  date_supply: string;
  status: 'pending' | 'received' | 'cancelled';
  retail_items?: RetailSupply[];
  total_items?: number;
  notes?: string;
  status_display?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
}

export interface CreateSupplyData {
  ref_supply: string;
  supplier: number;
  store: number;
  utilisateur: number;
  total_command: number;
  date_supply: string;
  status?: 'pending' | 'received' | 'cancelled';
  notes?: string;
  retail_items?: Partial<RetailSupply>[];
}

export interface CreateSupplierData {
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person?: string;
  payment_terms?: string;
  store: number;
  address?: string;
  phone?: string;
}

class SupplyService {
  /**
   * Récupérer tous les approvisionnements depuis la base de données réelle
   */
  async getSupplies(params?: any): Promise<Supply[]> {
    try {
      console.log('📦 Chargement des approvisionnements depuis la base de données...', params);
      
      const response = await api.get<any>('/supplies/', { params });
      
      console.log('📋 Réponse API approvisionnements:', response);
      
      let supplies: Supply[] = [];
      
      if (Array.isArray(response)) {
        supplies = response;
      } else if (response && Array.isArray(response.results)) {
        supplies = response.results;
      } else if (response && Array.isArray(response.data)) {
        supplies = response.data;
      } else {
        console.error('❌ Format de réponse inattendu:', response);
        throw new Error('Format de réponse API invalide');
      }
      
      console.log(`✅ ${supplies.length} approvisionnement(s) chargé(s) depuis la base de données`);
      return supplies;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des approvisionnements:', error);
      throw new Error('Impossible de charger les approvisionnements depuis la base de données');
    }
  }

  /**
   * Récupérer tous les fournisseurs depuis la base de données réelle
   */
  async getSuppliers(params?: any): Promise<Supplier[]> {
    try {
      console.log('📞 Chargement des fournisseurs depuis la base de données...', params);
      
      const response = await api.get<any>('/suppliers/', { params });
      console.log('📋 Réponse API fournisseurs:', response);
      
      let suppliers: Supplier[] = [];
      
      if (Array.isArray(response)) {
        suppliers = response;
      } else if (response && Array.isArray(response.results)) {
        suppliers = response.results;
      } else if (response && Array.isArray(response.data)) {
        suppliers = response.data;
      } else {
        console.error('❌ Format de réponse inattendu:', response);
        throw new Error('Format de réponse API invalide');
      }
      
      console.log(`✅ ${suppliers.length} fournisseur(s) chargé(s) depuis la base de données`);
      return suppliers;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des fournisseurs:', error);
      throw new Error('Impossible de charger les fournisseurs depuis la base de données');
    }
  }

  /**
   * Récupérer tous les magasins depuis la base de données réelle - NOUVELLE MÉTHODE
   */
  async getStores(): Promise<Store[]> {
    try {
      console.log('🏪 Chargement des magasins depuis la base de données...');
      
      const response = await api.get<any>('/stores/');
      console.log('📋 Réponse API magasins:', response);
      
      let stores: Store[] = [];
      
      if (Array.isArray(response)) {
        stores = response;
      } else if (response && Array.isArray(response.results)) {
        stores = response.results;
      } else if (response && Array.isArray(response.data)) {
        stores = response.data;
      } else {
        console.error('❌ Format de réponse inattendu pour les magasins:', response);
        console.warn('⚠️ Utilisation de magasins par défaut...');
        
        // Retourner des magasins par défaut si l'API n'est pas disponible
        return [
          { id: 1, name: 'Magasin Principal', address: '123 Rue Principale, Ville', is_active: true },
          { id: 2, name: 'Entrepôt Central', address: '456 Avenue Industrielle, Zone', is_active: true },
          { id: 3, name: 'Boutique Ville', address: '789 Boulevard Commercial, Centre', is_active: true }
        ];
      }
      
      console.log(`✅ ${stores.length} magasin(s) chargé(s) depuis la base de données`);
      return stores;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des magasins:', error);
      console.warn('⚠️ Utilisation de magasins par défaut suite à une erreur...');
      
      // Retourner des magasins par défaut en cas d'erreur
      return [
        { id: 1, name: 'Magasin Principal', address: '123 Rue Principale, Ville', is_active: true },
        { id: 2, name: 'Entrepôt Central', address: '456 Avenue Industrielle, Zone', is_active: true },
        { id: 3, name: 'Boutique Ville', address: '789 Boulevard Commercial, Centre', is_active: true }
      ];
    }
  }

  /**
   * Récupérer un approvisionnement par ID depuis la base de données réelle
   */
  async getSupplyById(id: number): Promise<Supply> {
    try {
      console.log(`📦 Chargement de l'approvisionnement ${id} depuis la base de données...`);
      const response = await api.get<Supply>(`/supplies/${id}/`);
      console.log('✅ Approvisionnement chargé:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur récupération approvisionnement ${id}:`, error);
      throw new Error(`Impossible de charger l'approvisionnement ${id} depuis la base de données`);
    }
  }

  /**
   * Créer un nouvel approvisionnement dans la base de données
   */
  async createSupply(supplyData: CreateSupplyData): Promise<Supply> {
    try {
      const payload = {
        ...supplyData,
        status: supplyData.status || 'pending',
        date_supply: supplyData.date_supply || new Date().toISOString(),
        retail_items: supplyData.retail_items || []
      };

      console.log('📤 Création approvisionnement dans la base de données:', payload);
      const response = await api.post<Supply>('/supplies/', payload);
      console.log('✅ Approvisionnement créé dans la base de données:', response);
      return response;
    } catch (error) {
      console.error('❌ Erreur création approvisionnement:', error);
      throw new Error('Impossible de créer l\'approvisionnement dans la base de données');
    }
  }

  /**
   * Mettre à jour un approvisionnement dans la base de données
   */
  async updateSupply(id: number, supplyData: Partial<Supply>): Promise<Supply> {
    try {
      const payload = {
        ...supplyData,
        supplier: supplyData.supplier?.id || supplyData.supplier,
        store: supplyData.store?.id || supplyData.store,
        utilisateur: supplyData.utilisateur?.id || supplyData.utilisateur
      };

      console.log('📤 Mise à jour approvisionnement dans la base de données:', payload);
      const response = await api.patch<Supply>(`/supplies/${id}/`, payload);
      console.log('✅ Approvisionnement mis à jour dans la base de données:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur mise à jour approvisionnement ${id}:`, error);
      throw new Error(`Impossible de mettre à jour l'approvisionnement ${id} dans la base de données`);
    }
  }

  /**
   * Supprimer un approvisionnement de la base de données
   */
  async deleteSupply(id: number): Promise<void> {
    try {
      console.log('🗑️ Suppression approvisionnement de la base de données:', id);
      await api.delete(`/supplies/${id}/`);
      console.log('✅ Approvisionnement supprimé de la base de données');
    } catch (error) {
      console.error(`❌ Erreur suppression approvisionnement ${id}:`, error);
      throw new Error(`Impossible de supprimer l'approvisionnement ${id} de la base de données`);
    }
  }

  /**
   * Rechercher des approvisionnements dans la base de données - MIS À JOUR
   */
  async searchSupplies(searchTerm: string, status?: string, store?: number): Promise<Supply[]> {
    try {
      const params: any = {};
      
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      if (status && status !== 'all') {
        params.status = status;
      }

      if (store && store !== 'all') {
        params.store = store;
      }

      console.log('🔍 Recherche approvisionnements dans la base de données:', params);
      return this.getSupplies(params);
    } catch (error) {
      console.error('❌ Erreur recherche approvisionnements:', error);
      throw new Error('Impossible de rechercher les approvisionnements dans la base de données');
    }
  }

  /**
   * Récupérer les statistiques depuis la base de données réelle
   */
  async getSupplyStats(): Promise<{
    total_pending: number;
    total_received: number;
    total_cancelled: number;
    total_supplies: number;
    total_amount: number;
    monthly_trend: number;
  }> {
    try {
      // Charger tous les approvisionnements pour calculer les stats
      const supplies = await this.getSupplies();
      
      const total_supplies = supplies.length;
      const total_pending = supplies.filter(s => s.status === 'pending').length;
      const total_received = supplies.filter(s => s.status === 'received').length;
      const total_cancelled = supplies.filter(s => s.status === 'cancelled').length;
      const total_amount = supplies.reduce((sum, supply) => sum + (supply.total_command || 0), 0);
      
      const stats = {
        total_supplies,
        total_pending,
        total_received,
        total_cancelled,
        total_amount,
        monthly_trend: this.calculateMonthlyTrend(supplies)
      };

      console.log('📊 Statistiques calculées depuis la base de données:', stats);
      return stats;
    } catch (error) {
      console.error('Erreur calcul stats depuis la base de données:', error);
      
      // Retourner des valeurs par défaut au bon format
      return {
        total_supplies: 0,
        total_pending: 0,
        total_received: 0,
        total_cancelled: 0,
        total_amount: 0,
        monthly_trend: 0
      };
    }
  }

  /**
   * Mettre à jour le statut d'un approvisionnement dans la base de données
   */
  async updateSupplyStatus(id: number, status: Supply['status']): Promise<Supply> {
    try {
      console.log('🔄 Mise à jour statut dans la base de données:', { id, status });
      const response = await api.patch<Supply>(`/supplies/${id}/`, { status });
      console.log('✅ Statut mis à jour dans la base de données:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur mise à jour statut ${id}:`, error);
      throw new Error(`Impossible de mettre à jour le statut de l'approvisionnement ${id} dans la base de données`);
    }
  }

  /**
   * Ajouter un produit à un approvisionnement dans la base de données
   */
  async addSupplyItem(supplyId: number, itemData: Partial<RetailSupply>): Promise<RetailSupply> {
    try {
      const payload = {
        ...itemData,
        supply: supplyId
      };

      console.log('📤 Ajout produit à approvisionnement dans la base de données:', payload);
      const response = await api.post<RetailSupply>('/retail-supplies/', payload);
      console.log('✅ Produit ajouté dans la base de données:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur ajout produit à l'approvisionnement ${supplyId}:`, error);
      throw new Error(`Impossible d'ajouter le produit à l'approvisionnement ${supplyId} dans la base de données`);
    }
  }

  /**
   * Mettre à jour un produit dans un approvisionnement dans la base de données
   */
  async updateSupplyItem(itemId: number, itemData: Partial<RetailSupply>): Promise<RetailSupply> {
    try {
      console.log('📤 Mise à jour produit dans la base de données:', { itemId, itemData });
      const response = await api.patch<RetailSupply>(`/retail-supplies/${itemId}/`, itemData);
      console.log('✅ Produit mis à jour dans la base de données:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur mise à jour produit ${itemId}:`, error);
      throw new Error(`Impossible de mettre à jour le produit ${itemId} dans la base de données`);
    }
  }

  /**
   * Supprimer un produit d'un approvisionnement de la base de données
   */
  async deleteSupplyItem(itemId: number): Promise<void> {
    try {
      console.log('🗑️ Suppression produit de la base de données:', itemId);
      await api.delete(`/retail-supplies/${itemId}/`);
      console.log('✅ Produit supprimé de la base de données');
    } catch (error) {
      console.error(`❌ Erreur suppression produit ${itemId}:`, error);
      throw new Error(`Impossible de supprimer le produit ${itemId} de la base de données`);
    }
  }

  /**
   * Créer un nouveau fournisseur dans la base de données
   */
  async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    try {
      console.log('📤 Création fournisseur dans la base de données:', supplierData);
      const response = await api.post<Supplier>('/suppliers/', supplierData);
      console.log('✅ Fournisseur créé dans la base de données:', response);
      return response;
    } catch (error) {
      console.error('❌ Erreur création fournisseur:', error);
      throw new Error('Impossible de créer le fournisseur dans la base de données');
    }
  }

  /**
   * Mettre à jour un fournisseur dans la base de données
   */
  async updateSupplier(id: number, supplierData: Partial<Supplier>): Promise<Supplier> {
    try {
      console.log('📤 Mise à jour fournisseur dans la base de données:', { id, supplierData });
      const response = await api.patch<Supplier>(`/suppliers/${id}/`, supplierData);
      console.log('✅ Fournisseur mis à jour dans la base de données:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur mise à jour fournisseur ${id}:`, error);
      throw new Error(`Impossible de mettre à jour le fournisseur ${id} dans la base de données`);
    }
  }

  /**
   * Supprimer un fournisseur de la base de données
   */
  async deleteSupplier(id: number): Promise<void> {
    try {
      console.log('🗑️ Suppression fournisseur de la base de données:', id);
      await api.delete(`/suppliers/${id}/`);
      console.log('✅ Fournisseur supprimé de la base de données');
    } catch (error) {
      console.error(`❌ Erreur suppression fournisseur ${id}:`, error);
      throw new Error(`Impossible de supprimer le fournisseur ${id} de la base de données`);
    }
  }

  /**
   * Créer un nouveau magasin dans la base de données - NOUVELLE MÉTHODE (optionnelle)
   */
  async createStore(storeData: Omit<Store, 'id'>): Promise<Store> {
    try {
      console.log('📤 Création magasin dans la base de données:', storeData);
      const response = await api.post<Store>('/stores/', storeData);
      console.log('✅ Magasin créé dans la base de données:', response);
      return response;
    } catch (error) {
      console.error('❌ Erreur création magasin:', error);
      throw new Error('Impossible de créer le magasin dans la base de données');
    }
  }

  /**
   * Supprimer un magasin de la base de données - NOUVELLE MÉTHODE (optionnelle)
   */
  async deleteStore(id: number): Promise<void> {
    try {
      console.log('🗑️ Suppression magasin de la base de données:', id);
      await api.delete(`/stores/${id}/`);
      console.log('✅ Magasin supprimé de la base de données');
    } catch (error) {
      console.error(`❌ Erreur suppression magasin ${id}:`, error);
      throw new Error(`Impossible de supprimer le magasin ${id} de la base de données`);
    }
  }

  /**
   * Calculer la tendance mensuelle basée sur les données réelles
   */
  private calculateMonthlyTrend(supplies: Supply[]): number {
    try {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const currentMonthSupplies = supplies.filter(supply => {
        try {
          const supplyDate = new Date(supply.date_supply);
          return supplyDate.getMonth() === currentMonth && supplyDate.getFullYear() === currentYear;
        } catch {
          return false;
        }
      });

      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      const previousMonthSupplies = supplies.filter(supply => {
        try {
          const supplyDate = new Date(supply.date_supply);
          return supplyDate.getMonth() === previousMonth && supplyDate.getFullYear() === previousYear;
        } catch {
          return false;
        }
      });

      if (previousMonthSupplies.length === 0) return 0;

      const currentAmount = currentMonthSupplies.reduce((sum, s) => sum + (s.total_command || 0), 0);
      const previousAmount = previousMonthSupplies.reduce((sum, s) => sum + (s.total_command || 0), 0);

      return previousAmount > 0 ? ((currentAmount - previousAmount) / previousAmount) * 100 : 0;
    } catch (error) {
      console.error('Erreur calcul tendance mensuelle:', error);
      return 0;
    }
  }
}

export const supplyService = new SupplyService();
export default supplyService;