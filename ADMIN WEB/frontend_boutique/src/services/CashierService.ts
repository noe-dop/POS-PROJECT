// src/services/CashierService.ts
import { apiService } from './api';

// Interfaces (conservées telles quelles)
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone2: string;
  address: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface Customer {
  id: number;
  user: User;
  loyalty_points: number;
  total_spent: number;
  first_purchase_date: string;
  last_purchase_date: string;
  preferred_store: number;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parent: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductVariant {
  id: number;
  name: string;
  barcode: string;
  prix_vente: number;
  prix_reduction: number;
  cost_price: number;
  quantity: number;
  weight: number;
  selection: boolean;
  photo: string | null;
  product: number;
}

export interface StoreProduct {
  id: number;
  store: number;
  product: number;
  store_base_price: number;
  store_compare_price: number;
  store_cost_price: number;
  quantity: number;
  min_stock: number;
  max_stock: number;
  is_active: boolean;
  dlv: string | null;
  dlc: string | null;
  dcr: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  cost_price: number;
  base_price: number;
  compare_at_price: number;
  category: Category;
  brand: any | null;
  supplier: any;
  variants: ProductVariant[];
  store_products: StoreProduct[];
  photo: string | null;
  additional_images: string[];
  status: string;
  qt_item: number;
  jour_ecart: number;
  is_active: boolean;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  requires_reference: boolean;
  requires_amount: boolean;
  fee_percentage: number;
  category: string;
}

export interface CashRegister {
  id: number;
  name: string;
  code: string;
  location: string;
  store: number;
  store_name: string;
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  active_sessions: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: number;
  ticket_number: string;
  total_amount: number;
  created_at: string;
}

export interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  cashAmount: number;
  cardAmount: number;
  mobileMoneyAmount: number;
  totalTransactions: number;
  averageTicket: number;
  startDate: string;
  endDate: string;
}

export interface CashWithdrawal {
  id?: number;
  amount: number;
  reason: string;
  cash_register_id?: number;
  employee_id: number;
  created_at?: string;
}

export interface CashClosureRequest {
  cash_register_id?: number;
  employee_id: number;
  theoretical_cash: number;
  counted_cash: number;
  discrepancy: number;
  cash_breakdown: { [denomination: string]: number };
  comments: string;
  total_sales: number;
  total_transactions: number;
  session_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface CashClosure {
  id: number;
  cash_register: number;
  employee: number;
  theoretical_cash: number;
  counted_cash: number;
  discrepancy: number;
  cash_breakdown: { [denomination: string]: number };
  comments: string;
  total_sales: number;
  total_transactions: number;
  status: 'pending' | 'completed' | 'verified';
  created_at: string;
  verified_by?: number;
  verified_at?: string;
}

class CashierService {
  private currentStoreId: number = 1;
  private currentEmployeeId: number = 1;
  private currentCashRegister: CashRegister | null = null;
  private cache: Map<string, any> = new Map();

  // === METHODES DE BASE ===

  setCurrentStoreId(storeId: number) {
    this.currentStoreId = storeId;
    this.clearCache();
  }

  setCurrentEmployeeId(employeeId: number) {
    this.currentEmployeeId = employeeId;
  }

  getCurrentStoreId(): number {
    return this.currentStoreId;
  }

  getCurrentEmployeeId(): number {
    return this.currentEmployeeId;
  }

  // === GESTION DU CACHE ===

