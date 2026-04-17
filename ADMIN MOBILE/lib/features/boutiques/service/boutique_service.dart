import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/network_utils.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';

class BoutiqueService extends ChangeNotifier {
  String baseUrl = ApiConfig.onlineBaseUrl;
  static final _dio = Dio();
  static final storage = StorageService();
  bool _isLoading = false;
  Map listTypes = {};
  BoutiqueModel? boutiques;
  List<BoutiqueType>? boutiqueType;
  String? _errorMessage;

  // Getters
  List<BoutiqueType>? get getBoutiqueTypes => boutiqueType;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  BoutiqueService() {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null,
    );
    init();
  }

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();
    try {
      await fetchBoutiqueTypes();
      await fetchAccessibleStores();
    } catch (e) {
      // print('Erreur lors du chargement: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Manage Store Types
  Future<List<BoutiqueType>?> fetchBoutiqueTypes() async {
    try {
      if (await isServerReachable(baseUrl) == false) {
        return null;
      }
      final response = await _dio.get('${baseUrl}store-types/');
      boutiqueType = (response.data["results"] as List)
          .map((type) => BoutiqueType.fromJson(type))
          .toList();
      notifyListeners();
      return boutiqueType;
    } catch (e) {
      return null;
    }
  }

  // Création de boutique avec support des fichiers
  Future<Map<String, dynamic>> createBoutique(
    BoutiqueFormModel boutiqueData,
  ) async {
    try {
      if (!await isServerReachable(baseUrl)) {
        throw Exception('Serveur inaccessible');
      }
      final String? token = await storage.getToken();
      // 1. Préparer les données complexes
      final openingHoursJson = jsonEncode(
        boutiqueData.openingHours.isNotEmpty
            ? boutiqueData.openingHours
            : {'opening_time': '08:00', 'closing_time': '20:00'},
      );

      final configurationJson = jsonEncode(boutiqueData.configuration ?? {});

      // 2. Créer FormData
      final formData = FormData.fromMap({
        'name': boutiqueData.name,
        'slogan': boutiqueData.slogan ?? '',
        'address_line1': boutiqueData.address.addressLine1,
        'address_line2': boutiqueData.address.addressLine2 ?? '',
        'city': boutiqueData.address.city,
        'state': boutiqueData.address.state,
        'postal_code': boutiqueData.address.postalCode,
        'country': boutiqueData.address.country,
        'latitude': boutiqueData.address.latitude?.toString() ?? '',
        'longitude': boutiqueData.address.longitude?.toString() ?? '',
        'phone': boutiqueData.phone,
        'email': boutiqueData.email,
        'store_type': boutiqueData.storeTypeId.toString(),
        'opening_hours': openingHoursJson,
        'is_active': boutiqueData.isActive.toString(),
        'configuration': configurationJson,
      });

      // Ajouter le logo si présent
      if (boutiqueData.logoFile != null &&
          boutiqueData.logoFile!.existsSync()) {
        formData.files.add(
          MapEntry(
            'logo',
            await MultipartFile.fromFile(
              boutiqueData.logoFile!.path,
              filename: 'logo_${DateTime.now().millisecondsSinceEpoch}.jpg',
            ),
          ),
        );
      }

      // Ajouter la bannière si présente
      if (boutiqueData.bannerFile != null &&
          boutiqueData.bannerFile!.existsSync()) {
        formData.files.add(
          MapEntry(
            'banner',
            await MultipartFile.fromFile(
              boutiqueData.bannerFile!.path,
              filename: 'banner_${DateTime.now().millisecondsSinceEpoch}.jpg',
            ),
          ),
        );
      }

      final response = await _dio.post(
        '${baseUrl}stores/',
        data: formData,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': 'Bearer $token',
          },
        ),
      );

      if (response.statusCode == 201) {
        // Attendre quelques secondes pour laisser le serveur se stabiliser
        await Future.delayed(const Duration(seconds: 2));
        await fetchAccessibleStores();
        return {
          'success': true,
          'message': 'Boutique créée avec succès',
          'data': response.data,
        };
      } else {
        return {
          'success': false,
          'message': 'Erreur ${response.statusCode}',
          'data': response.data,
        };
      }
    } on DioException catch (e) {
      String errorMessage = 'Erreur réseau';
      if (e.response != null) {
        errorMessage = _parseDjangoErrors(e.response!.data);
      } else {
        errorMessage = e.message ?? 'Erreur inconnue';
      }
      return {'success': false, 'message': errorMessage};
    } catch (e) {
      return {'success': false, 'message': 'Erreur inattendue: $e'};
    }
  }

  // Parser les erreurs Django
  String _parseDjangoErrors(dynamic errorData) {
    if (errorData is Map) {
      final errors = <String>[];

      errorData.forEach((key, value) {
        if (value is List) {
          errors.add('$key: ${value.join(", ")}');
        } else if (value is String) {
          errors.add('$key: $value');
        } else if (value is Map) {
          errors.add('$key: ${_parseDjangoErrors(value)}');
        }
      });

      return errors.join('\n');
    } else if (errorData is String) {
      return errorData;
    }

    return 'Erreur inconnue du serveur';
  }

  Future<BoutiqueModel?> fetchBoutiques() async {
    // RECUPERER LES BOUTIQUES PUBLIQUES (pour les clients) et les boutiques accessibles (pour les employés/admin)
    try {
      if ( await isServerReachable(baseUrl) == false) {
        return null;
      }
      // final response = await _dio.get('${baseUrl}stores/');
      // Simulate network request
      await Future.delayed(Duration(seconds: 2));
      notifyListeners();
      return boutiques;
    } catch (e) {
      // print('Error fetching boutiques: $e');
      return null;
    }
  }

  // Données en mémoire
  List<BoutiqueModel?> _publicStores = []; // Pour les clients
  List<StoreWithPermission> _accessibleStores = []; // Pour employés/admin
  StoreWithPermission? _selectedStore;
  // Variables privées
  int _totalProductsAllStrores = 0;
  int _totalEmployeesAllStores = 0;
  double _moyenneEmployeesAllStores = 0.0;

  // Getters
  List<BoutiqueModel> get publicStores => List.from(_publicStores);
  List<StoreWithPermission> get accessibleStores =>
      List.from(_accessibleStores);

  int get totalProductsAllStores => _totalProductsAllStrores;
  int get totalEmployeesAllStores => _totalEmployeesAllStores;
  double get moyenneEmployeesAllStores => _moyenneEmployeesAllStores;

  StoreWithPermission? get selectedStore => _selectedStore;

  // STATS
  // Méthode pour calculer et mettre à jour
  void _calculateEmployeeStats() {
    if (accessibleStores.isEmpty) {
      _totalEmployeesAllStores = 0;
      _moyenneEmployeesAllStores = 0.0;
      return;
    }

    _totalEmployeesAllStores = accessibleStores.fold(0, (total, store) {
      return total + (store.boutique.totalEmployee!);
    });

    _moyenneEmployeesAllStores =
        _totalEmployeesAllStores / accessibleStores.length;
  }

  void _calculateStockProductsStats() {
    if (accessibleStores.isEmpty) {
      _totalProductsAllStrores = 0;
      return;
    }
    _totalProductsAllStrores = accessibleStores.fold(0, (total, store) {
      return total + (store.boutique.totalProducts!);
    });
  }

  // ============================================
  // 1. POUR LES CLIENTS (publique)
  // ============================================

  Future<List<BoutiqueModel?>> fetchPublicStores() async {
    try {
      final response = await _dio.get('stores/');
      if (response.statusCode == 200) {
        _publicStores = (response.data as List)
            .map((json) => BoutiqueModel.fromJson(json))
            .toList();
        notifyListeners();
      }
      return _publicStores;
    } catch (e) {
      // print('Erreur fetchPublicStores: $e');
      return [];
    }
  }

  // ============================================
  // 2. POUR UTILISATEURS CONNECTÉS (avec permissions)
  // ============================================

  Future<List<StoreWithPermission>> fetchAccessibleStores() async {
    try {
      final token = await storage.getToken();
      if (token == null) return [];

      final response = await _dio.get(
        '${baseUrl}stores/my_accessible_stores/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        _accessibleStores = (response.data as List)
            .map((json) => StoreWithPermission.fromJson(json))
            .toList();

        // Charger la boutique précédemment sélectionnée
        await loadSelectedStore();
        storage.saveAllStores(_accessibleStores);
        _calculeStats();

        notifyListeners();
        return _accessibleStores;
      }
      return [];
    } catch (e) {
      // print('Erreur fetchAccessibleStores: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> getStoreDashboard(int storeId) async {
    try {
      final token = await storage.getToken();
      if (token == null) {
        return {'error': 'Authentification requise'};
      }

      final response = await _dio.get(
        'stores/$storeId/dashboard/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      return {'error': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'error': e.toString()};
    }
  }

  // MISE A JOUR DE BOUTIQUE PAR ID
  Future<Map<String, dynamic>> updateStore(BoutiqueModel updatedStore) async {
    try {
      _isLoading = true;
      notifyListeners();
      final token = await storage.getToken();
      final response = await _dio.put(
        '${baseUrl}stores/${updatedStore.id}/',
        data: updatedStore.toJsonUpdate(),
        options: Options(headers: {'Authorization': "Bearer $token"}),
      );

      if (response.statusCode == 200) {
        // Mettre à jour la liste des stores accessibles
        final index = _accessibleStores.indexWhere(
          (store) => store.boutique.id == updatedStore.id,
        );

        if (index != -1) {
          _accessibleStores[index] = StoreWithPermission(
            boutique: updatedStore,
            accessRole: _accessibleStores[index].accessRole,
            permissions: _accessibleStores[index].permissions,
          );
        }
        notifyListeners();
        // Attendre quelques secondes pour laisser le serveur se stabiliser
        await Future.delayed(const Duration(seconds: 5));
        await fetchAccessibleStores();
        return {"success": true};
      } else {
        return {
          "success": false,
          "message":
              "Erreur rencontrée : ${response.data} - ${response.statusCode}",
        };
      }
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // SUPPRESSION DE BOUTIQUE PAR ID APRES CONFIRMATION
  Future<bool> deleteStore(int storeId) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final token = await storage.getToken();
      if (token == null) throw Exception('Token non trouvé');

      final response = await _dio.delete(
        '${baseUrl}stores/$storeId/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 204) {
        // 204 No Content est typique pour DELETE
        // Supprimer localement
        _accessibleStores.removeWhere((store) => store.boutique.id == storeId);
        // Recalculer les stats
        _calculeStats();
        // // Mettre à jour le cache
        // await _cacheStores();
        // Attendre quelques secondes pour laisser le serveur se stabiliser
        await Future.delayed(const Duration(seconds: 5));
        await fetchAccessibleStores();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?.toString() ?? e.message;
      if (e.response?.statusCode == 403) {
        _errorMessage =
            'Vous n\'avez pas les permissions pour supprimer cette boutique';
      } else if (e.response?.statusCode == 404) {
        _errorMessage = 'Boutique non trouvée';
      }
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

  // ============================================
  // 3. GESTION DE LA BOUTIQUE SÉLECTIONNÉE
  // ============================================

  Future<void> selectStore(StoreWithPermission store) async {
    _selectedStore = store;

    // Sauvegarder la sélection
    // TODO:
    // A reactiver
    // await _storageService.saveSelectedStore(store.toJson());

    // Émettre un événement pour notifier le changement
    notifyListeners();
  }

  Future<void> loadSelectedStore() async {
    final stored = await storage.getSelectedStore();
    if (stored != null) {
      final store = StoreWithPermission.fromJson(stored);

      // Vérifier que l'utilisateur a toujours accès à cette boutique
      final hasAccess = _accessibleStores.any(
        (s) => s.boutique.id == store.boutique.id,
      );

      if (hasAccess) {
        _selectedStore = store;
      } else {
        // Si plus d'accès, sélectionner la première boutique accessible
        if (_accessibleStores.isNotEmpty) {
          await selectStore(_accessibleStores.first);
        }
      }
    } else if (_accessibleStores.isNotEmpty) {
      // Aucune boutique sélectionnée, prendre la première
      await selectStore(_accessibleStores.first);
    }
  }

  void clearSelectedStore() {
    _selectedStore = null;
    //TODO
    // A reactiver pour effacer les donnees en memoire
    // _storageService.clearSelectedStore();
    notifyListeners();
  }

  // ============================================
  // 4. VÉRIFICATION DES PERMISSIONS
  // ============================================

  bool canManageProducts() {
    return _selectedStore?.permissions?.contains('manage_products') == true ||
        _selectedStore?.accessRole == 'owner' ||
        _selectedStore?.accessRole == 'owner_primary' ||
        _selectedStore?.accessRole == 'superadmin';
  }

  bool canManageEmployees() {
    return _selectedStore?.permissions?.contains('manage_employees') == true ||
        _selectedStore?.accessRole == 'owner' ||
        _selectedStore?.accessRole == 'owner_primary' ||
        _selectedStore?.accessRole == 'superadmin';
  }

  bool canManageSales() {
    return _selectedStore?.permissions?.contains('manage_sales') == true ||
        _selectedStore?.accessRole == 'owner' ||
        _selectedStore?.accessRole == 'owner_primary' ||
        _selectedStore?.accessRole == 'superadmin';
  }

  bool canViewReports() {
    return _selectedStore?.permissions?.contains('view_reports') == true ||
        _selectedStore?.accessRole == 'owner' ||
        _selectedStore?.accessRole == 'owner_primary' ||
        _selectedStore?.accessRole == 'superadmin';
  }

  bool isStoreOwner() {
    return _selectedStore?.accessRole == 'owner' ||
        _selectedStore?.accessRole == 'owner_primary';
  }

  bool isStoreManager() {
    return _selectedStore?.accessRole == 'manager';
  }

  bool hasMultipleStoreAccess() {
    return _accessibleStores.length > 1;
  }

  void _calculeStats() {
    _calculateEmployeeStats();
    _calculateStockProductsStats();
  }
}
