import 'dart:async';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:provider/provider.dart';

class SelectExistingProductSheet extends StatefulWidget {
  final int storeId;
  final Function(List<Product>) onProductsSelected;
  final VoidCallback onCreateNew;

  const SelectExistingProductSheet({
    super.key,
    required this.storeId,
    required this.onProductsSelected,
    required this.onCreateNew,
  });

  @override
  State<SelectExistingProductSheet> createState() =>
      _SelectExistingProductSheetState();
}

class _SelectExistingProductSheetState
    extends State<SelectExistingProductSheet> {
  final TextEditingController _searchController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  // Utiliser un Map pour stocker les sélections avec des clés uniques
  final Map<int, bool> _selectedMap = {};
  
  bool _isInitialLoading = true;
  bool _isSearching = false;
  Timer? _debounceTimer;
  String _currentSearchQuery = '';
  List<Product> _currentProducts = [];

  // Flag pour éviter les appels setState pendant le build
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadFirstPage();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onScroll() {
    final provider = context.read<ProductProvider>();
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.8) {
      if (provider.hasMoreUnlinked && !provider.isLoadingMoreUnlinked) {
        _loadMore();
      }
    }
  }

  Future<void> _loadFirstPage() async {
    if (!mounted) return;
    setState(() {
      _isInitialLoading = true;
      _selectedMap.clear();
    });

    try {
      final provider = context.read<ProductProvider>();
      await provider.loadUnlinkedProducts(widget.storeId, refresh: true);
      
      if (mounted) {
        setState(() {
          _currentProducts = List.from(provider.unlinkedProducts);
          _isInitialLoading = false;
        });
      }

      provider.setSearchQuery('');
      _searchController.clear();
    } catch (e) {
      print('Erreur chargement: $e');
      if (mounted) setState(() => _isInitialLoading = false);
    }
  }

  Future<void> _loadMore() async {
    final provider = context.read<ProductProvider>();
    if (provider.isLoadingMoreUnlinked || !provider.hasMoreUnlinked) return;

    await provider.loadUnlinkedProducts(widget.storeId, refresh: false);
    
    if (mounted) {
      setState(() {
        _currentProducts = List.from(provider.unlinkedProducts);
      });
    }
  }

  void _onSearchChanged(String value) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted) {
        setState(() => _isSearching = true);
        _currentSearchQuery = value;

        final provider = context.read<ProductProvider>();
        provider.setSearchQuery(value);

        // Attendre que la recherche soit terminée
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted) {
            setState(() {
              _currentProducts = List.from(provider.unlinkedProducts);
              _selectedMap.clear(); // Réinitialiser les sélections
              _isSearching = false;
            });
          }
        });
      }
    });
  }

  void _toggleSelection(Product product) {
    setState(() {
      final key = product.id ?? -1;
      if (_selectedMap.containsKey(key)) {
        _selectedMap.remove(key);
      } else {
        _selectedMap[key] = true;
      }
    });
  }

  void _toggleSelectAll() {
    setState(() {
      final allSelected = _selectedMap.length == _currentProducts.length &&
          _currentProducts.isNotEmpty;

      if (allSelected) {
        _selectedMap.clear();
      } else {
        _selectedMap.clear();
        for (var product in _currentProducts) {
          if (product.id != null) {
            _selectedMap[product.id!] = true;
          }
        }
      }
    });
  }

  int _getSelectedCount() {
    return _selectedMap.length;
  }

  List<Product> _getSelectedProducts() {
    return _currentProducts
        .where((p) => p.id != null && _selectedMap.containsKey(p.id!))
        .toList();
  }

  void _confirmSelection() {
    final selectedProducts = _getSelectedProducts();

    if (selectedProducts.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner au moins un produit'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    Navigator.pop(context);
    widget.onProductsSelected(selectedProducts);
  }

  void _clearSearch() {
    _searchController.clear();
    _currentSearchQuery = '';
    setState(() => _isSearching = true);

    final provider = context.read<ProductProvider>();
    provider.loadUnlinkedProducts(widget.storeId, refresh: true).then((_) {
      if (mounted) {
        setState(() {
          _currentProducts = List.from(provider.unlinkedProducts);
          _selectedMap.clear();
          _isSearching = false;
        });
      }
    });
  }

  bool _listsDiffer(List<Product> a, List<Product> b) {
    if (a.length != b.length) return true;
    for (int i = 0; i < a.length; i++) {
      if (a[i].id != b[i].id || a[i].name != b[i].name) {
        return true;
      }
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ProductProvider>(
      builder: (context, provider, child) {
        // Mettre à jour les produits sans setState pendant le build
        final newProducts = provider.unlinkedProducts;
        if (_listsDiffer(_currentProducts, newProducts) && !_isUpdating) {
          _isUpdating = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              setState(() {
                _currentProducts = List.from(newProducts);
                _isUpdating = false;
              });
            }
          });
        }

        final isLoading = provider.isLoading;
        final hasMore = provider.hasMoreUnlinked;
        final isLoadingMore = provider.isLoadingMoreUnlinked;
        final hasError = provider.error != null;
        final searchQuery = _searchController.text.trim();
        final selectedCount = _getSelectedCount();

        return Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Ajouter des produits',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
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
                                  '$selectedCount sélectionné(s)',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.blue[700],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '• ${_currentProducts.length} disponible(s)',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey[600],
                                ),
                              ),
                              if (searchQuery.isNotEmpty) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[200],
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '"$searchQuery"',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[700],
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Search bar
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Rechercher un produit...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: _clearSearch,
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    filled: true,
                    fillColor: Colors.grey[50],
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                  onChanged: _onSearchChanged,
                ),
              ),

              // Loading indicator for search
              if (_isSearching)
                const Padding(
                  padding: EdgeInsets.all(8.0),
                  child: LinearProgressIndicator(),
                ),

              // Products list
              Expanded(
                child: hasError
                    ? _buildErrorWidget(provider)
                    : _isInitialLoading || (isLoading && _currentProducts.isEmpty)
                        ? _buildLoadingWidget()
                        : _currentProducts.isEmpty
                            ? _buildEmptyWidget(searchQuery)
                            : _buildProductList(
                                _currentProducts,
                                hasMore,
                                isLoadingMore,
                              ),
              ),

              // Footer buttons
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: widget.onCreateNew,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          side: BorderSide(color: Colors.grey[400]!),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: const Text('Nouveau produit'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: selectedCount == 0 ? null : _confirmSelection,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: selectedCount == 0
                              ? Colors.grey[300]
                              : Colors.blue,
                          foregroundColor: selectedCount == 0
                              ? Colors.grey[600]
                              : Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: Text(
                          'Ajouter $selectedCount produit(s)',
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ============================================================================
  // WIDGETS AIDANTS
  // ============================================================================

  Widget _buildLoadingWidget() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Chargement des produits...'),
        ],
      ),
    );
  }

  Widget _buildErrorWidget(ProductProvider provider) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 60,
            color: Colors.red[300],
          ),
          const SizedBox(height: 16),
          Text(
            'Erreur de chargement',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.red[700],
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              provider.error ?? 'Une erreur est survenue',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadFirstPage,
            child: const Text('Réessayer'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyWidget(String searchQuery) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            searchQuery.isNotEmpty ? Icons.search_off : Icons.inventory_2,
            size: 80,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            searchQuery.isNotEmpty
                ? 'Aucun résultat pour "$searchQuery"'
                : 'Aucun produit disponible',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            searchQuery.isNotEmpty
                ? 'Essayez avec un autre mot-clé'
                : 'Créez un nouveau produit pour continuer',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: widget.onCreateNew,
            icon: const Icon(Icons.add),
            label: const Text('Créer un produit'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductList(
    List<Product> products,
    bool hasMore,
    bool isLoadingMore,
  ) {
    return Column(
      children: [
        // Select all row
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Checkbox(
                value: _selectedMap.length == products.length &&
                    products.isNotEmpty,
                onChanged: (_) => _toggleSelectAll(),
                activeColor: Colors.blue,
              ),
              const Text(
                'Tout sélectionner',
                style: TextStyle(fontWeight: FontWeight.w500),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_selectedMap.length} / ${products.length}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[700],
                  ),
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(8),
            itemCount: products.length + (hasMore ? 1 : 0),
            itemBuilder: (context, index) {
              if (index == products.length) {
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: Center(
                    child: isLoadingMore
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Plus de produits disponibles'),
                  ),
                );
              }

              final product = products[index];
              final isSelected = product.id != null && 
                  _selectedMap.containsKey(product.id!);

              return Card(
                key: ValueKey(product.id ?? index),
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                elevation: 1,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                child: CheckboxListTile(
                  value: isSelected,
                  onChanged: (_) => _toggleSelection(product),
                  activeColor: Colors.blue,
                  checkboxShape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                  secondary: Stack(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: product.imagesUrls != null &&
                                product.imagesUrls!.isNotEmpty
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  product.imagesUrls![0],
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stack) {
                                    return Icon(
                                      Icons.shopping_bag,
                                      color: Colors.grey[400],
                                      size: 30,
                                    );
                                  },
                                ),
                              )
                            : Icon(
                                Icons.shopping_bag,
                                color: Colors.grey[400],
                                size: 30,
                              ),
                      ),
                      if (product.status.toLowerCase() == 'draft')
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.warning,
                              color: Colors.white,
                              size: 10,
                            ),
                          ),
                        ),
                    ],
                  ),
                  title: Text(
                    product.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 16,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        'SKU: ${product.sku ?? "N/A"}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                        ),
                      ),
                      if (product.price != null)
                        Text(
                          'Prix: ${product.price!.toStringAsFixed(0)} FCFA',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}