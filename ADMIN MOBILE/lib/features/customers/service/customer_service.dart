// lib/features/customers/service/customer_service.dart
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';

class CustomerService {
  final Dio _dio = Dio();
  final String baseUrl = ApiConfig.onlineBaseUrl;

  Future<List<dynamic>> searchCustomers(String query) async {
    try {
      final token = await StorageService().getToken();
      final response = await _dio.get(
        '${baseUrl}customers/?search=$query',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data['results'] ?? response.data;
    } catch (e) {
      return [];
    }
  }
}