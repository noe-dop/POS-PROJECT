import 'package:flutter/material.dart';

class RandomColor {
  Color getColorFromName(String name) {
    final colors = [
      Colors.blue,
      const Color.fromARGB(255, 60, 132, 63),
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.indigo,
    ];
    final index = name.length % colors.length;
    return colors[index];
  }
}
