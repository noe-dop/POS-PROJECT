class CaisseTransaction {
  final String id;
  final String clientId;
  final double amount;
  final DateTime timestamp;
  final List<String> paymentMethod;
  final Map<int, double> paymentBreakdown; 

  CaisseTransaction({
    required this.id,
    required this.clientId,
    required this.amount,
    required this.timestamp,
    required this.paymentMethod,
    this.paymentBreakdown = const {},
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'client_id': clientId,
      'amount': amount,
      'timestamp': timestamp.toIso8601String(),
      'payment_method': paymentMethod,
      'payment_breakdown': paymentBreakdown.map((k, v) => MapEntry(k.toString(), v)),
    };
  }
}