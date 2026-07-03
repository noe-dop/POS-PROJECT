import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/cash_register_model.dart';

class CashRegisterService extends ChangeNotifier {
  final String baseUrl = ApiConfig.onlineBaseUrl;
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  bool _isLoading = false;
  String? _errorMessage;
  List<CashRegisterModel> _cashRegisters = [];
  List<CashRegisterModel> _availableCashRegisters = [];

  // Getters
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<CashRegisterModel> get cashRegisters => _cashRegisters;
  List<CashRegisterModel> get availableCashRegisters => _availableCashRegisters;

  CashRegisterService() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    );
  }

  Future<void> fetchCashRegisters(int storeId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');
      final response = await _dio.get(
        'cash-registers/?store=$storeId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final List data = response.data['results'] ?? response.data;
        _cashRegisters = data
            .map((json) => CashRegisterModel.fromJson(json))
            .toList();
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Version simplifiée après modification du backend
  Future<List<CashRegisterModel>> fetchAvailableCashRegisters(
    int storeId,
  ) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.get(
        'cash-registers/available/?store_id=$storeId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data as List<dynamic>;
        _availableCashRegisters = data.map((json) {
          return CashRegisterModel.fromJson(json as Map<String, dynamic>);
        }).toList();
        return _availableCashRegisters;
      }
      return [];
    } catch (e) {
      _errorMessage = e.toString();
      return [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createCashRegister({
    required int storeId,
    required String name,
    String? location,
    bool isActive = true,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');
      final response = await _dio.post(
        'cash-registers/',
        data: {
          'store': storeId,
          'name': name,
          'location': location ?? '',
          'is_active': isActive,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 201) {
        await fetchCashRegisters(storeId);
        return true;
      }
      return false;
    } on DioException catch (e) {
      if (e.response?.data is Map) {
        final Map<dynamic, dynamic> errorData = e.response!.data as Map;
        _errorMessage = errorData.entries
            .map((entry) => '${entry.key}: ${entry.value}')
            .join('\n');
      } else {
        _errorMessage = e.message;
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

  Future<bool> updateCashRegister({
    required int id,
    required String name,
    required int storeId,
    String? location,
    bool isActive = true,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');
      final response = await _dio.put(
        'cash-registers/$id/',
        data: {
          'name': name,
          'store': storeId,
          'location': location ?? '',
          'is_active': isActive,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error'] ?? e.message;
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> deleteCashRegister(int id) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');
      final response = await _dio.delete(
        'cash-registers/$id/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.statusCode == 204;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
