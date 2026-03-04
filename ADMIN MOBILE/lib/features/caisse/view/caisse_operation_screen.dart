
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import '../services/caisse_service.dart';

class CaisseOperationScreen extends StatefulWidget {
  const CaisseOperationScreen({super.key});

  @override
  State<CaisseOperationScreen> createState() => _CaisseOperationScreenState();
}

class _CaisseOperationScreenState extends State<CaisseOperationScreen> {
  final CaisseService _caisseService = CaisseService();
  Size size = Size.zero;
  int _selectedTab = 0; // 0: Transactions, 1: Clients, 2: Ventes

  String _searchQuery = '';
  String _searchClient = '';

  final TextEditingController _paymentController = TextEditingController();
  double _amountReceived = 0.0;
  String _selectedPaymentMethod = 'Espèces';

  // Variable pour le filtrage (null = tous les produits)
  String? _selectedFilter;

  // Getter pour extraire les types uniques des produits
  List<String> get _productTypes {
    // Récupérer tous les types
    final allTypes = _listProduits.map((p) => p["type"].toString()).toList();

    // Ajouter "Tous" au début et supprimer les doublons
    final uniqueTypes = allTypes.toSet().toList()..sort();

    // Retourner avec "Tous" en premier
    return ['Tous'] + uniqueTypes;
  }

  // Getter pour les produits filtrés
  List<Map<String, dynamic>> get _filteredProducts {
    if (_selectedFilter == null || _selectedFilter == 'Tous') {
      return _listProduits;
    }
    return _listProduits
        .where((product) => product["type"] == _selectedFilter)
        .toList();
  }

  // Données de test
  final List<Map<String, dynamic>> _sampleProducts = [
    {
      'name': 'Ordinateur Portable XPS',
      'quantity': 1,
      'unitPrice': 1200.00,
      'total': 1200.00,
    },
    {
      'name': 'Souris Optique Sans Fil',
      'quantity': 2,
      'unitPrice': 25.50,
      'total': 51.00,
    },
    {
      'name': 'Clavier Mécanique RGB',
      'quantity': 1,
      'unitPrice': 89.99,
      'total': 89.99,
    },
    {
      'name': 'Écran 27 pouces 4K',
      'quantity': 1,
      'unitPrice': 349.99,
      'total': 349.99,
    },
  ];

  final List<Map<String, dynamic>> _paymentMethods = [
    {'id': 'cash', 'name': 'Espèces', 'icon': Icons.money},
    {'id': 'wave', 'name': 'Wave', 'icon': Icons.account_balance_wallet},
    {'id': 'orange', 'name': 'Orange Money', 'icon': Icons.phone_android},
    {'id': 'mtn', 'name': 'MTN money', 'icon': Icons.phone_iphone},
    {'id': 'card', 'name': 'Carte bancaire', 'icon': Icons.credit_card},
    {'id': 'client', 'name': 'Carte Client', 'icon': Icons.card_membership},
  ];
  final List<Map<String, dynamic>> _listProduits = [
    {
      "name": 'Bonnet rouge sachet 10g',
      "type": "Milk",
      "price": 100,
      "stock": 219,
      "image_url":
          "https://openmoise.ci/web/image/product.product/87758/image_1024/BONNET%20ROUGE%20EN%20POUDRE%20SACHET%2010GRS%20ROUGE?unique=9c73c33",
    },
    {
      "name": "Riz maman 4.5kg",
      "type": "Rice",
      'price': 600,
      "stock": 46,
      "image_url":
          "http://majordservices.com/586-large_default/riz-maman-45kg.jpg",
    },
    {
      "name": "Laity Sachet 360g",
      "type": "Milk",
      "price": 1200,
      "stock": 9,
      "image_url":
          "https://ci.jumia.is/unsafe/fit-in/680x680/filters:fill(white)/product/16/96844/1.jpg?5618",
    },
    {
      "name": "Yoplait vanille sachet 125g",
      "type": "Yogourt",
      "price": 250,
      'stock': 15,
      "image_url":
          "https://www.eurolait.ci/img/products/GamYY/3d-vanille-yayoyo.jpg",
    },
    {
      "name": "Yoplait nature sucré boîte 125g",
      "type": "Yogourt",
      'price': 300,
      'stock': 3,
      "image_url": "https://www.eurolait.ci/img/products/GamNA/Nature.jpg",
    },
    {
      "name": "Sardine princesse 125g",
      "type": "sardine",
      "price": 500,
      "stock": 1,
      "image_url":
          "https://sp-ao.shortpixel.ai/client/to_webp,q_glossy,ret_img,w_500,h_500/https://ghfruit.com/wp-content/uploads/2021/06/Princesse-Sardine-in-vegetable-Oil.jpg",
    },
    {
      "name": "Celeste eau minerale 330ml",
      "type": "water",
      "price": 100,
      "stock": 0,
      "image_url":
          "https://www.librairiedefrance.net/97815-large_default/celeste-eau-min%C3%A9rale-naturelle-bouteille-330ml.jpg",
    },
    {
      "name": "Kirène 0.5cl",
      "type": "water",
      "price": 100,
      "stock": 6,
      "image_url":
          "https://www.auchan.sn/624440-large_default/eau-minerale-kirene-330ml.jpg",
    },
    {
      "name": 'Bonnet rouge sachet 10g',
      "type": "Milk",
      "price": 100,
      "stock": 219,
      "image_url":
          "https://openmoise.ci/web/image/product.product/87758/image_1024/BONNET%20ROUGE%20EN%20POUDRE%20SACHET%2010GRS%20ROUGE?unique=9c73c33",
    },
    {
      "name": "Celeste eau minerale 330ml",
      "type": "water",
      "price": 100,
      "stock": 0,
      "image_url":
          "https://www.librairiedefrance.net/97815-large_default/celeste-eau-min%C3%A9rale-naturelle-bouteille-330ml.jpg",
    },
  ];

