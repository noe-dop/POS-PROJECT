import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';

class DioService {
  static final DioService _instance = DioService._internal();
  factory DioService() => _instance;
  DioService._internal();

  late Dio _dio;
  final StorageService _storage = StorageService();

  void init() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: Duration(milliseconds: ApiConfig.connectTimeout),
        receiveTimeout: Duration(milliseconds: ApiConfig.receiveTimeout),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-API-Key': ApiConfig.apiKey,
        },
      ),
    );

    // Intercepteurs
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Ajouter le token d'authentification
          final token = await _storage.getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          print('Dio Error: ${error.message}');
          print('Response: ${error.response?.data}');
          return handler.next(error);
        },
      ),
    );
  }

  // GET - Récupérer tous les employés
  Future<List<Map<String, dynamic>>> getEmployees() async {
    try {
      final response = await _dio.get('/employees');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } on DioException catch (e) {
      _handleDioError(e);
      return [];
    }
  }

  // GET - Récupérer un employé par ID
  Future<Map<String, dynamic>> getEmployee(String id) async {
    try {
      final response = await _dio.get('/employees/$id');
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } on DioException catch (e) {
      _handleDioError(e);
      return {};
    }
  }

  // POST - Créer un nouvel employé
  Future<Map<String, dynamic>> createEmployee(Map<String, dynamic> employee) async {
    try {
      final response = await _dio.post(
        '/employees',
        data: employee,
      );
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } on DioException catch (e) {
      _handleDioError(e);
      return {};
    }
  }

  // PUT - Mettre à jour un employé
  Future<Map<String, dynamic>> updateEmployee(String id, Map<String, dynamic> employee) async {
    try {
      final response = await _dio.put(
        '/employees/$id',
        data: employee,
      );
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } on DioException catch (e) {
      _handleDioError(e);
      return {};
    }
  }

  // DELETE - Supprimer un employé
  Future<bool> deleteEmployee(String id) async {
    try {
      await _dio.delete('/employees/$id');
      return true;
    } on DioException catch (e) {
      _handleDioError(e);
      return false;
    }
  }

  // GET - Récupérer toutes les boutiques
  Future<List<Map<String, dynamic>>> getBoutiques() async {
    try {
      final response = await _dio.get('/boutiques');
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } on DioException catch (e) {
      _handleDioError(e);
      return [];
    }
  }

  // POST - Télécharger une image (Multipart avec DIO)
  Future<String> uploadImage(Uint8List imageBytes, String filename) async {
    try {
      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(
          imageBytes,
          filename: filename,
        ),
      });

      final response = await _dio.post(
        '/upload',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );

      return response.data['imageUrl'] ?? '';
    } on DioException catch (e) {
      _handleDioError(e);
      return '';
    }
  }

  // GET - Récupérer les statistiques
  Future<Map<String, dynamic>> getEmployeeStats() async {
    try {
      final response = await _dio.get('/employees/stats');
      return Map<String, dynamic>.from(response.data['data'] ?? {});
    } on DioException catch (e) {
      _handleDioError(e);
      return {};
    }
  }

  // GET - Rechercher des employés
  Future<List<Map<String, dynamic>>> searchEmployees(String query) async {
    try {
      final response = await _dio.get(
        '/employees/search',
        queryParameters: {'q': query},
      );
      return List<Map<String, dynamic>>.from(response.data['data'] ?? []);
    } on DioException catch (e) {
      _handleDioError(e);
      return [];
    }
  }

  // Gestion des erreurs DIO
  void _handleDioError(DioException e) {
    String errorMessage = 'Une erreur est survenue';
    
    if (e.response != null) {
      // Erreur du serveur
      final statusCode = e.response!.statusCode;
      final data = e.response!.data;
      
      switch (statusCode) {
        case 400:
          errorMessage = data['message'] ?? 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Non authentifié';
          // Déconnecter l'utilisateur
          _storage.clearToken();
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur';
          break;
        default:
          errorMessage = data['message'] ?? 'Erreur inconnue';
      }
    } else if (e.type == DioExceptionType.connectionTimeout) {
      errorMessage = 'Timeout de connexion';
    } else if (e.type == DioExceptionType.receiveTimeout) {
      errorMessage = 'Timeout de réception';
    } else if (e.type == DioExceptionType.connectionError) {
      errorMessage = 'Erreur de connexion';
    } else if (e.type == DioExceptionType.cancel) {
      errorMessage = 'Requête annulée';
    }
    
    print('API Error: $errorMessage');
    throw Exception(errorMessage);
  }
}