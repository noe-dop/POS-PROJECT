import 'package:flutter/material.dart';

class NotificationService {
  static GlobalKey<ScaffoldMessengerState>? _messengerKey;

  static void init(GlobalKey<ScaffoldMessengerState> key) {
    _messengerKey = key;
  }

  // Méthode privée pour afficher un SnackBar
  static void _showSnackBar(
    BuildContext? context,
    String message,
    Color backgroundColor,
    IconData icon,
    Duration duration,
  ) {
    // 1. Essayer d'utiliser le contexte local (s'il existe et est monté)
    if (context != null && context.mounted) {
      final messenger = ScaffoldMessenger.maybeOf(context);
      if (messenger != null) {
        messenger.showSnackBar(
          _buildSnackBar(message, backgroundColor, icon, duration: duration),
        );
        return;
      }
    }

    // 2. Fallback : utiliser le GlobalKey (écran principal)
    if (_messengerKey != null && _messengerKey!.currentState != null) {
      _messengerKey!.currentState!.showSnackBar(
        _buildSnackBar(message, backgroundColor, icon, duration: duration),
      );
      return;
    }

    // 3. Dernier recours : si aucun Scaffold disponible, loguer l'erreur
    debugPrint(
      'NotificationService: Aucun ScaffoldMessenger disponible pour le message: $message',
    );
  }

  static SnackBar _buildSnackBar(
    String message,
    Color backgroundColor,
    IconData icon, {
    required Duration duration,
  }) {
    return SnackBar(
      content: Row(
        children: [
          Icon(icon, color: Colors.white),
          const SizedBox(width: 8),
          Expanded(child: Text(message)),
        ],
      ),
      backgroundColor: backgroundColor,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.all(20),
      duration: duration,
    );
  }

  // Méthodes publiques avec paramètre context optionnel (pour fallback)
  static void showSuccess(
    BuildContext? context,
    String message, {
    Duration duration = const Duration(milliseconds: 4000),
  }) {
    _showSnackBar(context, message, Colors.green, Icons.check_circle, duration);
  }

  static void showError(
    BuildContext? context,
    String message, {
    Duration duration = const Duration(milliseconds: 4000),
  }) {
    _showSnackBar(context, message, Colors.red, Icons.error, duration);
  }

  static void showWarning(
    BuildContext? context,
    String message, {
    Duration duration = const Duration(milliseconds: 4000),
  }) {
    _showSnackBar(context, message, Colors.orange, Icons.warning, duration);
  }

  static void showInfo(
    BuildContext? context,
    String message, {
    Duration duration = const Duration(milliseconds: 4000),
  }) {
    _showSnackBar(context, message, Colors.blue, Icons.info, duration);
  }
}
