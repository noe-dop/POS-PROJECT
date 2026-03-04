import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, LoginData } from "@types";
import { authService } from "@services/auth";
import React from "react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
  registerUser: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction de déconnexion
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setError(null);
      localStorage.removeItem("user");
      localStorage.removeItem("authTokens");
      localStorage.removeItem("access_token");
      setLoading(false);
      console.log("🚪 Déconnexion effectuée");
      
      // Redirection vers la page de login
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem("user");
      const savedTokens = localStorage.getItem("authTokens");

      console.log("🔄 Initialisation auth - User:", !!savedUser, "Tokens:", !!savedTokens);

      if (savedUser && savedTokens) {
        try {
          const userData: User = JSON.parse(savedUser);
          
          // Vérifier si le token est toujours valide
          try {
            // Configurer le token pour la requête
            const tokens = JSON.parse(savedTokens);
            if (tokens.access) {
              localStorage.setItem("access_token", tokens.access);
            }
            
            // Vérifier que le token est valide
            await authService.getCurrentUser();
            
            // Si tout est OK, restaurer l'utilisateur
            setUser(userData);
            console.log("✅ Utilisateur restauré:", userData.username);
            
          } catch (err) {
            console.log("⚠️ Token expiré, nettoyage...");
            // PROBLÈME RÉSOLU : On ne fait que nettoyer, on n'appelle PAS logout()
            localStorage.removeItem("user");
            localStorage.removeItem("authTokens");
            localStorage.removeItem("access_token");
            setUser(null);
            // Pas de redirection automatique, on reste sur la page
          }
        } catch (error) {
          console.error("❌ Erreur restauration auth:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("authTokens");
          localStorage.removeItem("access_token");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
      console.log("🏁 Initialisation auth terminée");
    };

    initAuth();
  }, []); // Plus de dépendance à logout

  const login = async (credentials: LoginData) => {
    try {
      setError(null);
      setLoading(true);
      console.log("🔐 Tentative de connexion avec:", credentials.username);
      
      const response = await authService.login(credentials);
      console.log("✅ Réponse login:", response);
      
      // Stocker les tokens correctement
      if (response.token) {
        localStorage.setItem("authTokens", JSON.stringify(response.token));
        if (response.token.access) {
          localStorage.setItem("access_token", response.token.access);
        }
      } else if (response.access) {
        // Format différent possible
        localStorage.setItem("authTokens", JSON.stringify({ access: response.access }));
        localStorage.setItem("access_token", response.access);
      }
      
      const userData: User = response.user || {
        id: Date.now(),
        username: credentials.username,
        email: credentials.username.includes('@') ? credentials.username : `${credentials.username}@example.com`,
        first_name: '',
        last_name: '',
        is_active: true,
        date_joined: new Date().toISOString()
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      console.log("✅ Authentification réussie pour:", userData.username);
      
    } catch (err: any) {
      let errorMessage = "Une erreur est survenue lors de la connexion";
      
      if (err.response?.status === 401 || err.status === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMessage = "Nom d'utilisateur ou mot de passe incorrect";
      } else if (err.message && err.message.includes('Network')) {
        errorMessage = "Erreur de connexion au serveur. Vérifiez votre internet.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error("❌ Erreur de connexion:", err);
      setError(errorMessage);
      
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("authTokens");
      localStorage.removeItem("access_token");
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (userData: any) => {
    try {
      setError(null);
      setLoading(true);
      console.log("📝 Tentative d'inscription pour:", userData.username);
      
      const response = await authService.register(userData);
      console.log("✅ Inscription réussie:", response);
      
      if (response.user || response.tokens) {
        if (response.tokens) {
          localStorage.setItem("authTokens", JSON.stringify(response.tokens));
          if (response.tokens.access) {
            localStorage.setItem("access_token", response.tokens.access);
          }
        }
        
        if (response.user) {
          localStorage.setItem("user", JSON.stringify(response.user));
          setUser(response.user);
        }
      }
      
      return response;
    } catch (err: any) {
      let errorMessage = "Erreur lors de l'inscription";
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
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
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error("❌ Erreur d'inscription:", err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    registerUser,
    isAuthenticated: !!user,
    error,
    clearError,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};

export default useAuth;