  private getCacheKey(endpoint: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}_${paramString}`;
  }

  private setCache(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache(): void {
    this.cache.clear();
    this.currentCashRegister = null;
  }

  // === PRODUITS ===

  async getProducts(storeId?: number, category?: string, search?: string): Promise<Product[]> {
    const cacheKey = this.getCacheKey('products', { storeId, category, search });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const params: any = {};
      const targetStoreId = storeId || this.currentStoreId;
      
      if (targetStoreId) params.store = targetStoreId;
      if (search) params.search = search;

      console.log('🛒 Chargement produits avec params:', params);

      const response = await apiService.get('/products/', { params });
      
      let products: any[] = [];
      
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data?.results) {
        products = response.data.results;
      } else if (response.data) {
        products = [response.data];
      }

      const formattedProducts = products.map(product => this.formatProduct(product));
      
      // Filtrer par catégorie côté client
      let filteredProducts = formattedProducts;
      if (category && category !== 'Tous') {
        filteredProducts = formattedProducts.filter(p => 
          p.category?.name === category || p.category?.id?.toString() === category
        );
      }
      
      this.setCache(cacheKey, filteredProducts, 60000);
      
      console.log(`✅ ${filteredProducts.length} produits chargés`);
      return filteredProducts;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement produits:', error);
      throw error;
    }
  }

  private formatProduct(productData: any): Product {
    const variants = Array.isArray(productData.variants) ? productData.variants : [];
    if (variants.length === 0) {
      variants.push({
        id: productData.id * 1000,
        name: 'Standard',
        barcode: productData.sku || `BAR-${productData.id}`,
        prix_vente: productData.base_price || 0,
        prix_reduction: productData.compare_at_price || 0,
        cost_price: productData.cost_price || 0,
        quantity: productData.quantity || 0,
        weight: 0,
        selection: true,
        photo: productData.photo,
        product: productData.id
      });
    }

    let storeProducts: StoreProduct[] = [];
    if (Array.isArray(productData.store_products)) {
      storeProducts = productData.store_products;
    } else {
      storeProducts = [{
        id: productData.id,
        store: this.currentStoreId,
        product: productData.id,
        store_base_price: productData.base_price || 0,
        store_compare_price: productData.compare_at_price || 0,
        store_cost_price: productData.cost_price || 0,
        quantity: productData.quantity || 10,
        min_stock: 5,
        max_stock: 100,
        is_active: true,
        dlv: null,
        dlc: null,
        dcr: null
      }];
    }

    return {
      id: productData.id || 0,
      name: productData.name || 'Produit sans nom',
      description: productData.description || '',
      sku: productData.sku || `SKU-${productData.id}`,
      cost_price: productData.cost_price || 0,
      base_price: productData.base_price || 0,
      compare_at_price: productData.compare_at_price || 0,
      category: productData.category ? {
        id: productData.category.id,
        name: productData.category.name,
        slug: productData.category.slug,
        description: productData.category.description || '',
        image: productData.category.image,
        parent: productData.category.parent,
        sort_order: productData.category.sort_order || 0,
        is_active: productData.category.is_active !== false
      } : {
        id: 0,
        name: 'Non catégorisé',
        slug: 'non-categorise',
        description: '',
        image: null,
        parent: null,
        sort_order: 0,
        is_active: true
      },
      brand: productData.brand || null,
      supplier: productData.supplier || null,
      variants: variants,
      store_products: storeProducts,
      photo: productData.photo,
      additional_images: productData.additional_images || [],
      status: productData.status || 'active',
      qt_item: productData.qt_item || 1,
      jour_ecart: productData.jour_ecart || 0,
      is_active: productData.is_active !== false
    };
  }

  // === CATEGORIES ===

  async getCategories(storeId?: number): Promise<Category[]> {
    const cacheKey = this.getCacheKey('categories', { storeId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const params: any = {};
      const targetStoreId = storeId || this.currentStoreId;
      if (targetStoreId) params.store = targetStoreId;

      const response = await apiService.get('/categories/', { params });
      
      let categories: any[] = [];
      
      if (Array.isArray(response.data)) {
        categories = response.data;
      } else if (response.data?.results) {
        categories = response.data.results;
      }

      this.setCache(cacheKey, categories, 300000);
      return categories;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement catégories:', error);
      throw error;
    }
  }

  // === METHODES DE PAIEMENT ===

  async getPaymentMethods(storeId?: number): Promise<PaymentMethod[]> {
    const cacheKey = this.getCacheKey('payment_methods', { storeId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const params: any = {};
      const targetStoreId = storeId || this.currentStoreId;
      if (targetStoreId) params.store = targetStoreId;

      const response = await apiService.get('/payment-methods/', { params });
      
      let methods: any[] = [];
      
      if (Array.isArray(response.data)) {
        methods = response.data;
      } else if (response.data?.results) {
        methods = response.data.results;
      }

      this.setCache(cacheKey, methods, 300000);
      return methods;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement méthodes paiement:', error);
      throw error;
    }
  }

  // === CAISSES - CORRECTION POUR LE CAS "0 CAISSES" ===

  async getCashRegisters(storeId?: number): Promise<CashRegister[]> {
    const cacheKey = this.getCacheKey('caisses', { storeId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      console.log('🔄 Chargement caisses');
      const response = await apiService.get('/caisses/');
      
      let registers: any[] = [];
      
      if (Array.isArray(response.data)) {
        registers = response.data;
      } else if (response.data?.results) {
        registers = response.data.results;
      }

      const targetStoreId = storeId || this.currentStoreId;
      
      // Filtrer manuellement par store
      if (targetStoreId && registers.length > 0) {
        registers = registers.filter(r => r.store === targetStoreId);
      }

      // 🔥 SOLUTION : Créer une caisse simulée si aucune n'existe
      if (registers.length === 0) {
        console.log('⚠️ AUCUNE CAISSE TROUVÉE - Création d\'une caisse simulée pour le développement');
        
        const mockRegister: CashRegister = {
          id: 1,
          name: 'Caisse Principale (Développement)',
          code: 'CAISSE-DEV-001',
          location: 'Mode développement',
          store: targetStoreId,
          store_name: 'Magasin de Développement',
          is_active: true,
          opening_balance: 100000,
          current_balance: 100000,
          active_sessions: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        registers = [mockRegister];
        console.log('✅ Caisse simulée créée avec ID:', mockRegister.id);
      }

      if (registers.length > 0 && !this.currentCashRegister) {
        this.currentCashRegister = registers[0];
        console.log('🎯 Caisse courante définie:', this.currentCashRegister.name);
      }

      this.setCache(cacheKey, registers, 60000);
      console.log(`✅ ${registers.length} caisses chargées`);
      return registers;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement caisses:', error);
      
      // 🔥 En cas d'erreur API, créer aussi une caisse simulée
      console.log('⚠️ ERREUR API - Création d\'une caisse simulée de secours');
      
      const targetStoreId = storeId || this.currentStoreId;
      const mockRegister: CashRegister = {
        id: 1,
        name: 'Caisse de Secours',
        code: 'CAISSE-SECOURS-001',
        location: 'Mode secours',
        store: targetStoreId,
        store_name: 'Magasin de Secours',
        is_active: true,
        opening_balance: 50000,
        current_balance: 50000,
        active_sessions: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.currentCashRegister = mockRegister;
      return [mockRegister];
    }
  }

  async getCurrentCashRegister(): Promise<CashRegister | null> {
    if (this.currentCashRegister) {
      return this.currentCashRegister;
    }
    
    try {
      const registers = await this.getCashRegisters();
      return registers.length > 0 ? registers[0] : null;
    } catch (error) {
      console.error('❌ Erreur récupération caisse courante:', error);
      return null;
    }
  }

  // === SESSIONS DE CAISSE - CORRECTION POUR UTILISER LA CAISSE SIMULÉE ===

  async startCashSession(cashRegisterId: number): Promise<{ session_id: string }> {
    try {
      console.log(`🎫 Démarrage session pour caisse ${cashRegisterId}`);
      
      const sessionData = {
        cash_register: cashRegisterId,
        employee: this.currentEmployeeId,
        opening_balance: 0,
        opening_date: new Date().toISOString(),
        status: 'open'
      };

      console.log('📤 Données session:', sessionData);
      
      const response = await apiService.post('/cash-sessions/', sessionData);
      
      console.log('✅ Session de caisse démarrée:', response.data);
      return { session_id: response.data.id || response.data.session_id };
      
    } catch (error: any) {
      console.error('❌ Erreur démarrage session:', error);
      
      // 🔥 Session simulée en cas d'erreur
      const mockSessionId = `session_dev_${Date.now()}`;
      console.log('🔄 Session de développement créée:', mockSessionId);
      
      return { session_id: mockSessionId };
    }
  }

  // === VENTES ===

  async processSale(saleData: {
    cart: CartItem[];
    customerId: number | null;
    payments: Array<{
      payment_method_id: number;
      amount: number;
      transaction_reference?: string;
    }>;
    cash_register_id: number;
    cash_session_id: string;
  }): Promise<Sale> {
    try {
      const subtotal = saleData.cart.reduce((sum, item) => sum + item.line_total, 0);
      const taxAmount = subtotal * 0.20;
      const totalAmount = subtotal + taxAmount;

      const requestData = {
        ticket_number: `TICKET-${Date.now()}`,
        store: this.currentStoreId,
        employe: this.currentEmployeeId,
        caisse: saleData.cash_register_id,
        session: saleData.cash_session_id,
        client: saleData.customerId,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        statut: 'completed',
        items: saleData.cart.map(item => ({
          product: item.product.id,
          variant: item.variant?.id || null,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price.toFixed(2)),
          line_total: parseFloat(item.line_total.toFixed(2))
        })),
        paiements: saleData.payments.map(payment => ({
          methode_paiement: payment.payment_method_id,
          montant: parseFloat(payment.amount.toFixed(2)),
          reference_transaction: payment.transaction_reference || ''
        }))
      };

      console.log('💰 Envoi vente:', requestData);

      const response = await apiService.post('/sales/', requestData);
      
      console.log('✅ Vente enregistrée:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur traitement vente:', error);
      throw error;
    }
  }

  // === CLIENTS ===

  async searchCustomers(query: string, storeId?: number): Promise<Customer[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const cacheKey = this.getCacheKey('customers_search', { query, storeId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const params: any = { search: query };
      const targetStoreId = storeId || this.currentStoreId;
      if (targetStoreId) params.store = targetStoreId;

      const response = await apiService.get('/customers/', { params });
      
      let customers: any[] = [];
      
      if (Array.isArray(response.data)) {
        customers = response.data;
      } else if (response.data?.results) {
        customers = response.data.results;
      }

      this.setCache(cacheKey, customers, 30000);
      return customers;
      
    } catch (error: any) {
      console.error('❌ Erreur recherche clients:', error);
      throw error;
    }
  }

  // === SCAN CODE-BARRES ===

  async scanBarcode(barcode: string, storeId: number): Promise<{
    success: boolean;
    product: Product | null;
    variant: ProductVariant | null;
    message: string;
  }> {
    if (!barcode.trim()) {
      return {
        success: false,
        product: null,
        variant: null,
        message: 'Code-barres vide'
      };
    }

    try {
      console.log('🔍 Scan code-barres:', barcode);
      
      const params: any = { barcode, store: storeId };
      const response = await apiService.get('/products/', { params });
      
      const products = response.data.results || response.data;
      
      if (products.length === 0) {
        return {
          success: false,
          product: null,
          variant: null,
          message: 'Aucun produit trouvé avec ce code-barres'
        };
      }

      const product = this.formatProduct(products[0]);
      
      // Chercher la variante correspondante
      const variant = product.variants.find(v => v.barcode === barcode) || product.variants[0];
      
      return {
        success: true,
        product,
        variant,
        message: 'Produit trouvé'
      };
      
    } catch (error: any) {
      console.error('❌ Erreur scan:', error);
      return {
        success: false,
        product: null,
        variant: null,
        message: 'Erreur lors du scan'
      };
    }
  }

  // === RÉCAPITULATIF QUOTIDIEN ===

  async getDailySummary(storeId?: number, date?: string): Promise<DailySummary> {
    try {
      const targetStoreId = storeId || this.currentStoreId;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const params = {
        store: targetStoreId,
        date: targetDate
      };

      console.log(`📊 Chargement récapitulatif avec: /stats/daily-sales/`, params);
      const response = await apiService.get('/stats/daily-sales/', { params });
      
      return this.formatDailySummary(response.data);
      
    } catch (error: any) {
      console.error('❌ Erreur récupération récapitulatif:', error);
      return this.getEmptyDailySummary(date || new Date().toISOString().split('T')[0]);
    }
  }

  private formatDailySummary(data: any): DailySummary {
    return {
      totalSales: data.total_sales || data.totalSales || 0,
      totalRevenue: data.total_revenue || data.totalRevenue || 0,
      cashAmount: data.cash_amount || data.cashAmount || 0,
      cardAmount: data.card_amount || data.cardAmount || 0,
      mobileMoneyAmount: data.mobile_money_amount || data.mobileMoneyAmount || 0,
      totalTransactions: data.total_transactions || data.totalTransactions || 0,
      averageTicket: data.average_ticket || data.averageTicket || 0,
      startDate: data.start_date || data.startDate || new Date().toISOString(),
      endDate: data.end_date || data.endDate || new Date().toISOString()
    };
  }

  private getEmptyDailySummary(date: string): DailySummary {
    return {
      totalSales: 0,
      totalRevenue: 0,
      cashAmount: 0,
      cardAmount: 0,
      mobileMoneyAmount: 0,
      totalTransactions: 0,
      averageTicket: 0,
      startDate: `${date}T00:00:00.000Z`,
      endDate: `${date}T23:59:59.999Z`
    };
  }

  // === RETRAITS ===

  async recordCashWithdrawal(
    withdrawal: CashWithdrawal, 
    sessionId?: string | number
  ): Promise<CashWithdrawal> {
    try {
      // Générer une référence unique
      const reference = `WITHDRAWAL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const withdrawalData = {
        transaction_type: 'withdrawal',
        amount: withdrawal.amount,
        reason: withdrawal.reason,
        cash_register: withdrawal.cash_register_id,
        employee: withdrawal.employee_id,
        store: this.currentStoreId,
        reference: reference,
        session: sessionId || 1
      };

