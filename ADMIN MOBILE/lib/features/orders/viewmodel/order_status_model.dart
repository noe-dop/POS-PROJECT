import 'package:flutter/material.dart';

class OrderStatusModel {
  final int id;
  final String code;
  final String name;
  final Color color;

  OrderStatusModel({
    required this.id, 
    required this.code, 
    required this.name, 
    required this.color});

  factory OrderStatusModel.fromJson(Map<String, dynamic> json) {
    final colorHex = json['color'] ?? '#000000';
    return OrderStatusModel(
      id: json['id'],
      code: json['code'],
      name: json['name'],
      color: Color(int.parse(colorHex.replaceFirst('#', '0xFF'))),
    );
  }
}