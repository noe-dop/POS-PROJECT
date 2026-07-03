import 'dart:async';
import 'package:dio/dio.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/foundation.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/network_utils.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/auth_viewmodel.dart';
import 'package:nsp_pos_mobile/features/auth/viewmodel/user_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class AuthService extends ChangeNotifier {
  final StorageService _storageService = StorageService();
  final Dio _dio = Dio();
  final baseUrl = ApiConfig.onlineBaseUrl;
  User? _currentUser;

  // Getters
  Map<String, dynamic> get userData => Map.from(_currentUser!.toJson());
  String? get accessToken => _currentUser?.accessToken;
  String? get refreshToken => _currentUser?.refreshToken;
  bool get isAuthenticated =>
      _currentUser?.accessToken != null &&
      _currentUser!.accessToken!.isNotEmpty;
  // Getters pratiques
  bool get canManageSales => _currentUser?.canManageSales ?? false;
  bool get canManageProducts => _currentUser?.canManageProducts ?? false;
  bool get canManageEmployees => _currentUser?.canManageEmployees ?? false;
  bool get canViewReports => _currentUser?.canViewReports ?? false;

  User? get currentUser => _currentUser;

  AuthService() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      sendTimeout: const Duration(seconds: 8),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null,
    );
    _loadStoredData();
  }

  Future<void> _loadStoredData() async {
    try {
      final storedData = await _storageService.getUserData();
      if (storedData != null) {
        try {
          _currentUser = User.fromJson(storedData);
        } catch (e) {
          return;
        }
      }
      notifyListeners();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> clearUserData() async {
    await _storageService.clearUserData();
    notifyListeners();
  }

  Future<SignupResponse> signup(SignupRequest request) async {
    try {
      final response = await _dio.post(
        '${baseUrl}auth/owner/register/',
        data: request.toJson(),
        options: Options(
          contentType: Headers.jsonContentType,
          responseType: ResponseType.json,
          // Timeouts déjà définis dans _dio.options
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return SignupResponse.fromJson(response.data, response.statusCode);
      } else {
        // Réponse inattendue (ex: 400, 500)
        String message =
            _extractErrorMessage(response.data) ??
            'Erreur serveur (${response.statusCode})';
        return SignupResponse.error(
          message: message,
          status: response.statusCode ?? 500,
        );
      }
    } on DioException catch (e) {
      // Gestion fine des erreurs réseau
      String message;
      int status = e.response?.statusCode ?? 0;

      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          message = 'Délai d\'attente dépassé. Vérifiez votre connexion.';
          status = 408;
          break;
        case DioExceptionType.connectionError:
          message =
              'Impossible de joindre le serveur. Vérifiez l\'URL ou votre réseau.';
          status = 503;
          break;
        case DioExceptionType.badResponse:
          // Le serveur a répondu avec un code 4xx/5xx
          final data = e.response?.data;
          if (data != null) {
            message = _extractErrorMessage(data) ?? 'Erreur serveur';
          } else {
            message = 'Erreur ${e.response?.statusCode}';
          }
          status = e.response?.statusCode ?? 500;
          break;
        default:
          message = 'Erreur inattendue : ${e.message}';
      }
      return SignupResponse.error(message: message, status: status);
    } catch (e) {
      // Attrape tout autre type d'erreur (ex: erreur de parsing)
      return SignupResponse.error(message: 'Erreur interne : $e', status: 500);
    }
  }

  Future<LoginResponse> login(LoginRequest request) async {
    // Vérifier la connectivité au serveur avant de tenter la connexion
    if (!await isServerReachable(baseUrl)) {
      return LoginResponse.error(
        message: {
          "success": false,
          "message": LocaleKeys.networkServerUnreachable.tr(),
        },
        status: 408,
      );
    }
    try {
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
          _currentUser = User.fromJson(response.data);
          notifyListeners();

          // 3. Sauvegarder TOUT en une fois
          await _storageService.saveToken(_currentUser!.accessToken!);
          await _storageService.saveRefreshToken(_currentUser!.refreshToken!);
          await _storageService.saveUserData(_currentUser!.toJson());

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
        options: Options(
          headers: {'Authorization': 'Bearer ${_currentUser?.accessToken}'},
        ),
      );

      if (response.statusCode == 200) {
        _currentUser = User.fromJson(response.data);

        // 3. Sauvegarder TOUT en une fois
        await _storageService.saveToken(_currentUser!.accessToken!);
        await _storageService.saveRefreshToken(_currentUser!.refreshToken!);
        await _storageService.saveUserData(_currentUser!.toJson());

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
        return false;
      }
      final response = await _dio.post(
        '${baseUrl}auth/logout/',
        data: {'refresh': token},
        options: Options(headers: {'Authorization': 'Bearer $accessToken'}),
      );
      if (response.statusCode != 205) {
        return false;
      }
      await clearUserData();
      return true;
    } on DioException catch (e) {
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
        'message':
            e.response?.data?['email']?[0] ??
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

      return {'success': false, 'message': errorMessage};
    }
  }

  // Fonction utilitaire pour extraire un message lisible depuis la réponse
  String? _extractErrorMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      // Django REST Framework renvoie souvent des erreurs sous forme de dictionnaire
      // Ex: {"email": ["Ce champ est obligatoire."]}
      final firstError = data.values.firstWhere(
        (v) => v is List && v.isNotEmpty,
        orElse: () => null,
      );
      if (firstError is List && firstError.isNotEmpty) {
        return firstError.first.toString();
      }
      // Sinon, chercher "message", "error", "detail"
      return data['message'] ?? data['error'] ?? data['detail'] ?? null;
    }
    return null;
  }
}