  // Liste pour stocker les controllers de quantité PAR PRODUIT
  final Map<int, TextEditingController> _productControllers = {};
  // Méthode pour initialiser/réinitialiser les controllers
  void _initializeProductControllers() {
    // Nettoyer les anciens controllers
    _productControllers.forEach((_, controller) => controller.dispose());
    _productControllers.clear();

    // Créer un controller pour chaque produit
    for (int i = 0; i < _sampleProducts.length; i++) {
      final controller = TextEditingController(
        text: _sampleProducts[i]['quantity'].toString(),
      );

      // Ajouter un listener pour mettre à jour automatiquement
      controller.addListener(() {
        _onQuantityChanged(i, controller);
      });

      _productControllers[i] = controller;
    }
  }

  // Listener pour les changements de quantité
  void _onQuantityChanged(int index, TextEditingController controller) {
    final text = controller.text.trim();

    if (text.isEmpty) {
      return; // Ne rien faire si vide
    }

    final quantity = int.tryParse(text) ?? 1;
    final clampedQuantity = quantity.clamp(1, 999);

    // Mettre à jour seulement si la valeur a changé
    if (_sampleProducts[index]['quantity'] != clampedQuantity) {
      _updateProductQuantity(index, clampedQuantity, updateController: false);
    }
  }

  // Méthode pour mettre à jour la quantité
  void _updateProductQuantity(
    int index,
    int newQuantity, {
    bool updateController = true,
  }) {
    if (newQuantity < 1) newQuantity = 1;
    if (newQuantity > 999) newQuantity = 999;

    if (_sampleProducts[index]['quantity'] == newQuantity) {
      return; // Pas de changement nécessaire
    }

    setState(() {
      _sampleProducts[index]['quantity'] = newQuantity;
      _sampleProducts[index]['total'] =
          _sampleProducts[index]['unitPrice'] * newQuantity;

      // Mettre à jour le controller si demandé
      if (updateController && _productControllers.containsKey(index)) {
        _productControllers[index]!.text = newQuantity.toString();
      }

      _calculateOrderSummary();
    });
  }

  double get _subtotal {
    return _sampleProducts.fold(
      0.0,
      (sum, item) => sum + (item['total'] as double),
    );
  }

  double get _taxes {
    return _subtotal * 0.20; // 20% de TVA
  }

  double get _total {
    return _subtotal + _taxes;
  }

  double get _change {
    return _amountReceived - _total;
  }

  // Pour les paiements mixtes
  final Map<String, double> _paymentSplit = {};
  double _remainingAmount = 0.0;
  bool _isPaymentDialogOpen = false;
  Map<String, Object> transaction = {};

  void _updateProductTotal(int index) {
    final product = _sampleProducts[index];
    product['total'] = product['unitPrice'] * product['quantity'];
    _calculateOrderSummary();
  }

  void _removeProduct(int index) {
    setState(() {
      // Supprimer le controller
      if (_productControllers.containsKey(index)) {
        _productControllers[index]!.dispose();
        _productControllers.remove(index);
      }

      // Réindexer les controllers restants
      final newControllers = <int, TextEditingController>{};
      _productControllers.forEach((key, controller) {
        if (key > index) {
          newControllers[key - 1] = controller;
        } else if (key < index) {
          newControllers[key] = controller;
        }
      });
      _productControllers.clear();
      _productControllers.addAll(newControllers);

      // Supprimer le produit
      _sampleProducts.removeAt(index);

      _calculateOrderSummary();
    });
  }

  void _resetPaymentSplit() {
    _paymentSplit.clear();
    _remainingAmount = _total;
    _selectedPaymentMethod = 'Espèces';
  }

  void _addPaymentAmount(StateSetter setState) {
    final amount = double.tryParse(_paymentController.text) ?? 0;

    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez saisir un montant valide'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (amount > _remainingAmount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Le montant ne peut pas dépasser ${FormatUtils.formatCurrency(_remainingAmount, _caisseService.currentSession!.currency)}',
          ),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      // Si ce moyen de paiement existe déjà, ajouter au montant
      if (_paymentSplit.containsKey(_selectedPaymentMethod)) {
        _paymentSplit[_selectedPaymentMethod] =
            _paymentSplit[_selectedPaymentMethod]! + amount;
      } else {
        _paymentSplit[_selectedPaymentMethod] = amount;
      }

