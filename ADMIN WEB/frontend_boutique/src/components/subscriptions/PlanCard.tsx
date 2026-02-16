// src/components/subscriptions/PlanCard.tsx
import React from 'react';
import { SubscriptionPlan } from '../../types/subscription.types';
import { formatCurrency } from '../../utils/formatters';

interface PlanCardProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  isCurrent?: boolean;
  onSelect: (planId: number) => void;
}

// ✅ AJOUTEZ "export" DEVANT LA FONCTION !
export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  billingCycle,
  isCurrent,
  onSelect
}) => {
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const savings = billingCycle === 'yearly'
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0;

  return (
    <div className={`
      relative rounded-2xl border-2 p-8 transition-all hover:shadow-xl
      ${plan.is_popular ? 'border-blue-500 bg-gradient-to-b from-blue-50 to-white scale-105' : 'border-gray-200'}
      ${isCurrent ? 'ring-4 ring-blue-200' : ''}
    `}>
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
            ⭐ Plus populaire
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
            Actuel
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
        
        <div className="mb-2">
          <span className="text-4xl font-bold text-gray-900">
            {formatCurrency(price)}
          </span>
          <span className="text-gray-600 ml-1">
            /{billingCycle === 'monthly' ? 'mois' : 'an'}
          </span>
        </div>

        {savings > 0 && (
          <div className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            Économisez {savings}%
          </div>
        )}
      </div>

      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-gray-700 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent}
        className={`
          w-full py-3 px-4 rounded-xl font-medium transition-all
          ${isCurrent
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : plan.is_popular
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-900 text-white hover:bg-gray-800 shadow hover:shadow-lg'
          }
        `}
      >
        {isCurrent ? 'Plan actuel' : 'Souscrire'}
      </button>
    </div>
  );
};