import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:provider/provider.dart';

class VariantForm extends StatefulWidget {
  final Product product;
  final Variant? variant; // null pour création
  const VariantForm({super.key, required this.product, this.variant});

  @override
  State<VariantForm> createState() => _VariantFormState();
}

class _VariantFormState extends State<VariantForm> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _barcodeController;
  late TextEditingController _descriptionController;
  // ... autres contrôleurs

  @override
  void initState() {
    super.initState();
    _barcodeController = TextEditingController(text: widget.variant?.barcode ?? '');
    // ...
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.variant == null ? 'Nouvelle variante' : 'Modifier variante'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _barcodeController,
              decoration: const InputDecoration(labelText: 'Code-barres'),
              validator: (value) => value == null || value.isEmpty ? 'Requis' : null,
            ),
            TextFormField(
              controller: _descriptionController,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            // ... autres champs
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _save,
              child: Text(widget.variant == null ? 'Créer' : 'Modifier'),
            ),
          ],
        ),
      ),
    );
  }

  void _save() async {
    if (_formKey.currentState!.validate()) {
      final data = {
        'barcode': _barcodeController.text,
        'description': _descriptionController.text,
        // ...
      };
      final success = widget.variant == null
          ? await context.read<ProductProvider>().createVariant(widget.product.id!, data)
          : await context.read<ProductProvider>().updateVariant(widget.variant!.id!, data);
      if (success && mounted) {
        Navigator.pop(context, true);
      }
    }
  }
}