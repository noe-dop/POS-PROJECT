// lib/features/customers/view/create_customer_dialog.dart

import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/customers/service/customer_service.dart';
import 'package:provider/provider.dart';

class CreateCustomerDialog extends StatefulWidget {
  final Function(Map<String, dynamic>)? onCustomerCreated;
  const CreateCustomerDialog({super.key, this.onCustomerCreated});

  @override
  State<CreateCustomerDialog> createState() => _CreateCustomerDialogState();
}

class _CreateCustomerDialogState extends State<CreateCustomerDialog> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _phone2Controller = TextEditingController();
  final TextEditingController _cardController = TextEditingController();

  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nouveau client'),
      content: SizedBox(
        width: 400,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _firstNameController,
                decoration: const InputDecoration(labelText: 'Prénom *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _lastNameController,
                decoration: const InputDecoration(labelText: 'Nom *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Téléphone *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phone2Controller,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Téléphone secondaire (optionnel)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _cardController,
                decoration: const InputDecoration(
                  labelText: 'Numéro de carte *',
                  hintText: 'Saisir le numéro à attribuer',
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        if (_isLoading)
          const Padding(
            padding: EdgeInsets.all(8.0),
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          )
        else
          ElevatedButton(
            onPressed: _createCustomer,
            child: const Text('Créer'),
          ),
      ],
    );
  }

  Future<void> _createCustomer() async {
    if (_firstNameController.text.trim().isEmpty ||
        _lastNameController.text.trim().isEmpty ||
        _emailController.text.trim().isEmpty ||
        _phoneController.text.trim().isEmpty ||
        _cardController.text.trim().isEmpty) {
      NotificationService.showWarning(
        context,
        'Veuillez remplir tous les champs obligatoires',
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final provider = context.read<CustomerProvider>();
      print("creation client");
      final success = await provider.createCustomerByCashier(
        email: _emailController.text.trim(),
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phone: _phoneController.text.trim(),
        phone2: _phone2Controller.text.trim().isEmpty
            ? null
            : _phone2Controller.text.trim(),
        cardNumber: _cardController.text.trim(),
      );
      if (success) {
        NotificationService.showSuccess(context, 'Client créé avec succès !');
        if (widget.onCustomerCreated != null) {
          widget.onCustomerCreated!({
            'email': _emailController.text.trim(),
            'first_name': _firstNameController.text.trim(),
            'last_name': _lastNameController.text.trim(),
            'phone': _phoneController.text.trim(),
          });
        }
        Navigator.pop(context);
      } else {
        NotificationService.showError(
          context,
          provider.errorMessage ?? 'Erreur inconnue',
        );
      }
    } catch (e) {
      NotificationService.showError(context, 'Erreur: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
