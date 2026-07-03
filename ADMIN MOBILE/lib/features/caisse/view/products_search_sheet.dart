// lib/features/caisse/view/products_search_sheet.dart

import 'package:flutter/material.dart';
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
  final Set<int> _selectedProductIds = {};
  final ScrollController _scrollController = ScrollController();

  List<Variant> _products = [];
  bool _isLoading = true;
  bool _hasMore = true;
  bool _isLoadingMore = false;
  int _currentPage = 1;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadProducts();
  }

  @override
  void dispose() {
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

  Future<void> _loadProducts({bool refresh = true}) async {
    if (refresh) {
      setState(() {
        _isLoading = true;
        _products = [];
        _currentPage = 1;
        _hasMore = true;
      });
    }

    try {
      final provider = Provider.of<CaisseProvider>(context, listen: false);
      final results = await provider.searchProducts(
        widget.storeId,
        _searchQuery,
      );

      if (results.isNotEmpty) {
        final newProducts = results.map((json) => Variant.fromJson(json)).toList();
        setState(() {
          if (refresh) {
            _products = newProducts;
          } else {
            _products.addAll(newProducts);
          }
          _hasMore = results.length >= 20;
          _currentPage++;
        });
      } else {
        setState(() {
          _hasMore = false;
        });
      }
    } catch (e) {
      print('❌ Erreur chargement produits: $e');
    } finally {
      setState(() {
        _isLoading = false;
        _isLoadingMore = false;
      });
    }
  }

  Future<void> _loadMoreProducts() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    await _loadProducts(refresh: false);
  }

  void _onSearchChanged(String value) {
    _searchQuery = value;
    _loadProducts(refresh: true);
  }

  void _toggleSelection(Variant product) {
    setState(() {
      final id = product.id ?? 0;
      if (_selectedProductIds.contains(id)) {
        _selectedProductIds.remove(id);
      } else {
        _selectedProductIds.add(id);
      }
    });
  }

  void _confirmSelection() {
    final selected = _products.where((p) => _selectedProductIds.contains(p.id)).toList();
    if (selected.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner au moins un produit'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    Navigator.pop(context);
    for (var product in selected) {
      widget.onProductSelected(product);
    }
  }

  void _selectAll() {
    setState(() {
      final allSelected = _selectedProductIds.length == _products.length &&
          _products.isNotEmpty;
      if (allSelected) {
        _selectedProductIds.clear();
      } else {
        for (var product in _products) {
          if (product.id != null) {
            _selectedProductIds.add(product.id!);
          }
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      height: MediaQuery.of(context).size.height * 0.85,
      child: Column(
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Rechercher des produits',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
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
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_selectedProductIds.length} sélectionné(s)',
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
                    _selectedProductIds.length == _products.length
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
                ? const Center(child: CircularProgressIndicator())
                : _products.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 60, color: Colors.grey[400]),
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
                  onPressed: _selectedProductIds.isEmpty ? null : _confirmSelection,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _selectedProductIds.isEmpty
                        ? Colors.grey[300]
                        : Colors.blue,
                    foregroundColor: _selectedProductIds.isEmpty
                        ? Colors.grey[600]
                        : Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(
                    'Ajouter ${_selectedProductIds.isEmpty ? '' : _selectedProductIds.length} produit(s)',
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
    final isSelected = product.id != null && _selectedProductIds.contains(product.id);

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
                  errorBuilder: (context, error, stack) => Icon(
                    Icons.shopping_bag,
                    color: Colors.grey[400],
                  ),
                )
              : Icon(Icons.shopping_bag, color: Colors.grey[400]),
        ),
        title: Text(
          product.name,
          style: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SKU: ${product.barcode ?? "N/A"}',
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