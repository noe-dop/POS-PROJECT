import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:nsp_pos_mobile/core/config/currency_config.dart';
import 'package:provider/provider.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class CaisseInitialisationScreen extends StatefulWidget {
  final List<String> userRoles;
  final int cashRegisterId;
  final int employeeId;

  const CaisseInitialisationScreen({
    super.key,
    required this.userRoles,
    required this.cashRegisterId,
    required this.employeeId,
  });

  @override
  State<CaisseInitialisationScreen> createState() =>
      _CaisseInitialisationScreenState();
}

class _CaisseInitialisationScreenState
    extends State<CaisseInitialisationScreen> {
  final String _selectedCurrency = 'FCFA';
  final Map<int, TextEditingController> _controllers = {};
  double _totalAmount = 0.0;
  bool _isLoadingData = true;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() async {
    final config = CurrencyConfig.currencies[_selectedCurrency]!;
    final provider = Provider.of<CaisseProvider>(context, listen: false);
    final lastBilletage = await provider.getLastClosedBilletage(
      widget.cashRegisterId,
    );
    bool usePrevious = true; // Par défaut, on utilise le dernier billetage
    
    // Initialiser les contrôleurs avec les valeurs
    for (var denom in config.banknotes) {
      String initialValue = '0';
      if (usePrevious && lastBilletage['billetage_final'] != null) {
        final billetage =
            lastBilletage['billetage_final'] as Map<String, dynamic>;
        if (billetage.containsKey(denom.toString())) {
          initialValue = billetage[denom.toString()].toString();
        }
      }
      _controllers[denom] = TextEditingController(text: initialValue)
        ..addListener(_calculateTotal);
    }
    for (var coin in config.coins) {
      String initialValue = '0';
      if (usePrevious && lastBilletage['billetage_final'] != null) {
        final billetage =
            lastBilletage['billetage_final'] as Map<String, dynamic>;
        if (billetage.containsKey(coin.toString())) {
          initialValue = billetage[coin.toString()].toString();
        }
      }
      _controllers[coin] = TextEditingController(text: initialValue)
        ..addListener(_calculateTotal);
    }
    // Recalculer le total
    _calculateTotal();
    if (mounted) setState(() => _isLoadingData = false);
  }

  void _calculateTotal() {
    double total = 0.0;
    _controllers.forEach((denom, ctrl) {
      final qty = int.tryParse(ctrl.text) ?? 0;
      total += denom * qty;
    });
    if (mounted) setState(() => _totalAmount = total);
  }

  Map<int, int> _getCashCount() {
    final Map<int, int> cashCount = {};
    _controllers.forEach((denom, ctrl) {
      final qty = int.tryParse(ctrl.text) ?? 0;
      if (qty > 0) cashCount[denom] = qty;
    });
    return cashCount;
  }

  void _initializeCaisse() async {
    if (_totalAmount == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez saisir au moins un billet ou une pièce'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    try {
      final provider = Provider.of<CaisseProvider>(context, listen: false);
      final success = await provider.initCashSession(
        widget.cashRegisterId,
        widget.employeeId,
        _getCashCount(),
        _selectedCurrency,
      );
      if (success) {
        Navigator.pushReplacementNamed(
          context,
          '/cashbox/operation',
          arguments: {
            'storeId': provider.currentStoreId,
            'employeeId': widget.employeeId,
            'cashRegisterId': widget.cashRegisterId,
          },
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage ?? 'Erreur'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } on Exception catch (e) {
      NotificationService.showError(
        context,
        'Erreur lors de l\'initialisation: $e',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = CurrencyConfig.currencies[_selectedCurrency]!;
    final isLarge = MediaQuery.of(context).size.width > 1000;

    return Scaffold(
      appBar: AppBar(title: const Text('Initialisation de la Caisse')),
      drawer: const SideMenu(),
      body: _isLoadingData
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Card(
                    child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Text(
                      'Déclaration des Fonds',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Saisissez les quantités de chaque billet et pièce',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue[50],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Devise: $_selectedCurrency',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.blue,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (isLarge)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: _buildSection('Billets', config.banknotes)),
                  const SizedBox(width: 20),
                  Expanded(child: _buildSection('Pièces', config.coins)),
                ],
              )
            else
              Column(
                children: [
                  _buildSection('Billets', config.banknotes),
                  const SizedBox(height: 20),
                  _buildSection('Pièces', config.coins),
                ],
              ),
            const SizedBox(height: 40),
            _buildTotalAndActions(config),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<int> denominations) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  title == 'Billets' ? Icons.money : Icons.monetization_on,
                  color: Colors.blue[700],
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[700],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...denominations.map((denom) => _buildDenominationRow(denom)),
          ],
        ),
      ),
    );
  }

  Widget _buildDenominationRow(int denom) {
    final controller = _controllers[denom]!;
    final qty = int.tryParse(controller.text) ?? 0;
    final total = denom * qty;
    final config = CurrencyConfig.currencies[_selectedCurrency]!;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              FormatUtils.formatCurrency(denom.toDouble(), config.symbol),
            ),
          ),
          SizedBox(
            width: 80,
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
              ),
            ),
          ),
          SizedBox(
            width: 120,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: Colors.blue[700],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                FormatUtils.formatCurrency(total.toDouble(), config.symbol),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTotalAndActions(CurrencyConfig config) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Initial:',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                Text(
                  FormatUtils.formatCurrency(_totalAmount, config.symbol),
                  style: const TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(LocaleKeys.commonCancel.tr()),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _initializeCaisse,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                  child: const Text('OUVRIR LA CAISSE'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    for (var c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }
}
