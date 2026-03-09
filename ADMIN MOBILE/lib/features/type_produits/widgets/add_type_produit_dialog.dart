import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/type_produits/viewmodel/type_produit_model.dart';

class AddTypeProduitDialog extends StatefulWidget {
  final TypeProduit? initial;
  final int? groupeId;
  final List<Groupe> groupes;

  const AddTypeProduitDialog({
    super.key,
    this.initial,
    this.groupeId,
    required this.groupes,
  });

  @override
  State<AddTypeProduitDialog> createState() => _AddTypeProduitDialogState();
}

class _AddTypeProduitDialogState extends State<AddTypeProduitDialog> {
  final _controller = TextEditingController();
  int? _selectedGroupeId;

  @override
  void initState() {
    super.initState();
    if (widget.initial != null) {
      _controller.text = widget.initial!.nom;
    }
    _selectedGroupeId = widget.groupeId ?? (widget.groupes.isNotEmpty ? widget.groupes.first.id : null);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      constraints: BoxConstraints(
        maxWidth: 600
      ),
      title: Text(widget.initial == null ? 'Nouveau type de produit' : 'Modifier le type'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<int>(
            initialValue: _selectedGroupeId,
            items: widget.groupes.map((g) {
              return DropdownMenuItem<int>(
                value: g.id,
                child: Text(g.nom),
              );
            }).toList(),
            onChanged: (value) => setState(() => _selectedGroupeId = value),
            decoration: const InputDecoration(labelText: 'Groupe'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              hintText: 'Nom du type',
              border: OutlineInputBorder(),
            ),
            autofocus: true,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        ElevatedButton(
          onPressed: () {
            if (_controller.text.isNotEmpty && _selectedGroupeId != null) {
              var name = _controller.text.trim();
              var type = TypeProduit(id: widget.initial?.id, nom: FormatUtils().capitalize(name), slug: widget.initial?.slug, groupeId: _selectedGroupeId!);
              Navigator.pop(context, type);
            }
          },
          child: Text(widget.initial == null ? 'Créer' : 'Mettre à jour'),
        ),
      ],
    );
  }
}