// src/pages/Subscriptions.tsx
import React, { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { PlanCard } from '../components/subscriptions/PlanCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate, getStatusLabel, getStatusColor } from '../utils/formatters';

const Subscriptions: React.FC = () => {
  const { user } = useAuth();
  // Récupération de l'ID de la boutique depuis l'utilisateur connecté
  // À adapter selon votre structure de données
  const storeId = user?.store?.id || 1;
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState<'plans' | 'current' | 'billing'>('plans');
  
  const {
    plans,
    subscription,
    invoices,
    limits,
    loading,
    error,
    subscribe,
    cancel,
    refresh
  } = useSubscription(storeId);

  if (loading) {
    return <LoadingSpinner message="Chargement des offres d'abonnement..." />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={refresh} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl mb-6">
            <div className="bg-white rounded-xl px-6 py-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Abonnements
              </span>
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choisissez le plan adapté à votre activité. Tous nos plans incluent 
            <span className="font-semibold text-blue-600"> 14 jours d'essai gratuit</span>.
          </p>
        </div>

        {/* Navigation par onglets */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'plans', label: '📋 Plans disponibles', count: plans.length },
              { id: 'current', label: '🔒 Mon abonnement', count: subscription ? 1 : 0 },
              { id: 'billing', label: '📄 Facturation', count: invoices.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  relative py-4 px-1 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`
                    absolute -top-1 -right-2 px-2 py-0.5 text-xs rounded-full
                    ${activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Onglet Plans */}
          {activeTab === 'plans' && (
            <div className="p-8">
              <div className="flex justify-center mb-12">
                <div className="bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`
                      px-6 py-3 rounded-lg font-medium transition-all
                      ${billingCycle === 'monthly'
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    Mensuel
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`
                      px-6 py-3 rounded-lg font-medium transition-all
                      ${billingCycle === 'yearly'
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    Annuel
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                      Économisez 20%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    billingCycle={billingCycle}
                    isCurrent={subscription?.plan?.id === plan.id}
                    onSelect={(planId) => subscribe(planId, billingCycle)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Onglet Abonnement actuel */}
          {activeTab === 'current' && subscription && (
            <div className="p-8">
              {/* Header avec statut */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{subscription.plan.name}</h2>
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-medium
                        ${getStatusColor(subscription.status)}
                      `}>
                        {getStatusLabel(subscription.status)}
                      </span>
                      {subscription.trial_end_date && new Date(subscription.trial_end_date) > new Date() && (
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">
                          Essai jusqu'au {formatDate(subscription.trial_end_date)}
                        </span>
                      )}
                    </div>
                    <p className="text-blue-100 mb-4">
                      Cycle de facturation: <span className="font-medium capitalize">{subscription.billing_cycle}</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-blue-200">Début</p>
                        <p className="font-medium">{formatDate(subscription.start_date)}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-blue-200">Fin</p>
                        <p className="font-medium">
                          {subscription.end_date ? formatDate(subscription.end_date) : 'Illimitée'}
                        </p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-blue-200">Prochaine facture</p>
                        <p className="font-medium">
                          {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-blue-200">Montant</p>
                        <p className="font-medium">
                          {formatCurrency(subscription.plan.price_monthly)}/mois
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Êtes-vous sûr de vouloir annuler votre abonnement ?')) {
                        cancel();
                      }
                    }}
                    className="mt-4 md:mt-0 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl font-medium transition-all"
                  >
                    Annuler l'abonnement
                  </button>
                </div>
              </div>

              {/* Limites d'utilisation */}
              {limits.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Utilisation des ressources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {limits.map(limit => {
                      const percentage = Math.min(100, (limit.current_usage / (limit.max_allowed || 1)) * 100);
                      return (
                        <div key={limit.id} className="bg-gray-50 rounded-xl p-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 capitalize font-medium">
                              {limit.resource_type === 'stores' ? 'Boutiques' :
                               limit.resource_type === 'employees' ? 'Employés' :
                               limit.resource_type === 'products' ? 'Produits' : 'Clients'}
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {limit.current_usage} / {limit.max_allowed === 999 ? '∞' : limit.max_allowed}
                            </span>
                          </div>
                          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`
                                h-full rounded-full transition-all duration-500
                                ${percentage >= 90 ? 'bg-red-500' : 
                                  percentage >= 70 ? 'bg-yellow-500' : 
                                  'bg-green-500'}
                              `}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Détails du plan et paiement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Détails du plan</h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Boutiques</span>
                      <span className="text-sm font-medium text-gray-900">
                        {subscription.plan.max_stores === 999 ? 'Illimité' : subscription.plan.max_stores}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Utilisateurs</span>
                      <span className="text-sm font-medium text-gray-900">
                        {subscription.plan.max_users === 999 ? 'Illimité' : subscription.plan.max_users}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Produits</span>
                      <span className="text-sm font-medium text-gray-900">
                        {subscription.plan.max_products === 99999 ? 'Illimité' : subscription.plan.max_products}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Analytics</span>
                      <span className="text-sm font-medium text-gray-900">
                        {subscription.plan.analytics ? 'Inclus' : 'Non inclus'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Support</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {subscription.plan.support_level}
                      </span>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Méthode de paiement</h4>
                  <dl className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Méthode</span>
                      <span className="text-sm font-medium text-gray-900">
                        {subscription.payment_method || 'Non définie'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <span className="text-sm text-gray-600">Renouvellement auto</span>
                      <span className={`text-sm font-medium ${subscription.auto_renew ? 'text-green-600' : 'text-red-600'}`}>
                        {subscription.auto_renew ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                    {subscription.last_billing_date && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                        <span className="text-sm text-gray-600">Dernier paiement</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(subscription.last_billing_date)}
                        </span>
                      </div>
                    )}
                  </dl>
                  <button className="mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
                    Modifier le mode de paiement
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Facturation */}
          {activeTab === 'billing' && (
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Historique des factures
              </h3>
              
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          N° Facture
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Période
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montant
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
                      {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(invoice.billing_period_start)} - {formatDate(invoice.billing_period_end)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.total_amount)}
                            {invoice.tax_amount > 0 && (
                              <span className="text-xs text-gray-500 block">
                                dont TVA {formatCurrency(invoice.tax_amount)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`
                              inline-flex px-2 py-1 text-xs font-medium rounded-full
                              ${getStatusColor(invoice.status)}
                            `}>
                              {getStatusLabel(invoice.status)}
                            </span>
                            {invoice.paid_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                le {formatDate(invoice.paid_at)}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {invoice.invoice_file ? (
                              <a
                                href={invoice.invoice_file}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Télécharger
                              </a>
                            ) : (
                              <span className="text-gray-400">Non disponible</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon="📄"
                  title="Aucune facture"
                  description="Les factures apparaîtront ici après votre premier paiement."
                />
              )}
            </div>
          )}

          {/* Message si pas d'abonnement dans l'onglet current */}
          {activeTab === 'current' && !subscription && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun abonnement actif</h3>
              <p className="text-gray-600 mb-6">
                Vous n'avez pas encore d'abonnement actif. Choisissez un plan pour commencer.
              </p>
              <button
                onClick={() => setActiveTab('plans')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Voir les plans
              </button>
            </div>
          )}
        </div>

        {/* Section FAQ */}
        <div className="mt-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Puis-je changer de plan à tout moment ?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Oui, vous pouvez passer à un plan supérieur à tout moment. La différence de prix sera proratisée.
                Pour les plans inférieurs, le changement prendra effet à la fin de votre cycle de facturation actuel.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Y a-t-il des frais de résiliation ?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Non, aucun frais de résiliation n'est appliqué. Vous pouvez annuler votre abonnement à tout moment
                et continuer à utiliser le service jusqu'à la fin de votre période de facturation.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Quels moyens de paiement acceptez-vous ?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Nous acceptons les cartes de crédit (Visa, MasterCard), les virements bancaires, 
                Wave, Orange Money et Moov Money.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Proposez-vous une période d'essai ?
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
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