      _remainingAmount =
          _total - _paymentSplit.values.fold(0.0, (sum, value) => sum + value);
      _paymentController.clear();
    });
  }

  void _validateOrder() {
    setState(() {
      _isPaymentDialogOpen = true;
      _remainingAmount =
          _total - _paymentSplit.values.fold(0.0, (sum, value) => sum + value);
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: Row(
              children: [
                const Icon(Icons.payment, color: Colors.blue),
                const SizedBox(width: 8),
                Text(
                  'Paiement - ${FormatUtils.formatCurrency(_total, _caisseService.currentSession!.currency)}',
                ),
              ],
            ),
            content: SizedBox(
              width: size.width > 800 ? 700 : size.width * 0.8,
              child: _buildPaymentDialogContent(setState),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _isPaymentDialogOpen = false;
                },
                child: const Text('ANNULER'),
              ),
              ElevatedButton(
                onPressed: _remainingAmount <= 0
                    ? () {
                        Navigator.pop(context);
                        _isPaymentDialogOpen = false;
                        _processFinalPayment();
                      }
                    : null,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('CONFIRMER'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _clearOrder() {
    setState(() {
      // Nettoyer tous les controllers
      _productControllers.forEach((_, controller) => controller.dispose());
      _productControllers.clear();

      // Vider la liste des produits
      _sampleProducts.clear();

      _calculateOrderSummary();
    });
  }

  void _processFinalPayment() {
    if (_paymentSplit.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez saisir au moins un moyen de paiement'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Récapitulatif du paiement'),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Détail commande
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    children: [
                      const Text(
                        'Détail de la commande',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ..._sampleProducts.map((product) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Text(
                                  '${product['name']} x${product['quantity']}',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                FormatUtils.formatCurrency(
                                  product['total'],
                                  _caisseService.currentSession!.currency,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const Divider(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total:'),
                          Text(
                            FormatUtils.formatCurrency(
                              _total,
                              _caisseService.currentSession!.currency,
                            ),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Détail paiement
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    children: [
                      const Text(
                        'Détail du paiement',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ..._paymentSplit.entries.map((entry) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(entry.key),
                              Text(
                                FormatUtils.formatCurrency(
                                  entry.value,
                                  _caisseService.currentSession!.currency,
                                ),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const Divider(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total payé:'),
                          Text(
                            FormatUtils.formatCurrency(
                              _paymentSplit.values.fold(
                                0.0,
                                (sum, value) => sum + value,
                              ),
                              _caisseService.currentSession!.currency,
                            ),
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Monnaie à rendre
              if (_paymentSplit.values.fold(0.0, (sum, value) => sum + value) >
                  _total)
                Card(
                  color: Colors.green.shade50,
                  child: Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Column(
                      children: [
                        const Text(
                          'Monnaie à rendre',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          FormatUtils.formatCurrency(
                            _paymentSplit.values.fold(
                                  0.0,
                                  (sum, value) => sum + value,
                                ) -
                                _total,
                            _caisseService.currentSession!.currency,
                          ),
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('MODIFIER'),
          ),
          ElevatedButton(
            onPressed: _confirmPayment,
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('TERMINER LA VENTE'),
          ),
        ],
      ),
    );
  }

  // Alternative pour mobile (à la place de showDialog)
  void _openPaymentBottomSheet() {
    _remainingAmount =
        _total - _paymentSplit.values.fold(0.0, (sum, value) => sum + value);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.9,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (context, scrollController) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Column(
                children: [
                  // Handle
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),

                  // En-tête
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Paiement',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                  ),

                  // Contenu
                  Expanded(
                    child: SingleChildScrollView(
                      controller: scrollController,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: _buildPaymentDialogContent((fn) => setState(fn)),
                    ),
                  ),

                  // Actions
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border(
                        top: BorderSide(color: Colors.grey.shade200),
                      ),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('ANNULER'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _remainingAmount <= 0
                                ? () {
                                    _confirmPayment();
                                  }
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                            ),
                            child: const Text('CONFIRMER'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Confirmer le paiement et enregistrer la transaction
  void _confirmPayment() {
    // Enregistrer la transaction
    try {
      final session = _caisseService.currentSession!;

      // Créer la transaction avec les paiements multiples
      transaction = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'clientId': 'anonymous',
        'products': List.from(_sampleProducts),
        'paymentMethods': _paymentSplit.keys.toList(),
        'total': _total,
        'timestamp': DateTime.now(),
      };

      // Ajouter à l'historique
      session.transactions.add(
        CaisseTransaction(
          id: transaction['id']! as String,
          clientId: transaction['clientId']! as String,
          amount: transaction['total']! as double,
          paymentMethod: _paymentSplit.keys.toList(),
          timestamp: transaction['timestamp'] as DateTime,
        ),
      );

      // Imprimer le ticket
      _printReceipt(transaction);

      // Réinitialiser
      Navigator.pop(context); // Fermer le récap
      Navigator.pop(context); // Fermer le dialogue paiement

      setState(() {
        _clearOrder();
        _resetPaymentSplit();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Vente terminée avec succès !'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _calculateOrderSummary() {
    _subtotal;
    _taxes;
    _total;
  }

  void _addProductToCart(Map<String, dynamic> product) {
    // Vérifier le stock
    if (product["stock"] <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${product["name"]} est en rupture de stock'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Rechercher si le produit est déjà dans la commande
    final existingIndex = _sampleProducts.indexWhere(
      (item) => item['name'] == product['name'],
    );

    setState(() {
      if (existingIndex >= 0) {
        // Augmenter la quantité
        final newQty = _sampleProducts[existingIndex]['quantity'] + 1;
        _updateProductQuantity(existingIndex, newQty);
      } else {
        // Ajouter nouveau produit
        final newProduct = {
          'name': product['name'],
          'quantity': 1,
          'unitPrice': product['price'].toDouble(),
          'total': product['price'].toDouble(),
        };

        final newIndex = _sampleProducts.length;
        _sampleProducts.add(newProduct);

        // Créer un nouveau controller
        final controller = TextEditingController(text: '1');
        controller.addListener(() {
          _onQuantityChanged(newIndex, controller);
        });
        _productControllers[newIndex] = controller;

        _calculateOrderSummary();
      }
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product["name"]} ajouté au panier'),
        backgroundColor: Colors.green,
      ),
    );
  }

  // Méthode pour obtenir l'icône selon le type
  IconData _getTypeIcon(String type) {
    switch (type.toLowerCase()) {
      case 'milk':
        return Icons.local_drink;
      case 'rice':
        return Icons.grain;
      case 'yogourt':
        return Icons.icecream;
      case 'sardine':
        return Icons.set_meal;
      case 'water':
        return Icons.water_drop;
      default:
        return Icons.category;
    }
  }

  // Méthode pour obtenir la couleur selon le type
  Color _getTypeColor(String type) {
    switch (type.toLowerCase()) {
      case 'milk':
        return Colors.purple;
      case 'rice':
        return Colors.amber[700]!;
      case 'yogourt':
        return Colors.pink;
      case 'sardine':
        return Colors.orange;
      case 'water':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  void initState() {
    super.initState();
    _initializeProductControllers();
    _resetPaymentSplit();
  }

  @override
  void dispose() {
    // Nettoyer tous les controllers
    _productControllers.forEach((_, controller) => controller.dispose());
    _paymentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    size = MediaQuery.of(context).size;
    final currentSession = _caisseService.currentSession;

    if (currentSession == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Caisse')),
        drawer: const SideMenu(),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.orange),
              const SizedBox(height: 20),
              const Text(
                'Aucune caisse active',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              const Text('Veuillez d\'abord initialiser une caisse'),
              const SizedBox(height: 30),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('RETOUR'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Caisse - ${currentSession.currency}'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _addClient,
            tooltip: 'Nouveau client',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
            tooltip: 'Paramètres',
          ),
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => _closeCaisse(context),
            tooltip: 'Clôturer la caisse',
          ),
        ],
      ),
      drawer: const SideMenu(),
      body: Column(
        children: [
          // Onglets
          Container(
            color: Colors.white,
            child: Row(
              children: [
                _buildTab(0, 'Transaction', Icons.point_of_sale),
                _buildTab(1, 'Clients', Icons.people),
                _buildTab(2, 'Ventes', Icons.history),
              ],
            ),
          ),

          // Contenu selon l'onglet sélectionné
          Expanded(child: _buildTabContent(currentSession, size)),
        ],
      ),
    );
  }

  Widget _buildTab(int index, String title, IconData icon) {
    final isSelected = _selectedTab == index;

    return Expanded(
      child: Material(
        color: isSelected ? const Color(0xFF53b5fb) : Colors.white,
        child: InkWell(
          onTap: () => setState(() => _selectedTab = index),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: isSelected ? Colors.white : Colors.grey),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(CaisseSession session, Size size) {
    switch (_selectedTab) {
      case 0:
        return _buildTransactionTab(session, size);
      case 1:
        return _buildClientsTab();
      case 2:
        return _buildSalesTab(session);
      default:
        return _buildTransactionTab(session, size);
    }
  }

  Widget _buildTransactionTab(CaisseSession session, Size size) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 8),
        child: Column(
          children: [
            // Barre de recherche produit et Clients
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.search, color: Colors.blue),
                              SizedBox(width: 8),
                              Text(
                                'Ajouter un Produit',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            onChanged: (value) =>
                                setState(() => _searchQuery = value),
                            decoration: InputDecoration(
                              hintText:
                                  'Scanner le code-barres ou saisir le nom du produit.',
                              prefixIcon: const Icon(Icons.barcode_reader),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.person_sharp, color: Colors.blue),
                              SizedBox(width: 8),
                              Text("Client"),
                            ],
                          ),
                          SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  onChanged: (value) =>
                                      setState(() => _searchClient = value),
                                  decoration: InputDecoration(
                                    hintText:
                                        'Rechercher un client nom , numero de carte...',
                                    prefixIcon: const Icon(Icons.search),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                      borderSide: BorderSide(
                                        color: Color(0xFFdee1e6),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton(
                                style: ButtonStyle(
                                  side: WidgetStateProperty.all(
                                    BorderSide(color: Color(0xFF19b373)),
                                  ),
                                  shape: WidgetStateProperty.all(
                                    RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                                onPressed: () {
                                  //TODO: Fonction pour afficher formulaire de creation de client
                                },
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.add, color: Color(0xFF19b373)),
                                    Text(
                                      "Ajouter un client",
                                      style: TextStyle(
                                        color: Color(0xFF19b373),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 8),

            if (size.width > 950)
              Row(
                children: [
                  // Grid de la liste des produits
                  Expanded(child: _buildProductGrid()),

                  const SizedBox(height: 16),

                  // Commande actuelle
                  Expanded(child: _buildCurrentOrder(session)),
                ],
              )
            else
              Column(
                children: [
                  // Grid de la liste des produits
                  _buildCurrentOrder(session),
                  const SizedBox(height: 16),
                  _buildProductGrid(),
                  // Commande actuelle
                ],
              ),
          ],
        ),
      ),
    );
  }

  // Actions Rapides de caisse
  Card _QuickAction() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Actions Rapides',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _printReceipt(transaction),
                    icon: const Icon(Icons.print),
                    label: const Text('Imprimer'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _withdrawMoney(),
                    icon: const Icon(Icons.money_off),
                    label: const Text('Retrait'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _newTransaction(),
                    icon: const Icon(Icons.add),
                    label: const Text('Nouveau'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // GridView des produits avec filtre
  SizedBox _buildProductGrid() {
    final productGridSize= size.height * 0.7;
    return SizedBox(
      height: productGridSize,
      child: Card(
        elevation: 3,
        child: Padding(
          padding: EdgeInsetsGeometry.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            children: [
              // En-tête avec titre et filtre
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Liste des produits",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),

                  // Dropdown de filtrage
                  Container(
                    width: 150,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[300]!),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8.0),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _selectedFilter ?? "Tous",
                          isExpanded: true,
                          icon: const Icon(Icons.filter_list, size: 20),
                          iconEnabledColor: const Color(0xFF1f9ef9),
                          style: const TextStyle(
                            fontSize: 14,
                            color: Colors.black87,
                          ),
                          dropdownColor: Colors.white,
                          borderRadius: BorderRadius.circular(8),
                          onChanged: (String? newValue) {
                            setState(() {
                              _selectedFilter = newValue == "Tous"
                                  ? null
                                  : newValue;
                            });
                          },
                          items: _productTypes.map<DropdownMenuItem<String>>((
                            String value,
                          ) {
                            return DropdownMenuItem<String>(
                              value: value,
                              child: Row(
                                children: [
                                  Icon(
                                    _getTypeIcon(value),
                                    color: _getTypeColor(value),
                                    size: 18,
                                  ),
                                  const SizedBox(width: 8),
                                  Text(value),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Titre de filtre
              if (_selectedFilter != null && _selectedFilter != 'Tous')
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Chip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _getTypeIcon(_selectedFilter!),
                          size: 16,
                          color: _getTypeColor(_selectedFilter!),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Filtre: $_selectedFilter',
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                    backgroundColor: _getTypeColor(
                      _selectedFilter!,
                    ).withValues(alpha: 0.1),
                    deleteIcon: const Icon(Icons.close, size: 16),
                    onDeleted: () {
                      setState(() {
                        _selectedFilter = null;
                      });
                    },
                  ),
                ),
              const SizedBox(height: 8),
              // GridView des produits filtrés
              if (_filteredProducts.isNotEmpty)
                SizedBox(
                  height: _selectedFilter == null || _selectedFilter =="Tous" ? productGridSize - 100
                      : productGridSize -130,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12.0),
                    child: GridView.builder(
                      gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 180,
                        mainAxisExtent: 200,
                      ),
                      itemCount: _filteredProducts.length,
                      itemBuilder: (context, index) {
                        final product = _filteredProducts[index];
                        return Card(
                          elevation: 2,
                          child: InkWell(
                            onTap: () {
                              _addProductToCart(product);
                            },
                            child: Column(
                              children: [
                                // Image avec hauteur fixe
                                Container(
                                  height: 100,
                                  decoration: BoxDecoration(
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(4),
                                      topRight: Radius.circular(4),
                                    ),
                                    image: DecorationImage(
                                      image: NetworkImage(product["image_url"]),
                                      fit: BoxFit.contain,
                                    ),
                                  ),
                                  child: Stack(
                                    children: [
                                      // Indicateur de stock
                                      if (product["stock"] <= 0)
                                        Container(
                                          color: Colors.red.withValues(
                                            alpha: 0.7,
                                          ),
                                          child: const Center(
                                            child: Text(
                                              'RUPTURE',
                                              style: TextStyle(
                                                color: Colors.white,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),

                                // Info produit
                                Padding(
                                  padding: const EdgeInsets.all(8.0),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        product["name"].toString(),
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '${product["price"]} FCFA',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              color: Colors.green,
                                              fontSize: 14,
                                            ),
                                          ),
                                          Chip(
                                            label: Text('${product["stock"]}'),
                                            backgroundColor:
                                                product["stock"] > 0
                                                ? Colors.blue[50]
                                                : Colors.red[50],
                                            labelStyle: TextStyle(
                                              fontSize: 10,
                                              color: product["stock"] > 0
                                                  ? Colors.blue
                                                  : Colors.red,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              // Message si aucun produit trouvé
              if (_filteredProducts.isEmpty)
                Container(
                  padding: const EdgeInsets.all(40),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.inventory_2_outlined,
                        size: 60,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Aucun produit trouvé',
                        style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _selectedFilter == 'Tous'
                            ? 'Aucun produit en stock'
                            : 'Aucun produit de type "$_selectedFilter"',
                        style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuantityCell(int index, Map<String, dynamic> product) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Bouton -
        IconButton(
          onPressed: () {
            final newQty = (product['quantity'] as int) - 1;
            if (newQty >= 1) {
              _updateProductQuantity(index, newQty);
            }
          },
          icon: const Icon(Icons.remove, size: 24),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          style: IconButton.styleFrom(
            backgroundColor: Colors.grey.shade100,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
              side: BorderSide(color: Colors.grey.shade300),
            ),
          ),
        ),

        // Champ de saisie SIMPLE
        Container(
          width: 45,
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: TextField(
            controller: _productControllers[index]!,
            textAlign: TextAlign.center,
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            decoration: InputDecoration(
              contentPadding: const EdgeInsets.symmetric(
                vertical: 4,
                horizontal: 4,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey.shade400, width: 1),
              ),
            ),
          ),
        ),

        // Bouton +
        IconButton(
          onPressed: () {
            final newQty = (product['quantity'] as int) + 1;
            _updateProductQuantity(index, newQty);
          },
          icon: const Icon(Icons.add, size: 24),
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(),
          style: IconButton.styleFrom(
            backgroundColor: Colors.blue.shade50,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
              side: BorderSide(color: Colors.blue.shade200),
            ),
          ),
        ),
      ],
    );
  }

  // Commande actuelle
  SizedBox _buildCurrentOrder(CaisseSession session) {
    final curentOrderSize= size.height * 0.7;
    return SizedBox(
      height: curentOrderSize,
      child: Card(
        elevation: 3,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.shopping_cart, color: Colors.blue),
                  SizedBox(width: 8),
                  Text(
                    'Commande Actuelle',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Tableau des produits
              Expanded(
                child: SizedBox(
                  width: double.infinity,
                  child: SingleChildScrollView(
                    child: DataTable(
                      columnSpacing: 8,
                      headingRowHeight: 40,
                      columns: const [
                        DataColumn(
                          label: Text('Produit'),
                          tooltip: 'Nom du produit',
                        ),
                        DataColumn(label: Text('Quantité'), numeric: true),
                        DataColumn(
                          label: Text('Prix U.'),
                          numeric: false,
                          tooltip: 'Prix unitaire',
                        ),
                        DataColumn(
                          label: Text('Total'),
                          numeric: false,
                          tooltip: 'Total pour ce produit',
                        ),
                        DataColumn(
                          label: Text('Actions'),
                          tooltip: 'Actions disponibles',
                        ),
                      ],
                      rows: _sampleProducts.asMap().entries.map((entry) {
                        final index = entry.key;
                        final product = entry.value;

                        return DataRow(
                          cells: [
                            // Nom produit
                            DataCell(
                              SizedBox(
                                width: 160,
                                child: Text(
                                  product['name'].toString(),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 2,
                                ),
                              ),
                            ),
                            // Quantité - SIMPLIFIÉ
                            DataCell(
                              SizedBox(
                                width: 140,
                                child: _buildQuantityCell(index, product),
                              ),
                            ),
                            // Prix unitaire
                            DataCell(
                              Text(
                                FormatUtils.formatCurrencyWithDecimal(
                                  product['unitPrice'],
                                  session.currency,
                                ),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            // Total
                            DataCell(
                              Text(
                                FormatUtils.formatCurrencyWithDecimal(
                                  product['total'],
                                  session.currency,
                                ),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                            ),
                            // Actions
                            DataCell(
                              IconButton(
                                icon: const Icon(
                                  Icons.delete_outline,
                                  size: 20,
                                  color: Colors.red,
                                ),
                                onPressed: () => _removeProduct(index),
                                tooltip: 'Supprimer ce produit',
                              ),
                            ),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ),
              ),
              // Résumé de la commande
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Column(
                  children: [
                    _buildSummaryRow('Sous-total', _subtotal, session.currency),
                    _buildSummaryRow('Taxes (20%)', _taxes, session.currency),
                    const Divider(height: 5),
                    _buildSummaryRow(
                      'TOTAL',
                      _total,
                      session.currency,
                      isTotal: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _total > 0 ? _validateOrder : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      icon: const Icon(Icons.check_circle, size: 20),
                      label: const Text(
                        'VALIDER LA COMMANDE',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton.icon(
                    onPressed: _clearOrder,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.all(12),
                      side: BorderSide(color: Colors.red.shade400),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    icon: Icon(
                      Icons.delete_outline,
                      size: 20,
                      color: Colors.red.shade400,
                    ),
                    label: Text(
                      'VIDER',
                      style: TextStyle(
                        color: Colors.red.shade400,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Actions rapides
              _QuickAction(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildClientsTab() {
    final clients = _caisseService.clientSessions;

    return Column(
      children: [
        // Barre de recherche client
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Card(
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Rechercher un client',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Nom, Email ou Téléphone',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Rechercher client...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.add),
                        onPressed: _addClient,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Liste des clients ou message vide
        Expanded(
          child: clients.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.people_outline,
                        size: 80,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Aucun client enregistré',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: _addClient,
                        icon: const Icon(Icons.person_add),
                        label: const Text('AJOUTER UN CLIENT'),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: clients.length,
                  itemBuilder: (context, index) {
                    final client = clients[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Colors.blue[100],
                          child: Text('${index + 1}'),
                        ),
                        title: Text('Client ${client.id.substring(7, 12)}'),
                        subtitle: Text(
                          'Session démarrée à ${client.formatTime(client.startTime)}',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.visibility, size: 20),
                              onPressed: () =>
                                  _openClientSession(context, client),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.delete,
                                size: 20,
                                color: Colors.red,
                              ),
                              onPressed: () => _removeClient(client.id),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSalesTab(CaisseSession session) {
    final transactionsCaisse = session.transactions;

    return Column(
      children: [
        // En-tête avec informations de caisse
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.blue[50],
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Fond: ${FormatUtils.formatCurrency(session.totalCurrent, session.currency)}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Ouverte: ${session.formatTime(session.startTime)}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Clients: ${_caisseService.activeClientsCount}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Transactions: ${session.transactions.length}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
        ),
        // En-tête historique
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Card(
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Historique des Ventes',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Aujourd\'hui',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                  Chip(
                    label: Text('${transactionsCaisse.length} transactions'),
                    backgroundColor: Colors.blue[100],
                  ),
                ],
              ),
            ),
          ),
        ),

        // Liste des transactions ou message vide
        Expanded(
          child: transactionsCaisse.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long, size: 80, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'Aucune transaction enregistrée',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: transactionsCaisse.length,
                  itemBuilder: (context, index) {
                    final transaction = transactionsCaisse[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        leading: SizedBox(
                          width: 50,
                          child: Wrap(
                            spacing: 2,
                            runSpacing: 2,
                            children: transaction.paymentMethod
                                .take(3) // Limiter à 3 icônes maximum
                                .map(
                                  (method) => CircleAvatar(
                                    radius: 14,
                                    backgroundColor: _getPaymentColor(method),
                                    child: Icon(
                                      _getPaymentIcon(method),
                                      color: Colors.white,
                                      size: 14,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                        title: Text(
                          'Transaction #${transaction.id.substring(0, 6)}',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Client: ${transaction.clientId}',
                              style: const TextStyle(fontSize: 12),
                            ),
                            Text(
                              session.formatTime(transaction.timestamp),
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              FormatUtils.formatCurrency(
                                transaction.amount,
                                session.currency,
                              ),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Container(
                              constraints: const BoxConstraints(maxWidth: 100),
                              child: Text(
                                transaction.paymentMethod.join(', '),
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                textAlign: TextAlign.end,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(
    String label,
    double amount,
    String currency, {
    bool isTotal = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.blue : Colors.grey[700],
            ),
          ),
          Text(
            FormatUtils.formatCurrency(amount, currency),
            style: TextStyle(
              fontSize: isTotal ? 18 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
              color: isTotal ? Colors.blue : Colors.grey[700],
            ),
          ),
        ],
      ),
    );
  }

  Color _getPaymentColor(String method) {
    switch (method.toLowerCase()) {
      case 'cash':
        return Colors.green;
      case 'card':
        return Colors.blue;
      case 'wave':
        return Colors.purple;
      case 'orange':
        return Colors.orange;
      case 'mtn':
        return Colors.yellow[700]!;
      default:
        return Colors.grey;
    }
  }

  IconData _getPaymentIcon(String method) {
    switch (method.toLowerCase()) {
      case 'cash':
        return Icons.money;
      case 'card':
        return Icons.credit_card;
      case 'wave':
      case 'orange':
      case 'mtn':
        return Icons.phone_android;
      default:
        return Icons.payment;
    }
  }

  void _addClient() {
    try {
      final clientId = _caisseService.createClientSession();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Client $clientId ajouté'),
          duration: const Duration(seconds: 2),
        ),
      );
      setState(() {});
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _removeClient(String clientId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer le client?'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('ANNULER'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implémenter la suppression
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Fonctionnalité à implémenter')),
              );
            },
            child: const Text('SUPPRIMER'),
          ),
        ],
      ),
    );
  }

  void _openClientSession(BuildContext context, CaisseSession client) {
    // TODO: Ouvrir l'écran de transaction pour ce client
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Ouvrir session client ${client.id.substring(7, 12)}'),
      ),
    );
  }

  Widget _buildPaymentDialogContent(StateSetter setState) {
    final session = _caisseService.currentSession!;

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Montant restant à payer
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _remainingAmount > 0
                  ? Colors.orange.shade50
                  : Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _remainingAmount > 0 ? Colors.orange : Colors.green,
              ),
            ),
            child: Column(
              children: [
                Text(
                  _remainingAmount > 0 ? 'RESTE À PAYER' : 'MONTANT A RENDRE',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _remainingAmount > 0 ? Colors.orange : Colors.green,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  FormatUtils.formatCurrency(
                    _remainingAmount,
                    session.currency,
                  ),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _remainingAmount > 0 ? Colors.orange : Colors.green,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Répartition des paiements existants
          if (_paymentSplit.isNotEmpty) ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Paiements saisis :',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                ..._paymentSplit.entries.map((entry) {
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      leading: Icon(
                        _paymentMethods.firstWhere(
                          (m) => m['name'] == entry.key,
                        )['icon'],
                        color: Colors.blue,
                      ),
                      title: Text(entry.key),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            FormatUtils.formatCurrency(
                              entry.value,
                              session.currency,
                            ),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(
                              Icons.close,
                              size: 16,
                              color: Colors.red,
                            ),
                            onPressed: () {
                              setState(() {
                                _paymentSplit.remove(entry.key);
                                _updateRemainingAmount();
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // Liste des moyens de paiement avec saisie directe
          Card(
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Saisir les paiements',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Saisissez le montant pour chaque moyen de paiement',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 16),

                  // Liste des moyens de paiement
                  ..._paymentMethods.map((method) {
                    final methodName = method['name'] as String;
                    final currentAmount = _paymentSplit[methodName] ?? 0.0;

                    // Créer un contrôleur pour chaque champ
                    final controller = TextEditingController(
                      text: currentAmount > 0
                          ? currentAmount.toStringAsFixed(0)
                          : '',
                    );

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                method['icon'] as IconData,
                                size: 20,
                                color: Colors.blue,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                methodName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const Spacer(),
                              if (currentAmount > 0)
                                Text(
                                  FormatUtils.formatCurrency(
                                    currentAmount,
                                    session.currency,
                                  ),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green.shade700,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextFormField(
                                  controller: controller,
                                  keyboardType: TextInputType.number,
                                  decoration: InputDecoration(
                                    hintText: 'Montant',
                                    prefixText: '${session.currency} ',
                                    border: const OutlineInputBorder(),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    suffixIcon: IconButton(
                                      icon: const Icon(Icons.check, size: 18),
                                      onPressed: () {
                                        final value = controller.text;
                                        final amount =
                                            double.tryParse(value) ?? 0.0;
                                        if (amount > 0) {
                                          setState(() {
                                            _paymentSplit[methodName] = amount;
                                            _updateRemainingAmount();
                                          });
                                        }
                                      },
                                    ),
                                  ),
                                  onFieldSubmitted: (value) {
                                    final amount =
                                        double.tryParse(value) ?? 0.0;
                                    if (amount > 0) {
                                      setState(() {
                                        _paymentSplit[methodName] = amount;
                                        _updateRemainingAmount();
                                      });
                                    }
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),

                  const SizedBox(height: 16),

                  // Totaux et suggestions globales
                  Card(
                    color: Colors.grey.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total saisi :'),
                              Text(
                                FormatUtils.formatCurrency(
                                  _paymentSplit.values.fold(
                                    0.0,
                                    (sum, value) => sum + value,
                                  ),
                                  session.currency,
                                ),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text( _remainingAmount > 0 ? 'Reste à payer' : 'Montant à rendre'),
                              Text(
                                FormatUtils.formatCurrency(
                                  _remainingAmount,
                                  session.currency,
                                ),
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: _remainingAmount > 0
                                      ? Colors.orange
                                      : Colors.green,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Fonction pour mettre à jour le montant restant
  void _updateRemainingAmount() {
    final totalPaid = _paymentSplit.values.fold(
      0.0,
      (sum, value) => sum + value,
    );
    _remainingAmount = _total - totalPaid;

    // Nettoyer les entrées avec montant 0
    _paymentSplit.removeWhere((key, value) => value <= 0);
  }

  // Suggestions rapides (version corrigée)
  Widget _buildQuickAmountButton(
    String label,
    double amount,
    String methodName,
    TextEditingController controller,
    StateSetter setState,
  ) {
    return FilterChip(
      label: Text(label),
      onSelected: (selected) {
        if (selected) {
          setState(() {
            final currentAmount = _paymentSplit[methodName] ?? 0.0;
            final newAmount = currentAmount + amount;
            _paymentSplit[methodName] = newAmount;
            controller.text = newAmount.toStringAsFixed(0);
            _updateRemainingAmount();
          });
        }
      },
      backgroundColor: Colors.blue.shade50,
      selectedColor: Colors.blue.shade100,
    );
  }

  void _completeTransaction() {
    // TODO: Enregistrer la transaction
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Transaction enregistrée avec succès'),
        backgroundColor: Colors.green,
      ),
    );

    // Réinitialiser
    setState(() {
      _paymentController.clear();
      _amountReceived = 0.0;
    });
  }

  void _printReceipt(Map<String, dynamic> transaction) {
    // TODO: Implémenter l'impression
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Impression du ticket')));
  }

  void _withdrawMoney() {
    // TODO: Implémenter le retrait
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Retrait d\'argent')));
  }

  void _newTransaction() {
    // TODO: Nouvelle transaction
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Nouvelle transaction')));
  }

  void _showSettings() {
    // TODO: Afficher les paramètres
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Paramètres')));
  }

  void _closeCaisse(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clôturer la caisse?'),
        content: const Text('Cette action est définitive. Continuer?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('ANNULER'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
            onPressed: () {
              Navigator.pop(context);
              final closedSession = _caisseService.closeMainCaisse();
              Navigator.pushNamed(
                context,
                '/cashbox/close',
                arguments: closedSession,
              );
            },
            child: const Text('CLÔTURER'),
          ),
        ],
      ),
    );
  }
}
