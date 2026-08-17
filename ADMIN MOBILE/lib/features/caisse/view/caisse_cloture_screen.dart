import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_session_model.dart';
import 'package:nsp_pos_mobile/core/config/currency_config.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/payment_method_model.dart';

class CaisseClotureScreen extends StatefulWidget {
  const CaisseClotureScreen({super.key});

  @override
  State<CaisseClotureScreen> createState() => _CaisseClotureScreenState();
}

class _CaisseClotureScreenState extends State<CaisseClotureScreen> {
  bool _isClosing = false;
  bool _isLoading = true;
  CaisseSession? _session;
  List<PaymentMethod> _paymentMethods = [];
  double _totalSalesAmount = 0;
  int _totalTransactions = 0;
  Map<String, double> _paymentBreakdown = {};

  final Map<int, TextEditingController> _finalCashControllers = {};
  double _finalTotalAmount = 0.0;
  final String _selectedCurrency = 'FCFA';
  bool _hasDeficit = false;
  bool _hasExcess = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _initializeFinalCashControllers() {
    final config = CurrencyConfig.currencies[_selectedCurrency]!;
    for (var denom in config.banknotes) {
      _finalCashControllers[denom] = TextEditingController(text: '0')
        ..addListener(_calculateFinalTotal);
    }
    for (var coin in config.coins) {
      _finalCashControllers[coin] = TextEditingController(text: '0')
        ..addListener(_calculateFinalTotal);
    }
  }

  @override
  void dispose() {
    for (var controller in _finalCashControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<CaisseProvider>(context, listen: false);

    setState(() {
      _session = provider.session;
      _paymentMethods = provider.paymentMethods;
      _isLoading = false;
    });

    if (_session != null) {
      _initializeFinalCashControllers();
      await _calculatePaymentBreakdown();
      _presetFinalCashFromCurrent();
    }
  }

  void _calculateFinalTotal() {
    double total = 0.0;
    _finalCashControllers.forEach((denom, ctrl) {
      final qty = int.tryParse(ctrl.text) ?? 0;
      total += denom * qty;
    });
    setState(() {
      _finalTotalAmount = total;
      if (_session != null) {
        _hasDeficit = total < _session!.expectedCashBalance;
        _hasExcess = total > _session!.expectedCashBalance;
      }
    });
  }

  Map<int, int> _getFinalCashCount() {
    final Map<int, int> cashCount = {};
    _finalCashControllers.forEach((denom, ctrl) {
      final qty = int.tryParse(ctrl.text) ?? 0;
      if (qty > 0) cashCount[denom] = qty;
    });
    return cashCount;
  }

  void _presetFinalCashFromCurrent() {
    if (_session == null) return;
    double remaining = _session!.expectedCashBalance;
    final config = CurrencyConfig.currencies[_selectedCurrency]!;

    for (var denom in config.banknotes) {
      _finalCashControllers[denom]?.text = '0';
    }
    for (var coin in config.coins) {
      _finalCashControllers[coin]?.text = '0';
    }

    for (var denom in config.banknotes) {
      if (remaining >= denom) {
        final qty = (remaining / denom).floor();
        _finalCashControllers[denom]?.text = qty.toString();
        remaining -= qty * denom;
      }
    }

    for (var coin in config.coins) {
      if (remaining >= coin) {
        final qty = (remaining / coin).floor();
        _finalCashControllers[coin]?.text = qty.toString();
        remaining -= qty * coin;
      }
    }
  }

  Future<void> _calculatePaymentBreakdown() async {
    if (_session == null) return;

    final transactions = _session!.transactions;
    _totalTransactions = transactions.length;

    final Map<String, double> breakdown = {};
    double totalAmount = 0;

    for (var transaction in transactions) {
      totalAmount += transaction.amount;

      if (transaction.paymentBreakdown.isNotEmpty) {
        for (var entry in transaction.paymentBreakdown.entries) {
          final method = _paymentMethods.firstWhere(
            (m) => m.id == entry.key,
            orElse: () => PaymentMethod(
              id: entry.key,
              code: 'unknown',
              name: 'Méthode ${entry.key}',
              isActive: true,
              requiresReference: false,
              feePercentage: 0,
            ),
          );
          breakdown[method.name] = (breakdown[method.name] ?? 0) + entry.value;
        }
      } else {
        for (var methodIdStr in transaction.paymentMethod) {
          final methodId = int.tryParse(methodIdStr) ?? 0;
          final method = _paymentMethods.firstWhere(
            (m) => m.id == methodId,
            orElse: () => PaymentMethod(
              id: methodId,
              code: 'unknown',
              name: 'Méthode $methodId',
              isActive: true,
              requiresReference: false,
              feePercentage: 0,
            ),
          );
          breakdown[method.name] =
              (breakdown[method.name] ?? 0) + transaction.amount;
        }
      }
    }

    _totalSalesAmount = totalAmount;
    _paymentBreakdown = breakdown;
    setState(() {});
  }

  Future<void> _closeCashRegister() async {
    if (_session == null) return;

    if (_hasDeficit) {
      final deficit = _session!.expectedCashBalance - _finalTotalAmount;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'DÉFICIT DÉTECTÉ : ${deficit.toStringAsFixed(0)} ${_session!.currency} manquant(s).\n'
            'La clôture est impossible. Vérifiez le fond de caisse.',
          ),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
      return;
    }

    if (_hasExcess) {
      final excess = _finalTotalAmount - _session!.expectedCashBalance;
      final confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('⚠️ Excédent détecté'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Un excédent de ${excess.toStringAsFixed(0)} ${_session!.currency} a été constaté.',
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Causes possibles :',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const Text('• Erreur de rendu de monnaie'),
              const Text('• Client ayant oublié sa monnaie'),
              const Text('• Erreur de saisie'),
              const SizedBox(height: 8),
              const Text(
                'Voulez-vous continuer la clôture ?',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('ANNULER'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.orange),
              child: const Text('CONTINUER'),
            ),
          ],
        ),
      );

