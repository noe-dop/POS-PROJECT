import { api } from './api';
import { 
  SubscriptionPlan, 
  CurrentSubscription, 
  BillingHistory, 
  UsageStats,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  PaymentMethod,
  Invoice,
  PaymentIntent,
  Coupon
} from '../types/subscription';

class SubscriptionService {
  // Plans d'abonnement
  async getPlans(): Promise<SubscriptionPlan[]> {
    return await api.get<SubscriptionPlan[]>('/subscriptions/plans/');
  }

  async getPlanById(planId: number): Promise<SubscriptionPlan> {
    return await api.get<SubscriptionPlan>(`/subscriptions/plans/${planId}/`);
  }

  // Abonnement actuel
  async getCurrentSubscription(): Promise<CurrentSubscription | null> {
    try {
      return await api.get<CurrentSubscription>('/subscriptions/current/');
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createSubscription(payload: CreateSubscriptionPayload): Promise<CurrentSubscription> {
    return await api.post<CurrentSubscription>('/subscriptions/subscribe/', payload);
  }

  async updateSubscription(payload: UpdateSubscriptionPayload): Promise<CurrentSubscription> {
    return await api.patch<CurrentSubscription>('/subscriptions/current/', payload);
  }

  async cancelSubscription(): Promise<void> {
    await api.post('/subscriptions/cancel/');
  }

  async reactivateSubscription(): Promise<CurrentSubscription> {
    return await api.post<CurrentSubscription>('/subscriptions/reactivate/');
  }

  // Historique de facturation
  async getBillingHistory(page: number = 1, pageSize: number = 10): Promise<{
    results: BillingHistory[];
    count: number;
    next: string | null;
    previous: string | null;
  }> {
    return await api.getPaginated<BillingHistory>('/subscriptions/billing-history/', {
      page,
      page_size: pageSize
    });
  }

  async getInvoice(invoiceId: number): Promise<Invoice> {
    return await api.get<Invoice>(`/subscriptions/invoices/${invoiceId}/`);
  }

  async downloadInvoice(invoiceId: number): Promise<Blob> {
    const response = await api.getFullResponse(`/subscriptions/invoices/${invoiceId}/download/`);
    return response.data as Blob;
  }

  // Méthodes de paiement
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await api.get<PaymentMethod[]>('/subscriptions/payment-methods/');
  }

  async addPaymentMethod(token: string, isDefault: boolean = false): Promise<PaymentMethod> {
    return await api.post<PaymentMethod>('/subscriptions/payment-methods/', {
      payment_method_token: token,
      is_default: isDefault
    });
  }

  async setDefaultPaymentMethod(paymentMethodId: number): Promise<void> {
    await api.patch(`/subscriptions/payment-methods/${paymentMethodId}/set-default/`);
  }

  async removePaymentMethod(paymentMethodId: number): Promise<void> {
    await api.delete(`/subscriptions/payment-methods/${paymentMethodId}/`);
  }

  // Paiements et intentions de paiement
  async createPaymentIntent(amount: number, currency: string = 'eur'): Promise<PaymentIntent> {
    return await api.post<PaymentIntent>('/subscriptions/payment-intents/', {
      amount,
      currency
    });
  }

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId: string): Promise<any> {
    return await api.post(`/subscriptions/payment-intents/${paymentIntentId}/confirm/`, {
      payment_method: paymentMethodId
    });
  }

  async processPayment(amount: number, paymentMethodId: number, description?: string): Promise<any> {
    return await api.post('/subscriptions/payments/', {
      amount,
      payment_method: paymentMethodId,
      description
    });
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    return await api.get(`/subscriptions/payments/${paymentId}/status/`);
  }

  // Coupons et promotions
  async validateCoupon(code: string): Promise<Coupon> {
    return await api.post<Coupon>('/subscriptions/coupons/validate/', { code });
  }

  async getActiveCoupons(): Promise<Coupon[]> {
    return await api.get<Coupon[]>('/subscriptions/coupons/active/');
  }

  // Utilisation et limites
  async getUsageStats(): Promise<UsageStats> {
    return await api.get<UsageStats>('/subscriptions/usage/');
  }

  async checkStoreLimit(): Promise<{ can_create: boolean; reason?: string }> {
    return await api.get<{ can_create: boolean; reason?: string }>('/subscriptions/check-store-limit/');
  }

  async checkUserLimit(): Promise<{ can_create: boolean; reason?: string }> {
    return await api.get<{ can_create: boolean; reason?: string }>('/subscriptions/check-user-limit/');
  }

  // Webhooks (pour le frontend - notifications)
  async getSubscriptionNotifications(): Promise<any[]> {
    return await api.get<any[]>('/subscriptions/notifications/');
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await api.patch(`/subscriptions/notifications/${notificationId}/mark-read/`);
  }

  // Administration (pour les superusers)
  async getAllSubscriptions(params?: {
    status?: string;
    plan?: number;
    store?: number;
    page?: number;
  }): Promise<any> {
    return await api.getPaginated('/subscriptions/admin/subscriptions/', params);
  }

  async updateSubscriptionStatus(subscriptionId: number, status: string): Promise<any> {
    return await api.patch(`/subscriptions/admin/subscriptions/${subscriptionId}/`, {
      status
    });
  }

  // Statistiques et rapports
  async getSubscriptionStats(): Promise<{
    total_subscriptions: number;
    active_subscriptions: number;
    monthly_revenue: number;
    churn_rate: number;
  }> {
    return await api.get('/subscriptions/stats/');
  }

  // Essai gratuit
  async startFreeTrial(planId: number): Promise<CurrentSubscription> {
    return await api.post<CurrentSubscription>('/subscriptions/start-trial/', {
      plan_id: planId
    });
  }

  async cancelTrial(): Promise<void> {
    await api.post('/subscriptions/cancel-trial/');
  }
}

export default new SubscriptionService();