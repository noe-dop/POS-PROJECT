import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/stock/model/stock_model.dart';

class StockProvider extends ChangeNotifier {
  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();

  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _errorMessage;
  List<StockModel> _stocks = [];
  List<StockMovementModel> _movements = [];
  bool _hasMore = true;
  int _currentPage = 1;
  bool _isInitialized = false; // Ajouter un flag d'initialisation

  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  String? get errorMessage => _errorMessage;
  List<StockModel> get stocks => _stocks;
  List<StockMovementModel> get movements => _movements;
  bool get hasMore => _hasMore;

  StockProvider() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    );
    // Ne pas appeler fetchStock ici !
  }

  // Méthode d'initialisation explicite à appeler après le build
  Future<void> init({int? storeId}) async {
    if (_isInitialized) return;
    _isInitialized = true;
    await fetchStock(storeId: storeId);
  }

  Future<List<StockModel>> fetchStock({
    int? storeId,
    bool refresh = false,
  }) async {
    if (refresh) {
      _currentPage = 1;
      _stocks = [];
      _hasMore = true;
    }

    // Éviter les appels multiples pendant le chargement
    if (_isLoading && _stocks.isEmpty) return _stocks;

    _isLoading = _stocks.isEmpty;
    if (!_isLoading) _isLoadingMore = true;
    _errorMessage = null;

    // Utiliser WidgetsBinding pour éviter les notifyListeners pendant le build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifyListeners();
    });

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      String url = '${baseUrl}stocks/?page=$_currentPage';
      if (storeId != null) url += '&store_id=$storeId';

      final response = await _dio.get(
        url,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        final newStocks = data
            .map((json) => StockModel.fromJson(json))
            .toList();

        if (refresh) {
          _stocks = newStocks;
        } else {
          _stocks.addAll(newStocks);
        }

        _hasMore = response.data['next'] != null;
        _currentPage++;

        WidgetsBinding.instance.addPostFrameCallback((_) {
          notifyListeners();
        });
        return _stocks;
      }
      return [];
    } catch (e) {
      _errorMessage = e.toString();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return [];
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    }
  }

  Future<List<StockMovementModel>> fetchStockMovements(int productId) async {
    try {
      final token = await _storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        '${baseUrl}stocks-mouvements/$productId/movements/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _movements = data
            .map((json) => StockMovementModel.fromJson(json))
            .toList();
        notifyListeners();
        return _movements;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> adjustStock({
    required int storeProductId,
    required int quantity,
    required String type,
    String? reason,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}store-products/$storeProductId/adjust_stock/',
        data: jsonEncode({
          'quantity': quantity,
          'type': type,
          'reason': reason ?? '',
        }),
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        await fetchStock(refresh: true);
        return {
          'status': true,
          'message': response.data['message'] ?? 'Stock ajusté',
          'stock': response.data['stock'],
        };
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  List<StockModel> getLowStockItems() {
    return _stocks.where((s) => s.stockStatus == 'low_stock').toList();
  }

  List<StockModel> getOutOfStockItems() {
    return _stocks.where((s) => s.stockStatus == 'out_of_stock').toList();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
