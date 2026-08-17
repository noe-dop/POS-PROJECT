import 'package:nsp_pos_mobile/features/caisse/viewmodel/cart_item.dart';
import 'package:nsp_pos_mobile/features/customers/viewmodel/card_model.dart';

class ClientSession {
  final String id;
  final String clientId;
  String clientName;
  List<CartItem> cart;
  List<Map<String, dynamic>> payments;
  final bool isAnonymous;
  final DateTime createdAt;
  bool isActive;
  // Session de caisse associée
  int? cashSessionId;
  Map<String, dynamic>? customerData;
  int? customerId;
  List<CardModel>? cards;

  ClientSession({
    required this.id,
    required this.clientId,
    required this.clientName,
    required this.cart,
    this.payments = const [],
    this.isAnonymous = false,
    required this.createdAt,
    this.isActive = true,
    this.cashSessionId,
    this.customerData,
    this.customerId,
    this.cards,
  });

  double get total => cart.fold(0, (sum, item) => sum + item.total);
  int get itemCount => cart.length;
  double get totalPaid =>
      payments.fold(0, (sum, p) => sum + (p['amount'] as double));
  double get remaining => total - totalPaid;
  bool get isFullyPaid => remaining <= 0;

  void addPayment(int methodId, double amount) {
    payments.add({'methodId': methodId, 'amount': amount});
  }

  void clearPayments() {
    payments.clear();
  }

  void clearCart()
  /// Vider le panier et les paiements de la session
  {
    cart.clear();
    payments.clear();
  }
}
