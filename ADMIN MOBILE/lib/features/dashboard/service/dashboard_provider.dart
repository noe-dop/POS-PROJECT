// lib/features/dashboard/providers/dashboard_provider.dart

import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/network_utils.dart';
import 'package:nsp_pos_mobile/features/dashboard/viewmodel/dashboard_stats_model.dart';


/// Provider pour gérer le dashboard
class DashboardProvider extends ChangeNotifier {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  String baseUrl = ApiConfig.onlineBaseUrl;

  // État du provider
  bool _isLoading = false;
  bool _hasError = false;
  String? _errorMessage;
  DashboardStats? _dashboardStats;
  int? _selectedStoreId;

  // Getters
  bool get isLoading => _isLoading;
  bool get hasError => _hasError;
  String? get errorMessage => _errorMessage;
  DashboardStats? get dashboardStats => _dashboardStats;
  int? get selectedStoreId => _selectedStoreId;

  // Getters simplifiés pour l'UI
  double get totalRevenue => _dashboardStats?.totalRevenue ?? 0;
  int get totalSales => _dashboardStats?.totalSales ?? 0;
  int get totalProducts => _dashboardStats?.totalProducts ?? 0;
  int get lowStockItems => _dashboardStats?.lowStockItemsCount ?? 0;
  int get totalEmployees => _dashboardStats?.totalEmployees ?? 0;
  double get dailyRevenue => _dashboardStats?.dailyRevenue ?? 0;
  int get dailySalesCount => _dashboardStats?.dailySalesCount ?? 0;
  Map<String, dynamic>? get storeInfo => _dashboardStats?.storeInfo;
  Map<String, dynamic>? get userPermissions => _dashboardStats?.userPermissions;
  List<Map<String, dynamic>>? get recentActivities =>
      _dashboardStats?.recentActivities;
  Map<String, dynamic>? get stockStatus => _dashboardStats?.stockStatus;
  Map<String, dynamic>? get salesTrend => _dashboardStats?.salesTrend;

  DashboardProvider() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null,
    );
    _loadSelectedStore();
  }

  /// Charge la boutique sélectionnée depuis le stockage
  Future<void> _loadSelectedStore() async {
    try {
      final stored = await _storage.getSelectedStore();
      if (stored != null && stored['boutique'] != null) {
        _selectedStoreId = stored['boutique']['id'];
        // Ne pas charger automatiquement, attendre l'appel explicite
      }
    } catch (e) {
      // Ignorer
    }
  }

  /// Définit la boutique sélectionnée et recharge le dashboard
  Future<void> setSelectedStore(int storeId) async {
    if (_selectedStoreId == storeId) return;
    _selectedStoreId = storeId;
    notifyListeners();
    await loadDashboard(storeId);
  }

  /// Charge les données du dashboard pour une boutique
  Future<bool> loadDashboard([int? storeId]) async {
    final id = storeId ?? _selectedStoreId;

    if (id == null) {
      _setError('Aucune boutique sélectionnée');
      return false;
    }

    // Vérifier la connexion internet
    final isConnected = await isServerReachable(baseUrl);
    if (!isConnected) {
      _setError('Pas de connexion internet');
      return false;
    }

    _setLoading(true);

    try {
      final token = await _storage.getToken();
      if (token == null) {
        _setError('Authentification requise');
        return false;
      }

      final response = await _dio.get(
        '${baseUrl}stores/$id/dashboard/',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        _dashboardStats = DashboardStats.fromJson(data);
        _selectedStoreId = id;
        _clearError();
        _setLoading(false);
        notifyListeners();
        return true;
      } else {
        _setError('Erreur ${response.statusCode}: ${response.data}');
        return false;
      }
    } on DioException catch (e) {
      _handleDioError(e);
      return false;
    } catch (e) {
      _setError('Erreur inattendue: $e');
      return false;
    }
  }

  /// Récupère les statistiques uniquement (sans recharger tout le dashboard)
  Future<Map<String, dynamic>?> fetchStatistics([int? storeId]) async {
    final id = storeId ?? _selectedStoreId;

    if (id == null) {
      _setError('Aucune boutique sélectionnée');
      return null;
    }

    try {
      final token = await _storage.getToken();
      if (token == null) {
        _setError('Authentification requise');
        return null;
      }

      final response = await _dio.get(
        '$baseUrl/stores/$id/dashboard/',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        return data['statistics'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Rafraîchit les données du dashboard
  Future<bool> refreshDashboard() async {
    return await loadDashboard();
  }

  /// Récupère les performances de vente (pour les graphiques)
  Future<Map<String, dynamic>?> fetchSalesPerformance({
    int? storeId,
    String period = 'month',
    int limit = 12,
  }) async {
    final id = storeId ?? _selectedStoreId;

    if (id == null) {
      _setError('Aucune boutique sélectionnée');
      return null;
    }

    try {
      final token = await _storage.getToken();
      if (token == null) {
        _setError('Authentification requise');
        return null;
      }

      final response = await _dio.get(
        '$baseUrl/stores/$id/sales_performance/',
        queryParameters: {
          'period': period,
          'limit': limit,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // ================ GESTION DES ERREURS ================

  void _setLoading(bool loading) {
    _isLoading = loading;
    if (loading) {
      _hasError = false;
      _errorMessage = null;
    }
    notifyListeners();
  }

  void _setError(String message) {
    _hasError = true;
    _errorMessage = message;
    _isLoading = false;
    notifyListeners();
  }

  void _clearError() {
    _hasError = false;
    _errorMessage = null;
    notifyListeners();
  }

  void _handleDioError(DioException e) {
    String message;
    if (e.response != null) {
      final data = e.response!.data;
      if (data is Map) {
        message = _parseDjangoErrors(data);
      } else {
        message = 'Erreur ${e.response!.statusCode}: ${e.response!.data}';
      }
    } else if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      message = 'Délai d\'attente dépassé. Vérifiez votre connexion.';
    } else if (e.type == DioExceptionType.connectionError) {
      message = 'Erreur de connexion. Vérifiez votre réseau.';
    } else {
      message = e.message ?? 'Erreur inconnue';
    }
    _setError(message);
  }

  String _parseDjangoErrors(dynamic errorData) {
    if (errorData is Map) {
      final errors = <String>[];

      errorData.forEach((key, value) {
        if (value is List) {
          errors.add('$key: ${value.join(", ")}');
        } else if (value is String) {
          errors.add('$key: $value');
        } else if (value is Map) {
          errors.add('$key: ${_parseDjangoErrors(value)}');
        }
      });

      return errors.join('\n');
    } else if (errorData is String) {
      return errorData;
    }
    return 'Erreur inconnue du serveur';
  }

  // ================ RESET ================

  void reset() {
    _isLoading = false;
    _hasError = false;
    _errorMessage = null;
    _dashboardStats = null;
    notifyListeners();
  }
}