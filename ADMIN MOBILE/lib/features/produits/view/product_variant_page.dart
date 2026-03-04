// product_variants_page.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';

class ProductVariantsPage extends StatefulWidget {
  final Product product;
  const ProductVariantsPage({super.key, required this.product});

  @override
  State<ProductVariantsPage> createState() => _ProductVariantsPageState();
}

class _ProductVariantsPageState extends State<ProductVariantsPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Variantes de ${widget.product.name}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _addVariant,
          ),
        ],
      ),
      body: ListView.builder(
        itemCount: widget.product.variants?.length ?? 0,
        itemBuilder: (context, index) {
          final variant = widget.product.variants![index];
          return ListTile(
            title: Text(variant.barcode),
            subtitle: Text(variant.description),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () => _editVariant(variant),
                ),
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _deleteVariant(variant),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _addVariant() {
    // Ouvrir formulaire de création de variante
    // Après création, rafraîchir le produit
  }

  void _editVariant(Variant variant) {
    // Ouvrir formulaire d'édition
  }

  void _deleteVariant(Variant variant) {
    // Demander confirmation et appeler le service
  }
}