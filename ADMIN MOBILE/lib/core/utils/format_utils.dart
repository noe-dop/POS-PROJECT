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
    return ApiConfig.mediaBaseUrl + '/media/' + url;
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
    if (value is String) return int.tryParse(value);
    return null;
  }
}
