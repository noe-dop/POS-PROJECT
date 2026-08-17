import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/auth/service/auth_service.dart';
import 'package:provider/provider.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String uid;
  final String token;
  const ResetPasswordScreen({
    super.key,
    required this.uid,
    required this.token,
  });

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nouveau mot de passe')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(
              controller: _newPasswordController,
              decoration: const InputDecoration(
                labelText: 'Nouveau mot de passe',
              ),
              obscureText: true,
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _confirmPasswordController,
              decoration: const InputDecoration(labelText: 'Confirmer'),
              obscureText: true,
            ),
            const SizedBox(height: 20),
            _isLoading
                ? const CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: _resetPassword,
                    child: const Text('Changer le mot de passe'),
                  ),
          ],
        ),
      ),
    );
  }

  Future<void> _resetPassword() async {
    if (_newPasswordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Les mots de passe ne correspondent pas')),
      );
      return;
    }
    setState(() => _isLoading = true);
    final authService = context.read<AuthService>();
    final result = await authService.confirmPasswordReset(
      uid: widget.uid,
      token: widget.token,
      newPassword: _newPasswordController.text,
      confirmPassword: _confirmPasswordController.text,
    );
    setState(() => _isLoading = false);
    if (result['success'] && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(result['message'])));
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/login',
        (route) => false, // supprime toute la pile de navigation
      );
    } else if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(result['message'])));
    }
  }
}
