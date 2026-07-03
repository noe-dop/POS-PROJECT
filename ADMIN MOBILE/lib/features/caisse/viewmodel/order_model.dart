import 'package:nsp_pos_mobile/features/caisse/viewmodel/order_item_model.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/order_status_model.dart';

class OrderModel {
  final int id;
  final String number;
  final String customerName;
  final String customerPhone;
  final double total;
  final OrderStatusModel status;
  final List<OrderItemModel> items;
  final DateTime createdAt;

  OrderModel({
    required this.id,
    required this.number,
    required this.customerName,
    required this.customerPhone,
    required this.total,
    required this.status,
    required this.items,
    required this.createdAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json, List<OrderStatusModel> statuses) {
    final statusId = json['status'];
    final status = statuses.firstWhere((s) => s.id == statusId, orElse: () => statuses.first);
    return OrderModel(
      id: json['id'],
      number: json['order_number'] ?? 'N/A',
      customerName: json['customer_name'] ?? 'Client anonyme',
      customerPhone: json['customer_phone'] ?? '',
      total: (json['total_amount'] as num).toDouble(),
      status: status,
      items: (json['items'] as List?)?.map((item) => OrderItemModel.fromJson(item)).toList() ?? [],
      createdAt: DateTime.parse(json['order_date'] ?? DateTime.now().toIso8601String()),
    );
  }
}