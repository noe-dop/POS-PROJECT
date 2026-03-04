import { 
  UserProfile, 
  LoginResponse,
  UpdateProfileData, 
  ChangePasswordData,
  CustomerPreferences,
  UserSession,
  UserActivity,
  UserStats,
  ApiResponse,
  ChangePasswordResponse  // ← Ajoutez cette ligne si vous avez créé ce type
} from '../types/profile.types';

class ProfileService {
  private baseUrl = '/api';
  
  // ==================== AUTHENTIFICATION ====================

  /**
   * Connexion utilisateur
   * POST /api/auth/login/
   */
  async login(username: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      console.log("🔐 Tentative de connexion pour:", username);
      
      const response = await fetch(`${this.baseUrl}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log("📥 Réponse login:", { status: response.status, data });
      
      if (response.ok && data.success) {
        // Stocker les tokens
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        console.log("✅ Login réussi - Tokens stockés");
        
        return {
          success: true,
          data: {
            access: data.access,
            refresh: data.refresh,
            user: data.user,
            success: data.success,
            message: data.message
          },
          message: data.message,
          statusCode: response.status
        };
      } else {
        console.log("❌ Login échoué:", data.message);
        return {
          success: false,
          error: data.message || 'Erreur de connexion',
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error("💥 Erreur réseau login:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  /**
   * Déconnexion
   * POST /api/auth/logout/
   */
  async logout(refreshToken?: string): Promise<ApiResponse<null>> {
    try {
      console.log("🚪 Tentative de déconnexion");
      
      const response = await fetch(`${this.baseUrl}/auth/logout/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ refresh: refreshToken || localStorage.getItem('refresh_token') }),
        credentials: 'include'
      });

      // Nettoyer les tokens même si la requête échoue
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      console.log("✅ Tokens nettoyés");

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || 'Déconnexion réussie',
          statusCode: response.status
        };
      }

      return {
        success: true,
        message: 'Déconnexion effectuée',
        statusCode: response.status
      };
    } catch (error) {
      // Nettoyer les tokens en cas d'erreur
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      
      return {
        success: true,
        message: 'Déconnexion effectuée',
        statusCode: 200
      };
    }
  }

  /**
   * Rafraîchir le token
   */
  async refreshToken(): Promise<boolean> {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        console.log("⚠️ Pas de refresh token disponible");
        return false;
      }

      console.log("🔄 Tentative de rafraîchissement du token");
      
      const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      const data = await response.json();
      
      if (response.ok && data.access) {
        localStorage.setItem('access_token', data.access);
        console.log("✅ Token rafraîchi avec succès");
        return true;
      }
      
      console.log("❌ Échec rafraîchissement token");
      return false;
    } catch (error) {
      console.error("💥 Erreur refresh token:", error);
      return false;
    }
  }

  // ==================== PROFIL UTILISATEUR ====================

  /**
   * Récupérer le profil de l'utilisateur connecté
   * GET /api/auth/profile/
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const token = this.getToken();
      console.log("📡 Appel API GET /api/auth/profile/");
      console.log("🔑 Token présent:", !!token);
      console.log("🔑 Token valeur:", token ? token.substring(0, 15) + '...' : 'aucun');
      
      const response = await fetch(`${this.baseUrl}/auth/profile/`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });
      
      console.log("📥 Statut réponse:", response.status);
      console.log("📥 Headers réponse:", {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      // Vérifier si la réponse est du JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("❌ Réponse non-JSON reçue:", text.substring(0, 200));
        return {
          success: false,
          error: 'Le serveur a retourné une réponse invalide (pas du JSON)',
          statusCode: response.status
        };
      }
      
      const data = await response.json();
      console.log("📦 Données reçues complètes:", data);
      console.log("📦 Structure data:", {
        success: data.success,
        aUser: !!data.user,
        userKeys: data.user ? Object.keys(data.user) : [],
        aOwnerProfile: !!data.owner_profile,
        aEmployeeProfile: !!data.employee_profile,
        aShareholderProfile: !!data.shareholder_profile,
        aCustomerProfile: !!data.customer_profile,
        autresClés: Object.keys(data).filter(k => !['success', 'user', 'owner_profile', 'employee_profile', 'shareholder_profile', 'customer_profile'].includes(k))
      });
      
      if (response.ok && data.success) {
        console.log("✅ Profil chargé avec succès");
        
        // Vérifier que user existe
        if (!data.user) {
          console.error("❌ data.user est manquant alors que success = true");
          return {
            success: false,
            error: 'Données utilisateur manquantes dans la réponse',
            statusCode: response.status
          };
        }
        
        const userProfile: UserProfile = {
          user: data.user,
          ...(data.owner_profile && { owner_profile: data.owner_profile }),
          ...(data.employee_profile && { employee_profile: data.employee_profile }),
          ...(data.shareholder_profile && { shareholder_profile: data.shareholder_profile }),
          ...(data.customer_profile && { customer_profile: data.customer_profile })
        };
        
        console.log("👤 UserProfile construit:", {
          userId: userProfile.user.id,
          username: userProfile.user.username,
          aOwner: !!userProfile.owner_profile,
          aEmployee: !!userProfile.employee_profile,
          aCustomer: !!userProfile.customer_profile
        });
        
        return {
          success: true,
          data: userProfile,
          statusCode: response.status
        };
      } else {
        console.log("❌ Échec chargement profil - success =", data.success);
        console.log("❌ Message d'erreur:", data.error || data.message || 'Erreur inconnue');
        
        return {
          success: false,
          error: data.error || data.message || 'Erreur lors du chargement du profil',
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error("💥 Exception dans getProfile:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  /**
   * Mettre à jour le profil
   * PATCH /api/auth/profile/
   */
  async updateProfile(profileData: UpdateProfileData): Promise<ApiResponse<UserProfile>> {
    try {
      console.log("📝 Mise à jour du profil avec:", profileData);
      
      const formData = new FormData();
      
      // Ajouter les champs du modèle User
      if (profileData.first_name) formData.append('first_name', profileData.first_name);
      if (profileData.last_name) formData.append('last_name', profileData.last_name);
      if (profileData.email) formData.append('email', profileData.email);
      if (profileData.phone) formData.append('phone', profileData.phone);
      if (profileData.address) formData.append('address', profileData.address);
      
      // Ajouter la photo
      if (profileData.photo instanceof File) {
        formData.append('photo', profileData.photo);
        console.log("🖼️ Photo ajoutée:", profileData.photo.name);
      }

      // Pour les clients (Customer)
      if (profileData.birth_date) {
        formData.append('birth_date', profileData.birth_date);
      }

      // Pour les employés (Employee)
      if (profileData.emergency_contact) {
        formData.append('emergency_contact', profileData.emergency_contact);
      }

      const response = await fetch(`${this.baseUrl}/auth/profile/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData,
        credentials: 'include'
      });

      console.log("📥 Statut réponse update:", response.status);
      
      const data = await response.json();
      console.log("📦 Réponse update:", data);
      
      if (response.ok && data.success) {
        console.log("✅ Profil mis à jour avec succès");
        return await this.getProfile();
      } else {
        console.log("❌ Échec mise à jour:", data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors de la mise à jour',
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error("💥 Exception updateProfile:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour',
        statusCode: 500
      };
    }
  }

  /**
   * Mettre à jour les préférences client
   */
  async updateCustomerPreferences(preferences: CustomerPreferences): Promise<ApiResponse<any>> {
    try {
      console.log("🔄 Mise à jour préférences client:", preferences);
      
      const response = await fetch(`${this.baseUrl}/customers/preferences/`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ preferences }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log("📥 Réponse update préférences:", data);
      
      return {
        success: response.ok,
        data: data,
        message: data.message,
        error: data.error,
        statusCode: response.status
      };
    } catch (error) {
      console.error("💥 Exception updatePreferences:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  // ==================== SESSIONS ET ACTIVITÉS ====================

  /**
   * Récupérer les sessions de l'utilisateur
   * GET /api/sessions/
   */
  async getUserSessions(): Promise<ApiResponse<UserSession[]>> {
    try {
      console.log("📡 Récupération des sessions");
      
      const response = await fetch(`${this.baseUrl}/sessions/`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });

      const data = await response.json();
      console.log("📥 Réponse sessions:", data);
      
      if (response.ok) {
        return {
          success: true,
          data: data.sessions || (Array.isArray(data) ? data : []),
          statusCode: response.status
        };
      } else {
        return {
          success: false,
          error: data.error || 'Erreur lors du chargement des sessions',
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error("💥 Exception getUserSessions:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  /**
   * Récupérer l'historique des activités
   * GET /api/activity-logs/
   */
  async getActivityLogs(limit: number = 50): Promise<ApiResponse<UserActivity[]>> {
    try {
      console.log(`📡 Récupération des activités (limit=${limit})`);
      
      const response = await fetch(`${this.baseUrl}/activity-logs/?limit=${limit}`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });

      const data = await response.json();
      console.log("📥 Réponse activités:", data);
      
      if (response.ok) {
        return {
          success: true,
          data: data.results || (Array.isArray(data) ? data : []),
          statusCode: response.status
        };
      } else {
        return {
          success: false,
          error: data.error || 'Erreur lors du chargement des activités',
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error("💥 Exception getActivityLogs:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  // ==================== STATISTIQUES ====================

  /**
   * Récupérer les statistiques utilisateur
   */
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    try {
      console.log("📡 Récupération des statistiques");
      
      const sessions = await this.getUserSessions();
      const sessionsCount = sessions.success ? sessions.data?.length || 0 : 0;

      const stats: UserStats = {
        total_logins: sessionsCount,
        last_login_ip: null,
      };

      return {
        success: true,
        data: stats,
        statusCode: 200
      };
    } catch (error) {
      console.error("💥 Exception getUserStats:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  // ==================== CHANGEMENT DE MOT DE PASSE ====================

  /**
   * Changer le mot de passe
   * POST /api/auth/change-password/
   */
  async changePassword(passwordData: ChangePasswordData): Promise<ApiResponse<any>> {
    try {
      console.log("🔐 Changement de mot de passe");
      
      const response = await fetch(`${this.baseUrl}/auth/change-password/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        }),
        credentials: 'include'
      });

      const data = await response.json();
      console.log("📥 Réponse changement mot de passe:", { status: response.status, data });
      
      if (response.ok && data.success) {
        console.log("✅ Mot de passe changé avec succès");
        return {
          success: true,
          message: data.message || 'Mot de passe modifié avec succès',
          data: data,
          statusCode: response.status
        };
      } else {
        console.log("❌ Échec changement mot de passe:", data.error);
        return {
          success: false,
          error: data.error || 'Erreur lors du changement de mot de passe',
          statusCode: response.status
        };
      }
    } catch (error) {
      console.error("💥 Erreur réseau changement mot de passe:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
        statusCode: 500
      };
    }
  }

  // ==================== UTILITAIRES ====================

  /**
   * Vérifier si le token est valide
   */
  async isAuthenticated(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    try {
      const response = await fetch(`${this.baseUrl}/auth/profile/`, {
        method: 'GET',
        headers: this.getHeaders(),
        credentials: 'include'
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir le rôle de l'utilisateur connecté
   */
  async getUserRole(): Promise<string> {
    try {
      const profile = await this.getProfile();
      if (profile.success && profile.data?.user) {
        return profile.data.user.role || 'user';
      }
    } catch (error) {
      console.error('Error getting user role:', error);
    }
    return 'user';
  }

  /**
   * Vérifier si l'utilisateur a un rôle spécifique
   */
  async hasRole(role: string | string[]): Promise<boolean> {
    const userRole = await this.getUserRole();
    
    if (Array.isArray(role)) {
      return role.includes(userRole);
    }
    return userRole === role;
  }

  async isEmployee(): Promise<boolean> {
    return this.hasRole('employee');
  }

  async isCustomer(): Promise<boolean> {
    return this.hasRole('customer');
  }

  async isOwner(): Promise<boolean> {
    return this.hasRole('owner');
  }

  async isShareholder(): Promise<boolean> {
    return this.hasRole('shareholder');
  }

  // ==================== MÉTHODES PRIVÉES ====================

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log("🔑 Token ajouté aux headers");
    }
    
    return headers;
  }

  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  async getCurrentStoreId(): Promise<number | null> {
    const profile = await this.getProfile();
    if (profile.success && profile.data?.user.employee_profile) {
      return profile.data.user.employee_profile.store_id;
    }
    return null;
  }
}

export const profileService = new ProfileService();