import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { ROUTES } from '@constants/routes';

export const Login: React.FC = () => {
  const { login, isAuthenticated, loading, error, clearError } = useAuth();
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
      await login({
        username: credentials.username.trim(),
        password: credentials.password,
      });
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
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      
      {/* Carte principale */}
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        
        {/* Titre principal */}
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">
          Connexion
        </h1>

        {/* Sous-titre */}
        <p className="text-gray-600 text-center mb-8">
          Connectez-vous à votre compte pour continuer.
        </p>

        {/* Message d'information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="w-4 h-4 border border-gray-400 rounded mt-1 mr-3 flex-shrink-0"></div>
            <p className="text-sm text-gray-700">
              Veuillez saisir votre email et votre mot de passe pour vous connecter.
            </p>
          </div>
        </div>

        {/* Ligne séparatrice */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Affichage des erreurs */}
          {formError && (
            <div className="bg-red-50 border border-red-300 rounded-lg text-red-700 py-3 px-4 text-sm">
              {formError}
            </div>
          )}

          {/* Champ Email/Nom d'utilisateur */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email ou Nom d'utilisateur
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="email@example.com"
              required
              disabled={isLoading}
            />
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Votre mot de passe 😊"
              required
              disabled={isLoading}
            />
          </div>

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>

        </form>

        {/* Liens supplémentaires */}
        <div className="space-y-4 mt-8">
          
          {/* Lien mot de passe oublié */}
          <div className="text-center">
            <Link 
              to={ROUTES.FORGOT_PASSWORD} 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
            >
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