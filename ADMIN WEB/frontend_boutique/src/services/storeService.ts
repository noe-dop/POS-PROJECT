// src/services/storeService.ts

import { api } from './api';

// Types basés sur votre modèle Django
export interface AddressDetails {
  id: number;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  full_address: string;
}

export interface Store {
  id: number;
  name: string;
  slug: string;
  store_type: number | null;
  store_type_name: string | null;
  network: number | null;
  network_name: string | null;
  address: number | null;
  address_details: AddressDetails | null;
  phone: string | null;
  email: string | null;
  opening_hours: Record<string, any>;
  is_active: boolean;
  logo: string | null;
  banner: string | null;
  slogan: string;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
  total_employees: number;
  total_products: number;
}

export interface StoreFormData {
  name: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  store_type?: number;
  network?: number;
  slogan?: string;
  configuration?: Record<string, any>;
  opening_hours?: Record<string, any>;
  is_active?: boolean;
  latitude?: string;
  longitude?: string;
}

export interface StoreType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface StoreNetwork {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface StoreStats {
  total: number;
  active: number;
  inactive: number;
  totalEmployees: number;
  totalProducts: number;
  averageEmployees: number;
  monthlyGrowth: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Service principal pour les stores
export const storeService = {
  // Récupérer tous les stores avec pagination
  async getStores(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    store_type?: number;
    network?: number;
  }): Promise<PaginatedResponse<Store>> {
    try {
      console.log('📡 Récupération des stores...');
      const response = await api.getFullResponse<PaginatedResponse<Store>>('/stores/', params);
      console.log(`✅ ${response.data.results?.length || 0} stores récupérés`);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stores:', error);
      throw this.handleError(error);
    }
  },

  // Récupérer tous les stores sans pagination
  async getAllStores(): Promise<Store[]> {
    try {
      const response = await this.getStores({ page_size: 1000 });
      return response.results;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de tous les stores:', error);
      throw this.handleError(error);
    }
  },

  // Récupérer un store par ID
  async getStoreById(id: number): Promise<Store> {
    try {
      console.log(`📡 Récupération du store ${id}`);
      return await api.get<Store>(`/stores/${id}/`);
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du store ${id}:`, error);
      throw this.handleError(error);
    }
  },

  // ✅ CRÉATION DE STORE CORRIGÉE - Validation assouplie
  async createStore(storeData: any): Promise<Store> {
    try {
      console.log('📡 Création d\'un nouveau store:', storeData);
      
      // 1. Validation minimale - seul le nom est vraiment requis
      if (!storeData.name?.trim()) {
        throw new Error('Le nom du store est requis');
      }
      
      // 2. Construction du payload avec gestion des champs optionnels
      const payload: any = {
        name: storeData.name.trim(),
        phone: storeData.phone?.trim() || '',
        email: storeData.email?.trim() || '',
        slogan: storeData.slogan?.trim() || '',
        store_type: storeData.store_type || null,
        network: storeData.network || null,
        is_active: storeData.is_active !== undefined ? storeData.is_active : true,
        configuration: storeData.configuration || {},
        opening_hours: storeData.opening_hours || {},
      };

      // 3. Ajouter address_details seulement si des champs d'adresse sont fournis
      // Soit via address_details directement, soit via les champs individuels
      const hasAddressData = 
        storeData.address_details ||
        storeData.address_line1 ||
        storeData.city ||
        storeData.postal_code ||
        storeData.latitude ||
        storeData.longitude;

      if (hasAddressData) {
        payload.address_details = {
          address_line1: storeData.address_details?.address_line1 || storeData.address_line1?.trim() || '',
          address_line2: storeData.address_details?.address_line2 || storeData.address_line2?.trim() || '',
          city: storeData.address_details?.city || storeData.city?.trim() || '',
          state: storeData.address_details?.state || storeData.state?.trim() || '',
          postal_code: storeData.address_details?.postal_code || storeData.postal_code?.trim() || '',
          country: storeData.address_details?.country || storeData.country?.trim() || 'France',
          latitude: storeData.address_details?.latitude || storeData.latitude || null,
          longitude: storeData.address_details?.longitude || storeData.longitude || null,
        };
      }

      console.log('📦 Données envoyées au serveur:', JSON.stringify(payload, null, 2));
      
      const response = await api.post<Store>('/stores/', payload);
      
      console.log('✅ Store créé avec succès:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du store:', error);
      throw this.handleError(error);
    }
  },

  // Mettre à jour un store (PUT)
  async updateStore(id: number, storeData: any): Promise<Store> {
    try {
      console.log(`📡 Mise à jour du store ${id}:`, storeData);
      
      // Vérifier si l'utilisateur est authentifié
      if (!api.isAuthenticated?.()) {
        throw new Error('Vous devez être connecté pour modifier un store');
      }

      // Validation minimale
      if (!storeData.name?.trim()) {
        throw new Error('Le nom du store est requis');
      }

      // Construction du payload
      const payload: any = {
        name: storeData.name.trim(),
        phone: storeData.phone?.trim() || '',
        email: storeData.email?.trim() || '',
        slogan: storeData.slogan?.trim() || '',
        store_type: storeData.store_type || null,
        network: storeData.network || null,
        is_active: storeData.is_active !== undefined ? storeData.is_active : true,
        configuration: storeData.configuration || {},
        opening_hours: storeData.opening_hours || {}
      };

      // Ajouter les détails d'adresse si fournis
      const hasAddressData = 
        storeData.address_details ||
        storeData.address_line1 ||
        storeData.city ||
        storeData.postal_code;

      if (hasAddressData) {
        payload.address_details = {
          address_line1: storeData.address_details?.address_line1 || storeData.address_line1?.trim() || '',
          address_line2: storeData.address_details?.address_line2 || storeData.address_line2?.trim() || '',
          city: storeData.address_details?.city || storeData.city?.trim() || '',
          state: storeData.address_details?.state || storeData.state?.trim() || '',
          postal_code: storeData.address_details?.postal_code || storeData.postal_code?.trim() || '',
          country: storeData.address_details?.country || storeData.country?.trim() || 'France',
          latitude: storeData.address_details?.latitude || storeData.latitude || null,
          longitude: storeData.address_details?.longitude || storeData.longitude || null,
        };
      }

      console.log('📤 Données envoyées au serveur:', JSON.stringify(payload, null, 2));
      
      const result = await api.put<Store>(`/stores/${id}/`, payload);
      
      console.log('✅ Store mis à jour avec succès:', result);
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du store ${id}:`, error);
      
      // Gestion spécifique des erreurs d'authentification
      if (error.response?.status === 403) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      throw this.handleError(error);
    }
  },

