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
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  String? get errorMessage => _errorMessage;
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
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
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
          // _currentUser = User.fromJson(storedData);
          // refreshTokenFromDatabase();
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
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
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
              '${baseUrl}auth/staff/login/',
              data: request.toJson(),
              options: Options(
                sendTimeout: const Duration(seconds: 8),
                receiveTimeout: const Duration(seconds: 8),
              ),
            )
            .timeout(const Duration(seconds: 12));
        if (response.statusCode == 200) {
          _currentUser = User.fromJson(response.data);

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
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refreshTokenFromDatabase() async {
    try {
      final storedRefreshToken = await _storageService.getRefreshToken();
      if (storedRefreshToken == null) {
        throw Exception('No refresh token found');
      }

      final response = await _dio.post(
        '${baseUrl}auth/token/refresh/',
        data: {'refresh': storedRefreshToken},
      );

      if (response.statusCode == 200) {
        final newAccessToken = response.data['access'];
        _currentUser?.accessToken = newAccessToken;

        // Sauvegarder le nouveau token
        await _storageService.saveToken(newAccessToken);
        notifyListeners();
      } else {
        throw Exception('Failed to refresh token: ${response.statusCode}');
      }
    } on DioException catch (e) {
      throw Exception('Token refresh failed: ${e.message}');
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
    } on DioException {
      return false;
    }
  }

  Future<Map<String, dynamic>> requestPasswordReset(String email) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
      final response = await _dio.post(
        '${baseUrl}auth/password-reset/request/',
        data: {'email': email},
      );
      print(response.data);
      if (response.statusCode == 200) {
        print(response.data);
        return {
          'success': true,
          'message': response.data['message'] ?? 'Email envoyé',
        };
      } else {
        _errorMessage = response.data['email'].toString();
        print(_errorMessage);
        return {
          'success': false,
          'message': _errorMessage ?? 'Erreur serveur',
        };
      }
    } catch (e) {
      _errorMessage = 'Erreur de connexion ${e.toString()}';
      print(_errorMessage);
      return {'success': false, 'message': _errorMessage};
    }
  }

  Future<Map<String, dynamic>> confirmPasswordReset({
    required String uid,
    required String token,
    required String newPassword,
    required String confirmPassword,
  }) async {
    try {
      final response = await _dio.post(
        '${baseUrl}auth/password-reset/confirm/',
        data: {
          'uid': uid,
          'token': token,
          'new_password': newPassword,
          'confirm_password': confirmPassword,
        },
      );
      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': response.data['message'] ?? 'Mot de passe réinitialisé',
        };
      } else {
        return {
          'success': false,
          'message': response.data['error'] ?? 'Erreur serveur',
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Erreur de connexion'};
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      _isLoading = true ;
      _errorMessage = null;
      notifyListeners();
      final token = await _storageService.getToken();
      if (token == null) throw Exception('Non authentifié');

      final response = await _dio.post(
        '${baseUrl}auth/change-password/',
        data: {
          'current_password': currentPassword,
          'new_password': newPassword,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        return true;
      } else {
        _errorMessage = response.data['error'] ?? 'Erreur inconnue';
        return false;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data['error'] ?? e.message;
      return false;
    } catch (e) {
      _errorMessage = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
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
      return data['message'] ?? data['error'] ?? data['detail'];
    }
    return null;
  }
}
