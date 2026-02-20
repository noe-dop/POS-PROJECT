import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class AddGroupeDialog extends StatefulWidget {
  final Groupe? groupe; // Si null → création, sinon modification
  final List<CategoriePrincipale> categories;
  final bool canEdit;

  const AddGroupeDialog({
    super.key,
    this.groupe,
    required this.categories,
    required this.canEdit,
  });

  @override
  State<AddGroupeDialog> createState() => _AddGroupeDialogState();
}

class _AddGroupeDialogState extends State<AddGroupeDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _descriptionController;
  int? _selectedCategorieId;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.groupe?.nom ?? '');
    _descriptionController = TextEditingController(text: widget.groupe?.description ?? '');
    _selectedCategorieId = widget.groupe?.categoriePrincipaleId ;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final bool isEditing = widget.groupe != null;
    final bool readOnly = !widget.canEdit;

    return AlertDialog(
      constraints: BoxConstraints(
        maxWidth: size.width<768 ? 600:800
      ),
      title: Text(
        isEditing
            ? (readOnly ? 'Détails du groupe' : 'Modifier le groupe')
            : 'Nouveau groupe',
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<int>(
              initialValue: _selectedCategorieId,
              items: widget.categories.map((cat) {
                return DropdownMenuItem<int>(
                  value: cat.id,
                  child: Text(cat.nom),
                );
              }).toList(),
              onChanged: readOnly ? null : (value) => setState(() => _selectedCategorieId = value),
              decoration: InputDecoration(
                labelText: 'Catégorie principale',
                border: const OutlineInputBorder(),
                filled: readOnly,
                fillColor: readOnly ? Colors.grey.shade100 : null,
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Nom du groupe',
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
      return [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Fermer'),
        ),
      ];
    }

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
    final description = _descriptionController.text.trim();

    if (name.isEmpty || _selectedCategorieId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez remplir tous les champs obligatoires')),
      );
      return;
    }

    // Retourne un objet Groupe (pour création, id = 0 sera remplacé par le backend)
    final updatedGroupe = Groupe(
      id: widget.groupe?.id,
      nom: name,
      categoriePrincipaleId: _selectedCategorieId!,
      description: description.isEmpty ? widget.groupe!.description : description,
      slug: widget.groupe?.slug
    );

    Navigator.pop(context, updatedGroupe);
  }
}