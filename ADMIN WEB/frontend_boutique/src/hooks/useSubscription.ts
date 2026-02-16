// src/hooks/useSubscription.ts
import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/subscription.service';
import { 
  SubscriptionPlan, 
  Subscription, 
  SubscriptionInvoice, 
  SubscriptionLimit 
} from '../types/subscription.types';
import { useToast } from './useToast';
import { useAuth } from './useAuth';

export const useSubscription = (storeId?: number) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [limits, setLimits] = useState<SubscriptionLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Charger les plans
  const loadPlans = useCallback(async () => {
    try {
      console.log('📡 Chargement des plans...');
      const data = await subscriptionService.getActivePlans();
      console.log('✅ Plans chargés:', data.length);
      setPlans(data);
    } catch (err: any) {
      console.error('❌ Erreur chargement plans:', err);
      setError(err.message || 'Impossible de charger les plans');
    }
  }, []);

  // Charger l'abonnement
  const loadSubscription = useCallback(async () => {
    if (!storeId) {
      console.log('⚠️ Pas de storeId, skip chargement abonnement');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`📡 Chargement abonnement pour boutique ${storeId}...`);
      const data = await subscriptionService.getStoreSubscription(storeId);
      console.log('✅ Abonnement chargé:', data ? 'Actif' : 'Aucun');
      setSubscription(data);
      
      if (data) {
        // Charger les factures et limites en parallèle
        try {
          const [invoicesData, limitsData] = await Promise.all([
            subscriptionService.getSubscriptionInvoices(data.id),
            subscriptionService.getSubscriptionLimits(data.id)
          ]);
          console.log(`✅ ${invoicesData.length} factures chargées`);
          console.log(`✅ ${limitsData.length} limites chargées`);
          setInvoices(invoicesData);
          setLimits(limitsData);
        } catch (err) {
          console.error('❌ Erreur chargement données associées:', err);
          // Non bloquant, on continue
        }
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement abonnement:', err);
      setError(err.message || 'Impossible de charger votre abonnement');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Souscrire à un plan
  const subscribe = useCallback(async (
    planId: number,
    billingCycle: 'monthly' | 'yearly'
  ) => {
    if (!storeId) {
      showToast({
        title: 'Erreur',
        description: 'Boutique non identifiée',
        type: 'error',
        duration: 5000
      });
      throw new Error('Store ID requis');
    }

    try {
      console.log(`📤 Souscription au plan ${planId} (${billingCycle})`);
      
      const newSubscription = await subscriptionService.createSubscription({
        plan_id: planId,
        billing_cycle: billingCycle,
        store_id: storeId
      });
      
      console.log('✅ Nouvel abonnement créé:', newSubscription);
      setSubscription(newSubscription);
      
      showToast({
        title: 'Succès',
        description: 'Abonnement souscrit avec succès',
        type: 'success',
        duration: 5000
      });
      
      // Recharger les factures et limites
      if (newSubscription) {
        const [invoicesData, limitsData] = await Promise.all([
          subscriptionService.getSubscriptionInvoices(newSubscription.id),
          subscriptionService.getSubscriptionLimits(newSubscription.id)
        ]);
        setInvoices(invoicesData);
        setLimits(limitsData);
      }
      
      return newSubscription;
    } catch (err: any) {
      console.error('❌ Erreur souscription:', err);
      showToast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de la souscription',
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  }, [storeId, showToast]);

  // Annuler l'abonnement
  const cancel = useCallback(async () => {
    if (!subscription) {
      console.warn('⚠️ Pas d\'abonnement à annuler');
      return;
    }
    
    try {
      console.log(`📤 Annulation abonnement ${subscription.id}...`);
      await subscriptionService.cancelSubscription(subscription.id);
      
      // Mettre à jour l'état local
      setSubscription(prev => prev ? {
        ...prev,
        status: 'cancelled',
        auto_renew: false,
        cancelled_at: new Date().toISOString()
      } : null);
      
      console.log('✅ Abonnement annulé');
      showToast({
        title: 'Succès',
        description: 'Abonnement annulé avec succès',
        type: 'success',
        duration: 5000
      });
    } catch (err: any) {
      console.error('❌ Erreur annulation:', err);
      showToast({
        title: 'Erreur',
        description: err.message || 'Erreur lors de l\'annulation',
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  }, [subscription, showToast]);

  // Changer de plan
  const changePlan = useCallback(async (
    planId: number,
    billingCycle?: 'monthly' | 'yearly'
  ) => {
    if (!subscription) {
      return subscribe(planId, billingCycle || 'monthly');
    }
    
    try {
      console.log(`📤 Changement de plan vers ${planId}...`);
      
      const updateData: any = { plan_id: planId };
      if (billingCycle) {
        updateData.billing_cycle = billingCycle;
      }
      
      const updatedSubscription = await subscriptionService.updateSubscription(
        subscription.id,
        updateData
      );
      
      console.log('✅ Plan changé:', updatedSubscription);
      setSubscription(updatedSubscription);
      
      showToast({
        title: 'Succès',
        description: 'Plan changé avec succès',
        type: 'success',
        duration: 5000
      });
      
      return updatedSubscription;
    } catch (err: any) {
      console.error('❌ Erreur changement de plan:', err);
      showToast({
        title: 'Erreur',
        description: err.message || 'Erreur lors du changement de plan',
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  }, [subscription, subscribe, showToast]);

  // Rafraîchir les données
  const refresh = useCallback(async () => {
    console.log('🔄 Rafraîchissement des données...');
    setLoading(true);
    setError(null);
    await loadPlans();
    await loadSubscription();
  }, [loadPlans, loadSubscription]);

  // Initialisation
  useEffect(() => {
    refresh();
  }, []);

  return {
    plans,
    subscription,
    invoices,
    limits,
    loading,
    error,
    subscribe,
    cancel,
    changePlan,
    refresh
  };
};