import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';

class LocaleService {
  static const String _key = 'app_locale';

  // Sauvegarde de la locale
  Future<void> saveLocale(Locale locale) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, locale.languageCode);
  }

  // Chargement de la locale sauvegardée (retourne null si aucune)
  Future<Locale?> getLocale() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_key);
    if (code != null) {
      return Locale(code);
    }
    return null;
  }

  // Récupération de la locale système (ou par défaut)
  Locale getSystemLocale() {
    // Sur mobile, on peut utiliser `Platform.localeName` mais ici on renvoie un Locale par défaut.
    // Pour simplifier, on retourne le français par défaut (ou anglais).
    return const Locale('fr');
  }
}