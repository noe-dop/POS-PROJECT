import 'package:nsp_pos_mobile/core/utils/format_utils.dart';

class OrderItemModel {
  final int id;
  final int storeProductId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double lineTotal;

  OrderItemModel({
    required this.id,
    required this.storeProductId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'],
      storeProductId: json['store_product_id'] ?? 0,
      productName: json['product_name'] ?? 'Produit inconnu',
      quantity: FormatUtils.toInt(json['quantity'])!,
      unitPrice: FormatUtils.toDouble(json['unit_price'])!,
      lineTotal: FormatUtils.toDouble(json['line_total'])!,
    );
  }
}
