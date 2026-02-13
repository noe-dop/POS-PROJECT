// detail_boutique_view.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/view/edit_boutique_view.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/widgets/boutique_form_fields.dart';
import 'package:provider/provider.dart';

class DetailBoutiqueView extends StatelessWidget {
  final BoutiqueModel store;
  final bool canEdit;

  const DetailBoutiqueView({
    super.key,
    required this.store,
    required this.canEdit, // À définir selon le rôle de l'utilisateur
  });

  @override
  Widget build(BuildContext context) {
    final storeTypes = context.watch<BoutiqueService>().getBoutiqueTypes ?? [];
    final storeTypeName = storeTypes
            .firstWhere((type) => type.id == store.storeType)
            .name;

    return Scaffold(
      appBar: AppBar(
        title: Text(store.name),
        backgroundColor: const Color(0xFF2E3A59),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () async {
                final updated = await Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => EditBoutiqueView(store: store),
                  ),
                );
                if (updated == true && context.mounted) {
                  // Recharger les données si nécessaire
                  context.read<BoutiqueService>().fetchAccessibleStores();
                }
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section: Informations générales
            StoreFormSection(
              title: 'Informations générales',
              icon: Icons.store,
              children: [
                _buildReadOnlyField(
                  label: 'Nom de la boutique',
                  value: store.name,
                  icon: Icons.store,
                ),
                _buildReadOnlyField(
                  label: 'Slug',
                  value: store.slug,
                  icon: Icons.link,
                ),
                _buildReadOnlyField(
                  label: 'Type de boutique',
                  value: storeTypeName,
                  icon: Icons.category,
                ),
                _buildReadOnlyField(
                  label: 'Statut',
                  value: store.isActive ? 'Active' : 'Inactive',
                  icon: Icons.power_settings_new,
                ),
                Row(
                  children: [
                    Expanded(
                      child: _buildReadOnlyField(
                        label: 'Heure d\'ouverture',
                        value: store.openingHours['opening_time'] ?? '08:00',
                        icon: Icons.access_time,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildReadOnlyField(
                        label: 'Heure de fermeture',
                        value: store.openingHours['closing_time'] ?? '20:00',
                        icon: Icons.access_time,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Section: Contact
            StoreFormSection(
              title: 'Contact',
              icon: Icons.contact_phone,
              children: [
                _buildReadOnlyField(
                  label: 'Téléphone',
                  value: store.phone ?? 'Non renseigné',
                  icon: Icons.phone,
                ),
                _buildReadOnlyField(
                  label: 'Email',
                  value: store.email ?? 'Non renseigné',
                  icon: Icons.email,
                ),
                _buildReadOnlyField(
                  label: 'Slogan',
                  value: store.slogan ?? 'Non renseigné',
                  icon: Icons.tag,
                  maxLines: 2,
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Section: Adresse
            StoreFormSection(
              title: 'Adresse',
              icon: Icons.location_on,
              children: [
                _buildReadOnlyField(
                  label: 'Adresse ligne 1',
                  value: store.address.addressLine1,
                  icon: Icons.location_on,
                ),
                if (store.address.addressLine2?.isNotEmpty == true)
                  _buildReadOnlyField(
                    label: 'Adresse ligne 2',
                    value: store.address.addressLine2!,
                    icon: Icons.location_on,
                  ),
                Row(
                  children: [
                    Expanded(
                      child: _buildReadOnlyField(
                        label: 'Ville',
                        value: store.address.city,
                        icon: Icons.location_city,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildReadOnlyField(
                        label: 'Région',
                        value: store.address.state,
                        icon: Icons.map,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: _buildReadOnlyField(
                        label: 'Code postal',
                        value: store.address.postalCode ?? 'Non renseigné',
                        icon: Icons.markunread_mailbox,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildReadOnlyField(
                        label: 'Pays',
                        value: store.address.country,
                        icon: Icons.flag,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Section: Statistiques
            StoreFormSection(
              title: 'Statistiques',
              icon: Icons.analytics,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildStatisticCard(
                        title: 'Employés',
                        value: '${store.totalEmployee}',
                        icon: Icons.people,
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStatisticCard(
                        title: 'Produits',
                        value: '${store.totalProducts}',
                        icon: Icons.inventory,
                        color: Colors.orange,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  // Widget pour champ en lecture seule
  Widget _buildReadOnlyField({
    required String label,
    required String value,
    required IconData icon,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        initialValue: value,
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: Colors.blue, size: 20),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
          fillColor: Colors.grey[100],
        ),
        enabled: false,
        maxLines: maxLines,
      ),
    );
  }

  Widget _buildStatisticCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha:0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha:0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}