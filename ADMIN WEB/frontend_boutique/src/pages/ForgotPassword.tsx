import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@constants/routes';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulation d'envoi d'email
    setTimeout(() => {
      setMessage('Un email de réinitialisation a été envoyé à votre adresse');
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mot de passe oublié</h1>
          <p className="text-gray-600 mt-2">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="votre@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-center">
            {message}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link 
            to={ROUTES.LOGIN} 
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;