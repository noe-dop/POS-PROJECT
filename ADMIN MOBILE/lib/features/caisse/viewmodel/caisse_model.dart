// models/caisse_model.dart
class CurrencyConfig {
  final String code;
  final String symbol;
  final List<int> denominations;
  final List<double>? coins;

  CurrencyConfig({
    required this.code,
    required this.symbol,
    required this.denominations,
    this.coins,
  });

  static final currencies = {
    'FCFA': CurrencyConfig(
      code: 'FCFA',
      symbol: 'FCFA',
      denominations: [10000, 5000, 2000, 1000, 500],
      coins: [250, 100, 50, 25, 10, 5],
    ),
    // Ajouter d'autres devises ici
    'EUR': CurrencyConfig(
      code: 'EUR',
      symbol: '€',
      denominations: [500, 200, 100, 50, 20, 10, 5],
      coins: [2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01],
    ),
  };
}

class CashCount {
  final double denomination;
  final int quantity;
  
  CashCount({
    required this.denomination,
    required this.quantity,
  });
  
  double get total => denomination * quantity;
}

class CaisseSession {
  final String id;
  final String userId;
  final DateTime startTime;
  DateTime? endTime;
  final Map<double, int> initialCash;
  final Map<double, int> currentCash;
  final List<CaisseTransaction> transactions;
  final String currency;
  
  CaisseSession({
    required this.id,
    required this.userId,
    required this.startTime,
    required this.initialCash,
    required this.currency,
    Map<double, int>? currentCash,
    List<CaisseTransaction>? transactions,
  }) : currentCash = currentCash ?? Map.from(initialCash),
       transactions = transactions ?? [];

  double get totalInitial => _calculateTotal(initialCash);
  double get totalCurrent => _calculateTotal(currentCash);
  
  double _calculateTotal(Map<double, int> cash) {
    return cash.entries.fold(0.0, 
      (sum, entry) => sum + (entry.key * entry.value)
    );
  }
}

class CaisseTransaction {
  final String id;
  final String clientId;
  final double amount;
  final DateTime timestamp;
  final List<String> paymentMethod; // 'cash', 'card', 'mobile'
  final Map<double, int>? cashGiven; // Pour le rendu de monnaie
  
  CaisseTransaction({
    required this.id,
    required this.clientId,
    required this.amount,
    required this.timestamp,
    required this.paymentMethod,
    this.cashGiven,
  });
}