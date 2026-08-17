import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

/// Pavé numérique réutilisable pour la saisie de code-barres et de
/// quantité en caisse.
///
/// Les libellés ("MODE QUANTITÉ", "MODE SCAN", "VIDER") sont traduits via
/// [LocaleKeys.numericKeyboardModeQuantity], [LocaleKeys.numericKeyboardModeScan]
/// et [LocaleKeys.numericKeyboardClear]. Les chiffres eux-mêmes (0-9, '.')
/// ne sont volontairement pas traduits/convertis : le français, l'anglais
/// et l'arabe utilisé en Mauritanie partagent les mêmes chiffres
/// occidentaux (0-9), contrairement aux chiffres arabo-indiens (٠١٢٣...)
/// utilisés dans d'autres régions arabophones.
class NumericKeyboard extends StatelessWidget {
  final Function(String) onKeyPressed;
  final VoidCallback onClear;
  final VoidCallback onDelete;
  final bool isQuantityMode;

  const NumericKeyboard({
    super.key,
    required this.onKeyPressed,
    required this.onClear,
    required this.onDelete,
    this.isQuantityMode = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      child: Column(
        children: [
          // Indicateur de mode actif
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: isQuantityMode ? Colors.green : Colors.blue,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  isQuantityMode ? Icons.numbers : Icons.qr_code_scanner,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  isQuantityMode
                      ? LocaleKeys.numericKeyboardModeQuantity.tr()
                      : LocaleKeys.numericKeyboardModeScan.tr(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Pavé numérique
          Expanded(
            child: GridView.count(
              crossAxisCount: 3,
              childAspectRatio: 2.1,
              mainAxisSpacing: 8,
              crossAxisSpacing: 15,
              children: [
                _buildKey('7'),
                _buildKey('8'),
                _buildKey('9'),
                _buildKey('4'),
                _buildKey('5'),
                _buildKey('6'),
                _buildKey('1'),
                _buildKey('2'),
                _buildKey('3'),
                _buildKey('0'),
                _buildKey('.'),
                _buildActionKey('⌫', onDelete),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: onClear,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: Text(
                    LocaleKeys.numericKeyboardClear.tr(),
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Construit une touche numérique/point simple.
  Widget _buildKey(String value) {
    return ElevatedButton(
      onPressed: () => onKeyPressed(value),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.grey[200],
        foregroundColor: Colors.black,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: Text(
        value,
        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      ),
    );
  }

  /// Construit une touche d'action (ex. suppression du dernier caractère).
  /// Le symbole "⌫" est universel et n'a pas besoin de traduction.
  Widget _buildActionKey(String label, VoidCallback onPressed) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    );
  }
}
