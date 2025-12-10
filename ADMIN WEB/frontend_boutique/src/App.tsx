import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@hooks/useAuth';
import Layout from '@components/layout/Layout';
import Login from '@pages/Login';
import Register from '@pages/Register';
import ForgotPassword from '@pages/ForgotPassword';
import Dashboard from '@pages/Dashboard';
import Employees from '@pages/Employees';
import Cashier from '@pages/Cashier';
import Store from '@/pages/Store';
import Products from '@pages/Products';
import Inventory from '@pages/Inventory';
import Supply from '@pages/Supply';
import Subscriptions from '@pages/Subscriptions';
import TypesProduits from '@pages/TypesProduits'; // IMPORT AJOUTÉ ICI
import { ROUTES } from '@constants/routes';

// Composants de pages temporaires (à développer)
const TemporaryPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="text-4xl mb-4">🚧</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">{title}</h1>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">
          🚧 Cette page est en cours de développement. Elle sera disponible prochainement.
        </p>
      </div>
      <div className="text-gray-600">
        <p className="mb-2">Nous travaillons dur pour vous offrir la meilleure expérience.</p>
        <p className="text-sm">Revenez bientôt pour découvrir cette fonctionnalité !</p>
      </div>
    </div>
  </div>
);

// Composant pour protéger les routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

// Composant pour les routes publiques
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.DASHBOARD} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route 
        path={ROUTES.LOGIN} 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      
      <Route 
        path={ROUTES.REGISTER}
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />
      
      <Route 
        path={ROUTES.FORGOT_PASSWORD}
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } 
      />
      
      {/* Routes protégées */}
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - route index */}
        <Route index element={<Dashboard />} />
        
        {/* Routes principales */}
        <Route path={ROUTES.SHOPS.replace('/', '')} element={<Store />} />
        <Route path={ROUTES.CASHIER.replace('/', '')} element={<Cashier />} />
        <Route path={ROUTES.EMPLOYEES.replace('/', '')} element={<Employees />} />
        <Route path={ROUTES.PRODUCTS.replace('/', '')} element={<Products />} />
        <Route path={ROUTES.INVENTORY.replace('/', '')} element={<Inventory />} />
        <Route path={ROUTES.SUPPLY.replace('/', '')} element={<Supply />} />
        <Route path={ROUTES.STATISTICS.replace('/', '')} element={<TemporaryPage title="Statistiques" />} />
        <Route path={ROUTES.SUBSCRIPTIONS.replace('/', '')} element={<Subscriptions />} />
        <Route path={ROUTES.STOCK.replace('/', '')} element={<TemporaryPage title="Stock" />} />
        <Route path={ROUTES.TYPES_PRODUITS.replace('/', '')} element={<TypesProduits />} /> {/* ROUTE AJOUTÉE ICI */}
        
        {/* Routes des paramètres */}
        <Route path={ROUTES.SETTINGS.replace('/', '')}>
          <Route index element={<Navigate to={ROUTES.SETTINGS_PROFILE} replace />} />
          <Route path={ROUTES.SETTINGS_PROFILE.replace('/settings/', '')} element={<TemporaryPage title="Profil Utilisateur" />} />
          <Route path={ROUTES.SETTINGS_ACCOUNT.replace('/settings/', '')} element={<TemporaryPage title="Paramètres du Compte" />} />
          <Route path={ROUTES.SETTINGS_PAYMENTS.replace('/settings/', '')} element={<TemporaryPage title="Paiements et Facturation" />} />
          <Route path={ROUTES.SETTINGS_SECURITY.replace('/settings/', '')} element={<TemporaryPage title="Sécurité et Confidentialité" />} />
        </Route>

        {/* Routes de compatibilité avec redirections */}
        <Route path={ROUTES.SALES.replace('/', '')} element={<Navigate to={ROUTES.CASHIER} replace />} />
        <Route path={ROUTES.CUSTOMERS.replace('/', '')} element={<Navigate to={ROUTES.DASHBOARD} replace />} />
        <Route path={ROUTES.SUPPLIERS.replace('/', '')} element={<Navigate to={ROUTES.SUPPLY} replace />} />
        <Route path={ROUTES.REPORTS.replace('/', '')} element={<Navigate to={ROUTES.STATISTICS} replace />} />
        <Route path={ROUTES.PROFILE.replace('/', '')} element={<Navigate to={ROUTES.SETTINGS_PROFILE} replace />} />
        
        {/* Ancienne route settings redirigée vers le profil */}
        <Route path="settings-old" element={<Navigate to={ROUTES.SETTINGS_PROFILE} replace />} />
      </Route>

      {/* Redirections globales */}
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="/dashboard" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      
      {/* Catch-all route - redirection vers le dashboard */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;