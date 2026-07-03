class OrderItemModel {
  final int storeProductId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double lineTotal;

  OrderItemModel({
    required this.storeProductId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      storeProductId: json['store_product_id'] ?? 0,
      productName: json['product_name'] ?? 'Produit inconnu',
      quantity: (json['quantity'] as num).toInt(),
      unitPrice: (json['unit_price'] as num).toDouble(),
      lineTotal: (json['line_total'] as num).toDouble(),
    );
  }
}