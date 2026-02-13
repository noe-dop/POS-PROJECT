class CashCount {
  final int denomination;
  final int quantity;
  
  CashCount({
    required this.denomination,
    required this.quantity,
  });
  
  double get total => denomination * quantity as double;
  
  @override
  String toString() {
    return '$quantity x $denomination = $total';
  }
}