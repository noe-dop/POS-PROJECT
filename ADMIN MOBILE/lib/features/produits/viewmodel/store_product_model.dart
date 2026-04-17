import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';

class StoreProduct {
  int id;
  Product product;
  int storeId;
  double quantityItem;
  int? jourEcart;
  double? price; // store_base_price
  double? cost; // store_cost_price
  StockDetails? stockDetails; // à définir
  String? location;
  int? seuilAlerte;
  String status;

  StoreProduct({
    required this.id,
    required this.storeId,
    required this.product,
    required this.quantityItem,
    this.price,
    this.cost,
    this.stockDetails,
    this.location,
    this.seuilAlerte,
    this.jourEcart,
    required this.status,
  });

  factory StoreProduct.fromJson(Map<String, dynamic> json) {
    final int storeId = json["store_id"];
    final product = Product.fromJson(json["product"]);
    return StoreProduct(
      id: json['id'],
      product: product,
      storeId: storeId,
      quantityItem: FormatUtils.toDouble(json["quantity_item"]) ?? 1.0,
      price: FormatUtils.toDouble(json['price']) ?? 0.0,
      cost: FormatUtils.toDouble(json['cost']) ?? 0.0,
      stockDetails: json['stock_details'] != null
          ? StockDetails.fromJson(json['stock_details'])
          : null,
      seuilAlerte: FormatUtils.toInt(json['seuil_alerte']) ?? 0,
      jourEcart: json["jour_ecart"],
      status: json['status'] ?? 'active',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'store': storeId,
      'product': product.id,
      'cost': cost,
      'price': price,
      "quantity_item": quantityItem,
      "seuil_alerte": seuilAlerte,
      'jour_ecart': jourEcart,
      'status': status,
    };
  }
}

// Modèle pour les détails du stock (optionnel)
class StockDetails {
  int id;
  int quantityPackage;
  int quantityOnHand;
  int quantityReserved;
  int quantityAvailable;
  String stockStatus;
  bool isLowStock;
  bool needRestock;
  double minStockThreshold;
  double stockTurnoverRate;
  String? wareHouse;

  StockDetails({
    required this.id,
    required this.quantityPackage,
    required this.quantityOnHand,
    required this.quantityReserved,
    required this.quantityAvailable,
    required this.stockStatus,
    required this.isLowStock,
    required this.needRestock,
    required this.minStockThreshold,
    required this.stockTurnoverRate,
    this.wareHouse,
  });

  factory StockDetails.fromJson(Map<String, dynamic> json) {
    return StockDetails(
      id: json['id'],
      quantityPackage: FormatUtils.toInt(json['quantity_package']) ?? 0,
      quantityOnHand: json['quantity_on_hand'] ?? 0,
      quantityReserved: json['quantity_reserved'] ?? 0,
      quantityAvailable: json['quantity_available'] ?? 0,
      stockStatus: json['stock_status'] ?? 'unknown',
      isLowStock: json['is_low_stock'] ?? false,
      needRestock: json['needs_restock'] ?? false,
      minStockThreshold: FormatUtils.toDouble(json['min_stock_threshold']) ?? 0.0,
      stockTurnoverRate: FormatUtils.toDouble(json['stock_turnover_rate']) ?? 0.0,
      wareHouse: json['warehouse']
    );
  }
}