  // Mettre à jour partiellement un store (PATCH)
  async patchStore(id: number, updates: Partial<StoreFormData>): Promise<Store> {
    try {
      console.log(`📡 Mise à jour partielle du store ${id}:`, updates);
      
      const payload: any = { ...updates };

      // Gérer address_details si des champs d'adresse sont présents
      const addressFields = ['address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'latitude', 'longitude'];
      const hasAddressFields = addressFields.some(field => updates[field as keyof StoreFormData] !== undefined);
      
      if (hasAddressFields) {
        // Récupérer l'adresse actuelle
        const currentStore = await this.getStoreById(id);
        const currentAddress = currentStore.address_details;
        
        payload.address_details = {
          address_line1: updates.address_line1?.trim() || currentAddress?.address_line1 || '',
          address_line2: updates.address_line2?.trim() || currentAddress?.address_line2 || '',
          city: updates.city?.trim() || currentAddress?.city || '',
          state: updates.state?.trim() || currentAddress?.state || '',
          postal_code: updates.postal_code?.trim() || currentAddress?.postal_code || '',
          country: updates.country?.trim() || currentAddress?.country || 'France',
          latitude: updates.latitude || currentAddress?.latitude || null,
          longitude: updates.longitude || currentAddress?.longitude || null,
        };

        // Supprimer les champs individuels d'adresse du payload principal
        addressFields.forEach(field => delete payload[field]);
      }

      console.log('📤 Données PATCH:', JSON.stringify(payload, null, 2));
      
      return await api.patch<Store>(`/stores/${id}/`, payload);
      
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour partielle du store ${id}:`, error);
      throw this.handleError(error);
    }
  },

  // Supprimer un store
  async deleteStore(id: number): Promise<void> {
    try {
      console.log(`📡 Suppression du store ${id}`);
      await api.delete(`/stores/${id}/`);
      console.log('✅ Store supprimé');
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression du store ${id}:`, error);
      throw this.handleError(error);
    }
  },

