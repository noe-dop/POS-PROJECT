// src/hooks/useCashier.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import cashierService, { 
  Product, ProductVariant, Customer, PaymentMethod, CartItem, CashRegister
} from '../services/CashierService';

// Interfaces pour les types manquants dans CashierService
interface SaleRequest {
  cart: CartItem[];
  customerId: number | null;
  payments: PaymentData[];
  cash_register_id: number;
  cash_session_id: string;
}

interface PaymentData {
  payment_method_id: number;
  amount: number;
  transaction_reference?: string;
}

interface CashWithdrawal {
  amount: number;
  reason: string;
  cash_register_id?: number;
  employee_id: number;
}

interface CashClosureRequest {
  cash_register_id?: number;
  employee_id: number;
  theoretical_cash: number;
  counted_cash: number;
  discrepancy: number;
  cash_breakdown: { [denomination: string]: number };
  comments: string;
  total_sales: number;
  total_transactions: number;
  session_id?: string; // Ajout de session_id
  start_date?: string;
  end_date?: string;
}

// Interfaces pour le hook
interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  cashAmount: number;
  cardAmount: number;
  mobileMoneyAmount: number;
  totalTransactions: number;
  averageTicket: number;
}

interface CashClosureData {
  cashCount: {
    [denomination: string]: number;
  };
  totalCash: number;
  discrepancies: number;
  comments: string;
}

interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface CashierState {
  // États données
  cart: CartItem[];
  products: Product[];
  categories: string[];
  paymentMethods: PaymentMethod[];
  customers: Customer[];
  currentCashRegister: CashRegister | null;
  
  // États UI
  searchTerm: string;
  activeCategory: string;
  selectedCustomer: Customer | null;
  mobileView: 'products' | 'cart';
  isMobileMenuOpen: boolean;
  
  // États modales
  isPaymentMethodsModalOpen: boolean;
  isCustomerModalOpen: boolean;
  isBarcodeModalOpen: boolean;
  isClosureModalOpen: boolean;
  
  // États chargement
  loading: boolean;
  initialLoad: boolean;
  processingPayment: boolean;
  scanning: boolean;
  processingClosure: boolean;
  
  // États paiements
  paymentAmounts: { [key: number]: string };
  paymentReferences: { [key: number]: string };
  
  // États clôture
  dailySummary: DailySummary | null;
  cashClosureData: CashClosureData;
  withdrawalAmount: string;
  withdrawalReason: string;
  
  // Session
  currentSessionId: string;
  notification: NotificationState | null;
  
  // État pour l'input code-barres
  barcodeInput: string;
}

interface UseCashierReturn extends Omit<CashierState, 'barcodeInput'> {
  // Actions panier
  addToCart: (product: Product, variant?: ProductVariant) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  
  // Actions produits
  setSearchTerm: (term: string) => void;
  setActiveCategory: (category: string) => void;
  
  // Actions clients
  searchCustomers: (query: string) => void;
  selectCustomer: (customer: Customer | null) => void;
  
  // Actions UI
  setMobileView: (view: 'products' | 'cart') => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  
  // Actions modales
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  openCustomerModal: () => void;
  closeCustomerModal: () => void;
  openBarcodeModal: () => void;
  closeBarcodeModal: () => void;
  openClosureModal: () => void;
  closeClosureModal: () => void;
  
  // Actions paiements
  handleAmountChange: (methodId: number, amount: string) => void;
  handleReferenceChange: (methodId: number, reference: string) => void;
  processPayment: (method: PaymentMethod) => Promise<void>;
  
  // Actions scan
  handleAutoScan: (barcode: string) => Promise<void>;
  setBarcodeInput: (input: string) => void;
  
  // Actions clôture
  updateCashCount: (denomination: string, count: number) => void;
  setClosureComments: (comments: string) => void;
  handleCashWithdrawal: () => Promise<void>;
  handleFinalClosure: () => Promise<void>;
  setWithdrawalAmount: (amount: string) => void;
  setWithdrawalReason: (reason: string) => void;
  
  // Utilitaires
  showNotification: (type: NotificationState['type'], message: string) => void;
  handleReload: () => void;
  
  // Calculs
  financials: {
    subtotal: number;
    taxAmount: number;
    total: number;
    totalItems: number;
  };
  
  // Données filtrées
  filteredProducts: Product[];
  
  // État code-barres
  barcodeInput: string;
}

