import React, { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ROUTES } from '@constants/routes';
import { api } from '@services/api';

export const Login: React.FC = () => {
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Effacer les erreurs au montage du composant
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Gérer les erreurs d'authentification
  useEffect(() => {
    if (error) {
      if (error.includes('401') || error.includes('Unauthorized')) {
        setFormError("⚠️ Nom d'utilisateur ou mot de passe incorrect");
      } else if (error.includes('Network Error') || error.includes('Failed to fetch')) {
        setFormError('⚠️ Le serveur est actuellement indisponible. Veuillez réessayer plus tard.');
      } else if (error.includes('500') || error.includes('Server')) {
        setFormError('⚠️ Problème de connexion internet. Veuillez vérifier votre connexion.');
      } else {
        setFormError('⚠️ Une erreur est survenue sur le serveur');
      }
    }
  }, [error]);

  // Rediriger si déjà authentifié
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // Fonction pour détecter le type d'utilisateur après login
  const detectUserType = async (userId: number): Promise<string> => {
    try {
      // Essayer de trouver dans quel profil l'utilisateur existe
      const endpoints = [
        `/api/owners/?user=${userId}`,
        `/api/shareholders/?user=${userId}`,
        `/api/customers/?user=${userId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await api.get(endpoint);
          if (response.data && response.data.length > 0) {
            // Déterminer le type depuis l'endpoint
            if (endpoint.includes('owners')) return 'owner';
            if (endpoint.includes('shareholders')) return 'shareholder';
            if (endpoint.includes('customers')) return 'customer';
          }
        } catch (err) {
          // Continuer avec l'endpoint suivant
          continue;
        }
      }
      
      return 'user'; // Type par défaut
    } catch (err) {
      console.error('Erreur détection type utilisateur:', err);
      return 'user';
    }
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError('');

    // Validation des champs
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setFormError('⚠️ Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Login standard
      const loginResponse = await login({
        username: credentials.username.trim(),
        password: credentials.password,
      });

      // 2. Récupérer l'ID utilisateur depuis la réponse
      const userId = loginResponse.user?.id || loginResponse.user_id;
      
      if (!userId) {
        // Si pas d'ID, redirection standard
        navigate(ROUTES.DASHBOARD);
        return;
      }

      // 3. Détecter le type d'utilisateur
      const userType = await detectUserType(userId);
      
      // 4. Rediriger selon le type
      switch(userType) {
        case 'owner':
          navigate(ROUTES.OWNER_DASHBOARD || ROUTES.DASHBOARD);
          break;
        case 'shareholder':
          navigate(ROUTES.SHAREHOLDER_DASHBOARD || ROUTES.DASHBOARD);
          break;
        case 'customer':
          navigate(ROUTES.CUSTOMER_DASHBOARD || ROUTES.DASHBOARD);
          break;
        default:
          navigate(ROUTES.DASHBOARD);
      }

    } catch (err: any) {
      const errorMessage = err?.message || 'Une erreur est survenue sur le serveur';
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setFormError("⚠️ Nom d'utilisateur ou mot de passe incorrect");
      } else if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NETWORK_ERROR')) {
        setFormError('⚠️ Le serveur est actuellement indisponible. Veuillez réessayer plus tard.');
      } else if (errorMessage.includes('500') || errorMessage.includes('Server') || errorMessage.includes('TIMEOUT')) {
        setFormError('⚠️ Problème de connexion internet. Veuillez vérifier votre connexion.');
      } else {
        setFormError(`⚠️ ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      
      {/* Carte principale */}
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        
        {/* Logo/Titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-600 text-2xl font-bold">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Connexion
          </h1>
          <p className="text-gray-600">
            Connectez-vous à votre compte
          </p>
        </div>

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Affichage des erreurs */}
          {formError && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{formError}</p>
              </div>
            </div>
          )}

          {/* Champ Email/Nom d'utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email ou Nom d'utilisateur
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="email@example.com ou username"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Votre mot de passe"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Connexion en cours...
              </div>
            ) : (
              'Se connecter'
            )}
          </button>

        </form>

        {/* Liens supplémentaires */}
        <div className="space-y-4 mt-8">
          
          {/* Lien mot de passe oublié */}
          <div className="text-center">
            <Link 
              to={ROUTES.FORGOT_PASSWORD} 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Lien création de compte */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Vous n'avez pas de compte ?{' '}
              <Link 
                to={ROUTES.REGISTER} 
                className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                S'inscrire
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;