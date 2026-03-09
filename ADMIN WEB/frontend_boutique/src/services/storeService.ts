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
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  store_type?: number;
  network?: number;
  slogan?: string;
  configuration?: Record<string, any>;
  opening_hours?: Record<string, any>;
  is_active?: boolean;
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
      const response = await api.getFullResponse<PaginatedResponse<Store>>('/stores/', params);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des stores:', error);
      throw error;
    }
  },

  // Récupérer tous les stores sans pagination (pour les selects, etc.)
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
      // Préparer les données pour l'API Django
      const payload = {
        name: storeData.name,
        address_details: {
          address_line1: storeData.address_line1,
          address_line2: storeData.address_line2 || '',
          city: storeData.city,
          state: storeData.state,
          postal_code: storeData.postal_code,
          country: storeData.country
        },
        phone: storeData.phone,
        email: storeData.email,
        store_type: storeData.store_type || null,
        network: storeData.network || null,
        slogan: storeData.slogan || '',
        configuration: storeData.configuration || {},
        opening_hours: storeData.opening_hours || {},
        is_active: storeData.is_active !== undefined ? storeData.is_active : true
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
        address_details: storeData.address_line1 ? {
          address_line1: storeData.address_line1,
          address_line2: storeData.address_line2 || '',
          city: storeData.city,
          state: storeData.state,
          postal_code: storeData.postal_code,
          country: storeData.country
        } : undefined,
        phone: storeData.phone,
        email: storeData.email,
        store_type: storeData.store_type || null,
        network: storeData.network || null,
        slogan: storeData.slogan || '',
        configuration: storeData.configuration || {},
        opening_hours: storeData.opening_hours || {}
      };

      // Nettoyer l'objet payload pour enlever les undefined
      Object.keys(payload).forEach(key => {
        if (payload[key as keyof typeof payload] === undefined) {
          delete payload[key as keyof typeof payload];
        }
      });

      return await api.put<Store>(`/stores/${id}/`, payload);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du store ${id}:`, error);
      throw error;
    }
  },

  // Mettre à jour partiellement un store (PATCH)
  async patchStore(id: number, updates: Partial<StoreFormData>): Promise<Store> {
    try {
      const payload: any = { ...updates };

      // Gérer séparément les address_details si présents
      if (updates.address_line1) {
        payload.address_details = {
          address_line1: updates.address_line1,
          address_line2: updates.address_line2 || '',
          city: updates.city,
          state: updates.state,
          postal_code: updates.postal_code,
          country: updates.country
        };

        // Supprimer les champs individuels d'adresse du payload principal
        delete payload.address_line1;
        delete payload.address_line2;
        delete payload.city;
        delete payload.state;
        delete payload.postal_code;
        delete payload.country;
      }

      return await api.patch<Store>(`/stores/${id}/`, payload);
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

  // Changer le statut actif/inactif d'un store
  async toggleStoreStatus(id: number, isActive: boolean): Promise<Store> {
    try {
      return await this.patchStore(id, { is_active: isActive });
    } catch (error) {
      console.error(`Erreur lors du changement de statut du store ${id}:`, error);
      throw error;
    }
  },

  // Récupérer les types de store
  async getStoreTypes(): Promise<StoreType[]> {
    try {
      return await api.get<StoreType[]>('/store-types/');
    } catch (error) {
      console.error('Erreur lors de la récupération des types de store:', error);
      throw new Error('Impossible de charger les types de store. Veuillez vérifier votre connexion.');
    }
  },

  // Récupérer les réseaux de store
  async getStoreNetworks(): Promise<StoreNetwork[]> {
    try {
      return await api.get<StoreNetwork[]>('/store-networks/');
    } catch (error) {
      console.error('Erreur lors de la récupération des réseaux de store:', error);
      throw new Error('Impossible de charger les réseaux de store. Veuillez vérifier votre connexion.');
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

  // Récupérer les statistiques des stores
  async getStoreStats(): Promise<StoreStats> {
    try {
      return await api.get<StoreStats>('/stores/stats/');
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw new Error('Impossible de charger les statistiques des stores.');
    }
  },

  // Calculer les statistiques côté client (alternative)
  async calculateStoreStats(stores: Store[]): Promise<StoreStats> {
    try {
      const activeStores = stores.filter(store => store.is_active);
      const totalEmployees = stores.reduce((sum, store) => sum + store.total_employees, 0);
      const totalProducts = stores.reduce((sum, store) => sum + store.total_products, 0);
      
      return {
        total: stores.length,
        active: activeStores.length,
        inactive: stores.length - activeStores.length,
        totalEmployees,
        totalProducts,
        averageEmployees: stores.length > 0 ? Math.round(totalEmployees / stores.length) : 0,
        monthlyGrowth: 0 // Nécessite des données historiques
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      throw error;
    }
  },

  // Upload d'image pour le logo
  async uploadLogo(storeId: number, file: File): Promise<{ logo: string }> {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      return await api.patch<{ logo: string }>(`/stores/${storeId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      console.error(`Erreur lors de l'upload du logo pour le store ${storeId}:`, error);
      throw error;
    }
  },

  // Fonctions utilitaires
  getFullAddress(store: Store): string {
    if (!store.address_details) return 'Adresse non définie';
    
    const addr = store.address_details;
    const parts = [
      addr.address_line1,
      addr.address_line2,
      `${addr.postal_code} ${addr.city}`,
      addr.state,
      addr.country
    ].filter(Boolean);
    
    return parts.join(', ');
  },

  validateStoreForm(formData: StoreFormData): string[] {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Le nom du store est requis');
    }

    if (!formData.address_line1.trim()) {
      errors.push('L\'adresse est requise');
    }

    if (!formData.city.trim()) {
      errors.push('La ville est requise');
    }

    if (!formData.state.trim()) {
      errors.push('La région est requise');
    }

    if (!formData.postal_code.trim()) {
      errors.push('Le code postal est requis');
    }

    if (!formData.country.trim()) {
      errors.push('Le pays est requis');
    }

    if (!formData.phone.trim()) {
      errors.push('Le téléphone est requis');
    }

    if (!formData.email.trim()) {
      errors.push('L\'email est requis');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('L\'email n\'est pas valide');
    }

    return errors;
  },

  prepareStoreFormData(store: Store | null): StoreFormData {
    if (!store) {
      return {
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Sénégal',
        phone: '',
        email: '',
        store_type: undefined,
        network: undefined,
        slogan: '',
        configuration: {},
        opening_hours: {},
        is_active: true
      };
    }

    const address = store.address_details;
    return {
      name: store.name,
      address_line1: address?.address_line1 || '',
      address_line2: address?.address_line2 || '',
      city: address?.city || '',
      state: address?.state || '',
      postal_code: address?.postal_code || '',
      country: address?.country || 'Sénégal',
      phone: store.phone || '',
      email: store.email || '',
      store_type: store.store_type || undefined,
      network: store.network || undefined,
      slogan: store.slogan || '',
      configuration: store.configuration || {},
      opening_hours: store.opening_hours || {},
      is_active: store.is_active
    };
  }
};

export default storeService;