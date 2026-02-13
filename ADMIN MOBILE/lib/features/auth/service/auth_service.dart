// import 'dart:convert';
// import 'package:dio/dio.dart';
// import 'package:nsp_pos_mobile/core/config/app_config.dart';
// import 'package:nsp_pos_mobile/core/services/storage_service.dart';
// import 'package:nsp_pos_mobile/features/auth/viewmodel/auth_viewmodel.dart';

// class AuthService {
//   final Dio _dio = Dio();
//   final StorageService _storage = StorageService();

//   AuthService() {
//     _dio.options = BaseOptions(
//       baseUrl: ApiConfig.baseUrl,
//       connectTimeout: const Duration(seconds: 30),
//       receiveTimeout: const Duration(seconds: 30),
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     );
//   }

//   // Inscription
//   Future<Map<String, dynamic>> signUp({
//     required String name,
//     required String email,
//     required String phone,
//     required String password,
//     String? boutiqueId,
//   }) async {
//     try {
//       final response = await _dio.post(
//         '/auth/signup',
//         data: {
//           'name': name,
//           'email': email,
//           'phone': phone,
//           'password': password,
//           'boutiqueId': boutiqueId,
//         },
//       );

//       if (response.statusCode == 201) {
//         final data = response.data;
        
//         // Sauvegarder le token
//         final token = data['token'];
//         if (token != null) {
//           await _storage.saveToken(token);
//         }
        
//         // Sauvegarder les données utilisateur
//         final user = data['user'];
//         if (user != null) {
//           await _storage.saveUserData(user);
//         }
        
//         return {
//           'success': true,
//           'message': 'Inscription réussie',
//           'user': user,
//           'token': token,
//         };
//       }
      
//       return {
//         'success': false,
//         'message': response.data['message'] ?? 'Erreur d\'inscription',
//       };
//     } on DioException catch (e) {
//       return _handleAuthError(e);
//     } catch (e) {
//       return {
//         'success': false,
//         'message': 'Une erreur est survenue: $e',
//       };
//     }
//   }

//   // Connexion
//   Future<Map<String, dynamic>> login(LoginRequest loginRequest, {
//     required String email,
//     required String password,
//   }) async {
//     try {
//       final response = await _dio.post(
//         '/auth/login',
//         data: {
//           'email': email,
//           'password': password,
//         },
//       );

//       if (response.statusCode == 200) {
//         final data = response.data;
        
//         // Sauvegarder le token
//         final token = data['token'];
//         if (token != null) {
//           await _storage.saveToken(token);
//         }
        
//         // Sauvegarder les données utilisateur
//         final user = data['user'];
//         if (user != null) {
//           await _storage.saveUserData(user);
//         }
        
//         return {
//           'success': true,
//           'message': 'Connexion réussie',
//           'user': user,
//           'token': token,
//         };
//       }
      
//       return {
//         'success': false,
//         'message': response.data['message'] ?? 'Erreur de connexion',
//       };
//     } on DioException catch (e) {
//       return _handleAuthError(e);
//     } catch (e) {
//       return {
//         'success': false,
//         'message': 'Une erreur est survenue: $e',
//       };
//     }
//   }

//   // Vérifier si l'utilisateur est connecté
//   Future<bool> isLoggedIn() async {
//     final token = await _storage.getToken();
//     return token != null && token.isNotEmpty;
//   }

//   // Déconnexion
//   Future<void> logout() async {
//     await _storage.clearToken();
//     await _storage.clearUserData();
//   }

//   // Obtenir le token
//   Future<String?> getToken() async {
//     return await _storage.getToken();
//   }

//   // Obtenir les données utilisateur
//   Future<Map<String, dynamic>?> getUserData() async {
//     return await _storage.getUserData();
//   }

//   // Gestion des erreurs d'authentification
//   Map<String, dynamic> _handleAuthError(DioException e) {
//     if (e.response != null) {
//       final statusCode = e.response!.statusCode;
//       final data = e.response!.data;
      
//       switch (statusCode) {
//         case 400:
//           return {
//             'success': false,
//             'message': data['message'] ?? 'Requête invalide',
//           };
//         case 401:
//           return {
//             'success': false,
//             'message': 'Email ou mot de passe incorrect',
//           };
//         case 409:
//           return {
//             'success': false,
//             'message': 'Cet email est déjà utilisé',
//           };
//         case 422:
//           final errors = data['errors'];
//           if (errors != null) {
//             final errorMessage = errors.values.first?.first ?? 'Validation error';
//             return {
//               'success': false,
//               'message': errorMessage,
//             };
//           }
//           return {
//             'success': false,
//             'message': 'Données invalides',
//           };
//         case 500:
//           return {
//             'success': false,
//             'message': 'Erreur serveur',
//           };
//         default:
//           return {
//             'success': false,
//             'message': data['message'] ?? 'Erreur inconnue',
//           };
//       }
//     } else if (e.type == DioExceptionType.connectionTimeout) {
//       return {
//         'success': false,
//         'message': 'Timeout de connexion',
//       };
//     } else if (e.type == DioExceptionType.connectionError) {
//       return {
//         'success': false,
//         'message': 'Erreur de connexion internet',
//       };
//     }
    
//     return {
//       'success': false,
//       'message': 'Une erreur est survenue',
//     };
//   }

//   // Récupérer le mot de passe oublié
//   Future<Map<String, dynamic>> forgotPassword(String email) async {
//     try {
//       final response = await _dio.post(
//         '/auth/forgot-password',
//         data: {'email': email},
//       );

//       if (response.statusCode == 200) {
//         return {
//           'success': true,
//           'message': 'Email de réinitialisation envoyé',
//         };
//       }
      
//       return {
//         'success': false,
//         'message': response.data['message'] ?? 'Erreur',
//       };
//     } on DioException catch (e) {
//       return _handleAuthError(e);
//     }
//   }

//   // Réinitialiser le mot de passe
//   Future<Map<String, dynamic>> resetPassword({
//     required String token,
//     required String newPassword,
//   }) async {
//     try {
//       final response = await _dio.post(
//         '/auth/reset-password',
//         data: {
//           'token': token,
//           'password': newPassword,
//         },
//       );

//       if (response.statusCode == 200) {
//         return {
//           'success': true,
//           'message': 'Mot de passe réinitialisé avec succès',
//         };
//       }
      
//       return {
//         'success': false,
//         'message': response.data['message'] ?? 'Erreur',
//       };
//     } on DioException catch (e) {
//       return _handleAuthError(e);
//     }
//   }
// }