// src/services/supplyService.ts
import { api } from './api';

// Types basés sur votre modèle Django

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
  store: number; // OBLIGATOIRE - ID du magasin
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
  supply: number; // ID de l'approvisionnement
  supply_reference?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supply {
  id: number;
  ref_supply: string;
  supplier?: Supplier | null;
  supplier_name?: string;
  store: number; // ID du magasin
  store_object?: Store;
  store_name?: string;
  utilisateur: number; // OBLIGATOIRE - ID de l'Employee
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

// CORRECTIF SELON MODÈLE DJANGO : AJOUTER UTILISATEUR OBLIGATOIRE
export interface CreateSupplyData {
  ref_supply: string;
  supplier?: number | null; // Nullable selon le modèle
  store: number; // OBLIGATOIRE - ID du magasin
  total_command: number;
  utilisateur: number; // OBLIGATOIRE - ID de l'Employee
  status: 'pending' | 'received' | 'cancelled';
}

// Ajouter un type pour la mise à jour (partial de CreateSupplyData)
export interface UpdateSupplyData {
  ref_supply?: string;
  supplier?: number | null; // Nullable selon le modèle
  store?: number; // ID du magasin
  total_command?: number;
  utilisateur?: number; // ID de l'Employee
  status?: 'pending' | 'received' | 'cancelled';
}

export interface CreateSupplierData {
  name: string;
  num_supplier?: string;
  email?: string;
  emplacement?: string;
  contact_person?: string;
  payment_terms?: string;
  store: number; // OBLIGATOIRE - ID du magasin
  address?: string;
  phone?: string;
}

class SupplyService {
  /**
   * Récupérer tous les approvisionnements avec filtres optionnels
   */
  async getSupplies(params?: any): Promise<Supply[]> {
    try {
      console.log('📦 Chargement des approvisionnements depuis la base de données...', params);
      
      // Nettoyer les paramètres - supprimer les valeurs vides ou 'all'
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.keys(params).forEach(key => {
          const value = params[key];
          if (value !== undefined && value !== null && value !== '' && value !== 'all') {
            cleanParams[key] = value;
          }
        });
      }
      
      console.log('🔧 Paramètres nettoyés:', cleanParams);
      
      const response = await api.get<any>('/supplies/', { params: cleanParams });
      
      console.log('📋 Réponse API approvisionnements:', response);
      
      let supplies: Supply[] = [];
      
      // Gérer tous les formats de réponse possibles
      if (Array.isArray(response)) {
        supplies = response;
      } else if (response && Array.isArray(response.results)) {
        supplies = response.results;
      } else if (response && Array.isArray(response.data)) {
        supplies = response.data;
      } else if (response && typeof response === 'object' && response.data && Array.isArray(response.data)) {
        supplies = response.data;
      } else if (response && typeof response === 'object') {
        // Si c'est un objet unique, le convertir en tableau
        supplies = [response];
      } else {
        console.warn('❌ Format de réponse inattendu, retour tableau vide:', response);
        supplies = [];
      }
      
      console.log(`✅ ${supplies.length} approvisionnement(s) chargé(s) depuis la base de données`);
      return supplies;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des approvisionnements:', error);
      throw new Error('Impossible de charger les approvisionnements');
    }
  }

  /**
   * Récupérer tous les fournisseurs
   */
  async getSuppliers(params?: any): Promise<Supplier[]> {
    try {
      console.log('📞 Chargement des fournisseurs depuis la base de données...', params);
      
      const response = await api.get<any>('/suppliers/', { params });
      console.log('📋 Réponse API fournisseurs:', response);
      
      let suppliers: Supplier[] = [];
      
      // Gérer tous les formats de réponse possibles
      if (Array.isArray(response)) {
        suppliers = response;
      } else if (response && Array.isArray(response.results)) {
        suppliers = response.results;
      } else if (response && Array.isArray(response.data)) {
        suppliers = response.data;
      } else if (response && typeof response === 'object') {
        // Si c'est un objet unique, le convertir en tableau
        suppliers = [response];
      } else {
        console.warn('❌ Format de réponse inattendu, retour tableau vide:', response);
        suppliers = [];
      }
      
      console.log(`✅ ${suppliers.length} fournisseur(s) chargé(s) depuis la base de données`);
      return suppliers;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des fournisseurs:', error);
      throw new Error('Impossible de charger les fournisseurs');
    }
  }

  /**
   * Récupérer tous les magasins
   */
  async getStores(): Promise<Store[]> {
    try {
      console.log('🏪 Chargement des magasins depuis la base de données...');
      
      const response = await api.get<any>('/stores/');
      console.log('📋 Réponse API magasins:', response);
      
      let stores: Store[] = [];
      
      // Gérer tous les formats de réponse possibles
      if (Array.isArray(response)) {
        stores = response;
      } else if (response && Array.isArray(response.results)) {
        stores = response.results;
      } else if (response && Array.isArray(response.data)) {
        stores = response.data;
      } else if (response && typeof response === 'object') {
        // Si c'est un objet unique, le convertir en tableau
        stores = [response];
      } else {
        console.warn('❌ Format de réponse inattendu, retour tableau vide:', response);
        stores = [];
      }
      
      console.log(`✅ ${stores.length} magasin(s) chargé(s) depuis la base de données`);
      return stores;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des magasins:', error);
      throw new Error('Impossible de charger les magasins');
    }
  }

  /**
   * Récupérer un approvisionnement par ID
   */
  async getSupplyById(id: number): Promise<Supply> {
    try {
      console.log(`📦 Chargement de l'approvisionnement ${id} depuis la base de données...`);
      const response = await api.get<Supply>(`/supplies/${id}/`);
      console.log('✅ Approvisionnement chargé:', response);
      return response;
    } catch (error) {
      console.error(`❌ Erreur récupération approvisionnement ${id}:`, error);
      throw new Error(`Impossible de charger l'approvisionnement ${id}`);
    }
  }

  /**
   * Créer un approvisionnement
   */
  async createSupply(supplyData: CreateSupplyData): Promise<Supply> {
    try {
      // VÉRIFICATION DES DONNÉES OBLIGATOIRES
      if (!supplyData.store || supplyData.store <= 0) {
        throw new Error('Le magasin est obligatoire et doit être valide');
      }
      
      if (!supplyData.utilisateur || supplyData.utilisateur <= 0) {
        throw new Error('L\'utilisateur (employé) est obligatoire');
      }
      
      if (!supplyData.total_command || supplyData.total_command < 0) {
        throw new Error('Le total de la commande doit être un nombre positif');
      }
      
      // FORMATAGE CORRECT POUR DJANGO
      const payload: Record<string, any> = {
        ref_supply: supplyData.ref_supply,
        store: supplyData.store,
        utilisateur: supplyData.utilisateur,
        total_command: Number(supplyData.total_command),
        status: supplyData.status || 'pending',
      };

      // Gérer correctement supplier (peut être null ou undefined)
      if (supplyData.supplier !== undefined && supplyData.supplier !== null) {
        const supplierId = Number(supplyData.supplier);
        if (!isNaN(supplierId) && supplierId > 0) {
          payload.supplier = supplierId;
        } else {
          console.warn('⚠️ ID fournisseur non valide, ignoré:', supplyData.supplier);
        }
      }

      console.log('📤 Création approvisionnement - Payload final:');
      console.log('Données envoyées:', JSON.stringify(payload, null, 2));
      
      const response = await api.post<Supply>('/supplies/', payload);
      console.log('✅ Approvisionnement créé avec succès');
      return response;
    } catch (error: any) {
      console.error('❌ Erreur création approvisionnement:', error);
      
      // Afficher les détails de l'erreur Django
      if (error.response?.data) {
        console.error('📋 ERREURS DE VALIDATION DJANGO:');
        console.error(JSON.stringify(error.response.data, null, 2));
        
        // Formater les erreurs pour l'affichage
        if (typeof error.response.data === 'object') {
          const errors: string[] = [];
          Object.keys(error.response.data).forEach(key => {
            const value = error.response.data[key];
            if (Array.isArray(value)) {
              errors.push(`${key}: ${value.join(', ')}`);
            } else if (typeof value === 'string') {
              errors.push(value);
            }
          });
          
          if (errors.length > 0) {
            throw new Error(`Erreurs de validation: ${errors.join('; ')}`);
          }
        }
      }
      
      throw new Error(`Impossible de créer l'approvisionnement: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Mettre à jour un approvisionnement - CORRIGÉ
   */
  async updateSupply(id: number, supplyData: Partial<CreateSupplyData>): Promise<Supply> {
    try {
      console.log('🔄 Mise à jour de l\'approvisionnement:', { id, supplyData });
      
      const payload: Record<string, any> = {};
      
      // Ajouter seulement les champs fournis avec formatage approprié
      if (supplyData.supplier !== undefined) {
        if (supplyData.supplier === null || supplyData.supplier === '') {
          payload.supplier = null;
        } else {
          const supplierId = Number(supplyData.supplier);
          if (!isNaN(supplierId) && supplierId > 0) {
            payload.supplier = supplierId;
          }
        }
      }
      
      if (supplyData.store !== undefined) {
        const storeId = Number(supplyData.store);
        if (!isNaN(storeId) && storeId > 0) {
          payload.store = storeId;
        }
      }
      
      if (supplyData.total_command !== undefined) {
        payload.total_command = Number(supplyData.total_command);
      }
      
      if (supplyData.status !== undefined) {
        payload.status = supplyData.status;
      }
      
      if (supplyData.utilisateur !== undefined) {
        const utilisateurId = Number(supplyData.utilisateur);
        if (!isNaN(utilisateurId) && utilisateurId > 0) {
          payload.utilisateur = utilisateurId;
        }
      }
      
      if (supplyData.ref_supply !== undefined) {
        payload.ref_supply = supplyData.ref_supply;
      }

      console.log('📤 Payload envoyé pour mise à jour:', JSON.stringify(payload, null, 2));
      
      const response = await api.patch<Supply>(`/supplies/${id}/`, payload);
      console.log('✅ Approvisionnement mis à jour avec succès');
      return response;
    } catch (error: any) {
      console.error(`❌ Erreur mise à jour approvisionnement ${id}:`, error);
      
      // Afficher les détails de l'erreur
      if (error.response) {
        console.error('📋 Détails de l\'erreur:', {
          status: error.response.status,
          data: error.response.data
        });
        
        // Formater un message d'erreur plus utile
        let errorMessage = `Impossible de mettre à jour l'approvisionnement ${id}`;
        
        if (error.response.status === 400) {
          if (error.response.data) {
            const errors = [];
            for (const [key, value] of Object.entries(error.response.data)) {
              if (Array.isArray(value)) {
                errors.push(`${key}: ${value.join(', ')}`);
              } else if (typeof value === 'string') {
                errors.push(value);
              }
            }
            if (errors.length > 0) {
              errorMessage = `Erreurs de validation: ${errors.join('; ')}`;
            }
          }
        } else if (error.response.status === 404) {
          errorMessage = `L'approvisionnement ${id} n'existe pas`;
        } else if (error.response.status === 403) {
          errorMessage = 'Vous n\'avez pas la permission de modifier cet approvisionnement';
        } else if (error.response.status === 401) {
          errorMessage = 'Veuillez vous reconnecter';
        }
        
        throw new Error(errorMessage);
      }
      
      throw new Error(`Impossible de mettre à jour l'approvisionnement ${id}`);
    }
  }

  /**
   * Supprimer un approvisionnement
   */
  async deleteSupply(id: number): Promise<void> {
    try {
      console.log('🗑️ Suppression approvisionnement:', id);
      await api.delete(`/supplies/${id}/`);
      console.log('✅ Approvisionnement supprimé');
    } catch (error) {
      console.error(`❌ Erreur suppression approvisionnement ${id}:`, error);
      throw new Error(`Impossible de supprimer l'approvisionnement ${id}`);
    }
  }

  /**
   * Rechercher des approvisionnements - CORRIGÉ
   */
  async searchSupplies(searchTerm: string, status?: string, store?: number | string): Promise<Supply[]> {
    try {
      const params: Record<string, any> = {};
      
      // Recherche textuelle
      if (searchTerm && searchTerm.trim() !== '') {
        params.search = searchTerm.trim();
      }
      
      // Filtre par statut
      if (status && status !== 'all' && status !== '' && status !== undefined) {
        params.status = status;
      }
      
      // Filtre par magasin
      if (store && store !== 'all' && store !== '' && store !== undefined) {
        const storeId = typeof store === 'string' ? parseInt(store, 10) : store;
        if (!isNaN(storeId) && storeId > 0) {
          params.store = storeId;
        }
      }

      console.log('🔍 Recherche approvisionnements avec params:', params);
      
      // Utiliser getSupplies qui gère déjà les paramètres
      const results = await this.getSupplies(params);
      console.log(`🔍 ${results.length} résultat(s) trouvé(s)`);
      
      return results;
    } catch (error) {
      console.error('❌ Erreur recherche approvisionnements:', error);
      throw new Error('Impossible de rechercher les approvisionnements');
    }
  }

  /**
   * Récupérer les statistiques
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
      const supplies = await this.getSupplies();
      
      // S'assurer que supplies est un tableau
      const suppliesArray = Array.isArray(supplies) ? supplies : [];
      
      const total_supplies = suppliesArray.length;
      const total_pending = suppliesArray.filter(s => s.status === 'pending').length;
      const total_received = suppliesArray.filter(s => s.status === 'received').length;
      const total_cancelled = suppliesArray.filter(s => s.status === 'cancelled').length;
      const total_amount = suppliesArray.reduce((sum, supply) => sum + (supply.total_command || 0), 0);
      
      const stats = {
        total_supplies,
        total_pending,
        total_received,
        total_cancelled,
        total_amount,
        monthly_trend: this.calculateMonthlyTrend(suppliesArray)
      };

      console.log('📊 Statistiques calculées:', stats);
      return stats;
    } catch (error) {
      console.error('Erreur calcul stats:', error);
      
      // Retourner des valeurs par défaut en cas d'erreur
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
   * Mettre à jour le statut d'un approvisionnement
   */
  async updateSupplyStatus(id: number, status: Supply['status']): Promise<Supply> {
    try {
      console.log('🔄 Mise à jour statut:', { id, status });
      const response = await api.patch<Supply>(`/supplies/${id}/`, { status });
      console.log('✅ Statut mis à jour');
      return response;
    } catch (error) {
      console.error(`❌ Erreur mise à jour statut ${id}:`, error);
      throw new Error(`Impossible de mettre à jour le statut de l'approvisionnement ${id}`);
    }
  }

  /**
   * Créer un nouveau fournisseur
   */
  async createSupplier(supplierData: CreateSupplierData): Promise<Supplier> {
    try {
      // VÉRIFICATION : store est obligatoire
      if (!supplierData.store || supplierData.store <= 0) {
        throw new Error('Le magasin est obligatoire et doit être valide');
      }
      
      if (!supplierData.name || !supplierData.name.trim()) {
        throw new Error('Le nom du fournisseur est requis');
      }
      
      console.log('📤 Création fournisseur:', supplierData);
      const response = await api.post<Supplier>('/suppliers/', supplierData);
      console.log('✅ Fournisseur créé');
      return response;
    } catch (error) {
      console.error('❌ Erreur création fournisseur:', error);
      throw new Error('Impossible de créer le fournisseur');
    }
  }

  /**
   * Supprimer un fournisseur
   */
  async deleteSupplier(id: number): Promise<void> {
    try {
      console.log('🗑️ Suppression fournisseur:', id);
      await api.delete(`/suppliers/${id}/`);
      console.log('✅ Fournisseur supprimé');
    } catch (error) {
      console.error(`❌ Erreur suppression fournisseur ${id}:`, error);
      throw new Error(`Impossible de supprimer le fournisseur ${id}`);
    }
  }

  /**
   * Calculer la tendance mensuelle
   */
  private calculateMonthlyTrend(supplies: Supply[]): number {
    try {
      if (!supplies || supplies.length === 0) {
        return 0;
      }
      
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

  /**
   * Récupérer l'employé connecté
   */
  async getCurrentEmployee(): Promise<{ id: number; user: number; store: number; }> {
    try {
      console.log('👤 Récupération de l\'employé connecté...');
      const response = await api.get('/employees/current/');
      console.log('✅ Employé récupéré');
      return response;
    } catch (error) {
      console.error('❌ Erreur récupération employé:', error);
      throw new Error('Impossible de récupérer l\'employé connecté');
    }
  }

  /**
   * Récupérer les employés d'un magasin
   */
  async getEmployeesByStore(storeId: number): Promise<Array<{ id: number; name: string; user: number }>> {
    try {
      console.log(`👥 Récupération des employés du magasin ${storeId}...`);
      const response = await api.get(`/employees/?store=${storeId}`);
      console.log(`✅ ${response?.length || 0} employé(s) récupéré(s)`);
      return response || [];
    } catch (error) {
      console.error('❌ Erreur récupération employés:', error);
      throw new Error('Impossible de récupérer les employés');
    }
  }
}

export const supplyService = new SupplyService();
export default supplyService;