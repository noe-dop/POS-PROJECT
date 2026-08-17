import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/core/widgets/numeric_keyboard.dart';
import 'package:nsp_pos_mobile/features/caisse/view/customer_list_tab.dart';
import 'package:nsp_pos_mobile/features/caisse/view/payment_modal.dart';
import 'package:nsp_pos_mobile/features/caisse/view/orders_tab.dart';
import 'package:nsp_pos_mobile/features/caisse/view/products_search_sheet.dart';
import 'package:nsp_pos_mobile/features/caisse/view/sales_history_sheet.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/client_session.dart';
import 'package:nsp_pos_mobile/features/customers/view/create_customer_dialog.dart';
import 'package:nsp_pos_mobile/features/orders/service/order_provider.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/cart_item.dart';

/// Écran principal d'opération de caisse.
///
/// Affiche trois onglets : "Vente" (scan/saisie code-barres, panier,
/// paiement), "Commandes" (via [OrdersTab]) et "Clients" (sélection ou
/// création d'un client rattaché à la session en cours). Gère également
/// les sessions clients multiples (jusqu'à 3 simultanées) et la saisie
/// au clavier physique/numérique pour le scan de code-barres et la
/// modification de quantité.
class CaisseOperationScreen extends StatefulWidget {
  /// Identifiant de la boutique pour laquelle la caisse est ouverte.
  final int storeId;

  /// Identifiant de l'employé opérant la caisse.
  final int employeeId;

  /// Identifiant du terminal de caisse (cash register) utilisé.
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

  /// Synchronise [_currentQuantity] avec le contenu du champ de saisie de
  /// quantité lorsqu'il est modifié par l'utilisateur.
  void _onQuantityTextChanged() {
    if (_quantityController.text != _currentQuantity) {
      setState(() {
        _currentQuantity = _quantityController.text;
      });
    }
  }

  /// Bascule l'écran en mode "modification de quantité" lorsque le champ
  /// correspondant reçoit le focus.
  void _onQuantityFocusChange() {
    if (_quantityFocusNode.hasFocus) {
      setState(() {
        _isQuantityEditing = true;
      });
    }
  }

  /// Bascule l'écran en mode "saisie code-barres" lorsque le champ
  /// correspondant reçoit le focus.
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

  /// Traite un code-barres scanné ou saisi manuellement : recherche la
  /// variante correspondante ([CaisseProvider.findProductByBarcode]),
  /// vérifie qu'elle est liée à la boutique et en stock, puis l'ajoute au
  /// panier de la session courante (ou incrémente la quantité si elle y
  /// figure déjà). Affiche un message d'erreur si le produit est
  /// introuvable, non lié à la boutique ou en rupture de stock.
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
            storeVariantId: variant.storeVariantId!,
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

  /// Ajoute [value] soit au champ de quantité (si en mode modification de
  /// quantité), soit au champ code-barres (sinon). Utilisé par le pavé
  /// numérique virtuel.
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

  /// Efface entièrement le champ actif (quantité ou code-barres).
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

  /// Supprime le dernier caractère du champ actif (quantité ou
  /// code-barres).
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

  /// Valide la quantité saisie pour [_selectedItem] et met à jour le
  /// panier via le provider. Réinitialise ensuite l'état de sélection et
  /// redonne le focus au champ code-barres.
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

  /// Annule la modification de quantité en cours et revient au mode
  /// saisie code-barres.
  void _cancelQuantityEdit() {
    setState(() {
      _selectedItem = null;
      _currentQuantity = '1';
      _isQuantityEditing = false;
    });
    _barcodeFocusNode.requestFocus();
  }

  /// Sélectionne un article du panier pour modification de sa quantité et
  /// donne le focus au champ de quantité.
  void _onItemSelected(CartItem item) {
    setState(() {
      _selectedItem = item;
      _currentQuantity = item.quantity.toString();
      _quantityController.text = item.quantity.toString();
      _isQuantityEditing = true;
    });
    FocusScope.of(context).requestFocus(_quantityFocusNode);
  }

  /// Affiche une boîte de dialogue de confirmation puis vide le panier de
  /// la session courante si l'utilisateur confirme.
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

