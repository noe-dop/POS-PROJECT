import { apiService } from './api';
import { LoginData, AuthResponse, User } from '@types';

// Définir RegisterData localement
interface RegisterData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  password: string;
  password_confirm: string;
  user_type: number;
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
    
    // ✅ CORRECTION : L'API ne retourne pas user dans la réponse login
    // Nous devons récupérer les infos utilisateur séparément
    const tokens = response.data;
    
    // Stocker le token temporairement pour la requête suivante
    localStorage.setItem('access_token', tokens.access);
    
    try {
      // Récupérer les informations de l'utilisateur
      console.log("👤 Récupération des infos utilisateur...");
      const userResponse = await apiService.get<User>('/auth/user/');
      console.log("✅ Utilisateur récupéré:", userResponse.data);
      
      // Combiner tokens et user
      const authResponse: AuthResponse = {
        access: tokens.access,
        refresh: tokens.refresh,
        user: userResponse.data,
        is_superuser: false,
        is_staff: false,
        is_active: false,
        address: undefined,
        phone: '',
        user_type: 0,
        last_name: '',
        email: '',
        first_name: '',
        id: 0,
        username: undefined,
        key: '',
        access_token: '',
        token: ''
      };
      
      console.log("✅ Réponse authentification complète:", authResponse);
      return authResponse;
      
    } catch (userError) {
      console.error("❌ Erreur récupération utilisateur:", userError);
      
      // Fallback: créer un utilisateur basique avec le username
      const fallbackUser: User = {
        id: Date.now(),
        username: credentials.username,
        email: `${credentials.username}@example.com`,
        first_name: credentials.username,
        last_name: '',
        full_name: credentials.username,
        user_type: 1,
        user_type_name: 'Utilisateur',
        phone: '',
        address: '',
        is_active: true,
        is_staff: false,
        is_superuser: false,
        date_joined: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: undefined,
        role: ''
      };
      
      const authResponse: AuthResponse = {
        access: tokens.access,
        refresh: tokens.refresh,
        user: fallbackUser,
        is_superuser: false,
        is_staff: false,
        is_active: false,
        address: undefined,
        phone: '',
        user_type: 0,
        last_name: '',
        email: '',
        first_name: '',
        id: 0,
        username: undefined,
        key: '',
        access_token: '',
        token: ''
      };
      
      console.log("⚠️ Utilisation utilisateur fallback:", authResponse);
      return authResponse;
    }
  },

  async logout(): Promise<void> {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('store');
      localStorage.removeItem('authTokens');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      console.log("✅ Déconnexion locale effectuée");
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>('/auth/user/');
    return response.data;
  },

  async register(userData: RegisterData) {
    console.log("📝 Tentative d'inscription pour:", userData.username);
    console.log("👤 Type d'utilisateur sélectionné:", userData.user_type);
    
    try {
      const registerData = {
        username: userData.username,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || '',
        address: userData.address || '',
        password: userData.password,
        password_confirm: userData.password_confirm,
        user_type: userData.user_type
      };
      
      console.log("🔄 Envoi des données à l'API...", registerData);
      const response = await apiService.post('/auth/register/', registerData);
      
      console.log("✅ Inscription réussie !");
      return response.data;
      
    } catch (error: any) {
      console.error("❌ Erreur lors de l'inscription:", error.response?.data);
      
      if (error.response?.data) {
        console.log("🔍 Détails de l'erreur:", error.response.data);
      }
      
      throw error;
    }
  }
};