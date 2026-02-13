import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/currency_config.dart';
import 'package:nsp_pos_mobile/features/dashboard/widgets/side_menu.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import '../services/caisse_service.dart';

class CaisseInitialisationScreen extends StatefulWidget {
  final List<String> userRoles;

  const CaisseInitialisationScreen({super.key, required this.userRoles});

  @override
  State<CaisseInitialisationScreen> createState() =>
      _CaisseInitialisationScreenState();
}

class _CaisseInitialisationScreenState
    extends State<CaisseInitialisationScreen> {
  final CaisseService _caisseService = CaisseService();
  final String _selectedCurrency = 'FCFA';
  final Map<int, TextEditingController> _controllers = {};
  double _totalAmount = 0.0;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _checkAccess();
  }

  void _checkAccess() {
    if (!widget.userRoles.contains('caissier')) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showAccessError();
      });
    }
  }

  void _showAccessError() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Accès non autorisé'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 2),
      ),
    );

    Future.delayed(const Duration(milliseconds: 500), () {
      Navigator.pop(context);
    });
  }

  void _initializeControllers() {
    final config = CurrencyConfig.currencies[_selectedCurrency]!;

    for (var denomination in config.banknotes) {
      _controllers[denomination] = TextEditingController(text: '0')
        ..addListener(_calculateTotal);
    }

    for (var coin in config.coins) {
      _controllers[coin] = TextEditingController(text: '0')
        ..addListener(_calculateTotal);
    }
  }

  void _calculateTotal() {
    double total = 0.0;

    _controllers.forEach((denomination, controller) {
      final quantity = int.tryParse(controller.text) ?? 0;
      total += denomination * quantity;
    });

    if (mounted) {
      setState(() {
        _totalAmount = total;
      });
    }
  }

  Map<int, int> _getCashCount() {
    final Map<int, int> cashCount = {};

    _controllers.forEach((denomination, controller) {
      final quantity = int.tryParse(controller.text) ?? 0;
      if (quantity > 0) {
        cashCount[denomination] = quantity;
      }
    });

    return cashCount;
  }

  void _initializeCaisse() {
    final cashCount = _getCashCount();

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
      final session = _caisseService.initializeCaisse(
        userId: 'current_user',
        currency: _selectedCurrency,
        initialCash: cashCount,
      );

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Caisse initialisée avec ${FormatUtils.formatCurrency(session.totalInitial, _selectedCurrency)}',
          ),
          backgroundColor: Colors.green,
        ),
      );

      Navigator.pushReplacementNamed(context, '/cashbox/operation');
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildDenominationRow(int denomination) {
    final controller = _controllers[denomination]!;
    final total = (int.tryParse(controller.text) ?? 0) * denomination;
    final config = CurrencyConfig.currencies[_selectedCurrency]!;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 32),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              FormatUtils.formatCurrency(
                denomination.toDouble(),
                config.symbol,
              ),
              style: const TextStyle(fontSize: 18),
            ),
          ),
          const SizedBox(width: 20),
          SizedBox(
            width: 100,
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                constraints: const BoxConstraints(maxWidth: 100),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  vertical: 12,
                  horizontal: 8,
                ),
              ),
            ),
          ),
          const SizedBox(width: 20),
          SizedBox(
            width: 200,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
              decoration: BoxDecoration(
                color: total <= 0 ? const Color(0xFFe8f5fe) : const Color(0xFF1f9ef9),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: const Color(0xFFE0E0E0)),
              ),
              child: Text(
                FormatUtils.formatCurrency(total.toDouble(), config.symbol),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBanknotesSection(CurrencyConfig config) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Titre billets
            Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: Row(
                children: [
                  const Icon(Icons.money, color: Color(0xFF1f9ef9), size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Détail du Billetage',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1f9ef9),
                    ),
                  ),
                ],
              ),
            ),
            
            // Liste des billets
            ...config.banknotes.map(_buildDenominationRow),
          ],
        ),
      ),
    );
  }

  Widget _buildCoinsSection(CurrencyConfig config) {
    if (config.coins.isEmpty) return const SizedBox.shrink();
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Titre pièces
            Padding(
              padding: const EdgeInsets.only(bottom: 16.0),
              child: Row(
                children: [
                  const Icon(Icons.monetization_on, color: Color(0xFF1f9ef9), size: 24),
                  const SizedBox(width: 8),
                  Text(
                    'Détail des Pièces',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1f9ef9),
                    ),
                  ),
                ],
              ),
            ),
            
            // Liste des pièces
            ...config.coins.map(_buildDenominationRow),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.userRoles.contains('caissier')) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erreur')),
        body: const Center(child: Text('Accès non autorisé')),
      );
    }

    final config = CurrencyConfig.currencies[_selectedCurrency]!;
    final screenWidth = MediaQuery.of(context).size.width;
    final isLargeScreen = screenWidth > 1000;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Initialisation de la Caisse'),
        centerTitle: true,
      ),
      drawer: const SideMenu(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Center(
          child: Container(
            constraints: BoxConstraints(
              minWidth: 400,
              maxWidth: 1500
            ),
            child: Column(
              children: [
                // En-tête
                Card(
                  elevation: 3,
                  margin: const EdgeInsets.only(bottom: 20),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        const Text(
                          'Déclaration des Fonds',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        
                        const SizedBox(height: 8),
                        
                        const Text(
                          'Saisissez les quantités de chaque billet et pièce pour initialiser votre caisse',
                          style: TextStyle(color: Colors.grey, fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                        
                        const SizedBox(height: 16),
                        
                        // Indicateur de devise
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue[50],
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFBBDEFB)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.currency_exchange,
                                  color: Colors.blue, size: 20),
                              const SizedBox(width: 8),
                              Text(
                                'Devise: $_selectedCurrency',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blue,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                        
                // Sections billets et pièces côte à côte ou empilées
                if (isLargeScreen)
                  // DISPOSITION SUR GRAND ÉCRAN : 2 colonnes côte à côte
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Colonne des billets
                      Expanded(
                        child: _buildBanknotesSection(config),
                      ),
                      
                      const SizedBox(width: 20),
                      
                      // Colonne des pièces
                      Expanded(
                        child: _buildCoinsSection(config),
                      ),
                    ],
                  )
                else
                  // DISPOSITION SUR PETIT ÉCRAN : empilée
                  Column(
                    children: [
                      _buildBanknotesSection(config),
                      
                      const SizedBox(height: 20),
                      
                      _buildCoinsSection(config),
                    ],
                  ),
                        
                const SizedBox(height: 40),
                        
                // Total et actions
                Card(
                  elevation: 4,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        // Total global
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Total Initial:',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF31a6f9),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFe8f5fe),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(0xFF1f9ef9),
                                  width: 2,
                                ),
                              ),
                              child: Text(
                                FormatUtils.formatCurrency(
                                  _totalAmount,
                                  config.symbol,
                                ),
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF1f9ef9),
                                ),
                              ),
                            ),
                          ],
                        ),
                        
                        const SizedBox(height: 32),
                        
                        // Boutons d'action
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final isWide = constraints.maxWidth > 600;
                            
                            if (isWide) {
                              // Disposition horizontale pour les grands écrans
                              return Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  SizedBox(
                                    height: 50,
                                    child: OutlinedButton(
                                      onPressed: () => Navigator.pop(context),
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(horizontal: 32),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      child: Text(
                                        LocaleKeys.commonCancel.tr(),
                                        style: const TextStyle(fontSize: 16),
                                      ),
                                    ),
                                  ),
                                  
                                  const SizedBox(width: 20),
                                  
                                  SizedBox(
                                    height: 50,
                                    child: ElevatedButton(
                                      onPressed: _initializeCaisse,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF1f9ef9),
                                        padding: const EdgeInsets.symmetric(horizontal: 40),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      child: const Text(
                                        'OUVRIR LA CAISSE',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            } else {
                              // Disposition verticale pour les petits écrans
                              return Column(
                                children: [
                                  SizedBox(
                                    width: double.infinity,
                                    height: 50,
                                    child: ElevatedButton(
                                      onPressed: _initializeCaisse,
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF1f9ef9),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      child: const Text(
                                        'Ouvrir Caisse',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                  ),
                                  
                                  const SizedBox(height: 12),
                                  
                                  SizedBox(
                                    width: double.infinity,
                                    height: 50,
                                    child: OutlinedButton(
                                      onPressed: () => Navigator.pop(context),
                                      style: OutlinedButton.styleFrom(
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                      ),
                                      child: Text(
                                        LocaleKeys.commonCancel.tr(),
                                        style: const TextStyle(fontSize: 16),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _controllers.forEach((_, controller) => controller.dispose());
    super.dispose();
  }
}