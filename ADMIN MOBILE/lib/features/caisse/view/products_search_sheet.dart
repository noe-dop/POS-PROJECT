import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';

class ProductsSearchSheet extends StatefulWidget {
  final int storeId;
  final Function(Variant) onProductSelected;

  const ProductsSearchSheet({
    super.key,
    required this.storeId,
    required this.onProductSelected,
  });

  @override
  State<ProductsSearchSheet> createState() => _ProductsSearchSheetState();
}

class _ProductsSearchSheetState extends State<ProductsSearchSheet> {
  final TextEditingController _searchController = TextEditingController();
  final Map<int, Variant> _selectedProducts = {};
  final ScrollController _scrollController = ScrollController();

  List<Variant> _products = [];
  bool _isLoading = true;
  bool _hasMore = true;
  String? _nextUrl;
  bool _isLoadingMore = false;
  // int _currentPage = 1;
  String _searchQuery = '';
  CancelToken? _cancelToken;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadProducts();
  }

  @override
  void dispose() {
    _cancelToken?.cancel('Widget disposed');
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.8) {
      if (_hasMore && !_isLoadingMore && !_isLoading) {
        _loadMoreProducts();
      }
    }
  }

  // Vérification de mounted dans toutes les méthodes asynchrones
  Future<void> _loadProducts({bool refresh = true}) async {
    if (refresh) {
      if (mounted) {
        setState(() {
          _isLoading = true;
          _products = [];
          _hasMore = true;
          _nextUrl = null;
        });
      }
    }

    try {
      _cancelToken?.cancel('New request');
      _cancelToken = CancelToken();

      final provider = Provider.of<CaisseProvider>(context, listen: false);

      int? offset;
      if (!refresh && _nextUrl != null) {
        final uri = Uri.parse(_nextUrl!);
        final offsetParam = uri.queryParameters['offset'];
        offset = offsetParam != null ? int.tryParse(offsetParam) : null;
      }

      final result = await provider.searchProducts(
        widget.storeId,
        _searchQuery,
        offset: offset,
      );

      if (!mounted) return;

      final List<dynamic> results = result['results'] ?? [];
      _nextUrl = result['next'];
      _hasMore = _nextUrl != null;

      // Tous les éléments sont directement des Variants (via toJson)
      final newProducts = results
          .map(
            (variantMap) =>
                Variant.fromJson(variantMap as Map<String, dynamic>),
          )
          .toList();

      setState(() {
        if (refresh) {
          _products = newProducts;
        } else {
          _products.addAll(newProducts);
        }
        _isLoading = false;
        _isLoadingMore = false;
      });
    } catch (e) {
      if (e is DioException && e.type == DioExceptionType.cancel) return;
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isLoadingMore = false;
        });
        NotificationService.showError(context, 'Erreur chargement: $e');
        // ScaffoldMessenger.of(context).showSnackBar(
        //   SnackBar(
        //     content: Text('Erreur chargement: $e'),
        //     backgroundColor: Colors.red,
        //     behavior: SnackBarBehavior.floating,
        //     duration: const Duration(milliseconds: 2000),
        //   ),
        // );
        // Optionnel : fermer la sheet
      }
    }
  }

  Future<void> _loadMoreProducts() async {
    if (_isLoadingMore || !_hasMore) return;
    if (mounted) {
      setState(() => _isLoadingMore = true);
    }
    await _loadProducts(refresh: false);
  }

  void _onSearchChanged(String value) {
    _searchQuery = value;
    _loadProducts(refresh: true);
  }

  void _toggleSelection(Variant product) {
    if (!mounted) return;
    setState(() {
      final key = product.storeVariantId ?? 0;
      if (_selectedProducts.containsKey(key)) {
        _selectedProducts.remove(key);
      } else {
        _selectedProducts[key] = product;
      }
    });
  }

  void _selectAll() {
    if (!mounted) return;
    setState(() {
      final allSelected = _products.every(
        (p) => _selectedProducts.containsKey(p.storeVariantId ?? 0),
      );
      if (allSelected) {
        _selectedProducts.clear();
      } else {
        for (var product in _products) {
          final key = product.storeVariantId ?? 0;
          _selectedProducts[key] = product;
        }
      }
    });
  }

  void _confirmSelection() {
    if (_selectedProducts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner au moins un produit'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    Navigator.pop(context);
    for (var product in _selectedProducts.values) {
      widget.onProductSelected(product);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Rechercher des produits',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Barre de recherche
          TextField(
            controller: _searchController,
            autofocus: true,
            decoration: InputDecoration(
              hintText: 'Nom, SKU, code-barres...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              filled: true,
              fillColor: Colors.grey[50],
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchController.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
            ),
            onChanged: _onSearchChanged,
          ),
          const SizedBox(height: 8),

          // Infos
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_selectedProducts.length} sélectionné(s)',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[700],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '• ${_products.length} produit(s)',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
              const Spacer(),
              if (_products.isNotEmpty)
                TextButton(
                  onPressed: _selectAll,
                  child: Text(
                    _selectedProducts.length == _products.length
                        ? 'Tout désélectionner'
                        : 'Tout sélectionner',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
            ],
          ),
          const Divider(),

          // Liste des produits
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      constraints: BoxConstraints(maxWidth: 40, maxHeight: 40),
                    ),
                  )
                : _products.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off,
                          size: 60,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isEmpty
                              ? 'Aucun produit disponible'
                              : 'Aucun résultat pour "$_searchQuery"',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    itemCount: _products.length + (_hasMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _products.length) {
                        return const Padding(
                          padding: EdgeInsets.all(16),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        );
                      }
                      return _buildProductItem(_products[index]);
                    },
                  ),
          ),

          const Divider(),

          // Boutons d'action
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Annuler'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _selectedProducts.isEmpty
                      ? null
                      : _confirmSelection,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _selectedProducts.isEmpty
                        ? Colors.grey[300]
                        : Colors.blue,
                    foregroundColor: _selectedProducts.isEmpty
                        ? Colors.grey[600]
                        : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(
                    'Ajouter ${_selectedProducts.isEmpty ? '' : _selectedProducts.length} produit(s)',
                    style: const TextStyle(fontSize: 15),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProductItem(Variant product) {
    final key = product.storeVariantId ?? 0;
    final isSelected = _selectedProducts.containsKey(key);

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(
          color: isSelected ? Colors.blue : Colors.grey[200]!,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: CheckboxListTile(
        value: isSelected,
        onChanged: (_) => _toggleSelection(product),
        activeColor: Colors.blue,
        checkboxShape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
        ),
        secondary: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(6),
          ),
          child: product.imageUrl != null
              ? Image.network(
                  product.imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stack) =>
                      Icon(Icons.shopping_bag, color: Colors.grey[400]),
                )
              : Icon(Icons.shopping_bag, color: Colors.grey[400]),
        ),
        title: Text(
          product.name,
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SKU: ${product.barcode}',
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
            Text(
              'Prix: ${FormatUtils.formatCurrency(product.effectivePrice, "FCFA")}',
              style: TextStyle(
                fontSize: 11,
                color: Colors.blue[700],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 8),
      ),
    );
  }
}
