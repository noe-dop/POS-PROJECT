import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/locale_database_service.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/network_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session_model.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_transaction.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/cart_item.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/client_session.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/payment_method_model.dart';
import 'package:nsp_pos_mobile/features/customers/viewmodel/card_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:uuid/uuid.dart';

/// Fournit l'état et la logique métier de l'écran de caisse.
///
/// [CaisseProvider] centralise :
/// - la session de caisse principale (ouverture/fermeture, fond de caisse) ;
/// - les sessions clients simultanées (paniers multiples) ;
/// - le chargement des produits (serveur ou base locale selon la connectivité) ;
/// - la synchronisation différée des ventes via une "outbox" locale ;
/// - l'historique des ventes et des sessions de caisse.
///
/// Il écoute la connectivité réseau ([Connectivity]) pour basculer
/// automatiquement entre le mode en ligne et le mode hors ligne, et
/// déclenche la synchronisation de l'outbox dès que la connexion est
/// rétablie.
class CaisseProvider extends ChangeNotifier {
  // ============================================================================
  // SYNCHRONISATION LOCALE
  // ============================================================================

  final LocalDatabaseService _localDb = LocalDatabaseService();
  final Connectivity _connectivity = Connectivity();
  final Uuid _uuid = const Uuid();
  bool _isOnline = true;
  Timer? _syncTimer;
  bool _isSyncing = false;
  int _pendingSyncCount = 0;
  int _failedCount = 0;

  /// Nombre de tentatives consécutives de synchronisation ayant échoué
  /// pour cause de réseau. Sert à espacer/arrêter les nouvelles tentatives
  /// automatiques (voir [syncOutbox]).
  int _networkRetryCount = 0;

  // Getters pour l'UI
  /// Indique si l'appareil dispose actuellement d'une connexion réseau
  /// (Wi-Fi ou données mobiles).
  bool get isOnline => _isOnline;

  /// Indique si une synchronisation de l'outbox est en cours.
  bool get isSyncing => _isSyncing;

  /// Nombre de ventes en attente de synchronisation avec le serveur.
  int get pendingSyncCount => _pendingSyncCount;

  /// Nombre de ventes en échec définitif de synchronisation.
  int get failedCount => _failedCount;

  // ============================================================================
  // PROPRIÉTÉS PRIVÉES
  // ============================================================================

  /// URL de base de l'API distante.
  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();

  // Session principale de caisse
  CaisseSession? _session;
  int? _currentStoreId;
  int? _cashRegisterId;
  final List<CaisseTransaction> _transactions = [];
  List<StoreProduct> _products = [];

  // Sessions clients (un seul système)
  final List<ClientSession> _sessions = [];
  String _currentSessionId = '';

  // Méthodes de paiement disponibles
  List<PaymentMethod> _paymentMethods = [];

  // État général
  bool _isLoading = false;
  String? _errorMessage;

  // Pour Historique de ventes
  List<Map<String, dynamic>> _sales = [];
  bool _hasMoreSales = true;
  bool _isLoadingSales = false;
  int _currentSalesPage = 1;
  String? _nextSalesUrl;

  /// Liste des ventes chargées pour l'historique (pagination cumulative).
  List<Map<String, dynamic>> get sales => _sales;

  /// Indique s'il reste des pages de ventes à charger.
  bool get hasMoreSales => _hasMoreSales;

  /// Indique si une page de ventes est en cours de chargement.
  bool get isLoadingSales => _isLoadingSales;

  // Pour l'historique des sessions
  int? _lastStoreId;
  int? _lastCashRegisterId;
  String? _lastStatus;
  DateTime? _lastDateFrom;
  DateTime? _lastDateTo;
  String? _nextUrl;

  // ============================================================================
  // GETTERS PUBLICS
  // ============================================================================

  /// Indique si une opération réseau est en cours (chargement générique).
  bool get isLoading => _isLoading;

  /// Dernier message d'erreur produit par le provider, ou `null` s'il n'y
  /// en a pas. À réinitialiser via [clearError] une fois affiché.
  String? get errorMessage => _errorMessage;


  /// Identifiant de la boutique actuellement associée à la session de caisse.
  int? get currentStoreId => _currentStoreId;

  /// Identifiant de la caisse (terminal) actuellement utilisée.
  int? get cashRegisterId => _cashRegisterId;

  /// Session de caisse principale en cours (fond de caisse, horodatages...),
  /// ou `null` si aucune caisse n'est ouverte.
  CaisseSession? get session => _session;

  /// Transactions enregistrées durant la session de caisse en cours.
  List<CaisseTransaction> get transactions => _transactions;

  /// Méthodes de paiement actives disponibles pour l'encaissement.
  List<PaymentMethod> get paymentMethods => _paymentMethods;

  /// Produits actuellement chargés en mémoire (serveur ou base locale).
  List<StoreProduct> get products => _products;

  // Gestion des sessions clients
  /// Liste des sessions clients actives (paniers en cours simultanés).
  List<ClientSession> get sessions => _sessions;

  /// Nombre de clients actuellement pris en charge simultanément.
  int get activeClientsCount => _sessions.length;

  /// Session client actuellement sélectionnée dans l'UI, ou `null`
  /// si aucune session ne correspond à [_currentSessionId].
  ClientSession? get currentSession {
    try {
      return _sessions.firstWhere((s) => s.id == _currentSessionId);
    } catch (e) {
      return null;
    }
  }

  /// Panier de la session client actuellement sélectionnée.
  List<CartItem> get currentCart => currentSession?.cart ?? [];

  /// Montant total du panier de la session client actuellement sélectionnée.
  double get currentTotal => currentSession?.total ?? 0;

  /// Indique si la session client actuellement sélectionnée est entièrement payée.
  bool get isCurrentSessionFullyPaid => currentSession?.isFullyPaid ?? false;

  List<dynamic> _sessionHistory = [];

  /// Historique des sessions de caisse chargées depuis le serveur.
  List<dynamic> get sessionHistory => _sessionHistory;

  // Pour les sessions ouvertes mais plus accessibles (usage de Force close session)
  List<Map<String, dynamic>> _openSessions = [];

  /// Sessions de caisse restées ouvertes (potentiellement orphelines),
  /// utilisées pour la fermeture forcée.
  List<Map<String, dynamic>> get openSessions => _openSessions;

  // Pagination
  bool _hasMore = true;
  bool _isLoadingMore = false;
  static const int _pageSize = 20;

  /// Indique s'il reste des pages de sessions à charger dans l'historique.
  bool get hasMore => _hasMore;

  /// Indique si une page supplémentaire de l'historique est en cours de chargement.
  bool get isLoadingMore => _isLoadingMore;

