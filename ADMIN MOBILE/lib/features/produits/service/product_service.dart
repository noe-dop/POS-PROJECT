import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/storage_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';

class ProductProvider extends ChangeNotifier {
  final Dio _dio = Dio();
  final StorageService _storage = StorageService();
  String baseUrl = 'http://127.0.0.1:8000/api/';
  final BoutiqueService boutiqueService;

  int? _currentStoreId;
  List<Product> _products = [];
  Product? _selectedProduct;
  String _searchQuery = '';
  String _statusFilter = 'Tous';
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Product> get products => _products;
  String get statusFilter => _statusFilter;
  List<Product> get filteredProducts => _products.where((p) {
    final matchesSearch = _searchQuery.isEmpty ||
        p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().contains(_searchQuery.toLowerCase());
    final matchesStatus = _statusFilter == 'Tous' || p.status == _statusFilter;
    return matchesSearch && matchesStatus;
  }).toList();
  Product? get selectedProduct => _selectedProduct;
  bool get isLoading => _isLoading;
  String? get error => _error;


  ProductProvider({required this.boutiqueService}) {
    // Écouter les changements de boutique
    boutiqueService.addListener(_onStoreChanged);
    // Charger initial si une boutique est sélectionnée
    if (boutiqueService.selectedStore != null) {
      loadProducts();
    }
  }

  void setStore(int storeId) {
    if (_currentStoreId != storeId) {
      _currentStoreId = storeId;
      loadProducts();
    }
  }

  void _onStoreChanged() {
    // Recharger les produits quand la boutique change
    loadProducts();
    // Réinitialiser la sélection
    _selectedProduct = null;
    notifyListeners();
  }

  Future<void> loadProducts() async {
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
      _products = (response.data as List)
          .map((json) => Product.fromJson(json))
          .toList();
    } on DioException catch (e) {
      _error = e.response?.data?.toString() ?? e.message;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addProduct(Product product) async {
    if (_currentStoreId == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.post(
        '${baseUrl}stores/$_currentStoreId/products/',
        data: product.toJson(),
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final newProduct = Product.fromJson(response.data);
      _products.add(newProduct);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProduct(Product product) async {
    if (_currentStoreId == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      final response = await _dio.put(
        '${baseUrl}stores/$_currentStoreId/products/${product.id}/',
        data: product.toJson(),
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      final updatedProduct = Product.fromJson(response.data);
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

  Future<void> deleteProduct(String id) async {
    if (_currentStoreId == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _storage.getToken();
      await _dio.delete(
        '${baseUrl}stores/$_currentStoreId/products/$id/',
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
}