// lib/features/caisse/models/caisse_session.dart

import 'package:nsp_pos_mobile/features/caisse/viewmodel/payment_method_model.dart';
import 'caisse_transaction.dart';

class CaisseSession {
  final int id;
  final int userId;
  final DateTime startTime;
  final DateTime? endTime;
  final Map<int, int> initialCash;
  Map<int, int>? currentCash;
  List<CaisseTransaction> transactions;
  final String currency;
  final int? storeId;
  final Map<int, double> _totalsByPaymentMethod = {};

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
      _totalsByPaymentMethod.addAll(initialTotals);
    }
    // Initialiser currentCash avec initialCash si null
    currentCash ??= Map<int, int>.from(initialCash);
    // Recalculer les totaux à partir des transactions existantes
    // CORRECTION: Utiliser 'this.transactions' au lieu de 'transactions'
    for (var transaction in this.transactions) {
      _addTransactionTotals(transaction);
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  /// Solde en espèces (méthode de paiement ID = 1)
  double get cashBalance => _totalsByPaymentMethod[1] ?? 0;

  /// Totaux par méthode de paiement (lecture seule)
  Map<int, double> get totalsByPaymentMethod =>
      Map.unmodifiable(_totalsByPaymentMethod);

  /// Total encaissé (tous moyens de paiement confondus)
  double get totalCollected {
    return _totalsByPaymentMethod.values.fold(0, (sum, value) => sum + value);
  }

  /// Fonds actuel de la caisse = fonds initial + encaissements en espèces
  double get totalCurrent {
    return totalInitial + cashBalance;
  }

  /// Montant total du fonds initial
  double get totalInitial {
    double total = 0;
    initialCash.forEach((denom, qty) => total += denom * qty);
    return total;
  }

  /// Montant total du billetage actuel
  double get totalCurrentCash {
    if (currentCash == null) return 0;
    double total = 0;
    currentCash!.forEach((denom, qty) => total += denom * qty);
    return total;
  }

  /// Total des ventes (somme de toutes les transactions)
  double get totalSales {
    double total = 0;
    for (var tx in transactions) {
      total += tx.amount;
    }
    return total;
  }

  /// Nombre de transactions
  int get transactionCount => transactions.length;

  // ============================================================================
  // MÉTHODES PUBLIQUES
  // ============================================================================

  /// Obtenir le total pour une méthode de paiement spécifique
  double getTotalForPaymentMethod(int methodId) {
    return _totalsByPaymentMethod[methodId] ?? 0;
  }

  /// Ajouter une transaction à la session
  void addTransaction(CaisseTransaction transaction) {
    transactions.add(transaction);
    _addTransactionTotals(transaction);
  }

  /// Mettre à jour le billetage après un paiement en espèces
  void updateCurrentCashForCashPayment(double amount) {
    if (currentCash == null) {
      currentCash = Map<int, int>.from(initialCash);
    }

    final breakdown = _breakdownAmount(amount);
    final currentCashNonNull = currentCash!;
    for (var entry in breakdown.entries) {
      final denomination = entry.key;
      final count = entry.value;
      currentCashNonNull[denomination] = (currentCashNonNull[denomination] ?? 0) + count;
    }
  }

  /// Mettre à jour le billetage après un rendu de monnaie
  void updateCurrentCashForChange(double amount) {
    if (currentCash == null) {
      currentCash = Map<int, int>.from(initialCash);
    }

    final breakdown = _breakdownAmount(amount);
    final currentCashNonNull = currentCash!;
    
    for (var entry in breakdown.entries) {
      final denomination = entry.key;
      final count = entry.value;
      final currentCount = currentCashNonNull[denomination] ?? 0;
      if (currentCount >= count) {
        currentCashNonNull[denomination] = currentCount - count;
      } else {
        _handleInsufficientChange(denomination, count);
      }
    }
  }

  /// Obtenir le récapitulatif pour la clôture
  Map<String, double> getClosureSummary(List<PaymentMethod> paymentMethods) {
    final summary = <String, double>{};
    for (var method in paymentMethods) {
      final amount = _totalsByPaymentMethod[method.id] ?? 0;
      if (amount > 0) {
        summary[method.name] = amount;
      }
    }
    return summary;
  }

  /// Formater une date en heure:minute
  String formatTime(DateTime date) {
    return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  /// Convertir en JSON
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
      'totals_by_payment_method': _totalsByPaymentMethod.map(
        (k, v) => MapEntry(k.toString(), v),
      ),
    };
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /// Ajouter les totaux d'une transaction au suivi des paiements
  void _addTransactionTotals(CaisseTransaction transaction) {
    if (transaction.paymentBreakdown.isNotEmpty) {
      for (var entry in transaction.paymentBreakdown.entries) {
        final methodId = entry.key;
        final amount = entry.value;
        _totalsByPaymentMethod[methodId] =
            (_totalsByPaymentMethod[methodId] ?? 0) + amount;
      }
    } else {
      // Fallback pour les anciennes transactions sans breakdown
      for (var methodIdStr in transaction.paymentMethod) {
        final methodId = int.tryParse(methodIdStr) ?? 0;
        if (methodId > 0) {
          _totalsByPaymentMethod[methodId] =
              (_totalsByPaymentMethod[methodId] ?? 0) + transaction.amount;
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