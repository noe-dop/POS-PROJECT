import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class AddSousTypeDialog extends StatefulWidget {
  final TypeProduit parentType;

  const AddSousTypeDialog({
    super.key,
    required this.parentType,
  });

  @override
  _AddSousTypeDialogState createState() => _AddSousTypeDialogState();
}

class _AddSousTypeDialogState extends State<AddSousTypeDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Créer un Sous-Type'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Type parent: ${widget.parentType.nom}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nom du sous-type',
                hintText: 'Entrez le nom du sous-type',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.category_outlined),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Veuillez entrer un nom';
                }
                if (value.length < 2) {
                  return 'Le nom doit contenir au moins 2 caractères';
                }
                return null;
              },
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_formKey.currentState!.validate()) {
              Navigator.pop(context, _nameController.text.trim());
            }
          },
          child: const Text('Ajouter'),
        ),
      ],
    );
  }
}