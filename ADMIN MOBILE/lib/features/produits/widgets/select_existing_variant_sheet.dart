// select_existing_variant_sheet.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:provider/provider.dart';

class SelectExistingVariantSheet extends StatefulWidget {
  final int productId;
  final int storeId;
  final Function(Variant) onVariantSelected;
  final VoidCallback onCreateNew;

  const SelectExistingVariantSheet({
    super.key,
    required this.productId,
    required this.storeId,
    required this.onVariantSelected,
    required this.onCreateNew,
  });

  @override
  State<SelectExistingVariantSheet> createState() =>
      _SelectExistingVariantSheetState();
}

class _SelectExistingVariantSheetState
    extends State<SelectExistingVariantSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<Variant> _variants = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadVariants();
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
        _variants = variants;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppBar(
          title: const Text('Ajouter une variante existante'),
          automaticallyImplyLeading: false,
          actions: [
            IconButton(
              icon: const Icon(Icons.close),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),

        // Barre de recherche
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Rechercher par code barre ou description...',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              suffixIcon: IconButton(
                icon: const Icon(Icons.clear),
                onPressed: () {
                  _searchController.clear();
                  setState(() {});
                },
              ),
            ),
            onChanged: (value) => setState(() {}),
          ),
        ),

        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _buildVariantList(),
        ),

        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: widget.onCreateNew,
              icon: const Icon(Icons.add),
              label: const Text('Créer une nouvelle variante'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVariantList() {
    // Filtrer par recherche
    final filtered = _searchController.text.isEmpty
        ? _variants
        : _variants.where((v) {
            final query = _searchController.text.toLowerCase();
            return v.barcode.toLowerCase().contains(query) ||
                v.name.toLowerCase().contains(query);
          }).toList();

    if (filtered.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inventory_2, size: 80, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              _variants.isEmpty
                  ? 'Aucune variante disponible'
                  : 'Aucun résultat pour "${_searchController.text}"',
              style: const TextStyle(fontSize: 16, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            if (_variants.isEmpty)
              ElevatedButton.icon(
                onPressed: widget.onCreateNew,
                icon: const Icon(Icons.add),
                label: const Text('Créer une nouvelle variante'),
              ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: filtered.length,
      itemBuilder: (context, index) {
        final variant = filtered[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: ListTile(
            leading: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(4),
              ),
              child: variant.imageUrl != null
                  ? Image.network(
                      variant.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: Colors.grey[200],
                          child: Icon(
                            Icons.broken_image,
                            color: Colors.grey[400],
                            size: 40,
                          ),
                        );
                      },
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          color: Colors.grey[200],
                          child: const Center(
                            child: CircularProgressIndicator(),
                          ),
                        );
                      },
                    )
                  : const Icon(Icons.inventory),
            ),
            title: Text(variant.name),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Code: ${variant.barcode}'),
                Text('Nombre d\'unités: ${variant.quantity}'),
              ],
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${variant.salePrice1} FCFA',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                ElevatedButton(
                  onPressed: () => widget.onVariantSelected(variant),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(80, 36),
                  ),
                  child: const Text('Ajouter'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