      console.log('💰 Enregistrement retrait:', withdrawalData);
      
      const response = await apiService.post('/cash-transactions/', withdrawalData);
      
      // Invalider le cache du récapitulatif
      this.cache.delete(this.getCacheKey('daily_summary', { storeId: this.currentStoreId }));
      
      console.log('✅ Retrait enregistré avec succès:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ Erreur enregistrement retrait:', error);
      
      if (error.response?.data) {
        console.error('📋 Détails de l\'erreur:', error.response.data);
      }
      
      throw error;
    }
  }

  // === CLÔTURE DE CAISSE ===

  async finalizeCashClosure(closureData: CashClosureRequest): Promise<CashClosure> {
    try {
      console.log('🔒 Finalisation clôture avec données:', closureData);

      // Essayer différents endpoints possibles
      const endpoints = [
        '/cash-closures/',
        '/clotures-caisse/',
        '/cash-sessions/close/'
      ];

      const completeClosureData = {
        ...closureData,
        store: this.currentStoreId,
        status: 'completed',
        session: closureData.session_id
      };

      for (const endpoint of endpoints) {
        try {
          console.log(`🔒 Tentative clôture avec: ${endpoint}`);
          const response = await apiService.post(endpoint, completeClosureData);
          
          this.clearCache();
          console.log('✅ Clôture réussie avec:', endpoint);
          return response.data;
        } catch (e: any) {
          console.log(`❌ Échec avec ${endpoint}:`, e.response?.status || e.message);
        }
      }

      throw new Error('La fonctionnalité de clôture de caisse n\'est pas encore disponible sur le serveur');
      
    } catch (error: any) {
      console.error('❌ Erreur finalisation clôture:', error);
      throw error;
    }
  }

  // === METHODES UTILITAIRES ===

  calculateFinalPrice(product: Product, variant: ProductVariant | null, storeId: number): number {
    if (variant?.prix_reduction && variant.prix_reduction > 0) {
      return variant.prix_reduction;
    }
    
    if (variant?.prix_vente && variant.prix_vente > 0) {
      return variant.prix_vente;
    }
    
    const storeProduct = product.store_products?.find(sp => sp.store === storeId && sp.is_active);
    if (storeProduct?.store_compare_price && storeProduct.store_compare_price > 0) {
      return storeProduct.store_compare_price;
    }
    
    if (storeProduct?.store_base_price && storeProduct.store_base_price > 0) {
      return storeProduct.store_base_price;
    }
    
    if (product.compare_at_price && product.compare_at_price > 0) {
      return product.compare_at_price;
    }
    
    return product.base_price || 0;
  }

  calculateChange(amountReceived: number, totalAmount: number): number {
    return Math.max(0, amountReceived - totalAmount);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  generateCartItemId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validatePayment(method: PaymentMethod, amount: string, reference: string, total: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const amountValue = parseFloat(amount) || 0;

    if (method.requires_amount) {
      if (!amount) {
        errors.push('Montant requis');
      } else if (amountValue < total) {
        errors.push('Montant insuffisant');
      }
    }

    if (method.requires_reference && !reference.trim()) {
      errors.push('Référence de transaction requise');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const cashierService = new CashierService();
export default cashierService;