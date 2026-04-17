import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
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
  List<StoreProduct> _storeProducts = [];
  List<Product> _unlinkedProducts = [];
  List<Variant> _unlinkedVariantes = [];
  List<ProductBrand> _brands = [];
  StoreProduct? _selectedProduct;
  StoreProduct? _selectedStoreProduct;
  String _searchQuery = '';
  String _statusFilter = 'Tous';
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Product> get unlinkedProducts => _unlinkedProducts;
  List<Variant> get unlinkedVariants => _unlinkedVariantes;
  List<StoreProduct> get products => _products;
  List<ProductBrand> get brands => _brands;
  String get statusFilter => _statusFilter;
  List<StoreProduct> get filteredProducts => products.where((p) {
    final matchesSearch =
        _searchQuery.isEmpty ||
        p.product.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        p.product.sku!.toLowerCase().contains(_searchQuery.toLowerCase());
    final matchesStatus = _statusFilter == 'Tous' || p.status == _statusFilter;
    return matchesSearch && matchesStatus;
  }).toList();
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
    // Écouter les changements de boutique
    boutiqueService.addListener(onStoreChanged);
    Future.microtask(onStoreChanged);
    loadBrand();
  }

  void setStore(int storeId) {
    if (_currentStoreId != storeId) {
      _currentStoreId = storeId;
      loadStoreProducts();
    }
  }

  void onStoreChanged() {
    final selected = boutiqueService.selectedStore;
    if (selected != null) {
      _currentStoreId = selected.boutique.id;
      loadStoreProducts();
      loadUnlinkedProducts(_currentStoreId!);
    } else {
      _currentStoreId = null;
      _products = [];
      _unlinkedProducts = [];
    }
    _selectedProduct = null;
    notifyListeners();
  }

  //  UNLINKED PRODUCT
  Future<List<Product>> loadUnlinkedProducts(int storeId) async {
    if (_currentStoreId == null || _currentStoreId != storeId) return [];
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}stores/$_currentStoreId/available-products/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        // Adapter selon la structure de la réponse (liste simple ou paginée)
        List<Product> productsUnlinked = (response.data['results'] as List)
            .map((json) => Product.fromJson(json))
            .toList();
        _unlinkedProducts = productsUnlinked;
        return productsUnlinked;
      } else {
        return [];
      }
    } catch (e) {
      _error = e.toString();
      print(_error);
      return [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // LINK PRODUCT TO STORE
  // STORE PRODUCT ACTION
  Future<bool> linkProductToStore(
    Product product, {
    double? storePrice,
    double? storeCost,
    int? supplierId,
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
        if (storePrice != null) 'store_base_price': storePrice,
        if (storeCost != null) 'store_cost_price': storeCost,
        if (supplierId != null) 'supplier': supplierId,
        // Vous pouvez ajouter d'autres champs comme 'status', 'is_active' si nécessaire
      };

      final response = await _dio.post(
        '${baseUrl}store-products/',
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 201) {
        // Recharger les produits liés et non liés
        await loadStoreProducts();
        await loadUnlinkedProducts(_currentStoreId!);
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

  Future<Map<String, dynamic>> updateStoreProduct(
    StoreProduct storeProduct,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.put(
        "${baseUrl}store-products/${storeProduct.id}/", // ← attention : .id
        data: storeProduct.toJson(),
        options: Options(headers: {"Authorization": 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        // Optionnel : mettre à jour la liste locale
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

  Future<void> loadStoreProducts() async {
    if (_currentStoreId == null) return;
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}stores/$_currentStoreId/products/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final List dataList = response.data as List;
        List<StoreProduct> tempStoreProducts = [];
        for (var i = 0; i < dataList.length; i++) {
          try {
            final storeProduct = StoreProduct.fromJson(dataList[i]);
            tempStoreProducts.add(storeProduct);
          } catch (e, stack) {
            print('  ❌ ERREUR sur StoreProduct $i: $e');
            print('  Stack: $stack');
            // On arrête au premier échec pour voir l'erreur exacte
            rethrow;
          }
        }

        // Si tout passe, on assigne
        _products = tempStoreProducts;
      } else {
        print("Erreur : ${response.data}- ${response.statusCode}");
        _products = [];
      }
    } on DioException catch (e) {
      _error = e.response?.data?.toString() ?? e.message;
      print(_error);
    } catch (e) {
      _error = e.toString();
      print('Erreur catch $_error');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Méthode pour recharger un StoreProduct spécifique
  Future<void> refreshStoreProduct(int storeProductId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}store-products/$storeProductId/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final updatedProduct = StoreProduct.fromJson(response.data);

        // Mettre à jour dans la liste
        final index = _products.indexWhere((p) => p.id == storeProductId);
        if (index != -1) {
          _products[index] = updatedProduct;
        }
        _selectedProduct = updatedProduct;
        notifyListeners(); // ← CECI DÉCLENCHE LE REBUILD DES CONSUMERS
        // return updatedProduct;
      }
    } catch (e) {
      print('❌ Erreur refreshStoreProduct: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>> addProduct(Product product) async {
    if (boutiqueService.selectedStore?.boutique.id == null)
      return {"status": false, "message": "Boutique non sélectionnée"};
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
        // Première image = photo principale
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(product.imagesUrls!.first),
          ),
        );

        // Images supplémentaires (toutes les suivantes) sous le même nom 'additional_images'
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
        final Map<String, dynamic> res = {
          "status": true,
          "message": 'Produit créé avec succès',
        };
        return res;
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

  Future<Map<String,dynamic>> updateProduct(Product product) async {
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

      // Séparer les images existantes des nouvelles images
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

      // Ajouter les images existantes
      if (existingImages.isNotEmpty) {
        formData.fields.add(
          MapEntry('existing_ images', existingImages.join(',')),
        );
      }

      // Ajouter les nouvelles images
      if (newImages.isNotEmpty) {
        // Première image = photo principale
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

        // Images supplémentaires
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
        await loadStoreProducts();
        return {
          "status": true,
          "message": 'Produit mis à jour avec succès',
        };
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
    if (boutiqueService.selectedStore!.boutique.id != id) return;
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

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setStatusFilter(String filter) {
    _statusFilter = filter;
    notifyListeners();
  }

  // VARIANTE
  // Charger les variantes d'un produit
  Future<List<Variant>> loadVariants(int storeProductId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}products/$storeProductId/variants/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List data = response.data;
        return data.map((json) => Variant.fromJson(json)).toList();
      }
    } catch (e) {
      print('Erreur chargement variantes: $e');
    }
    return [];
  }

  // Créer une variante globale
  Future<Map<String, dynamic>> createVariant(
    int productId,
    Map<String, dynamic> data,
  ) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();

      /// Créer un FormData
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

      // Ajouter l'image si présente
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
        '${baseUrl}products/$productId/variants/',
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

  // Mettre à jour une variante
  Future<Map<String, dynamic>> updateGlobalVariant(
    int variantId,
    Map<String, dynamic> data,
    XFile? image,
  ) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();

      // Créer un FormData
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

      // Ajouter l'image si présente
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
          contentType: 'multipart/form-data', // Important !
        ),
      );
      if (response.statusCode == 200) {
        // 1. Créer la variante mise à jour depuis la réponse
        final updatedVariant = Variant.fromJson(response.data);

        // 2. Mettre à jour dans le cache local (_products)
        for (var storeProduct in _products) {
          if (storeProduct.product.id == data['product']) {
            // Trouver la variante dans la liste et la remplacer
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

        // 3. Mettre à jour le produit sélectionné si c'est le même
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
        // Nettoyer le cache
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

  // Créer une variante ET la lier à la boutique (si nécessaire)
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

      /// Créer un FormData
      final formData = FormData.fromMap({
        'barcode': variantData['barcode'],
        'name': variantData['name'],
        'quantity': variantData['quantity'],
        'sale_price_1': variantData['sale_price_1'],
        if (variantData.containsKey('store_online_price'))
          'store_online_price': variantData['store_online_price'],
        if (variantData.containsKey('compare_price'))
          'compare_price': variantData['compare_price'],
        'store_id': storeId,
      });

      // Ajouter l'image si présente
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
        await loadStoreProducts(); // Recharger les données pour voir la nouvelle variante liée
        return {
          'status': true,
          'message': 'Variante créée et liée avec succès',
          'data': response.data,
        };
      }
      return {'status': false, 'message': _formatErrorMessage(response.data)};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Lier une variante à un magasin (StoreVariant)
  Future<Map<String, dynamic>> linkVariantToStore(
    int storeProductId,
    int variantId, {
    double? price,
    double? onlinePrice,
    int? stock,
    XFile? image, // ← Ajout du paramètre image
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();

      // Créer FormData pour l'image
      final formData = FormData.fromMap({
        'variant_id': variantId,
        if (price != null) 'price': price,
        if (onlinePrice != null) 'store_online_price': onlinePrice,
        if (stock != null) 'stock': stock,
      });

      // Ajouter l'image si présente
      if (image != null && !image.path.contains('http')) {
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(image.path, filename: image.name),
          ),
        );
      }

      final response = await _dio.post(
        '${baseUrl}store-products/$storeProductId/link_variant/',
        data: formData,
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
          contentType: 'multipart/form-data',
        ),
      );
      if (response.statusCode == 201) {
        return {'status': true, 'message': 'Variante liée au magasin'};
      }
      return {'status': false, 'message': _formatErrorMessage(response.data)};
    } catch (e) {
      return {'status': false, 'message': e.toString()};
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Charger les variantes NON liées à la boutique actuelle
  Future<List<Variant>> loadUnlinkedVariants(int productId, int storeId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}products/$productId/unlinked_variants/?store_id=$storeId',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );

      if (response.statusCode == 200) {
        final List variants = response.data['unlinked_variants'];
        _unlinkedVariantes = variants.map((v) => Variant.fromJson(v)).toList();
        return _unlinkedVariantes;
      }
    } catch (e) {
      print('Erreur chargement variantes non liées: $e');
    }
    return [];
  }

  // Charger les StoreVariants pour un magasin
  Future<List<StoreVariant>> loadStoreVariants(int storeId) async {
    try {
      final token = await _storage.getToken();
      final response = await _dio.get(
        '${baseUrl}stores/$storeId/variants/',
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 200) {
        final List data = response.data;
        return data.map((v) => StoreVariant.fromJson(v)).toList();
      }
    } catch (e) {
      print('Erreur chargement store variants: $e');
    }
    return [];
  }

  // ============================================
  // FONCTIONS POUR LES VARIANTES LIÉES À UNE BOUTIQUE (StoreProductVariant)
  // ============================================

  /// Met à jour une variante DÉJÀ LIÉE à une boutique (StoreProductVariant)
  /// Utilisé pour modifier les prix, quantités, promotions spécifiques à la boutique
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

      // 1. Mettre à jour la liaison StoreProductVariant
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
        print(storeResponse.data);
        if (storeResponse.statusCode != 200 &&
            storeResponse.statusCode != 204) {
          return {
            'status': false,
            'message':
                'Erreur mise à jour liaison: ${storeResponse.statusCode}',
          };
        }
      }

      // 2. Si on veut aussi mettre à jour la variante globale
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

        final globalResponse = await _dio.put(
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

      // 3. Recharger les données pour mettre à jour le cache
      await loadStoreProducts();

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

  /// Délie une variante de la boutique (supprime StoreProductVariant)
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
        await loadStoreProducts();
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

  // STOCK
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
        await loadStoreProducts(); // Recharger les données pour voir le stock mis à jour
        // Retourner TOUTES les données de l'API
        return {
          'status': true,
          'message': response.data['message'] ?? 'Stock mis à jour',
          'stock': response.data['stock'], // Données complètes du stock
          'movement_id': response.data['movement_id'],
          'movement_reference': response.data['movement_reference'],
        };
      }
      return {'status': false, 'message': 'Erreur ${response.statusCode}'};
    } catch (e) {
      if (e is DioException) {
        // Gérer les erreurs spécifiques de Dio
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

  // PRODUCT BRAND

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
      } else {
        _brands = [];
        print(
          'Erreur lors de la recuperation ${response.data}-${response.statusCode}',
        );
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
      } else {
        print('${response.data} - ${response.statusCode}');
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
        data: brand,
      );
      if (response.statusCode == 200) {
        loadBrand();
      } else {
        print('${response.data} - ${response.statusCode}');
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
      } else {
        print('${response.data} - ${response.statusCode}');
      }
    } catch (e) {
      print('Erreur: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // GESTION DES ERREURS
  String _formatErrorMessage(Map<String, dynamic> errors) {
    if (errors.isEmpty) {
      return 'Une erreur est survenue';
    }

    List<String> errorMessages = [];

    errors.forEach((field, messages) {
      // Convertir les noms de champs en français
      String fieldName = _getFieldNameInFrench(field);

      if (messages is List) {
        for (var message in messages) {
          errorMessages.add('$fieldName: $message');
        }
      } else if (messages is String) {
        errorMessages.add('$fieldName: $messages');
      } else if (messages is Map<String, dynamic>) {
        // Pour les erreurs imbriquées
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
