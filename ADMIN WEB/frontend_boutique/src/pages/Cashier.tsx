// src/components/Cashier.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  ShoppingCart, Plus, Minus, CreditCard, Search, X,
  Banknote, Barcode, User, Scan, Loader, Package, Tag,
  AlertCircle, CheckCircle, RefreshCw, Smartphone,
  Receipt, Clock, DollarSign, Archive, ArrowLeft,
  Menu, Printer, BarChart3, Coins, Calculator
} from 'lucide-react';
import useCashier from '../hooks/useCashier';
import cashierService from '../services/CashierService';

// Composants UI simplifiés
const Notification: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  const styles = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800' },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800' },
    warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800' },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800' }
  };

  const { bg, text } = styles[type];

  return (
    <div className={`fixed top-3 right-3 p-3 border rounded-lg z-50 ${bg} ${text} flex items-center space-x-3 max-w-sm animate-in slide-in-from-right duration-300`}>
      <span className="flex-1 text-sm">{message}</span>
      <button 
        onClick={onClose} 
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Composant de chargement
const QuickLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = "Chargement..." 
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center">
      <div className="flex items-center justify-center mb-4">
        <Loader className="w-6 h-6 text-blue-600 animate-spin mr-2" />
        <span className="text-base font-semibold text-gray-900">Caisse en ligne</span>
      </div>
      <p className="text-gray-600 mb-4 text-sm">{message}</p>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  </div>
);

