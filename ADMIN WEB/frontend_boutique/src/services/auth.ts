import { apiService } from './api';
import { LoginData, AuthResponse, User } from '@types';

// Interface pour les données d'inscription
interface RegisterData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  password: string;
  password_confirm: string;
}

// Interface pour la réponse standard de l'API Django
interface DjangoAuthResponse {
  success: boolean;
  message: string;
  access: string;
  refresh: string;
  user: User;
  expires_in?: number;
}

export const authService = {
  /**
   * Connexion utilisateur
   */
  async login(credentials: LoginData): Promise<AuthResponse> {
    console.log("🔐 Envoi des identifiants à l'API", credentials.username);
    
    try {
      const loginData = {
        username: credentials.username.trim(),
        password: credentials.password
      };
      
      const response = await apiService.post<DjangoAuthResponse>('/auth/login/', loginData);
      console.log("✅ Réponse API reçue:", response.data);
      
      const apiResponse = response.data;
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.message || 'Erreur de connexion');
      }
      
      this.updateTokens(apiResponse.access, apiResponse.refresh);
      
      if (!apiResponse.user) {
        throw new Error("Réponse API invalide: utilisateur manquant");
      }
      
      localStorage.setItem('user', JSON.stringify(apiResponse.user));
      console.log("✅ Utilisateur stocké:", apiResponse.user.username);
      
      return {
        success: apiResponse.success,
        message: apiResponse.message,
        access: apiResponse.access,
        refresh: apiResponse.refresh,
        user: apiResponse.user,
        expires_in: apiResponse.expires_in
      };
      
    } catch (error: any) {
      console.error("❌ Erreur lors du login:", error);
      
      let errorMessage = "Erreur de connexion";
      
      if (error.response) {
        const data = error.response.data;
        if (data.message) errorMessage = data.message;
        else if (data.error) errorMessage = data.error;
        else if (data.non_field_errors) errorMessage = data.non_field_errors.join(', ');
        else if (data.detail) errorMessage = data.detail;
      } else if (error.request) {
        errorMessage = "Le serveur ne répond pas. Vérifiez votre connexion.";
      } else {
        errorMessage = error.message || "Erreur inconnue";
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Déconnexion utilisateur
   */
  async logout(): Promise<void> {
    console.log("🚪 Déconnexion...");
    
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        await apiService.post('/auth/logout/', { refresh: refreshToken });
        console.log("✅ API logout réussie");
      } catch (error) {
        console.warn("⚠️ Erreur lors du logout API (ignorée):", error);
      }
    }
    
    this.clearLocalStorage();
    console.log("✅ Déconnexion effectuée, tokens nettoyés");
  },

  /**
   * Récupérer l'utilisateur courant
   */
  async getCurrentUser(forceRefresh = false): Promise<User> {
    try {
      if (forceRefresh) {
        console.log("🔄 Rafraîchissement forcé depuis l'API...");
        const response = await apiService.get<User>('/auth/profile/');
        const user = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      }
      
      const storedUser = localStorage.getItem('user');
      if (storedUser && this.isAuthenticated()) {
        try {
          const user = JSON.parse(storedUser);
          console.log("👤 Utilisateur récupéré du localStorage:", user.username);
          return user;
        } catch (e) {
          console.warn("⚠️ Erreur parsing user du localStorage");
        }
      }
      
      console.log("🔄 Récupération utilisateur depuis l'API...");
      const response = await apiService.get<User>('/auth/profile/');
      const user = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error) {
      console.error('❌ Erreur récupération utilisateur:', error);
      throw error;
    }
  },

  /**
   * Inscription utilisateur
   */
  async register(userData: RegisterData) {
    console.log("📝 Tentative d'inscription pour:", userData.username);
    
    try {
      const registerData = {
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || '',
        address: userData.address || '',
        password: userData.password,
        password_confirm: userData.password_confirm
      };
      
      console.log("🔄 Envoi des données à l'API...");
      const response = await apiService.post('/auth/register/', registerData);
      
      console.log("✅ Inscription réussie !");
      
      if (response.data.access) {
        this.updateTokens(response.data.access, response.data.refresh);
      }
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
      
    } catch (error: any) {
      console.error("❌ Erreur lors de l'inscription:", error);
      
      let errorMessage = "Erreur lors de l'inscription";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (errorData.email) {
          errorMessage = `Email: ${errorData.email.join(', ')}`;
        } else if (errorData.username) {
          errorMessage = `Nom d'utilisateur: ${errorData.username.join(', ')}`;
        } else if (errorData.password) {
          errorMessage = `Mot de passe: ${errorData.password.join(', ')}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      console.log("❌ Pas de refresh token disponible");
      return false;
    }
    
    try {
      console.log("🔄 Tentative de rafraîchissement du token...");
      const response = await apiService.post('/auth/token/refresh/', {
        refresh: refreshToken
      });
      
      if (response.data.access) {
        this.updateTokens(response.data.access, response.data.refresh || refreshToken);
        console.log("✅ Token rafraîchi avec succès");
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("❌ Erreur rafraîchissement token:", error);
      this.clearLocalStorage();
      return false;
    }
  },

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    return !!token;
  },

  /**
   * Obtenir le token d'accès
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  },

  /**
   * Obtenir le refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Mettre à jour les tokens
   */
  updateTokens(access: string, refresh?: string): void {
    localStorage.setItem('access_token', access);
    if (refresh) {
      localStorage.setItem('refresh_token', refresh);
    }
    localStorage.setItem('authTokens', JSON.stringify({ 
      access, 
      refresh: refresh || null 
    }));
    console.log("✅ Tokens mis à jour");
  },

  /**
   * Nettoyer le localStorage
   */
  clearLocalStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('authTokens');
    sessionStorage.clear();
    console.log("🧹 localStorage nettoyé");
  },

  /**
   * Vérifier si le token est expiré
   */
  isTokenExpired(token?: string): boolean {
    const accessToken = token || this.getToken();
    if (!accessToken) return true;
    
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() >= exp;
    } catch (e) {
      console.warn("⚠️ Impossible de décoder le token");
      return true;
    }
  },

  // ============ MÉTHODES SPÉCIFIQUES PAR RÔLE ============

  /**
   * Inscription en tant que propriétaire
   */
  async registerOwner(data: RegisterData) {
    return apiService.post('/auth/owners/register/', data);
  },

  /**
   * Inscription en tant qu'actionnaire
   */
  async registerShareholder(data: RegisterData & { investment_amount?: number }) {
    return apiService.post('/auth/shareholders/register/', data);
  },

  /**
   * Inscription en tant que client
   */
  async registerCustomer(data: RegisterData & { birth_date?: string; preferences?: any }) {
    return apiService.post('/auth/customers/register/', data);
  },

  /**
   * Récupérer le profil propriétaire
   */
  async getOwnerProfile() {
    return apiService.get('/auth/owners/profile/');
  },

  /**
   * Récupérer le profil employé
   */
  async getEmployeeProfile() {
    return apiService.get('/auth/employees/profile/');
  },

  /**
   * Récupérer le profil actionnaire
   */
  async getShareholderProfile() {
    return apiService.get('/auth/shareholders/profile/');
  },

  /**
   * Récupérer le profil client
   */
  async getCustomerProfile() {
    return apiService.get('/auth/customers/profile/');
  },

  /**
   * Changer le mot de passe
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await apiService.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      console.log("✅ Mot de passe changé avec succès");
    } catch (error) {
      console.error("❌ Erreur changement mot de passe:", error);
      throw error;
    }
  },

  /**
   * Demander la réinitialisation du mot de passe
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiService.post('/auth/forgot-password/', { email });
      console.log("✅ Email de réinitialisation envoyé");
    } catch (error) {
      console.error("❌ Erreur demande réinitialisation:", error);
      throw error;
    }
  },

  /**
   * Réinitialiser le mot de passe avec un token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiService.post('/auth/reset-password/', {
        token,
        new_password: newPassword
      });
      console.log("✅ Mot de passe réinitialisé avec succès");
    } catch (error) {
      console.error("❌ Erreur réinitialisation mot de passe:", error);
      throw error;
    }
  }
};

export default authService;