  /// Données du client rattaché à la session actuellement sélectionnée.
  Map<String, dynamic>? get selectedCustomer => currentSession?.customerData;

  // ============================================================================
  // CONSTRUCTEUR
  // ============================================================================

  /// Crée le provider, configure Dio, charge les méthodes de paiement,
  /// initialise l'écoute de connectivité et recharge les données locales.
  CaisseProvider() {
    _setupDioInterceptors();
    fetchPaymentMethods();
    _initConnectivity();
    _loadLocalData();
  }

  /// Initialise la détection de connectivité et s'abonne aux changements
  /// de réseau afin de basculer automatiquement entre les sources de
  /// données locale et distante, et de relancer la synchronisation de
  /// l'outbox lorsque la connexion est rétablie.
  void _initConnectivity() {
    // Détection initiale
    _connectivity.checkConnectivity().then((results) {
      _isOnline =
          results.contains(ConnectivityResult.wifi) ||
          results.contains(ConnectivityResult.mobile);
      if (_isOnline) {
        _loadProductsFromServer();
        syncOutbox();
      } else {
        _loadProductsFromLocal();
      }
      notifyListeners();
    });

    // Écoute des changements
    _connectivity.onConnectivityChanged.listen((
      List<ConnectivityResult> results,
    ) {
      final wasOnline = _isOnline;
      _isOnline =
          results.contains(ConnectivityResult.wifi) ||
          results.contains(ConnectivityResult.mobile);

      if (_isOnline && !wasOnline) {
        // Connexion rétablie : synchroniser
        _networkRetryCount = 0;
        _loadProductsFromServer();
        syncOutbox();
      } else if (!_isOnline && wasOnline) {
        // Hors ligne : charger les produits locaux
        _loadProductsFromLocal();
      }
      notifyListeners();
    });
  }

  /// Charge les données initiales : utilise la base locale si elle contient
  /// déjà des produits, sinon tente un chargement serveur si en ligne,
  /// ou affiche un message d'indisponibilité sinon.
  Future<void> _loadLocalData() async {
    _errorMessage = null;
    final count = await _localDb.getProductCount();
    if (count > 0) {
      await _loadProductsFromLocal();
    } else if (_isOnline) {
      await _loadProductsFromServer();
    } else {
      // Hors ligne et pas de données : afficher un message
      _errorMessage =
          'Aucune donnée locale disponible. Connectez-vous pour synchroniser.';
      notifyListeners();
    }
  }

  /// Reconstruit [_products] à partir des lignes stockées dans la base
  /// locale (SQLite), en regroupant les variantes par produit de boutique
  /// (`store_product_id`).
  Future<void> _loadProductsFromLocal() async {
    try {
      final results = await _localDb.searchProducts('');
      if (results.isEmpty) {
        _products = [];
        notifyListeners();
        return;
      }
      // Regrouper par store_product_id
      final Map<int, List<Map<String, dynamic>>> grouped = {};
      for (var row in results) {
        final storeProductId = row['store_product_id'] as int;
        grouped.putIfAbsent(storeProductId, () => []).add(row);
      }

      final List<StoreProduct> storeProducts = [];
      for (var entry in grouped.entries) {
        final rows = entry.value;
        final firstRow = rows.first;

        // Construire le produit
        final product = Product(
          id: firstRow['product_id'],
          name: firstRow['product_name'] ?? 'Produit',
          sku: firstRow['sku'] ?? '',
          status: 'active',
          brand: null,
          imagesUrls: [],
          description: '',
          price: 0.0,
          cost: 0.0,
          nombreItem: 1.0,
          minStockThreshold: 0,
          variants: [],
          categorieId: 0,
          groupeId: 0,
          typeId: null,
          searchVector: null,
        );

        // Construire les variantes
        final variants = rows.map((row) {
          return Variant.fromLocalMap(row);
        }).toList();

        // Ajouter les variantes au produit
        product.variants = variants;

        // Créer le StoreProduct
        final storeProduct = StoreProduct(
          id: firstRow['store_product_id'],
          storeId: _currentStoreId ?? 0,
          product: product,
          quantityItem: 1.0,
          status: firstRow['is_active'] == 1 ? 'active' : 'inactive',
          price: (firstRow['store_variant_price'] as num?)?.toDouble() ?? 0.0,
          cost: 0.0,
          stockDetails: StockDetails(
            id: 0,
            quantityPackage: 0,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable:
                (firstRow['stock_quantity'] as num?)?.toInt() ?? 0,
            stockStatus: (firstRow['stock_quantity'] ?? 0) > 0
                ? 'in_stock'
                : 'out_of_stock',
            isLowStock: (firstRow['stock_quantity'] ?? 0) < 5,
            needRestock: (firstRow['stock_quantity'] ?? 0) <= 0,
            minStockThreshold: 0.0,
            stockTurnoverRate: 0.0,
            wareHouse: null,
          ),
        );
        storeProducts.add(storeProduct);
      }

      _products = storeProducts;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Erreur chargement local: $e';
      notifyListeners();
    }
  }

  /// Récupère l'intégralité des produits de la boutique courante depuis le
  /// serveur (en suivant la pagination via le champ `next`), met à jour le
  /// cache local SQLite puis la liste en mémoire [_products].
  ///
  /// Ne fait rien si [_currentStoreId] est `null`. En cas d'erreur réseau,
  /// affiche un message discret ; en cas d'autre erreur, affiche une
  /// notification.
  Future<void> _loadProductsFromServer() async {
    if (_currentStoreId == null) return;
    try {
      final token = await _storage.getToken();
      if (token == null) return;

      final List<dynamic> allResults = [];
      String? nextUrl = '${baseUrl}stores/$_currentStoreId/products/';

      // Parcourir toutes les pages grâce à l'URL 'next'
      while (nextUrl != null) {
        final response = await _dio.get(
          nextUrl,
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );

        if (response.statusCode != 200) {
          _errorMessage =
              'Erreur chargement: ${response.statusCode} ${response.statusMessage}';
          notifyListeners();
          return;
        }

        final data = response.data;
        final results = data['results'] ?? [];
        allResults.addAll(results);
        nextUrl = data['next'];
      }

      // Transformer les résultats en produits locaux
      final List<Map<String, dynamic>> localProducts = [];
      for (var item in allResults) {
        final sp = StoreProduct.fromJson(item);
        final variants = sp.product.variants ?? [];
        for (var variant in variants) {
          localProducts.add({
            'store_product_id': sp.id,
            'product_id': sp.product.id,
            'product_name': sp.product.name,
            'sku': sp.product.sku,
            'barcode': variant.barcode,
            'variant_id': variant.id,
            'variant_name': variant.name,
            'quantity': variant.quantity,
            'sale_price_1': variant.salePrice1,
            'store_variant_price': variant.storeVariantPrice,
            'store_variant_id': variant.storeVariantId,
            'stock_quantity': sp.stockDetails?.quantityAvailable ?? 0,
            'image_url': variant.imageUrl,
            'is_active': sp.status == 'active' ? 1 : 0,
            'updated_at': DateTime.now().millisecondsSinceEpoch,
          });
        }
      }

      await _localDb.saveProducts(localProducts);

      // Mettre à jour la liste en mémoire
      _products = allResults
          .map((json) => StoreProduct.fromJson(json))
          .toList();
      notifyListeners();
    } catch (e) {
      if (await isNetworkError(e)) {
        // Erreur réseau : pas de notification
        _errorMessage = 'Impossible de charger les produits (réseau).';
      } else {
        _errorMessage = 'Erreur chargement serveur: $e';
        NotificationService.showError(null, _errorMessage!);
      }
      notifyListeners();
    }
  }

