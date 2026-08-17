// utils/format_utils.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';

class FormatUtils {
  static String formatNumber(int number) {
    return number.toString().replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (Match m) => '${m[1]}.',
    );
  }

  String capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }

  /// Nettoie et formate une URL d'image
  static String? formatImageUrl(dynamic imageUrl) {
    if (imageUrl == null) return null;

    String url = imageUrl.toString().trim();
    if (url.isEmpty || url == 'null' || url == 'None') return null;

    // Si l'URL contient déjà http ou https, la retourner telle quelle
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Si l'URL commence par /media, utiliser mediaBaseUrl
    if (url.startsWith('/media')) {
      return ApiConfig.mediaBaseUrl + url;
    }

    // Si l'URL ne commence ni par http ni par /media, ajouter mediaBaseUrl
    return '${ApiConfig.mediaBaseUrl}/media/$url';
  }

  static String formatCurrency(double amount, String symbol) {
    return '${formatNumber(amount.toInt())} $symbol';
  }

  static String formatCurrencyWithDecimal(double amount, String symbol) {
    final integerPart = amount.toInt();
    final decimalPart = ((amount - integerPart) * 100).toInt();

    if (decimalPart == 0) {
      return '${formatNumber(integerPart)} $symbol';
    } else {
      return '${formatNumber(integerPart)},${decimalPart.toString().padLeft(2, '0')} $symbol';
    }
  }

  static String formatDateTime(DateTime dateTime) {
    return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} '
        '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }

  static String maskCardNumber(String cardNumber) {
    if (cardNumber.isEmpty) return 'Carte';
    if (cardNumber.length <= 3) return cardNumber;
    final visible = cardNumber.substring(cardNumber.length - 3);
    return '${'*' * (cardNumber.length - 3)}$visible';
  }

  static String extractErrorMessage(dynamic errorData) {
    if (errorData == null) return 'Une erreur inconnue est survenue.';

    // Si c'est déjà une chaîne
    if (errorData is String) return errorData;

    // Si c'est une liste d'erreurs
    if (errorData is List) {
      if (errorData.isEmpty) return 'Erreur inconnue.';
      // Récupérer le premier message ou concaténer
      final firstError = errorData.first;
      if (firstError is String) return firstError;
      if (firstError is Map) {
        // Essayer de récupérer la première valeur
        final values = firstError.values.where((v) => v is String).toList();
        if (values.isNotEmpty) return values.first as String;
      }
      return errorData.join(', ');
    }

    // Si c'est un dictionnaire
    if (errorData is Map) {
      // Chercher les clés communes : 'error', 'message', 'detail', 'non_field_errors'
      final possibleKeys = [
        'error',
        'message',
        'detail',
        'non_field_errors',
        'errors',
      ];
      for (var key in possibleKeys) {
        if (errorData.containsKey(key)) {
          final value = errorData[key];
          if (value is String) return value;
          if (value is List) {
            if (value.isNotEmpty && value.first is String) {
              return value.first as String;
            }
          }
          if (value is Map) {
            // Valeur sous-forme de dictionnaire (ex: { "store_product": ["Ce champ est requis"] })
            final firstKey = value.keys.first;
            final firstValue = value[firstKey];
            if (firstValue is List && firstValue.isNotEmpty) {
              return firstValue.first as String;
            }
            if (firstValue is String) return firstValue;
          }
        }
      }
      // Sinon, prendre la première valeur chaîne trouvée
      for (var value in errorData.values) {
        if (value is String) return value;
        if (value is List && value.isNotEmpty && value.first is String) {
          return value.first as String;
        }
      }
      return 'Erreur de validation.';
    }

    return errorData.toString();
  }

  void formatPhoneNumber(TextEditingController controller) {
    final text = controller.text.replaceAll(RegExp(r'[^\d+]'), '');
    final formatted = StringBuffer();

    for (int i = 0; i < text.length; i++) {
      if (i == 2 || i == 4 || i == 6) {
        formatted.write(' ');
      }
      formatted.write(text[i]);
    }

    controller.text = formatted.toString();
    controller.selection = TextSelection.collapsed(
      offset: controller.text.length,
    );
  }

  static double? toDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  static int? toInt(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toInt();
    if (value is String) {
      // Essayer d'abord int.tryParse (pour "123")
      final intValue = int.tryParse(value);
      if (intValue != null) return intValue;
      // Sinon essayer double.tryParse (pour "123.45" ou "123,45")
      final doubleValue = double.tryParse(value);
      return doubleValue?.toInt();
    }
    return null;
  }
}
