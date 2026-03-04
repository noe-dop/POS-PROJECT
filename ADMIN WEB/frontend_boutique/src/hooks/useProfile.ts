import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profile.service';
import { 
  UserProfile, 
  UpdateProfileData, 
  ChangePasswordData,
  CustomerPreferences,
  UserSession,
  UserActivity,
  UserStats
} from '../types/profile.types';

interface UseProfileReturn {
  // État
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  sessions: UserSession[];
  activities: UserActivity[];
  stats: UserStats | null;
  isAuthenticated: boolean;
  userRole: string | null;

  // Actions de profil
  getProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<boolean>;
  updatePreferences: (preferences: CustomerPreferences) => Promise<boolean>;
  
  // Authentification
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  
  // 🔐 Gestion du mot de passe (NOUVEAU)
  changePassword: (data: ChangePasswordData) => Promise<{ success: boolean; message?: string }>;
  
  // Sessions et activités
  getSessions: () => Promise<void>;
  getActivities: (limit?: number) => Promise<void>;
  getStats: () => Promise<void>;
  
  // Vérifications de rôle
  isEmployee: () => Promise<boolean>;
  isCustomer: () => Promise<boolean>;
  isOwner: () => Promise<boolean>;
  isShareholder: () => Promise<boolean>;
  hasRole: (role: string | string[]) => Promise<boolean>;
  
  // Utilitaires
  clearError: () => void;
  refreshToken: () => Promise<boolean>;
}

