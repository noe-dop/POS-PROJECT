// src/components/ui/ErrorAlert.tsx
import React from 'react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

// ✅ AJOUTEZ "export" DEVANT LA FONCTION !
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-10 h-10 text-red-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Une erreur est survenue
        </h3>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-medium hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};