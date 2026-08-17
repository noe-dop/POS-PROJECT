import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/features/customers/viewmodel/card_model.dart';
import 'package:nsp_pos_mobile/features/payment/view/online_payment_screen.dart';
import 'package:provider/provider.dart';

class PaymentModal extends StatefulWidget {
  final double total;
  final Function(List<Map<String, dynamic>>) onConfirm;
  final GlobalKey<ScaffoldMessengerState>? scaffoldMessengerKey;

  const PaymentModal({
    super.key,
    required this.total,
    required this.onConfirm,
    this.scaffoldMessengerKey,
  });

  @override
  State<PaymentModal> createState() => _PaymentModalState();
}

class _PaymentModalState extends State<PaymentModal> {
  final List<Map<String, dynamic>> _payments = [];
  final Map<int, TextEditingController> _amountControllers = {};
  final Map<int, FocusNode> _amountFocusNodes = {};
  final Map<int, TextEditingController> _referenceControllers = {};
  final Map<int, bool> _showReference = {};
  final Map<int, int?> _selectedCardByMethod = {};
  List<CardModel> _customerCards = [];

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    for (var method in provider.paymentMethods) {
      _amountControllers[method.id] = TextEditingController();
      _amountFocusNodes[method.id] = FocusNode();
      _referenceControllers[method.id] = TextEditingController();
      _showReference[method.id] = false;
      _selectedCardByMethod[method.id] = null;
    }
  }

  @override
  void dispose() {
    for (var c in _amountControllers.values) c.dispose();
    for (var c in _referenceControllers.values) c.dispose();
    for (var n in _amountFocusNodes.values) n.dispose();
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

  // Dans PaymentModal, ajouter un moyen "Paiement en ligne"

  void _proceedToOnlinePayment() async {
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final session = provider.currentSession;
    if (session == null || session.cart.isEmpty) {
      widget.scaffoldMessengerKey?.currentState?.showSnackBar(
        SnackBar(
          content: Text('Panier vide'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final customerId = session.customerId;
    if (customerId == null) {
      widget.scaffoldMessengerKey?.currentState?.showSnackBar(
        SnackBar(
          content: Text('Veuillez sélectionner un client'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => OnlinePaymentScreen(
          amount: session.total,
          customerId: customerId,
          saleId: session.cashSessionId, // ou créer une vente en attente
          paymentMethod: 'CARD',
        ),
      ),
    );

    if (result != null && result['status'] == 'success') {
      // Paiement réussi : vider le panier
      session.clearCart();
      widget.scaffoldMessengerKey?.currentState?.showSnackBar(
        SnackBar(
          content: Text('Paiement effectué avec succès'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _updatePayment(
    int methodId,
    double amount, {
    String? reference,
    int? cardId,
  }) {
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
          if (cardId != null) {
            _payments[index]['card'] = cardId;
          } else {
            _payments[index].remove('card');
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
        if (cardId != null) {
          payment['card'] = cardId;
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
        final session = provider.currentSession;
        if (session == null) return const SizedBox.shrink();

        final customerData = session.customerData;
        final isRealCustomer =
            customerData != null && !session.clientName.startsWith('Client ');
        final customerCards = session.cards ?? [];
        final canUseCardPayment = isRealCustomer && customerCards.isNotEmpty;

        if (canUseCardPayment) {
          final cardMethod = provider.paymentMethods.firstWhere(
            (m) => m.code == 'carte_eboutik',
            orElse: () => throw Exception('Méthode carte eboutik introuvable'),
          );
          if (_selectedCardByMethod[cardMethod.id] == null) {
            _selectedCardByMethod[cardMethod.id] = customerCards.first.id;
          }
        }

        // Filtrer et trier : Espèces en premier
        var displayedMethods = provider.paymentMethods.where((method) {
          if (method.code == 'carte_eboutik' && !canUseCardPayment)
            return false;
          return true;
        }).toList();

        displayedMethods.sort((a, b) {
          if (a.code == 'cash') return -1;
          if (b.code == 'cash') return 1;
          return 0;
        });

        _customerCards = customerCards;

        // Hauteur totale réduite : on utilise tout l'espace disponible
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // Header (plus compact)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Paiement',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  if (isRealCustomer)
                    Text(
                      'Client : ${session.clientName}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 24),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Résumé (plus compact)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Total',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        Text(
                          FormatUtils.formatCurrency(widget.total, 'FCFA'),
                          style: const TextStyle(
                            fontSize: 16,
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
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        Text(
                          FormatUtils.formatCurrency(_remaining, 'FCFA'),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _remaining <= 0 ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                    if (_change > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.green[100],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Rendue: ${FormatUtils.formatCurrency(_change, "FCFA")}',
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.green[700],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              // Liste des moyens de paiement (prend tout l'espace restant)
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayedMethods.length,
                  itemBuilder: (context, index) {
                    final method = displayedMethods[index];
                    final currentPayment = _payments.firstWhere(
                      (p) => p['methodId'] == method.id,
                      orElse: () => {'amount': 0.0},
                    );
                    final currentAmount = currentPayment['amount'] as double;
                    final showRef = _showReference[method.id] ?? false;
                    final hasReference = method.requiresReference;
                    final isCardPayment = method.code == 'carte_eboutik';

                    final selectedCardId = _selectedCardByMethod[method.id];
                    final selectedCard = customerCards.firstWhere(
                      (c) => c.id == selectedCardId,
                      orElse: () => customerCards.isNotEmpty
                          ? customerCards.first
                          : CardModel(
                              id: 0,
                              cardNumber: '',
                              balance: 0,
                              typeCardId: 0,
                              typeCardName: '',
                              maxCredit: 0,
                              plafond: 0,
                            ),
                    );

                    return Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: currentAmount > 0
                            ? _getColorForMethod(method.name).withAlpha(12)
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: currentAmount > 0
                              ? _getColorForMethod(method.name)
                              : Colors.grey[200]!,
                          width: currentAmount > 0 ? 2 : 0.5,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Ligne principale (icône, nom, champ montant, bouton référence)
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Icône (fixe)
                              Container(
                                width: 30,
                                height: 30,
                                decoration: BoxDecoration(
                                  color: _getColorForMethod(
                                    method.name,
                                  ).withAlpha(15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Icon(
                                  _getIconForMethod(method.name),
                                  color: _getColorForMethod(method.name),
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Nom + info carte (si carte)
                              Expanded(
                                flex: 3,
                                child: isCardPayment
                                    ? Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            method.name,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 16,
                                            ),
                                          ),
                                          Text(
                                            '${FormatUtils.maskCardNumber(selectedCard.cardNumber)} (${FormatUtils.formatCurrency(selectedCard.balance, "FCFA")})',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: Colors.grey[600],
                                            ),
                                          ),
                                        ],
                                      )
                                    : Text(
                                        method.name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 16,
                                        ),
                                      ),
                              ),

                              // Champ montant (fixe)
                              SizedBox(
                                width: 130,
                                child: TextField(
                                  controller: _amountControllers[method.id],
                                  focusNode: _amountFocusNodes[method.id],
                                  keyboardType: TextInputType.number,
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  decoration: InputDecoration(
                                    hintText: '0',
                                    hintStyle: TextStyle(
                                      fontSize: 13,
                                      color: Colors.grey[400],
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(4),
                                      borderSide: BorderSide(
                                        color: Colors.grey[300]!,
                                      ),
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(4),
                                      borderSide: const BorderSide(
                                        color: Color.fromARGB(255, 37, 36, 36),
                                      ),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(4),
                                      borderSide: BorderSide(
                                        color: _getColorForMethod(method.name),
                                        width: 2,
                                      ),
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 10,
                                    ),
                                    isDense: true,
                                  ),
                                  onChanged: (value) {
                                    final amount = double.tryParse(value) ?? 0;
                                    final cardId = isCardPayment
                                        ? _selectedCardByMethod[method.id]
                                        : null;
                                    final ref =
                                        _referenceControllers[method.id]
                                            ?.text ??
                                        '';
                                    _updatePayment(
                                      method.id,
                                      amount,
                                      reference: ref,
                                      cardId: cardId,
                                    );
                                  },
                                ),
                              ),

                              // Bouton référence (si requis)
                              if (hasReference)
                                IconButton(
                                  icon: Icon(
                                    showRef
                                        ? Icons.keyboard_arrow_up
                                        : Icons.keyboard_arrow_down,
                                    size: 20,
                                    color: showRef ? Colors.blue : Colors.grey,
                                  ),
                                  onPressed: () => _toggleReference(method.id),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                  splashRadius: 16,
                                ),
                            ],
                          ),

                          // Dropdown pour changer de carte (si plusieurs cartes)
                          if (isCardPayment && customerCards.length > 1)
                            Padding(
                              padding: const EdgeInsets.only(top: 4, left: 38),
                              child: DropdownButtonFormField<int>(
                                initialValue: _selectedCardByMethod[method.id],
                                hint: const Text(
                                  'Changer de carte',
                                  style: TextStyle(fontSize: 12),
                                ),
                                items: customerCards.map((card) {
                                  return DropdownMenuItem<int>(
                                    value: card.id,
                                    child: Text(
                                      '${FormatUtils.maskCardNumber(card.cardNumber)} (${FormatUtils.formatCurrency(card.balance, "FCFA")})',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  );
                                }).toList(),
                                onChanged: (cardId) {
                                  setState(() {
                                    _selectedCardByMethod[method.id] = cardId;
                                  });
                                  final currentAmount =
                                      double.tryParse(
                                        _amountControllers[method.id]?.text ??
                                            '0',
                                      ) ??
                                      0;
                                  if (currentAmount > 0) {
                                    final ref =
                                        _referenceControllers[method.id]
                                            ?.text ??
                                        '';
                                    _updatePayment(
                                      method.id,
                                      currentAmount,
                                      reference: ref,
                                      cardId: cardId,
                                    );
                                  }
                                },
                                decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  isDense: true,
                                ),
                              ),
                            ),

                          // Référence (expandable)
                          if (hasReference && showRef) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const SizedBox(width: 38),
                                Expanded(
                                  child: TextField(
                                    controller:
                                        _referenceControllers[method.id],
                                    style: const TextStyle(fontSize: 13),
                                    decoration: InputDecoration(
                                      hintText: 'Numéro de transaction...',
                                      hintStyle: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[400],
                                      ),
                                      prefixIcon: const Icon(
                                        Icons.receipt,
                                        size: 16,
                                        color: Colors.grey,
                                      ),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(4),
                                        borderSide: BorderSide(
                                          color: Colors.grey[200]!,
                                        ),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(4),
                                        borderSide: BorderSide(
                                          color: Colors.grey[200]!,
                                        ),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(4),
                                        borderSide: const BorderSide(
                                          color: Colors.blue,
                                          width: 2,
                                        ),
                                      ),
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                            horizontal: 8,
                                            vertical: 6,
                                          ),
                                      isDense: true,
                                    ),
                                    onChanged: (value) {
                                      final amount =
                                          double.tryParse(
                                            _amountControllers[method.id]
                                                    ?.text ??
                                                '0',
                                          ) ??
                                          0;
                                      if (amount > 0) {
                                        final cardId = isCardPayment
                                            ? _selectedCardByMethod[method.id]
                                            : null;
                                        _updatePayment(
                                          method.id,
                                          amount,
                                          reference: value,
                                          cardId: cardId,
                                        );
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ],

                          // Indicateur de montant payé
                          if (currentAmount > 0)
                            Container(
                              alignment: Alignment.centerRight,
                              margin: const EdgeInsets.only(top: 2),
                              child: Text(
                                '✓ ${FormatUtils.formatCurrency(currentAmount, "FCFA")}',
                                style: TextStyle(
                                  fontSize: 11,
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

              // Bouton Valider (plus compact)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _remaining <= 0
                      ? () {
                          // --- Vérification des dépassements non autorisés ---
                          final allowedOverpaymentCodes = [
                            'cash',
                            'especes',
                            'espèces',
                          ];
                          final totalNonAutorise = _payments
                              .where((p) {
                                final methodId = p['methodId'] as int;
                                final method = provider.paymentMethods
                                    .firstWhere((m) => m.id == methodId);
                                return !allowedOverpaymentCodes.contains(
                                  method.code,
                                );
                              })
                              .fold(
                                0.0,
                                (sum, p) => sum + (p['amount'] as double),
                              );

                          if (totalNonAutorise > widget.total) {
                            widget.scaffoldMessengerKey?.currentState?.showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Les paiements par carte, Wave, etc. ne peuvent pas dépasser le total de la vente.',
                                ),
                                backgroundColor: Colors.red,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );

                            return;
                          }

                          // --- Vérification des références (existante) ---
                          final missingReferences = <String>[];
                          for (var payment in _payments) {
                            final methodId = payment['methodId'] as int;
                            final method = provider.paymentMethods.firstWhere(
                              (m) => m.id == methodId,
                            );
                            if (method.requiresReference &&
                                (payment['reference'] == null ||
                                    payment['reference'].toString().isEmpty)) {
                              missingReferences.add(method.name);
                            }
                          }
                          if (missingReferences.isNotEmpty) {
                            widget.scaffoldMessengerKey?.currentState?.showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Référence requise pour: ${missingReferences.join(", ")}',
                                ),
                                backgroundColor: Colors.orange,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                            return;
                          }

                          // --- Tout est bon ---
                          widget.onConfirm(_payments);
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _remaining <= 0
                        ? Colors.green
                        : Colors.grey[300],
                    foregroundColor: _remaining <= 0
                        ? Colors.white
                        : Colors.grey[600],
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    minimumSize: const Size(double.infinity, 40),
                  ),
                  child: Text(
                    _remaining <= 0
                        ? 'Valider le paiement'
                        : 'Reste ${FormatUtils.formatCurrency(_remaining, "FCFA")}',
                    style: const TextStyle(
                      fontSize: 15,
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
