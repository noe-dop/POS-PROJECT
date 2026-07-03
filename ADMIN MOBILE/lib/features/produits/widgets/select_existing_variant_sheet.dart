import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:provider/provider.dart';

class SelectMultipleVariantsSheet extends StatefulWidget {
  final int productId;
  final int storeId;
  final int storeProductId;
  final VoidCallback onVariantsLinked;
  final VoidCallback onCreateNew;

  const SelectMultipleVariantsSheet({
    super.key,
    required this.productId,
    required this.storeId,
    required this.storeProductId,
    required this.onVariantsLinked,
    required this.onCreateNew,
  });

  @override
  State<SelectMultipleVariantsSheet> createState() =>
      _SelectMultipleVariantsSheetState();
}

class _SelectMultipleVariantsSheetState
    extends State<SelectMultipleVariantsSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<Variant> _variants = [];
  final Set<int> _selectedVariantIds = {};
  bool _isLoading = true;
  bool _isSubmitting = false;
  
  final TextEditingController _defaultPriceController = TextEditingController();
  final TextEditingController _defaultOnlinePriceController = TextEditingController();
  bool _useCustomPrices = false;

  @override
  void initState() {
    super.initState();
    _loadVariants();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _defaultPriceController.dispose();
    _defaultOnlinePriceController.dispose();
    super.dispose();
  }

  Future<void> _loadVariants() async {
    setState(() => _isLoading = true);
    final provider = context.read<ProductProvider>();
    final variants = await provider.loadUnlinkedVariants(
      widget.productId,
      widget.storeId,
    );
    if (mounted) {
      setState(() {
        _variants = variants.where((v) => v.id != null).toList();
        _isLoading = false;
      });
    }
  }

  void _toggleSelection(int variantId) {
    setState(() {
      if (_selectedVariantIds.contains(variantId)) {
        _selectedVariantIds.remove(variantId);
      } else {
        _selectedVariantIds.add(variantId);
      }
    });
  }

  void _toggleSelectAll() {
    setState(() {
      if (_selectedVariantIds.length == filteredVariants.length) {
        _selectedVariantIds.clear();
      } else {
        for (var variant in filteredVariants) {
          if (variant.id != null) {
            _selectedVariantIds.add(variant.id!);
          }
        }
      }
    });
  }

  Future<void> _linkSelectedVariants() async {
    if (_selectedVariantIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner au moins une variante'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final provider = context.read<ProductProvider>();
      Map<String, dynamic> response;
      
      if (_useCustomPrices && _defaultPriceController.text.isNotEmpty) {
        response = await provider.linkVariantToStore(
          storeProductId: widget.storeProductId,
          variantIds: _selectedVariantIds.toList(),
          price: double.tryParse(_defaultPriceController.text.replaceAll(',', '.')),
          onlinePrice: double.tryParse(_defaultOnlinePriceController.text.replaceAll(',', '.')),
        );
      } else {
        response = await provider.linkVariantToStore(
          storeProductId: widget.storeProductId,
          variantIds: _selectedVariantIds.toList(),
        );
      }

      if (mounted) {
        if (response['status'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response['message']),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );
          Navigator.pop(context);
          widget.onVariantsLinked();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response['message']),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  List<Variant> get filteredVariants {
    if (_searchController.text.isEmpty) return _variants;
    final query = _searchController.text.toLowerCase();
    return _variants.where((v) {
      return v.barcode.toLowerCase().contains(query) ||
          v.name.toLowerCase().contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = filteredVariants;
    final allSelected = _selectedVariantIds.length == filtered.length && filtered.isNotEmpty;
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
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Ajouter des variantes',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${_selectedVariantIds.length} sélectionnée(s)',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _isSubmitting ? null : () => Navigator.pop(context),
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
              enabled: !_isSubmitting,
              decoration: InputDecoration(
                hintText: 'Rechercher par code barre ou nom...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                filled: true,
                fillColor: Colors.grey[50],
              ),
              onChanged: (value) => setState(() {}),
            ),
          ),

          // Options de prix personnalisés
          if (!_isLoading && filtered.isNotEmpty)
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              child: ExpansionTile(
                leading: Icon(Icons.price_change, color: Colors.blue[700]),
                title: const Text('Personnaliser les prix'),
                subtitle: const Text('Définir des prix pour toutes les variantes'),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        SwitchListTile(
                          title: const Text('Utiliser des prix personnalisés'),
                          value: _useCustomPrices,
                          onChanged: (value) {
                            setState(() => _useCustomPrices = value);
                          },
                          activeThumbColor: Colors.blue,
                        ),
                        if (_useCustomPrices) ...[
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _defaultPriceController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'Prix boutique',
                              hintText: 'Prix de vente en magasin',
                              prefixText: 'FCFA ',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              prefixIcon: const Icon(Icons.store),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _defaultOnlinePriceController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'Prix en ligne',
                              hintText: 'Prix de vente en ligne',
                              prefixText: 'FCFA ',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                              prefixIcon: const Icon(Icons.shopping_cart),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 8),

          // Select all row
          if (!_isLoading && filtered.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Checkbox(
                    value: allSelected,
                    onChanged: _isSubmitting ? null : (_) => _toggleSelectAll(),
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
                      '${_selectedVariantIds.length} / ${filtered.length}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[700],
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Variants list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.inventory_2,
                              size: 80,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _variants.isEmpty
                                  ? 'Aucune variante disponible'
                                  : 'Aucun résultat',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _variants.isEmpty
                                  ? 'Créez une nouvelle variante pour continuer'
                                  : 'Essayez une autre recherche',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[500],
                              ),
                            ),
                            const SizedBox(height: 24),
                            if (_variants.isEmpty)
                              ElevatedButton.icon(
                                onPressed: widget.onCreateNew,
                                icon: const Icon(Icons.add),
                                label: const Text('Créer une variante'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.blue,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 24,
                                    vertical: 12,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final variant = filtered[index];
                          final variantId = variant.id;
                          if (variantId == null) return const SizedBox.shrink();
                          
                          final isSelected = _selectedVariantIds.contains(variantId);
                          
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            elevation: 1,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: CheckboxListTile(
                              value: isSelected,
                              onChanged: _isSubmitting ? null : (_) => _toggleSelection(variantId),
                              activeColor: Colors.blue,
                              checkboxShape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                              secondary: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: SizedBox(
                                  width: 50,
                                  height: 50,
                                  child: variant.imageUrl != null && variant.imageUrl!.isNotEmpty
                                      ? Image.network(
                                          variant.imageUrl!,
                                          fit: BoxFit.cover,
                                          errorBuilder: (context, error, stackTrace) {
                                            return Container(
                                              color: Colors.grey[100],
                                              child: Icon(
                                                Icons.broken_image,
                                                color: Colors.grey[400],
                                                size: 30,
                                              ),
                                            );
                                          },
                                        )
                                      : Container(
                                          color: Colors.grey[100],
                                          child: Icon(
                                            Icons.inventory,
                                            color: Colors.grey[400],
                                            size: 30,
                                          ),
                                        ),
                                ),
                              ),
                              title: Text(
                                variant.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 4),
                                  Text(
                                    'Code: ${variant.barcode}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                  Text(
                                    'Quantité: ${variant.quantity}',
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

          // Footer buttons
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isSubmitting ? null : widget.onCreateNew,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: BorderSide(color: Colors.grey[400]!),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('Nouvelle variante'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _isSubmitting || _selectedVariantIds.isEmpty
                        ? null
                        : _linkSelectedVariants,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'Lier ${_selectedVariantIds.length} variante(s)',
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
  }
}