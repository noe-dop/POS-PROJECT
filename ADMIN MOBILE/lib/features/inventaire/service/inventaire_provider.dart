import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/inventaire/model/inventaire_model.dart';

class InventaireProvider extends ChangeNotifier {
  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();

  bool _isLoading = false;
  String? _errorMessage;
  List<InventaireModel> _inventaires = [];
  List<InventaireItem> _inventaireItems = [];
  InventaireModel? _selectedInventaire;
  bool _isInitialized = false;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<InventaireModel> get inventaires => _inventaires;
  List<InventaireItem> get inventaireItems => _inventaireItems;
  InventaireModel? get selectedInventaire => _selectedInventaire;

  InventaireProvider() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    );
    // Ne pas appeler fetchInventaires ici !
  }

  Future<void> init({int? storeId}) async {
    if (_isInitialized) return;
    _isInitialized = true;
    await fetchInventaires(storeId: storeId);
  }

  Future<List<InventaireModel>> fetchInventaires({int? storeId}) async {
    if (_isLoading) return _inventaires;

    _isLoading = true;
    _errorMessage = null;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifyListeners();
    });

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      String url = '${baseUrl}inventory-counts/';
      if (storeId != null) {
        url += '?store_id=$storeId';
      }

      final response = await _dio.get(
        url,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _inventaires = data
            .map((json) => InventaireModel.fromJson(json))
            .toList();

        WidgetsBinding.instance.addPostFrameCallback((_) {
          notifyListeners();
        });
        return _inventaires;
      } else {
        throw Exception('Erreur ${response.statusCode}');
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return [];
    } catch (e) {
      _errorMessage = e.toString();
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
      return [];
    } finally {
      _isLoading = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    }
  }

  // Récupérer les détails d'un inventaire
  Future<InventaireModel?> fetchInventaireDetails(int inventaireId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        '${baseUrl}inventory-counts/$inventaireId/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        _selectedInventaire = InventaireModel.fromJson(response.data);

        // Récupérer aussi les items
        await fetchInventaireItems(inventaireId);

        notifyListeners();
        return _selectedInventaire;
      } else {
        throw Exception('Erreur ${response.statusCode}');
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
      notifyListeners();
      return null;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Récupérer les items d'un inventaire
  Future<List<InventaireItem>> fetchInventaireItems(int inventaireId) async {
    try {
      final token = await _storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        '${baseUrl}inventory-counts/$inventaireId/items/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _inventaireItems = data
            .map((json) => InventaireItem.fromJson(json))
            .toList();
        notifyListeners();
        return _inventaireItems;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  // Créer un nouvel inventaire
  Future<Map<String, dynamic>> createInventaire({
    required String nom,
    required int storeId,
    String? emplacement,
    List<int>? productIds,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final data = {
        'reference': nom,
        'store': storeId,
        'count_date': DateTime.now().toIso8601String(),
        'location': emplacement ?? '',
        'product_ids': productIds ?? [],
      };

      final response = await _dio.post(
        '${baseUrl}inventory-counts/',
        data: jsonEncode(data),
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 201) {
        await fetchInventaires(storeId: storeId);
        return {
          'status': true,
          'message': 'Inventaire créé avec succès',
          'data': response.data,
        };
      } else {
        return {'status': false, 'message': 'Erreur ${response.statusCode}'};
      }
    } on DioException catch (e) {
      _errorMessage = _handleDioError(e);
      return {'status': false, 'message': _errorMessage};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mettre à jour un item d'inventaire
  Future<Map<String, dynamic>> updateInventaireItem({
    required int inventaireId,
    required int productId,
    required int countedQuantity,
    String? notes,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.patch(
        '${baseUrl}inventory-counts/$inventaireId/items/$productId/',
        data: jsonEncode({
          'counted_quantity': countedQuantity,
          'notes': notes ?? '',
        }),
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        await fetchInventaireItems(inventaireId);
        return {'status': true, 'message': 'Item mis à jour'};
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Valider un inventaire
  Future<Map<String, dynamic>> validateInventaire(int inventaireId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}inventory-counts/$inventaireId/validate/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        await fetchInventaireDetails(inventaireId);
        return {'status': true, 'message': 'Inventaire validé avec succès'};
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  String _handleDioError(DioException e) {
    if (e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map && data.containsKey('error')) {
        return data['error'];
      }
      if (data is Map && data.containsKey('message')) {
        return data['message'];
      }
    }
    return e.message ?? 'Erreur de connexion';
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
