import { apiService } from './api';
import { LoginData, AuthResponse, User } from '@types';

// Définir RegisterData localement (sans user_type)
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

export const authService = {
  async login(credentials: LoginData): Promise<AuthResponse> {
    console.log("🔐 Envoi des identifiants à l'API");
    
    const loginData = {
      username: credentials.username.trim(),
      password: credentials.password
    };
    
    const response = await apiService.post<any>('/auth/login/', loginData);
    console.log("✅ Réponse login:", response.data);
    
    // ✅ CORRECTION SIMPLIFIÉE : On retourne directement la réponse de l'API
    // L'API Django REST devrait retourner un format standard
    const apiResponse = response.data;
    
    // Stocker le token si présent
    if (apiResponse.access || apiResponse.token) {
      localStorage.setItem('access_token', apiResponse.access || apiResponse.token);
    }
    
    // Si l'API retourne déjà un user, on l'utilise
    if (apiResponse.user) {
      console.log("✅ Utilisateur dans la réponse login:", apiResponse.user);
      return apiResponse;
    }
    
    // Sinon, on récupère l'utilisateur séparément
    try {
      console.log("👤 Récupération des infos utilisateur...");
      const userResponse = await apiService.get<User>('/auth/user/');
      console.log("✅ Utilisateur récupéré:", userResponse.data);
      
      // Construire la réponse d'authentification
      const authResponse: AuthResponse = {
        user: userResponse.data,
        tokens: apiResponse.tokens || {
          access: apiResponse.access,
          refresh: apiResponse.refresh
        }
      };
      
      console.log("✅ Réponse authentification complète:", authResponse);
      return authResponse;
      
    } catch (userError) {
      console.error("❌ Erreur récupération utilisateur:", userError);
      
      // Fallback minimal
      const fallbackUser: User = {
        id: Date.now(),
        username: credentials.username,
        email: credentials.username.includes('@') ? credentials.username : `${credentials.username}@example.com`,
        first_name: '',
        last_name: '',
        is_active: true,
        date_joined: new Date().toISOString(),
        permissions: undefined,
        role: '',
        full_name: '',
        user_type: 0,
        phone: '',
        is_staff: false,
        is_superuser: false,
        updated_at: ''
      };
      
      const authResponse: AuthResponse = {
        user: fallbackUser,
        message: 'Connexion réussie (mode fallback)'
      };
      
      console.log("⚠️ Utilisation utilisateur fallback:", authResponse);
      return authResponse;
    }
  },

  async logout(): Promise<void> {
    try {
      // Optionnel: appeler l'API de déconnexion si disponible
      // await apiService.post('/auth/logout/');
      
      // Nettoyage local
      localStorage.removeItem('user');
      localStorage.removeItem('authTokens');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.clear();
      
      console.log("✅ Déconnexion effectuée");
    } catch (error) {
      console.error('Logout error:', error);
      // On nettoie quand même le local storage
      localStorage.clear();
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiService.get<User>('/auth/user/');
      return response.data;
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      throw error;
    }
  },

  async register(userData: RegisterData) {
    console.log("📝 Tentative d'inscription pour:", userData.username);
    
    try {
      // Préparer les données pour l'API
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
      
      console.log("🔄 Envoi des données à l'API...", registerData);
      
      // Note: Le backend doit déterminer automatiquement le type d'utilisateur
      // ou avoir des endpoints séparés pour chaque type
      const response = await apiService.post('/owner/register/', registerData);
      
      console.log("✅ Inscription réussie !");
      return response.data;
      
    } catch (error: any) {
      console.error("❌ Erreur lors de l'inscription:", error);
      
      // Amélioration du message d'erreur
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log("🔍 Détails de l'erreur:", errorData);
        
        // Construire un message d'erreur plus lisible
        let errorMessage = "Erreur lors de l'inscription";
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(', ');
        } else if (errorData.email) {
          errorMessage = `Email: ${errorData.email.join(', ')}`;
        } else if (errorData.username) {
          errorMessage = `Nom d'utilisateur: ${errorData.username.join(', ')}`;
        } else if (errorData.password) {
          errorMessage = `Mot de passe: ${errorData.password.join(', ')}`;
        }
        
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  },

  // Méthode optionnelle pour enregistrer un type spécifique d'utilisateur
  async registerOwner(data: RegisterData) {
    return apiService.post('/api/owners/register/', data);
  },

  async registerShareholder(data: RegisterData & { investment_amount?: number }) {
    return apiService.post('/api/shareholders/register/', data);
  },

  async registerCustomer(data: RegisterData & { birth_date?: string; preferences?: any }) {
    return apiService.post('/api/customers/register/', data);
  }
};