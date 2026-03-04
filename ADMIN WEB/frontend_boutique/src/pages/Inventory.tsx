// src/pages/Inventory.tsx - VERSION AVEC BOUTON SUPPRIMER
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Eye, CheckCircle, AlertTriangle, 
  Play, Plus, Search, RefreshCw,
  Package, Loader2,
  AlertCircle, Trash2,
  Filter, History, Clock,
  ChevronDown, ChevronUp,
  TrendingUp, Edit,
  RotateCcw, X, Save, XSquare, Ban,
  Info, Download, ChevronLeft, ChevronRight,
  Menu
} from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { 
  InventoryUtils,
  type InventoryCount,
  type InventoryCountItem,
  type CreateInventoryPayload,
  type UpdateInventoryPayload,
  type InventoryStatus,
  type Store
} from '../services/inventoryService';

// =============================================================================
// TYPES
// =============================================================================

interface HistoryRecord {
  id: number;
  action: 'created' | 'started' | 'completed' | 'cancelled' | 'updated';
  action_label: string;
  inventory_reference: string;
  store_name: string;
  user_name: string;
  details?: string;
  timestamp: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'red' | 'yellow' | 'purple';
}

interface EditingInventory {
  id: number;
  reference: string;
  notes: string;
  status: InventoryStatus;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// =============================================================================
// COMPOSANTS UI
// =============================================================================

const StatusBadge: React.FC<{ status: InventoryStatus }> = ({ status }) => {
  const config = {
    planned: { label: 'Planifié', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
    in_progress: { label: 'En cours', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
    completed: { label: 'Terminé', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
    cancelled: { label: 'Annulé', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' }
  }[status] || config.planned;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      {config.label}
    </span>
  );
};

const ProgressBar: React.FC<{ 
  inventory: InventoryCount;
  items?: InventoryCountItem[];
}> = ({ inventory, items = [] }) => {
  const progress = useMemo(() => {
    if (inventory.status === 'completed') return 100;
    if (inventory.status === 'cancelled') return 0;
    if (items.length > 0) {
      const counted = items.filter(i => i.counted_quantity !== null).length;
      return Math.round((counted / items.length) * 100);
    }
    return inventory.status === 'in_progress' ? 50 : 0;
  }, [inventory, items]);

  const itemsCounted = items.filter(i => i.counted_quantity !== null).length;
  const discrepancies = items.filter(i => i.discrepancy !== 0).length;
  
  return (
    <div className="w-24 sm:w-32 lg:w-40">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{progress}%</span>
        <span className="hidden sm:inline">{itemsCounted}/{items.length}</span>
        <span className="sm:hidden">{itemsCounted}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
        <div 
          className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
            progress === 100 ? 'bg-green-500' : 
            progress >= 50 ? 'bg-blue-500' : 
            progress > 0 ? 'bg-yellow-500' : 
            'bg-gray-300'
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {discrepancies > 0 && (
        <div className="text-xs text-red-600 mt-1">
          ⚠️ {discrepancies}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}> = ({ title, value, icon, description, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700'
  };

  return (
    <div className={`border rounded-lg p-3 sm:p-4 ${colorClasses[color]} hover:shadow-sm transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs sm:text-sm font-medium opacity-75">{title}</p>
          <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-1.5 sm:p-2 rounded-lg bg-white">
          {icon}
        </div>
      </div>
      {description && (
        <p className="text-xs opacity-75 mt-2">{description}</p>
      )}
    </div>
  );
};

const SuccessMessage: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg animate-fadeIn">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
        <p className="text-green-700 text-sm">{message}</p>
      </div>
      <button onClick={onClose} className="text-green-500 hover:text-green-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const ErrorMessage: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <p className="text-red-700 text-sm">{message}</p>
      </div>
      <button onClick={onClose} className="text-red-500 hover:text-red-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const WarningMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div className="flex items-center gap-2">
      <Info className="h-5 w-5 text-yellow-500 flex-shrink-0" />
      <p className="text-yellow-700 text-sm">{message}</p>
    </div>
  </div>
);

const HistoryRow: React.FC<{ record: HistoryRecord }> = ({ record }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-2 sm:py-3 px-2 sm:px-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className={`p-1 sm:p-2 rounded-lg ${colorClasses[record.color]}`}>
            {record.icon}
          </div>
          <span className={`text-xs font-medium ${colorClasses[record.color].split(' ')[1]}`}>
            {record.action_label}
          </span>
        </div>
      </td>
      <td className="py-2 sm:py-3 px-2 sm:px-4">
        <div className="text-xs sm:text-sm font-medium">{record.inventory_reference}</div>
        <div className="text-xs text-gray-500 hidden sm:block">{record.store_name}</div>
      </td>
      <td className="py-2 sm:py-3 px-2 sm:px-4 hidden md:table-cell text-xs sm:text-sm">{record.user_name}</td>
      <td className="py-2 sm:py-3 px-2 sm:px-4 hidden lg:table-cell text-xs sm:text-sm max-w-xs truncate">{record.details}</td>
      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
        {new Date(record.timestamp).toLocaleDateString('fr-FR')}
      </td>
    </tr>
  );
};

// Version mobile de la ligne d'inventaire AVEC SUPPRIMER
const MobileInventoryCard: React.FC<{
  inventory: InventoryCount;
  items: InventoryCountItem[];
  onViewDetails: (id: number) => void;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  actionLoading: any;
}> = ({ inventory, items, onViewDetails, onStart, onComplete, onDelete, actionLoading }) => {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-3">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold">{inventory.reference}</div>
          <div className="text-sm text-gray-500">{inventory.store_name}</div>
        </div>
        <StatusBadge status={inventory.status} />
      </div>
      
      <div className="text-sm text-gray-600 mb-3">
        Date: {new Date(inventory.count_date).toLocaleDateString('fr-FR')}
      </div>
      
      <ProgressBar inventory={inventory} items={items} />
      
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <button 
          className="flex-1 py-2 text-blue-600 bg-blue-50 rounded-lg text-sm flex items-center justify-center gap-1"
          onClick={() => onViewDetails(inventory.id)}
        >
          <Eye className="h-4 w-4" />
          <span>Détails</span>
        </button>
        
        {inventory.status === 'planned' && (
          <button 
            className="flex-1 py-2 text-green-600 bg-green-50 rounded-lg text-sm flex items-center justify-center gap-1"
            onClick={() => onStart(inventory.id)}
            disabled={actionLoading.startingId === inventory.id}
          >
            {actionLoading.startingId === inventory.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>Démarrer</span>
          </button>
        )}
        
        {inventory.status === 'in_progress' && (
          <button 
            className="flex-1 py-2 text-green-600 bg-green-50 rounded-lg text-sm flex items-center justify-center gap-1"
            onClick={() => onComplete(inventory.id)}
            disabled={actionLoading.completingId === inventory.id}
          >
            {actionLoading.completingId === inventory.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>Terminer</span>
          </button>
        )}

        {/* Bouton Supprimer pour mobile */}
        <button 
          className="p-2 text-red-600 bg-red-50 rounded-lg"
          onClick={() => onDelete(inventory.id)}
          disabled={actionLoading.deletingId === inventory.id}
        >
          {actionLoading.deletingId === inventory.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};

const InventoryTableRow: React.FC<{
  inventory: InventoryCount;
  items: InventoryCountItem[];
  isEditing: boolean;
  editingData: EditingInventory | null;
  onEdit: (inventory: InventoryCount) => void;
  onSave: () => void;
  onCancel: () => void;
  onViewDetails: (id: number) => void;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
  onCancelInventory: (id: number) => void;
  onDelete: (id: number) => void;
  onVerifyItem: (inventoryId: number, itemId: number) => void;
  actionLoading: any;
  setEditingData: (data: any) => void;
  selectedInventory: number | null;
}> = ({
  inventory,
  items,
  isEditing,
  editingData,
  onEdit,
  onSave,
  onCancel,
  onViewDetails,
  onStart,
  onComplete,
  onCancelInventory,
  onDelete,
  onVerifyItem,
  actionLoading,
  setEditingData,
  selectedInventory
}) => {
  return (
    <React.Fragment>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm font-medium text-gray-900">{inventory.id}</td>
        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
          {isEditing ? (
            <input
              type="text"
              value={editingData?.reference || ''}
              onChange={(e) => setEditingData({ ...editingData, reference: e.target.value })}
              className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            inventory.reference
          )}
        </td>
        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">{inventory.store_name}</td>
        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
          {new Date(inventory.count_date).toLocaleDateString('fr-FR')}
        </td>
        <td className="px-4 sm:px-6 py-3 sm:py-4">
          {isEditing ? (
            <select
              value={editingData?.status || 'planned'}
              onChange={(e) => setEditingData({ ...editingData, status: e.target.value as InventoryStatus })}
              className="px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="planned">Planifié</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
              <option value="cancelled">Annulé</option>
            </select>
          ) : (
            <StatusBadge status={inventory.status} />
          )}
        </td>
        <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 max-w-xs truncate hidden xl:table-cell">
          {isEditing ? (
            <textarea
              value={editingData?.notes || ''}
              onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })}
              className="w-full px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          ) : (
            inventory.notes || '-'
          )}
        </td>
        <td className="px-4 sm:px-6 py-3 sm:py-4">
          <ProgressBar inventory={inventory} items={items} />
        </td>
        <td className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              className="p-1 sm:p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Voir les détails"
              onClick={() => onViewDetails(inventory.id)}
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>

            {isEditing ? (
              <>
                <button 
                  className="p-1 sm:p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Sauvegarder"
                  onClick={onSave}
                  disabled={actionLoading.updatingId === inventory.id}
                >
                  {actionLoading.updatingId === inventory.id ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </button>
                <button 
                  className="p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Annuler"
                  onClick={onCancel}
                >
                  <XSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : (
              <>
                <button 
                  className="p-1 sm:p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Modifier"
                  onClick={() => onEdit(inventory)}
                  disabled={actionLoading.updatingId !== null}
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>

                {inventory.status === 'planned' && (
                  <button 
                    className="p-1 sm:p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Démarrer"
                    onClick={() => onStart(inventory.id)}
                    disabled={actionLoading.startingId === inventory.id}
                  >
                    {actionLoading.startingId === inventory.id ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                )}

                {inventory.status === 'in_progress' && (
                  <button 
                    className="p-1 sm:p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Terminer"
                    onClick={() => onComplete(inventory.id)}
                    disabled={actionLoading.completingId === inventory.id}
                  >
                    {actionLoading.completingId === inventory.id ? (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                  </button>
                )}

                {/* Bouton Supprimer pour desktop */}
                <button 
                  className="p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                  onClick={() => onDelete(inventory.id)}
                  disabled={actionLoading.deletingId === inventory.id}
                >
                  {actionLoading.deletingId === inventory.id ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      
      {/* Détails de l'inventaire */}
      {selectedInventory === inventory.id && (
        <tr>
          <td colSpan={8} className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50">
            <div className="border-t border-gray-200 pt-3 sm:pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Articles
                {actionLoading.loadingItems === inventory.id && (
                  <Loader2 className="h-3 w-3 animate-spin ml-2" />
                )}
              </h4>
              
              {items.length > 0 ? (
                <div className="space-y-2 sm:space-y-0">
                  {/* Version mobile des articles */}
                  <div className="block sm:hidden">
                    {items.map((item) => (
                      <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                        <div className="flex justify-between mb-2">
                          <div className="font-medium text-sm">{item.product_name}</div>
                          <button 
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            onClick={() => onVerifyItem(inventory.id, item.id)}
                            disabled={actionLoading.counting === item.id || item.counted_quantity !== null}
                          >
                            {actionLoading.counting === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>Att: {item.expected_quantity}</div>
                          <div>Compté: {item.counted_quantity ?? '-'}</div>
                          <div className={item.discrepancy > 0 ? 'text-green-600' : item.discrepancy < 0 ? 'text-red-600' : ''}>
                            Écart: {item.discrepancy}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Version desktop des articles */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="py-2 text-left">Produit</th>
                          <th className="py-2 text-left">SKU</th>
                          <th className="py-2 text-left">Qté attendue</th>
                          <th className="py-2 text-left">Qté comptée</th>
                          <th className="py-2 text-left">Écart</th>
                          <th className="py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="py-2">
                              <div className="font-medium">{item.product_name}</div>
                              {item.variant_name && (
                                <div className="text-xs text-gray-500">{item.variant_name}</div>
                              )}
                            </td>
                            <td className="py-2 text-xs text-gray-500">{item.product_sku || '-'}</td>
                            <td className="py-2">{item.expected_quantity}</td>
                            <td className="py-2">
                              {item.counted_quantity !== null ? item.counted_quantity : '-'}
                            </td>
                            <td className="py-2">
                              <span className={
                                item.discrepancy > 0 ? 'text-green-600' :
                                item.discrepancy < 0 ? 'text-red-600' : ''
                              }>
                                {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                              </span>
                            </td>
                            <td className="py-2">
                              <button 
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                onClick={() => onVerifyItem(inventory.id, item.id)}
                                disabled={actionLoading.counting === item.id || item.counted_quantity !== null}
                              >
                                {actionLoading.counting === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">Aucun article</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

const LoadingState: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex items-center justify-center">
    <div className="text-center max-w-md w-full">
      <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-blue-600 mx-auto mb-4" />
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Chargement</h3>
      <p className="text-sm sm:text-base text-gray-600">Récupération des données...</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventaire</h1>
    </div>
    <div className="p-4 sm:p-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-12 text-center">
        <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Aucun inventaire</h2>
        <p className="text-sm sm:text-base text-gray-500 mb-6">Créez votre premier inventaire</p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm sm:text-base"
        >
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          Rafraîchir
        </button>
      </div>
    </div>
  </div>
);

const Filters: React.FC<{
  filters: { status: string; store: number | 'all'; search: string };
  stores: Store[];
  onFilterChange: (filters: any) => void;
  onReset: () => void;
  onRefresh: () => void;
  loading: boolean;
}> = ({ filters, stores, onFilterChange, onReset, onRefresh, loading }) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <div className="mb-4 sm:mb-6 bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtres</span>
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button 
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Version desktop */}
      <div className="hidden sm:grid sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value })}
        >
          <option value="all">Tous statuts</option>
          <option value="planned">Planifié</option>
          <option value="in_progress">En cours</option>
          <option value="completed">Terminé</option>
        </select>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={filters.store}
          onChange={(e) => onFilterChange({ store: e.target.value === 'all' ? 'all' : parseInt(e.target.value) })}
        >
          <option value="all">Tous magasins</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* Version mobile */}
      {showMobileFilters && (
        <div className="sm:hidden space-y-3 mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
            />
          </div>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
          >
            <option value="all">Tous statuts</option>
            <option value="planned">Planifié</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminé</option>
          </select>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={filters.store}
            onChange={(e) => onFilterChange({ store: e.target.value === 'all' ? 'all' : parseInt(e.target.value) })}
          >
            <option value="all">Tous magasins</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
        </div>
      )}
    </div>
  );
};

const InventoryForm: React.FC<{
  stores: Store[];
  onSubmit: (data: CreateInventoryPayload) => void;
  loading: boolean;
}> = ({ stores, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    reference: '',
    store: 0,
    count_date: new Date().toISOString().slice(0, 16),
    status: 'planned' as InventoryStatus,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reference.trim() || formData.store === 0) return;
    onSubmit(formData);
    setFormData({
      reference: '',
      store: 0,
      count_date: new Date().toISOString().slice(0, 16),
      status: 'planned',
      notes: ''
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Nouvel Inventaire</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">Référence *</label>
            <input
              type="text"
              placeholder="INV-2024-001"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">Magasin *</label>
            <select
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={formData.store}
              onChange={(e) => setFormData({ ...formData, store: parseInt(e.target.value) })}
              required
            >
              <option value={0}>Sélectionner</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">Date début *</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={formData.count_date}
              onChange={(e) => setFormData({ ...formData, count_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">Statut</label>
            <select
              className="w-full px-3 py-2 border rounded-lg text-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as InventoryStatus })}
            >
              <option value="planned">Planifié</option>
              <option value="in_progress">En cours</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1 block">Notes</label>
          <textarea
            placeholder="Notes..."
            className="w-full px-3 py-2 border rounded-lg text-sm"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>
        
        <button 
          type="submit"
          disabled={loading || !formData.reference.trim() || formData.store === 0}
          className="mt-4 w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {loading ? 'Création...' : 'Créer'}
        </button>
      </form>
    </div>
  );
};

const Pagination: React.FC<{
  pagination: PaginationState;
  onPageChange: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-sm text-gray-500 order-2 sm:order-1">
        Page {pagination.page} / {totalPages}
      </p>
      <div className="flex gap-2 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= totalPages}
          className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

const InventoryPage: React.FC = () => {
  const {
    inventories,
    stats,
    stores,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    refresh,
    createInventory,
    updateInventory,
    startCounting,
    completeInventory,
    cancelInventory,
    deleteInventory,
    loadInventoryItems,
    updateInventoryItem,
    actionLoading,
    successMessage,
    errorMessage,
    setSuccessMessage,
    setErrorMessage,
    getInventoryById,
    getInventoryItems
  } = useInventory();

  const [editingInventory, setEditingInventory] = useState<EditingInventory | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [selectedInventory, setSelectedInventory] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0
  });
  const [isMobile, setIsMobile] = useState(false);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setPagination(prev => ({ ...prev, total: inventories.length }));
  }, [inventories]);

  // Génération historique
  useEffect(() => {
    const records: HistoryRecord[] = [];
    inventories.slice(0, 20).forEach(inv => {
      records.push({
        id: inv.id * 100 + 1,
        action: 'created',
        action_label: 'Création',
        inventory_reference: inv.reference,
        store_name: inv.store_name || 'Magasin inconnu',
        user_name: inv.created_by ? `#${inv.created_by}` : 'Système',
        details: `Statut: ${inv.status}`,
        timestamp: inv.created_at,
        icon: <Plus className="h-3 w-3" />,
        color: 'green'
      });
      if (inv.started_at) {
        records.push({
          id: inv.id * 100 + 2,
          action: 'started',
          action_label: 'Démarrage',
          inventory_reference: inv.reference,
          store_name: inv.store_name || 'Magasin inconnu',
          user_name: 'Opérateur',
          details: 'Comptage démarré',
          timestamp: inv.started_at,
          icon: <Play className="h-3 w-3" />,
          color: 'blue'
        });
      }
      if (inv.completed_at) {
        const items = getInventoryItems(inv.id);
        const disc = items.filter(i => i.discrepancy !== 0).length;
        records.push({
          id: inv.id * 100 + 3,
          action: 'completed',
          action_label: 'Terminaison',
          inventory_reference: inv.reference,
          store_name: inv.store_name || 'Magasin inconnu',
          user_name: 'Superviseur',
          details: disc ? `${disc} écart(s)` : 'Aucun écart',
          timestamp: inv.completed_at,
          icon: <CheckCircle className="h-3 w-3" />,
          color: disc ? 'red' : 'green'
        });
      }
    });
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setHistory(records);
  }, [inventories, getInventoryItems]);

  const handleCreateInventory = useCallback(async (data: CreateInventoryPayload) => {
    try { await createInventory(data); } catch (error: any) { setErrorMessage(error.message); }
  }, [createInventory]);

  const handleEditInventory = useCallback((inv: InventoryCount) => {
    setEditingInventory({ id: inv.id, reference: inv.reference, notes: inv.notes || '', status: inv.status });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingInventory) return;
    try {
      await updateInventory(editingInventory.id, {
        reference: editingInventory.reference,
        notes: editingInventory.notes,
        status: editingInventory.status
      });
      setEditingInventory(null);
    } catch (error: any) { setErrorMessage(error.message); }
  }, [editingInventory, updateInventory]);

  const handleViewDetails = useCallback(async (id: number) => {
    if (selectedInventory === id) {
      setSelectedInventory(null);
    } else {
      setSelectedInventory(id);
      await loadInventoryItems(id);
    }
  }, [selectedInventory, loadInventoryItems]);

  const handleVerifyItem = useCallback(async (invId: number, itemId: number) => {
    const item = getInventoryItems(invId).find(i => i.id === itemId);
    if (item) {
      try {
        await updateInventoryItem(itemId, item.expected_quantity);
        setSuccessMessage('Article vérifié');
      } catch (error: any) { setErrorMessage(error.message); }
    }
  }, [getInventoryItems, updateInventoryItem]);

  const handleDelete = useCallback(async (id: number) => {
    if (window.confirm('Supprimer cet inventaire ?')) {
      try {
        await deleteInventory(id);
        setSuccessMessage('Inventaire supprimé');
      } catch (error: any) {
        setErrorMessage(error.message);
      }
    }
  }, [deleteInventory]);

  const paginatedInventories = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return inventories.slice(start, start + pagination.pageSize);
  }, [inventories, pagination.page, pagination.pageSize]);

