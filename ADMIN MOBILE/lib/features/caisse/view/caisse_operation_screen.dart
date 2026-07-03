// lib/features/caisse/view/caisse_operation_screen.dart

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:nsp_pos_mobile/core/widgets/numeric_keyboard.dart';
import 'package:nsp_pos_mobile/features/caisse/services/order_provider.dart';
import 'package:nsp_pos_mobile/features/caisse/view/payment_modal.dart';
import 'package:nsp_pos_mobile/features/caisse/view/orders_tab.dart';
import 'package:nsp_pos_mobile/features/caisse/view/products_search_sheet.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/cart_item.dart';

class CaisseOperationScreen extends StatefulWidget {
  final int storeId;
  final int employeeId;
  final int cashRegisterId;

  const CaisseOperationScreen({
    super.key,
    required this.storeId,
    required this.employeeId,
    required this.cashRegisterId,
  });

  @override
  State<CaisseOperationScreen> createState() => _CaisseOperationScreenState();
}

class _CaisseOperationScreenState extends State<CaisseOperationScreen>
    with SingleTickerProviderStateMixin {
  final TextEditingController _barcodeController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final FocusNode _barcodeFocusNode = FocusNode();
  final FocusNode _quantityFocusNode = FocusNode();

  CartItem? _selectedItem;
  String _currentQuantity = '1';
  bool _isQuantityEditing = false;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<CaisseProvider>(context, listen: false);
      provider.createNewSession(isAnonymous: true);
      FocusScope.of(context).requestFocus(_barcodeFocusNode);
    });

    _quantityFocusNode.addListener(_onQuantityFocusChange);
    _barcodeFocusNode.addListener(_onBarcodeFocusChange);
    _quantityController.addListener(_onQuantityTextChanged);
  }

  void _onTabChanged() {}

  void _onQuantityTextChanged() {
    if (_quantityController.text != _currentQuantity) {
      setState(() {
        _currentQuantity = _quantityController.text;
      });
    }
  }

  void _onQuantityFocusChange() {
    if (_quantityFocusNode.hasFocus) {
      setState(() {
        _isQuantityEditing = true;
      });
    }
  }

  void _onBarcodeFocusChange() {
    if (_barcodeFocusNode.hasFocus) {
      setState(() {
        _isQuantityEditing = false;
      });
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _barcodeController.dispose();
    _quantityController.dispose();
    _barcodeFocusNode.dispose();
    _quantityFocusNode.dispose();
    super.dispose();
  }

  void _onBarcodeScanned(String barcode) async {
    if (barcode.isEmpty) return;

    _barcodeController.clear();
    final provider = Provider.of<CaisseProvider>(context, listen: false);

    final variant = await provider.findProductByBarcode(
      widget.storeId,
      barcode,
    );

    if (variant != null) {
      if (!variant.isLinkedToStore) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Variante non liée à cette boutique'),
            backgroundColor: Colors.orange,
          ),
        );
        _barcodeFocusNode.requestFocus();
        return;
      }

      if (!variant.isInStock) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Stock insuffisant. Disponible: ${variant.effectiveQuantity}',
            ),
            backgroundColor: Colors.orange,
          ),
        );
        _barcodeFocusNode.requestFocus();
        return;
      }

      final price = variant.effectivePrice;
      final productName = variant.name;

      CartItem? existingItem;
      final session = provider.currentSession;
      if (session != null) {
        try {
          existingItem = session.cart.firstWhere(
            (item) => item.storeProductId == variant.storeProductId,
          );
        } catch (e) {
          existingItem = null;
        }
      }

      if (existingItem != null) {
        provider.updateItemQuantityInCurrentSession(
          existingItem,
          existingItem.quantity + 1,
        );
      } else {
        provider.addItemToCurrentSession(
          CartItem(
            storeProductId: variant.storeProductId!,
            productName: productName,
            unitPrice: price,
            quantity: 1,
            taxRate: 0,
            imageUrl: variant.imageUrl,
          ),
        );
      }

      setState(() {
        _currentQuantity = '1';
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${variant.name} ajouté au panier'),
          backgroundColor: Colors.green,
          duration: const Duration(milliseconds: 800),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Produit non trouvé'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 1),
        ),
      );
    }

    _barcodeFocusNode.requestFocus();
  }

  void _onNumericKeyPressed(String value) {
    if (_isQuantityEditing && _selectedItem != null) {
      setState(() {
        _currentQuantity = _currentQuantity + value;
      });
      _quantityController.text = _currentQuantity;
    } else {
      _barcodeController.text = _barcodeController.text + value;
    }
  }

  void _onNumericClear() {
    if (_isQuantityEditing && _selectedItem != null) {
      setState(() {
        _currentQuantity = '';
      });
      _quantityController.text = '';
    } else {
      _barcodeController.clear();
    }
  }

  void _onNumericDelete() {
    if (_isQuantityEditing && _selectedItem != null) {
      if (_currentQuantity.isNotEmpty) {
        setState(() {
          _currentQuantity = _currentQuantity.substring(
            0,
            _currentQuantity.length - 1,
          );
        });
        _quantityController.text = _currentQuantity;
      }
    } else {
      final text = _barcodeController.text;
      if (text.isNotEmpty) {
        _barcodeController.text = text.substring(0, text.length - 1);
      }
    }
  }

  void _validateAndApplyQuantity() {
    if (_quantityController.text.isNotEmpty) {
      setState(() {
        _currentQuantity = _quantityController.text;
      });
    }
    if (_selectedItem != null && _currentQuantity.isNotEmpty) {
      int newQuantity = int.tryParse(_currentQuantity) ?? 1;
      if (newQuantity <= 0) newQuantity = 1;

      final provider = Provider.of<CaisseProvider>(context, listen: false);
      provider.updateItemQuantityInCurrentSession(_selectedItem!, newQuantity);

      setState(() {
        _selectedItem = null;
        _currentQuantity = '1';
        _isQuantityEditing = false;
      });

      _barcodeFocusNode.requestFocus();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Quantité mise à jour : $newQuantity'),
          backgroundColor: Colors.green,
          duration: const Duration(milliseconds: 800),
        ),
      );
    }
  }

  void _cancelQuantityEdit() {
    setState(() {
      _selectedItem = null;
      _currentQuantity = '1';
      _isQuantityEditing = false;
    });
    _barcodeFocusNode.requestFocus();
  }

  void _onItemSelected(CartItem item) {
    setState(() {
      _selectedItem = item;
      _currentQuantity = item.quantity.toString();
      _quantityController.text = item.quantity.toString();
      _isQuantityEditing = true;
    });
    FocusScope.of(context).requestFocus(_quantityFocusNode);
  }

  void _clearCart() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Vider le panier'),
        content: const Text('Êtes-vous sûr de vouloir vider tout le panier ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              final provider = Provider.of<CaisseProvider>(
                context,
                listen: false,
              );
              provider.clearCurrentSessionCart();
              setState(() {
                _selectedItem = null;
                _currentQuantity = '1';
                _isQuantityEditing = false;
              });
              Navigator.pop(ctx);
              _barcodeFocusNode.requestFocus();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Vider'),
          ),
        ],
      ),
    );
  }

  void _proceedToPayment() {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final session = provider.currentSession;

    if (session == null || session.cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Panier vide'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => PaymentModal(
        total: session.total,
        onConfirm: (payments) async {
          for (var p in payments) {
            provider.addPaymentToCurrentSession(p['methodId'], p['amount']);
          }

          final currentSession = provider.currentSession;
          if (currentSession != null && currentSession.isFullyPaid) {
            final result = await provider.createSaleFromCurrentSession(
              widget.storeId,
              widget.employeeId,
              widget.cashRegisterId,
            );
            if (result['success']) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Vente enregistrée !'),
                    backgroundColor: Colors.green,
                  ),
                );
                Navigator.pop(context);
                setState(() {
                  _selectedItem = null;
                  _currentQuantity = '1';
                  _isQuantityEditing = false;
                });
                _barcodeFocusNode.requestFocus();
              }
            } else {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Erreur: ${result['message']}'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            }
          } else {
            final remaining = currentSession?.remaining ?? 0;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Montant insuffisant. Reste: ${remaining.toStringAsFixed(0)} FCFA',
                ),
                backgroundColor: Colors.orange,
              ),
            );
          }
        },
      ),
    ).then((_) {
      _barcodeFocusNode.requestFocus();
    });
  }

  void _createNewClientSession() {
    final provider = Provider.of<CaisseProvider>(context, listen: false);

    // Limiter à 3 sessions simultanées
    if (provider.sessions.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Limite de 3 clients simultanés atteinte'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Nouveau client'),
        content: TextField(
          decoration: const InputDecoration(
            labelText: 'Nom du client',
            border: OutlineInputBorder(),
          ),
          onSubmitted: (value) {
            if (value.isNotEmpty) {
              provider.createNewSession(clientName: value, isAnonymous: false);
              Navigator.pop(ctx);
              _barcodeFocusNode.requestFocus();
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () {
              provider.createNewSession(isAnonymous: true);
              Navigator.pop(ctx);
              _barcodeFocusNode.requestFocus();
            },
            child: const Text('Client anonyme'),
          ),
        ],
      ),
    ).then((_) {
      _barcodeFocusNode.requestFocus();
    });
  }

  void _openCloseScreen() {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final session = provider.session;

    if (session == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Aucune session de caisse active'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    Navigator.pushNamed(context, '/cashbox/close', arguments: session);
  }

  void _showProductSearch() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => ProductsSearchSheet(
        storeId: widget.storeId,
        onProductSelected: (variant) {
          // Ajouter le produit au panier
          final provider = Provider.of<CaisseProvider>(context, listen: false);

          if (!variant.isLinkedToStore) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Variante non liée à cette boutique'),
                backgroundColor: Colors.orange,
              ),
            );
            return;
          }

          if (!variant.isInStock) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Stock insuffisant. Disponible: ${variant.effectiveQuantity}',
                ),
                backgroundColor: Colors.orange,
              ),
            );
            return;
          }

          final price = variant.effectivePrice;
          final productName = variant.name;

          CartItem? existingItem;
          final session = provider.currentSession;
          if (session != null) {
            try {
              existingItem = session.cart.firstWhere(
                (item) => item.storeProductId == variant.storeProductId,
              );
            } catch (e) {
              existingItem = null;
            }
          }

          if (existingItem != null) {
            provider.updateItemQuantityInCurrentSession(
              existingItem,
              existingItem.quantity + 1,
            );
          } else {
            provider.addItemToCurrentSession(
              CartItem(
                storeProductId: variant.storeProductId!,
                productName: productName,
                unitPrice: price,
                quantity: 1,
                taxRate: 0,
                imageUrl: variant.imageUrl,
              ),
            );
          }

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${variant.name} ajouté au panier'),
              backgroundColor: Colors.green,
              duration: const Duration(milliseconds: 800),
            ),
          );
        },
      ),
    );
  }

  void _showSalesHistory() {
    // TODO: Implémenter l'historique des ventes
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        height: MediaQuery.of(context).size.height * 0.8,
        child: Column(
          children: [
            const Text(
              'Historique des ventes',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: 10,
                itemBuilder: (context, index) => ListTile(
                  title: Text(
                    'Vente #TKT-20260623-${index.toString().padLeft(4, '0')}',
                  ),
                  subtitle: Text(
                    '${index + 1} articles - ${DateTime.now().subtract(Duration(hours: index)).toString().substring(0, 16)}',
                  ),
                  trailing: Text('${1000 + index * 500} FCFA'),
                  onTap: () {
                    // TODO: Ouvrir le détail de la vente
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _closeClientSession() {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final session = provider.currentSession;

    if (session == null) return;

    if (session.cart.isNotEmpty && !session.isFullyPaid) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Fermer la session'),
          content: const Text(
            'Cette session a des articles non payés. Voulez-vous vraiment la fermer ?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              onPressed: () {
                provider.closeSession(session.id);
                Navigator.pop(ctx);
                _barcodeFocusNode.requestFocus();
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Fermer'),
            ),
          ],
        ),
      );
    } else {
      provider.closeSession(session.id);
      _barcodeFocusNode.requestFocus();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLarge = MediaQuery.of(context).size.width > 1000;

    return KeyboardListener(
      focusNode: FocusNode(),
      onKeyEvent: (event) {
        if (event is KeyDownEvent) {
          if (event.logicalKey == LogicalKeyboardKey.enter) {
            _validateAndApplyQuantity();
          } else if (event.logicalKey == LogicalKeyboardKey.escape) {
            _cancelQuantityEdit();
          }
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Caisse - Opération'),
          actions: [
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: _createNewClientSession,
              tooltip: 'Nouveau client',
            ),
            IconButton(
              icon: const Icon(Icons.lock_outline),
              onPressed: _openCloseScreen,
              tooltip: 'Clôturer la caisse',
            ),
          ],
        ),
        drawer: const SideMenu(),
        body: Consumer<CaisseProvider>(
          builder: (context, provider, child) {
            return Column(
              children: [
                // Tabs
                Container(
                  color: Colors.grey[100],
                  child: TabBar(
                    controller: _tabController,
                    labelColor: Colors.blue,
                    unselectedLabelColor: Colors.grey,
                    indicatorColor: Colors.blue,
                    tabs: [
                      const Tab(text: 'Vente'),
                      Tab(
                        child: Consumer<OrderProvider>(
                          builder: (context, provider, child) {
                            final count = provider.pendingOrdersCount;
                            return Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Commandes'),
                                if (count > 0) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(
                                      color: Colors.red,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Text(
                                      '$count',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            );
                          },
                        ),
                      ),
                      const Tab(text: 'Clients'),
                    ],
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      // Tab 0: Vente
                      _buildSalesTab(provider, isLarge),
                      // Tab 1: Commandes
                      OrdersTab(storeId: widget.storeId),
                      // Tab 2: Clients
                      _buildClientsTab(provider),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  // ============================================================================
  // TAB 0: VENTE
  // ============================================================================

  Widget _buildSalesTab(CaisseProvider provider, bool isLarge) {
    return Column(
      children: [
        _buildSessionTabs(provider),
        Expanded(
          child: isLarge
              ? Row(
                  children: [
                    Expanded(flex: 2, child: _buildCartList(provider)),
                    Expanded(flex: 1, child: _buildRightPanel(provider)),
                  ],
                )
              : Column(
                  children: [
                    Expanded(child: _buildCartList(provider)),
                    SizedBox(height: 450, child: _buildRightPanel(provider)),
                  ],
                ),
        ),
      ],
    );
  }

  // ============================================================================
  // TAB 2: CLIENTS
  // ============================================================================

  Widget _buildClientsTab(CaisseProvider provider) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Barre de recherche
          TextField(
            decoration: InputDecoration(
              hintText: 'Rechercher un client...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              filled: true,
              fillColor: Colors.grey[50],
            ),
            onChanged: (value) {
              // TODO: Rechercher des clients
            },
          ),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: 10,
              itemBuilder: (context, index) => Card(
                margin: const EdgeInsets.symmetric(vertical: 4),
                child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.person)),
                  title: Text('Client ${index + 1}'),
                  subtitle: Text('client${index + 1}@email.com'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Points: 150'),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.history, color: Colors.blue),
                        onPressed: () {
                          // TODO: Voir l'historique du client
                        },
                      ),
                    ],
                  ),
                  onTap: () {
                    // TODO: Sélectionner ce client pour la vente
                  },
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================================
  // SESSION TABS
  // ============================================================================

  Widget _buildSessionTabs(CaisseProvider provider) {
    if (provider.sessions.length <= 1) return const SizedBox.shrink();

    return Container(
      height: 50,
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
      ),
      child: Row(
        children: [
          Expanded(
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: provider.sessions.length,
              itemBuilder: (context, index) {
                final session = provider.sessions[index];
                final isSelected = provider.currentSession?.id == session.id;

                return GestureDetector(
                  onTap: () => provider.switchSession(session.id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    margin: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.blue : Colors.grey[200],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          session.clientName,
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.black,
                            fontWeight: isSelected
                                ? FontWeight.bold
                                : FontWeight.normal,
                          ),
                        ),
                        if (session.itemCount > 0) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 6,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected ? Colors.white : Colors.blue,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              '${session.itemCount}',
                              style: TextStyle(
                                fontSize: 11,
                                color: isSelected ? Colors.blue : Colors.white,
                              ),
                            ),
                          ),
                        ],
                        // Bouton fermer
                        const SizedBox(width: 4),
                        InkWell(
                          onTap: () {
                            if (session.id == provider.currentSession?.id) {
                              _closeClientSession();
                            } else {
                              provider.closeSession(session.id);
                            }
                          },
                          child: Icon(
                            Icons.close,
                            size: 16,
                            color: isSelected ? Colors.white70 : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          // Indicateur de limite
          if (provider.sessions.length >= 3)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: const Icon(Icons.warning, color: Colors.orange, size: 20),
            ),
        ],
      ),
    );
  }

  // ============================================================================
  // CART LIST
  // ============================================================================

  Widget _buildCartList(CaisseProvider provider) {
    final session = provider.currentSession;

    if (session == null || session.cart.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_cart, size: 80, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              'Panier vide',
              style: TextStyle(fontSize: 18, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Scannez un code-barres',
              style: TextStyle(color: Colors.grey[500]),
            ),
            // Boutons d'action
            const SizedBox(height: 24),
            Wrap(
              spacing: 12,
              children: [
                ElevatedButton.icon(
                  onPressed: _showProductSearch,
                  icon: const Icon(Icons.search),
                  label: const Text('Rechercher produit'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: _showSalesHistory,
                  icon: const Icon(Icons.history),
                  label: const Text('Anciennes ventes'),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: session.cart.length,
            itemBuilder: (context, index) {
              final item = session.cart[index];
              final isSelected = _selectedItem == item;

              return Card(
                elevation: isSelected ? 4 : 1,
                color: isSelected ? Colors.blue[50] : null,
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.white,
                    child: item.imageUrl != null
                        ? Image.network(
                            item.imageUrl!,
                            width: 40,
                            height: 40,
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => Text(
                              '${item.quantity}',
                              style: const TextStyle(color: Colors.blue),
                            ),
                          )
                        : Text(
                            '${item.quantity}',
                            style: const TextStyle(color: Colors.blue),
                          ),
                  ),
                  title: Text(
                    item.productName,
                    style: TextStyle(
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  subtitle: Text(
                    '${FormatUtils.formatCurrency(item.unitPrice, 'FCFA')} x ${item.quantity}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        FormatUtils.formatCurrency(item.total, 'FCFA'),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.delete_outline,
                          color: Colors.red,
                        ),
                        onPressed: () =>
                            provider.removeItemFromCurrentSession(item),
                      ),
                    ],
                  ),
                  onTap: () => _onItemSelected(item),
                ),
              );
            },
          ),
        ),
        // Boutons d'action en bas de la liste
        Padding(
          padding: const EdgeInsets.all(8),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ElevatedButton.icon(
                onPressed: _showProductSearch,
                icon: const Icon(Icons.search, size: 18),
                label: const Text('Rechercher'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                ),
              ),
              OutlinedButton.icon(
                onPressed: _showSalesHistory,
                icon: const Icon(Icons.history, size: 18),
                label: const Text('Historique'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ============================================================================
  // RIGHT PANEL
  // ============================================================================

  Widget _buildRightPanel(CaisseProvider provider) {
    final session = provider.currentSession;
    final total = session?.total ?? 0;

    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // Zone code-barres / quantité
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: _isQuantityEditing ? Colors.green[50] : Colors.blue[50],
              border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      _isQuantityEditing
                          ? Icons.numbers
                          : Icons.qr_code_scanner,
                      color: _isQuantityEditing ? Colors.green : Colors.blue,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _isQuantityEditing
                          ? 'MODIFICATION QUANTITÉ'
                          : 'CODE-BARRES',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _isQuantityEditing ? Colors.green : Colors.blue,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _isQuantityEditing
                    ? Container(
                        decoration: BoxDecoration(
                          color: Colors.green[100],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green, width: 2),
                        ),
                        child: TextField(
                          controller: _quantityController,
                          focusNode: _quantityFocusNode,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Saisir la quantité...',
                            border: InputBorder.none,
                            prefixIcon: const Icon(
                              Icons.numbers,
                              size: 28,
                              color: Colors.green,
                            ),
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 16,
                            ),
                          ),
                          onSubmitted: (value) {
                            _validateAndApplyQuantity();
                          },
                          onChanged: (value) {
                            setState(() {
                              _currentQuantity = value;
                            });
                          },
                        ),
                      )
                    : TextField(
                        controller: _barcodeController,
                        focusNode: _barcodeFocusNode,
                        autofocus: true,
                        style: const TextStyle(fontSize: 20),
                        decoration: InputDecoration(
                          hintText: 'Scanner ou saisir le code...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(
                            Icons.qr_code_scanner,
                            size: 28,
                          ),
                          suffixIcon: IconButton(
                            icon: const Icon(Icons.search, size: 28),
                            onPressed: () =>
                                _onBarcodeScanned(_barcodeController.text),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 16,
                          ),
                        ),
                        onSubmitted: _onBarcodeScanned,
                      ),
              ],
            ),
          ),

          // Article sélectionné avec boutons d'action
          if (_selectedItem != null && _isQuantityEditing)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.shopping_cart,
                        color: Colors.green,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _selectedItem!.productName,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        FormatUtils.formatCurrency(
                          _selectedItem!.unitPrice,
                          'FCFA',
                        ),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _cancelQuantityEdit,
                          icon: const Icon(Icons.close),
                          label: const Text('ANNULER'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.grey,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _validateAndApplyQuantity,
                          icon: const Icon(Icons.check_circle),
                          label: Text('VALIDER (${_currentQuantity})'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          // Total
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              border: Border(bottom: BorderSide(color: Colors.grey[300]!)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'TOTAL',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text(
                  FormatUtils.formatCurrency(total, 'FCFA'),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
          ),

          // Pavé numérique
          Expanded(
            child: NumericKeyboard(
              isQuantityMode: _isQuantityEditing && _selectedItem != null,
              onKeyPressed: _onNumericKeyPressed,
              onClear: _onNumericClear,
              onDelete: _onNumericDelete,
            ),
          ),

          // Boutons d'action
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey[300]!)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _clearCart,
                    icon: const Icon(Icons.delete_sweep),
                    label: const Text('VIDER PANIER'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _proceedToPayment,
                    icon: const Icon(Icons.payment),
                    label: const Text('PAYER'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