export const useCashier = (storeId: number = 1, employeeId: number = 1): UseCashierReturn => {
  // États principaux
  const [state, setState] = useState<CashierState>({
    // États données
    cart: [],
    products: [],
    categories: ['Tous'],
    paymentMethods: [],
    customers: [],
    currentCashRegister: null,
    
    // États UI
    searchTerm: '',
    activeCategory: 'Tous',
    selectedCustomer: null,
    mobileView: 'products',
    isMobileMenuOpen: false,
    
    // États modales
    isPaymentMethodsModalOpen: false,
    isCustomerModalOpen: false,
    isBarcodeModalOpen: false,
    isClosureModalOpen: false,
    
    // États chargement
    loading: true,
    initialLoad: true,
    processingPayment: false,
    scanning: false,
    processingClosure: false,
    
    // États paiements
    paymentAmounts: {},
    paymentReferences: {},
    
    // États clôture
    dailySummary: null,
    cashClosureData: {
      cashCount: {
        '10000': 0,
        '5000': 0,
        '2000': 0,
        '1000': 0,
        '500': 0,
        '200': 0,
        '100': 0,
        '50': 0,
        '25': 0,
        '10': 0,
        '5': 0
      },
      totalCash: 0,
      discrepancies: 0,
      comments: ''
    },
    withdrawalAmount: '',
    withdrawalReason: '',
    
    // Session
    currentSessionId: '',
    notification: null,
    
    // État code-barres
    barcodeInput: ''
  });

  // Références
  const initialLoadRef = useRef<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mettre à jour des états individuels
  const updateState = useCallback((updates: Partial<CashierState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Notifications
  const showNotification = useCallback((type: NotificationState['type'], message: string) => {
    console.log(`📢 Notification [${type}]: ${message}`);
    updateState({ notification: { type, message } });
    setTimeout(() => updateState({ notification: null }), 5000);
  }, [updateState]);

  // Gestion du panier
  const addToCart = useCallback((product: Product, variant: ProductVariant | null = null) => {
    const unitPrice = cashierService.calculateFinalPrice(product, variant, storeId);
    
    setState(prev => {
      const existingItem = prev.cart.find(item => 
        item.product.id === product.id && 
        item.variant?.id === variant?.id
      );

      if (existingItem) {
        const updatedCart = prev.cart.map(item =>
          item.id === existingItem.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                line_total: (item.quantity + 1) * item.unit_price
              }
            : item
        );
        return { ...prev, cart: updatedCart };
      }

      const newItem: CartItem = {
        id: cashierService.generateCartItemId(),
        product,
        variant: variant,
        quantity: 1,
        unit_price: unitPrice,
        line_total: unitPrice
      };

      return { ...prev, cart: [...prev.cart, newItem] };
    });

    // Sur mobile, basculer vers la vue panier après ajout
    if (window.innerWidth < 1024) {
      updateState({ mobileView: 'cart' });
    }

    showNotification('success', `✅ ${product.name} ajouté au panier`);
  }, [storeId, updateState, showNotification]);

  const updateQuantity = useCallback((id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }
    
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item =>
        item.id === id 
          ? { 
              ...item, 
              quantity: newQuantity,
              line_total: newQuantity * item.unit_price
            }
          : item
      )
    }));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.id !== id)
    }));
    showNotification('info', 'Produit retiré du panier');
  }, [showNotification]);

  const clearCart = useCallback(() => {
    updateState({ 
      cart: [], 
      selectedCustomer: null,
      paymentAmounts: {},
      paymentReferences: {}
    });
    showNotification('info', 'Panier vidé');
  }, [updateState, showNotification]);

  // Calculs financiers
  const financials = useMemo(() => {
    const subtotal = state.cart.reduce((total, item) => total + item.line_total, 0);
    const taxAmount = subtotal * 0.20;
    const total = subtotal + taxAmount;
    const totalItems = state.cart.reduce((acc, item) => acc + item.quantity, 0);

    return { subtotal, taxAmount, total, totalItems };
  }, [state.cart]);

  // Filtrage produits - optimisé
  const filteredProducts = useMemo(() => {
    if (!state.products.length) return [];
    
    const searchTerm = state.searchTerm.toLowerCase();
    const activeCategory = state.activeCategory;
    
    return state.products.filter(product => {
      // Filtre par recherche
      if (searchTerm) {
        const matchesSearch = 
          product.name.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm) ||
          product.variants?.some((v: any) => 
            v.barcode && v.barcode.includes(state.searchTerm)
          );
        
        if (!matchesSearch) return false;
      }
      
      // Filtre par catégorie
      if (activeCategory !== 'Tous') {
        const matchesCategory = product.category?.name === activeCategory;
        if (!matchesCategory) return false;
      }
      
      return true;
    });
  }, [state.products, state.searchTerm, state.activeCategory]);

  // Chargement initial optimisé des données
  const loadInitialData = useCallback(async () => {
    if (initialLoadRef.current) return;
    
    try {
      initialLoadRef.current = true;
      updateState({ loading: true, initialLoad: true });

      console.log('🔄 Démarrage initialisation caisse...');

      // Configuration initiale
      cashierService.setCurrentStoreId(storeId);
      cashierService.setCurrentEmployeeId(employeeId);

      // Chargement parallèle des données essentielles
      const [cashRegister, productsData, paymentMethodsData, categoriesData] = await Promise.all([
        cashierService.getCurrentCashRegister(),
        cashierService.getProducts(storeId),
        cashierService.getPaymentMethods(storeId),
        cashierService.getCategories(storeId)
      ]);

      console.log('📦 Données chargées:', {
        cashRegister: !!cashRegister,
        products: productsData.length,
        paymentMethods: paymentMethodsData.length,
        categories: categoriesData.length
      });

      // Démarrer la session de caisse si disponible
      let sessionId = '';
      if (cashRegister) {
        try {
          const session = await cashierService.startCashSession(cashRegister.id);
          sessionId = session.session_id;
          console.log('🎫 Session caisse démarrée:', sessionId);
        } catch (sessionError) {
          console.warn('⚠️ Erreur session caisse:', sessionError);
        }
      }

      // Extraire les catégories des produits
      const categorySet = new Set<string>(['Tous']);
      categoriesData.forEach(category => {
        if (category.name) {
          categorySet.add(category.name);
        }
      });

      // S'assurer qu'il y a au moins une catégorie
      if (categorySet.size === 1) { // Seulement "Tous"
        productsData.forEach(product => {
          if (product.category?.name) {
            categorySet.add(product.category.name);
          }
        });
      }

      // Mise à jour initiale
      updateState({
        currentCashRegister: cashRegister,
        products: productsData,
        categories: Array.from(categorySet),
        paymentMethods: paymentMethodsData,
        currentSessionId: sessionId,
        loading: false,
        initialLoad: false
      });
      
      showNotification('success', `🎉 Caisse "${cashRegister?.name || 'Principale'}" prête !`);
      
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      showNotification('error', 'Erreur lors du chargement des données');
      initialLoadRef.current = false;
      updateState({ 
        loading: false, 
        initialLoad: false 
      });
    }
  }, [storeId, employeeId, updateState, showNotification]);

  // Recherche produits optimisée
  useEffect(() => {
    if (!initialLoadRef.current) return;

    // Annuler la recherche précédente
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Annuler la requête précédente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Créer un nouveau contrôleur d'annulation
    abortControllerRef.current = new AbortController();

    if (state.searchTerm.length >= 2 || state.activeCategory !== 'Tous') {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          updateState({ loading: true });
          
          const searchResults = await cashierService.getProducts(
            storeId, 
            state.activeCategory === 'Tous' ? undefined : state.activeCategory, 
            state.searchTerm || undefined
          );
          
          if (!abortControllerRef.current?.signal.aborted) {
            updateState({ 
              products: searchResults,
              loading: false 
            });
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('❌ Erreur recherche produits:', error);
            updateState({ loading: false });
          }
        }
      }, 500);
    } else if (state.searchTerm.length === 0) {
      // Recharger tous les produits si la recherche est vide
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const allProducts = await cashierService.getProducts(storeId);
          updateState({ 
            products: allProducts,
            loading: false 
          });
        } catch (error) {
          console.error('❌ Erreur rechargement produits:', error);
          updateState({ loading: false });
        }
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [state.searchTerm, state.activeCategory, storeId, updateState]);

  // Chargement initial
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Gestion clients - chargement différé
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length > 2) {
      try {
        const results = await cashierService.searchCustomers(query, storeId);
        updateState({ customers: results });
      } catch (error) {
        console.error('❌ Erreur recherche clients:', error);
        updateState({ customers: [] });
      }
    } else {
      updateState({ customers: [] });
    }
  }, [storeId, updateState]);

  const selectCustomer = useCallback((customer: Customer | null) => {
    updateState({ 
      selectedCustomer: customer,
      isCustomerModalOpen: false 
    });
    showNotification('success', customer ? 
      `👤 Client ${customer.user.first_name} ${customer.user.last_name} sélectionné` : 
      '👤 Aucun client sélectionné'
    );
  }, [updateState, showNotification]);

  // Scan code-barres optimisé
  const handleAutoScan = useCallback(async (barcode: string) => {
    if (!barcode.trim() || state.scanning) return;

    try {
      updateState({ scanning: true });
      
      const scanResult = await cashierService.scanBarcode(barcode, storeId);
      
      if (scanResult.success && scanResult.product) {
        addToCart(scanResult.product, scanResult.variant);
        updateState({ 
          barcodeInput: '',
          isBarcodeModalOpen: false 
        });
      } else {
        showNotification('error', scanResult.message || '❌ Produit non trouvé');
      }
    } catch (error: any) {
      showNotification('error', error.message || '❌ Erreur lors du scan');
    } finally {
      updateState({ scanning: false });
    }
  }, [storeId, addToCart, showNotification, state.scanning, updateState]);

  // Gestion paiements
  const handleAmountChange = useCallback((methodId: number, amount: string) => {
    setState(prev => ({
      ...prev,
      paymentAmounts: { ...prev.paymentAmounts, [methodId]: amount }
    }));
  }, []);

  const handleReferenceChange = useCallback((methodId: number, reference: string) => {
    setState(prev => ({
      ...prev,
      paymentReferences: { ...prev.paymentReferences, [methodId]: reference }
    }));
  }, []);

  const processPayment = useCallback(async (method: PaymentMethod) => {
    const amount = state.paymentAmounts[method.id] || '';
    const reference = state.paymentReferences[method.id] || '';
    const amountValue = parseFloat(amount) || 0;

    const paymentAmount = method.code === 'cash' ? amountValue : financials.total;

    const validation = cashierService.validatePayment(method, amount, reference, financials.total);
    if (!validation.isValid) {
      showNotification('error', validation.errors[0]);
      return;
    }

    try {
      updateState({ processingPayment: true });

      if (!state.currentCashRegister) {
        showNotification('error', '❌ Aucune caisse disponible');
        return;
      }

      if (state.cart.length === 0) {
        showNotification('error', '❌ Le panier est vide');
        return;
      }

      const paymentData: PaymentData = {
        payment_method_id: method.id,
        amount: paymentAmount,
        transaction_reference: method.requires_reference ? reference : undefined
      };

      const saleRequest: SaleRequest = {
        cart: state.cart,
        customerId: state.selectedCustomer?.id || null,
        payments: [paymentData],
        cash_register_id: state.currentCashRegister.id,
        cash_session_id: state.currentSessionId
      };

      console.log('💰 Traitement paiement:', {
        method: method.name,
        amount: paymentAmount,
        items: state.cart.length
      });

      const sale = await cashierService.processSale(saleRequest as any);

      showNotification('success', `✅ Vente ${sale.ticket_number} enregistrée !`);
      
      clearCart();
      updateState({ isPaymentMethodsModalOpen: false });

    } catch (error: any) {
      console.error('❌ Erreur traitement paiement:', error);
      showNotification('error', error.message || '❌ Erreur lors du traitement du paiement');
    } finally {
      updateState({ processingPayment: false });
    }
  }, [
    state.paymentAmounts, 
    state.paymentReferences, 
    state.currentCashRegister, 
    state.cart, 
    state.selectedCustomer, 
    state.currentSessionId,
    financials.total,
    updateState,
    showNotification,
    clearCart
  ]);

  // Gestion clôture de caisse
  const fetchDailySummary = useCallback(async () => {
    try {
      console.log('📊 Chargement récapitulatif quotidien...');
      const summary = await cashierService.getDailySummary(storeId);
      updateState({ dailySummary: summary });
    } catch (error) {
      console.error('❌ Erreur récupération récapitulatif:', error);
      // Utiliser des valeurs par défaut
      updateState({
        dailySummary: {
          totalSales: 0,
          totalRevenue: 0,
          cashAmount: 0,
          cardAmount: 0,
          mobileMoneyAmount: 0,
          totalTransactions: 0,
          averageTicket: 0
        }
      });
    }
  }, [storeId, updateState]);

  // ==================== CORRECTION PRINCIPALE ====================
  // Gestion des retraits avec sessionId
  const handleCashWithdrawal = useCallback(async () => {
    if (!state.withdrawalAmount || parseFloat(state.withdrawalAmount) <= 0) {
      showNotification('error', '❌ Veuillez saisir un montant valide');
      return;
    }

    // Vérifier que la session est disponible
    if (!state.currentSessionId) {
      showNotification('error', '❌ Aucune session de caisse active');
      return;
    }

    try {
      const withdrawalData: CashWithdrawal = {
        amount: parseFloat(state.withdrawalAmount),
        reason: state.withdrawalReason,
        cash_register_id: state.currentCashRegister?.id,
        employee_id: employeeId
      };

      console.log('💸 Enregistrement retrait:', {
        withdrawalData,
        sessionId: state.currentSessionId
      });

      // Passage de l'ID de session au service
      await cashierService.recordCashWithdrawal(
        withdrawalData, 
        state.currentSessionId
      );
      
      showNotification('success', `✅ Retrait de ${cashierService.formatCurrency(parseFloat(state.withdrawalAmount))} effectué`);
      updateState({ 
        withdrawalAmount: '',
        withdrawalReason: '' 
      });
      
      // Recharger le récapitulatif
      await fetchDailySummary();
      
    } catch (error: any) {
      console.error('❌ Erreur retrait:', error);
      showNotification('error', error.message || '❌ Erreur lors du retrait');
    }
  }, [
    state.withdrawalAmount, 
    state.withdrawalReason, 
    state.currentCashRegister,
    state.currentSessionId,  // Dépendance cruciale
    employeeId, 
    showNotification, 
    updateState, 
    fetchDailySummary
  ]);

  // Gestion de la clôture finale
  const handleFinalClosure = useCallback(async () => {
    try {
      updateState({ processingClosure: true });

      // Vérifier que la session est disponible
      if (!state.currentSessionId) {
        showNotification('error', '❌ Aucune session de caisse active');
        updateState({ processingClosure: false });
        return;
      }

      const totalCounted = Object.entries(state.cashClosureData.cashCount).reduce(
        (total, [denomination, count]) => total + (parseInt(denomination) * count),
        0
      );

      const theoreticalCash = state.dailySummary?.cashAmount || 0;
      const totalSales = state.dailySummary?.totalSales || 0;
      const totalTransactions = state.dailySummary?.totalTransactions || 0;

      const closureData: CashClosureRequest = {
        cash_register_id: state.currentCashRegister?.id,
        employee_id: employeeId,
        theoretical_cash: theoreticalCash,
        counted_cash: totalCounted,
        discrepancy: totalCounted - theoreticalCash,
        cash_breakdown: state.cashClosureData.cashCount,
        comments: state.cashClosureData.comments,
        total_sales: totalSales,
        total_transactions: totalTransactions,
        session_id: state.currentSessionId // Ajout de l'ID de session
      };

      console.log('🔒 Finalisation clôture:', closureData);

      await cashierService.finalizeCashClosure(closureData as any);
      
      showNotification('success', '✅ Clôture de caisse effectuée avec succès');
      updateState({ isClosureModalOpen: false });
      
      // Réinitialiser les données de clôture
      updateState({
        cashClosureData: {
          cashCount: {
            '10000': 0,
            '5000': 0,
            '2000': 0,
            '1000': 0,
            '500': 0,
            '200': 0,
            '100': 0,
            '50': 0,
            '25': 0,
            '10': 0,
            '5': 0
          },
          totalCash: 0,
          discrepancies: 0,
          comments: ''
        }
      });
    } catch (error: any) {
      console.error('❌ Erreur clôture:', error);
      showNotification('error', error.message || '❌ Erreur lors de la clôture');
    } finally {
      updateState({ processingClosure: false });
    }
  }, [
    state.cashClosureData, 
    state.dailySummary, 
    state.currentCashRegister,
    state.currentSessionId, // Dépendance ajoutée
    employeeId, 
    showNotification, 
    updateState
  ]);

  // Mettre à jour le total compté quand le décompte change
  useEffect(() => {
    const total = Object.entries(state.cashClosureData.cashCount).reduce(
      (sum, [denomination, count]) => sum + (parseInt(denomination) * count),
      0
    );
    
    const discrepancies = state.dailySummary ? total - (state.dailySummary.cashAmount || 0) : 0;
    
    setState(prev => ({
      ...prev,
      cashClosureData: {
        ...prev.cashClosureData,
        totalCash: total,
        discrepancies: discrepancies
      }
    }));
  }, [state.cashClosureData.cashCount, state.dailySummary]);

  // Charger le récapitulatif quand la modal s'ouvre
  useEffect(() => {
    if (state.isClosureModalOpen) {
      fetchDailySummary();
    }
  }, [state.isClosureModalOpen, fetchDailySummary]);

  // Nettoyage des timeouts et abort controllers
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Utilitaires
  const handleReload = useCallback(() => {
    initialLoadRef.current = false;
    cashierService.clearCache();
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    updateState({
      products: [],
      categories: ['Tous'],
      paymentMethods: [],
      currentCashRegister: null,
      loading: true,
      initialLoad: true,
      cart: [],
      selectedCustomer: null,
      paymentAmounts: {},
      paymentReferences: {}
    });
    
    showNotification('info', '🔄 Rechargement des données...');
    
    // Recharger les données
    setTimeout(() => {
      loadInitialData();
    }, 100);
  }, [updateState, showNotification, loadInitialData]);

  // Actions pour mettre à jour les états
  const updateCashCount = useCallback((denomination: string, count: number) => {
    setState(prev => ({
      ...prev,
      cashClosureData: {
        ...prev.cashClosureData,
        cashCount: {
          ...prev.cashClosureData.cashCount,
          [denomination]: count
        }
      }
    }));
  }, []);

  const setClosureComments = useCallback((comments: string) => {
    setState(prev => ({
      ...prev,
      cashClosureData: {
        ...prev.cashClosureData,
        comments
      }
    }));
  }, []);

  // Raccourcis pour les setters courants
  const setSearchTerm = useCallback((term: string) => updateState({ searchTerm: term }), [updateState]);
  const setActiveCategory = useCallback((category: string) => updateState({ activeCategory: category }), [updateState]);
  const setMobileView = useCallback((view: 'products' | 'cart') => updateState({ mobileView: view }), [updateState]);
  const setIsMobileMenuOpen = useCallback((open: boolean) => updateState({ isMobileMenuOpen: open }), [updateState]);
  const setBarcodeInput = useCallback((input: string) => updateState({ barcodeInput: input }), [updateState]);
  const setWithdrawalAmount = useCallback((amount: string) => updateState({ withdrawalAmount: amount }), [updateState]);
  const setWithdrawalReason = useCallback((reason: string) => updateState({ withdrawalReason: reason }), [updateState]);

  // Actions modales
  const openPaymentModal = useCallback(() => {
    if (state.cart.length === 0) {
      showNotification('warning', '🛒 Le panier est vide');
      return;
    }
    updateState({ isPaymentMethodsModalOpen: true });
  }, [state.cart.length, updateState, showNotification]);

  const closePaymentModal = useCallback(() => updateState({ isPaymentMethodsModalOpen: false }), [updateState]);
  const openCustomerModal = useCallback(() => updateState({ isCustomerModalOpen: true }), [updateState]);
  const closeCustomerModal = useCallback(() => updateState({ isCustomerModalOpen: false }), [updateState]);
  const openBarcodeModal = useCallback(() => updateState({ isBarcodeModalOpen: true }), [updateState]);
  const closeBarcodeModal = useCallback(() => updateState({ isBarcodeModalOpen: false }), [updateState]);
  const openClosureModal = useCallback(() => updateState({ isClosureModalOpen: true }), [updateState]);
  const closeClosureModal = useCallback(() => updateState({ isClosureModalOpen: false }), [updateState]);

  return {
    // États (exclut barcodeInput du spread initial puis le réajoute)
    ...state,
    barcodeInput: state.barcodeInput,

    // Actions panier
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,

    // Actions produits
    setSearchTerm,
    setActiveCategory,

    // Actions clients
    searchCustomers,
    selectCustomer,

    // Actions UI
    setMobileView,
    setIsMobileMenuOpen,

    // Actions modales
    openPaymentModal,
    closePaymentModal,
    openCustomerModal,
    closeCustomerModal,
    openBarcodeModal,
    closeBarcodeModal,
    openClosureModal,
    closeClosureModal,

    // Actions paiements
    handleAmountChange,
    handleReferenceChange,
    processPayment,

    // Actions scan
    handleAutoScan,
    setBarcodeInput,

    // Actions clôture
    updateCashCount,
    setClosureComments,
    handleCashWithdrawal,
    handleFinalClosure,
    setWithdrawalAmount,
    setWithdrawalReason,

    // Utilitaires
    showNotification,
    handleReload,

    // Calculs
    financials,

    // Données filtrées
    filteredProducts
  };
};

export default useCashier;