  /// Ouvre la feuille modale de paiement pour la session courante.
  ///
  /// Si le panier est vide, affiche un avertissement et n'ouvre rien. À
  /// la confirmation du paiement, déclenche
  /// [CaisseProvider.createSaleFromCurrentSession] ; en cas de succès,
  /// ferme la session et réinitialise l'état de saisie ; en cas d'échec,
  /// affiche le message d'erreur dans la feuille modale.
  void _proceedToPayment() {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final session = provider.currentSession;

    if (session == null || session.cart.isEmpty) {
      NotificationService.showWarning(context, 'Panier vide');
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext modalContext) {
        final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

        return ScaffoldMessenger(
          key: scaffoldMessengerKey,
          child: Scaffold(
            backgroundColor: Colors.transparent,
            resizeToAvoidBottomInset: false, //évite le redimensionnement
            body: Center(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                constraints: BoxConstraints(
                  maxHeight:
                      MediaQuery.of(context).size.height *
                      0.85, // limite la hauteur
                  minHeight: 200,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: PaymentModal(
                  total: session.total,
                  scaffoldMessengerKey: scaffoldMessengerKey,
                  onConfirm: (payments) async {
                    final result = await provider.createSaleFromCurrentSession(
                      storeId: widget.storeId,
                      employeeId: widget.employeeId,
                      cashRegisterId: widget.cashRegisterId,
                      payments: payments,
                    );
                    if (result['success']) {
                      if (mounted) {
                        Navigator.pop(modalContext);
                        NotificationService.showSuccess(
                          context,
                          'Vente enregistrée !',
                        );
                        final sessionId = session.id;
                        provider.closeSession(sessionId);
                        setState(() {
                          _selectedItem = null;
                          _currentQuantity = '1';
                          _isQuantityEditing = false;
                        });
                        _barcodeFocusNode.requestFocus();
                      }
                    } else {
                      // Afficher dans le ScaffoldMessenger local
                      scaffoldMessengerKey.currentState?.showSnackBar(
                        SnackBar(
                          content: Text('Erreur: ${result['message']}'),
                          backgroundColor: Colors.red,
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                ),
              ),
            ),
          ),
        );
      },
    ).then((_) {
      _barcodeFocusNode.requestFocus();
    });
  }

  /// Crée une nouvelle session client, dans la limite de 3 sessions
  /// simultanées. Au-delà, affiche un avertissement.
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
    provider.createNewSession(isAnonymous: true);
    _barcodeFocusNode.requestFocus();
  }

  /// Ouvre l'écran de clôture de caisse pour la session de caisse
  /// principale en cours. Affiche une erreur si aucune caisse n'est
  /// active.
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

  /// Ouvre la feuille modale de recherche de produits et ajoute au panier
  /// de la session courante la variante sélectionnée par l'utilisateur.
  void _showProductSearch() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final double height = MediaQuery.of(context).size.height * 0.85;
        return Container(
          height: height,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Scaffold(
            resizeToAvoidBottomInset: false, // Pour eviter le redimensionnement
            backgroundColor: Colors.transparent, // optionnel
            body: ProductsSearchSheet(
              storeId: widget.storeId,
              onProductSelected: (variant) {
                // Ajouter le produit au panier
                final provider = Provider.of<CaisseProvider>(
                  context,
                  listen: false,
                );

                if (!variant.isLinkedToStore) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Variante non liée à cette boutique'),
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
                      (item) =>
                          item.storeProductId == variant.storeProductId &&
                          item.storeVariantId == variant.storeVariantId,
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
                      storeVariantId: variant.storeVariantId!,
                      productName: productName,
                      unitPrice: price,
                      quantity: 1,
                      taxRate: 0,
                      imageUrl: variant.imageUrl,
                    ),
                  );
                }
              },
            ),
          ),
        );
      },
    );
  }

  /// Ouvre la feuille modale de l'historique des ventes.
  void _showSalesHistory() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => const SalesHistorySheet(),
    ).then((_) {
      _barcodeFocusNode.requestFocus();
    });
  }

  /// Ferme la session client [sessionId]. Si son panier contient des
  /// articles non payés, demande une confirmation avant fermeture ;
  /// sinon, ferme directement.
  void _confirmCloseSession(String sessionId) {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final int sessionIndex = provider.sessions.indexWhere(
      (s) => s.id == sessionId,
    );
    if (sessionIndex < 0) return;
    final ClientSession session = provider.sessions[sessionIndex];

    // Vérifier si la session a des articles non payés
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
                provider.closeSession(sessionId);
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
      provider.closeSession(sessionId);
      _barcodeFocusNode.requestFocus();
    }
  }

  /// Affiche une confirmation puis relance la synchronisation des ventes
  /// en échec ([CaisseProvider.retryFailedEntries]). N'affiche rien si
  /// aucune vente n'est en échec.
  void _retryFailedEntries() {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    if (provider.failedCount == 0) {
      NotificationService.showInfo(
        context,
        'Aucune vente en échec à réessayer.',
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Réessayer les ventes en échec'),
        content: Text(
          'Vous avez ${provider.failedCount} vente(s) en échec. '
          'Voulez-vous les réessayer maintenant ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              // Afficher un indicateur de chargement
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Tentative de réessai en cours...'),
                  backgroundColor: Colors.blue,
                  behavior: SnackBarBehavior.floating,
                ),
              );
              await provider.retryFailedEntries();
              // Notification après la tentative (le provider affiche déjà des erreurs)
              _barcodeFocusNode.requestFocus();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            child: const Text('Réessayer tout'),
          ),
        ],
      ),
    );
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
            final error = provider.errorMessage;
            if (error != null && error.isNotEmpty) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                NotificationService.showError(context, error);
                provider.clearError(); // méthode à ajouter pour réinitialiser
              });
            }
            return Column(
              children: [
                _buildStatusBar(provider),
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
                      OrdersTab(
                        storeId: widget.storeId,
                        employeeId: widget.employeeId,
                        cashRegisterId: widget.cashRegisterId,
                      ),
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

  /// Construit la barre de statut (connectivité, ventes en attente/échec,
  /// bouton de synchronisation manuelle).
  Widget _buildStatusBar(CaisseProvider provider) {
    provider.getPendingOutboxCount();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      color: provider.isOnline ? Colors.green.shade50 : Colors.orange.shade50,
      child: Row(
        children: [
          Icon(
            provider.isOnline ? Icons.wifi : Icons.wifi_off,
            size: 16,
            color: provider.isOnline ? Colors.green : Colors.orange,
          ),
          const SizedBox(width: 6),
          Text(
            provider.isOnline ? 'En ligne' : 'Hors ligne',
            style: TextStyle(
              fontSize: 12,
              color: provider.isOnline ? Colors.green : Colors.orange,
            ),
          ),
          // Compteur pending
          if (provider.pendingSyncCount > 0) ...[
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '${provider.pendingSyncCount} en attente',
                style: TextStyle(fontSize: 11, color: Colors.blue.shade700),
              ),
            ),
          ],
          // Compteur failed (cliquable)
          if (provider.failedCount > 0) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _retryFailedEntries,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '${provider.failedCount} en échec',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.red.shade700,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.refresh, size: 12, color: Colors.red.shade700),
                  ],
                ),
              ),
            ),
          ],
          const Spacer(),
          if (provider.isSyncing)
            const SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          if (provider.isOnline && !provider.isSyncing)
            IconButton(
              icon: const Icon(Icons.sync, size: 18),
              onPressed: provider.refreshAllData,
              tooltip: 'Synchroniser',
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
        ],
      ),
    );
  }
  // ============================================================================
  // TAB 0: VENTE
  // ============================================================================

  /// Construit l'onglet "Vente" : liste des sessions clients, panier et
  /// panneau de saisie (code-barres, pavé numérique, total, paiement).
  /// La disposition passe en deux colonnes côte à côte sur grand écran
  /// ([isLarge]), en pile verticale sinon.
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

  /// Construit l'onglet "Clients" : liste des clients de la boutique et
  /// bouton de création d'un nouveau client.
  Widget _buildClientsTab(CaisseProvider provider) {
    return Column(
      children: [
        Expanded(
          child: CustomersListTab(
            storeId: widget.storeId,
            onCustomerSelected: (customerData) {
              final user = customerData['user'] ?? {};
              final name = user['full_name'] ?? 'Client';
              // Assigner à la session courante
              provider.assignCustomerToCurrentSession(customerData);
              NotificationService.showSuccess(
                context,
                'Client "$name" sélectionné',
                duration: Duration(milliseconds: 300),
              );
              _tabController.animateTo(0);
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => const CreateCustomerDialog(),
                );
              },
              icon: const Icon(Icons.add),
              label: const Text('Nouveau client'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ============================================================================
  // SESSION TABS
  // ============================================================================

  /// Construit la barre d'onglets horizontale des sessions clients
  /// (visible uniquement s'il y a plus d'une session active), avec
  /// indicateur du nombre d'articles par session et bouton de fermeture.
  Widget _buildSessionTabs(CaisseProvider provider) {
    /// Affichage des sessions clients creer
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
                      vertical: 6,
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
                            _confirmCloseSession(session.id);
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

  /// Construit la liste des articles du panier de la session courante,
  /// avec un état vide invitant à scanner ou rechercher un produit
  /// lorsqu'il n'y a aucun article.
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

  /// Construit le panneau latéral (ou inférieur, selon la disposition) :
  /// champ code-barres / quantité, résumé de l'article en cours de
  /// modification, total du panier, pavé numérique et boutons "Vider
  /// panier" / "Payer".
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
                          label: Text('VALIDER ($_currentQuantity)'),
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
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 35),
              child: NumericKeyboard(
                isQuantityMode: _isQuantityEditing && _selectedItem != null,
                onKeyPressed: _onNumericKeyPressed,
                onClear: _onNumericClear,
                onDelete: _onNumericDelete,
              ),
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
