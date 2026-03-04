// src/services/supplyService.ts - VERSION FINALE CORRIGÉE
import api from './api';

// ============================================================================
// TYPES (basés sur les modèles Django)
// ============================================================================

export interface Store {
  id: number;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  is_active: boolean;
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
  store: number;
  store_name?: string;
  address?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RetailSupply {
  id: number;
  ref: number;
  name_product: string;
  qt_add: number;
  total_pdx: number;
  supply: number;
  supply_reference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supply {
  id: number;
  ref_supply: string;
  supplier?: number | null;
  supplier_name?: string;
  store: number;
  store_object?: Store;
  store_name?: string;
  utilisateur: number;
  utilisateur_object?: any;
  utilisateur_name?: string;
  total_command: number;
  date_supply: string;
  status: 'pending' | 'received' | 'cancelled';
  retail_items?: RetailSupply[];
  total_items?: number;
  status_display?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSupplyData {
  ref_supply: string;
  supplier?: number | null;
  store: number;
  total_command: number;
  utilisateur: number;
  status?: 'pending' | 'received' | 'cancelled';  // ← RENDU OPTIONNEL
}

export interface UpdateSupplyData {
  ref_supply?: string;
  supplier?: number | null;
  store?: number;
  total_command?: number;
  utilisateur?: number;
  status?: 'pending' | 'received' | 'cancelled';
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

export interface CreateRetailSupplyData {
  ref: number;           // ID du produit
  name_product: string;  // Nom du produit
  qt_add: number;        // Quantité ajoutée
  total_pdx: number;     // Total après ajout
  supply: number;        // ID de l'approvisionnement
}

export interface SupplyStats {
  total_pending: number;
  total_received: number;
  total_cancelled: number;
  total_supplies: number;
  total_amount: number;
  monthly_trend: number;
}

export interface ApiPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SupplyFilters {
  search?: string;
  status?: string;
  store?: number | string;
  supplier?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class SupplyService {
  
  private handleApiResponse<T>(response: any, defaultValue: T[] = []): T[] {
    if (!response) return defaultValue;
    
    // Si la réponse est déjà un tableau
    if (Array.isArray(response)) {
      return response;
    }
    
    // Si la réponse a une propriété 'data' qui est un tableau
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Si la réponse est une pagination Django (results)
    if (response.results && Array.isArray(response.results)) {
      return response.results;
    }
    
    // Si la réponse est un objet unique
    if (response && typeof response === 'object' && !Array.isArray(response) && response.id) {
      return [response] as T[];
    }
    
    return defaultValue;
  }

  private handleError(error: any, defaultMessage: string): never {
    console.error('❌ Erreur API:', error);
    
    if (error.response?.data) {
      const data = error.response.data;
      console.error('📋 Réponse erreur:', data);
      
      // Erreur Django standard
      if (typeof data === 'object') {
        const errors: string[] = [];
        
        // Parcourir les champs d'erreur
        Object.entries(data).forEach(([key, value]) => {
          if (key === 'detail') {
            if (typeof value === 'string') errors.push(value);
          } else if (key === 'non_field_errors' && Array.isArray(value)) {
            errors.push(...value);
          } else if (Array.isArray(value)) {
            errors.push(`${key}: ${value.join(', ')}`);
          } else if (typeof value === 'string') {
            errors.push(`${key}: ${value}`);
          } else if (value && typeof value === 'object') {
            errors.push(`${key}: ${JSON.stringify(value)}`);
          }
        });
        
        if (errors.length > 0) {
          throw new Error(errors.join('; '));
        }
      }
      
      // Erreur avec détail
      if (data.detail) {
        throw new Error(data.detail);
      }
      
      // Erreur avec message
      if (data.message) {
        throw new Error(data.message);
      }
      
      // Erreur sous forme de string
      if (typeof data === 'string') {
        throw new Error(data);
      }
    }
    
    // Erreur générique
    throw new Error(defaultMessage);
  }

  // ============================================================================
  // SUPPLIES
  // ============================================================================

  async getSupplies(params?: SupplyFilters): Promise<Supply[]> {
    try {
      console.log('📦 Chargement des approvisionnements...', params);
      
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.keys(params).forEach(key => {
          const value = params[key as keyof SupplyFilters];
          if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            cleanParams[key] = value;
          }
        });
      }
      
      const response = await api.get<any>('/supplies/', { params: cleanParams });
      
      // Gérer la réponse paginée
      if (response && typeof response === 'object' && 'results' in response) {
        return this.handleApiResponse<Supply>(response);
      }
      
      // Gérer la réponse directe
      const supplies = this.handleApiResponse<Supply>(response);
      console.log(`✅ ${supplies.length} approvisionnement(s) chargé(s)`);
      return supplies;
    } catch (error) {
      return this.handleError(error, 'Impossible de charger les approvisionnements');
    }
  }

  async getSupplyById(id: number): Promise<Supply> {
    try {
      console.log(`📦 Chargement approvisionnement ${id}...`);
      const response = await api.get<Supply>(`/supplies/${id}/`);
      return response;
    } catch (error) {
      return this.handleError(error, `Impossible de charger l'approvisionnement ${id}`);
    }
  }

  async createSupply(supplyData: CreateSupplyData): Promise<Supply> {
    try {
      console.log('📤 Création approvisionnement - Données reçues:', supplyData);
      
      // Validations
      if (!supplyData.utilisateur || supplyData.utilisateur === 0) {
        throw new Error("L'utilisateur est requis et doit être un ID valide");
      }
      if (!supplyData.store || supplyData.store === 0) {
        throw new Error('Le magasin est requis et doit être un ID valide');
      }
      if (!supplyData.ref_supply) {
        throw new Error('La référence est requise');
      }
      
      // Construction du payload
      const payload: Record<string, any> = {
        ref_supply: String(supplyData.ref_supply).trim(),
        total_command: Number(supplyData.total_command).toFixed(2),
        status: supplyData.status || 'pending',  // Valeur par défaut
        store: Number(supplyData.store),
        utilisateur: Number(supplyData.utilisateur),
      };
      
      // Ajouter le fournisseur si présent
      if (supplyData.supplier && supplyData.supplier > 0) {
        payload.supplier = Number(supplyData.supplier);
      } else {
        payload.supplier = null;
      }

      console.log('📦 Payload final:', JSON.stringify(payload, null, 2));
      
      const response = await api.post<Supply>('/supplies/', payload);
      console.log('✅ Approvisionnement créé avec succès:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Erreur createSupply:', error);
      if (error.response?.data) {
        console.error('📋 Détails Django:', error.response.data);
      }
      return this.handleError(error, 'Erreur lors de la création');
    }
  }

  async updateSupply(id: number, supplyData: UpdateSupplyData): Promise<Supply> {
    try {
      console.log('🔄 Mise à jour approvisionnement:', { id, supplyData });
      
      const payload: Record<string, any> = {};
      
      // Ajouter uniquement les champs modifiés
      if (supplyData.supplier !== undefined) {
        payload.supplier = supplyData.supplier && supplyData.supplier > 0 
          ? Number(supplyData.supplier) 
          : null;
      }
      
      if (supplyData.store !== undefined) {
        payload.store = Number(supplyData.store);
      }
      
      if (supplyData.total_command !== undefined) {
        payload.total_command = Number(supplyData.total_command).toFixed(2);
      }
      
      if (supplyData.status !== undefined) {
        payload.status = supplyData.status;
      }
      
      if (supplyData.utilisateur !== undefined) {
        payload.utilisateur = Number(supplyData.utilisateur);
      }
      
      if (supplyData.ref_supply !== undefined) {
        payload.ref_supply = String(supplyData.ref_supply).trim();
      }

      const response = await api.patch<Supply>(`/supplies/${id}/`, payload);
      console.log(`✅ Approvisionnement ${id} mis à jour`);
      return response;
    } catch (error: any) {
      return this.handleError(error, `Impossible de mettre à jour l'approvisionnement ${id}`);
    }
  }

  async deleteSupply(id: number): Promise<void> {
    try {
      await api.delete(`/supplies/${id}/`);
      console.log(`✅ Approvisionnement ${id} supprimé`);
    } catch (error) {
      return this.handleError(error, `Impossible de supprimer l'approvisionnement ${id}`);
    }
  }

  async updateSupplyStatus(id: number, status: Supply['status']): Promise<Supply> {
    try {
      const response = await api.patch<Supply>(`/supplies/${id}/`, { status });
      console.log(`✅ Statut approvisionnement ${id} mis à jour: ${status}`);
      return response;
    } catch (error) {
      return this.handleError(error, `Impossible de mettre à jour le statut`);
    }
  }

  async searchSupplies(searchTerm: string, status?: string, store?: number | string): Promise<Supply[]> {
    try {
      const params: SupplyFilters = {};
      
      if (searchTerm && searchTerm.trim() !== '') {
        params.search = searchTerm.trim();
      }
      
      if (status && status !== 'all' && status !== '') {
        params.status = status;
      }
      
      if (store && store !== 'all' && store !== '') {
        params.store = Number(store);
      }

      return await this.getSupplies(params);
    } catch (error) {
      return this.handleError(error, 'Impossible de rechercher les approvisionnements');
    }
  }

  // ============================================================================
  // SUPPLIERS
  // ============================================================================

  async getSuppliers(params?: any): Promise<Supplier[]> {
    try {
      console.log('📞 Chargement des fournisseurs...', params);
      
      const response = await api.get<any>('/suppliers/', { params });
      const suppliers = this.handleApiResponse<Supplier>(response);
      
      console.log(`✅ ${suppliers.length} fournisseur(s) chargé(s)`);
      return suppliers;
    } catch (error) {
      return this.handleError(error, 'Impossible de charger les fournisseurs');
    }
  }

  async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    try {
      // Validations
      if (!supplierData.store || supplierData.store <= 0) {
        throw new Error('Le magasin est obligatoire');
      }
      
      if (!supplierData.name || !supplierData.name.trim()) {
        throw new Error('Le nom du fournisseur est requis');
      }
      
      // Construction du payload
      const payload = {
        name: supplierData.name.trim(),
        num_supplier: supplierData.num_supplier?.trim() || '',
        email: supplierData.email?.trim() || '',
        emplacement: supplierData.emplacement?.trim() || '',
        contact_person: supplierData.contact_person?.trim() || '',
        payment_terms: supplierData.payment_terms?.trim() || '',
        store: Number(supplierData.store),
        address: supplierData.address?.trim() || '',
        phone: supplierData.phone?.trim() || ''
      };

      const response = await api.post<Supplier>('/suppliers/', payload);
      console.log('✅ Fournisseur créé avec succès');
      return response;
    } catch (error: any) {
      return this.handleError(error, 'Erreur lors de la création du fournisseur');
    }
  }

  async deleteSupplier(id: number): Promise<void> {
    try {
      await api.delete(`/suppliers/${id}/`);
      console.log(`✅ Fournisseur ${id} supprimé`);
    } catch (error) {
      return this.handleError(error, `Impossible de supprimer le fournisseur ${id}`);
    }
  }

  // ============================================================================
  // STORES
  // ============================================================================

  async getStores(): Promise<Store[]> {
    try {
      console.log('🏪 Chargement des magasins...');
      
      const response = await api.get<any>('/stores/');
      const stores = this.handleApiResponse<Store>(response);
      
      console.log(`✅ ${stores.length} magasin(s) chargé(s)`);
      return stores;
    } catch (error) {
      return this.handleError(error, 'Impossible de charger les magasins');
    }
  }

  // ============================================================================
  // RETAIL SUPPLIES
  // ============================================================================

  async createRetailSupply(data: CreateRetailSupplyData): Promise<RetailSupply> {
    try {
      console.log('📦 Création RetailSupply:', data);
      
      // Validations
      if (!data.ref || data.ref <= 0) {
        throw new Error('Réf produit invalide');
      }
      if (!data.name_product || !data.name_product.trim()) {
        throw new Error('Nom produit requis');
      }
      if (data.qt_add <= 0) {
        throw new Error('Quantité doit être positive');
      }
      if (!data.supply || data.supply <= 0) {
        throw new Error('ID approvisionnement invalide');
      }
      
      const payload = {
        ref: Number(data.ref),
        name_product: String(data.name_product).trim(),
        qt_add: Number(data.qt_add),
        total_pdx: Number(data.total_pdx),
        supply: Number(data.supply)
      };

      console.log('📤 Payload RetailSupply:', payload);
      
      const response = await api.post<RetailSupply>('/retail-supplies/', payload);
      console.log('✅ RetailSupply créé avec succès');
      return response;
    } catch (error: any) {
      console.error('❌ Erreur createRetailSupply:', error);
      return this.handleError(error, 'Erreur lors de la création du produit lié');
    }
  }

  async createMultipleRetailSupplies(supplyId: number, items: Omit<CreateRetailSupplyData, 'supply'>[]): Promise<RetailSupply[]> {
    try {
      console.log(`📦 Création de ${items.length} RetailSupply pour supply ${supplyId}`);
      
      // Valider qu'il y a des items
      if (!items || items.length === 0) {
        throw new Error('Aucun article à créer');
      }
      
      const results: RetailSupply[] = [];
      const errors: Error[] = [];
      
      // Créer chaque item séquentiellement
      for (let i = 0; i < items.length; i++) {
        try {
          const item = items[i];
          const retailSupply = await this.createRetailSupply({
            ...item,
            supply: supplyId
          });
          results.push(retailSupply);
          console.log(`✅ Item ${i+1}/${items.length} créé`);
        } catch (error) {
          console.error(`❌ Erreur item ${i+1}:`, error);
          errors.push(error as Error);
        }
      }
      
      // Si tous les items ont échoué, lever une erreur
      if (results.length === 0 && errors.length > 0) {
        throw new Error(`Échec de création de tous les items: ${errors[0].message}`);
      }
      
      console.log(`✅ ${results.length}/${items.length} RetailSupply créés avec succès`);
      return results;
    } catch (error) {
      return this.handleError(error, 'Erreur lors de la création des produits liés');
    }
  }

  async getRetailSupplies(supplyId: number): Promise<RetailSupply[]> {
    try {
      console.log(`📋 Chargement des RetailSupply pour supply ${supplyId}...`);
      
      if (!supplyId || supplyId <= 0) {
        throw new Error('ID approvisionnement invalide');
      }
      
      const response = await api.get<any>(`/retail-supplies/?supply=${supplyId}`);
      const items = this.handleApiResponse<RetailSupply>(response);
      
      console.log(`✅ ${items.length} RetailSupply chargés`);
      return items;
    } catch (error) {
      return this.handleError(error, 'Impossible de charger les produits liés');
    }
  }

  // ============================================================================
  // STATISTIQUES
  // ============================================================================

  async getSupplyStats(): Promise<SupplyStats> {
    try {
      const supplies = await this.getSupplies();
      
      const suppliesArray = Array.isArray(supplies) ? supplies : [];
      
      const total_supplies = suppliesArray.length;
      const total_pending = suppliesArray.filter(s => s.status === 'pending').length;
      const total_received = suppliesArray.filter(s => s.status === 'received').length;
      const total_cancelled = suppliesArray.filter(s => s.status === 'cancelled').length;
      const total_amount = suppliesArray.reduce((sum, s) => sum + (Number(s.total_command) || 0), 0);
      
      // Calculer la tendance mensuelle
      const now = new Date();
      const thisMonth = suppliesArray.filter(s => {
        const date = new Date(s.date_supply);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length;
      
      const lastMonth = suppliesArray.filter(s => {
        const date = new Date(s.date_supply);
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
      }).length;
      
      const monthly_trend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
      
      return {
        total_supplies,
        total_pending,
        total_received,
        total_cancelled,
        total_amount,
        monthly_trend: Math.round(monthly_trend * 100) / 100
      };
    } catch (error) {
      console.error('Erreur getSupplyStats:', error);
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

  async getCurrentEmployee(): Promise<{ id: number; user: number; store: number; name?: string }> {
    try {
      console.log('👤 Récupération employé connecté...');
      const response = await api.get('/employees/current/');
      return response;
    } catch (error) {
      return this.handleError(error, 'Impossible de récupérer l\'employé connecté');
    }
  }

  // ============================================================================
  // UTILITAIRES
  // ============================================================================

  generateReference(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${year}${month}${day}-${random}`;
  }

  formatDate(date: string | Date): string {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return String(date);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  validateSupplyData(data: CreateSupplyData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.ref_supply || !data.ref_supply.trim()) {
      errors.push('Référence requise');
    }
    
    if (!data.store || data.store <= 0) {
      errors.push('Magasin invalide');
    }
    
    if (!data.utilisateur || data.utilisateur <= 0) {
      errors.push('Utilisateur invalide');
    }
    
    if (data.total_command === undefined || data.total_command < 0) {
      errors.push('Total commande invalide');
    }
    
    // Validation du statut (optionnel)
    if (data.status && !['pending', 'received', 'cancelled'].includes(data.status)) {
      errors.push('Statut invalide');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

const supplyService = new SupplyService();
export default supplyService;