import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/order_model.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/order_status_model.dart';

class OrderProvider extends ChangeNotifier {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  final String baseUrl = ApiConfig.onlineBaseUrl;

  List<OrderModel> _orders = [];
  List<OrderStatusModel> _statuses = [];
  bool _isLoading = false;
  String? _errorMessage;
  int? _currentStoreId;

  Timer? _pollingTimer;
  bool _isPolling = false;
  List<int> _previousOrderIds = [];
  static const Duration _pollingInterval = Duration(seconds:10);
  int? _pollingStoreId;

  // GETTERS

  List<OrderModel> get orders => _orders;
  List<OrderStatusModel> get statuses => _statuses;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isPolling => _isPolling;

  // Commandes en attentes
  int get pendingOrdersCount {
    // Si les statuts ne sont pas encore chargés, on retourne 0
    if (_statuses.isEmpty) return 0;

    final pendingStatus = _statuses.firstWhere(
      (s) => s.code == 'pending',
      orElse: () => throw Exception('Statut "pending" non trouvé'),
    );
    return _orders.where((o) => o.status.id == pendingStatus.id).length;
  }

  OrderProvider() {
    _setupDio();
    fetchStatuses();
  }

  void _setupDio() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      validateStatus: (status) => status != null && status < 600,
    );
  }

  // Démarrer le polling
  void startPolling(int storeId) {
    if (_isPolling) return;
    _pollingStoreId = storeId;
    _isPolling = true;
    // Récupérer les IDs actuels pour référence
    _previousOrderIds = _orders.map((o) => o.id).toList();
    // Démarrer le timer
    _pollingTimer = Timer.periodic(_pollingInterval, (timer) {
      _pollOrders();
    });
    notifyListeners();
  }

  // Arrêter le polling
  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _isPolling = false;
    _pollingStoreId = null;
    _previousOrderIds = [];
    notifyListeners();
  }

  // Méthode de polling
  Future<void> _pollOrders() async {
    if (_pollingStoreId == null) return;
    try {
      final token = await _storage.getToken();
      if (token == null) return;

      final response = await _dio.get(
        'orders/',
        queryParameters: {'store': _pollingStoreId!.toString()},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List data = response.data['results'] ?? response.data;
        if (data is List) {
          final newOrders = data.map((json) => OrderModel.fromJson(json, _statuses)).toList();
          // Détecter les nouvelles commandes (IDs qui n'étaient pas dans la liste précédente)
          final newOrderIds = newOrders.map((o) => o.id).toSet();
          final previousIds = _previousOrderIds.toSet();
          final newlyAddedIds = newOrderIds.difference(previousIds);
          if (newlyAddedIds.isNotEmpty) {
            // Filtrer les nouvelles commandes
            final newlyAddedOrders = newOrders.where((o) => newlyAddedIds.contains(o.id)).toList();
            // Notifier
            // _notifyNewOrders(newlyAddedOrders);
          }
          // Mettre à jour la liste et les IDs précédents
          _orders = newOrders;
          _previousOrderIds = newOrders.map((o) => o.id).toList();
          // Notifier pour mettre à jour l'UI
          notifyListeners();
        }
      }
    } catch (e) {
      // Ignorer les erreurs de polling (log uniquement en debug)
      if (kDebugMode) print('Polling error: $e');
    }
  }

  // Récupérer les statuts
  Future<void> fetchStatuses() async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        'order-statuses/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List data = response.data;
        _statuses = data
            .map((json) => OrderStatusModel.fromJson(json))
            .toList();
        notifyListeners();
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
      }
    } catch (e) {
      _errorMessage = e.toString();
    }
  }

  // Récupérer les commandes
  Future<void> fetchOrders({int? storeId, String? statusCode}) async {
    // Charger les statuts s'ils sont vides
    if (_statuses.isEmpty) {
      await fetchStatuses();
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final queryParams = <String, String>{};
      if (storeId != null) queryParams['store'] = storeId.toString();
      if (statusCode != null && statusCode.isNotEmpty)
        queryParams['status'] = statusCode;

      final response = await _dio.get(
        'orders/',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List data = response.data['results'] ?? response.data;
        _orders = data
            .map((json) => OrderModel.fromJson(json, _statuses))
            .toList();
        _currentStoreId = storeId;
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Changer le statut d'une commande
  Future<bool> updateOrderStatus(int orderId, int statusId) async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        'orders/$orderId/update_status/',
        data: {'status_id': statusId},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        await fetchOrders(storeId: _currentStoreId);
        return true;
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    }
  }

  // Annuler une commande (statut 'cancelled')
  Future<bool> cancelOrder(int orderId) async {
    final cancelledStatus = _statuses.firstWhere(
      (s) => s.code == 'cancelled',
      orElse: () => throw Exception('Statut "cancelled" non trouvé'),
    );
    return updateOrderStatus(orderId, cancelledStatus.id);
  }

  // Convertir en vente
  Future<bool> convertToSale(int orderId) async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        'orders/$orderId/convert_to_sale/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        await fetchOrders(storeId: _currentStoreId);
        return true;
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    }
  }

  // Ajouter un paiement
  Future<bool> addPayment(
    int orderId, {
    required double amount,
    required int paymentMethodId,
    String reference = '',
  }) async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        'orders/$orderId/add_payment/',
        data: {
          'amount': amount,
          'payment_method_id': paymentMethodId,
          'reference': reference,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        await fetchOrders(storeId: _currentStoreId);
        return true;
      } else {
        _errorMessage = 'Erreur ${response.statusCode}: ${response.data}';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    }
  }
}
