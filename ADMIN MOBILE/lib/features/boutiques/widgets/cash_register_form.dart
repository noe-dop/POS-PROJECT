import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/cash_register_model.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/cash_register_service.dart';

class CashRegisterForm extends StatefulWidget {
  final int storeId;
  final CashRegisterModel? cashRegister;
  final VoidCallback onSaved;
  const CashRegisterForm({super.key, required this.storeId, this.cashRegister, required this.onSaved});

  @override
  State<CashRegisterForm> createState() => _CashRegisterFormState();
}
                    
class _CashRegisterFormState extends State<CashRegisterForm> {
  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  bool _isActive = true;

  @override
  void initState() {
    super.initState();
    if (widget.cashRegister != null) {
      _nameController.text = widget.cashRegister!.name;
      _locationController.text = widget.cashRegister!.location ?? '';
      _isActive = widget.cashRegister!.isActive;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      builder: (context, scrollController) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(
                widget.cashRegister == null ? 'Nouvelle caisse' : 'Modifier la caisse',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nom de la caisse *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _locationController,
                decoration: const InputDecoration(labelText: 'Emplacement (optionnel)'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Text('Active'),
                  const SizedBox(width: 8),
                  Switch(value: _isActive, onChanged: (v) => setState(() => _isActive = v)),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                child: const Text('Enregistrer'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _save() async {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Le nom est requis')));
      return;
    }
    final service = context.read<CashRegisterService>();
    bool success;
    if (widget.cashRegister == null) {
      success = await service.createCashRegister(
        storeId: widget.storeId,
        name: _nameController.text.trim(),
        location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        isActive: _isActive,
      );
    } else {
      success = await service.updateCashRegister(
        id: widget.cashRegister!.id!,
        name: _nameController.text.trim(),
        storeId: widget.storeId,
        location: _locationController.text.trim().isEmpty ? null : _locationController.text.trim(),
        isActive: _isActive,
      );
    }
    if (success && mounted) {
      widget.onSaved();
      Navigator.pop(context);
    }
  }
}