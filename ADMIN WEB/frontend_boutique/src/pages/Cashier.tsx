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

// Composants UI
const Notification: React.FC<{
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  const styles = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
    warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: <AlertCircle className="w-4 h-4 text-yellow-500" /> },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <AlertCircle className="w-4 h-4 text-blue-500" /> }
  };

  const { bg, text, icon } = styles[type];

  return (
    <div className={`fixed top-3 right-3 p-2 border rounded shadow z-50 ${bg} ${text} flex items-center space-x-2 max-w-xs animate-in slide-in-from-right duration-300`}>
      {icon}
      <span className="flex-1 text-xs">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

// Composant de chargement rapide
const QuickLoadingSpinner: React.FC<{ message?: string }> = ({ 
  message = "Chargement..." 
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3">
    <div className="bg-white rounded-lg shadow p-4 max-w-sm w-full text-center animate-pulse">
      <div className="flex items-center justify-center mb-3">
        <div className="w-6 h-6 bg-blue-200 rounded-full animate-spin mr-2"></div>
        <span className="text-sm font-semibold text-gray-900">Caisse en ligne</span>
      </div>
      <p className="text-gray-600 mb-3 text-xs">{message}</p>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  </div>
);

// Composant d'initialisation de caisse
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow max-w-lg w-full border border-gray-200">
        <div className="bg-white border-b border-gray-200 p-3 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-50 p-1.5 rounded">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Initialisation Caisse</h1>
              <p className="text-gray-600 text-xs">Déclarez le fonds de caisse initial</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="bg-blue-50 p-1 rounded mr-1.5">
                  <Banknote className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Billets</h2>
              </div>
              
              <div className="space-y-1">
                {Object.entries({
                  10000: '10k',
                  5000: '5k', 
                  2000: '2k',
                  1000: '1k',
                  500: '500'
                })
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([denomination, label]) => (
                  <div key={denomination} className="flex items-center justify-between border border-gray-200 rounded p-1.5 bg-gray-50">
                    <label className="text-xs font-semibold text-gray-700 w-10">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={bills[denomination as unknown as keyof typeof bills]}
                      onChange={(e) => handleBillChange(denomination, e.target.value)}
                      className="w-10 px-1 py-0.5 border border-gray-300 rounded text-center font-semibold text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="0"
                    />
                    <div className="text-xs text-gray-500 font-medium w-14 text-right">
                      = {formatCurrency(parseInt(denomination) * bills[denomination as unknown as keyof typeof bills])}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center mb-2">
                <div className="bg-blue-50 p-1 rounded mr-1.5">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">Pièces</h2>
              </div>
              
              <div className="space-y-1">
                {Object.entries({
                  500: '500',
                  250: '250', 
                  200: '200',
                  100: '100',
                  50: '50',
                  25: '25',
                  10: '10',
                  5: '5'
                })
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .map(([denomination, label]) => (
                  <div key={denomination} className="flex items-center justify-between border border-gray-200 rounded p-1.5 bg-gray-50">
                    <label className="text-xs font-semibold text-gray-700 w-10">
                      {label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={coins[denomination as unknown as keyof typeof coins]}
                      onChange={(e) => handleCoinChange(denomination, e.target.value)}
                      className="w-10 px-1 py-0.5 border border-gray-300 rounded text-center font-semibold text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="0"
                    />
                    <div className="text-xs text-gray-500 font-medium w-14 text-right">
                      = {formatCurrency(parseInt(denomination) * coins[denomination as unknown as keyof typeof coins])}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded p-2 border border-blue-200 mt-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-gray-900">Total:</h3>
                <p className="text-gray-600 text-xs">Fonds de caisse</p>
              </div>
              <div className="text-right">
                <div className="text-base font-bold text-gray-900">
                  {formatCurrency(total)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-1.5 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-all font-semibold text-xs flex items-center justify-center"
            >
              <X className="w-3 h-3 mr-1" />
              Annuler
            </button>
            
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all font-semibold text-xs flex items-center justify-center"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Ouvrir Caisse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProductSkeleton: React.FC = () => (
  <div className="p-1.5 border border-gray-200 rounded animate-pulse">
    <div className="aspect-square bg-gray-200 rounded mb-1"></div>
    <div className="h-3 bg-gray-200 rounded mb-0.5"></div>
    <div className="h-2 bg-gray-200 rounded w-3/4 mb-0.5"></div>
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
      className={`p-1.5 border border-gray-200 rounded text-left w-full h-full flex flex-col group transition-all duration-200 ${
        isOutOfStock 
          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60' 
          : 'border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50'
      }`}
    >
      <div className={`aspect-square rounded mb-1 flex items-center justify-center overflow-hidden flex-shrink-0 ${
        isOutOfStock ? 'bg-gray-200' : 'bg-gray-100'
      }`}>
        {product.photo ? (
          <img 
            src={product.photo} 
            alt={product.name}
            className="w-full h-full object-cover rounded transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : hasVariants && product.variants[0]?.photo ? (
          <img 
            src={product.variants[0].photo} 
            alt={product.name}
            className="w-full h-full object-cover rounded transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <Package className={`w-4 h-4 ${isOutOfStock ? 'text-gray-400' : 'text-gray-500'}`} />
        )}
        
        {isOutOfStock && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-90 flex items-center justify-center rounded">
            <span className="text-white font-bold text-xs rotate-45 transform">RUPTURE</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <h3 className={`font-medium text-gray-900 group-hover:text-blue-600 truncate text-xs mb-0.5 ${
          isOutOfStock ? 'text-gray-500' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>
        
        <p className="text-xs text-gray-500 mb-0.5 truncate">{categoryName}</p>
        
        <div className="text-xs text-gray-400 mb-1 flex items-center">
          <Barcode size={8} className="mr-0.5" />
          <span className="truncate">{product.sku}</span>
        </div>

        <div className="mt-auto space-y-0.5">
          <div className="flex justify-between items-center">
            <span className={`font-semibold text-xs ${hasDiscount ? 'text-green-600' : (isOutOfStock ? 'text-gray-500' : 'text-gray-900')}`}>
              {cashierService.formatCurrency(finalPrice)}
            </span>
            {hasDiscount && activeVariant?.prix_vente && (
              <span className="text-xs text-red-500 line-through hidden sm:block">
                {cashierService.formatCurrency(activeVariant.prix_vente)}
              </span>
            )}
          </div>

          {stockInfo?.quantity !== undefined && (
            <div className={`text-xs ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-gray-500'}`}>
              Stock: {stockInfo.quantity}
              {isOutOfStock && ' • Rupture'}
              {isLowStock && !isOutOfStock && ' • Faible'}
            </div>
          )}
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
    <div className="grid grid-cols-4 gap-1 px-1.5 py-1 bg-gray-50 rounded items-center">
      <div className="font-medium text-gray-900 text-xs">
        <div className="truncate">{item.product.name}</div>
        {item.variant && (
          <div className="text-xs text-gray-600 truncate">{item.variant.name}</div>
        )}
        <div className="text-xs text-gray-500 mt-0.5">
          {cashierService.formatCurrency(item.unit_price)} × {item.quantity}
        </div>
      </div>
      
      <div className="flex items-center justify-center space-x-1">
        <button
          onClick={handleDecrease}
          className="p-0.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          aria-label="Réduire la quantité"
        >
          <Minus size={10} />
        </button>
        
        <span className="w-4 text-center font-medium text-gray-900 text-xs">
          {item.quantity}
        </span>
        
        <button
          onClick={handleIncrease}
          className="p-0.5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
          aria-label="Augmenter la quantité"
        >
          <Plus size={10} />
        </button>
      </div>
      
      <div className="text-right text-green-600 font-medium text-xs">
        +{cashierService.formatCurrency(item.unit_price)}
      </div>
      
      <div className="text-right font-semibold text-xs flex items-center justify-end space-x-1">
        <span>{cashierService.formatCurrency(item.line_total)}</span>
        <button
          onClick={handleRemove}
          className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          aria-label="Supprimer l'article"
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
});

const PaymentMethodComponent: React.FC<{
  method: any;
  total: number;
  onProcessPayment: (method: any) => void;
  processingPayment: boolean;
  paymentAmounts: { [key: number]: string };
  paymentReferences: { [key: number]: string };
  onAmountChange: (methodId: number, amount: string) => void;
  onReferenceChange: (methodId: number, reference: string) => void;
}> = ({ 
  method, 
  total, 
  onProcessPayment, 
  processingPayment,
  paymentAmounts,
  paymentReferences,
  onAmountChange,
  onReferenceChange
}) => {
  const amount = paymentAmounts[method.id] || '';
  const reference = paymentReferences[method.id] || '';
  const amountValue = parseFloat(amount) || 0;
  const change = cashierService.calculateChange(amountValue, total);
  
  const [currentStep, setCurrentStep] = React.useState<'select' | 'amount' | 'reference'>('select');

  const paymentConfigs: { [key: string]: any } = {
    cash: {
      icon: Banknote,
      title: 'Espèces',
      color: 'emerald',
      steps: ['amount']
    },
    wave: {
      icon: Smartphone,
      title: 'Wave',
      color: 'purple',
      steps: ['reference']
    },
    orange_money: {
      icon: Smartphone,
      title: 'Orange',
      color: 'orange',
      steps: ['reference']
    },
    mtn_money: {
      icon: Smartphone,
      title: 'MTN',
      color: 'yellow',
      steps: ['reference']
    },
    moor_money: {
      icon: Smartphone,
      title: 'Moor',
      color: 'blue',
      steps: ['reference']
    },
    card: {
      icon: CreditCard,
      title: 'Carte',
      color: 'indigo',
      steps: ['reference']
    },
    client_card: {
      icon: User,
      title: 'Client',
      color: 'teal',
      steps: ['reference']
    }
  };

  const config = paymentConfigs[method.code] || paymentConfigs.card;
  const IconComponent = config.icon;

  const colorClasses: any = {
    emerald: { 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-200', 
      button: 'bg-emerald-600 hover:bg-emerald-700',
      icon: 'text-emerald-600'
    },
    purple: { 
      bg: 'bg-purple-50', 
      border: 'border-purple-200', 
      button: 'bg-purple-600 hover:bg-purple-700',
      icon: 'text-purple-600'
    },
    orange: { 
      bg: 'bg-orange-50', 
      border: 'border-orange-200', 
      button: 'bg-orange-600 hover:bg-orange-700',
      icon: 'text-orange-600'
    },
    yellow: { 
      bg: 'bg-yellow-50', 
      border: 'border-yellow-200', 
      button: 'bg-yellow-600 hover:bg-yellow-700',
      icon: 'text-yellow-600'
    },
    blue: { 
      bg: 'bg-blue-50', 
      border: 'border-blue-200', 
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'text-blue-600'
    },
    indigo: { 
      bg: 'bg-indigo-50', 
      border: 'border-indigo-200', 
      button: 'bg-indigo-600 hover:bg-indigo-700',
      icon: 'text-indigo-600'
    },
    teal: { 
      bg: 'bg-teal-50', 
      border: 'border-teal-200', 
      button: 'bg-teal-600 hover:bg-teal-700',
      icon: 'text-teal-600'
    }
  };

  const colors = colorClasses[config.color] || colorClasses.indigo;

  const renderSelectStep = () => (
    <div className="text-center h-full flex flex-col">
      <div className={`p-1.5 rounded ${colors.bg} border ${colors.border} mb-1.5 flex-1 flex flex-col justify-center`}>
        <IconComponent size={14} className={`mx-auto mb-0.5 ${colors.icon}`} />
        <h3 className="font-bold text-gray-900 text-xs">{config.title}</h3>
      </div>

      <button
        onClick={() => setCurrentStep(config.steps[0])}
        className={`w-full py-1 px-1.5 rounded text-white font-medium text-xs transition-all duration-200 ${colors.button}`}
      >
        Utiliser
      </button>
    </div>
  );

  const renderAmountStep = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={() => setCurrentStep('select')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors text-xs"
        >
          <ArrowLeft size={10} className="mr-0.5" />
          Retour
        </button>
        <h3 className="text-xs font-bold text-gray-900">Espèces</h3>
        <div className="w-3"></div>
      </div>

      <div className="bg-white rounded border border-gray-200 p-1.5 mb-1.5 flex-1">
        <div className="text-center mb-1.5">
          <Banknote size={16} className="mx-auto text-emerald-600 mb-0.5" />
          <p className="text-gray-600 text-xs">Montant reçu</p>
        </div>

        <div className="mb-1.5">
          <label className="block font-bold text-gray-700 mb-0.5 text-center text-xs">
            Total: <span className="font-bold text-gray-900">
              {cashierService.formatCurrency(total)}
            </span>
          </label>
          
          <div className="relative">
            <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-xs">
              FCFA
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(method.id, e.target.value)}
              placeholder="0"
              className="w-full pl-10 pr-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-bold text-center text-xs"
              step="100"
              min="0"
              autoFocus
            />
          </div>
        </div>

        {amountValue > 0 && (
          <div className="p-1 bg-emerald-50 border border-emerald-200 rounded text-xs">
            <div className="flex justify-between items-center">
              <span className="font-medium text-emerald-800">Monnaie:</span>
              <span className="font-bold text-emerald-900">
                {cashierService.formatCurrency(change)}
              </span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onProcessPayment(method)}
        disabled={processingPayment || amountValue < total}
        className={`w-full py-1 px-1.5 rounded font-medium text-xs transition-all duration-200 ${
          processingPayment || amountValue < total
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {processingPayment ? (
          <>
            <Loader className="animate-spin mr-0.5 inline" size={10} />
            ...
          </>
        ) : (
          <>
            <CheckCircle size={10} className="inline mr-0.5" />
            Valider
          </>
        )}
      </button>
    </div>
  );

  const renderReferenceStep = () => (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={() => setCurrentStep('select')}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors text-xs"
        >
          <ArrowLeft size={10} className="mr-0.5" />
          Retour
        </button>
        <h3 className="text-xs font-bold text-gray-900 truncate">{config.title}</h3>
        <div className="w-3"></div>
      </div>

      <div className="bg-white rounded border border-gray-200 p-1.5 mb-1.5 flex-1">
        <div className="text-center mb-1.5">
          <p className="text-gray-600 text-xs">Référence</p>
        </div>

        <div className="mb-1.5">
          <div className="flex justify-between items-center mb-1 p-1 bg-gray-50 rounded text-xs">
            <span className="font-medium text-gray-700">À payer:</span>
            <span className="font-bold text-gray-900">
              {cashierService.formatCurrency(total)}
            </span>
          </div>
          
          <div>
            <input
              type="text"
              value={reference}
              onChange={(e) => onReferenceChange(method.id, e.target.value)}
              placeholder="WV-123..."
              className="w-full px-1.5 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs font-mono text-center"
              autoFocus
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => onProcessPayment(method)}
        disabled={processingPayment || !reference.trim()}
        className={`w-full py-1 px-1.5 rounded font-medium text-xs transition-all duration-200 ${
          processingPayment || !reference.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : `${colors.button}`
        }`}
      >
        {processingPayment ? (
          <>
            <Loader className="animate-spin mr-0.5 inline" size={10} />
            ...
          </>
        ) : (
          <>
            <CheckCircle size={10} className="inline mr-0.5" />
            Confirmer
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className={`border ${colors.border} rounded p-1 ${colors.bg} transition-all duration-200 h-28 flex flex-col`}>
      {currentStep === 'select' && renderSelectStep()}
      {currentStep === 'amount' && renderAmountStep()}
      {currentStep === 'reference' && renderReferenceStep()}
    </div>
  );
};

// Interface pour la modale de clôture
interface ClosureModalProps {
  onClose: () => void;
  paymentMethods: any;
  closurePaymentMethods: {
    cash: string;
    wave: string;
    orange_money: string;
    mtn_money: string;
    moor_money: string;
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
  cashierService: typeof cashierService;
}

// Modale de clôture de caisse (composant séparé)
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
  dailySummary,
  cashierService
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-auto max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-white">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Clôture de Caisse</h3>
            <p className="text-gray-600 text-xs">Récapitulatif final</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Colonne gauche - Recettes et Récapitulatif */}
            <div className="space-y-3">
              {/* Récapitulatif Journalier */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center">
                  <BarChart3 className="mr-1.5 text-blue-600" size={12} />
                  Récapitulatif
                </h4>
                {dailySummary ? (
                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-blue-50 p-1 rounded border border-blue-200">
                      <div className="text-xs font-bold text-blue-900">{dailySummary.totalTransactions || 0}</div>
                      <div className="text-xs text-blue-600">Ventes</div>
                    </div>
                    <div className="bg-green-50 p-1 rounded border border-green-200">
                      <div className="text-xs font-bold text-green-900">
                        {cashierService.formatCurrency(dailySummary.totalRevenue || 0)}
                      </div>
                      <div className="text-xs text-green-600">CA Total</div>
                    </div>
                    <div className="bg-yellow-50 p-1 rounded border border-yellow-200">
                      <div className="text-xs font-bold text-yellow-900">
                        {cashierService.formatCurrency(dailySummary.averageTicket || 0)}
                      </div>
                      <div className="text-xs text-yellow-600">Ticket Moyen</div>
                    </div>
                    <div className="bg-purple-50 p-1 rounded border border-purple-200">
                      <div className="text-xs font-bold text-purple-900">
                        {cashierService.formatCurrency(dailySummary.cashAmount || 0)}
                      </div>
                      <div className="text-xs text-purple-600">Espèces</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Loader className="animate-spin mx-auto mb-1 text-blue-600" size={12} />
                    <p className="text-gray-500 text-xs">Chargement...</p>
                  </div>
                )}
              </div>

              {/* Recettes par méthode de paiement */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center">
                  <CreditCard className="mr-1.5 text-indigo-600" size={12} />
                  Recettes par Méthode
                </h4>
                
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries({
                    cash: { icon: Banknote, label: 'Espèces', color: 'text-green-600' },
                    wave: { icon: Smartphone, label: 'Wave', color: 'text-purple-600' },
                    orange_money: { icon: Smartphone, label: 'Orange', color: 'text-orange-600' },
                    mtn_money: { icon: Smartphone, label: 'MTN', color: 'text-yellow-600' },
                    moor_money: { icon: Smartphone, label: 'Moor', color: 'text-blue-600' },
                    card: { icon: CreditCard, label: 'Carte', color: 'text-indigo-600' },
                    client_card: { icon: User, label: 'Client', color: 'text-teal-600' }
                  }).map(([method, config]) => {
                    const Icon = config.icon;
                    return (
                      <div key={method} className="flex items-center justify-between p-1 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-center flex-1">
                          <Icon className={`w-3 h-3 ${config.color}`} />
                          <span className="font-medium text-gray-800 ml-1 text-xs">{config.label}</span>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={closurePaymentMethods[method as keyof typeof closurePaymentMethods]}
                            onChange={(e) => onClosurePaymentMethodChange(method, e.target.value)}
                            className="w-14 px-1 py-0.5 border border-gray-300 rounded text-right font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                            min="0"
                            step="100"
                            placeholder="0"
                          />
                          <span className="text-xs text-gray-500 ml-1">FCFA</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total Recettes */}
                <div className="flex justify-between items-center p-1.5 bg-blue-50 rounded border border-blue-200 mt-2">
                  <div className="font-bold text-gray-900 text-xs">TOTAL RECETTES</div>
                  <div className="text-xs font-bold text-blue-900">
                    {cashierService.formatCurrency(totalRevenue)}
                  </div>
                </div>
              </div>

              {/* Retrait de caisse */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center">
                  <DollarSign className="mr-1.5 text-yellow-600" size={12} />
                  Retrait Caisse
                </h4>
                <div className="space-y-1.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Montant
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => onWithdrawalAmountChange(e.target.value)}
                        placeholder="0"
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium text-xs"
                        step="100"
                        min="0"
                      />
                      <span className="text-xs text-gray-500 ml-1">FCFA</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      Motif
                    </label>
                    <input
                      type="text"
                      value={withdrawalReason}
                      onChange={(e) => onWithdrawalReasonChange(e.target.value)}
                      placeholder="Dépense..."
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                    />
                  </div>
                  <button
                    onClick={onCashWithdrawal}
                    disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
                    className="w-full px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-xs"
                  >
                    Effectuer retrait
                  </button>
                </div>
              </div>
            </div>

            {/* Colonne droite - Décompte Espèces avec résumé en dessous */}
            <div className="space-y-3">
              {/* Décompte Espèces */}
              <div className="bg-white border border-gray-200 rounded p-2">
                <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center">
                  <Banknote className="mr-1.5 text-green-600" size={12} />
                  Décompte Espèces
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Billets */}
                  <div>
                    <h5 className="font-semibold text-gray-800 text-xs mb-1 flex items-center">
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
                        <div key={denomination} className="flex items-center justify-between p-1 bg-gray-50 rounded border border-gray-200">
                          <span className="font-medium text-gray-700 text-xs w-8">{label}</span>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={billsCount[denomination as keyof typeof billsCount] || 0}
                              onChange={(e) => handleBillsCountChange(denomination, parseInt(e.target.value) || 0)}
                              className="w-10 px-1 py-0.5 border border-gray-300 rounded text-center font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                            />
                            <span className="text-xs text-gray-600 w-12 text-right ml-1">
                              = {cashierService.formatCurrency(parseInt(denomination) * (billsCount[denomination as keyof typeof billsCount] || 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pièces */}
                  <div>
                    <h5 className="font-semibold text-gray-800 text-xs mb-1 flex items-center">
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
                        <div key={denomination} className="flex items-center justify-between p-1 bg-gray-50 rounded border border-gray-200">
                          <span className="font-medium text-gray-700 text-xs w-8">{label}</span>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              value={coinsCount[denomination as keyof typeof coinsCount] || 0}
                              onChange={(e) => handleCoinsCountChange(denomination, parseInt(e.target.value) || 0)}
                              className="w-10 px-1 py-0.5 border border-gray-300 rounded text-center font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                            />
                            <span className="text-xs text-gray-600 w-12 text-right ml-1">
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
                  <div className="flex justify-between items-center p-1 bg-green-50 rounded border border-green-200">
                    <span className="font-semibold text-green-800 text-xs">Total Billets:</span>
                    <span className="font-bold text-green-900 text-xs">
                      {cashierService.formatCurrency(billsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-1 bg-yellow-50 rounded border border-yellow-200">
                    <span className="font-semibold text-yellow-800 text-xs">Total Pièces:</span>
                    <span className="font-bold text-yellow-900 text-xs">
                      {cashierService.formatCurrency(coinsTotal)}
                    </span>
                  </div>
                </div>

                {/* Total et écart */}
                <div className="grid grid-cols-3 gap-1 p-1.5 bg-gray-50 rounded border border-gray-200 mt-2">
                  <div className="text-center">
                    <span className="block text-xs font-medium text-gray-700">Compté:</span>
                    <div className="text-xs font-bold text-green-600">
                      {cashierService.formatCurrency(totalCashCounted)}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-medium text-gray-700">Déclaré:</span>
                    <div className="text-xs font-bold text-blue-600">
                      {cashierService.formatCurrency(cashAmount)}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-medium text-gray-700">Écart:</span>
                    <div className={`text-xs font-bold ${
                      cashDiscrepancy === 0 ? 'text-green-600' :
                      cashDiscrepancy > 0 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {cashierService.formatCurrency(cashDiscrepancy)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Résumé Final, Commentaires et Boutons en dessous du décompte */}
              <div className="space-y-3">
                {/* Résumé Final */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <h4 className="font-bold text-gray-900 text-xs mb-2 flex items-center">
                    <Calculator className="mr-1.5 text-purple-600" size={12} />
                    Résumé Final
                  </h4>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">Recettes:</span>
                      <span className="font-bold text-gray-900 text-xs">
                        {cashierService.formatCurrency(totalRevenue)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-700">Retraits:</span>
                      <span className="font-bold text-red-600 text-xs">
                        -{cashierService.formatCurrency(parseFloat(withdrawalAmount) || 0)}
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-1 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-900">Solde:</span>
                        <span className="text-xs font-bold text-green-700">
                          {cashierService.formatCurrency(finalBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Commentaires */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <label className="block font-medium text-gray-700 text-xs mb-1">
                    Commentaires
                  </label>
                  <textarea
                    value={cashClosureData.comments}
                    onChange={(e) => onClosureCommentsChange(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none text-xs"
                    placeholder="Observations..."
                  />
                </div>

                {/* Boutons de finalisation */}
                <div className="bg-white border border-gray-200 rounded p-2">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={onClose}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium text-xs"
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
                        
                        console.log('Données de clôture:', closureData);
                        onFinalClosure(closureData);
                      }}
                      disabled={processingClosure}
                      className={`px-2 py-1 rounded font-medium text-xs flex items-center justify-center transition-colors ${
                        processingClosure
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {processingClosure ? (
                        <>
                          <Loader className="animate-spin mr-1" size={10} />
                          Traitement...
                        </>
                      ) : (
                        <>
                          <Archive className="mr-1" size={10} />
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
    </div>
  );
};

// Composant principal Cashier
const Cashier: React.FC = () => {
  const [isCashInitialized, setIsCashInitialized] = useState(false);
  const [cashFund, setCashFund] = useState(0);

  // États locaux pour la modal de clôture
  const [closurePaymentMethods, setClosurePaymentMethods] = useState({
    cash: '',
    wave: '',
    orange_money: '',
    mtn_money: '',
    moov_money: '',
    card: '',
    client_card: ''
  });

  // Gestionnaire de changement pour les méthodes de paiement dans la modal
  const handleClosurePaymentMethodChange = useCallback((method: string, value: string) => {
    setClosurePaymentMethods(prev => ({
      ...prev,
      [method]: value === '' ? '' : value
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

  // Gestion de l'initialisation de caisse
  const handleCashInitialization = useCallback((total: number, breakdown: any) => {
    setCashFund(total);
    setIsCashInitialized(true);
    showNotification('success', `Caisse initialisée avec ${cashierService.formatCurrency(total)}`);
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

  // Références et effets
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
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div className="grid grid-cols-2">
        <button
          onClick={() => setMobileView('products')}
          className={`flex flex-col items-center justify-center py-2 transition-colors ${
            mobileView === 'products' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
          }`}
        >
          <Package size={14} />
          <span className="text-xs mt-0.5">Produits</span>
        </button>
        <button
          onClick={() => setMobileView('cart')}
          className={`flex flex-col items-center justify-center py-2 transition-colors relative ${
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
      {/* Contenu principal */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-2 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Caisse</h1>
            <p className="text-xs text-gray-600">{currentCashRegister?.name || 'Principale'}</p>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={openCustomerModal}
              className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              title="Ajouter un client"
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
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow">
            <div className="p-2 space-y-1">
              <button 
                onClick={openBarcodeModal}
                className="w-full flex items-center justify-center py-1 bg-blue-600 text-white rounded"
              >
                <Scan size={12} className="mr-1" />
                Scanner
              </button>
              <button 
                onClick={openPaymentModal}
                disabled={cart.length === 0}
                className={`w-full flex items-center justify-center py-1 rounded ${
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
                className="w-full flex items-center justify-center py-1 border border-red-600 text-red-600 rounded"
              >
                <Archive size={12} className="mr-1" />
                Clôturer
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden max-w-7xl mx-auto lg:my-3">
        <div className="bg-white border-b border-gray-200 p-3 hidden lg:block">
          <h1 className="text-base font-bold text-gray-900">Caisse</h1>
          <p className="text-gray-600 text-xs mt-0.5">Scanner ou rechercher un produit</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Colonne gauche - Produits */}
          <div className={`p-2 lg:p-3 border-r border-gray-200 ${
            mobileView !== 'products' ? 'hidden lg:block' : 'block'
          }`}>
            <div className="mb-3 lg:mb-4">
              <h2 className="text-xs font-semibold text-gray-900 mb-1.5">Rechercher Produit</h2>
              <div className="flex gap-1">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nom ou code-barres"
                  className="flex-1 px-2 lg:px-2 py-1 lg:py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  onClick={openBarcodeModal}
                  className="px-2 lg:px-2 py-1 lg:py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center text-xs"
                >
                  <Scan size={12} className="mr-1" />
                  <span className="hidden sm:inline">Scanner</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-1 mt-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveCategory('')}
                  className={`px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
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
                    className={`px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1 lg:gap-1.5 mb-3">
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
              <div className="text-center py-3 lg:py-4">
                <Package className="mx-auto text-gray-400 mb-1.5" size={20} />
                <p className="text-gray-500 text-xs">
                  {searchTerm ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-1 text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Colonne droite - Panier */}
          <div className={`p-2 lg:p-3 bg-gray-50 ${
            mobileView !== 'cart' ? 'hidden lg:block' : 'block'
          }`}>
            <div className="mb-3 lg:mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-xs font-semibold text-gray-900">Client</h2>
                <button 
                  onClick={openCustomerModal}
                  className="px-1.5 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center text-xs"
                >
                  <User size={10} className="mr-0.5" />
                  Ajouter
                </button>
              </div>
              
              <div className="flex gap-1 mb-1.5">
                <input
                  type="text"
                  placeholder="Rechercher client..."
                  onChange={(e) => searchCustomers(e.target.value)}
                  className="flex-1 px-2 lg:px-2 py-1 lg:py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
              </div>
              
              {selectedCustomer && (
                <div className="p-1.5 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-blue-900 text-xs">
                        {selectedCustomer.user.first_name} {selectedCustomer.user.last_name}
                      </p>
                    </div>
                    <button
                      onClick={() => selectCustomer(null)}
                      className="text-blue-500 hover:text-blue-700 p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-3 lg:mb-4">
              <h2 className="text-xs font-semibold text-gray-900 mb-1.5">Commande</h2>
              
              <div className="grid grid-cols-4 gap-1 px-1 lg:px-1.5 py-1 border-b border-gray-200 text-xs font-semibold text-gray-600">
                <div>Produit</div>
                <div className="text-center">Qté</div>
                <div className="text-right">Prix U.</div>
                <div className="text-right">Total</div>
              </div>

              <div className="space-y-1 lg:space-y-1.5 mt-1.5 max-h-32 lg:max-h-48 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-3 text-gray-500">
                    <ShoppingCart className="mx-auto mb-1.5 text-gray-400" size={16} />
                    <p className="text-xs">Panier vide</p>
                    <p className="text-xs mt-0.5">Ajoutez des produits</p>
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

              <div className="border-t border-gray-200 my-1.5 lg:my-3"></div>

              <div className="bg-white rounded border border-gray-200 p-2 lg:p-3">
                <h2 className="text-xs font-semibold text-gray-900 mb-1.5">Résumé</h2>
                <div className="space-y-0.5">
                  <div className="flex justify-between text-gray-700 text-xs">
                    <span>Sous-total:</span>
                    <span>{cashierService.formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 text-xs">
                    <span>Taxes (20%):</span>
                    <span>{cashierService.formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold border-t border-gray-200 pt-1.5 mt-1.5">
                    <span>Total:</span>
                    <span className="text-gray-900">
                      {cashierService.formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    onClick={openPaymentModal}
                    className="w-full mt-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-semibold flex items-center justify-center text-xs"
                  >
                    <CreditCard size={12} className="mr-1" />
                    Payer
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded border border-gray-200 p-2 lg:p-3 hidden lg:block">
              <h2 className="text-xs font-semibold text-gray-900 mb-1.5">Actions</h2>
              <div className="space-y-1">
                <button 
                  onClick={openClosureModal}
                  className="w-full p-1.5 text-left rounded hover:bg-gray-50 transition-colors flex items-center text-red-600 text-xs"
                >
                  <Archive className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                  Clôturer
                </button>
                
                <button 
                  onClick={openPrintModal}
                  className="w-full p-1.5 text-left rounded hover:bg-gray-50 transition-colors flex items-center text-blue-600 text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileNavigation />

      <div className="fixed bottom-2 left-2 z-30 hidden lg:block">
        <button
          onClick={() => setIsCashInitialized(false)}
          className="px-1.5 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs font-medium"
          title="Réinitialiser"
        >
          Réinit.
        </button>
      </div>

      {/* Modal de scan code-barres */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded max-w-xs w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold">Scanner</h3>
              <button
                onClick={closeBarcodeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Barcode className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Code-barres..."
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAutoScan(e.currentTarget.value)}
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  autoFocus
                />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const input = barcodeInputRef.current?.value || '';
                    handleAutoScan(input);
                  }}
                  disabled={scanning}
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center text-xs"
                >
                  {scanning ? (
                    <>
                      <Loader className="animate-spin mr-1" size={10} />
                      Scan...
                    </>
                  ) : (
                    <>
                      <Scan size={10} className="mr-1" />
                      Scanner
                    </>
                  )}
                </button>
                
                <button
                  onClick={closeBarcodeModal}
                  className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded max-w-xs w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold">Client</h3>
              <button
                onClick={closeCustomerModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={12} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  onChange={(e) => searchCustomers(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  autoFocus
                />
              </div>

              <div className="max-h-32 overflow-y-auto">
                {customers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => selectCustomer(customer)}
                    className="w-full p-1.5 text-left hover:bg-gray-50 rounded border-b last:border-b-0"
                  >
                    <div className="font-medium text-xs">{customer.user.first_name} {customer.user.last_name}</div>
                    <div className="text-xs text-gray-500">{customer.user.phone}</div>
                  </button>
                ))}
                
                {customers.length === 0 && (
                  <div className="text-center py-2 text-gray-500">
                    <User className="mx-auto mb-1 text-gray-400" size={14} />
                    <p className="text-xs">Aucun client</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  selectCustomer(null);
                  closeCustomerModal();
                }}
                className="w-full py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs"
              >
                Aucun client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal des méthodes de paiement */}
      {isPaymentMethodsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b">
              <h3 className="text-sm font-semibold">Paiement</h3>
              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-3 overflow-y-auto max-h-[calc(80vh-45px)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                {paymentMethods.map(method => (
                  <PaymentMethodComponent
                    key={method.id}
                    method={method}
                    total={total}
                    onProcessPayment={processPayment}
                    processingPayment={processingPayment}
                    paymentAmounts={paymentAmounts}
                    paymentReferences={paymentReferences}
                    onAmountChange={handleAmountChange}
                    onReferenceChange={handleReferenceChange}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de clôture de caisse */}
      {isClosureModalOpen && (
        <ClosureModal
          onClose={closeClosureModal}
          paymentMethods={paymentMethods}
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
          cashierService={cashierService}
        />
      )}

      {/* Modal d'impression */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded max-w-xs w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold">Imprimer</h3>
              <button
                onClick={closePrintModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="space-y-2">
              <div className="bg-gray-50 p-2 rounded">
                <h4 className="font-medium mb-1 text-xs">Résumé:</h4>
                <div className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span>Articles:</span>
                    <span>{totalItems}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold">{cashierService.formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-1.5">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center text-xs"
                >
                  <Printer size={10} className="mr-1" />
                  Imprimer
                </button>
                
                <button
                  onClick={closePrintModal}
                  className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de retrait d'argent */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded max-w-xs w-full p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold">Retrait</h3>
              <button
                onClick={closeWithdrawalModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Montant
                </label>
                <input
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Motif
                </label>
                <input
                  type="text"
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  placeholder="Fond de caisse..."
                  className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                />
              </div>
              
              <div className="flex gap-1.5">
                <button
                  onClick={handleSimpleWithdrawal}
                  disabled={!withdrawalAmount || parseFloat(withdrawalAmount) <= 0}
                  className="flex-1 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-xs"
                >
                  <DollarSign size={10} className="mr-1" />
                  Retirer
                </button>
                
                <button
                  onClick={closeWithdrawalModal}
                  className="px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-xs"
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
          onClose={() => showNotification('info', '')}
        />
      )}
    </div>
  );
};

export default Cashier;