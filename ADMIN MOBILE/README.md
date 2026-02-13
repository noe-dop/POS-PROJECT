# nsp_pos_mobile

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

lib/
│
├── main.dart
├── app/
│   ├── app.dart                 # Point d'entrée principal (MaterialApp)
│   ├── routes.dart              # Routes centralisées (navigation)
│   └── theme/
│       ├── app_colors.dart
│       ├── app_text_styles.dart
│       └── app_theme.dart
│
├── core/
│   ├── constants/               # Constantes globales
│   │   ├── app_constants.dart
│   │   ├── endpoints.dart       # URLs d'API
│   │   └── keys.dart            # Clés locales, tokens, etc.
│   │
│   ├── utils/                   # Fonctions utilitaires
│   │   ├── formatters.dart      # formatDate, formatCurrency...
│   │   ├── validators.dart      # Validation des champs
│   │   ├── helpers.dart         # Fonctions génériques
│   │   └── connectivity_helper.dart # Vérifie la connexion réseau
│   │
│   ├── widgets/                 # Widgets réutilisables
│   │   ├── custom_button.dart
│   │   ├── custom_input.dart
│   │   ├── loading_indicator.dart
│   │   ├── empty_state.dart
│   │   └── error_message.dart
│   │
│   └── services/                # Services globaux
│       ├── api_service.dart     # Gestion des appels HTTP
│       ├── db_service.dart      # SQLite / Hive
│       ├── auth_service.dart    # Gestion du token utilisateur
│       ├── storage_service.dart # SharedPreferences / SecureStorage
│       └── language_service.dart# Changement de langue
│
├── data/
│   ├── models/                  # Modèles de données (POJO)
│   │   ├── user_model.dart
│   │   ├── boutique_model.dart
│   │   ├── vente_model.dart
│   │   └── employe_model.dart
│   │
│   └── repositories/            # Logique métier entre UI et API
│       ├── auth_repository.dart
│       ├── boutique_repository.dart
│       ├── vente_repository.dart
│       └── employe_repository.dart
│
├── features/                    # Modules fonctionnels
│   ├── auth/                    # Connexion / Inscription
│   │   ├── view/
│   │   │   ├── login_screen.dart
│   │   │   └── register_screen.dart
│   │   ├── viewmodel/
│   │   │   └── auth_viewmodel.dart
│   │   └── widgets/
│   │       └── auth_form.dart
│   │
│   ├── dashboard/
│   │   ├── view/
│   │   │   └── dashboard_screen.dart
│   │   ├── viewmodel/
│   │   │   └── dashboard_viewmodel.dart
│   │   └── widgets/
│   │       ├── boutique_card.dart
│   │       ├── vente_card.dart
│   │       └── employe_card.dart
│   │
│   ├── employe/
│   │   ├── view/
│   │   │   └── employe_screen.dart
│   │   ├── viewmodel/
│   │   │   └── employe_viewmodel.dart
│   │   └── widgets/
│   │       └── employe_tile.dart
│   │
│   ├── produits/
│   │   ├── view/
│   │   │   └── produits_screen.dart
│   │   ├── viewmodel/
│   │   │   └── produits_viewmodel.dart
│   │   └── widgets/
│   │       └── produit_card.dart
│   │
│   └── settings/
│       ├── view/
│       │   └── settings_screen.dart
│       ├── viewmodel/
│       │   └── settings_viewmodel.dart
│       └── widgets/
│           └── language_switch.dart
│
└── localization/
    ├── en.json
    ├── fr.json
    └── locale_keys.dart         # (optionnel avec easy_localization)
⚙️ Explication par section
🧩 app/

Contient le noyau de l’application :

app.dart → point d’entrée Flutter avec MaterialApp

routes.dart → centralise toutes les routes nommées

theme/ → couleurs, typographies et thème global

💼 core/

Le cœur réutilisable :

constants/ : valeurs fixes globales

utils/ : fonctions génériques (date, format, validation, connectivité)

widgets/ : composants visuels réutilisables (boutons, inputs, loaders)

services/ : accès aux API, stockage local, authentification

🧠 data/

Couche d’accès aux données :

models/ → définition des entités (User, Boutique, Vente, etc.)

repositories/ → logique métier (ex. fusionner local + API, gérer cache)

🔧 features/

Chaque fonctionnalité indépendante a :

view/ → les pages et écrans

viewmodel/ → la logique spécifique (avec Provider, Riverpod ou GetX)

widgets/ → sous-composants propres à ce module

Cela permet une modularisation forte (chaque module peut évoluer seul).

🌍 localization/

Fichiers JSON de langues :
fr.json, en.json (intégration avec easy_localization ou intl)
👉 Permet de changer la langue facilement depuis l’UI.