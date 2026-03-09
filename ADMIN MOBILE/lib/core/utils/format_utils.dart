// utils/format_utils.dart
import 'package:flutter/material.dart';

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
}