  if (loading && inventories.length === 0 && !error) return <LoadingState />;
  if (!loading && inventories.length === 0 && !error) return <EmptyState onRefresh={refresh} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventaire</h1>
          <button 
            onClick={() => alert('Export à implémenter')}
            className="p-2 sm:px-4 sm:py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-6">
        {successMessage && <SuccessMessage message={successMessage} onClose={() => setSuccessMessage(null)} />}
        {errorMessage && <ErrorMessage message={errorMessage} onClose={() => setErrorMessage(null)} />}
        {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
            <StatCard title="EN COURS" value={stats.in_progress_inventories} icon={<Package className="h-4 w-4 sm:h-6 sm:w-6" />} />
            <StatCard title="TERMINÉS" value={stats.completed_inventories} icon={<CheckCircle className="h-4 w-4 sm:h-6 sm:w-6" />} color="green" />
            <StatCard title="ÉCARTS" value={stats.total_discrepancies} icon={<AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6" />} color="red" />
            <StatCard title="RÉCENTS" value={stats.recent_inventories_count} icon={<TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />} color="purple" />
          </div>
        )}

        <Filters
          filters={filters}
          stores={stores}
          onFilterChange={setFilters}
          onReset={resetFilters}
          onRefresh={refresh}
          loading={loading}
        />

        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Inventaires ({inventories.length})</h3>
            <select
              value={pagination.pageSize}
              onChange={(e) => setPagination({ page: 1, pageSize: parseInt(e.target.value), total: inventories.length })}
              className="text-sm border rounded-lg px-2 py-1"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>

