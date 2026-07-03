import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_brand_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_variant_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class ProductProvider extends ChangeNotifier {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  String baseUrl = ApiConfig.onlineBaseUrl;
  final BoutiqueService boutiqueService;

  int? _currentStoreId;
  List<StoreProduct> _products = [];
  final List<StoreProduct> _storeProducts = [];
  List<Product> _unlinkedProducts = [];
  final List<Variant> _unlinkedVariantes = [];
  List<ProductBrand> _brands = [];
  StoreProduct? _selectedProduct;
  StoreProduct? _selectedStoreProduct;
  String _searchQuery = '';
  String _statusFilter = 'Tous';
  bool _isLoading = false;
  String? _error;
  static const int _pageSize = 20;

  // ============================================
  // PAGINATION - PRODUITS LIÉS
  // ============================================
  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMore = true;
  bool _isLoadingMore = false;

  // ============================================
  // PAGINATION - PRODUITS NON LIÉS
  // ============================================
  int _currentOffset = 0;
  int _currentPageUnlinked = 1;
  int _totalPagesUnlinked = 1;
  bool _hasMoreUnlinked = true;
  bool _isLoadingMoreUnlinked = false;

  // Getters
  List<Product> get unlinkedProducts => _unlinkedProducts;
  List<Variant> get unlinkedVariants => _unlinkedVariantes;
  List<StoreProduct> get products => _products;
  List<ProductBrand> get brands => _brands;
  String get statusFilter => _statusFilter;

  bool get hasMore => _hasMore;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMoreUnlinked => _hasMoreUnlinked;
  bool get isLoadingMoreUnlinked => _isLoadingMoreUnlinked;
  int get currentPage => _currentPage;
  int get totalPages => _totalPages;
  int get currentPageUnlinked => _currentPageUnlinked;
  int get totalPagesUnlinked => _totalPagesUnlinked;

  List<StoreProduct> get filteredProducts => products.where((p) {
    final matchesSearch =
        _searchQuery.isEmpty ||
        p.product.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        p.product.sku!.toLowerCase().contains(_searchQuery.toLowerCase());
    final matchesStatus = _statusFilter == 'Tous' || p.status == _statusFilter;
    return matchesSearch && matchesStatus;
  }).toList();

  int? get currentStoreId => _currentStoreId;
  StoreProduct? get selectedProduct => _selectedProduct;
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<StoreProduct> get storeProducts => _storeProducts;
  List<StoreProduct> get filteredStoreProducts => _storeProducts.where((sp) {
    final matchesSearch =
        _searchQuery.isEmpty ||
        sp.product.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        sp.product.sku!.toLowerCase().contains(_searchQuery.toLowerCase());
    final matchesStatus = _statusFilter == 'Tous' || sp.status == _statusFilter;
    return matchesSearch && matchesStatus;
  }).toList();

  StoreProduct? get selectedStoreProduct => _selectedStoreProduct;

  ProductProvider({required this.boutiqueService}) {
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      sendTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
      validateStatus: (status) => status != null,
    );
    boutiqueService.addListener(onStoreChanged);
    Future.microtask(onStoreChanged);
    loadBrand();
  }

  void setStore(int storeId) {
    if (_currentStoreId != storeId) {
      _currentStoreId = storeId;
      unawaited(loadStoreProducts(_currentStoreId!));
    }
  }

  void onStoreChanged() {
    final selected = boutiqueService.selectedStore;
    if (selected != null) {
      _currentStoreId = selected.boutique.id;
      unawaited(loadStoreProducts(_currentStoreId!, refresh: true));
      unawaited(loadUnlinkedProducts(_currentStoreId!, refresh: true));
    } else {
      _currentStoreId = null;
      _products = [];
      _unlinkedProducts = [];
      _hasMore = true;
      _hasMoreUnlinked = true;
      _currentPage = 1;
      _currentPageUnlinked = 1;
    }
    _selectedProduct = null;
    notifyListeners();
  }

  // ============================================
  // LOAD STORE PRODUCTS AVEC PAGINATION INFINIE
  // ============================================
  Future<void> loadStoreProducts(int storeId, {bool refresh = false}) async {
    if (_currentStoreId == null) return;

    if (refresh) {
      _currentPage = 1;
      _products = [];
      _hasMore = true;
    }

    if (!_hasMore && !refresh) return;
    if (_isLoadingMore) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}stores/$storeId/products/',
        queryParameters: {
          'page': _currentPage,
          'page_size': 20,
          if (_searchQuery.isNotEmpty) 'search': _searchQuery,
          if (_statusFilter != 'Tous') 'status': _statusFilter,
        },
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        List dataList;
        if (response.data is Map && response.data.containsKey('results')) {
          dataList = response.data['results'];
          _totalPages = response.data['total_pages'] ?? 1;
          _currentPage = (response.data['current_page'] ?? _currentPage) + 1;
          _hasMore = _currentPage <= _totalPages;
        } else if (response.data is List) {
          dataList = response.data;
          _hasMore = false;
        } else {
          dataList = [];
          _hasMore = false;
        }

        List<StoreProduct> tempStoreProducts = [];
        for (var i = 0; i < dataList.length; i++) {
          try {
            final storeProduct = StoreProduct.fromJson(dataList[i]);
            tempStoreProducts.add(storeProduct);
          } catch (e, stack) {
            _error = "Erreur parsing store product: $e - $stack";
            rethrow;
          }
        }

        if (refresh) {
          _products = tempStoreProducts;
        } else {
          _products.addAll(tempStoreProducts);
        }

        notifyListeners();
      } else {
        print("Erreur : ${response.data}- ${response.statusCode}");
        if (refresh) _products = [];
      }
    } on DioException catch (e) {
      _error = e.response?.data?.toString() ?? e.message;
      print(_error);
    } finally {
      _isLoading = false;
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  // ============================================
  // CHARGER PLUS DE PRODUITS (SCROLL INFINI)
  // ============================================
  Future<void> loadMoreStoreProducts() async {
    if (!_hasMore || _isLoadingMore || _isLoading) return;
    if (_currentStoreId == null) return;

    _isLoadingMore = true;
    notifyListeners();

    try {
      await loadStoreProducts(_currentStoreId!, refresh: false);
    } catch (e) {
      _error = ("Erreur chargement plus: $e");
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  // ============================================
  // LOAD UNLINKED PRODUCTS AVEC PAGINATION
  // ============================================

  Future<List<Product>> loadUnlinkedProducts(
    int storeId, {
    bool refresh = false,
  }) async {
    if (_currentStoreId == null || _currentStoreId != storeId) {
      _currentStoreId = storeId;
      refresh = true;
    }

    if (refresh) {
      _currentOffset = 0;
      _unlinkedProducts = [];
      _hasMoreUnlinked = true;
      _isLoadingMoreUnlinked = false;
    }

    if (!_hasMoreUnlinked && !refresh) return _unlinkedProducts;
    if (_isLoadingMoreUnlinked && !refresh) return _unlinkedProducts;

    if (!refresh) {
      _isLoadingMoreUnlinked = true;
    } else {
      _isLoading = true;
    }
    _error = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) {
        throw Exception('Non authentifié');
      }

      print(
        '📤 Requête: offset=$_currentOffset, limit=$_pageSize, search=$_searchQuery',
      );

      final response = await _dio.get(
        '${baseUrl}stores/$storeId/available-products/',
        queryParameters: {
          'limit': _pageSize,
          'offset': _currentOffset,
          if (_searchQuery.isNotEmpty) 'search': _searchQuery,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        print('📦 Réponse API: ${response.data}');

        List<Product> newProducts = [];
        int totalCount = 0;

        if (response.data is Map && response.data.containsKey('results')) {
          final results = response.data['results'] as List? ?? [];
          totalCount = response.data['count'] ?? 0;

          newProducts = results.map((json) => Product.fromJson(json)).toList();

          // Vérifier si on a atteint la fin
          final currentLimit = response.data['limit'] ?? _pageSize;
          _hasMoreUnlinked = (_currentOffset + currentLimit) < totalCount;

          print(
            '📊 Total: $totalCount, Offset: $_currentOffset, HasMore: $_hasMoreUnlinked',
          );
        } else if (response.data is List) {
          newProducts = (response.data as List)
              .map((json) => Product.fromJson(json))
              .toList();
          _hasMoreUnlinked = false;
        }

        if (refresh) {
          _unlinkedProducts = newProducts;
        } else {
          // Éviter les doublons
          final existingIds = _unlinkedProducts.map((p) => p.id).toSet();
          final uniqueNewProducts = newProducts
              .where((p) => !existingIds.contains(p.id))
              .toList();
          _unlinkedProducts.addAll(uniqueNewProducts);
        }

        // Mettre à jour l'offset pour la prochaine page
        if (newProducts.isNotEmpty) {
          _currentOffset += newProducts.length;
        }


        return _unlinkedProducts;
      } else {
        _error = 'Erreur ${response.statusCode}: ${response.data}';
        return _unlinkedProducts;
      }
    } on DioException catch (e) {
      _error = e.response?.data?.toString() ?? e.message;
      return _unlinkedProducts;
    } finally {
      _isLoading = false;
      _isLoadingMoreUnlinked = false;
      notifyListeners();
    }
  }

  // ============================================
  // CHARGER PLUS DE PRODUITS NON LIÉS
  // ============================================
  Future<void> loadMoreUnlinkedProducts() async {
    if (!_hasMoreUnlinked || _isLoadingMoreUnlinked || _isLoading) return;
    if (_currentStoreId == null) return;

    _isLoadingMoreUnlinked = true;
    notifyListeners();

    try {
      await loadUnlinkedProducts(_currentStoreId!, refresh: false);
    } catch (e) {
      print("❌ Erreur chargement plus produits non liés: $e");
    } finally {
      _isLoadingMoreUnlinked = false;
      notifyListeners();
    }
  }

  // ============================================
  // LINK PRODUCT TO STORE
  // ============================================
  Future<bool> linkProductToStore(
    Product product, {
    double? storePrice,
    double? storeCost,
    int? supplierId,
    bool linkAllVariants = true,
  }) async {
    if (_currentStoreId == null) {
      _error = "Aucune boutique sélectionnée";
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception("Non authentifié");

      final Map<String, dynamic> data = {
        'store': _currentStoreId,
        'product': product.id,
        'link_all_variants': linkAllVariants,
        if (storePrice != null) 'store_base_price': storePrice,
        if (storeCost != null) 'store_cost_price': storeCost,
        if (supplierId != null) 'supplier': supplierId,
      };

      final response = await _dio.post(
        '${baseUrl}store-products/',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 201) {
        await loadStoreProducts(_currentStoreId!, refresh: true);
        await loadUnlinkedProducts(_currentStoreId!, refresh: true);
        return true;
      } else {
        _error = "Erreur ${response.statusCode}: ${response.data}";
        return false;
      }
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // LIER PLUSIEURS PRODUITS À LA BOUTIQUE
  // ============================================
  Future<Map<String, dynamic>> linkMultipleProductsToStore(
    List<Product> products, {
    double? storePrice,
    double? storeCost,
    int? supplierId,
  }) async {
    if (_currentStoreId == null) {
      return {'status': false, 'message': 'Aucune boutique sélectionnée'};
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    int successCount = 0;
    int failCount = 0;
    List<String> errors = [];

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception("Non authentifié");

      for (var product in products) {
        try {
          final Map<String, dynamic> data = {
            'store': _currentStoreId,
            'product': product.id,
            if (storePrice != null) 'store_base_price': storePrice,
            if (storeCost != null) 'store_cost_price': storeCost,
            if (supplierId != null) 'supplier': supplierId,
          };

          final response = await _dio.post(
            '${baseUrl}store-products/',
            data: data,
            options: Options(headers: {'Authorization': 'Bearer $token'}),
          );

          if (response.statusCode == 201) {
            successCount++;
          } else {
            failCount++;
            errors.add('${product.name}: ${response.data}');
          }
        } catch (e) {
          failCount++;
          errors.add('${product.name}: $e');
        }
      }

      await loadStoreProducts(_currentStoreId!, refresh: true);
      await loadUnlinkedProducts(_currentStoreId!, refresh: true);

      return {
        'status': successCount > 0,
        'success': successCount,
        'failed': failCount,
        'errors': errors,
        'message':
            '$successCount produit(s) lié(s) avec succès${failCount > 0 ? ', $failCount échec(s)' : ''}',
      };
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // UPDATE STORE PRODUCT
  // ============================================
  Future<Map<String, dynamic>> updateStoreProduct(
    StoreProduct storeProduct,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.put(
        "${baseUrl}store-products/${storeProduct.id}/",
        data: storeProduct.toJson(),
        options: Options(headers: {"Authorization": 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final index = _storeProducts.indexWhere((p) => p.id == storeProduct.id);
        if (index != -1) {
          _storeProducts[index] = StoreProduct.fromJson(response.data);
        }
        onStoreChanged();
        return {'status': true, 'message': 'Mise à jour réussie'};
      } else {
        print("❌ Erreur ${response.statusCode}: ${response.data}");
        _error = "Erreur ${response.statusCode}";
        return {'status': false, 'message': _error};
      }
    } catch (e) {
      _error = e.toString();
      print('❌ Exception: $_error');
      return {'status': false, 'message': _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // DELETE STORE PRODUCT
  // ============================================

  /// Supprime un produit de la boutique (StoreProduct)
  Future<Map<String, dynamic>> deleteStoreProduct(int storeProductId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) {
        return {'success': false, 'message': 'Non authentifié'};
      }

      final response = await _dio.delete(
        '${baseUrl}store-products/$storeProductId/',
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 204) {
        return {'success': true, 'message': 'Produit supprimé avec succès'};
      }
      return {
        'success': false,
        'message': 'Erreur ${response.statusCode}: ${response.data}',
      };
    } on DioException catch (e) {
      return {
        'success': false,
        'message': 'Erreur: ${e.response?.data['message'] ?? e.message}',
      };
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // RECHERCHE AVEC MISE À JOUR
  // ============================================
  void setSearchQuery(String query) {
    if (_searchQuery != query) {
      _searchQuery = query;
      _currentPage = 1;
      _currentPageUnlinked = 1;
      _products = [];
      _unlinkedProducts = [];
      _hasMore = true;
      _hasMoreUnlinked = true;
      if (_currentStoreId != null) {
        loadStoreProducts(_currentStoreId!, refresh: true);
        loadUnlinkedProducts(_currentStoreId!, refresh: true);
      }
    }
    notifyListeners();
  }

  void setStatusFilter(String filter) {
    _statusFilter = filter;
    _currentPage = 1;
    _products = [];
    _hasMore = true;
    if (_currentStoreId != null) {
      loadStoreProducts(_currentStoreId!, refresh: true);
    }
    notifyListeners();
  }

  // ============================================
  // REFRESH STORE PRODUCT
  // ============================================
  Future<void> refreshStoreProduct(int storeProductId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}store-products/$storeProductId/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final updatedProduct = StoreProduct.fromJson(response.data);

        final index = _products.indexWhere((p) => p.id == storeProductId);
        if (index != -1) {
          _products[index] = updatedProduct;
        }
        _selectedProduct = updatedProduct;
        notifyListeners();
      }
    } catch (e) {
      print('❌ Erreur refreshStoreProduct: $e');
    }
    return;
  }

  // ============================================
  // ADD / UPDATE / DELETE PRODUCT
  // ============================================
  Future<Map<String, dynamic>> addProduct(Product product) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final formData = FormData.fromMap({
        'name': product.name,
        'brand': product.brand,
        'group': product.groupeId,
        'product_type': product.typeId,
        'base_price': product.price,
        'cost_price': product.cost,
        'nombre_item': product.nombreItem,
        'description': product.description,
        'status': product.status,
        'is_active': true,
      });
      if (product.imagesUrls!.isNotEmpty) {
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(product.imagesUrls!.first),
          ),
        );
        for (var i = 1; i < product.imagesUrls!.length; i++) {
          formData.files.add(
            MapEntry(
              'additional_images',
              await MultipartFile.fromFile(product.imagesUrls![i]),
            ),
          );
        }
      }
      final response = await _dio.post(
        '${baseUrl}products/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );
      if (response.statusCode == 201) {
        return {"status": true, "message": 'Produit créé avec succès'};
      } else {
        print(
          "Erreur lors de la création ${response.data}-${response.statusCode}",
        );
        return {
          "status": false,
          "message": 'Erreur ${response.data}-${response.statusCode}',
        };
      }
    } catch (e) {
      _error = e.toString();
      print(_error);
      return {"status": false, "message": _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> updateProduct(Product product) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      final formData = FormData.fromMap({
        'name': product.name,
        'brand': product.brand,
        'group': product.groupeId,
        'product_type': product.typeId,
        'base_price': product.price,
        'cost_price': product.cost,
        'nombre_item': product.nombreItem,
        'description': product.description,
        'status': product.status,
        'is_active': true,
      });

      final List<String> existingImages = [];
      final List<String> newImages = [];

      for (String imagePath in product.imagesUrls!) {
        if (imagePath.startsWith('http://') ||
            imagePath.startsWith('https://')) {
          existingImages.add(imagePath);
        } else {
          newImages.add(imagePath);
        }
      }

      if (existingImages.isNotEmpty) {
        formData.fields.add(
          MapEntry('existing_images', existingImages.join(',')),
        );
      }

      if (newImages.isNotEmpty) {
        if (newImages.first.isNotEmpty) {
          final file = File(newImages.first);
          if (await file.exists()) {
            final photoFile = await MultipartFile.fromFile(
              newImages.first,
              filename: newImages.first.split('/').last,
            );
            formData.files.add(MapEntry('photo', photoFile));
          }
        }

        for (int i = 1; i < newImages.length; i++) {
          final file = File(newImages[i]);
          if (await file.exists()) {
            final additionalFile = await MultipartFile.fromFile(
              newImages[i],
              filename: newImages[i].split('/').last,
            );
            formData.files.add(MapEntry('additional_images', additionalFile));
          }
        }
      }

      final response = await _dio.put(
        '${baseUrl}products/${product.id}/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );
      if (response.statusCode == 200) {
        final updatedProduct = Product.fromJson(response.data);
        final index = _products.indexWhere(
          (p) => p.product.id == updatedProduct.id,
        );
        if (index != -1) {
          _products[index].product = updatedProduct;
          notifyListeners();
        }
        await loadStoreProducts(_currentStoreId!, refresh: true);
        return {"status": true, "message": 'Produit mis à jour avec succès'};
      }
      return {
        "status": false,
        "message": 'Erreur ${response.data}-${response.statusCode}',
      };
    } catch (e) {
      _error = e.toString();
      return {
        "status": false,
        "message": 'Erreur lors de la mise à jour: $_error',
      };
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteProduct(int id) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      await _dio.delete(
        '${baseUrl}products/$id/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      _products.removeWhere((p) => p.id == id);
      if (_selectedProduct?.id == id) _selectedProduct = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectProduct(StoreProduct? product) {
    _selectedProduct = product;
    notifyListeners();
  }

  // ============================================
  // VARIANTES
  // ============================================
  Future<List<Variant>> loadVariants(int storeProductId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}products/$storeProductId/variants/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        List variantsList;
        if (response.data is Map && response.data.containsKey('results')) {
          variantsList = response.data['results'];
        } else if (response.data is List) {
          variantsList = response.data;
        } else {
          variantsList = [];
        }
        return variantsList.map((json) => Variant.fromJson(json)).toList();
      }
    } catch (e) {
      print('Erreur chargement variantes: $e');
    }
    return [];
  }

  Future<Map<String, dynamic>> createVariant(
    int productId,
    Map<String, dynamic> data,
  ) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final formData = FormData.fromMap({
        'barcode': data['barcode'],
        'name': data['name'],
        'quantity': data['quantity'],
        'sale_price_1': data['sale_price_1'],
        if (data.containsKey('sale_price_2'))
          'sale_price_2': data['sale_price_2'],
        if (data.containsKey('compare_price'))
          'compare_price': data['compare_price'],
      });

      if (data.containsKey('photo') && data['photo'] != null) {
        final XFile image = data['photo'];
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(image.path, filename: image.name),
          ),
        );
      }

      final response = await _dio.post(
        '${baseUrl}product-variants/$productId/variants/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );

      if (response.statusCode == 201) {
        final newVariant = Variant.fromJson(response.data);
        return {
          'status': true,
          'data': newVariant,
          'message': 'Variante créée',
        };
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> updateGlobalVariant(
    int variantId,
    Map<String, dynamic> data,
    XFile? image,
  ) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();

      final formData = FormData.fromMap({
        'product': data['product'],
        'barcode': data['barcode'],
        'name': data['name'],
        'quantity': data['quantity'],
        'sale_price_1': data['sale_price_1'],
        if (data.containsKey('sale_price_2'))
          'sale_price_2': data['sale_price_2'],
        if (data.containsKey('compare_price'))
          'compare_price': data['compare_price'],
      });

      if (image != null && !image.path.contains('http')) {
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(
              image.path,
              filename: image.name,
              contentType: DioMediaType('image', 'jpeg'),
            ),
          ),
        );
      }

      final response = await _dio.put(
        '${baseUrl}product-variants/$variantId/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );
      if (response.statusCode == 200) {
        final updatedVariant = Variant.fromJson(response.data);

        for (var storeProduct in _products) {
          if (storeProduct.product.id == data['product']) {
            final variantIndex =
                storeProduct.product.variants?.indexWhere(
                  (v) => v.id == variantId,
                ) ??
                -1;
            if (variantIndex != -1) {
              storeProduct.product.variants![variantIndex] = updatedVariant;
            }
          }
        }

        if (_selectedProduct?.product.id == data['product']) {
          final variantIndex =
              _selectedProduct?.product.variants?.indexWhere(
                (v) => v.id == variantId,
              ) ??
              -1;
          if (variantIndex != -1) {
            _selectedProduct!.product.variants![variantIndex] = updatedVariant;
          }
        }
        return {'status': true, 'message': 'Variante mise à jour'};
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      print('❌ Erreur updateVariant: $e');
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> deleteGlobalVariant(int variantId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception("Non authentifié");

      final response = await _dio.delete(
        '${baseUrl}product-variants/$variantId/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 204) {
        _unlinkedVariantes.removeWhere((v) => v.id == variantId);
        for (var storeProduct in _products) {
          storeProduct.product.variants?.removeWhere((v) => v.id == variantId);
        }
        notifyListeners();
        return {'status': true, 'message': 'Variante supprimée avec succès'};
      }

      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      print('❌ Erreur deleteGlobalVariant: $e');
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> createAndLinkVariant({
    required int productId,
    required int storeId,
    required Map<String, dynamic> variantData,
    XFile? image,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();

      final formData = FormData.fromMap({
        'barcode': variantData['barcode'],
        'name': variantData['name'],
        'quantity': FormatUtils.toDouble(variantData['quantity']),
        'sale_price_1': FormatUtils.toDouble(variantData['sale_price_1']),
        if (variantData.containsKey('store_online_price') &&
            variantData['store_online_price'] != null)
          'store_online_price': variantData['store_online_price'],
        if (variantData.containsKey('prix_reduction') &&
            variantData['prix_reduction'] != null)
          'prix_reduction': variantData['prix_reduction'],
        'store_id': storeId,
      });

      if (variantData.containsKey('photo') && variantData['photo'] != null) {
        final XFile image = variantData['photo'];
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(image.path, filename: image.name),
          ),
        );
      }

      final response = await _dio.post(
        '${baseUrl}products/$productId/create_variant_with_store/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );

      if (response.statusCode == 201) {
        await loadStoreProducts(_currentStoreId!, refresh: true);
        return {
          'status': true,
          'message': 'Variante créée et liée avec succès',
          'data': response.data,
        };
      }
      return {'status': false, 'message': _formatErrorMessage(response.data)};
    } on DioException catch (e) {
      print('❌ DioException in createAndLinkVariant: ${e.message}');
      return {'status': false, 'message': e.response?.data.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> linkVariantToStore({
    required int storeProductId,
    int? variantId,
    List<int>? variantIds,
    double? price,
    double? onlinePrice,
    int? stock,
    XFile? image,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception("Non authentifié");

      final formData = FormData();

      if (variantId != null) {
        formData.fields.add(MapEntry('variant_id', variantId.toString()));
      }
      if (variantIds != null && variantIds.isNotEmpty) {
        for (var id in variantIds) {
          formData.fields.add(MapEntry('variant_ids', id.toString()));
        }
      }
      if (price != null) {
        formData.fields.add(MapEntry('price', price.toString()));
      }
      if (onlinePrice != null) {
        formData.fields.add(MapEntry('online_price', onlinePrice.toString()));
      }
      if (stock != null) {
        formData.fields.add(MapEntry('stock', stock.toString()));
      }

      if (image != null && !image.path.contains('http') && variantIds == null) {
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(image.path, filename: image.name),
          ),
        );
      }
      print('donnees envoyer ${formData.fields}');
      final response = await _dio.post(
        '${baseUrl}store-products/$storeProductId/link_variant/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );
      print('RESPONSE DATA ${response.data}');
      if (response.statusCode == 201) {
        if (response.data['total_created'] != null) {
          return {
            'status': true,
            'message':
                '${response.data['total_created']} variante(s) liée(s) avec succès',
            'data': response.data,
          };
        }
        return {
          'status': true,
          'message': 'Variante liée au magasin',
          'data': response.data,
        };
      }
      return {'status': false, 'message': _formatErrorMessage(response.data)};
    } catch (e) {
      print('❌ Erreur linkVariantToStore: $e');
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<List<Variant>> loadUnlinkedVariants(int productId, int storeId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}products/$productId/unlinked_variants/?store_id=$storeId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        List variantsList;
        if (response.data is Map &&
            response.data.containsKey('unlinked_variants')) {
          variantsList = response.data['unlinked_variants'];
        } else if (response.data is Map &&
            response.data.containsKey('results')) {
          variantsList = response.data['results'];
        } else if (response.data is List) {
          variantsList = response.data;
        } else {
          variantsList = [];
        }
        return variantsList.map((v) => Variant.fromJson(v)).toList();
      }
    } catch (e) {
      print('Erreur chargement variantes non liées: $e');
    }
    return [];
  }

  Future<List<StoreVariant>> loadStoreVariants(int storeId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}stores/$storeId/variants/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        List variantsList;
        if (response.data is Map && response.data.containsKey('results')) {
          variantsList = response.data['results'];
        } else if (response.data is List) {
          variantsList = response.data;
        } else {
          variantsList = [];
        }
        return variantsList.map((v) => StoreVariant.fromJson(v)).toList();
      }
    } catch (e) {
      print('Erreur chargement store variants: $e');
    }
    return [];
  }

  // ============================================
  // STORE VARIANT UPDATE
  // ============================================
  Future<Map<String, dynamic>> updateStoreVariant({
    required int storeVariantId,
    double? quantity,
    double? storePrice,
    double? storeCost,
    double? storeOnlinePrice,
    double? prixReduction,
    double? weight,
    bool? selection,
    String? status,
    bool? isActive,
    XFile? image,
    int? globalVariantId,
    Map<String, dynamic>? globalVariantData,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception("Non authentifié");

      final storeVariantData = {
        if (quantity != null) 'quantity': quantity,
        if (storePrice != null) 'store_variant_price': storePrice,
        if (storeCost != null) 'store_variant_cost': storeCost,
        if (storeOnlinePrice != null) 'store_online_price': storeOnlinePrice,
        if (prixReduction != null) 'prix_reduction': prixReduction,
        if (weight != null) 'weight': weight,
        if (selection != null) 'selection': selection,
        if (status != null) 'status': status,
        if (isActive != null) 'is_active': isActive,
      };

      if (storeVariantData.isNotEmpty) {
        final storeResponse = await _dio.patch(
          '${baseUrl}store-product-variants/$storeVariantId/',
          data: storeVariantData,
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );
        if (storeResponse.statusCode != 200 &&
            storeResponse.statusCode != 204) {
          return {
            'status': false,
            'message':
                'Erreur mise à jour liaison: ${storeResponse.statusCode}',
          };
        }
      }

      if (globalVariantId != null && globalVariantData != null) {
        final formData = FormData.fromMap({
          'barcode': globalVariantData['barcode'],
          'name': globalVariantData['name'],
          'quantity': globalVariantData['quantity'],
          'sale_price_1': globalVariantData['sale_price_1'],
        });

        if (image != null &&
            image.path.isNotEmpty &&
            !image.path.contains('http')) {
          formData.files.add(
            MapEntry(
              'photo',
              await MultipartFile.fromFile(
                image.path,
                filename: image.name,
                contentType: DioMediaType('image', 'jpeg'),
              ),
            ),
          );
        }

        final globalResponse = await _dio.patch(
          '${baseUrl}product-variants/$globalVariantId/',
          data: formData,
          options: Options(
            headers: {'Authorization': 'Bearer $token'},
            contentType: 'multipart/form-data',
          ),
        );

        if (globalResponse.statusCode != 200) {
          return {
            'status': false,
            'message':
                'Erreur mise à jour variante globale: ${globalResponse.statusCode}',
          };
        }
      }

      await loadStoreProducts(_currentStoreId!, refresh: true);

      return {
        'status': true,
        'message': 'Variante boutique mise à jour avec succès',
      };
    } catch (e) {
      print('❌ Erreur updateStoreVariant: $e');
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> unlinkStoreVariant({
    required int storeProductId,
    int? storeVariantId,
    int? variantId,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await _storage.getToken();
      if (token == null) throw Exception("Non authentifié");

      final data = {
        if (storeVariantId != null) 'store_variant_id': storeVariantId,
        if (variantId != null) 'variant_id': variantId,
      };

      final response = await _dio.delete(
        '${baseUrl}store-products/$storeProductId/unlink_variant/',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        products
            .firstWhere((p) => p.id == storeProductId)
            .product
            .variants
            ?.removeWhere((v) => v.id == variantId);
        await loadStoreProducts(_currentStoreId!, refresh: true);
        return {'status': true, 'message': 'Variante dissociée avec succès'};
      }

      return {'status': false, 'message': _formatErrorMessage(response.data)};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // STOCK
  // ============================================
  Future<Map<String, dynamic>> adjustStock({
    required int storeProductId,
    required int quantity,
    required String type,
    String? reason,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.post(
        '${baseUrl}store-products/$storeProductId/adjust_stock/',
        data: {'quantity': quantity, 'type': type, 'reason': reason},
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        await loadStoreProducts(_currentStoreId!, refresh: true);
        return {
          'status': true,
          'message': response.data['message'] ?? 'Stock mis à jour',
          'stock': response.data['stock'],
          'movement_id': response.data['movement_id'],
          'movement_reference': response.data['movement_reference'],
        };
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      if (e is DioException) {
        if (e.response?.data != null) {
          final errorData = e.response?.data;
          if (errorData is Map && errorData.containsKey('error')) {
            return {'status': false, 'message': errorData['error']};
          }
        }
        return {'status': false, 'message': e.message ?? 'Erreur de connexion'};
      }
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> generateCode() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final response = await _dio.get(
        '${baseUrl}product-variants/generate_barcode/',
      );
      if (response.statusCode == 200) {
        return response.data;
      } else {
        return {
          'status': false,
          'message': 'Erreur lors de la generation de barcode',
        };
      }
    } catch (e) {
      _error = e.toString();
      return {'status': false, 'message': _error};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // PRODUCT BRAND
  // ============================================
  Future<void> loadBrand() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _dio.get('${baseUrl}product-brands/');
      if (response.statusCode == 200) {
        final results = response.data['results'] as List;
        _brands = results
            .map<ProductBrand>((brand) => ProductBrand.fromJson(brand))
            .toList();
      }
    } catch (e) {
      print("Erreur: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createBrand(Map<String, dynamic> brand) async {
    _isLoading = true;
    notifyListeners();
    final token = await _storage.getToken();
    try {
      final response = await _dio.post(
        '${baseUrl}product-brands/',
        options: Options(headers: {'Authorization': "Bearer $token"}),
        data: brand,
      );
      if (response.statusCode == 201) {
        loadBrand();
      }
    } catch (e) {
      print('Erreur: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateBrand(ProductBrand brand) async {
    _isLoading = true;
    notifyListeners();
    final token = await _storage.getToken();
    try {
      final response = await _dio.put(
        '${baseUrl}product-brands/${brand.id}/',
        options: Options(headers: {'Authorization': "Bearer $token"}),
        data: brand.toJson(),
      );
      if (response.statusCode == 200) {
        loadBrand();
      }
    } catch (e) {
      print('Erreur: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deleteBrand(ProductBrand brand) async {
    _isLoading = true;
    notifyListeners();
    final token = await _storage.getToken();
    try {
      final response = await _dio.delete(
        '${baseUrl}product-brands/${brand.id}/',
        options: Options(headers: {'Authorization': "Bearer $token"}),
      );
      if (response.statusCode == 204) {
        loadBrand();
      }
    } catch (e) {
      print('Erreur: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // ============================================
  // GESTION DES ERREURS
  // ============================================
  String _formatErrorMessage(Map<String, dynamic> errors) {
    if (errors.isEmpty) {
      return 'Une erreur est survenue';
    }

    List<String> errorMessages = [];

    errors.forEach((field, messages) {
      String fieldName = _getFieldNameInFrench(field);

      if (messages is List) {
        for (var message in messages) {
          errorMessages.add('$fieldName: $message');
        }
      } else if (messages is String) {
        errorMessages.add('$fieldName: $messages');
      } else if (messages is Map<String, dynamic>) {
        _parseNestedErrors(messages, fieldName, errorMessages);
      }
    });

    return errorMessages.join('\n');
  }

  String _getFieldNameInFrench(String field) {
    final Map<String, String> fieldNames = {
      'barcode': 'Code barre',
      'name': 'Nom',
      'quantity': 'Quantité',
      'sale_price_1': 'Prix global',
      'store_price': 'Prix boutique',
      'prix_reduction': 'Prix promotionnel',
      'image': 'Image',
    };
    return fieldNames[field] ?? field;
  }

  void _parseNestedErrors(
    Map<String, dynamic> errors,
    String prefix,
    List<String> output,
  ) {
    errors.forEach((key, value) {
      String fieldName = '$prefix - ${_getFieldNameInFrench(key)}';
      if (value is List) {
        for (var message in value) {
          output.add('$fieldName: $message');
        }
      } else if (value is String) {
        output.add('$fieldName: $value');
      }
    });
  }
}
