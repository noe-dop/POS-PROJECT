import React, { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom'; // ← AJOUTER useNavigate

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate(); // ← AJOUTER pour la navigation

  const handleLogout = async () => {
    await logout();
    setIsDropdownOpen(false);
    navigate('/login');
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile'); // ← Navigation vers le profil
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-900">Boutique Manager</h1>
          <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            v1.0
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {user?.first_name && user?.last_name 
                ? `${user.first_name} ${user.last_name}`
                : user?.username
              }
            </p>
            <p className="text-xs text-gray-600 capitalize">
              {user?.user_type_name || 'Utilisateur'}
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <svg 
                className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                {/* Informations utilisateur */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}`
                      : user?.username
                    }
                  </p>
                  <p className="text-xs text-gray-600 truncate mt-1">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {user?.user_type_name || 'Utilisateur'}
                  </p>
                </div>

                {/* ✅ AJOUT DU LIEN PROFIL */}
                <button
                  onClick={handleProfileClick}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Mon Profil</span>
                </button>

                {/* ✅ AJOUT DU LIEN PARAMÈTRES (optionnel) */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Paramètres</span>
                </button>

                {/* Séparateur */}
                <div className="border-t border-gray-100 my-1"></div>

                {/* Bouton déconnexion */}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};