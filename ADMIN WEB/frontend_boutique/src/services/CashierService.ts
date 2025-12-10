// src/services/CashierService.ts
import { apiService } from './api';

// Interfaces
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

// Interfaces pour la clôture de caisse
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
  start_date: string;
  end_date: string;
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

  private setCache(key: string, data: any, ttl: number = 300000): void { // 5 minutes par défaut
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
      if (category && category !== 'Tous') params.category = category;
      if (search) params.search = search;

      console.log('🛒 Chargement produits avec params:', params);

      const response = await apiService.get('/products/', { params });
      
      let products: any[] = [];
      
      // Gestion flexible de la réponse
      if (Array.isArray(response.data)) {
        products = response.data;
      } else if (response.data?.results) {
        products = response.data.results;
      } else if (response.data) {
        products = [response.data];
      }

      const formattedProducts = products.map(product => this.formatProduct(product));
      
      // Cache les résultats
      this.setCache(cacheKey, formattedProducts, 60000); // 1 minute pour les produits
      
      console.log(`✅ ${formattedProducts.length} produits chargés`);
      return formattedProducts;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement produits:', error);
      
      // En développement, retourner des produits mockés
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Retour de produits mockés pour le développement');
        const mockProducts = this.getMockProducts();
        this.setCache(cacheKey, mockProducts, 30000);
        return mockProducts;
      }
      
      return [];
    }
  }

  private formatProduct(productData: any): Product {
    // Assurer que les variantes sont toujours un tableau
    const variants = Array.isArray(productData.variants) ? productData.variants : [];
    if (variants.length === 0) {
      // Créer une variante par défaut si aucune n'existe
      variants.push({
        id: productData.id * 1000, // ID unique pour la variante
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

    // Assurer que store_products est toujours un tableau
    let storeProducts: StoreProduct[] = [];
    if (Array.isArray(productData.store_products)) {
      storeProducts = productData.store_products;
    } else {
      // Créer un store_product par défaut
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

      this.setCache(cacheKey, categories, 300000); // 5 minutes pour les catégories
      return categories;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement catégories:', error);
      
      // Catégories par défaut
      const defaultCategories: Category[] = [
        {
          id: 1,
          name: 'Tous',
          slug: 'tous',
          description: 'Tous les produits',
          image: null,
          parent: null,
          sort_order: 0,
          is_active: true
        }
      ];
      
      this.setCache(cacheKey, defaultCategories, 300000);
      return defaultCategories;
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

      // Utiliser les méthodes par défaut si aucune n'est retournée
      const paymentMethods = methods.length > 0 ? methods : this.getDefaultPaymentMethods();
      
      this.setCache(cacheKey, paymentMethods, 300000); // 5 minutes
      return paymentMethods;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement méthodes paiement:', error);
      
      const defaultMethods = this.getDefaultPaymentMethods();
      this.setCache(cacheKey, defaultMethods, 300000);
      return defaultMethods;
    }
  }

  private getDefaultPaymentMethods(): PaymentMethod[] {
    return [
      { 
        id: 1, 
        name: 'Espèces', 
        code: 'cash', 
        is_active: true, 
        requires_reference: false, 
        requires_amount: true,
        fee_percentage: 0,
        category: 'cash'
      },
      { 
        id: 2, 
        name: 'Carte Bancaire', 
        code: 'card', 
        is_active: true, 
        requires_reference: true, 
        requires_amount: false,
        fee_percentage: 1.5,
        category: 'card'
      },
      { 
        id: 3, 
        name: 'Wave', 
        code: 'wave', 
        is_active: true, 
        requires_reference: true, 
        requires_amount: false,
        fee_percentage: 1.0,
        category: 'mobile'
      },
      { 
        id: 4, 
        name: 'Orange Money', 
        code: 'orange_money', 
        is_active: true, 
        requires_reference: true, 
        requires_amount: false,
        fee_percentage: 1.0,
        category: 'mobile'
      }
    ];
  }

  // === CAISSES ===

  async getCashRegisters(storeId?: number): Promise<CashRegister[]> {
    const cacheKey = this.getCacheKey('cash_registers', { storeId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const params: any = {};
      const targetStoreId = storeId || this.currentStoreId;
      if (targetStoreId) params.store = targetStoreId;

      const response = await apiService.get('/cash-registers/', { params });
      
      let registers: any[] = [];
      
      if (Array.isArray(response.data)) {
        registers = response.data;
      } else if (response.data?.results) {
        registers = response.data.results;
      }

      // Si des caisses sont trouvées, définir la première comme courante
      if (registers.length > 0 && !this.currentCashRegister) {
        this.currentCashRegister = registers[0];
      }

      this.setCache(cacheKey, registers, 60000); // 1 minute
      return registers;
      
    } catch (error: any) {
      console.error('❌ Erreur chargement caisses:', error);
      
      // Caisse par défaut en développement
      if (process.env.NODE_ENV === 'development') {
        const defaultRegister: CashRegister = {
          id: 1,
          name: 'Caisse Principale',
          code: 'CAISSE-001',
          location: 'Point de vente principal',
          store: this.currentStoreId,
          store_name: 'Magasin Principal',
          is_active: true,
          opening_balance: 50000,
          current_balance: 50000,
          active_sessions: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        this.currentCashRegister = defaultRegister;
        const registers = [defaultRegister];
        this.setCache(cacheKey, registers, 30000);
        return registers;
      }
      
      return [];
    }
  }

  async getCurrentCashRegister(): Promise<CashRegister | null> {
    if (this.currentCashRegister) {
      return this.currentCashRegister;
    }
    
    const registers = await this.getCashRegisters();
    return registers.length > 0 ? registers[0] : null;
  }

  // === SESSIONS DE CAISSE ===

  async startCashSession(cashRegisterId: number): Promise<{ session_id: string }> {
    try {
      const response = await apiService.post('/cash-sessions/', {
        cash_register: cashRegisterId,
        employee: this.currentEmployeeId,
        opening_balance: 0
      });
      
      console.log('✅ Session de caisse démarrée:', response.data);
      return { session_id: response.data.id };
      
    } catch (error: any) {
      console.error('❌ Erreur démarrage session:', error);
      
      // Session simulée en développement
      const sessionId = `dev_session_${Date.now()}`;
      console.log('🔄 Session de développement créée:', sessionId);
      return { session_id: sessionId };
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
        employee: this.currentEmployeeId,
        caisse: saleData.cash_register_id,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        status: 'completed',
        customer: saleData.customerId,
        items: saleData.cart.map(item => ({
          product: item.product.id,
          variant: item.variant?.id || null,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price.toFixed(2)),
          line_total: parseFloat(item.line_total.toFixed(2))
        })),
        payments: saleData.payments.map(payment => ({
          payment_method: payment.payment_method_id,
          amount: parseFloat(payment.amount.toFixed(2)),
          transaction_reference: payment.transaction_reference || ''
        }))
      };

      console.log('💰 Envoi vente:', requestData);

      const response = await apiService.post('/sales/', requestData);
      
      console.log('✅ Vente enregistrée:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('❌ Erreur traitement vente:', error);
      
      // Vente simulée en cas d'erreur
      const total = saleData.cart.reduce((sum, item) => sum + item.line_total, 0) * 1.20;
      const simulatedSale: Sale = {
        id: Date.now(),
        ticket_number: `SIM-${Date.now()}`,
        total_amount: total,
        created_at: new Date().toISOString()
      };
      
      console.log('🔄 Vente simulée créée:', simulatedSale);
      return simulatedSale;
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

      this.setCache(cacheKey, customers, 30000); // 30 secondes pour les recherches
      return customers;
      
    } catch (error: any) {
      console.error('❌ Erreur recherche clients:', error);
      return [];
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
      return await this.manualBarcodeSearch(barcode, storeId);
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

  private async manualBarcodeSearch(barcode: string, storeId: number): Promise<{
    success: boolean;
    product: Product | null;
    variant: ProductVariant | null;
    message: string;
  }> {
    try {
      const products = await this.getProducts(storeId);
      
      // Recherche dans les variantes
      for (const product of products) {
        for (const variant of product.variants) {
          if (variant.barcode === barcode) {
            return {
              success: true,
              product: product,
              variant: variant,
              message: 'Produit trouvé par code-barres'
            };
          }
        }
        
        // Recherche par SKU
        if (product.sku === barcode) {
          return {
            success: true,
            product: product,
            variant: product.variants[0] || null,
            message: 'Produit trouvé par SKU'
          };
        }

        // Recherche par ID
        if (product.id.toString() === barcode) {
          return {
            success: true,
            product: product,
            variant: product.variants[0] || null,
            message: 'Produit trouvé par ID'
          };
        }
      }
      
      return {
        success: false,
        product: null,
        variant: null,
        message: 'Aucun produit trouvé avec ce code-barres'
      };
      
    } catch (error) {
      return {
        success: false,
        product: null,
        variant: null,
        message: 'Erreur lors de la recherche'
      };
    }
  }

  // === CLOTURE DE CAISSE ===

  async getDailySummary(storeId?: number, date?: string): Promise<DailySummary> {
    const cacheKey = this.getCacheKey('daily_summary', { storeId, date });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const targetStoreId = storeId || this.currentStoreId;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const params = {
        store: targetStoreId,
        date: targetDate
      };

      const response = await apiService.get('/cash-closures/daily-summary/', { params });
      
      if (response.data) {
        this.setCache(cacheKey, response.data, 60000); // 1 minute
        return response.data;
      }

      // Résumé vide
      const emptySummary = this.getEmptyDailySummary();
      this.setCache(cacheKey, emptySummary, 30000);
      return emptySummary;
      
    } catch (error: any) {
      console.error('❌ Erreur récupération récapitulatif:', error);
      const emptySummary = this.getEmptyDailySummary();
      this.setCache(cacheKey, emptySummary, 30000);
      return emptySummary;
    }
  }

  private getEmptyDailySummary(): DailySummary {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return {
      totalSales: 0,
      totalRevenue: 0,
      cashAmount: 0,
      cardAmount: 0,
      mobileMoneyAmount: 0,
      totalTransactions: 0,
      averageTicket: 0,
      startDate: startOfDay.toISOString(),
      endDate: today.toISOString()
    };
  }

  async recordCashWithdrawal(withdrawal: CashWithdrawal): Promise<CashWithdrawal> {
    try {
      const withdrawalData = {
        ...withdrawal,
        store: this.currentStoreId,
        created_at: new Date().toISOString()
      };

      const response = await apiService.post('/cash-withdrawals/', withdrawalData);
      
      // Invalider le cache du récapitulatif
      this.cache.delete(this.getCacheKey('daily_summary', { storeId: this.currentStoreId }));
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ Erreur enregistrement retrait:', error);
      return {
        ...withdrawal,
        id: Date.now(),
        created_at: new Date().toISOString()
      };
    }
  }

  async finalizeCashClosure(closureData: CashClosureRequest): Promise<CashClosure> {
    try {
      const completeClosureData = {
        ...closureData,
        store: this.currentStoreId,
        status: 'completed',
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString()
      };

      const response = await apiService.post('/cash-closures/', completeClosureData);
      
      // Vider le cache
      this.clearCache();
      
      return response.data;
      
    } catch (error: any) {
      console.error('❌ Erreur finalisation clôture:', error);
      return {
        id: Date.now(),
        cash_register: closureData.cash_register_id || 0,
        employee: closureData.employee_id,
        theoretical_cash: closureData.theoretical_cash,
        counted_cash: closureData.counted_cash,
        discrepancy: closureData.discrepancy,
        cash_breakdown: closureData.cash_breakdown,
        comments: closureData.comments,
        total_sales: closureData.total_sales,
        total_transactions: closureData.total_transactions,
        status: 'completed',
        created_at: new Date().toISOString()
      };
    }
  }

  // === METHODES UTILITAIRES ===

  calculateFinalPrice(product: Product, variant: ProductVariant | null, storeId: number): number {
    // Priorité 1: Variante avec réduction
    if (variant?.prix_reduction && variant.prix_reduction > 0) {
      return variant.prix_reduction;
    }
    
    // Priorité 2: Variante avec prix normal
    if (variant?.prix_vente && variant.prix_vente > 0) {
      return variant.prix_vente;
    }
    
    // Priorité 3: Store product avec prix comparé
    const storeProduct = product.store_products?.find(sp => sp.store === storeId && sp.is_active);
    if (storeProduct?.store_compare_price && storeProduct.store_compare_price > 0) {
      return storeProduct.store_compare_price;
    }
    
    // Priorité 4: Store product avec prix de base
    if (storeProduct?.store_base_price && storeProduct.store_base_price > 0) {
      return storeProduct.store_base_price;
    }
    
    // Priorité 5: Produit avec prix comparé
    if (product.compare_at_price && product.compare_at_price > 0) {
      return product.compare_at_price;
    }
    
    // Dernier recours: Prix de base du produit
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

  // === METHODES DE DEVELOPPEMENT ===

  private getMockProducts(): Product[] {
    return [
      {
        id: 1,
        name: 'Téléphone Smart 2024',
        description: 'Smartphone haut de gamme avec écran 6.7"',
        sku: 'PHONE-001',
        cost_price: 80000,
        base_price: 120000,
        compare_at_price: 0,
        category: {
          id: 1,
          name: 'Électronique',
          slug: 'electronique',
          description: 'Produits électroniques',
          image: null,
          parent: null,
          sort_order: 1,
          is_active: true
        },
        brand: null,
        supplier: null,
        variants: [
          {
            id: 101,
            name: '128GB Noir',
            barcode: 'BARCODE-PHONE-001',
            prix_vente: 120000,
            prix_reduction: 115000,
            cost_price: 80000,
            quantity: 15,
            weight: 0.2,
            selection: true,
            photo: null,
            product: 1
          }
        ],
        store_products: [{
          id: 1,
          store: 1,
          product: 1,
          store_base_price: 120000,
          store_compare_price: 115000,
          store_cost_price: 80000,
          quantity: 15,
          min_stock: 5,
          max_stock: 50,
          is_active: true,
          dlv: null,
          dlc: null,
          dcr: null
        }],
        photo: null,
        additional_images: [],
        status: 'active',
        qt_item: 1,
        jour_ecart: 0,
        is_active: true
      },
      {
        id: 2,
        name: 'Casque Audio Bluetooth',
        description: 'Casque sans fil avec réduction de bruit',
        sku: 'AUDIO-001',
        cost_price: 15000,
        base_price: 25000,
        compare_at_price: 0,
        category: {
          id: 1,
          name: 'Électronique',
          slug: 'electronique',
          description: 'Produits électroniques',
          image: null,
          parent: null,
          sort_order: 1,
          is_active: true
        },
        brand: null,
        supplier: null,
        variants: [
          {
            id: 201,
            name: 'Noir',
            barcode: 'BARCODE-AUDIO-001',
            prix_vente: 25000,
            prix_reduction: 0,
            cost_price: 15000,
            quantity: 25,
            weight: 0.3,
            selection: true,
            photo: null,
            product: 2
          }
        ],
        store_products: [{
          id: 2,
          store: 1,
          product: 2,
          store_base_price: 25000,
          store_compare_price: 0,
          store_cost_price: 15000,
          quantity: 25,
          min_stock: 10,
          max_stock: 100,
          is_active: true,
          dlv: null,
          dlc: null,
          dcr: null
        }],
        photo: null,
        additional_images: [],
        status: 'active',
        qt_item: 1,
        jour_ecart: 0,
        is_active: true
      }
    ];
  }
}

export const cashierService = new CashierService();
export default cashierService;