// lib/core/utils/network_utils.dart
import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
// import 'package:flutter/foundation.dart';

/// Teste si le serveur est accessible
Future<bool> isServerReachable(String baseUrl, {Duration timeout = const Duration(seconds: 5)}) async {
  try {
    final dio = Dio(BaseOptions(
      connectTimeout: timeout,
      receiveTimeout: timeout,
    ));
    
    // Simple requête HEAD pour vérifier la disponibilité
    final _ = await dio.head(
      baseUrl,
      options: Options(
        validateStatus: (status) => true, // Accepter tous les status
      ),
    ).timeout(timeout);
    
    // Si on reçoit une réponse (même erreur), le serveur est accessible
    // debugPrint('Server check: Status ${response.statusCode}');
    return true;
  } on TimeoutException catch (_) {
    // debugPrint('Server check: Timeout - Server not reachable');
    return false;
  } catch (e) {
    // debugPrint('Server check: Unexpected error $e');
    return false;
  }
}

/// Version simplifiée pour ping rapide
Future<bool> pingServer(String baseUrl) async {
  try {
    final dio = Dio();
    await dio.get(
      baseUrl,
      options: Options(
        validateStatus: (_) => true,
        receiveTimeout: const Duration(seconds: 3),
      ),
    );
    return true;
  } catch (_) {
    return false;
  }
}
Future<bool> isNetworkError(Object e) async {
  if (e is DioException) {
    // Types d'erreurs réseau
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.connectionError) {
      return true;
    }
    // SocketException sous-jacente
    if (e.error is SocketException) {
      return true;
    }
    // Erreur réseau sans réponse (e.response == null)
    if (e.response == null) {
      return true;
    }
  }
  return false;
}