// Composant d'initialisation de caisse simplifié
const CashInitialization: React.FC<{
  onInitialize: (cashFund: number, breakdown: any) => void;
  onCancel: () => void;
}> = ({ onInitialize, onCancel }) => {
  const [bills, setBills] = useState({
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0
  });

  const [coins, setCoins] = useState({
    500: 0,
    250: 0,
    200: 0,
    100: 0,
    50: 0,
    25: 0,
    10: 0,
    5: 0
  });

  const calculateTotal = () => {
    let total = 0;
    
    Object.entries(bills).forEach(([denomination, count]) => {
      total += parseInt(denomination) * count;
    });
    
    Object.entries(coins).forEach(([denomination, count]) => {
      total += parseInt(denomination) * count;
    });
    
    return total;
  };

  const total = calculateTotal();

  const handleBillChange = (denomination: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setBills(prev => ({
      ...prev,
      [denomination]: numValue
    }));
  };

  const handleCoinChange = (denomination: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setCoins(prev => ({
      ...prev,
      [denomination]: numValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onInitialize(total, { bills, coins });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full border">
        <div className="bg-gray-50 border-b p-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <div>
              <h1 className="text-base font-semibold text-gray-900">Initialisation Caisse</h1>
              <p className="text-gray-600 text-sm">Fonds de caisse initial</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <Banknote className="w-4 h-4 text-blue-600 mr-2" />
                <h2 className="text-sm font-medium text-gray-900">Billets</h2>
              </div>
              
              <div className="space-y-2">
                {Object.entries({
                  10000: '10 000 F',
                  5000: '5 000 F', 
                  2000: '2 000 F',
                  1000: '1 000 F',
                  500: '500 F'
                })
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([denomination, label]) => (
                  <div key={denomination} className="flex items-center justify-between p-2 border rounded">
                    <label className="text-sm text-gray-700 w-20">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bills[denomination as unknown as keyof typeof bills]}
                      onChange={(e) => handleBillChange(denomination, e.target.value)}
                      className="w-16 px-2 py-1 border rounded text-center text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                    <div className="text-sm text-gray-600 w-20 text-right">
                      = {formatCurrency(parseInt(denomination) * bills[denomination as unknown as keyof typeof bills])}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center mb-3">
                <Coins className="w-4 h-4 text-yellow-600 mr-2" />
                <h2 className="text-sm font-medium text-gray-900">Pièces</h2>
              </div>
              
              <div className="space-y-2">
                {Object.entries({
                  500: '500 F',
                  250: '250 F', 
                  200: '200 F',
                  100: '100 F',
                  50: '50 F',
                  25: '25 F',
                  10: '10 F',
                  5: '5 F'
                })
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([denomination, label]) => (
                  <div key={denomination} className="flex items-center justify-between p-2 border rounded">
                    <label className="text-sm text-gray-700 w-16">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={coins[denomination as unknown as keyof typeof coins]}
                      onChange={(e) => handleCoinChange(denomination, e.target.value)}
                      className="w-16 px-2 py-1 border rounded text-center text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                    <div className="text-sm text-gray-600 w-20 text-right">
                      = {formatCurrency(parseInt(denomination) * coins[denomination as unknown as keyof typeof coins])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3 border mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Total</h3>
                <p className="text-gray-600 text-xs">Fonds de caisse</p>
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(total)}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
            >
              Annuler
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Ouvrir Caisse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductSkeleton: React.FC = () => (
  <div className="p-2 border rounded animate-pulse">
    <div className="aspect-square bg-gray-200 rounded mb-2"></div>
    <div className="h-3 bg-gray-200 rounded mb-1"></div>
    <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
  </div>
);

const ProductCard: React.FC<{
  product: any;
  onAddToCart: (product: any, variant: any) => void;
}> = React.memo(({ product, onAddToCart }) => {
  const hasVariants = product.variants && product.variants.length > 0;
  const activeVariant = hasVariants 
    ? product.variants.find((v: any) => v.selection) || product.variants[0]
    : null;
  
  const finalPrice = cashierService.calculateFinalPrice(product, activeVariant, 1);
  const categoryName = product.category?.name || 'Non catégorisé';
  const hasDiscount = activeVariant?.prix_reduction && activeVariant.prix_reduction !== activeVariant.prix_vente;
  const stockInfo = product.store_products?.[0];
  const isLowStock = stockInfo?.quantity !== undefined && stockInfo.quantity <= (stockInfo.min_stock || 5);
  const isOutOfStock = stockInfo?.quantity === 0;

  const handleClick = () => {
    if (isOutOfStock) {
      return;
    }
    onAddToCart(product, activeVariant);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isOutOfStock}
      className={`p-2 border rounded text-left w-full h-full flex flex-col ${
        isOutOfStock 
          ? 'bg-gray-50 cursor-not-allowed opacity-60' 
          : 'bg-white hover:border-blue-300 hover:bg-blue-50'
      }`}
    >
      <div className={`aspect-square rounded mb-2 flex items-center justify-center overflow-hidden relative ${
        isOutOfStock ? 'bg-gray-200' : 'bg-gray-100'
      }`}>
        {product.photo ? (
          <img 
            src={product.photo} 
            alt={product.name}
            className="w-full h-full object-cover rounded"
            loading="lazy"
          />
        ) : hasVariants && product.variants[0]?.photo ? (
          <img 
            src={product.variants[0].photo} 
            alt={product.name}
            className="w-full h-full object-cover rounded"
            loading="lazy"
          />
        ) : (
          <Package className={`w-6 h-6 ${isOutOfStock ? 'text-gray-400' : 'text-gray-500'}`} />
        )}
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-red-500/90 flex items-center justify-center rounded">
            <span className="text-white font-bold text-xs">RUPTURE</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-medium text-gray-900 truncate text-xs ${
            isOutOfStock ? 'text-gray-500' : 'text-gray-900'
          }`}>
            {product.name}
          </h3>
          {stockInfo?.quantity !== undefined && !isOutOfStock && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
              {stockInfo.quantity}
            </span>
          )}
        </div>
        
        <span className="text-xs text-gray-600 mb-1">
          {categoryName}
        </span>
        
        <div className="text-xs text-gray-500 mb-2 flex items-center">
          <Barcode size={8} className="mr-1" />
          <span className="truncate font-mono">{product.sku}</span>
        </div>

        <div className="mt-auto space-y-1">
          <div className="flex justify-between items-center">
            <span className={`font-semibold text-xs ${hasDiscount ? 'text-green-600' : (isOutOfStock ? 'text-gray-500' : 'text-gray-900')}`}>
              {cashierService.formatCurrency(finalPrice)}
            </span>
            {hasDiscount && activeVariant?.prix_vente && (
              <span className="text-xs text-gray-500 line-through">
                {cashierService.formatCurrency(activeVariant.prix_vente)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});

const CartItemComponent: React.FC<{
  item: any;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}> = React.memo(({ item, onUpdateQuantity, onRemove }) => {
  const handleDecrease = () => onUpdateQuantity(item.id, item.quantity - 1);
  const handleIncrease = () => onUpdateQuantity(item.id, item.quantity + 1);
  const handleRemove = () => onRemove(item.id);

  return (
    <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded border items-center">
      <div className="font-medium text-gray-900 text-xs">
        <div className="truncate font-medium">{item.product.name}</div>
        {item.variant && (
          <div className="text-xs text-gray-600 truncate">{item.variant.name}</div>
        )}
        <div className="text-xs text-gray-500 mt-1">
          {cashierService.formatCurrency(item.unit_price)} × {item.quantity}
        </div>
      </div>
      
      <div className="flex items-center justify-center space-x-1">
        <button
          onClick={handleDecrease}
          className="p-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          <Minus size={10} className="text-gray-700" />
        </button>
        
        <span className="w-6 text-center font-medium text-gray-900 text-xs">
          {item.quantity}
        </span>
        
        <button
          onClick={handleIncrease}
          className="p-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          <Plus size={10} className="text-gray-700" />
        </button>
      </div>
      
      <div className="text-right">
        <div className="text-xs text-gray-500">Prix unitaire</div>
        <div className="text-green-600 font-medium text-xs">
          {cashierService.formatCurrency(item.unit_price)}
        </div>
      </div>
      
      <div className="text-right font-medium text-xs flex items-center justify-end space-x-1">
        <span className="text-gray-900">{cashierService.formatCurrency(item.line_total)}</span>
        <button
          onClick={handleRemove}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
});

// Interface pour la modale de clôture
interface ClosureModalProps {
  onClose: () => void;
  closurePaymentMethods: {
    cash: string;
    wave: string;
    orange_money: string;
    mtn_money: string;
    moov_money: string;
    card: string;
    client_card: string;
  };
  onClosurePaymentMethodChange: (method: string, value: string) => void;
  withdrawalAmount: string;
  withdrawalReason: string;
  onWithdrawalAmountChange: (value: string) => void;
  onWithdrawalReasonChange: (value: string) => void;
  onCashWithdrawal: () => void;
  cashClosureData: any;
  onClosureCommentsChange: (value: string) => void;
  onFinalClosure: (closureData: any) => void;
  processingClosure: boolean;
  dailySummary: any;
}

// Modale de clôture de caisse simplifiée
const ClosureModal: React.FC<ClosureModalProps> = ({
  onClose,
  closurePaymentMethods,
  onClosurePaymentMethodChange,
  withdrawalAmount,
  withdrawalReason,
  onWithdrawalAmountChange,
  onWithdrawalReasonChange,
  onCashWithdrawal,
  cashClosureData,
  onClosureCommentsChange,
  onFinalClosure,
  processingClosure,
  dailySummary
}) => {
  const [billsCount, setBillsCount] = useState({
    '10000': 0,
    '5000': 0,
    '2000': 0,
    '1000': 0,
    '500': 0
  });

  const [coinsCount, setCoinsCount] = useState({
    '250': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '25': 0,
    '10': 0,
    '5': 0
  });

  const handleBillsCountChange = useCallback((denomination: string, value: number) => {
    setBillsCount(prev => ({
      ...prev,
      [denomination]: value
    }));
  }, []);

  const handleCoinsCountChange = useCallback((denomination: string, value: number) => {
    setCoinsCount(prev => ({
      ...prev,
      [denomination]: value
    }));
  }, []);

  const calculateBillsTotal = useCallback(() => {
    return Object.entries(billsCount).reduce((total, [denomination, count]) => {
      return total + (parseInt(denomination) * (count || 0));
    }, 0);
  }, [billsCount]);

  const calculateCoinsTotal = useCallback(() => {
    return Object.entries(coinsCount).reduce((total, [denomination, count]) => {
      return total + (parseInt(denomination) * (count || 0));
    }, 0);
  }, [coinsCount]);

  const calculateClosureTotalCash = useCallback(() => {
    return calculateBillsTotal() + calculateCoinsTotal();
  }, [calculateBillsTotal, calculateCoinsTotal]);

  const calculateClosureTotalRevenue = useCallback(() => {
    return Object.values(closurePaymentMethods).reduce(
      (sum, val) => sum + (parseFloat(val) || 0), 
      0
    );
  }, [closurePaymentMethods]);

  const calculateClosureFinalBalance = useCallback(() => {
    const totalRevenue = calculateClosureTotalRevenue();
    const withdrawals = parseFloat(withdrawalAmount) || 0;
    return totalRevenue - withdrawals;
  }, [calculateClosureTotalRevenue, withdrawalAmount]);

  const totalRevenue = calculateClosureTotalRevenue();
  const finalBalance = calculateClosureFinalBalance();
  const cashAmount = parseFloat(closurePaymentMethods.cash) || 0;
  const totalCashCounted = calculateClosureTotalCash();
  const billsTotal = calculateBillsTotal();
  const coinsTotal = calculateCoinsTotal();
  const cashDiscrepancy = cashAmount - totalCashCounted;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-auto max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-3 border-b bg-white">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Clôture de Caisse</h3>
            <p className="text-gray-600 text-sm">Récapitulatif final</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Colonne gauche - Recettes et Récapitulatif */}
            <div className="space-y-3">
              {/* Récapitulatif Journalier */}
              <div className="bg-white border rounded p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center">
                  <BarChart3 className="mr-2 text-blue-600" size={14} />
                  Récapitulatif
                </h4>
                {dailySummary ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                      <div className="text-sm font-medium text-blue-900">{dailySummary.totalTransactions || 0}</div>
                      <div className="text-xs text-blue-700">Transactions</div>
                    </div>
                    <div className="bg-green-50 p-2 rounded border border-green-100">
                      <div className="text-sm font-medium text-green-900">
                        {cashierService.formatCurrency(dailySummary.totalRevenue || 0)}
                      </div>
                      <div className="text-xs text-green-700">CA Total</div>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded border border-yellow-100">
                      <div className="text-sm font-medium text-yellow-900">
                        {cashierService.formatCurrency(dailySummary.averageTicket || 0)}
                      </div>
                      <div className="text-xs text-yellow-700">Ticket Moyen</div>
                    </div>
                    <div className="bg-purple-50 p-2 rounded border border-purple-100">
                      <div className="text-sm font-medium text-purple-900">
                        {cashierService.formatCurrency(dailySummary.cashAmount || 0)}
                      </div>
                      <div className="text-xs text-purple-700">Espèces</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Loader className="animate-spin mx-auto mb-1 text-blue-600" size={14} />
                    <p className="text-gray-500 text-sm">Chargement...</p>
                  </div>
                )}
              </div>

              {/* Recettes par méthode de paiement */}
              <div className="bg-white border rounded p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center">
                  <CreditCard className="mr-2 text-indigo-600" size={14} />
                  Recettes par Méthode
                </h4>
                
                <div className="space-y-2">
                  {Object.entries({
                    cash: { icon: Banknote, label: 'Espèces' },
                    wave: { icon: Smartphone, label: 'Wave' },
                    orange_money: { icon: Smartphone, label: 'Orange Money' },
                    mtn_money: { icon: Smartphone, label: 'MTN Money' },
                    moov_money: { icon: Smartphone, label: 'Moov Money' },
                    card: { icon: CreditCard, label: 'Carte Bancaire' },
                    client_card: { icon: User, label: 'Client' }
                  }).map(([method, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center flex-1">
                          <Icon className="w-4 h-4 text-gray-600 mr-2" />
                          <span className="font-medium text-gray-800 text-sm">{config.label}</span>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={closurePaymentMethods[method as keyof typeof closurePaymentMethods]}
                            onChange={(e) => onClosurePaymentMethodChange(method, e.target.value)}
                            className="w-28 px-2 py-1 border rounded text-right text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            min="0"
                            step="100"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 ml-1">FCFA</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Recettes */}
                <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-100 mt-2">
                  <div className="font-medium text-gray-900 text-sm">TOTAL RECETTES</div>
                  <div className="text-sm font-medium text-blue-900">
                    {cashierService.formatCurrency(totalRevenue)}
                  </div>
                </div>
              </div>

              {/* Retrait de caisse */}
              <div className="bg-white border rounded p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center">
                  <DollarSign className="mr-2 text-yellow-600" size={14} />
                  Retrait Caisse
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Montant
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => onWithdrawalAmountChange(e.target.value)}
                        placeholder="0"
                        className="flex-1 px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        step="100"
                        min="0"
                      />
                      <span className="text-sm text-gray-500 ml-1">FCFA</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Motif
                    </label>
                    <input
                      type="text"
                      value={withdrawalReason}
                      onChange={(e) => onWithdrawalReasonChange(e.target.value)}
                      placeholder="Dépense..."
                      className="w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={onCashWithdrawal}
                    disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
                    className="w-full px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                  >
                    Effectuer retrait
                  </button>
                </div>
              </div>
            </div>

            {/* Colonne droite - Décompte Espèces */}
            <div className="space-y-3">
              {/* Décompte Espèces */}
              <div className="bg-white border rounded p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center">
                  <Banknote className="mr-2 text-green-600" size={14} />
                  Décompte Espèces
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Billets */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-1 flex items-center">
                      <Banknote className="w-3 h-3 mr-1 text-green-600" />
                      Billets
                    </h5>
                    <div className="space-y-1">
                      {Object.entries({
                        '10000': '10k',
                        '5000': '5k', 
                        '2000': '2k',
                        '1000': '1k',
                        '500': '500'
                      })
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([denomination, label]) => (
                        <div key={denomination} className="flex items-center justify-between p-1.5 bg-gray-50 rounded border">
                          <span className="font-medium text-gray-700 text-xs w-8">{label}</span>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={billsCount[denomination as keyof typeof billsCount] || 0}
                              onChange={(e) => handleBillsCountChange(denomination, parseInt(e.target.value) || 0)}
                              className="w-12 px-1 py-0.5 border rounded text-center text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-600 w-14 text-right ml-1">
                              = {cashierService.formatCurrency(parseInt(denomination) * (billsCount[denomination as keyof typeof billsCount] || 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pièces */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-1 flex items-center">
                      <Coins className="w-3 h-3 mr-1 text-yellow-600" />
                      Pièces
                    </h5>
                    <div className="space-y-1">
                      {Object.entries({
                        '250': '250',
                        '200': '200',
                        '100': '100',
                        '50': '50',
                        '25': '25',
                        '10': '10',
                        '5': '5'
                      })
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([denomination, label]) => (
                        <div key={denomination} className="flex items-center justify-between p-1.5 bg-gray-50 rounded border">
                          <span className="font-medium text-gray-700 text-xs w-8">{label}</span>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={coinsCount[denomination as keyof typeof coinsCount] || 0}
                              onChange={(e) => handleCoinsCountChange(denomination, parseInt(e.target.value) || 0)}
                              className="w-12 px-1 py-0.5 border rounded text-center text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-xs text-gray-600 w-14 text-right ml-1">
                              = {cashierService.formatCurrency(parseInt(denomination) * (coinsCount[denomination as keyof typeof coinsCount] || 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Totaux Billets et Pièces */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex justify-between items-center p-1.5 bg-green-50 rounded border border-green-100">
                    <span className="font-medium text-green-800 text-xs">Total Billets:</span>
                    <span className="font-medium text-green-900 text-xs">
                      {cashierService.formatCurrency(billsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1.5 bg-yellow-50 rounded border border-yellow-100">
                    <span className="font-medium text-yellow-800 text-xs">Total Pièces:</span>
                    <span className="font-medium text-yellow-900 text-xs">
                      {cashierService.formatCurrency(coinsTotal)}
                    </span>
                  </div>
                </div>

                {/* Total et écart */}
                <div className="grid grid-cols-3 gap-1 p-1.5 bg-gray-50 rounded border mt-2">
                  <div className="text-center">
                    <span className="block text-xs text-gray-700">Compté:</span>
                    <div className="text-xs font-medium text-green-600">
                      {cashierService.formatCurrency(totalCashCounted)}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs text-gray-700">Déclaré:</span>
                    <div className="text-xs font-medium text-blue-600">
                      {cashierService.formatCurrency(cashAmount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs text-gray-700">Écart:</span>
                    <div className={`text-xs font-medium ${
                      cashDiscrepancy === 0 ? 'text-green-600' :
                      cashDiscrepancy > 0 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {cashierService.formatCurrency(cashDiscrepancy)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Résumé Final */}
              <div className="bg-white border rounded p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2 flex items-center">
                  <Calculator className="mr-2 text-gray-600" size={14} />
                  Résumé Final
                </h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Recettes:</span>
                    <span className="font-medium text-gray-900 text-sm">
                      {cashierService.formatCurrency(totalRevenue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Retraits:</span>
                    <span className="font-medium text-red-600 text-sm">
                      -{cashierService.formatCurrency(parseFloat(withdrawalAmount) || 0)}
                    </span>
                  </div>
                  
                  <div className="border-t pt-1 mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">Solde:</span>
                      <span className="text-sm font-medium text-green-700">
                        {cashierService.formatCurrency(finalBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commentaires */}
              <div className="bg-white border rounded p-3">
                <label className="block font-medium text-gray-700 text-sm mb-1">
                  Commentaires
                </label>
                <textarea
                  value={cashClosureData.comments}
                  onChange={(e) => onClosureCommentsChange(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Observations..."
                />
              </div>

              {/* Boutons de finalisation */}
              <div className="bg-white border rounded p-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 border text-gray-700 rounded hover:bg-gray-50 text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const closureData = {
                        paymentMethods: closurePaymentMethods,
                        billsCount: billsCount,
                        coinsCount: coinsCount,
                        totalCash: totalCashCounted,
                        billsTotal: billsTotal,
                        coinsTotal: coinsTotal,
                        discrepancies: cashDiscrepancy,
                        comments: cashClosureData.comments,
                        withdrawals: parseFloat(withdrawalAmount) || 0,
                        withdrawalReason: withdrawalReason,
                        totalRevenue: totalRevenue,
                        finalBalance: finalBalance
                      };
                      
                      onFinalClosure(closureData);
                    }}
                    disabled={processingClosure}
                    className={`px-3 py-1.5 rounded text-sm flex items-center justify-center ${
                      processingClosure
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {processingClosure ? (
                      <>
                        <Loader className="animate-spin mr-1" size={12} />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <Archive className="mr-1" size={12} />
                        Finaliser Clôture
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant principal Cashier
const Cashier: React.FC = () => {
  const [isCashInitialized, setIsCashInitialized] = useState(false);
  const [cashFund, setCashFund] = useState(0);

  const [closurePaymentMethods, setClosurePaymentMethods] = useState({
    cash: '0',
    wave: '0',
    orange_money: '0',
    mtn_money: '0',
    moov_money: '0',
    card: '0',
    client_card: '0'
  });

  const handleClosurePaymentMethodChange = useCallback((method: string, value: string) => {
    setClosurePaymentMethods(prev => ({
      ...prev,
      [method]: value === '' ? '0' : value
    }));
  }, []);

  const {
    cart,
    products,
    categories,
    paymentMethods,
    customers,
    currentCashRegister,
    searchTerm,
    activeCategory,
    selectedCustomer,
    mobileView,
    isMobileMenuOpen,
    isPaymentMethodsModalOpen,
    isCustomerModalOpen,
    isBarcodeModalOpen,
    isClosureModalOpen,
    loading,
    initialLoad,
    processingPayment,
    scanning,
    paymentAmounts,
    paymentReferences,
    dailySummary,
    cashClosureData,
    withdrawalAmount,
    withdrawalReason,
    processingClosure,
    notification,
    
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    setSearchTerm,
    setActiveCategory,
    searchCustomers,
    selectCustomer,
    setMobileView,
    setIsMobileMenuOpen,
    openPaymentModal,
    closePaymentModal,
    openCustomerModal,
    closeCustomerModal,
    openBarcodeModal,
    closeBarcodeModal,
    openClosureModal,
    closeClosureModal,
    handleAmountChange,
    handleReferenceChange,
    processPayment,
    handleAutoScan,
    setBarcodeInput,
    updateCashCount,
    setClosureComments,
    handleCashWithdrawal,
    handleFinalClosure,
    setWithdrawalAmount,
    setWithdrawalReason,
    showNotification,
    handleReload,
    
    financials,
    filteredProducts
  } = useCashier(1, 1);

  const { subtotal, taxAmount, total, totalItems } = financials;

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  const handleCashInitialization = useCallback((total: number, breakdown: any) => {
    setCashFund(total);
    setIsCashInitialized(true);
    showNotification('success', `Caisse initialisée - ${cashierService.formatCurrency(total)}`);
  }, [showNotification]);

  const handleCancelInitialization = useCallback(() => {
    showNotification('info', 'Initialisation annulée');
  }, [showNotification]);

  const openPrintModal = useCallback(() => {
    if (cart.length === 0) {
      showNotification('warning', 'Le panier est vide');
      return;
    }
    setIsPrintModalOpen(true);
  }, [cart.length, showNotification]);

  const closePrintModal = useCallback(() => setIsPrintModalOpen(false), []);
  const openWithdrawalModal = useCallback(() => setIsWithdrawalModalOpen(true), []);
  const closeWithdrawalModal = useCallback(() => {
    setIsWithdrawalModalOpen(false);
    setWithdrawalAmount('');
    setWithdrawalReason('');
  }, [setWithdrawalAmount, setWithdrawalReason]);

  const handlePrintReceipt = useCallback(() => {
    showNotification('success', 'Ticket envoyé');
    closePrintModal();
  }, [showNotification, closePrintModal]);

  const handleSimpleWithdrawal = useCallback(() => {
    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
      showNotification('error', 'Montant invalide');
      return;
    }
    
    showNotification('success', `Retrait de ${cashierService.formatCurrency(parseFloat(withdrawalAmount))}`);
    closeWithdrawalModal();
  }, [withdrawalAmount, showNotification, closeWithdrawalModal]);

  const getMappedPaymentMethods = useCallback(() => {
    const methodOrder = [
      { 
        id: 1, 
        code: 'cash', 
        name: 'Espèces', 
        filter: (m: any) => 
          m.code?.toLowerCase().includes('cash') || 
          m.name?.toLowerCase().includes('espèces') ||
          m.name?.toLowerCase().includes('especes')
      },
      { 
        id: 2, 
        code: 'wave', 
        name: 'Wave', 
        filter: (m: any) => 
          m.code?.toLowerCase().includes('wave') || 
          m.name?.toLowerCase().includes('wave')
      },
      { 
        id: 3, 
        code: 'orange_money', 
        name: 'Orange Money', 
        filter: (m: any) => 
          m.code?.toLowerCase().includes('orange') || 
          m.name?.toLowerCase().includes('orange')
      },
      { 
        id: 4, 
        code: 'mtn_money', 
        name: 'MTN Money', 
        filter: (m: any) => 
          m.code?.toLowerCase().includes('mtn') || 
          m.name?.toLowerCase().includes('mtn')
      },
      { 
        id: 5, 
        code: 'moov_money', 
        name: 'Moov Money', 
        filter: (m: any) => 
          m.code?.toLowerCase().includes('moov') || 
          m.name?.toLowerCase().includes('moov')
      },
      { 
        id: 6, 
        code: 'card', 
        name: 'Carte Bancaire', 
        filter: (m: any) => 
          (m.code?.toLowerCase().includes('card') || 
           m.code?.toLowerCase().includes('carte')) &&
          !m.code?.toLowerCase().includes('client') &&
          !m.name?.toLowerCase().includes('client')
      },
      { 
        id: 7, 
        code: 'client_card', 
        name: 'Client', 
        filter: (m: any) => 
          m.code?.toLowerCase().includes('client') || 
          m.name?.toLowerCase().includes('client')
      }
    ];

    return methodOrder.map(order => {
      const originalMethod = paymentMethods.find(order.filter);
      if (originalMethod) {
        return {
          ...originalMethod,
          id: order.id,
          code: order.code,
          name: order.name
        };
      }
      return {
        id: order.id,
        code: order.code,
        name: order.name,
        is_default: false
      };
    });
  }, [paymentMethods]);

  const calculateTotalPaid = useCallback(() => {
    return getMappedPaymentMethods().reduce((sum: number, method: any) => {
      const amount = parseFloat(paymentAmounts[method.id] || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [getMappedPaymentMethods, paymentAmounts]);

  const calculateRemaining = useCallback(() => {
    const paid = calculateTotalPaid();
    return Math.max(0, (total || 0) - paid);
  }, [calculateTotalPaid, total]);

  const calculateChange = useCallback(() => {
    const paid = calculateTotalPaid();
    return Math.max(0, paid - (total || 0));
  }, [calculateTotalPaid, total]);

  useEffect(() => {
    if (isPaymentMethodsModalOpen) {
      getMappedPaymentMethods().forEach((method: any) => {
        if (!paymentAmounts[method.id]) {
          handleAmountChange(method.id, '0');
        }
      });
    }
  }, [isPaymentMethodsModalOpen, getMappedPaymentMethods, handleAmountChange, paymentAmounts]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      requestAnimationFrame(() => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
        
        if (event.key === 'F2') {
          event.preventDefault();
          openBarcodeModal();
          setTimeout(() => barcodeInputRef.current?.focus(), 100);
        }
        
        if (event.key === 'F3' && cart.length > 0) {
          event.preventDefault();
          openPaymentModal();
        }

        if (event.key === 'F8') {
          event.preventDefault();
          openClosureModal();
        }
        
        if (event.key === 'Escape') {
          closePaymentModal();
          closeCustomerModal();
          closeBarcodeModal();
          closeClosureModal();
          closePrintModal();
          closeWithdrawalModal();
          setIsMobileMenuOpen(false);
        }
      });
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, openBarcodeModal, openPaymentModal, openClosureModal, closePaymentModal, closeCustomerModal, closeBarcodeModal, closeClosureModal, closePrintModal, closeWithdrawalModal, setIsMobileMenuOpen]);

  const MobileNavigation = () => (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
      <div className="grid grid-cols-2">
        <button
          onClick={() => setMobileView('products')}
          className={`flex flex-col items-center justify-center py-2 ${
            mobileView === 'products' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
          }`}
        >
          <Package size={14} />
          <span className="text-xs mt-0.5">Produits</span>
        </button>
        <button
          onClick={() => setMobileView('cart')}
          className={`flex flex-col items-center justify-center py-2 relative ${
            mobileView === 'cart' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
          }`}
        >
          <ShoppingCart size={14} />
          <span className="text-xs mt-0.5">Panier</span>
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  if (!isCashInitialized) {
    return (
      <CashInitialization
        onInitialize={handleCashInitialization}
        onCancel={handleCancelInitialization}
      />
    );
  }

  if (initialLoad) {
    return <QuickLoadingSpinner message="Chargement de la caisse..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 lg:pb-0">
      {/* Header Mobile */}
      <div className="lg:hidden bg-white border-b p-2 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Caisse</h1>
            <p className="text-gray-600 text-xs">{currentCashRegister?.name || 'Principale'}</p>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={openCustomerModal}
              className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <User size={12} />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1 text-gray-600 hover:text-gray-800"
            >
              <Menu size={14} />
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b shadow">
            <div className="p-2 space-y-1">
              <button 
                onClick={openBarcodeModal}
                className="w-full flex items-center justify-center py-1 bg-blue-600 text-white rounded text-sm"
              >
                <Scan size={12} className="mr-1" />
                Scanner
              </button>
              <button 
                onClick={openPaymentModal}
                disabled={cart.length === 0}
                className={`w-full flex items-center justify-center py-1 rounded text-sm ${
                  cart.length === 0 
                    ? 'bg-gray-300 text-gray-500' 
                    : 'bg-green-600 text-white'
                }`}
              >
                <CreditCard size={12} className="mr-1" />
                Payer ({cashierService.formatCurrency(total)})
              </button>
              <button 
                onClick={openClosureModal}
                className="w-full flex items-center justify-center py-1 border border-red-600 text-red-600 rounded text-sm"
              >
                <Archive size={12} className="mr-1" />
                Clôturer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contenu Principal */}
      <div className="bg-white rounded-lg overflow-hidden max-w-7xl mx-auto lg:my-3">
        <div className="bg-white border-b p-3 hidden lg:block">
          <h1 className="text-base font-semibold text-gray-900">Caisse</h1>
          <p className="text-gray-600 text-sm">Scanner ou rechercher un produit</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Colonne gauche - Produits */}
          <div className={`p-3 border-r ${
            mobileView !== 'products' ? 'hidden lg:block' : 'block'
          }`}>
            <div className="mb-4">
              <h2 className="text-sm font-medium text-gray-900 mb-2">Rechercher Produit</h2>
              <div className="flex gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nom ou code-barres"
                  className="flex-1 px-3 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  onClick={openBarcodeModal}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"
                >
                  <Scan size={12} className="mr-1" />
                  Scanner
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    !activeCategory
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Tous
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 mb-4">
              {loading ? (
                [...Array(10)].map((_, i) => <ProductSkeleton key={i} />)
              ) : (
                filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                  />
                ))
              )}
            </div>

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-4">
                <Package className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-gray-500 text-sm">
                  {searchTerm ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-1 text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Colonne droite - Panier */}
          <div className={`p-3 bg-gray-50 ${
            mobileView !== 'cart' ? 'hidden lg:block' : 'block'
          }`}>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-gray-900">Client</h2>
                <button 
                  onClick={openCustomerModal}
                  className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center text-sm"
                >
                  <User size={10} className="mr-1" />
                  Ajouter
                </button>
              </div>
              
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Rechercher client..."
                  onChange={(e) => searchCustomers(e.target.value)}
                  className="w-full px-3 py-1.5 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {selectedCustomer && (
                <div className="p-2 bg-blue-50 rounded border border-blue-100 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-blue-900 text-sm">
                        {selectedCustomer.user.first_name} {selectedCustomer.user.last_name}
                      </p>
                      <p className="text-blue-700 text-xs">
                        {selectedCustomer.user.phone}
                      </p>
                    </div>
                    <button
                      onClick={() => selectCustomer(null)}
                      className="p-0.5 text-blue-500 hover:text-blue-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h2 className="text-sm font-medium text-gray-900 mb-2">Commande</h2>
              
              <div className="grid grid-cols-4 gap-2 px-2 py-1 border-b text-xs font-medium text-gray-600">
                <div>Produit</div>
                <div className="text-center">Qté</div>
                <div className="text-right">Prix U.</div>
                <div className="text-right">Total</div>
              </div>

              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <ShoppingCart className="mx-auto mb-2 text-gray-400" size={20} />
                    <p className="text-sm">Panier vide</p>
                    <p className="text-xs">Ajoutez des produits</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <CartItemComponent
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                    />
                  ))
                )}
              </div>

              <div className="border-t my-3"></div>

              <div className="bg-white rounded border p-3">
                <h2 className="text-sm font-medium text-gray-900 mb-2">Résumé</h2>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-gray-700 text-sm">
                    <span>Sous-total:</span>
                    <span>{cashierService.formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 text-sm">
                    <span>Taxes (20%):</span>
                    <span>{cashierService.formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-gray-900">
                      {cashierService.formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={openPaymentModal}
                    className="w-full mt-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium flex items-center justify-center text-sm"
                  >
                    <CreditCard size={12} className="mr-1" />
                    Payer
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded border p-3 hidden lg:block">
              <h2 className="text-sm font-medium text-gray-900 mb-2">Actions</h2>
              <div className="space-y-1">
                <button 
                  onClick={openClosureModal}
                  className="w-full p-2 text-left rounded hover:bg-gray-50 flex items-center text-red-600 text-sm"
                >
                  <Archive className="w-4 h-4 mr-2 text-red-500" />
                  Clôturer
                </button>
                
                <button 
                  onClick={openPrintModal}
                  className="w-full p-2 text-left rounded hover:bg-gray-50 flex items-center text-blue-600 text-sm"
                >
                  <Printer className="w-4 h-4 mr-2 text-blue-500" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileNavigation />

      {/* Bouton de réinitialisation Desktop */}
      <div className="fixed bottom-2 left-2 z-30 hidden lg:block">
        <button
          onClick={() => setIsCashInitialized(false)}
          className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
        >
          Réinitialiser
        </button>
      </div>

      {/* Modal de scan code-barres */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded max-w-sm w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Scanner</h3>
              <button
                onClick={closeBarcodeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Code-barres..."
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAutoScan(e.currentTarget.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const input = barcodeInputRef.current?.value || '';
                    handleAutoScan(input);
                  }}
                  disabled={scanning}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                >
                  {scanning ? (
                    <>
                      <Loader className="animate-spin mr-1" size={12} />
                      Scan...
                    </>
                  ) : (
                    <>
                      <Scan size={12} className="mr-1" />
                      Scanner
                    </>
                  )}
                </button>
                
                <button
                  onClick={closeBarcodeModal}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection du client */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded max-w-sm w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Client</h3>
              <button
                onClick={closeCustomerModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  onChange={(e) => searchCustomers(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="max-h-40 overflow-y-auto border rounded">
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full p-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="font-medium text-sm">{customer.user.first_name} {customer.user.last_name}</div>
                    <div className="text-xs text-gray-500">{customer.user.phone}</div>
                  </button>
                ))}
                
                {customers.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <User className="mx-auto mb-1 text-gray-400" size={16} />
                    <p className="text-sm">Aucun client</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  selectCustomer(null);
                  closeCustomerModal();
                }}
                className="w-full py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Aucun client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal des méthodes de paiement - FORMAT SIMPLIFIÉ */}
      {isPaymentMethodsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-white">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Paiement</h3>
                <p className="text-gray-600 text-sm">Total: {cashierService.formatCurrency(total || 0)}</p>
              </div>
              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {/* Montant total */}
                <div className="bg-blue-50 rounded p-3 border border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">À payer</h4>
                      <p className="text-gray-600 text-xs">Montant total de la transaction</p>
                    </div>
                    <div className="text-base font-semibold text-blue-900">
                      {cashierService.formatCurrency(total || 0)}
                    </div>
                  </div>
                </div>

                {/* Méthodes de paiement - Format simplifié */}
                <div className="bg-white border rounded p-3">
                  <h4 className="font-medium text-gray-900 text-sm mb-3 flex items-center">
                    <CreditCard className="mr-2 text-indigo-600" size={14} />
                    Répartition du Paiement
                  </h4>
                  
                  <div className="space-y-2">
                    {getMappedPaymentMethods().map((method: any) => {
                      const amount = paymentAmounts[method.id] || '0';
                      const reference = paymentReferences[method.id] || '';
                      const isCash = method.code === 'cash';
                      
                      return (
                        <div key={method.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <div className="flex items-center flex-1">
                            {isCash ? (
                              <Banknote className="w-4 h-4 text-green-600 mr-2" />
                            ) : method.code === 'wave' ? (
                              <Smartphone className="w-4 h-4 text-purple-600 mr-2" />
                            ) : method.code === 'orange_money' ? (
                              <Smartphone className="w-4 h-4 text-orange-600 mr-2" />
                            ) : method.code === 'mtn_money' ? (
                              <Smartphone className="w-4 h-4 text-yellow-600 mr-2" />
                            ) : method.code === 'moov_money' ? (
                              <Smartphone className="w-4 h-4 text-blue-600 mr-2" />
                            ) : method.code === 'card' ? (
                              <CreditCard className="w-4 h-4 text-indigo-600 mr-2" />
                            ) : (
                              <User className="w-4 h-4 text-teal-600 mr-2" />
                            )}
                            <span className="font-medium text-gray-800 text-sm">{method.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            {!isCash && (
                              <input
                                type="text"
                                value={reference}
                                onChange={(e) => handleReferenceChange(method.id, e.target.value)}
                                placeholder="Réf."
                                className="w-20 px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            )}
                            <div className="relative">
                              <input
                                type="number"
                                value={amount}
                                onChange={(e) => handleAmountChange(method.id, e.target.value)}
                                className="w-28 px-2 py-1 border rounded text-right text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                min="0"
                                step="100"
                                placeholder="0"
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                                FCFA
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Récapitulatif des paiements */}
                <div className="bg-gray-50 rounded p-3 border">
                  <h4 className="font-medium text-gray-900 text-sm mb-3">Récapitulatif</h4>
                  
                  <div className="space-y-2">
                    {getMappedPaymentMethods()
                      .filter((method: any) => {
                        const amount = parseFloat(paymentAmounts[method.id] || '0');
                        return amount > 0;
                      })
                      .map((method: any) => {
                        const amount = parseFloat(paymentAmounts[method.id] || '0');
                        const reference = paymentReferences[method.id];
                        return (
                          <div key={method.id} className="flex justify-between items-center p-1.5 bg-white rounded">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 text-sm">{method.name}</span>
                              {reference && (
                                <span className="text-xs text-gray-500 ml-1">({reference})</span>
                              )}
                            </div>
                            <span className="font-medium text-green-600 text-sm">
                              {cashierService.formatCurrency(amount)}
                            </span>
                          </div>
                        );
                      })}
                    
                    {getMappedPaymentMethods().filter((m: any) => 
                      parseFloat(paymentAmounts[m.id] || '0') > 0
                    ).length === 0 && (
                      <div className="text-center py-2 text-gray-500 text-sm">
                        Aucun paiement saisi
                      </div>
                    )}
                    
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total payé:</span>
                        <span className="text-sm font-medium text-green-700">
                          {cashierService.formatCurrency(calculateTotalPaid())}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Reste à payer:</span>
                        <span className={`text-sm font-medium ${
                          calculateRemaining() <= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {cashierService.formatCurrency(calculateRemaining())}
                        </span>
                      </div>
                      
                      {calculateChange() > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Monnaie à rendre:</span>
                          <span className="text-sm font-medium text-blue-600">
                            {cashierService.formatCurrency(calculateChange())}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t p-4 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 border text-gray-700 rounded hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
                
                <button
                  onClick={processPayment}
                  disabled={processingPayment || cart.length === 0 || total <= 0}
                  className={`flex-1 px-4 py-2 rounded text-sm flex items-center justify-center ${
                    processingPayment || cart.length === 0 || total <= 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {processingPayment ? (
                    <>
                      <Loader className="animate-spin mr-1" size={12} />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={12} className="mr-1" />
                      Valider Paiement
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de clôture de caisse */}
      {isClosureModalOpen && (
        <ClosureModal
          onClose={closeClosureModal}
          closurePaymentMethods={closurePaymentMethods}
          onClosurePaymentMethodChange={handleClosurePaymentMethodChange}
          withdrawalAmount={withdrawalAmount}
          withdrawalReason={withdrawalReason}
          onWithdrawalAmountChange={setWithdrawalAmount}
          onWithdrawalReasonChange={setWithdrawalReason}
          onCashWithdrawal={handleCashWithdrawal}
          cashClosureData={cashClosureData}
          onClosureCommentsChange={setClosureComments}
          onFinalClosure={handleFinalClosure}
          processingClosure={processingClosure}
          dailySummary={dailySummary}
        />
      )}

      {/* Modal d'impression */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded max-w-sm w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Imprimer ticket</h3>
              <button
                onClick={closePrintModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-gray-50 rounded border p-3">
                <div className="text-center mb-2">
                  <div className="font-medium text-sm">TICKET DE CAISSE</div>
                  <div className="text-gray-500 text-xs">#{Date.now().toString().slice(-6)}</div>
                </div>
                
                <div className="space-y-1 text-xs">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="truncate">{item.product.name} ×{item.quantity}</span>
                      <span className="font-medium">{cashierService.formatCurrency(item.line_total)}</span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-1 mt-1">
                    <div className="flex justify-between font-medium">
                      <span>TOTAL:</span>
                      <span>{cashierService.formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  <Printer size={12} className="inline mr-1" />
                  Imprimer
                </button>
                
                <button
                  onClick={closePrintModal}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => showNotification(null)}
        />
      )}
    </div>
  );
};

export default Cashier;