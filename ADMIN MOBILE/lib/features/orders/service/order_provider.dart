import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/orders/viewmodel/order_model.dart';
import 'package:nsp_pos_mobile/features/orders/viewmodel/order_status_model.dart';

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
  static const Duration _pollingInterval = Duration(seconds: 10);
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

    try {
      final OrderStatusModel pendingStatus = _statuses.firstWhere(
        (s) => s.code == 'pending',
      );
      return _orders.where((o) => o.status.id == pendingStatus.id).length;
    } catch (e) {
      return 0;
    }
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
    // Démarrer le timer
    _pollingTimer = Timer.periodic(_pollingInterval, (timer) => _pollOrders());
    notifyListeners();
  }

  // Arrêter le polling
  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _isPolling = false;
    _pollingStoreId = null;
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
        final newOrders = data
            .map((json) => OrderModel.fromJson(json, _statuses))
            .toList();

        // Mise à jour intelligente
        final existingIds = _orders.map((o) => o.id).toSet();
        final Map<int, OrderModel> newOrderMap = {
          for (var o in newOrders) o.id: o,
        };

        List<OrderModel> updatedList = [];
        for (var oldOrder in _orders) {
          if (newOrderMap.containsKey(oldOrder.id)) {
            // Remplacer par la nouvelle version (statut, etc. à jour)
            updatedList.add(newOrderMap[oldOrder.id]!);
            newOrderMap.remove(
              oldOrder.id,
            ); // retirer pour ne pas l'ajouter à la fin
          } else {
            // Conserver l'ancienne (commande supprimée ?)
            updatedList.add(oldOrder);
          }
        }
        // Ajouter les nouvelles commandes (IDs non présents avant)
        updatedList.addAll(newOrderMap.values);

        // Trier par date décroissante (comme l'API)
        updatedList.sort((a, b) => b.createdAt.compareTo(a.createdAt));

        _orders = updatedList;
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) print('Polling error: $e');
    }
  }

  // Récupérer les statuts
  Future<void> fetchStatuses() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        'order-statuses/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List data = response.data['results'] ?? response.data;
        _statuses = data
            .map((json) => OrderStatusModel.fromJson(json))
            .toList();
        notifyListeners();
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

  // Récupérer les commandes
  Future<void> fetchOrders({required int storeId, int? statusId}) async {
    // Charger les statuts s'ils sont vides
    if (_statuses.isEmpty) {
      await fetchStatuses();
      // Si après fetchStatuses ils sont toujours vides, on lève une exception
      if (_statuses.isEmpty) {
        _errorMessage = 'Impossible de charger les statuts des commandes';
        _isLoading = false;
        notifyListeners();
        return;
      }
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final queryParams = <String, String>{'store': storeId.toString()};
      if (statusId != null && statusId != 0) {
        queryParams['status'] = statusId.toString();
      }

      final response = await _dio.get(
        'orders/',
        queryParameters: queryParams,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final List data = response.data['results'] ?? response.data;
        _orders = data.map((json) => OrderModel.fromJson(json, _statuses)).toList();
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
        await fetchOrders(storeId: _currentStoreId!);
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
  Future<bool> cancelOrder(
    int orderId, {
    String reason = 'Annulation par l\'utilisateur',
  }) async {
    try {
      final response = await _dio.post(
        'orders/$orderId/cancel_order/',
        data: {'reason': reason},
      );
      if (response.statusCode == 200) {
        // Mettre à jour la liste des commandes
        await fetchOrders(
          storeId: _currentStoreId!,
        ); // ou mettre à jour localement
        return true;
      } else {
        _errorMessage = 'Erreur ${response.statusCode}';
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    }
  }

  // Convertir en vente
  Future<bool> convertToSale(int orderId,{
    int? employeeId,
    int? cashRegisterId,
    int? cashSessionId,
  }) async {
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final Map<String, dynamic> data = {};
    if (employeeId != null) data['employee_id'] = employeeId;
    if (cashRegisterId != null) data['cash_register_id'] = cashRegisterId;
    if (cashSessionId != null) data['cash_session_id'] = cashSessionId;
      final response = await _dio.post(
        'orders/$orderId/convert_to_sale/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
        data: data.isNotEmpty ? data : null
      );

      if (response.statusCode == 200) {
        await fetchOrders(storeId: _currentStoreId!);
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
        await fetchOrders(storeId: _currentStoreId!);
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
