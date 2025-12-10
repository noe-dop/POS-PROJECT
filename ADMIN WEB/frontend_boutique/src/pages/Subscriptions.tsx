// src/pages/Subscriptions.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import { useAuth } from '@hooks/useAuth';

// Types basés sur votre modèle Django
interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_stores: number;
  max_users: number;
  max_products: number;
  analytics: boolean;
  support_level: 'basic' | 'priority' | 'dedicated';
  is_active: boolean;
  is_popular: boolean;
}

interface CurrentSubscription {
  id: number;
  plan: SubscriptionPlan;
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  payment_method: string;
  next_billing_date: string;
}

interface BillingHistory {
  id: number;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  payment_method: string;
  billing_date: string;
  invoice_url: string;
}

const Subscriptions: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'plans' | 'current' | 'billing'>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Données simulées basées sur votre modèle
  const mockPlans: SubscriptionPlan[] = [
    {
      id: 1,
      name: "Starter",
      code: "starter",
      description: "Parfait pour les petites boutiques",
      price_monthly: 29.99,
      price_yearly: 299.99,
      currency: "EUR",
      features: [
        "1 boutique maximum",
        "2 utilisateurs",
        "500 produits",
        "Rapports de base",
        "Support par email",
        "Sauvegarde quotidienne"
      ],
      max_stores: 1,
      max_users: 2,
      max_products: 500,
      analytics: false,
      support_level: 'basic',
      is_active: true,
      is_popular: false
    },
    {
      id: 2,
      name: "Business",
      code: "business",
      description: "Idéal pour les boutiques en croissance",
      price_monthly: 79.99,
      price_yearly: 799.99,
      currency: "EUR",
      features: [
        "3 boutiques maximum",
        "5 utilisateurs",
        "5000 produits",
        "Analytics avancés",
        "Support prioritaire",
        "Sauvegarde horaire",
        "API d'intégration",
        "Formation en ligne"
      ],
      max_stores: 3,
      max_users: 5,
      max_products: 5000,
      analytics: true,
      support_level: 'priority',
      is_active: true,
      is_popular: true
    },
    {
      id: 3,
      name: "Enterprise",
      code: "enterprise",
      description: "Solution complète pour les grandes entreprises",
      price_monthly: 199.99,
      price_yearly: 1999.99,
      currency: "EUR",
      features: [
        "Boutiques illimitées",
        "Utilisateurs illimités",
        "Produits illimités",
        "Analytics temps réel",
        "Support dédié 24/7",
        "Sauvegarde en temps réel",
        "API complète",
        "Formation personnalisée",
        "Personnalisation avancée",
        "SLA garantie"
      ],
      max_stores: 999,
      max_users: 999,
      max_products: 99999,
      analytics: true,
      support_level: 'dedicated',
      is_active: true,
      is_popular: false
    }
  ];

  const mockCurrentSubscription: CurrentSubscription = {
    id: 1,
    plan: mockPlans[0],
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    auto_renew: true,
    payment_method: 'Carte bancaire',
    next_billing_date: '2024-12-31'
  };

  const mockBillingHistory: BillingHistory[] = [
    {
      id: 1,
      amount: 29.99,
      currency: "EUR",
      status: 'paid',
      payment_method: 'Carte bancaire',
      billing_date: '2024-11-01',
      invoice_url: '#'
    },
    {
      id: 2,
      amount: 29.99,
      currency: "EUR",
      status: 'paid',
      payment_method: 'Carte bancaire',
      billing_date: '2024-10-01',
      invoice_url: '#'
    }
  ];

  useEffect(() => {
    // Simulation du chargement des données
    setTimeout(() => {
      setPlans(mockPlans);
      setCurrentSubscription(mockCurrentSubscription);
      setBillingHistory(mockBillingHistory);
      setLoading(false);
    }, 1000);
  }, []);

  const handleSubscribe = (planId: number) => {
    setSelectedPlan(planId);
    // Ici, vous intégreriez votre logique de paiement
    console.log(`Souscription au plan ${planId} (${billingCycle})`);
  };

  const handleCancelSubscription = () => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
      // Logique d'annulation
      console.log('Abonnement annulé');
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    return billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (billingCycle === 'yearly') {
      const yearlyFromMonthly = plan.price_monthly * 12;
      const savings = yearlyFromMonthly - plan.price_yearly;
      return Math.round((savings / yearlyFromMonthly) * 100);
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des offres d'abonnement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Abonnements
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choisissez le plan qui correspond le mieux à vos besoins. 
            Tous nos plans incluent les fonctionnalités essentielles pour gérer votre boutique efficacement.
          </p>
        </div>

        {/* Navigation par onglets */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'plans', name: 'Plans disponibles', count: plans.length },
                { id: 'current', name: 'Mon abonnement', count: currentSubscription ? 1 : 0 },
                { id: 'billing', name: 'Historique de facturation', count: billingHistory.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count > 0 && (
                    <span className={`ml-2 py-0.5 px-2 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Plans disponibles */}
          {activeTab === 'plans' && (
            <div className="p-8">
              {/* Sélecteur de cycle de facturation */}
              <div className="flex justify-center mb-12">
                <div className="bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-md font-medium ${
                      billingCycle === 'monthly'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-6 py-2 rounded-md font-medium ${
                      billingCycle === 'yearly'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annuel
                    <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      Économisez jusqu'à 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Grille des plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border-2 p-8 ${
                      plan.is_popular
                        ? 'border-blue-500 bg-blue-50 transform scale-105'
                        : 'border-gray-200'
                    }`}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                          Plus populaire
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-600 mb-4">{plan.description}</p>
                      
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {getPrice(plan).toFixed(2)}€
                        </span>
                        <span className="text-gray-600">
                          /{billingCycle === 'monthly' ? 'mois' : 'an'}
                        </span>
                      </div>

                      {billingCycle === 'yearly' && getSavings(plan) > 0 && (
                        <div className="text-green-600 font-medium">
                          Économisez {getSavings(plan)}%
                        </div>
                      )}
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <svg className="h-5 w-5 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      className={`w-full py-3 px-4 rounded-lg font-medium ${
                        plan.is_popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {currentSubscription ? 'Changer de plan' : 'Commencer'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mon abonnement actuel */}
          {activeTab === 'current' && currentSubscription && (
            <div className="p-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {currentSubscription.plan.name}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Statut: <span className={`font-medium ${
                        currentSubscription.status === 'active' ? 'text-green-600' : 
                        currentSubscription.status === 'pending' ? 'text-yellow-600' : 
                        'text-red-600'
                      }`}>
                        {currentSubscription.status === 'active' ? 'Actif' : 
                         currentSubscription.status === 'pending' ? 'En attente' : 
                         'Annulé'}
                      </span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Début:</span>
                        <p className="font-medium">{new Date(currentSubscription.start_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Fin:</span>
                        <p className="font-medium">{new Date(currentSubscription.end_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Prochaine facturation:</span>
                        <p className="font-medium">{new Date(currentSubscription.next_billing_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <button
                      onClick={handleCancelSubscription}
                      className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
                    >
                      Annuler l'abonnement
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails du plan</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Boutiques:</span>
                        <span className="font-medium">{currentSubscription.plan.max_stores}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Utilisateurs:</span>
                        <span className="font-medium">{currentSubscription.plan.max_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Produits:</span>
                        <span className="font-medium">{currentSubscription.plan.max_products}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Analytics:</span>
                        <span className="font-medium">{currentSubscription.plan.analytics ? 'Inclus' : 'Non inclus'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Support:</span>
                        <span className="font-medium capitalize">{currentSubscription.plan.support_level}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Méthode de paiement</h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{currentSubscription.payment_method}</p>
                        <p className="text-sm text-gray-600">Renouvellement automatique: {currentSubscription.auto_renew ? 'Activé' : 'Désactivé'}</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 font-medium">
                        Modifier
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Historique de facturation */}
          {activeTab === 'billing' && (
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Historique des factures</h3>
              
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Méthode
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingHistory.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(invoice.billing_date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.amount.toFixed(2)} {invoice.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {invoice.payment_method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status === 'paid' ? 'Payé' : 
                             invoice.status === 'pending' ? 'En attente' : 'Échoué'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <a
                            href={invoice.invoice_url}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Télécharger
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {billingHistory.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune facture</h3>
                  <p className="mt-1 text-sm text-gray-500">Aucune facture n'a été générée pour le moment.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section FAQ */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Puis-je changer de plan à tout moment ?
              </h3>
              <p className="text-gray-600">
                Oui, vous pouvez passer à un plan supérieur à tout moment. La différence de prix sera proratisée.
                Pour les plans inférieurs, le changement prendra effet à la fin de votre cycle de facturation actuel.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Y a-t-il des frais de résiliation ?
              </h3>
              <p className="text-gray-600">
                Non, aucun frais de résiliation n'est appliqué. Vous pouvez annuler votre abonnement à tout moment
                et continuer à profiter des fonctionnalités jusqu'à la fin de votre période de facturation.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Quels moyens de paiement acceptez-vous ?
              </h3>
              <p className="text-gray-600">
                Nous acceptons les cartes de crédit (Visa, MasterCard), les virements bancaires, 
                et les portefeuilles électroniques (Wave, Orange Money, etc.).
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Proposez-vous une période d'essai ?
              </h3>
              <p className="text-gray-600">
                Oui, nous offrons une période d'essai de 14 jours pour tous nos plans.
                Aucune carte de crédit n'est requise pour commencer l'essai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;