import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.settingsTitle.tr()),
        
      ),
      drawer: const SideMenu(),
      body: Center(
        child: 
        Text(LocaleKeys.settingsTitle.tr())
        ),
    );
  }
}