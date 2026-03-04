import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, LoginData, AuthResponse } from "@types";
import { authService } from "@services/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 1. Vérifier l'authentification au chargement
  useEffect(() => {
    const initAuth = async () => {
      console.log("🔄 Initialisation de l'authentification...");
      
      try {
        // Vérifier si un token existe
        const hasToken = authService.isAuthenticated();
        console.log("📦 Token présent:", hasToken);

        if (!hasToken) {
          console.log("❌ Pas de token, utilisateur non connecté");
          setUser(null);
          setLoading(false);
          return;
        }

        // Récupérer l'utilisateur
        console.log("👤 Récupération de l'utilisateur...");
        const userData = await authService.getCurrentUser();
        
        if (userData) {
          console.log("✅ Utilisateur restauré:", userData.username);
          setUser(userData);
        } else {
          console.log("❌ Impossible de récupérer l'utilisateur");
          // Token invalide, nettoyer
          await authService.logout();
          setUser(null);
        }
      } catch (err) {
        console.error("❌ Erreur d'initialisation:", err);
        setUser(null);
        authService.clearLocalStorage();
      } finally {
        setLoading(false);
        console.log("🏁 Initialisation terminée, loading:", false);
      }
    };

    initAuth();
  }, []);

  // ✅ 2. Fonction de connexion
  const login = async (credentials: LoginData): Promise<AuthResponse> => {
    setError(null);
    setLoading(true);
    
    try {
      console.log("🔐 Tentative de connexion...");
      const response = await authService.login(credentials);
      
      // Mettre à jour l'état avec l'utilisateur
      if (response.user) {
        setUser(response.user);
        console.log("✅ Utilisateur connecté:", response.user.username);
      }
      
      return response;
    } catch (err: any) {
      const message = err.message || "Erreur de connexion";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ✅ 3. Fonction de déconnexion
  const logout = async (): Promise<void> => {
    setLoading(true);
    
    try {
      console.log("🚪 Déconnexion...");
      await authService.logout();
      setUser(null);
      console.log("✅ Déconnecté");
    } catch (err) {
      console.error("❌ Erreur logout:", err);
      // Nettoyer même en cas d'erreur
      authService.clearLocalStorage();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 4. Rafraîchir l'utilisateur
  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.error("❌ Erreur refresh user:", err);
    }
  };

  // ✅ 5. Effacer les erreurs
  const clearError = () => setError(null);

  // ✅ 6. Valeur du contexte
  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    error,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ 7. Hook personnalisé
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};