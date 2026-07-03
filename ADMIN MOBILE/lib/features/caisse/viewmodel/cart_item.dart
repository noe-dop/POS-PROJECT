// lib/features/caisse/models/cart_item.dart
class CartItem {
  final int storeProductId;
  final String productName;
  final double unitPrice;
  int quantity;
  final double taxRate;
  final String? sku;
  final String? imageUrl;

  CartItem({
    required this.storeProductId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.taxRate,
    this.sku,
    this.imageUrl,
  });

  double get lineTotal => quantity * unitPrice;
  double get taxAmount => lineTotal * taxRate / 100;
  double get total => lineTotal + taxAmount;

  Map<String, dynamic> toJson() => {
    'store_product': storeProductId,
    'quantity': quantity,
    'unit_price': unitPrice,
    'tax_rate': taxRate,
  };
}