// src/services/storeService.ts

import { api } from './api';

// =============================================================================
// TYPES CORRIGÉS POUR CORRESPONDRE À VOTRE API
// =============================================================================

export interface Store {
  // Champs du JSON (tous requis)
  name: string;
  phone: string;
  email: string;
  slogan: string;
  store_type: number;
  network: number;
  is_active: boolean;
  configuration: Record<string, any>;
  opening_hours: Record<string, any>;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
  
  // Champs supplémentaires de l'API
  id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoreFormData {
  name: string;
  phone: string;
  email: string;
  slogan: string;
  store_type: number;
  network: number;
  is_active: boolean;
  configuration?: Record<string, any>;
  opening_hours?: Record<string, any>;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: string;
  longitude: string;
}

export interface StoreFilters {
  search?: string;
  is_active?: boolean;
  store_type?: number;
  network?: number;
  city?: string;
  country?: string;
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

export interface ApiError {
  message: string;
  details?: { [key: string]: string[] };
  status?: number;
}

// =============================================================================
// SERVICE PRINCIPAL CORRIGÉ
// =============================================================================

export const storeService = {
  // Récupérer tous les stores avec pagination
  async getStores(params?: StoreFilters): Promise<PaginatedResponse<Store>> {
    try {
      const response = await api.getFullResponse<PaginatedResponse<Store>>('/stores/', params);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des stores:', error);
      throw error;
    }
  },

  // Récupérer tous les stores sans pagination
  async getAllStores(): Promise<Store[]> {
    try {
      const response = await this.getStores({ page_size: 1000 });
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la récupération de tous les stores:', error);
      throw error;
    }
  },

  // Récupérer un store par ID
  async getStoreById(id: number): Promise<Store> {
    try {
      return await api.get<Store>(`/stores/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la récupération du store ${id}:`, error);
      throw error;
    }
  },

  // Créer un nouveau store
  async createStore(storeData: StoreFormData): Promise<Store> {
    try {
      // Les données sont déjà au bon format pour l'API
      const payload = {
        name: storeData.name,
        phone: storeData.phone,
        email: storeData.email,
        slogan: storeData.slogan,
        store_type: storeData.store_type,
        network: storeData.network,
        is_active: storeData.is_active,
        configuration: storeData.configuration || {},
        opening_hours: storeData.opening_hours || {},
        address_line1: storeData.address_line1,
        address_line2: storeData.address_line2,
        city: storeData.city,
        state: storeData.state,
        postal_code: storeData.postal_code,
        country: storeData.country,
        latitude: storeData.latitude,
        longitude: storeData.longitude
      };

      return await api.post<Store>('/stores/', payload);
    } catch (error) {
      console.error('Erreur lors de la création du store:', error);
      throw error;
    }
  },

  // Mettre à jour un store (PUT)
  async updateStore(id: number, storeData: StoreFormData): Promise<Store> {
    try {
      const payload = {
        name: storeData.name,
        phone: storeData.phone,
        email: storeData.email,
        slogan: storeData.slogan,
        store_type: storeData.store_type,
        network: storeData.network,
        is_active: storeData.is_active,
        configuration: storeData.configuration || {},
        opening_hours: storeData.opening_hours || {},
        address_line1: storeData.address_line1,
        address_line2: storeData.address_line2,
        city: storeData.city,
        state: storeData.state,
        postal_code: storeData.postal_code,
        country: storeData.country,
        latitude: storeData.latitude,
        longitude: storeData.longitude
      };

      return await api.put<Store>(`/stores/${id}/`, payload);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du store ${id}:`, error);
      throw error;
    }
  },

  // Mettre à jour partiellement un store (PATCH)
  async patchStore(id: number, updates: Partial<StoreFormData>): Promise<Store> {
    try {
      return await api.patch<Store>(`/stores/${id}/`, updates);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour partielle du store ${id}:`, error);
      throw error;
    }
  },

  // Supprimer un store
  async deleteStore(id: number): Promise<void> {
    try {
      await api.delete(`/stores/${id}/`);
    } catch (error) {
      console.error(`Erreur lors de la suppression du store ${id}:`, error);
      throw error;
    }
  },

  // Changer le statut actif/inactif
  async toggleStoreStatus(id: number, isActive: boolean): Promise<Store> {
    try {
      return await this.patchStore(id, { is_active: isActive });
    } catch (error) {
      console.error(`Erreur lors du changement de statut du store ${id}:`, error);
      throw error;
    }
  },

  // Rechercher des stores
  async searchStores(query: string, filters?: {
    is_active?: boolean;
    store_type?: number;
    network?: number;
  }): Promise<Store[]> {
    try {
      const params = {
        search: query,
        ...filters
      };
      
      const response = await this.getStores(params);
      return response.results;
    } catch (error) {
      console.error('Erreur lors de la recherche des stores:', error);
      throw error;
    }
  },

  // Fonctions utilitaires
  getFullAddress(store: Store): string {
    const parts = [
      store.address_line1,
      store.address_line2,
      `${store.postal_code} ${store.city}`,
      store.state,
      store.country
    ].filter(Boolean);
    
    return parts.join(', ');
  },

  validateStoreForm(formData: StoreFormData): string[] {
    const errors: string[] = [];

    if (!formData.name?.trim()) {
      errors.push('Le nom du store est requis');
    }

    if (!formData.address_line1?.trim()) {
      errors.push('L\'adresse est requise');
    }

    if (!formData.city?.trim()) {
      errors.push('La ville est requise');
    }

    if (!formData.state?.trim()) {
      errors.push('La région est requise');
    }

    if (!formData.postal_code?.trim()) {
      errors.push('Le code postal est requis');
    }

    if (!formData.country?.trim()) {
      errors.push('Le pays est requis');
    }

    if (!formData.phone?.trim()) {
      errors.push('Le téléphone est requis');
    }

    if (!formData.email?.trim()) {
      errors.push('L\'email est requis');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('L\'email n\'est pas valide');
    }

    if (!formData.slogan?.trim()) {
      errors.push('Le slogan est requis');
    }

    return errors;
  },

  prepareStoreFormData(store: Store | null): StoreFormData {
    if (!store) {
      return {
        name: '',
        phone: '',
        email: '',
        slogan: '',
        store_type: 0,
        network: 0,
        is_active: true,
        configuration: {},
        opening_hours: {},
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Sénégal',
        latitude: '',
        longitude: ''
      };
    }

    return {
      name: store.name,
      phone: store.phone,
      email: store.email,
      slogan: store.slogan,
      store_type: store.store_type,
      network: store.network,
      is_active: store.is_active,
      configuration: store.configuration || {},
      opening_hours: store.opening_hours || {},
      address_line1: store.address_line1,
      address_line2: store.address_line2,
      city: store.city,
      state: store.state,
      postal_code: store.postal_code,
      country: store.country,
      latitude: store.latitude,
      longitude: store.longitude
    };
  },

  // Statistiques calculées côté client
  async calculateStoreStats(stores: Store[]): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const activeStores = stores.filter(store => store.is_active);
    
    return {
      total: stores.length,
      active: activeStores.length,
      inactive: stores.length - activeStores.length
    };
  }
};

export default storeService;