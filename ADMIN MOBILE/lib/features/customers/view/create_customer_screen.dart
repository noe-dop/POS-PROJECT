
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/customers/service/customer_service.dart';
import 'package:provider/provider.dart';

class CreateCustomerScreen extends StatefulWidget {
  const CreateCustomerScreen({super.key});

  @override
  State<CreateCustomerScreen> createState() => _CreateCustomerScreenState();
}

class _CreateCustomerScreenState extends State<CreateCustomerScreen> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Créer un client'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            children: [
              TextField(
                controller: _firstNameController,
                decoration: const InputDecoration(
                  labelText: 'Prénom',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _lastNameController,
                decoration: const InputDecoration(
                  labelText: 'Nom',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Téléphone (optionnel)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              _isLoading
                  ? const CircularProgressIndicator()
                  : ElevatedButton(
                      onPressed: _createCustomer,
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 50),
                      ),
                      child: const Text('Créer le client'),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _createCustomer() async {
    if (_firstNameController.text.trim().isEmpty ||
        _lastNameController.text.trim().isEmpty ||
        _emailController.text.trim().isEmpty  ||
        _phoneController.text.trim().isEmpty
        ) {
      NotificationService.showWarning(context, 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final provider = context.read<CustomerProvider>();
      // final success = await provider.createCustomerByCashier(
      //   email: _emailController.text.trim(),
      //   firstName: _firstNameController.text.trim(),
      //   lastName: _lastNameController.text.trim(),
      //   phone: _phoneController.text.trim(),
      // );

      // if (success) {
      //   NotificationService.showSuccess(context, 'Client créé avec succès ! Un email de bienvenue a été envoyé.');
      //   Navigator.pop(context);
      // } else {
      //   NotificationService.showError(context, provider.errorMessage ?? 'Erreur inconnue');
      // }
    } catch (e) {
      NotificationService.showError(context, 'Erreur: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }
}