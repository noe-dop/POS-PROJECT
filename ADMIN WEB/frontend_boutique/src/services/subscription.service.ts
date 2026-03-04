// src/services/subscription.service.ts
import api from './api';
import { 
  SubscriptionPlan, 
  Subscription, 
  SubscriptionInvoice, 
  SubscriptionLimit,
  CreateSubscriptionDto,
  UpdateSubscriptionDto
} from '../types/subscription.types';

class SubscriptionService {
  private readonly BASE_URL = 'subscriptions';
  private readonly USE_MOCK = true; // ✅ PASSER À false QUAND LE BACKEND SERA PRÊT

  // ============= PLANS =============
  
  async getActivePlans(): Promise<SubscriptionPlan[]> {
    // ✅ MODE SIMULATION - À SUPPRIMER QUAND LE BACKEND SERA PRÊT
    if (this.USE_MOCK) {
      console.log('🧪 [SIMULATION] Chargement des plans');
      return this.getMockPlans();
    }

    try {
      const response = await api.get<SubscriptionPlan[]>(`${this.BASE_URL}/plans/`, {
        params: { is_active: true }
      });
      return response.sort((a, b) => a.sort_order - b.sort_order);
    } catch (error: any) {
      console.error('❌ Erreur chargement plans:', error);
      // ✅ Fallback sur les données simulées
      console.log('🧪 Fallback sur données simulées');
      return this.getMockPlans();
    }
  }

  async getStoreSubscription(storeId: number): Promise<Subscription | null> {
    // ✅ MODE SIMULATION - À SUPPRIMER QUAND LE BACKEND SERA PRÊT
    if (this.USE_MOCK) {
      console.log('🧪 [SIMULATION] Chargement abonnement pour boutique', storeId);
      const plans = await this.getMockPlans();
      return {
        id: 1,
        store: storeId,
        plan: plans[0],
        owner: 1,
        status: 'active',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        trial_end_date: null,
        cancelled_at: null,
        auto_renew: true,
        billing_cycle: 'monthly',
        payment_method: 'Carte bancaire',
        next_billing_date: '2024-12-31T00:00:00Z',
        last_billing_date: '2024-11-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        metadata: {}
      };
    }

    try {
      const subscriptions = await api.get<Subscription[]>(
        `${this.BASE_URL}/subscriptions/`,
        { 
          params: { 
            store: storeId, 
            status: ['active', 'trial', 'pending'] 
          } 
        }
      );
      return subscriptions[0] || null;
    } catch (error: any) {
      console.error('❌ Erreur chargement abonnement:', error);
      // ✅ Fallback sur les données simulées
      console.log('🧪 Fallback sur données simulées');
      const plans = await this.getMockPlans();
      return {
        id: 1,
        store: storeId,
        plan: plans[0],
        owner: 1,
        status: 'active',
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
        trial_end_date: null,
        cancelled_at: null,
        auto_renew: true,
        billing_cycle: 'monthly',
        payment_method: 'Carte bancaire',
        next_billing_date: '2024-12-31T00:00:00Z',
        last_billing_date: '2024-11-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
        metadata: {}
      };
    }
  }

  async createSubscription(data: CreateSubscriptionDto): Promise<Subscription> {
    // ✅ MODE SIMULATION
    if (this.USE_MOCK) {
      console.log('🧪 [SIMULATION] Création abonnement:', data);
      const plans = await this.getMockPlans();
      const plan = plans.find(p => p.id === data.plan_id) || plans[0];
      
      return {
        id: Date.now(),
        store: data.store_id,
        plan: plan,
        owner: 1,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        trial_end_date: null,
        cancelled_at: null,
        auto_renew: true,
        billing_cycle: data.billing_cycle,
        payment_method: 'Carte bancaire',
        next_billing_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        last_billing_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {}
      };
    }

    try {
      const response = await api.post<Subscription>(
        `${this.BASE_URL}/subscriptions/`, 
        data
      );
      return response;
    } catch (error: any) {
      console.error('❌ Erreur création abonnement:', error);
      throw new Error('Impossible de créer l\'abonnement');
    }
  }

