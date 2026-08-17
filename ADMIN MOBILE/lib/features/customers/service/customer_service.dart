// lib/features/customers/service/customer_service.dart
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';

class CustomerProvider extends ChangeNotifier {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  final String baseUrl = ApiConfig.onlineBaseUrl;

  bool _isLoading = false;
  String? _errorMessage;
  Map<String, dynamic>? _currentCustomer;

  // GETTERS
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get currentCustomer => _currentCustomer;

  void setCurrentCustomer(Map<String, dynamic>? customer) {
    _currentCustomer = customer;
    notifyListeners();
  }

  Future<List<Map<String, dynamic>>> searchCustomers(String query) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}customers/search/',
        queryParameters: {'q': query},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final data = response.data;
        if (data is List) {
          return data.cast<Map<String, dynamic>>();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<bool> createCustomerByCashier({
    required String email,
    required String firstName,
    required String lastName,
    required String phone,
    String? phone2,
    required String cardNumber,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}customers/create_by_cashier/',
        data: {
          'email': email,
          'first_name': firstName,
          'last_name': lastName,
          'phone': phone,
          'phone2': phone2 ?? '',
          'card_number': cardNumber,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );
      print(response.data);
      if (response.statusCode == 201) {
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = response.data['error'] ?? 'Erreur lors de la création';
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data['error'] ?? e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
