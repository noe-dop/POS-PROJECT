class CaisseSession {
  final String id;
  final String userId;
  final DateTime startTime;
  DateTime? endTime;
  final Map<int, int> initialCash;
  Map<int, int> currentCash;
  final List<CaisseTransaction> transactions;
  final String currency;
  
  CaisseSession({
    required this.id,
    required this.userId,
    required this.startTime,
    required this.initialCash,
    required this.currency,
    Map<int, int>? currentCash,
    List<CaisseTransaction>? transactions,
  }) : currentCash = currentCash ?? Map.from(initialCash),
       transactions = transactions ?? [];

  double get totalInitial => _calculateTotal(initialCash);
  double get totalCurrent => _calculateTotal(currentCash);
  
  double _calculateTotal(Map<int, int> cash) {
    double total = 0;
    cash.forEach((denomination, quantity) {
      total += denomination * quantity;
    });
    return total;
  }
  double _calculateCurrentTotal(double montant) {
    double totalPerTransaction = 0;
    for (var transaction in transactions) {
      totalPerTransaction += transaction.amount;
    }
    return totalInitial + totalPerTransaction;
  }
  
  String formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

class CaisseTransaction {
  final String id;
  final String clientId;
  final double amount;
  final DateTime timestamp;
  final List<String> paymentMethod;
  
  CaisseTransaction({
    required this.id,
    required this.clientId,
    required this.amount,
    required this.timestamp,
    required this.paymentMethod,
  });
}