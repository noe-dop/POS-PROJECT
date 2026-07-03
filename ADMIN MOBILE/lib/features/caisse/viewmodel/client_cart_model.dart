// lib/features/caisse/viewmodel/client_cart.dart
import 'cart_item.dart';

class ClientCart {
  final String clientId;
  String customerName;
  String? customerEmail;
  String? customerPhone;
  List<CartItem> cart;
  List<Map<String, dynamic>> payments;

  ClientCart({
    required this.clientId,
    required this.customerName,
    this.customerEmail,
    this.customerPhone,
    List<CartItem>? cart,
    List<Map<String, dynamic>>? payments,
  }) : cart = cart ?? [],
       payments = payments ?? [];

  double get subtotal => cart.fold(0, (s, i) => s + i.lineTotal);
  double get taxTotal => cart.fold(0, (s, i) => s + i.taxAmount);
  double get total => cart.fold(0, (s, i) => s + i.total);
  double get totalPaid => payments.fold(0, (s, p) => s + (p['amount'] as double));
  double get remaining => total - totalPaid;
  bool get isFullyPaid => remaining <= 0;
}