  // Changer le statut actif/inactif d'un store
  async toggleStoreStatus(id: number, isActive: boolean): Promise<Store> {
    try {
      console.log(`📡 Changement de statut du store ${id} à:`, isActive);
      return await this.patchStore(id, { is_active: isActive });
    } catch (error) {
      console.error(`❌ Erreur lors du changement de statut du store ${id}:`, error);
      throw this.handleError(error);
    }
  },

  // Récupérer les types de store
  async getStoreTypes(): Promise<StoreType[]> {
    try {
      console.log('📡 Récupération des types de store...');
      const response = await api.getFullResponse('/store-types/');
      return response.data.results || [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des types de store:', error);
      return []; // Retourner un tableau vide au lieu de throw pour éviter de bloquer l'UI
    }
  },

  // Récupérer les réseaux de store
  async getStoreNetworks(): Promise<StoreNetwork[]> {
    try {
      console.log('📡 Récupération des réseaux de store...');
      const response = await api.getFullResponse('/store-networks/');
      return response.data.results || [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des réseaux de store:', error);
      return []; // Retourner un tableau vide au lieu de throw
    }
  },

  // Rechercher des stores
  async searchStores(query: string, filters?: {
    is_active?: boolean;
    store_type?: number;
    network?: number;
  }): Promise<Store[]> {
    try {
      console.log(`🔍 Recherche de stores: "${query}"`);
      const params = {
        search: query,
        ...filters
      };
      
      const response = await this.getStores(params);
      return response.results;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche des stores:', error);
      throw this.handleError(error);
    }
  },

  // Récupérer les statistiques des stores
  async getStoreStats(): Promise<StoreStats> {
    try {
      console.log('📡 Récupération des statistiques...');
      
      // Essayer l'endpoint stats s'il existe
      try {
        return await api.get<StoreStats>('/stores/stats/');
      } catch (error) {
        // Sinon calculer localement
        console.log('📊 Calcul local des statistiques...');
        const stores = await this.getAllStores();
        return await this.calculateStoreStats(stores);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      // Retourner des stats par défaut
      return {
        total: 0,
        active: 0,
        inactive: 0,
        totalEmployees: 0,
        totalProducts: 0,
        averageEmployees: 0,
        monthlyGrowth: 0
      };
    }
  },

  // Calculer les statistiques côté client
  async calculateStoreStats(stores: Store[]): Promise<StoreStats> {
    try {
      const activeStores = stores.filter(store => store.is_active);
      const totalEmployees = stores.reduce((sum, store) => sum + (store.total_employees || 0), 0);
      const totalProducts = stores.reduce((sum, store) => sum + (store.total_products || 0), 0);
      
      return {
        total: stores.length,
        active: activeStores.length,
        inactive: stores.length - activeStores.length,
        totalEmployees,
        totalProducts,
        averageEmployees: stores.length > 0 ? Math.round(totalEmployees / stores.length) : 0,
        monthlyGrowth: 0 // À calculer si nécessaire
      };
    } catch (error) {
      console.error('❌ Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  },

  // Upload d'image pour le logo
  async uploadLogo(storeId: number, file: File): Promise<{ logo: string }> {
    try {
      console.log(`📡 Upload du logo pour le store ${storeId}`);
      
      const formData = new FormData();
      formData.append('logo', file);

      return await api.patch<{ logo: string }>(`/stores/${storeId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      console.error(`❌ Erreur lors de l'upload du logo pour le store ${storeId}:`, error);
      throw this.handleError(error);
    }
  },

  // Obtenir l'adresse complète formatée
  getFullAddress(store: Store): string {
    if (!store.address_details) return 'Adresse non définie';
    
    const addr = store.address_details;
    const parts = [
      addr.address_line1,
      addr.address_line2,
      addr.postal_code ? `${addr.postal_code} ${addr.city || ''}` : addr.city,
      addr.state,
      addr.country
    ].filter(Boolean);
    
    return parts.join(', ');
  },

  // ✅ VALIDATION ASSOUPLIE - Seul le nom est requis
  validateStoreForm(formData: StoreFormData): string[] {
    const errors: string[] = [];

    // Seul le nom est vraiment requis
    if (!formData.name?.trim()) {
      errors.push('Le nom du store est requis');
    } else if (formData.name.trim().length < 2) {
      errors.push('Le nom doit contenir au moins 2 caractères');
    }

    // Les champs d'adresse sont optionnels - on les valide seulement s'ils sont fournis
    if (formData.address_line1?.trim() && formData.address_line1.trim().length < 3) {
      errors.push("L'adresse doit contenir au moins 3 caractères");
    }

    if (formData.city?.trim() && formData.city.trim().length < 2) {
      errors.push('La ville doit contenir au moins 2 caractères');
    }

    if (formData.postal_code?.trim()) {
      // Validation simple du code postal si fourni
      const postalCodeClean = formData.postal_code.replace(/\s/g, '');
      if (!/^[0-9A-Za-z]{3,10}$/.test(postalCodeClean)) {
        errors.push('Le code postal n\'est pas valide');
      }
    }

    if (formData.country?.trim() && formData.country.trim().length < 2) {
      errors.push('Le pays doit contenir au moins 2 caractères');
    }

    // Validation téléphone si fourni
    if (formData.phone?.trim()) {
      const phoneClean = formData.phone.replace(/\s/g, '');
      if (!/^[0-9+\-\s]{8,}$/.test(phoneClean)) {
        errors.push('Le numéro de téléphone n\'est pas valide');
      }
    }

    // Validation email si fourni
    if (formData.email?.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('L\'email n\'est pas valide');
    }

    return errors;
  },

  // ✅ PRÉPARATION DES DONNÉES - Avec valeurs par défaut
  prepareStoreFormData(store: Store | null): StoreFormData {
    if (!store) {
      return {
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'France',
        phone: '',
        email: '',
        store_type: undefined,
        network: undefined,
        slogan: '',
        configuration: {
          currency: 'EUR',
          timezone: 'Europe/Paris',
          receipt_header: '',
          receipt_footer: '',
          tax_rate: 20.0
        },
        opening_hours: {},
        is_active: true
      };
    }

    const address = store.address_details;
    return {
      name: store.name || '',
      address_line1: address?.address_line1 || '',
      address_line2: address?.address_line2 || '',
      city: address?.city || '',
      state: address?.state || '',
      postal_code: address?.postal_code || '',
      country: address?.country || 'France',
      phone: store.phone || '',
      email: store.email || '',
      store_type: store.store_type || undefined,
      network: store.network || undefined,
      slogan: store.slogan || '',
      configuration: store.configuration || {
        currency: 'EUR',
        timezone: 'Europe/Paris',
        receipt_header: '',
        receipt_footer: '',
        tax_rate: 20.0
      },
      opening_hours: store.opening_hours || {},
      is_active: store.is_active !== undefined ? store.is_active : true
    };
  },

  // Gestionnaire d'erreurs unifié
  handleError(error: any): Error {
    if (error.response) {
      console.error('📝 Détails de l\'erreur:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method
      });
      
      const { status, data } = error.response;
      
      // Formater les erreurs de validation Django
      if (status === 400) {
        let errorMessage = "Erreur de validation: ";
        
        if (typeof data === 'object') {
          const fieldErrors = [];
          
          for (const [field, messages] of Object.entries(data)) {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages.join(', ')}`);
            } else if (typeof messages === 'object' && messages !== null) {
              for (const [subField, subMessages] of Object.entries(messages)) {
                if (Array.isArray(subMessages)) {
                  fieldErrors.push(`${field}.${subField}: ${subMessages.join(', ')}`);
                } else {
                  fieldErrors.push(`${field}.${subField}: ${subMessages}`);
                }
              }
            } else {
              fieldErrors.push(`${field}: ${messages}`);
            }
          }
          
          errorMessage += fieldErrors.join('; ');
        } else {
          errorMessage += data;
        }
        
        return new Error(errorMessage);
      }
      
      switch (status) {
        case 401:
          return new Error('Non authentifié - Veuillez vous reconnecter');
        case 403:
          return new Error('Permission refusée');
        case 404:
          return new Error('Store non trouvé');
        case 409:
          return new Error('Conflit - Un store avec ce nom existe peut-être déjà');
        case 500:
          return new Error('Erreur serveur - Veuillez réessayer plus tard');
        default:
          return new Error(`Erreur ${status}: ${data?.detail || data?.message || 'Erreur inconnue'}`);
      }
    } else if (error.request) {
      return new Error('Pas de réponse du serveur - Vérifiez votre connexion');
    } else {
      return new Error(error.message || 'Erreur de configuration');
    }
  }
};

export default storeService;