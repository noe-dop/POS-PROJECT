import React from 'react';

export const TestEnv: React.FC = () => {
  return (
    <div className="p-4 bg-green-100 border border-green-400 rounded">
      <h3 className="font-bold">Test Variables d'Environnement</h3>
      <p>API URL: {import.meta.env.VITE_API_BASE_URL}</p>
      <p>App Name: {import.meta.env.VITE_APP_NAME}</p>
      <p>Mode: {import.meta.env.MODE}</p>
    </div>
  );
};