export const useProfile = (): UseProfileReturn => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);

  // LOGS DE DÉBOGAGE
  useEffect(() => {
    console.log("🔧 useProfile - État actuel:", {
      profile: !!profile,
      loading,
      isAuthenticated,
      userRole,
      initialized
    });
  }, [profile, loading, isAuthenticated, userRole, initialized]);

  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Une erreur est survenue';
    setError(message);
    console.error('❌ Profile error:', err);
  };

  const clearError = () => setError(null);

  // ==================== PROFIL ====================

  const getProfile = useCallback(async () => {
    console.log("🔄 getProfile appelé");
    setLoading(true);
    clearError();
    
    try {
      const response = await profileService.getProfile();
      console.log("📦 Réponse getProfile:", response);
      
      if (response.success && response.data) {
        console.log("✅ Profil chargé avec succès:", response.data.user);
        setProfile(response.data);
        setIsAuthenticated(true);
        setUserRole(response.data.user.role || 'user');
      } else {
        console.log("⚠️ Erreur chargement profil:", response);
        
        // Si 401, l'utilisateur n'est pas authentifié
        if (response.statusCode === 401) {
          setIsAuthenticated(false);
          setUserRole(null);
          setProfile(null);
        } else if (response.statusCode && response.statusCode !== 401) {
          setError(response.error || 'Erreur lors du chargement du profil');
        }
      }
    } catch (err) {
      console.error("❌ Exception dans getProfile:", err);
      handleError(err);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const updateProfile = async (data: UpdateProfileData): Promise<boolean> => {
    setLoading(true);
    clearError();
    
    try {
      const response = await profileService.updateProfile(data);
      if (response.success && response.data) {
        setProfile(response.data);
        return true;
      } else {
        setError(response.error || 'Erreur lors de la mise à jour');
        return false;
      }
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (preferences: CustomerPreferences): Promise<boolean> => {
    setLoading(true);
    clearError();
    
    try {
      const response = await profileService.updateCustomerPreferences(preferences);
      if (response.success) {
        await getProfile();
        return true;
      } else {
        setError(response.error || 'Erreur lors de la mise à jour des préférences');
        return false;
      }
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ==================== AUTHENTIFICATION ====================

  const login = async (username: string, password: string) => {
    setLoading(true);
    clearError();
    
    try {
      const response = await profileService.login(username, password);
      if (response.success && response.data) {
        await getProfile();
        return { success: true, message: response.message };
      } else {
        setError(response.error || 'Erreur de connexion');
        return { success: false, message: response.error };
      }
    } catch (err) {
      handleError(err);
      return { success: false, message: 'Erreur de connexion' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      await profileService.logout();
      setProfile(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setSessions([]);
      setActivities([]);
      setStats(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 🔐 CHANGEMENT DE MOT DE PASSE (NOUVEAU) ====================

  const changePassword = async (data: ChangePasswordData): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    clearError();
    
    try {
      // Validation côté client
      if (data.new_password !== data.confirm_password) {
        return { 
          success: false, 
          message: 'Les nouveaux mots de passe ne correspondent pas' 
        };
      }
      
      if (data.new_password.length < 6) {
        return { 
          success: false, 
          message: 'Le mot de passe doit contenir au moins 6 caractères' 
        };
      }
      
      const response = await profileService.changePassword(data);
      
      if (response.success) {
        console.log("✅ Mot de passe changé avec succès");
        return { 
          success: true, 
          message: response.message || 'Mot de passe modifié avec succès' 
        };
      } else {
        setError(response.error || 'Erreur lors du changement de mot de passe');
        return { 
          success: false, 
          message: response.error || 'Erreur lors du changement de mot de passe' 
        };
      }
    } catch (err) {
      handleError(err);
      return { 
        success: false, 
        message: 'Erreur lors du changement de mot de passe' 
      };
    } finally {
      setLoading(false);
    }
  };

  // ==================== SESSIONS ET ACTIVITÉS ====================

  const getSessions = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await profileService.getUserSessions();
      if (response.success && response.data) {
        setSessions(response.data);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    }
  };

  const getActivities = async (limit: number = 20) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await profileService.getActivityLogs(limit);
      if (response.success && response.data) {
        setActivities(response.data);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const getStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await profileService.getUserStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // ==================== VÉRIFICATIONS DE RÔLE ====================

  const isEmployee = async () => profileService.isEmployee();
  const isCustomer = async () => profileService.isCustomer();
  const isOwner = async () => profileService.isOwner();
  const isShareholder = async () => profileService.isShareholder();
  const hasRole = async (role: string | string[]) => profileService.hasRole(role);

  // ==================== UTILITAIRES ====================

  const refreshToken = async (): Promise<boolean> => {
    const success = await profileService.refreshToken();
    if (success) {
      await getProfile();
    }
    return success;
  };

  // Vérifier l'authentification initiale depuis localStorage
  useEffect(() => {
    const checkInitialAuth = () => {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      
      console.log("🔑 checkInitialAuth - token:", token ? "présent" : "absent");
      console.log("🔑 checkInitialAuth - user:", user ? "présent" : "absent");
      
      if (token) {
        setIsAuthenticated(true);
        setLoading(true); // On va charger le profil
      } else {
        setIsAuthenticated(false);
        setLoading(false);
        setInitialized(true);
      }
    };
    
    checkInitialAuth();
  }, []);

  // Charger le profil au montage si authentifié
  useEffect(() => {
    console.log("🔄 useEffect [isAuthenticated] - isAuthenticated:", isAuthenticated);
    
    if (isAuthenticated) {
      getProfile();
    }
  }, [isAuthenticated, getProfile]);

  // Charger les données supplémentaires si profil chargé
  useEffect(() => {
    console.log("🔄 useEffect [profile] - profile chargé:", !!profile);
    
    if (profile) {
      getSessions();
      getActivities();
      getStats();
    }
  }, [profile]);

  return {
    // État
    profile,
    loading,
    error,
    sessions,
    activities,
    stats,
    isAuthenticated,
    userRole,

    // Actions de profil
    getProfile,
    updateProfile,
    updatePreferences,
    
    // Authentification
    login,
    logout,
    
    // 🔐 Gestion du mot de passe (NOUVEAU)
    changePassword,
    
    // Sessions et activités
    getSessions,
    getActivities,
    getStats,
    
    // Vérifications de rôle
    isEmployee,
    isCustomer,
    isOwner,
    isShareholder,
    hasRole,
    
    // Utilitaires
    clearError,
    refreshToken
  };
};