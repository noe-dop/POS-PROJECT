import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_brand_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/store_product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class ProductProvider extends ChangeNotifier {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  // String baseUrl = 'http://127.0.0.1:8000/api/';
  String baseUrl = 'https://eboutik-api.onrender.com/api/';
  final BoutiqueService boutiqueService;

  int? _currentStoreId;
  List<Product> _products = [];
  List<StoreProduct> _storeProducts = [];
  List<Product> _unlinkedProducts = [];
  List<ProductBrand> _brands = [];
  Product? _selectedProduct;
  StoreProduct? _selectedStoreProduct;
  String _searchQuery = '';
  String _statusFilter = 'Tous';
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Product> get unlinkedProducts => _unlinkedProducts;
  List<Product> get products => _products;
  List<ProductBrand> get brands => _brands;
  String get statusFilter => _statusFilter;
  List<Product> get filteredProducts => products.where((p) {
    final matchesSearch =
        _searchQuery.isEmpty ||
        p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        p.sku!.toLowerCase().contains(_searchQuery.toLowerCase());
    final matchesStatus = _statusFilter == 'Tous' || p.status == _statusFilter;
    return matchesSearch && matchesStatus;
  }).toList();
  Product? get selectedProduct => _selectedProduct;
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<StoreProduct> get storeProducts => _storeProducts;
  List<StoreProduct> get filteredStoreProducts => _storeProducts.where((sp) {
    final matchesSearch =
        _searchQuery.isEmpty ||
        sp.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        sp.sku.toLowerCase().contains(_searchQuery.toLowerCase());
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
        List<Product> products = (response.data['results'] as List)
            .map((json) => Product.fromJson(json, storeId))
            .toList();
        _unlinkedProducts = products;
        return products;
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
        print(response.data);
        _products = (response.data as List)
            .map((json) => Product.fromJson(json, null))
            .toList();
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

  Future<void> addProduct(Product product) async {
    if (boutiqueService.selectedStore!.boutique.id != product.storeId) return;
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
        'stock': product.stock,
        'nombre_item': product.nombreItem,
        'description': product.description,
        'status': product.status,
      });
      if (product.imageUrl!.isNotEmpty) {
        // Première image = photo principale
        formData.files.add(
          MapEntry(
            'photo',
            await MultipartFile.fromFile(product.imageUrl!.first),
          ),
        );

        // Images supplémentaires (toutes les suivantes) sous le même nom 'additional_images'
        for (var i = 1; i < product.imageUrl!.length; i++) {
          formData.files.add(
            MapEntry(
              'additional_images',
              await MultipartFile.fromFile(product.imageUrl![i]),
            ),
          );
        }
      }
      final response = await _dio.post(
        '${baseUrl}products/',
        data: formData,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      if (response.statusCode == 201) {
        final newProduct = Product.fromJson(response.data, null);
        _products.add(newProduct);
      } else {
        print(
          "Erreur lors de la création ${response.data}-${response.statusCode}",
        );
      }
    } catch (e) {
      _error = e.toString();
      print(_error);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProduct(Product product) async {
    if (boutiqueService.selectedStore!.boutique.id != product.storeId) return;
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.put(
        '${baseUrl}products/${product.id}/',
        data: product.toJson(),
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final updatedProduct = Product.fromJson(response.data, product.storeId);
      final index = _products.indexWhere((p) => p.id == updatedProduct.id);
      if (index != -1) {
        _products[index] = updatedProduct;
      }
    } catch (e) {
      _error = e.toString();
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

  void selectProduct(Product? product) {
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
  Future<bool> createVariant(int productId, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(
        '/products/$productId/variants/',
        data: data,
      );
      if (response.statusCode == 201) {
        // Recharger le produit ou la liste des variantes
        await loadStoreProducts(); // ou autre
        return true;
      }
    } catch (e) {
      _error = e.toString();
    }
    return false;
  }

  Future<bool> updateVariant(int variantId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners(); // si vous avez un état de chargement
    _error = null;
    try {
      final response = await _dio.patch('/variants/$variantId/', data: data);
      if (response.statusCode == 200) {
        // Succès : mettre à jour la variante dans la liste locale
        final updatedVariant = Variant.fromJson(response.data);
        _updateVariantInList(updatedVariant);
        return true;
      } else {
        _error = 'Erreur ${response.statusCode} : ${response.data}';
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

  // Méthode utilitaire pour mettre à jour la variante dans la liste
  void _updateVariantInList(Variant updatedVariant) {
    // Si vous stockez les variantes dans le produit sélectionné ou dans une liste globale
    // Il faut retrouver le produit concerné et remplacer l'ancienne variante.
    // Exemple : le produit sélectionné est accessible via selectedProduct
    if (selectedProduct != null) {
      final index = selectedProduct!.variants?.indexWhere(
        (v) => v.id == updatedVariant.id,
      );
      if (index != null && index != -1) {
        selectedProduct!.variants![index] = updatedVariant;
        // Notifier les listeners
        notifyListeners();
      }
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
}
