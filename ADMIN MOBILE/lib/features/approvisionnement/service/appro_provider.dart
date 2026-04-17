import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/approvisionnement/model/appro_model.dart';

class ApprovisionnementProvider extends ChangeNotifier {
  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();

  bool _isLoading = false;
  String? _errorMessage;
  List<ApprovisionnementModel> _approvisionnements = [];
  List<FournisseurModel> _fournisseurs = [];
  ApprovisionnementModel? _selectedAppro;
  bool _isInitialized = false;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<ApprovisionnementModel> get approvisionnements => _approvisionnements;
  List<FournisseurModel> get fournisseurs => _fournisseurs;
  ApprovisionnementModel? get selectedAppro => _selectedAppro;

  ApprovisionnementProvider() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    );
    // Ne pas appeler fetchApprovisionnements ici !
  }

  Future<void> init({int? storeId}) async {
    if (_isInitialized) return;
    _isInitialized = true;
    await Future.wait([
      fetchApprovisionnements(storeId: storeId),
      fetchFournisseurs(),
    ]);
  }

  Future<List<ApprovisionnementModel>> fetchApprovisionnements({
    int? storeId,
  }) async {
    if (_isLoading) return _approvisionnements;

    _isLoading = true;
    _errorMessage = null;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      notifyListeners();
    });

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      String url = '${baseUrl}supplies/';
      if (storeId != null) url += '?store_id=$storeId';

      final response = await _dio.get(
        url,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _approvisionnements = data
            .map((json) => ApprovisionnementModel.fromJson(json))
            .toList();

        WidgetsBinding.instance.addPostFrameCallback((_) {
          notifyListeners();
        });
        return _approvisionnements;
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    }
  }

  Future<List<FournisseurModel>> fetchFournisseurs() async {
    try {
      final token = await _storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        '${baseUrl}suppliers/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = response.data['results'] ?? response.data;
        _fournisseurs = data
            .map((json) => FournisseurModel.fromJson(json))
            .toList();
        notifyListeners();
        return _fournisseurs;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> createApprovisionnement({
    required int fournisseurId,
    required List<Map<String, dynamic>> items,
    String? notes,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}supplies/',
        data: jsonEncode({
          'supplier_id': fournisseurId,
          'items': items,
          'notes': notes ?? '',
        }),
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 201) {
        await fetchApprovisionnements();
        return {'status': true, 'message': 'Commande créée avec succès'};
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> updateStatus(int approId, String status) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.patch(
        '${baseUrl}supplies/$approId/',
        data: jsonEncode({'status': status}),
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        await fetchApprovisionnements();
        return {'status': true, 'message': 'Statut mis à jour'};
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
