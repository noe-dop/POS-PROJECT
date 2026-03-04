// src/components/ui/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

// ✅ AJOUTEZ "export" DEVANT LA FONCTION !
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Chargement...' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-100 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};