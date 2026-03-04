// src/services/api.ts
import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Création de l'instance axios avec configuration de base
export const apiService: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 0, // ✅ 0 = PAS DE TIMEOUT (recommandé en développement)
});

// Fonction pour rafraîchir le token
const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('🔄 Tentative de rafraîchissement du token...');
    
    // Utiliser axios directement pour éviter les intercepteurs circulaires
    const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
      refresh: refreshToken
    });

    const newAccessToken = response.data.access;
    localStorage.setItem('access_token', newAccessToken);
    
    console.log('✅ Token rafraîchi avec succès');
    return newAccessToken;
  } catch (error) {
    console.error('❌ Erreur lors du rafraîchissement du token:', error);
    
    // Déconnexion si le refresh token a expiré
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    // Redirection vers la page de login
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    
    return null;
  }
};

// Fonction utilitaire pour vérifier si un token est expiré
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convertir en millisecondes
    const currentTime = Date.now();
    const isExpired = expirationTime < currentTime;
    
    if (isExpired) {
      console.log('⏰ Token expiré depuis', Math.round((currentTime - expirationTime) / 1000 / 60), 'minutes');
    }
    
    return isExpired;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du token:', error);
    return true;
  }
};

// Intercepteur pour logger les requêtes et vérifier les tokens
apiService.interceptors.request.use(
  async (config) => {
    console.log(`🚀 [API] Requête ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      data: config.data,
      params: config.params
    });
    
    // Vérifier et rafraîchir le token si nécessaire AVANT la requête
    const token = localStorage.getItem('access_token');
    if (token) {
      // Vérifier si le token est expiré
      if (isTokenExpired(token)) {
        console.log('🔄 Token expiré détecté, rafraîchissement avant requête...');
        const newToken = await refreshToken();
        if (newToken) {
          config.headers.Authorization = `Bearer ${newToken}`;
        } else {
          // Si le rafraîchissement échoue, annuler la requête
          return Promise.reject(new Error('Token refresh failed'));
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API] Erreur requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour logger les réponses et gérer les tokens expirés
apiService.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ [API] Réponse ${response.status} ${response.config.url}`, {
      data: response.data,
      pagination: response.data.results ? {
        count: response.data.count,
        resultsCount: response.data.results?.length
      } : 'no-pagination'
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // 🔄 Gestion des tokens expirés (erreur 401/403 avec token_not_valid)
    if ((error.response?.status === 401 || error.response?.status === 403) && 
        (error.response.data?.code === 'token_not_valid' || 
         error.response.data?.detail?.includes('token')) &&
        !originalRequest._retry) {
      
      console.log('🔄 Token expiré détecté dans la réponse, tentative de rafraîchissement...');
      originalRequest._retry = true;

      try {
        const newToken = await refreshToken();
        if (newToken) {
          // Mettre à jour le header avec le nouveau token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          // Renvoyer la requête originale avec le nouveau token
          console.log('🔄 Renvoi de la requête originale avec le nouveau token...');
          return apiService(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Impossible de rafraîchir le token:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    // ⚠️ AFFICHAGE DES DÉTAILS D'ERREUR
    console.error('❌ [API] Erreur réponse DÉTAILLÉE:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      requestData: error.config?.data,
      message: error.message
    });
    
    // 🔥 AFFICHAGE EXPLICITE DES ERREURS DJANGO
    if (error.response?.data) {
      console.error('🔥🔥🔥 ERREUR VALIDATION DJANGO 🔥🔥🔥');
      console.error('📋 Détails complets:', error.response.data);
      
      // Afficher les erreurs de validation de manière structurée
      if (typeof error.response.data === 'object') {
        console.error('🔍 Analyse structured:');
        Object.keys(error.response.data).forEach(key => {
          console.error(`   ${key}:`, error.response.data[key]);
        });
      } else {
        console.error('🔍 Message:', error.response.data);
      }
    }
    
    return Promise.reject(error);
  }
);

// Interface pour les réponses paginées Django
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Service API avec gestion de la pagination Django
export const api = {
  // GET avec gestion de la pagination
  async get<T>(url: string, params?: any, p0?: { responseType: string; }): Promise<T> {
    try {
      console.log(`🔍 [API GET] ${url}`, params ? { params } : '');
      const response: AxiosResponse = await apiService.get(url, { params });
      
      // Si c'est une réponse paginée Django, retourner directement les résultats
      if (response.data && typeof response.data === 'object' && 'results' in response.data) {
        console.log(`📄 [API] Réponse paginée - ${response.data.results.length} résultats sur ${response.data.count} total`);
        return response.data.results as T;
      }
      
      // Sinon retourner la réponse normale
      return response.data as T;
    } catch (error) {
      console.error(`❌ [API GET Error] ${url}:`, error);
      throw error;
    }
  },

  // POST normal
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      console.log(`📤 [API POST] ${url}`, data);
      
      // Gestion automatique du Content-Type pour FormData
      let finalConfig = config;
      if (data instanceof FormData && (!config?.headers || !config.headers['Content-Type'])) {
        finalConfig = {
          ...config,
          headers: {
            ...config?.headers,
            'Content-Type': 'multipart/form-data',
          }
        };
      }
      
      const response: AxiosResponse = await apiService.post(url, data, finalConfig);
      return response.data as T;
    } catch (error) {
      console.error(`❌ [API POST Error] ${url}:`, error);
      throw error;
    }
  },

  // PUT normal
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      console.log(`✏️ [API PUT] ${url}`, data);
      
      // Gestion automatique du Content-Type pour FormData
      let finalConfig = config;
      if (data instanceof FormData && (!config?.headers || !config.headers['Content-Type'])) {
        finalConfig = {
          ...config,
          headers: {
            ...config?.headers,
            'Content-Type': 'multipart/form-data',
          }
        };
      }
      
      const response: AxiosResponse = await apiService.put(url, data, finalConfig);
      return response.data as T;
    } catch (error) {
      console.error(`❌ [API PUT Error] ${url}:`, error);
      throw error;
    }
  },

  // PATCH pour les mises à jour partielles
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      console.log(`🔧 [API PATCH] ${url}`, data);
      
      // CORRECTION CRITIQUE : Gestion automatique du Content-Type pour FormData
      let finalConfig = config;
      if (data instanceof FormData) {
        // Pour FormData, ne pas définir Content-Type ou laisser axios le faire automatiquement
        finalConfig = {
          ...config,
          headers: {
            ...config?.headers,
            // Ne pas définir Content-Type pour FormData, axios le gère automatiquement
            // avec la boundary appropriée
          }
        };
        // Supprimer explicitement Content-Type si présent
        if (finalConfig.headers && 'Content-Type' in finalConfig.headers) {
          delete finalConfig.headers['Content-Type'];
        }
      }
      
      const response: AxiosResponse = await apiService.patch(url, data, finalConfig);
      return response.data as T;
    } catch (error) {
      console.error(`❌ [API PATCH Error] ${url}:`, error);
      throw error;
    }
  },

  // DELETE normal
  async delete<T>(url: string): Promise<T> {
    try {
      console.log(`🗑️ [API DELETE] ${url}`);
      const response: AxiosResponse = await apiService.delete(url);
      return response.data as T;
    } catch (error) {
      console.error(`❌ [API DELETE Error] ${url}:`, error);
      throw error;
    }
  },

  // GET pour récupérer la réponse complète (avec pagination)
  async getFullResponse<T>(url: string, params?: any): Promise<AxiosResponse<T>> {
    try {
      console.log(`🔍 [API GET Full] ${url}`, params ? { params } : '');
      return await apiService.get(url, { params });
    } catch (error) {
      console.error(`❌ [API GET Full Error] ${url}:`, error);
      throw error;
    }
  },

  // GET pour récupérer une réponse paginée complète
  async getPaginated<T>(url: string, params?: any): Promise<PaginatedResponse<T>> {
    try {
      console.log(`🔍 [API GET Paginated] ${url}`, params ? { params } : '');
      const response: AxiosResponse<PaginatedResponse<T>> = await apiService.get(url, { params });
      return response.data;
    } catch (error) {
      console.error(`❌ [API GET Paginated Error] ${url}:`, error);
      throw error;
    }
  },

  // Méthode pour rafraîchir manuellement le token
  async refreshToken(): Promise<string | null> {
    return await refreshToken();
  },

  // Méthode pour vérifier l'état de l'authentification
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    try {
      return !isTokenExpired(token);
    } catch {
      return false;
    }
  }
};

export default api;