          {/* Version mobile : cartes avec bouton supprimer */}
          {isMobile ? (
            <div className="space-y-3">
              {paginatedInventories.map(inv => (
                <MobileInventoryCard
                  key={inv.id}
                  inventory={inv}
                  items={getInventoryItems(inv.id)}
                  onViewDetails={handleViewDetails}
                  onStart={startCounting}
                  onComplete={completeInventory}
                  onDelete={handleDelete}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          ) : (
            /* Version desktop : tableau avec bouton supprimer */
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Réf</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Magasin</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">Date</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Statut</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 hidden xl:table-cell">Notes</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Progression</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedInventories.map(inv => (
                      <InventoryTableRow
                        key={inv.id}
                        inventory={inv}
                        items={getInventoryItems(inv.id)}
                        isEditing={editingInventory?.id === inv.id}
                        editingData={editingInventory}
                        onEdit={handleEditInventory}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingInventory(null)}
                        onViewDetails={handleViewDetails}
                        onStart={startCounting}
                        onComplete={completeInventory}
                        onCancelInventory={cancelInventory}
                        onDelete={handleDelete}
                        onVerifyItem={handleVerifyItem}
                        actionLoading={actionLoading}
                        setEditingData={setEditingInventory}
                        selectedInventory={selectedInventory}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Pagination pagination={pagination} onPageChange={(page) => setPagination({ ...pagination, page })} />
        </div>

        {/* Historique (caché sur mobile par défaut) */}
        <div className="hidden sm:block mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <History className="h-4 w-4" /> Historique
            </h3>
            <button onClick={() => setShowHistory(!showHistory)} className="p-1 hover:bg-gray-100 rounded-lg">
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          {showHistory && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {history.length === 0 ? (
                <div className="p-8 text-center">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun historique</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Action</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Inventaire</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Utilisateur</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 hidden lg:table-cell">Détails</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {history.slice(0, 5).map(r => <HistoryRow key={r.id} record={r} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <InventoryForm stores={stores} onSubmit={handleCreateInventory} loading={actionLoading.creating} />

        <footer className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
            © {new Date().getFullYear()} Inventaire & Appro
          </p>
        </footer>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default InventoryPage;