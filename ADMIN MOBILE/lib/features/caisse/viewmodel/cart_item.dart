class CartItem {
  final int storeProductId;
  final String productName;
  final double unitPrice;
  final int storeVariantId;
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
    required this.storeVariantId,
    this.sku,
    this.imageUrl,
  });

  double get lineTotal => quantity * unitPrice;
  double get taxAmount => lineTotal * taxRate / 100;
  double get total => lineTotal + taxAmount;

  Map<String, dynamic> toJson() => {
    'store_product': storeProductId,
    'store_variant_id': storeVariantId,
    'quantity': quantity,
    'unit_price': unitPrice,
    'tax_rate': taxRate,
  };
}