import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:provider/provider.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    final String? email = Provider.of<AuthService>(context,listen: false).currentUser?.email;
    _emailController.text = email ?? '';
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mot de passe oublié')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
              onSubmitted: (value) => _sendResetEmail(),
            ),
            const SizedBox(height: 20),
            _isLoading
                ? const CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: _sendResetEmail,
                    child: const Text('Envoyer le lien'),
                  ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendResetEmail() async {
    if (_emailController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez saisir votre email')),
      );
      return;
    }
    setState(() => _isLoading = true);
    final authService = context.read<AuthService>();
    final result = await authService.requestPasswordReset(_emailController.text);
    setState(() => _isLoading = false);
    if (result['success'] && mounted) {
      NotificationService.showSuccess(context,result['message']);
      Navigator.pop(context);
    } else if (mounted) {
      NotificationService.showWarning(context, authService.errorMessage ?? result['message']);
    }
  }
}