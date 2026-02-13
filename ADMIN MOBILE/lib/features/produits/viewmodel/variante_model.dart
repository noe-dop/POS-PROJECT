class Variant {
  final String barcode;
  final String description;
  final int quantity;
  final double salePrice1;
  final double? salePrice2;
  final double? comparePrice;
  final String imageUrl;

  Variant({
    required this.barcode,
    required this.description,
    required this.quantity,
    required this.salePrice1,
    this.salePrice2,
    this.comparePrice,
    this.imageUrl =''
  });
}