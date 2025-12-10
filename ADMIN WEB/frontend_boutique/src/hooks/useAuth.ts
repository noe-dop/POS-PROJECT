import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, LoginData, Store } from "@types";
import { authService } from "@services/auth";
import React from "react";

interface AuthContextType {
  user: User | null;
  store: Store | null;
  loading: boolean;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem("user");
      const savedStore = localStorage.getItem("store");
      const savedTokens = localStorage.getItem("authTokens");

      console.log("🔄 Initialisation auth - User:", !!savedUser, "Tokens:", !!savedTokens);

      if (savedUser && savedTokens) {
        try {
          const userData: User = JSON.parse(savedUser);
          setUser(userData);
          console.log("✅ Utilisateur restauré:", userData.username);
          
          if (savedStore) {
            const storeData: Store = JSON.parse(savedStore);
            setStore(storeData);
            console.log("✅ Boutique restaurée:", storeData.name);
          }
        } catch (error) {
          console.error("❌ Erreur restauration auth:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("store");
          localStorage.removeItem("authTokens");
          setUser(null);
          setStore(null);
        }
      } else {
        setUser(null);
        setStore(null);
      }
      
      setLoading(false);
      console.log("🏁 Initialisation auth terminée");
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginData) => {
    try {
      setError(null);
      setLoading(true);
      console.log("🔐 Tentative de connexion avec:", credentials.username);
      
      // Appel API et récupération des tokens JWT
      const response = await authService.login(credentials);
      console.log("✅ Tokens JWT reçus");
      
      // Stocker les tokens dans le localStorage
      localStorage.setItem("authTokens", JSON.stringify(response));
      
      // Création des données utilisateur après connexion réussie
      const userData: User = {
        id: Date.now(),
        username: credentials.username,
        email: `${credentials.username}@example.com`,
        first_name: credentials.username,
        last_name: "",
        user_type: 0,
        phone: "",
        phone2: "",
        address: "",
        is_active: true,
        is_staff: false,
        is_superuser: false,
        full_name: "",
        date_joined: "",
        updated_at: "",
        role: "",
        permissions: undefined
      };
      
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      console.log("✅ Authentification réussie pour:", credentials.username);
      
    } catch (err: any) {
      // CORRECTION : Gestion spécifique des erreurs d'authentification
      let errorMessage = "Une erreur est survenue sur le serveur";
      
      // Si c'est une erreur 401 (mauvais mot de passe/nom d'utilisateur)
      if (err.response?.status === 401 || err.status === 401 || err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        errorMessage = "Unauthorized";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error("❌ Erreur:", err);
      setError(errorMessage);
      
      setUser(null);
      setStore(null);
      localStorage.removeItem("user");
      localStorage.removeItem("store");
      localStorage.removeItem("authTokens");
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setStore(null);
      setError(null);
      localStorage.removeItem("user");
      localStorage.removeItem("store");
      localStorage.removeItem("authTokens");
      setLoading(false);
      console.log("🚪 Déconnexion effectuée");
      
      window.location.href = '/login';
    }
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    store,
    loading,
    login,
    logout,
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