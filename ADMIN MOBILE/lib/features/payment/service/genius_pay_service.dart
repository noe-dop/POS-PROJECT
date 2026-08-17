import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';

class GeniusPayService {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  final String baseUrl = ApiConfig.onlineBaseUrl;

  Future<Map<String, dynamic>> initiatePayment({
    int? orderId,
    int? saleId,
    required double amount,
    required int customerId,
    String paymentMethod = 'CARD',
    String? successUrl,
    String? cancelUrl,
  }) async {
    final token = await _storage.getToken();
    if (token == null) throw Exception('Non authentifié');

    try {
      final response = await _dio.post(
        '${baseUrl}online-payments/initiate_payment/',
        data: {
          if (orderId != null) 'order_id': orderId,
          if (saleId != null) 'sale_id': saleId,
          'amount': amount,
          'customer_id': customerId,
          'payment_method': paymentMethod,
          'success_url': successUrl ?? '${baseUrl}online-payments/success/',
          'cancel_url': cancelUrl ?? '${baseUrl}online-payments/cancel/',
        },
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        return response.data;
      }
      throw Exception('Erreur ${response.statusCode}');
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> checkPaymentStatus(String paymentId) async {
    final token = await _storage.getToken();
    if (token == null) throw Exception('Non authentifié');

    try {
      final response = await _dio.get(
        '${baseUrl}online-payments/$paymentId/check_status/',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        return response.data;
      }
      throw Exception('Erreur ${response.statusCode}');
    } catch (e) {
      rethrow;
    }
  }
}