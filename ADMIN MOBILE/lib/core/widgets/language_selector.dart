import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/core/services/locale_service.dart';

class LanguageSelector extends StatelessWidget {
  final List<Locale> supportedLocales;
  final LocaleService _localeService = LocaleService();

  LanguageSelector({
    super.key,
    required this.supportedLocales,
  });

  @override
  Widget build(BuildContext context) {
    final currentLocale = context.locale;

    return PopupMenuButton<Locale>(
      icon: const Icon(Icons.language),
      onSelected: (Locale locale) async {
        // Changer la locale dans l'app
        await context.setLocale(locale);
        // Persister le choix
        await _localeService.saveLocale(locale);
      },
      itemBuilder: (context) {
        return supportedLocales.map((locale) {
          // Construire le nom d'affichage (par ex : "Français", "English")
          String label;
          switch (locale.languageCode) {
            case 'fr':
              label = 'Français';
              break;
            case 'en':
              label = 'English';
              break;
            // Ajouter d'autres cas si besoin
            default:
              label = locale.languageCode;
          }
          return PopupMenuItem<Locale>(
            value: locale,
            child: Row(
              children: [
                if (currentLocale.languageCode == locale.languageCode)
                  const Icon(Icons.check, color: Colors.blue),
                const SizedBox(width: 8),
                Text(label),
              ],
            ),
          );
        }).toList();
      },
    );
  }
}