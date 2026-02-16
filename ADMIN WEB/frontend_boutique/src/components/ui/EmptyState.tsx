// src/components/ui/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

// ✅ AJOUTEZ "export" DEVANT LA FONCTION !
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
};