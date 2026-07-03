import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:provider/provider.dart';

class PaymentModal extends StatefulWidget {
  final double total;
  final Function(List<Map<String, dynamic>>) onConfirm;
  const PaymentModal({super.key, required this.total, required this.onConfirm});

  @override
  State<PaymentModal> createState() => PaymentModalState();
}

class PaymentModalState extends State<PaymentModal> {
  final List<Map<String, dynamic>> _payments = [];
  final Map<int, TextEditingController> _amountControllers = {};
  final Map<int, FocusNode> _amountFocusNodes = {};
  final Map<int, TextEditingController> _referenceControllers = {};
  final Map<int, bool> _showReference = {};

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    for (var method in provider.paymentMethods) {
      _amountControllers[method.id] = TextEditingController();
      _amountFocusNodes[method.id] = FocusNode();
      _referenceControllers[method.id] = TextEditingController();
      _showReference[method.id] = false;
    }
  }

  @override
  void dispose() {
    for (var controller in _amountControllers.values) {
      controller.dispose();
    }
    for (var controller in _referenceControllers.values) {
      controller.dispose();
    }
    for (var node in _amountFocusNodes.values) {
      node.dispose();
    }
    super.dispose();
  }

  double get _totalPaid =>
      _payments.fold(0, (s, p) => s + (p['amount'] as double));
  double get _remaining => widget.total - _totalPaid;
  double get _change =>
      _totalPaid > widget.total ? _totalPaid - widget.total : 0;

  IconData _getIconForMethod(String name) {
    switch (name.toLowerCase()) {
      case 'espèces':
        return Icons.money;
      case 'carte bancaire':
        return Icons.credit_card;
      case 'wave':
        return Icons.phone_android;
      case 'orange money':
        return Icons.phone_android;
      case 'moov money':
        return Icons.phone_android;
      case 'virement bancaire':
        return Icons.account_balance;
      default:
        return Icons.payment;
    }
  }

  Color _getColorForMethod(String name) {
    switch (name.toLowerCase()) {
      case 'espèces':
        return Colors.green;
      case 'carte bancaire':
        return Colors.blue;
      case 'wave':
        return Colors.purple;
      case 'orange money':
        return Colors.orange;
      case 'moov money':
        return Colors.teal;
      case 'virement bancaire':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  void _updatePayment(int methodId, double amount, {String? reference}) {
    setState(() {
      final index = _payments.indexWhere((p) => p['methodId'] == methodId);
      if (index != -1) {
        if (amount <= 0) {
          _payments.removeAt(index);
        } else {
          _payments[index]['amount'] = amount;
          if (reference != null && reference.isNotEmpty) {
            _payments[index]['reference'] = reference;
          } else {
            _payments[index].remove('reference');
          }
        }
      } else if (amount > 0) {
        final payment = <String, dynamic>{
          'methodId': methodId,
          'amount': amount,
        };
        if (reference != null && reference.isNotEmpty) {
          payment['reference'] = reference;
        }
        _payments.add(payment);
      }
    });
  }

  void _toggleReference(int methodId) {
    setState(() {
      _showReference[methodId] = !(_showReference[methodId] ?? false);
      if (!_showReference[methodId]!) {
        _referenceControllers[methodId]?.clear();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CaisseProvider>(
      builder: (context, provider, child) {
        return Container(
          padding: const EdgeInsets.all(20),
          height: MediaQuery.of(context).size.height * 0.85,
          child: Column(
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Paiement',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 28),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Résumé
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Total',
                          style: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        Text(
                          FormatUtils.formatCurrency(widget.total, 'FCFA'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'Reste',
                          style: TextStyle(fontSize: 13, color: Colors.grey),
                        ),
                        Text(
                          FormatUtils.formatCurrency(_remaining, 'FCFA'),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _remaining <= 0 ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                    if (_change > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Rendue: ${FormatUtils.formatCurrency(_change, "FCFA")}',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.green[700],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Liste des moyens de paiement
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: provider.paymentMethods.length,
                  itemBuilder: (context, index) {
                    final method = provider.paymentMethods[index];
                    final currentPayment = _payments.firstWhere(
                      (p) => p['methodId'] == method.id,
                      orElse: () => {'amount': 0.0},
                    );
                    final currentAmount = currentPayment['amount'] as double;
                    final showRef = _showReference[method.id] ?? false;
                    final hasReference = method.requiresReference;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: currentAmount > 0
                            ? _getColorForMethod(method.name).withAlpha(12)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: currentAmount > 0
                              ? _getColorForMethod(method.name)
                              : Colors.grey[200]!,
                          width: currentAmount > 0 ? 2 : 0.5,
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              // Icône
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: _getColorForMethod(method.name)
                                      .withAlpha(15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Icon(
                                  _getIconForMethod(method.name),
                                  color: _getColorForMethod(method.name),
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 12),
                              // Nom
                              Expanded(
                                flex: 2,
                                child: Text(
                                  method.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              // Champ montant
                              SizedBox(
                                width: 160,
                                child: TextField(
                                  controller: _amountControllers[method.id],
                                  focusNode: _amountFocusNodes[method.id],
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: '0',
                                    hintStyle: TextStyle(
                                      fontSize: 16,
                                      color: Colors.grey[400],
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(6),
                                      borderSide: BorderSide(
                                        color: Colors.grey[300]!,
                                      ),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(6),
                                      borderSide: BorderSide(
                                        color: const Color.fromARGB(255, 37, 36, 36),
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(6),
                                      borderSide: BorderSide(
                                        color: _getColorForMethod(method.name),
                                        width: 2,
                                      ),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 10,
                                    ),
                                    isDense: true,
                                  ),
                                  onChanged: (value) {
                                    final amount = double.tryParse(value) ?? 0;
                                    if (hasReference) {
                                      final ref = _referenceControllers[method.id]?.text ?? '';
                                      _updatePayment(method.id, amount, reference: ref);
                                    } else {
                                      _updatePayment(method.id, amount);
                                    }
                                  },
                                ),
                              ),
                              // Bouton référence (si requis)
                              if (hasReference)
                                IconButton(
                                  icon: Icon(
                                    showRef ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                    size: 24,
                                    color: showRef ? Colors.blue : Colors.grey,
                                  ),
                                  onPressed: () => _toggleReference(method.id),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  splashRadius: 20,
                                ),
                            ],
                          ),
                          // Référence (expandable)
                          if (hasReference && showRef) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                const SizedBox(width: 48),
                                Expanded(
                                  child: TextField(
                                    controller: _referenceControllers[method.id],
                                    style: const TextStyle(fontSize: 15),
                                    decoration: InputDecoration(
                                      hintText: 'Numéro de transaction...',
                                      hintStyle: TextStyle(
                                        fontSize: 14,
                                        color: Colors.grey[400],
                                      ),
                                      prefixIcon: const Icon(
                                        Icons.receipt,
                                        size: 18,
                                        color: Colors.grey,
                                      ),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(6),
                                        borderSide: BorderSide(
                                          color: Colors.grey[200]!,
                                        ),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(6),
                                        borderSide: BorderSide(
                                          color: Colors.grey[200]!,
                                        ),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(6),
                                        borderSide: const BorderSide(
                                          color: Colors.blue,
                                          width: 2,
                                        ),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 10,
                                      ),
                                      isDense: true,
                                    ),
                                    onChanged: (value) {
                                      final amount = double.tryParse(
                                            _amountControllers[method.id]?.text ?? '0',
                                          ) ??
                                          0;
                                      if (amount > 0) {
                                        _updatePayment(method.id, amount, reference: value);
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ],
                          // Montant payé
                          if (currentAmount > 0)
                            Container(
                              alignment: Alignment.centerRight,
                              margin: const EdgeInsets.only(top: 2),
                              child: Text(
                                '✓ ${FormatUtils.formatCurrency(currentAmount, "FCFA")}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: _getColorForMethod(method.name),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 12),

              // Bouton Valider
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _remaining <= 0
                      ? () {
                          final missingReferences = <String>[];
                          for (var payment in _payments) {
                            final methodId = payment['methodId'] as int;
                            final method = provider.paymentMethods
                                .firstWhere((m) => m.id == methodId);
                            if (method.requiresReference &&
                                (payment['reference'] == null ||
                                    payment['reference'].toString().isEmpty)) {
                              missingReferences.add(method.name);
                            }
                          }

                          if (missingReferences.isNotEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Référence requise pour: ${missingReferences.join(", ")}',
                                ),
                                backgroundColor: Colors.orange,
                              ),
                            );
                            return;
                          }

                          widget.onConfirm(_payments);
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _remaining <= 0 ? Colors.green : Colors.grey[300],
                    foregroundColor: _remaining <= 0 ? Colors.white : Colors.grey[600],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    minimumSize: const Size(double.infinity, 52),
                  ),
                  child: Text(
                    _remaining <= 0
                        ? 'Valider le paiement'
                        : 'Reste ${FormatUtils.formatCurrency(_remaining, "FCFA")}',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}