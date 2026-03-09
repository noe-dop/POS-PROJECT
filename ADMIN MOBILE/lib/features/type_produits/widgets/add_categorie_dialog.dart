import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class AddCategorieDialog extends StatefulWidget {
  final CategoriePrincipale? categorie;
  final bool canEdit; // true = édition autorisée, false = consultation seule

  const AddCategorieDialog({
    super.key,
    this.categorie,
    required this.canEdit,
  });

  @override
  State<AddCategorieDialog> createState() => _AddCategorieDialogState();
}

class _AddCategorieDialogState extends State<AddCategorieDialog> {
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.categorie != null) {
      _nameController.text = widget.categorie!.nom;
      _descriptionController.text = widget.categorie!.description;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isEditing = widget.categorie != null;
    final bool readOnly = !widget.canEdit;

    return AlertDialog(
      constraints: BoxConstraints(
        maxWidth: 600
      ),
      title: Text(
        isEditing ? 'Détails de la catégorie' : 'Nouvelle catégorie principale',
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nom de la catégorie',
                border: OutlineInputBorder(),
              ),
              autofocus: !readOnly && !isEditing,
              readOnly: readOnly,
              enabled: !readOnly,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optionnelle)',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 3,
              readOnly: readOnly,
              enabled: !readOnly,
            ),
            
          ],
        ),
      ),
      actions: _buildActions(context, isEditing, readOnly),
    );
  }

  List<Widget> _buildActions(BuildContext context, bool isEditing, bool readOnly) {
    if (readOnly) {
      // Mode consultation seule : juste un bouton Fermer
      return [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Fermer'),
        ),
      ];
    }

    // Mode édition : Annuler et Créer/Mettre à jour
    return [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Annuler'),
      ),
      ElevatedButton(
        onPressed: _submit,
        child: Text(isEditing ? 'Mettre à jour' : 'Créer'),
      ),
    ];
  }

  void _submit() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le nom ne peut pas être vide')),
      );
      return;
    }

    // Retourne un Map contenant les données saisies
    Navigator.pop(context, {
      'nom': FormatUtils().capitalize(name),
      'description': _descriptionController.text.trim(),
    });
  }
}