      if (confirm != true) return;
    }

    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final finalCash = _getFinalCashCount();

    setState(() => _isClosing = true);

    try {
      final result = await provider.closeMainCaisse(
        finalCash: finalCash,
        finalTotal: _finalTotalAmount,
      );

      if (result['success'] == true && mounted) {
        Navigator.pushReplacementNamed(
          context,
          '/cashbox/close/report',
          arguments: result['data'],
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de la clôture: ${result['message']}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isClosing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Clôture de caisse')),
        drawer: const SideMenu(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_session == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Clôture de caisse')),
        drawer: const SideMenu(),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.orange),
              SizedBox(height: 16),
              Text('Aucune session de caisse active'),
              SizedBox(height: 8),
              Text('Veuillez ouvrir une caisse avant de clôturer'),
            ],
          ),
        ),
      );
    }

    final config = CurrencyConfig.currencies[_selectedCurrency]!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clôture de caisse'),
        centerTitle: true,
        backgroundColor: const Color(0xFF2E3A59),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      drawer: const SideMenu(),
      body: _isClosing
          ? const Center(child: CircularProgressIndicator())
          : Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.blue.shade50, Colors.white],
                ),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // LIGNE 1 : Récapitulatif
                    _buildSummaryCard(),
                    const SizedBox(height: 8),

                    // LIGNE 2 : Billetage (billets à gauche, pièces à droite)
                    _buildCashCard(config),

                    const SizedBox(height: 8),

                    // Boutons
                    _buildActionButtons(),

                    if (_hasDeficit) ...[
                      const SizedBox(height: 12),
                      _buildDeficitWarning(),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  // ============================================================================
  // LIGNE 1 : RÉCAPITULATIF
  // ============================================================================

  Widget _buildSummaryCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.receipt,
                    color: Colors.blue.shade700,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'Récapitulatif',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Infos générales à gauche, paiements à droite
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Colonne gauche : Infos générales
                Expanded(
                  flex: 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildInfoRow(
                        Icons.calendar_today,
                        'Ouverture',
                        _formatDateTime(_session!.startTime),
                        color: Colors.grey.shade700,
                      ),
                      const Divider(height: 16),
                      _buildInfoRow(
                        Icons.account_balance,
                        'Fond initial',
                        '${_session!.totalInitial.toStringAsFixed(0)} ${_session!.currency}',
                        isBold: true,
                      ),
                      _buildInfoRow(
                        Icons.account_balance_wallet,
                        'Fond attendu',
                        '${_session!.expectedCashBalance.toStringAsFixed(0)} ${_session!.currency}',
                        isBold: true,
                        color: Colors.blue.shade700,
                      ),
                      _buildInfoRow(
                        Icons.money,
                        'Total déclaré',
                        '${_finalTotalAmount.toStringAsFixed(0)} ${_session!.currency}',
                        isBold: true,
                        color: _hasDeficit
                            ? Colors.red
                            : (_hasExcess
                                  ? Colors.orange
                                  : Colors.green.shade700),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: 150,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.green.shade200),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'CA: ',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.green.shade700,
                              ),
                            ),
                            Spacer(),
                            Text(
                              '${_session!.totalSales.toStringAsFixed(0)} ${_session!.currency}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.green.shade700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),

                // Colonne droite : Paiements
                Expanded(
                  flex: 1,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Paiements',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ..._getPaymentSummaryRows(),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================================
  // LIGNE 2 : BILLETAGE (billets à gauche, pièces à droite)
  // ============================================================================

  Widget _buildCashCard(CurrencyConfig config) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.money,
                    color: Colors.green.shade700,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'Billetage final',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: Colors.green.shade700,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _hasDeficit
                        ? Colors.red.shade50
                        : (_hasExcess
                              ? Colors.orange.shade50
                              : Colors.green.shade50),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _hasDeficit
                          ? Colors.red.shade200
                          : (_hasExcess
                                ? Colors.orange.shade200
                                : Colors.green.shade200),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _hasDeficit
                            ? Icons.error
                            : (_hasExcess ? Icons.warning : Icons.check_circle),
                        color: _hasDeficit
                            ? Colors.red.shade700
                            : (_hasExcess
                                  ? Colors.orange.shade700
                                  : Colors.green.shade700),
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _hasDeficit
                            ? 'DÉFICIT'
                            : (_hasExcess ? 'EXCÉDENT' : 'MONTANT EXACT'),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _hasDeficit
                              ? Colors.red.shade700
                              : (_hasExcess
                                    ? Colors.orange.shade700
                                    : Colors.green.shade700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Billets à gauche, Pièces à droite
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Billets',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 6),
                        ...config.banknotes.map(
                          (denom) => _buildDenominationRow(denom),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Pièces',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 6),
                        ...config.coins.map(
                          (denom) => _buildDenominationRow(denom),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const Divider(height: 16),

            // Total déclaré
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total déclaré',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  '${_finalTotalAmount.toStringAsFixed(0)} ${_session!.currency}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: _hasDeficit
                        ? Colors.red
                        : (_hasExcess ? Colors.orange : Colors.green.shade700),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================================
  // BOUTONS
  // ============================================================================

  Widget _buildActionButtons() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.shade200,
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                side: BorderSide(color: Colors.grey.shade300),
              ),
              child: Text(
                'ANNULER',
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton(
              onPressed: _hasDeficit ? null : _closeCashRegister,
              style: ElevatedButton.styleFrom(
                backgroundColor: _hasExcess
                    ? Colors.orange
                    : (_hasDeficit ? Colors.red : Colors.green),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 2,
              ),
              child: Text(
                _hasExcess
                    ? 'CONFIRMER L\'EXCÉDENT'
                    : (_hasDeficit
                          ? 'DÉFICIT - BLOQUÉ'
                          : 'CONFIRMER LA CLÔTURE'),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeficitWarning() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        children: [
          Icon(Icons.error, color: Colors.red.shade700, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'DÉFICIT : ${(_session!.expectedCashBalance - _finalTotalAmount).abs().toStringAsFixed(0)} ${_session!.currency} manquant(s). Vérifiez le fond de caisse.',
              style: TextStyle(
                color: Colors.red.shade700,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================================
  // WIDGETS AIDANTS
  // ============================================================================

  Widget _buildInfoRow(
    IconData icon,
    String label,
    String value, {
    Color? color,
    bool isBold = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade500),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: color ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDenominationRow(int denom) {
    final controller = _finalCashControllers[denom]!;
    final qty = int.tryParse(controller.text) ?? 0;
    final total = denom * qty;
    final config = CurrencyConfig.currencies[_selectedCurrency]!;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              FormatUtils.formatCurrency(denom.toDouble(), config.symbol),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12),
              decoration: InputDecoration(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(4),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(4),
                  borderSide: BorderSide(
                    color: Colors.blue.shade300,
                    width: 1.5,
                  ),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                isDense: true,
              ),
            ),
          ),
          const SizedBox(width: 4),
          Container(
            width: 100,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.blue.shade600, Colors.blue.shade400],
              ),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              FormatUtils.formatCurrency(total.toDouble(), config.symbol),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _getPaymentSummaryRows() {
    if (_paymentBreakdown.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Center(
            child: Text(
              'Aucune transaction',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
            ),
          ),
        ),
      ];
    }

    final methodColors = {
      'Espèces': Colors.green,
      'Carte bancaire': Colors.blue,
      'Wave': Colors.purple,
      'Orange Money': Colors.orange,
      'Moov Money': Colors.teal,
      'Virement bancaire': Colors.amber,
    };

    final sortedMethods = _paymentBreakdown.keys.toList();

    return sortedMethods.map((method) {
      final amount = _paymentBreakdown[method] ?? 0;
      final color = methodColors[method] ?? Colors.grey;

      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                method,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
              ),
            ),
            Text(
              '${amount.toStringAsFixed(0)} ${_session!.currency}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }).toList();
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
