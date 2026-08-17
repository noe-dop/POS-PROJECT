import 'caisse_transaction.dart';

class CaisseSession {
  final int id;
  final int userId;
  final DateTime startTime;
  final DateTime? endTime;
  final Map<int, int> initialCash; // Billetage initial
  Map<int, int>? currentCash; // Billetage final (saisi lors de la clôture)
  List<CaisseTransaction> transactions;
  final String currency;
  final int? storeId;

  // Nouvelles propriétés privées pour les totaux collectés (hors fond initial)
  final Map<int, double> _methodTotals = {}; // méthodeId -> montant collecté
  double _cashCollected = 0.0;

  CaisseSession({
    required this.id,
    required this.userId,
    required this.startTime,
    required this.initialCash,
    required this.currency,
    this.currentCash,
    List<CaisseTransaction>? transactions,
    this.endTime,
    this.storeId,
    Map<int, double>? initialTotals,
  }) : transactions = transactions ?? [] {
    if (initialTotals != null) {
      _methodTotals.addAll(initialTotals);
      _cashCollected = _methodTotals[1] ?? 0.0;
    }
    // Recalculer à partir des transactions existantes
    for (var tx in this.transactions) {
      _addTransactionTotals(tx);
    }
  }

  // ========== GETTERS PRINCIPAUX ==========

  /// Montant total du fond initial (billetage initial)
  double get totalInitial {
    double total = 0;
    initialCash.forEach((denom, qty) => total += denom * qty);
    return total;
  }

  /// Montant total du billetage final (saisi par l'utilisateur)
  double get totalCurrentCash {
    if (currentCash == null) return 0;
    double total = 0;
    currentCash!.forEach((denom, qty) => total += denom * qty);
    return total;
  }

  /// Montant total collecté en espèces (paiements en cash uniquement)
  double get cashCollected => _cashCollected;

  /// Fond attendu en caisse = initial + espèces collectées
  double get expectedCashBalance => totalInitial + cashCollected;

  /// Chiffre d'affaires total (tous moyens de paiement)
  double get totalSales {
    double total = 0;
    for (var tx in transactions) {
      total += tx.amount;
    }
    return total;
  }

  /// Nombre de transactions
  int get transactionCount => transactions.length;

  /// Différence entre le fond déclaré et le fond attendu
  double get difference => totalCurrentCash - expectedCashBalance;

  // ========== MÉTHODES PUBLIQUES ==========

  // Obtenir le montant collecté par méthode (pour l'API)
  double getTotalForPaymentMethod(int methodId) {
    double total = 0;
    for (var tx in transactions) {
      if (tx.paymentBreakdown.isNotEmpty) {
        total += tx.paymentBreakdown[methodId] ?? 0;
      } else {
        // Fallback : si la transaction a une seule méthode, on l'attribue
        if (tx.paymentMethod.length == 1) {
          final id = int.tryParse(tx.paymentMethod.first) ?? 0;
          if (id == methodId) total += tx.amount;
        }
      }
    }
    return total;
  }

  /// Ajouter une transaction (appelé lors de la création d'une vente)
  void addTransaction(CaisseTransaction transaction) {
    transactions.add(transaction);
    _addTransactionTotals(transaction);
  }

  /// Mettre à jour le billetage final après un paiement en espèces (pré‑remplissage)
  void updateCurrentCashForCashPayment(double amount) {
    currentCash ??= Map<int, int>.from(initialCash);
    final breakdown = _breakdownAmount(amount);
    for (var entry in breakdown.entries) {
      final denom = entry.key;
      final count = entry.value;
      currentCash![denom] = (currentCash![denom] ?? 0) + count;
    }
  }

  /// Mettre à jour le billetage final après un rendu de monnaie
  void updateCurrentCashForChange(double amount) {
    currentCash ??= Map<int, int>.from(initialCash);
    final breakdown = _breakdownAmount(amount);
    for (var entry in breakdown.entries) {
      final denom = entry.key;
      final count = entry.value;
      final currentCount = currentCash![denom] ?? 0;
      if (currentCount >= count) {
        currentCash![denom] = currentCount - count;
      } else {
        _handleInsufficientChange(denom, count);
      }
    }
  }

  /// Convertir en JSON (pour sauvegarde)
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'start_time': startTime.toIso8601String(),
      'end_time': endTime?.toIso8601String(),
      'initial_cash': initialCash,
      'current_cash': currentCash,
      'transactions': transactions.map((t) => t.toJson()).toList(),
      'currency': currency,
      'store_id': storeId,
      'totals_by_payment_method': _methodTotals.map(
        (k, v) => MapEntry(k.toString(), v),
      ),
    };
  }

  // ========== MÉTHODES PRIVÉES ==========

  void _addTransactionTotals(CaisseTransaction transaction) {
    if (transaction.paymentBreakdown.isNotEmpty) {
      for (var entry in transaction.paymentBreakdown.entries) {
        final methodId = entry.key;
        final amount = entry.value;
        _methodTotals[methodId] = (_methodTotals[methodId] ?? 0) + amount;
        if (methodId == 1) _cashCollected += amount;
      }
    } else {
      // Fallback : on répartit le montant sur les méthodes indiquées
      for (var methodIdStr in transaction.paymentMethod) {
        final methodId = int.tryParse(methodIdStr) ?? 0;
        if (methodId > 0) {
          // On suppose que le montant est réparti également si plusieurs méthodes
          final share = transaction.amount / transaction.paymentMethod.length;
          _methodTotals[methodId] = (_methodTotals[methodId] ?? 0) + share;
          if (methodId == 1) _cashCollected += share;
        }
      }
    }
  }

  /// Décomposer un montant en billets/pièces (optimisé pour FCFA)
  Map<int, int> _breakdownAmount(double amount) {
    final denominations = [
      10000,
      5000,
      2000,
      1000,
      500,
      200,
      100,
      50,
      25,
      10,
      5,
      1,
    ];
    int remaining = amount.toInt();
    final breakdown = <int, int>{};

    for (var denom in denominations) {
      if (remaining >= denom) {
        final count = remaining ~/ denom;
        breakdown[denom] = count;
        remaining -= count * denom;
      }
    }

    return breakdown;
  }

  /// Gérer le cas où on n'a pas assez de petite monnaie
  void _handleInsufficientChange(int denomination, int neededCount) {
    if (currentCash == null) return;

    final currentCashNonNull = currentCash!;
    final largerDenoms = [
      10000,
      5000,
      2000,
      1000,
      500,
      200,
      100,
      50,
      25,
      10,
      5,
    ].where((d) => d > denomination).toList();

    for (var largerDenom in largerDenoms) {
      final availableLarge = currentCashNonNull[largerDenom] ?? 0;
      if (availableLarge > 0) {
        // Prendre un billet plus grand
        currentCashNonNull[largerDenom] = availableLarge - 1;

        // Le rendre en plus petites coupures
        final changeAmount = largerDenom - (denomination * neededCount);
        final changeBreakdown = _breakdownAmount(changeAmount.toDouble());

        for (var entry in changeBreakdown.entries) {
          currentCashNonNull[entry.key] =
              (currentCashNonNull[entry.key] ?? 0) + entry.value;
        }
        return;
      }
    }
  }
}
