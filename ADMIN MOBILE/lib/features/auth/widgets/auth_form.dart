import 'dart:async';

import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/network_utils.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/auth_viewmodel.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class AuthService extends ChangeNotifier {
  final StorageService _storageService = StorageService();
  final Dio _dio = Dio();
  // final baseUrl = 'http://127.0.0.1:8000/api';
  String baseUrl = 'https://eboutik-api.onrender.com/api/';
  // État en mémoire uniquement
  Map<String, dynamic> _userData = {};
  String? _accessToken;
  String? _refreshToken;

  // Getters
  Map<String, dynamic> get userData => Map.from(_userData);
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get isAuthenticated => _accessToken != null && _accessToken!.isNotEmpty;

  AuthService() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      sendTimeout: const Duration(seconds: 8),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null,
    );
    // Charger les données au démarrage
    print("Debug: Loading stored user data...");
    _loadStoredData();
    print("Debug: Stored user data loaded. at ${DateTime.now().toIso8601String()}");

  }

  Future<void> _loadStoredData() async {
    try {
      final storedData = await _storageService.getUserData();
      if (storedData != null) {
        _userData = storedData;
        _accessToken = storedData['access'];
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading stored data: $e');
    }
  }

  Future<void> clearUserData() async {
    await _storageService.clearUserData();
    notifyListeners();
  }

  Future<SignupResponse> signup(SignupRequest request) async {
    // Vérifier la connectivité au serveur avant de tenter la connexion
    if (!await isServerReachable(baseUrl)) {
      return SignupResponse.error(message: LocaleKeys.networkServerUnreachable.tr(), status: 408);
    }
    try {
      final response = await _dio.post(
        '${baseUrl}auth/owner/register/',
        data: request.toJson(),
        options: Options(
          contentType: Headers.jsonContentType,
          responseType: ResponseType.json,
        ),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return SignupResponse.fromJson(response.data, response.statusCode);
      } else {
        throw Exception('Failed to signup: ${response.data}} -${response.statusCode}');
      }
    } on DioException catch (e) {
      if (e.response != null) {
        final errorData = e.response!.statusMessage;
        throw Exception(
          errorData ?? 'Signup failed ,status code: ${e.response!.statusCode}',
        );
      } else {
        throw Exception('Network error: ${e.message}');
      }
    } catch (e) {
      throw Exception('Unexpected error: $e');
    }
  }

  Future<LoginResponse> login(LoginRequest request) async {
    // Vérifier la connectivité au serveur avant de tenter la connexion
    if (!await isServerReachable(baseUrl)) {
      return LoginResponse.error(message: {
        "success": false,
        "message": LocaleKeys.networkServerUnreachable.tr(),
      }, status: 408);
    }
    try {
      // debugPrint("Attempting login for user: ${request.username}");
      try {
        // Tenter la connexion avec timeout court
        final response = await _dio
            .post(
              '${baseUrl}auth/login/',
              data: request.toJson(),
              options: Options(
                sendTimeout: const Duration(seconds: 8),
                receiveTimeout: const Duration(seconds: 8),
              ),
            )
            .timeout(const Duration(seconds: 12));

        if (response.statusCode == 200) {
          final responseData = response.data as Map<String, dynamic>;

          // 1. Extraire les données de la réponse
          final accessToken = responseData['access'] as String;
          final refreshToken = responseData['refresh'] as String;
          final user = responseData['user'] as Map<String, dynamic>;

          // 3. Sauvegarder TOUT en une fois
          await _storageService.saveToken(accessToken);
          await _storageService.saveRefreshToken(refreshToken);
          await _storageService.saveUserData(user);

          // 4. Mettre à jour l'état en mémoire
          _accessToken = accessToken;
          _refreshToken = refreshToken;
          _userData = user;

          final boutiqueService = BoutiqueService();
          boutiqueService.init();

          notifyListeners();

          return LoginResponse.fromJson(response.data, response.statusCode);
        } else {
          return LoginResponse.error(
            message: response.data,
            status: response.statusCode!,
          );
        }
      } on TimeoutException catch (_) {
        // Le serveur est inaccessible
        return LoginResponse.fromJson({
          'error': 'Serveur inaccessible',
          'suggestion': 'Vérifiez que le serveur est démarré et accessible',
        }, 408);
      } catch (e) {
        return LoginResponse.fromJson({
          'error': 'Impossible de joindre le serveur',
        }, 0);
      }
    } on DioException catch (e) {
      return LoginResponse.fromJson({
        "success": false,
        "message": e.message,
      }, e.response?.statusCode);
    } catch (e) {
      return LoginResponse.fromJson({
        "success": false,
        "message": e.toString(),
      }, 500);
    }
  }

  Future<void> getUserProfile() async {
    try {
      final response = await _dio.get(
        '${baseUrl}auth/profile/',
        options: Options(headers: {'Authorization': 'Bearer $_accessToken'}),
      );

      if (response.statusCode == 200) {
        final responseData = response.data as Map<String, dynamic>;

        // 1. Extraire les données de la réponse
        final accessToken = responseData['access'] as String;
        final refreshToken = responseData['refresh'] as String;
        final user = responseData['user'] as Map<String, dynamic>;

        // 3. Sauvegarder TOUT en une fois
        await _storageService.saveToken(accessToken);
        await _storageService.saveRefreshToken(refreshToken);
        await _storageService.saveUserData(user);

        // 4. Mettre à jour l'état en mémoire
        _accessToken = accessToken;
        _userData = user;

        notifyListeners();
      } else {
        throw Exception('Failed to fetch user profile: ${response.statusCode}');
      }
    } on DioException catch (e) {
      throw Exception('Fetch user profile failed: ${e.message}');
    }
  }

  Future<bool> logout(String token) async {
    try {
      
      // Vérifier la connectivité au serveur avant de tenter la déconnexion
      final isReaschable = await isServerReachable(baseUrl);
      if (!isReaschable) {
        print(LocaleKeys.networkServerUnreachable.tr());
        return false;
      }
      final response = await _dio.post(
        '${baseUrl}auth/logout/',
        data: {'refresh': token},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'},
        ),
      );
      if (response.statusCode!= 205) {
        print('Failed to logout: ${response.statusCode}');
        print("Failed response data: ${response.data}");
        return false;
      }
      await clearUserData();
      return true;
    } on DioException catch (e) {
      print('Logout failed: ${e.message}');
      return false;
    }
  }

Future<Map<String, dynamic>> requestReset(String email) async {
    try {
      final response = await _dio.post(
        '${baseUrl}auth/chang-password/',
        data: {'email': email},
      );
      
      return {
        'success': true,
        'message': 'Email de réinitialisation envoyé.',
        'data': response.data,
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'message': e.response?.data?['email']?[0] ?? 
                  'Erreur lors de la demande de réinitialisation.',
      };
    }
  }
  
  Future<Map<String, dynamic>> confirmReset({
    required String uid,
    required String token,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/password-reset/confirm/',
        data: {
          'uid': uid,
          'token': token,
          'new_password': newPassword,
          'confirm_password': confirmPassword,
        },
      );
      
      return {
        'success': true,
        'message': 'Mot de passe réinitialisé avec succès.',
      };
    } on DioException catch (e) {
      final errorData = e.response?.data;
      String errorMessage = 'Erreur lors de la réinitialisation.';
      
      if (errorData is Map) {
        if (errorData['new_password'] != null) {
          errorMessage = errorData['new_password'][0];
        } else if (errorData['token'] != null) {
          errorMessage = 'Lien invalide ou expiré.';
        }
      }
      
      return {
        'success': false,
        'message': errorMessage,
      };
    }
  }
}