  async cancelSubscription(id: number): Promise<void> {
    // ✅ MODE SIMULATION
    if (this.USE_MOCK) {
      console.log('🧪 [SIMULATION] Annulation abonnement', id);
      return;
    }

    try {
      await api.post(`${this.BASE_URL}/subscriptions/${id}/cancel/`);
    } catch (error: any) {
      console.error(`❌ Erreur annulation abonnement ${id}:`, error);
      throw new Error('Impossible d\'annuler l\'abonnement');
    }
  }

  async getSubscriptionInvoices(subscriptionId: number): Promise<SubscriptionInvoice[]> {
    // ✅ MODE SIMULATION
    if (this.USE_MOCK) {
      console.log('🧪 [SIMULATION] Chargement factures');
      return this.getMockInvoices(subscriptionId);
    }

    try {
      const invoices = await api.get<SubscriptionInvoice[]>(
        `${this.BASE_URL}/invoices/`,
        { params: { subscription: subscriptionId } }
      );
      return invoices.sort((a, b) => 
        new Date(b.billing_period_end).getTime() - new Date(a.billing_period_end).getTime()
      );
    } catch (error: any) {
      console.error('❌ Erreur chargement factures:', error);
      if (error.response?.status === 404) {
        return [];
      }
      return this.getMockInvoices(subscriptionId);
    }
  }

  async getSubscriptionLimits(subscriptionId: number): Promise<SubscriptionLimit[]> {
    // ✅ MODE SIMULATION
    if (this.USE_MOCK) {
      console.log('🧪 [SIMULATION] Chargement limites');
      return this.getMockLimits(subscriptionId);
    }

    try {
      return await api.get<SubscriptionLimit[]>(
        `${this.BASE_URL}/limits/`,
        { params: { subscription: subscriptionId } }
      );
    } catch (error: any) {
      console.error('❌ Erreur chargement limites:', error);
      if (error.response?.status === 404) {
        return [];
      }
      return this.getMockLimits(subscriptionId);
    }
  }

  // ============= DONNÉES SIMULÉES =============

  private getMockPlans(): SubscriptionPlan[] {
    return [
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
        is_popular: false,
        sort_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
        is_popular: true,
        sort_order: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
        is_popular: false,
        sort_order: 3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  private getMockInvoices(subscriptionId: number): SubscriptionInvoice[] {
    return [
      {
        id: 1,
        subscription: subscriptionId,
        invoice_number: "INV-2024-001",
        amount: 29.99,
        tax_amount: 6.00,
        total_amount: 35.99,
        billing_period_start: '2024-10-01T00:00:00Z',
        billing_period_end: '2024-10-31T23:59:59Z',
        status: 'paid',
        paid_at: '2024-10-01T10:30:00Z',
        payment_method: 'Carte bancaire',
        transaction_id: 'txn_123456',
        invoice_file: null,
        notes: '',
        created_at: '2024-10-01T10:30:00Z',
        updated_at: '2024-10-01T10:30:00Z'
      },
      {
        id: 2,
        subscription: subscriptionId,
        invoice_number: "INV-2024-002",
        amount: 29.99,
        tax_amount: 6.00,
        total_amount: 35.99,
        billing_period_start: '2024-11-01T00:00:00Z',
        billing_period_end: '2024-11-30T23:59:59Z',
        status: 'paid',
        paid_at: '2024-11-01T09:45:00Z',
        payment_method: 'Carte bancaire',
        transaction_id: 'txn_789012',
        invoice_file: null,
        notes: '',
        created_at: '2024-11-01T09:45:00Z',
        updated_at: '2024-11-01T09:45:00Z'
      }
    ];
  }

  private getMockLimits(subscriptionId: number): SubscriptionLimit[] {
    return [
      {
        id: 1,
        subscription: subscriptionId,
        resource_type: 'stores',
        current_usage: 1,
        max_allowed: 1,
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        subscription: subscriptionId,
        resource_type: 'employees',
        current_usage: 2,
        max_allowed: 2,
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        subscription: subscriptionId,
        resource_type: 'products',
        current_usage: 245,
        max_allowed: 500,
        updated_at: new Date().toISOString()
      }
    ];
  }
}

export const subscriptionService = new SubscriptionService();