  /// Configure les options de base de [Dio] (URL de base, délais
  /// d'attente, validation des codes de statut).
  void _setupDioInterceptors() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      validateStatus: (status) => status != null && status < 600,
    );
  }

  // ============================================================================
  // GESTION DES SESSIONS CLIENTS
  // ============================================================================

  /// Crée une nouvelle session client (panier) et la sélectionne comme
  /// session courante.
  ///
  /// Si [clientName] n'est pas fourni, un nom générique "Client N" est
  /// attribué, où `N` est le plus petit entier positif non déjà utilisé
  /// parmi les sessions existantes.
  void createNewSession({
    String? clientId,
    String? clientName,
    bool isAnonymous = true,
    Map<String, dynamic>? customerData,
  }) {
    // 1. Extraire tous les numéros déjà utilisés dans les noms des sessions existantes
    final Set<int> usedNumbers = {};
    for (var session in _sessions) {
      final match = RegExp(r'Client (\d+)').firstMatch(session.clientName);
      if (match != null) {
        usedNumbers.add(int.parse(match.group(1)!));
      }
    }

    // 2. Trouver le plus petit entier positif non utilisé
    int nextNumber = 1;
    while (usedNumbers.contains(nextNumber)) {
      nextNumber++;
    }

    // 3. Créer la session avec le nom approprié
    final sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    final newSession = ClientSession(
      id: sessionId,
      clientId: clientId ?? 'anonymous_$sessionId',
      clientName:
          clientName ?? 'Client $nextNumber', // ← utilise le numéro trouvé
      cart: [],
      payments: [],
      isAnonymous: isAnonymous,
      createdAt: DateTime.now(),
      cashSessionId: _session?.id,
      customerData: customerData,
      customerId: customerData != null ? customerData['id'] : null,
    );
    _sessions.add(newSession);
    _currentSessionId = sessionId;
    notifyListeners();
  }

  /// Associe un client existant ([customerData]) à la session en cours :
  /// met à jour ses cartes de fidélité, son identifiant et son nom
  /// d'affichage.
  void assignCustomerToCurrentSession(Map<String, dynamic> customerData) {
    final session = currentSession;
    if (session != null) {
      session.customerData = customerData;
      List cards = customerData['cards'] ?? [];
      session.cards = cards.isNotEmpty
          ? cards.map((card) => CardModel.fromJson(card)).toList()
          : [];
      session.customerId = customerData['id'] as int?;
      session.clientName = customerData['user']['full_name'] ?? 'Client';
      notifyListeners();
    }
  }

  /// Change la session client sélectionnée dans l'UI, si elle existe.
  void switchSession(String sessionId) {
    if (_sessions.any((s) => s.id == sessionId)) {
      _currentSessionId = sessionId;
      notifyListeners();
    }
  }

  /// Ferme (supprime) une session client. Si c'était la dernière session,
  /// une nouvelle session anonyme est automatiquement recréée. Si c'était
  /// la session courante, la première session restante devient courante.
  void closeSession(String sessionId) {
    final index = _sessions.indexWhere((s) => s.id == sessionId);
    if (index != -1) {
      _sessions.removeAt(index);
      if (_sessions.isEmpty) {
        createNewSession(isAnonymous: true);
      } else if (_currentSessionId == sessionId) {
        _currentSessionId = _sessions.first.id;
      }
      notifyListeners();
    }
  }

  /// Ajoute un article au panier de la session courante. Si une ligne
  /// existe déjà pour la même variante ([CartItem.storeVariantId]), la
  /// quantité est cumulée au lieu de créer une nouvelle ligne.
  void addItemToCurrentSession(CartItem item) {
    final session = currentSession;
    if (session != null) {
      final existingIndex = session.cart.indexWhere(
        (i) =>
            i.storeVariantId ==
            item.storeVariantId, // Compare avec storeProductId
      );
      if (existingIndex != -1) {
        session.cart[existingIndex].quantity += item.quantity;
      } else {
        session.cart.add(item);
      }
      notifyListeners();
    }
  }

  /// Met à jour la quantité d'un article du panier courant. Si
  /// [newQuantity] est inférieure ou égale à zéro, l'article est retiré
  /// du panier.
  void updateItemQuantityInCurrentSession(CartItem item, int newQuantity) {
    final session = currentSession;
    if (session != null) {
      final index = session.cart.indexWhere((i) => i == item);
      if (index != -1) {
        if (newQuantity <= 0) {
          session.cart.removeAt(index);
        } else {
          session.cart[index].quantity = newQuantity;
        }
        notifyListeners();
      }
    }
  }

  /// Retire un article du panier de la session courante.
  void removeItemFromCurrentSession(CartItem item) {
    final session = currentSession;
    if (session != null) {
      session.cart.remove(item);
      notifyListeners();
    }
  }

  /// Vide entièrement le panier de la session courante.
  void clearCurrentSessionCart() {
    final session = currentSession;
    if (session != null) {
      session.clearCart();
      notifyListeners();
    }
  }

  /// Ajoute un paiement à la liste des paiements de la session courante
  /// (avant validation définitive de la vente).
  void addPaymentToCurrentSession(Map<String, dynamic> payment) {
    final session = currentSession;
    if (session != null) {
      session.payments.add(payment);
      notifyListeners();
    }
  }

  /// Efface tous les paiements saisis pour la session courante.
  void clearCurrentSessionPayments() {
    final session = currentSession;
    if (session != null) {
      session.clearPayments();
      notifyListeners();
    }
  }

  // ============================================================================
  // API - SESSION DE CAISSE
  // ============================================================================

  /// Ouvre une session de caisse côté serveur avec le fond de caisse
  /// initial ([initialCash], une correspondance dénomination → quantité)
  /// et initialise l'état local ([_session], [_currentStoreId],
  /// [_cashRegisterId]) puis charge les produits associés.
  ///
  /// Retourne `true` en cas de succès, `false` sinon (voir [errorMessage]
  /// pour le détail).
  Future<bool> initCashSession(
    int cashRegisterId,
    int employeeId,
    Map<int, int> initialCash,
    String currency,
  ) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final billetage = {};
      initialCash.forEach((k, v) {
        billetage[k.toString()] = v;
      });

      final data = {
        'cash_register': cashRegisterId,
        'employee': employeeId,
        'billetage_initial': billetage,
        'start_time': DateTime.now().toIso8601String(),
        'status': 'open',
      };

      final response = await _dio.post(
        'cash-sessions/',
        data: data,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 201) {
        int storeId = response.data['store_id'] as int;
        _session = CaisseSession(
          id: response.data['id'] as int,
          userId: employeeId,
          startTime: DateTime.now(),
          initialCash: initialCash,
          currency: currency,
          storeId: storeId,
        );
        _currentStoreId = storeId;
        _cashRegisterId = response.data['cash_register'] as int;
        // AJOUT : charger les produits pour cette boutique
        if (_isOnline) {
          await _loadProductsFromServer();
        } else {
          await _loadProductsFromLocal();
        }
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
        return false;
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Récupère la liste des méthodes de paiement actives depuis le serveur
  /// et met à jour [paymentMethods].
  Future<void> fetchPaymentMethods() async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      _errorMessage = null;
      _isLoading = true;
      notifyListeners();

      final response = await _dio.get(
        'payment-methods/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> results = data['results'] ?? [];

        _paymentMethods = results
            .map((json) => PaymentMethod.fromJson(json))
            .where((m) => m.isActive)
            .toList();
      } else {
        _errorMessage =
            'Erreur ${response.statusCode} : ${response.data['error'] ?? response.data}';
      }
    } on DioException catch (e) {
      _errorMessage =
          'Erreur lors de la récupération des méthodes de paiement : $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Clôture la session de caisse principale côté serveur.
  ///
  /// Calcule les totaux par méthode de paiement à partir des transactions
  /// de la session, l'écart entre le solde attendu et le solde déclaré
  /// ([finalTotal] ou [finalCash]), puis envoie le récapitulatif à l'API.
  /// En cas de succès, réinitialise l'état local (session, transactions,
  /// sessions clients) et retourne un résumé de clôture.
  ///
  /// Lève une [Exception] si aucune caisse n'est active.
  Future<Map<String, dynamic>> closeMainCaisse({
    Map<int, int>? finalCash,
    double? finalTotal,
  }) async {
    if (_session == null) throw Exception('Aucune caisse active');

    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      // --- 1. Calculer les totaux par méthode à partir des transactions ---
      final Map<String, double> totalsByMethod = {};
      for (var method in _paymentMethods) {
        final amount = _session!.getTotalForPaymentMethod(method.id);
        if (amount > 0) {
          totalsByMethod[method.name] = amount;
        }
      }

      // --- 2. Utiliser expectedCashBalance pour le fond attendu ---
      final expectedCashBalance = _session!.expectedCashBalance;
      final actualBalance = finalTotal ?? expectedCashBalance;
      final difference = actualBalance - expectedCashBalance;

      // --- 3. Chiffre d'affaires ---
      final ca = _session!.totalSales;

      // --- 4. Extraire les totaux par méthode pour l'API (avec noms normalisés) ---
      final double cashTotal = totalsByMethod['Espèces'] ?? 0.0;
      final double waveTotal = totalsByMethod['Wave'] ?? 0.0;
      final double omTotal =
          (totalsByMethod['Orange Money'] ?? 0.0) +
          (totalsByMethod['Orange'] ?? 0.0);
      final double moovmTotal =
          (totalsByMethod['Moov Money'] ?? 0.0) +
          (totalsByMethod['Moov'] ?? 0.0);
      final double cbTotal = totalsByMethod['Carte bancaire'] ?? 0.0;
      final double momoTotal = totalsByMethod['MTN Money'] ?? 0.0;
      final double versementTotal = totalsByMethod['Virement bancaire'] ?? 0.0;
      final double totalMobile = waveTotal + omTotal + moovmTotal + momoTotal;

      // --- 5. Payload pour l'API ---
      final Map<String, dynamic> data = {
        'actual_balance': actualBalance.toStringAsFixed(2),
        'expected_balance': expectedCashBalance.toStringAsFixed(2),
        'total_sales': _transactions.length,
        'total_amount': ca.toStringAsFixed(2),
        'wave_total': waveTotal.toStringAsFixed(2),
        'om_total': omTotal.toStringAsFixed(2),
        'moovm_total': moovmTotal.toStringAsFixed(2),
        'cb_total': cbTotal.toStringAsFixed(2),
        'momo_total': momoTotal.toStringAsFixed(2),
        'versement_total': versementTotal.toStringAsFixed(2),
        'cash_total': cashTotal.toStringAsFixed(2),
        'total_mobile': totalMobile.toStringAsFixed(2),
        'billetage_final': {},
      };

      if (finalCash != null && finalCash.isNotEmpty) {
        final Map<String, int> billetageFinal = {};
        finalCash.forEach(
          (denom, qty) => billetageFinal[denom.toString()] = qty,
        );
        data['billetage_final'] = billetageFinal;
      }

      final response = await _dio.post(
        'cash-sessions/${_session!.id}/close/',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        final sessionData = responseData['data'] as Map<String, dynamic>;

        // --- 6. Créer l'objet session fermée (sans initialTotals) ---
        final closedSession = CaisseSession(
          id: sessionData['id'],
          userId: _session!.userId,
          startTime: DateTime.parse(sessionData['start_time'].toString()),
          endTime: DateTime.parse(sessionData['end_time'].toString()),
          initialCash: _session!.initialCash,
          currentCash: finalCash,
          transactions: _session!.transactions,
          currency: _session!.currency,
          storeId: _session!.storeId,
        );

        // Résumé
        final summary = {
          'total_sales': _transactions.length,
          'total_amount': ca.toStringAsFixed(2),
          'payments_breakdown': {
            'Espèces': cashTotal,
            'Wave': waveTotal,
            'Orange Money': omTotal,
            'Moov Money': moovmTotal,
            'Carte bancaire': cbTotal,
            'MTN Money': momoTotal,
            'Virement bancaire': versementTotal,
          },
          'cash_expected': expectedCashBalance,
          'cash_declared': actualBalance,
          'difference': difference,
          'billetage_final': finalCash,
        };

        // Réinitialisation
        _currentStoreId = null;
        _cashRegisterId = null;
        _session = null;
        _transactions.clear();
        _sessions.clear();
        _currentSessionId = '';

        notifyListeners();
        return {'success': true, 'data': closedSession, 'summary': summary};
      }

      return {
        'success': false,
        'message':
            'Erreur ${response.statusCode}: ${response.data['error'] ?? response.data}',
      };
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return {'success': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Récupère depuis le serveur le dernier billetage de clôture connu
  /// pour une caisse donnée ([cashRegisterId]), utile pour préremplir le
  /// fond de caisse d'ouverture. Retourne une map vide en cas d'échec.
  Future<Map<String, dynamic>> getLastClosedBilletage(
    int cashRegisterId,
  ) async {
    _errorMessage = null;
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        'cash-sessions/last-closed-billetage/',
        queryParameters: {'cash_register_id': cashRegisterId},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        return response.data;
      }
      return {};
    } catch (e) {
      _errorMessage = 'Erreur getLastClosedBilletage: $e';
      return {};
    }
  }

  /// Récupère la liste des sessions de caisse actuellement ouvertes
  /// (toutes caisses confondues) et met à jour [openSessions]. Utilisé
  /// notamment pour la fermeture forcée d'une session orpheline.
  Future<void> getOpenSessions() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        'cash-sessions/',
        queryParameters: {
          'status': 'open', // ou 'open,suspended' selon votre besoin
          'page_size': 100, // assez grand pour récupérer toutes les ouvertes
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        _openSessions = (data['results'] as List)
            .map((e) => e as Map<String, dynamic>)
            .toList();
        notifyListeners();
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Force la fermeture côté serveur d'une session de caisse ([sessionId])
  /// laissée ouverte (par ex. après un crash ou une déconnexion), avec un
  /// [comment] optionnel justifiant l'action. Si la session forcée est la
  /// session active localement, l'état local est réinitialisé.
  ///
  /// Retourne `true` en cas de succès, `false` sinon.
  Future<bool> forceCloseSession(int sessionId, {String comment = ''}) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        'cash-sessions/$sessionId/force-close/',
        data: {'comment': comment},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        // Si la session fermée est celle actuellement active, on la réinitialise
        if (_session?.id == sessionId) {
          _session = null;
          _transactions.clear();
          _sessions.clear();
          _currentSessionId = '';
          notifyListeners();
        }
        return true;
      }
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Charge l'historique des sessions de caisse, avec filtres optionnels
  /// ([storeId], [cashRegisterId], [status], [dateFrom], [dateTo]) et
  /// pagination automatique.
  ///
  /// Si [refresh] vaut `true`, l'historique est réinitialisé et rechargé
  /// depuis la première page avec les nouveaux filtres, qui sont mémorisés
  /// pour les appels suivants (notamment [loadMoreSessions]). Sinon, la
  /// page suivante (URL `next`) est chargée et ajoutée à [sessionHistory].
  Future<void> fetchSessions({
    int? storeId,
    int? cashRegisterId,
    String? status,
    DateTime? dateFrom,
    DateTime? dateTo,
    bool refresh = false,
  }) async {
    // Réinitialisation si refresh
    if (refresh) {
      _sessionHistory = [];
      _hasMore = true;
      _isLoadingMore = false;
      _nextUrl = null;
    }

    // Vérifier si on peut charger
    if (!_hasMore && !refresh) return;
    if (_isLoadingMore) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      // Construction des paramètres de requête
      String url;
      Map<String, String>? queryParams;

      if (!refresh && _nextUrl != null) {
        // Utiliser directement le lien next
        url = _nextUrl!;
      } else {
        // Construire l'URL avec les filtres mémorisés
        url = 'cash-sessions/';
        queryParams = {};

        if (_lastStoreId != null) {
          queryParams['store_id'] = _lastStoreId.toString();
        }
        if (_lastCashRegisterId != null) {
          queryParams['cash_register_id'] = _lastCashRegisterId.toString();
        }
        if (_lastStatus != null && _lastStatus!.isNotEmpty) {
          queryParams['status'] = _lastStatus!;
        }
        if (_lastDateFrom != null) {
          queryParams['date_from'] = _lastDateFrom!
              .toIso8601String()
              .split('T')
              .first;
        }
        if (_lastDateTo != null) {
          queryParams['date_to'] = _lastDateTo!
              .toIso8601String()
              .split('T')
              .first;
        }
        // Pagination initiale
        queryParams['page'] = '1';
        queryParams['page_size'] = _pageSize.toString();
      }

      final response = await _dio.get(
        url,
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> results = data['results'] ?? [];
        _nextUrl = data['next']; // Sauvegarder pour la prochaine fois
        _hasMore = data['next'] != null;

        List<Map<String, dynamic>> newSessions = results
            .map((e) => e as Map<String, dynamic>)
            .toList();

        if (refresh) {
          _sessionHistory = newSessions;
        } else {
          _sessionHistory.addAll(newSessions);
        }

        notifyListeners();
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  /// Charge la page suivante de l'historique des sessions en réutilisant
  /// les derniers filtres appliqués. Ne fait rien si aucune page
  /// supplémentaire n'est disponible ou si un chargement est déjà en cours.
  Future<void> loadMoreSessions() async {
    if (!_hasMore || _isLoadingMore || _isLoading) return;
    await fetchSessions(
      storeId: _lastStoreId,
      cashRegisterId: _lastCashRegisterId,
      status: _lastStatus,
      dateFrom: _lastDateFrom,
      dateTo: _lastDateTo,
      refresh: false,
    );
  }

  // ============================================================================
  // API - PRODUITS
  // ============================================================================

  /// Finalise la vente du panier de la session client courante.
  ///
  /// Vérifie que le panier n'est pas vide et que le montant total payé
  /// ([payments]) couvre le total de la session, construit le payload de
  /// vente, puis l'enregistre dans l'outbox locale (persistance offline-first)
  /// avant de vider le panier. Si l'appareil est en ligne, une
  /// synchronisation de l'outbox est déclenchée immédiatement en
  /// arrière-plan.
  ///
  /// Retourne une map `{'success': bool, ...}` contenant soit les données
  /// de l'entrée créée dans l'outbox, soit un message d'erreur.
  Future<Map<String, dynamic>> createSaleFromCurrentSession({
    required int storeId,
    required int employeeId,
    required int cashRegisterId,
    required List<Map<String, dynamic>> payments,
  }) async {
    final session = currentSession;
    if (session == null) {
      return {'success': false, 'message': 'Aucune session active'};
    }
    if (session.cart.isEmpty) {
      return {'success': false, 'message': 'Panier vide'};
    }

    final totalPaid = payments.fold(
      0.0,
      (sum, p) => sum + (p['amount'] as double),
    );
    if (totalPaid < session.total) {
      return {
        'success': false,
        'message':
            'Montant total non atteint. Reste: ${(session.total - totalPaid).toStringAsFixed(0)} FCFA',
      };
    }

    _isLoading = true;
    notifyListeners();

    try {
      // 1. Construire le payload
      final salePayments = payments.map((payment) {
        final map = <String, dynamic>{
          'payment_method': payment['methodId'],
          'amount': payment['amount'],
        };
        if (payment.containsKey('card')) {
          final cardValue = payment['card'];
          map['card'] = cardValue is int
              ? cardValue
              : (cardValue as dynamic).id;
        }
        if (payment.containsKey('reference') && payment['reference'] != null) {
          map['reference'] = payment['reference'].toString();
        }
        return map;
      }).toList();

      final Map<int, double> paymentBreakdown = {};
      double cashAmount = 0;
      for (var payment in payments) {
        final methodId = payment['methodId'] as int;
        final amount = payment['amount'] as double;
        paymentBreakdown[methodId] = (paymentBreakdown[methodId] ?? 0) + amount;
        if (methodId == 1) cashAmount += amount;
      }

      final saleItems = session.cart
          .map(
            (item) => {
              'store_product': item.storeProductId,
              'quantity': item.quantity,
              'unit_price': item.unitPrice,
              'tax_rate': item.taxRate,
              'store_variant': item.storeVariantId,
            },
          )
          .toList();

      // 2. Payload complet
      final payload = {
        'store': storeId,
        'employee': employeeId,
        'caisse': cashRegisterId,
        'cash_session': _session?.id,
        'sale_items': saleItems,
        'sale_payments': salePayments,
      };

      // 3. Métadonnées pour finalisation locale
      final outboxId = _uuid.v4();
      final now = DateTime.now().millisecondsSinceEpoch;
      final paymentBreakdownMap = <String, dynamic>{};
      paymentBreakdown.forEach((k, v) {
        paymentBreakdownMap[k.toString()] = v;
      });
      final transactionData = {
        'client_id': session.clientId,
        'amount': session.total,
        'timestamp': now,
        'payment_methods': payments
            .map((p) => p['methodId'].toString())
            .toList(),
        'payment_breakdown': paymentBreakdownMap,
        'cash_amount': cashAmount,
        'total_paid': totalPaid,
      };

      // 4. Encodage JSON sécurisé
      final payloadJson = jsonEncode(payload);
      final transactionJson = jsonEncode(transactionData);

      // 5. Sauvegarder dans l'outbox
      await _localDb.insertOutboxEntry({
        'id': outboxId,
        'store_id': storeId,
        'employee_id': employeeId,
        'cash_register_id': cashRegisterId,
        'cash_session_id': _session?.id,
        'payload': payloadJson,
        'transaction_data': transactionJson,
        'created_at': now,
        'status': 'pending',
        'attempts': 0,
      });

      // 6. Vider le panier
      session.clearCart();

      // 7. Lancer la synchronisation si en ligne
      if (_isOnline) {
        unawaited(syncOutbox());
      }

      // 8. Mettre à jour le compteur
      _pendingSyncCount = await _localDb.getPendingOutboxCount();

      notifyListeners();
      return {
        'success': true,
        'data': {
          'outbox_id': outboxId,
          'synced': _isOnline,
          'message': _isOnline
              ? 'Vente en cours de synchronisation...'
              : 'Vente enregistrée localement, synchronisation automatique dès la connexion.',
        },
      };
    } catch (e) {
      _errorMessage = e.toString();
      NotificationService.showError(null, 'Échec de la vente: $_errorMessage');
      return {'success': false, 'message': _errorMessage};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Recherche une variante de produit par code-barres ([barcode]) pour la
  /// boutique [storeId].
  ///
  /// La recherche est d'abord effectuée dans la base locale (rapide,
  /// disponible hors ligne) ; si aucun résultat n'est trouvé et que
  /// l'appareil est en ligne, une requête serveur est tentée en repli.
  /// Retourne `null` si aucune variante n'est trouvée.
  Future<Variant?> findProductByBarcode(int storeId, String barcode) async {
    // 1. Rechercher d'abord en local
    try {
      final localResult = await _localDb.findProductByBarcode(barcode);
      if (localResult != null) {
        return Variant.fromLocalMap(localResult);
      }
    } catch (e) {
      _errorMessage = 'Erreur recherche locale: $e';
    }

    // 2. Si en ligne, interroger le serveur
    if (_isOnline) {
      try {
        final token = await _storage.getToken();
        if (token == null) return null;
        final response = await _dio.get(
          'store-products/by-barcode/',
          queryParameters: {'store_id': storeId, 'barcode': barcode},
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );
        if (response.statusCode == 200 && response.data != null) {
          return Variant.fromJson(response.data);
        }
      } catch (e) {
        _errorMessage = 'Erreur recherche serveur: $e';
      }
    }
    return null;
  }

  /// Recherche des variantes dans la base locale à partir d'un texte libre
  /// ([query]). Utilisé par exemple par `ProductsSearchSheet`.
  Future<List<Variant>> searchLocalProducts(String query) async {
    try {
      final results = await _localDb.searchProducts(query);
      return results
          .map((row) => Variant.fromJson(row))
          .toList(); // utilise fromJson
    } catch (e) {
      _errorMessage = 'Erreur searchLocalProducts: $e';
      return [];
    }
  }

  /// Recherche paginée de produits dans la base locale pour la boutique
  /// [storeId], avec un texte libre [query] et un décalage optionnel
  /// [offset].
  ///
  /// Retourne une map au format proche d'une réponse paginée d'API
  /// (`results`, `next`, `count`) afin de rester compatible avec le code
  /// appelant, même si la source est désormais purement locale.
  Future<Map<String, dynamic>> searchProducts(
    int storeId,
    String query, {
    int? offset,
  }) async {
    try {
      const limit = 50;
      final results = await _localDb.searchProducts(
        query,
        limit: limit,
        offset: offset,
      );
      final variants = results.map((row) => Variant.fromLocalMap(row)).toList();
      // Pagination simulée : s'il y a exactement 'limit' résultats, on suppose qu'il y en a plus
      final hasMore = results.length == limit;
      return {
        'results': variants.map((v) => v.toJson()).toList(),
        'next': hasMore ? '?offset=${(offset ?? 0) + limit}' : null,
        'count': await _localDb.getProductCount(),
      };
    } catch (e) {
      return {'results': [], 'next': null, 'count': 0};
    }
  }

  // ============================================================================
  // API - HISTORIQUE DES VENTES
  // ============================================================================

  /// Charge l'historique des ventes pour la boutique courante, avec
  /// pagination automatique via le champ `next` de l'API.
  ///
  /// Si [refresh] vaut `true`, réinitialise et recharge depuis la première
  /// page ; sinon, poursuit la pagination et ajoute les nouveaux résultats
  /// à [sales].
  Future<void> fetchSales({bool refresh = false}) async {
    if (refresh) {
      _currentSalesPage = 1;
      _sales = [];
      _hasMoreSales = true;
      _isLoadingSales = false;
      _nextSalesUrl = null;
    }

    if (!_hasMoreSales && !refresh) return;
    if (_isLoadingSales) return;

    _isLoadingSales = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      String url;
      Map<String, String>? queryParams;

      if (!refresh && _nextSalesUrl != null) {
        url = _nextSalesUrl!;
      } else {
        url = 'sales/';
        queryParams = {
          'page': _currentSalesPage.toString(),
          'page_size': '20',
          // Ajoute des filtres si besoin (store_id, date...)
        };
        if (_currentStoreId != null) {
          queryParams['store_id'] = _currentStoreId.toString();
        }
      }

      final response = await _dio.get(
        url,
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        List<dynamic> results = data['results'] ?? [];
        _nextSalesUrl = data['next'];
        _hasMoreSales = data['next'] != null;

        List<Map<String, dynamic>> newSales = results
            .map((e) => e as Map<String, dynamic>)
            .toList();

        if (refresh) {
          _sales = newSales;
        } else {
          _sales.addAll(newSales);
        }
        _currentSalesPage++;
        notifyListeners();
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoadingSales = false;
      notifyListeners();
    }
  }

  /// Charge la page suivante de l'historique des ventes. Ne fait rien s'il
  /// n'y a plus de page à charger ou si un chargement est déjà en cours.
  Future<void> loadMoreSales() async {
    if (!_hasMoreSales || _isLoadingSales) return;
    await fetchSales(refresh: false);
  }

  // ============================================================================
  // Synchronisation de l'OutBox
  // ============================================================================

  /// Synchronise avec le serveur toutes les entrées en attente de
  /// l'outbox locale (ventes créées hors ligne ou non encore confirmées).
  ///
  /// Pour chaque entrée :
  /// - un succès (201) finalise la vente localement et supprime l'entrée ;
  /// - une erreur serveur (5xx) est laissée en attente pour un nouvel essai ;
  /// - une erreur client (4xx) incrémente le compteur de tentatives et
  ///   passe l'entrée en échec définitif après 5 tentatives ;
  /// - une erreur réseau interrompt la tentative pour cette entrée sans
  ///   la marquer en échec.
  ///
  /// Programme automatiquement une nouvelle tentative dans 30 secondes
  /// tant qu'il reste des entrées en attente, sauf après 5 échecs réseau
  /// consécutifs (l'utilisateur doit alors relancer manuellement via
  /// [forceSync]).
  Future<void> syncOutbox() async {
    if (_isSyncing) return;
    if (!_isOnline) {
      _errorMessage =
          'Hors ligne. Les ventes seront synchronisées automatiquement.';
      return;
    }

    _isSyncing = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final entries = await _localDb.getPendingOutboxEntries();
      if (entries.isEmpty) {
        _isSyncing = false;
        _pendingSyncCount = 0;
        _networkRetryCount = 0;
        notifyListeners();
        return;
      }

      int failedCount = 0;
      bool networkErrorOccurred = false;
      bool hasSuccess = false;

      for (var entry in entries) {
        try {
          final payload = jsonDecode(entry['payload']);
          final response = await _dio.post(
            'sales/',
            data: payload,
            options: Options(headers: {'Authorization': 'Bearer $token'}),
          );

          if (response.statusCode == 201) {
            await _finalizeSaleFromOutbox(entry);
            await _localDb.deleteOutboxEntry(entry['id']);
            hasSuccess = true;
          } else {
            final statusCode = response.statusCode;
            if (statusCode != null) {
              if (statusCode >= 500) {
                // Erreur serveur : on ne fait rien, l'entrée reste en attente
              } else if (statusCode >= 400 && statusCode < 500) {
                final attempts = (entry['attempts'] ?? 0) + 1;
                if (attempts >= 5) {
                  await _localDb.updateOutboxStatus(
                    entry['id'],
                    'failed',
                    error:
                        'Erreur client ${response.statusCode}: ${response.data}',
                  );
                } else {
                  await _localDb.updateOutboxStatus(
                    entry['id'],
                    'pending',
                    error:
                        'Erreur client ${response.statusCode}: ${response.data}',
                    incrementAttempts: true,
                  );
                }
                failedCount++;
              } else {
                await _localDb.updateOutboxStatus(
                  entry['id'],
                  'failed',
                  error: 'Erreur HTTP ${response.statusCode}: ${response.data}',
                );
                failedCount++;
              }
            }
          }
        } catch (e) {
          if (await isNetworkError(e)) {
            networkErrorOccurred = true;
            continue;
          }

          if (e is DioException && e.response != null) {
            final statusCode = e.response!.statusCode;
            if (statusCode != null && statusCode >= 500) {
              continue;
            }
            if (statusCode != null && statusCode >= 400 && statusCode < 500) {
              final attempts = (entry['attempts'] ?? 0) + 1;
              if (attempts >= 5) {
                await _localDb.updateOutboxStatus(
                  entry['id'],
                  'failed',
                  error:
                      'Erreur client ${e.response!.statusCode}: ${e.response!.data}',
                );
              } else {
                await _localDb.updateOutboxStatus(
                  entry['id'],
                  'pending',
                  error:
                      'Erreur client ${e.response!.statusCode}: ${e.response!.data}',
                  incrementAttempts: true,
                );
              }
              continue;
            }
          }

          await _localDb.updateOutboxStatus(
            entry['id'],
            'failed',
            error: e.toString(),
          );
          failedCount++;
        }
      }

      // === NOTIFICATIONS UNIQUES ===
      if (hasSuccess) {
        _networkRetryCount = 0;
      } else if (networkErrorOccurred) {
        _networkRetryCount++;
        if (_networkRetryCount == 1) {
          NotificationService.showWarning(
            null,
            'Problème de connexion réseau. Les ventes seront retentées automatiquement.',
          );
        } else if (_networkRetryCount >= 5) {
          NotificationService.showWarning(
            null,
            'Echecs réseau consécutifs. Utilisez le bouton de synchronisation manuelle.',
          );
          _syncTimer?.cancel();
          _syncTimer = null;
        }
      }

      if (failedCount > 0) {
        NotificationService.showError(
          null,
          '$failedCount nouvelle(s) vente(s) définitivement en échec. Total : $_failedCount. Consultez les logs.',
        );
      }

      _pendingSyncCount = await _localDb.getPendingOutboxCount();
      final failedEntries = await _localDb.getFailedOutboxEntries();
      _failedCount = failedEntries.length;

      // Timer automatique
      if (_pendingSyncCount > 0 && _isOnline && _networkRetryCount < 5) {
        _syncTimer?.cancel();
        _syncTimer = Timer(const Duration(seconds: 30), () {
          if (_isOnline) syncOutbox();
        });
      } else if (_pendingSyncCount > 0 && _networkRetryCount >= 5) {
        _syncTimer?.cancel();
        _syncTimer = null;
      }
    } catch (e) {
      _errorMessage = 'Erreur synchronisation: $e';
      NotificationService.showError(null, _errorMessage!);
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Rafraîchit [pendingSyncCount] à partir de la base locale.
  Future<void> getPendingOutboxCount() async {
    _pendingSyncCount = await _localDb.getPendingOutboxCount();
    notifyListeners();
  }

  /// Rafraîchit [failedCount] à partir de la base locale.
  Future<void> get failedOutboxCount async {
    final results = await _localDb.getFailedOutboxEntries();
    _failedCount = results.length;
    notifyListeners();
  }

  /// Reconstitue une [CaisseTransaction] à partir d'une entrée d'outbox
  /// synchronisée avec succès, l'ajoute à [_transactions] et à la session
  /// de caisse, puis met à jour le fond de caisse (encaissement et rendu
  /// de monnaie) si la vente comportait un paiement en espèces.
  Future<void> _finalizeSaleFromOutbox(Map<String, dynamic> entry) async {
    try {
      final transactionData = jsonDecode(entry['transaction_data']);

      // Reconstituer la transaction
      final transaction = CaisseTransaction(
        id: entry['id'],
        clientId: transactionData['client_id'],
        amount: transactionData['amount'],
        timestamp: DateTime.fromMillisecondsSinceEpoch(
          transactionData['timestamp'],
        ),
        paymentMethod: List<String>.from(transactionData['payment_methods']),
        paymentBreakdown: (transactionData['payment_breakdown'] as Map).map(
          (k, v) => MapEntry(int.parse(k.toString()), (v as num).toDouble()),
        ),
      );

      // Ajouter à la session locale
      _transactions.add(transaction);
      _session?.addTransaction(transaction);

      // Mettre à jour le fond de caisse
      final cashAmount = transactionData['cash_amount'] ?? 0.0;
      final totalPaid =
          transactionData['total_paid'] ?? transactionData['amount'];
      if (cashAmount > 0 && _session != null) {
        _session!.updateCurrentCashForCashPayment(cashAmount);
        final change = totalPaid - transactionData['amount'];
        if (change > 0) {
          _session!.updateCurrentCashForChange(change);
        }
      }
    } catch (e) {
      _errorMessage = 'Erreur lors de la finalisation de la vente : $e';
      notifyListeners();
      // L'entrée reste éligible à un nouveau traitement ou passe en échec
      // selon le flux appelant.
    }
  }

  /// Remet en statut "pending" toutes les entrées d'outbox en échec
  /// définitif, puis relance immédiatement [syncOutbox]. N'affiche qu'une
  /// notification d'information s'il n'y a aucune entrée à réessayer.
  Future<void> retryFailedEntries() async {
    final entries = await _localDb.getFailedOutboxEntries();
    if (entries.isEmpty) {
      NotificationService.showInfo(null, 'Aucune vente en échec à réessayer.');
      return;
    }
    for (var entry in entries) {
      await _localDb.updateOutboxStatus(
        entry['id'],
        'pending',
        error: null,
        incrementAttempts: false,
      );
    }
    // Lancer la synchronisation
    await syncOutbox();
    // Forcer la mise à jour du compteur après la sync
    _failedCount = (await _localDb.getFailedOutboxEntries() as List).length;
    _pendingSyncCount = await _localDb.getPendingOutboxCount();
    notifyListeners();
  }

  /// Force une synchronisation immédiate de l'outbox si l'appareil est en
  /// ligne, en réinitialisant le compteur d'échecs réseau consécutifs.
  /// Affiche une erreur si l'appareil est hors ligne.
  Future<void> forceSync() async {
    if (_isOnline) {
      _networkRetryCount = 0;
      await syncOutbox();
    } else {
      _errorMessage = 'Impossible de synchroniser : hors ligne.';
      notifyListeners();
    }
  }

  // ============================================================================
  // Refresh All Data
  // ============================================================================

  /// Rafraîchit l'ensemble des données dépendantes du réseau : recharge le
  /// catalogue produits depuis le serveur, synchronise l'outbox, puis met
  /// à jour les compteurs de ventes en attente et en échec.
  ///
  /// N'a aucun effet si l'appareil est hors ligne.
  Future<void> refreshAllData() async {
    if (!_isOnline) {
      _errorMessage = 'Impossible de rafraîchir : hors ligne.';
      notifyListeners();
      return;
    }

    _isLoading = true;
    _networkRetryCount = 0;
    notifyListeners();
    try {
      await _loadProductsFromServer();
      await syncOutbox();
      _pendingSyncCount = await _localDb.getPendingOutboxCount();
      _failedCount = (await _localDb.getFailedOutboxEntries() as List).length;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Erreur rafraîchissement: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================================================

  /// Efface le message d'erreur courant (à appeler une fois qu'il a été
  /// affiché à l'utilisateur).
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Traduit une [DioException] en message d'erreur lisible par
  /// l'utilisateur, en distinguant les erreurs serveur (avec code de
  /// statut) des erreurs de connexion (timeout, connexion impossible...).
  String _handleDioError(DioException e) {
    if (e.response != null) {
      final statusCode = e.response!.statusCode;
      final responseData = e.response!.data;
      return 'Erreur $statusCode: ${responseData?['error'] ?? responseData}';
    } else if (e.type == DioExceptionType.connectionTimeout) {
      return 'Timeout de connexion au serveur';
    } else if (e.type == DioExceptionType.receiveTimeout) {
      return 'Le serveur met trop de temps à répondre';
    } else if (e.type == DioExceptionType.connectionError) {
      return 'Impossible de se connecter au serveur';
    }
    return e.message ?? 'Erreur inconnue';
  }
}
