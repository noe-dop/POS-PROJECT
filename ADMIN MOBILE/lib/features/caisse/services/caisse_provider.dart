// lib/features/caisse/services/caisse_provider.dart

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_transaction.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/cart_item.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/client_session.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/payment_method_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class CaisseProvider extends ChangeNotifier {
  // ============================================================================
  // PROPRIÉTÉS PRIVÉES
  // ============================================================================

  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();

  // Session principale de caisse
  CaisseSession? _session;
  int? _currentStoreId;
  int? _cashRegisterId;
  List<CaisseTransaction> _transactions = [];

  // Sessions clients (un seul système)
  List<ClientSession> _sessions = [];
  String _currentSessionId = '';

  // Méthodes de paiement disponibles
  List<PaymentMethod> _paymentMethods = [];

  // État général
  bool _isLoading = false;
  String? _errorMessage;

  // ============================================================================
  // GETTERS PUBLICS
  // ============================================================================

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int? get currentStoreId => _currentStoreId;
  int? get cashRegisterId => _cashRegisterId;
  CaisseSession? get session => _session;
  List<CaisseTransaction> get transactions => _transactions;
  List<PaymentMethod> get paymentMethods => _paymentMethods;

  // Gestion des sessions clients
  List<ClientSession> get sessions => _sessions;

  int get activeClientsCount => _sessions.length;

  ClientSession? get currentSession {
    try {
      return _sessions.firstWhere((s) => s.id == _currentSessionId);
    } catch (e) {
      return null;
    }
  }

  List<CartItem> get currentCart => currentSession?.cart ?? [];
  double get currentTotal => currentSession?.total ?? 0;
  bool get isCurrentSessionFullyPaid => currentSession?.isFullyPaid ?? false;

  // ============================================================================
  // CONSTRUCTEUR
  // ============================================================================

  CaisseProvider() {
    _setupDioInterceptors();
    fetchPaymentMethods();
  }

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

  void createNewSession({
    String? clientId,
    String? clientName,
    bool isAnonymous = true,
  }) {
    final sessionId = DateTime.now().millisecondsSinceEpoch.toString();
    final newSession = ClientSession(
      id: sessionId,
      clientId: clientId ?? 'anonymous_$sessionId',
      clientName: clientName ?? 'Client ${_sessions.length + 1}',
      cart: [],
      payments: [],
      isAnonymous: isAnonymous,
      createdAt: DateTime.now(),
      cashSessionId: _session?.id,
    );
    _sessions.add(newSession);
    _currentSessionId = sessionId;
    notifyListeners();
  }

  void switchSession(String sessionId) {
    if (_sessions.any((s) => s.id == sessionId)) {
      _currentSessionId = sessionId;
      notifyListeners();
    }
  }

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

  void addItemToCurrentSession(CartItem item) {
    final session = currentSession;
    if (session != null) {
      final existingIndex = session.cart.indexWhere(
        (i) =>
            i.storeProductId ==
            item.storeProductId, // Compare avec storeProductId
      );
      if (existingIndex != -1) {
        session.cart[existingIndex].quantity += item.quantity;
      } else {
        session.cart.add(item);
      }
      notifyListeners();
    }
  }

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

  void removeItemFromCurrentSession(CartItem item) {
    final session = currentSession;
    if (session != null) {
      session.cart.remove(item);
      notifyListeners();
    }
  }

  void clearCurrentSessionCart() {
    final session = currentSession;
    if (session != null) {
      session.clearCart();
      notifyListeners();
    }
  }

  void addPaymentToCurrentSession(int methodId, double amount) {
    final session = currentSession;
    if (session != null) {
      session.addPayment(methodId, amount);
      notifyListeners();
    }
  }

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
      print('Erreur lors de la récupération des méthodes de paiement: $e');
      _errorMessage =
          'Erreur lors de la récupération des méthodes de paiement : $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Dans caisse_provider.dart

  Future<Map<String, dynamic>> createSaleFromCurrentSession(
    int storeId,
    int employeeId,
    int cashRegisterId,
  ) async {
    final session = currentSession;
    if (session == null) {
      return {'success': false, 'message': 'Aucune session active'};
    }

    if (session.cart.isEmpty) {
      return {'success': false, 'message': 'Panier vide'};
    }

    if (!session.isFullyPaid) {
      return {
        'success': false,
        'message':
            'Montant total non atteint. Reste: ${session.remaining.toStringAsFixed(0)} FCFA',
      };
    }

    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      // Construire le breakdown des paiements par méthode
      final Map<int, double> paymentBreakdown = {};
      double cashAmount = 0;

      for (var payment in session.payments) {
        final methodId = payment['methodId'] as int;
        final amount = payment['amount'] as double;
        paymentBreakdown[methodId] = (paymentBreakdown[methodId] ?? 0) + amount;
        if (methodId == 1) {
          // 1 = Espèces
          cashAmount += amount;
        }
      }

      final saleItems = session.cart
          .map(
            (item) => {
              'store_product': item.storeProductId,
              'quantity': item.quantity,
              'unit_price': item.unitPrice,
              'tax_rate': item.taxRate,
            },
          )
          .toList();

      final salePayments = session.payments
          .map(
            (payment) => {
              'payment_method': payment['methodId'],
              'amount': payment['amount'],
            },
          )
          .toList();

      final payload = {
        'store': storeId,
        'employee': employeeId,
        'caisse': cashRegisterId,
        'cash_session': _session?.id,
        'sale_items': saleItems,
        'sale_payments': salePayments,
      };

      print('--- Create Sale Payload: $payload ---');
      print('--- Payment Breakdown: $paymentBreakdown ---');

      final response = await _dio.post(
        'sales/',
        data: payload,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      print(
        '--- Create Sale Response: ${response.statusCode} - ${response.data} ---',
      );

      if (response.statusCode == 201) {
        // Créer la transaction AVEC le breakdown
        final transaction = CaisseTransaction(
          id: response.data['id'].toString(),
          clientId: session.clientId,
          amount: session.total,
          timestamp: DateTime.now(),
          paymentMethod: session.payments
              .map((p) => p['methodId'].toString())
              .toList(),
          paymentBreakdown: paymentBreakdown,
        );

        _transactions.add(transaction);

        // Mettre à jour les totaux dans la session
        _session?.addTransaction(transaction);

        // Mettre à jour le currentCash pour les paiements en espèces
        if (cashAmount > 0 && _session != null) {
          _session!.updateCurrentCashForCashPayment(cashAmount);

          // CORRECTION ICI: Utiliser totalPaid au lieu de paid
          final totalPaid = session.totalPaid; // Changé: paid -> totalPaid
          final change = totalPaid - session.total;
          if (change > 0) {
            _session!.updateCurrentCashForChange(change);
          }
        }

        // Afficher le récapitulatif
        print('--- Récapitulatif des paiements ---');
        for (var entry in paymentBreakdown.entries) {
          final method = _paymentMethods.firstWhere(
            (m) => m.id == entry.key,
            orElse: () => PaymentMethod(
              id: entry.key,
              code: 'unknown',
              name: 'Méthode ${entry.key}',
              isActive: true,
              requiresReference: false,
              feePercentage: 0,
            ),
          );
          print('${method.name}: ${entry.value} FCFA');
        }
        print('Total: ${session.total} FCFA');

        if (_session != null) {
          print(
            'Current Cash après mise à jour: ${_session!.totalCurrentCash} FCFA',
          );
        }

        // Vider le panier et les paiements
        session.clearCart();
        session.clearPayments();

        notifyListeners();
        return {'success': true, 'data': response.data};
      }
      String error = response.data['error'] ?? 'Erreur ${response.statusCode}';
      return {'success': false, 'message': error};
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data?['error'] ?? e.message,
      };
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

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

      // Calculer les totaux par méthode de paiement depuis la session
      final Map<String, double> totalsByMethod = {};

      for (var method in _paymentMethods) {
        final amount = _session!.getTotalForPaymentMethod(method.id);
        if (amount > 0) {
          totalsByMethod[method.name] = amount;
        }
      }

      // Calculer les soldes
      final expectedCashBalance = _session!.cashBalance;
      final actualBalance = finalTotal ?? _session!.totalCurrent;
      final difference = actualBalance - expectedCashBalance;

      // Chiffre d'affaires total de la session
      final ca = _session!.transactions.fold(0.0, (sum, t) => sum + t.amount); 


      // Préparer tous les champs avec des valeurs par défaut
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
      final double cashTotal = totalsByMethod['Espèces'] ?? 0.0;
      final double totalMobile = waveTotal + omTotal + moovmTotal + momoTotal;

      // Construction des données avec TOUS les champs requis
      final Map<String, dynamic> data = {
        // Champs obligatoires
        'actual_balance': actualBalance.toStringAsFixed(2),
        'expected_balance': expectedCashBalance.toStringAsFixed(2),
        'total_sales': _transactions.length,
        'total_amount': ca.toStringAsFixed(2),

        // Totaux par méthode de paiement (TOUS avec valeur par défaut)
        'wave_total': waveTotal.toStringAsFixed(2),
        'om_total': omTotal.toStringAsFixed(2),
        'moovm_total': moovmTotal.toStringAsFixed(2),
        'cb_total': cbTotal.toStringAsFixed(2),
        'momo_total': momoTotal.toStringAsFixed(2),
        'versement_total': versementTotal.toStringAsFixed(2),
        'cash_total': cashTotal.toStringAsFixed(2),
        'total_mobile': totalMobile.toStringAsFixed(2),

        // Billetage final
        'billetage_final': {},
      };

      // Ajouter le billetage final s'il existe
      if (finalCash != null && finalCash.isNotEmpty) {
        final Map<String, int> billetageFinal = {};
        finalCash.forEach((denomination, quantity) {
          billetageFinal[denomination.toString()] = quantity;
        });
        data['billetage_final'] = billetageFinal;
      }

      print('=== CLÔTURE DE CAISSE ===');
      print('Données envoyées:');
      data.forEach((key, value) {
        print('  $key: $value');
      });
      print('==========================');

      final response = await _dio.post(
        'cash-sessions/${_session!.id}/close/',
        data: data,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;
        final sessionData = responseData['data'] as Map<String, dynamic>;

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
          initialTotals: _session!.totalsByPaymentMethod,
        );

        // Sauvegarder le résumé avant de réinitialiser
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

        // Réinitialiser tout l'état
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

  // ============================================================================
  // API - PRODUITS
  // ============================================================================

  Future<Variant?> findProductByBarcode(int storeId, String barcode) async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        'store-products/by-barcode/',
        queryParameters: {'store_id': storeId, 'barcode': barcode},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200 && response.data != null) {
        print('Produit trouvé pour code-barres $barcode: ${response.data}');

        return Variant.fromJson(response.data);
      }
      return null;
    } catch (e) {
      print('❌ Erreur recherche par code-barres: $e');
      return null;
    }
  }

  Future<List<dynamic>> searchProducts(int storeId, String query) async {
    try {
      final token = await _storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        'store-products/?store=$storeId&is_active=true&search=$query',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        return response.data['results'] ?? response.data;
      }
      return [];
    } catch (e) {
      print('❌ Erreur recherche produits: $e');
      return [];
    }
  }

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
