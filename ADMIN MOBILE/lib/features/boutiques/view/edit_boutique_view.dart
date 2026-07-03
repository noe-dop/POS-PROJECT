// lib/features/boutiques/views/edit_store_view.dart

import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/address_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/widgets/boutique_form_fields.dart';
import 'package:provider/provider.dart';

class EditBoutiqueView extends StatefulWidget {
  final BoutiqueModel store;

  const EditBoutiqueView({super.key, required this.store});

  @override
  State<EditBoutiqueView> createState() => _EditBoutiqueViewState();
}

class _EditBoutiqueViewState extends State<EditBoutiqueView> {
  final _formKey = GlobalKey<FormState>();

  // Contrôleurs pour les champs texte
  late TextEditingController _nameController;
  late TextEditingController _slugController;
  late TextEditingController _phoneController;
  late TextEditingController _emailController;
  late TextEditingController _sloganController;
  late TextEditingController _openingTimeController;
  late TextEditingController _closingTimeController;

  // Adresse
  late TextEditingController _addressLine1Controller;
  late TextEditingController _addressLine2Controller;
  late TextEditingController _cityController;
  late TextEditingController _stateController;
  late TextEditingController _postalCodeController;
  late TextEditingController _countryController;

  // Configuration des commandes en ligne
  late TextEditingController _maxQuantityController;

  // Variables pour les sélecteurs
  bool _isActive = true;
  int? _selectedStoreType;
  bool _isLoading = false;
  bool _isConfigLoading = false;

  // Configuration
  int? _maxOnlineItemQuantity;
  bool _isQuantityServiceEnabled = false;

  @override
  void initState() {
    super.initState();
    _initializeControllers();
    _loadConfiguration();
  }

  void _initializeControllers() {
    final store = widget.store;

    _nameController = TextEditingController(text: store.name);
    _slugController = TextEditingController(text: store.slug);
    _phoneController = TextEditingController(text: store.phone ?? '');
    _emailController = TextEditingController(text: store.email ?? '');
    _sloganController = TextEditingController(text: store.slogan ?? '');
    _openingTimeController = TextEditingController(
      text: store.openingHours['opening_time'] ?? '08:00',
    );
    _closingTimeController = TextEditingController(
      text: store.openingHours['closing_time'] ?? '20:00',
    );

    // Adresse
    _addressLine1Controller = TextEditingController(
      text: store.address.addressLine1,
    );
    _addressLine2Controller = TextEditingController(
      text: store.address.addressLine2 ?? '',
    );
    _cityController = TextEditingController(text: store.address.city);
    _stateController = TextEditingController(text: store.address.state);
    _postalCodeController = TextEditingController(
      text: store.address.postalCode ?? '',
    );
    _countryController = TextEditingController(text: store.address.country);

    // Configuration
    _maxQuantityController = TextEditingController();

    _isActive = store.isActive;
    _selectedStoreType = store.storeType;
  }

  @override
  void dispose() {
    // Libérer les contrôleurs
    _nameController.dispose();
    _slugController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _sloganController.dispose();
    _openingTimeController.dispose();
    _closingTimeController.dispose();
    _addressLine1Controller.dispose();
    _addressLine2Controller.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalCodeController.dispose();
    _countryController.dispose();
    _maxQuantityController.dispose();
    super.dispose();
  }

  // ============================================================================
  // CHARGEMENT DE LA CONFIGURATION
  // ============================================================================

  Future<void> _loadConfiguration() async {
    if (!mounted) return;
    setState(() => _isConfigLoading = true);

    try {
      final service = Provider.of<BoutiqueService>(context, listen: false);
      final config = await service.getStoreConfiguration(widget.store.id);

      if (mounted) {
        setState(() {
          _maxOnlineItemQuantity = config['max_online_item_quantity'] as int?;
          _maxQuantityController.text = _maxOnlineItemQuantity?.toString() ?? '';

          final servicesStatus = config['services_status'] as Map<String, dynamic>?;
          _isQuantityServiceEnabled =
              servicesStatus?['max_quantity_limit']?['enabled'] ?? false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur de chargement de la configuration: $e'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isConfigLoading = false);
    }
  }

  // ============================================================================
  // SAUVEGARDE DE LA CONFIGURATION
  // ============================================================================

  Future<void> _saveQuantityLimit() async {
    if (!mounted) return;
    setState(() => _isConfigLoading = true);

    try {
      final service = Provider.of<BoutiqueService>(context, listen: false);

      final text = _maxQuantityController.text.trim();
      final int? maxQuantity = text.isEmpty ? null : int.tryParse(text);

      if (text.isNotEmpty && maxQuantity == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Veuillez entrer un nombre valide'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      if (maxQuantity != null && maxQuantity <= 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('La quantité doit être supérieure à 0'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      await service.updateStoreConfiguration(
        widget.store.id,
        'max_online_item_quantity',
        maxQuantity,
      );

      if (mounted) {
        setState(() {
          _maxOnlineItemQuantity = maxQuantity;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Limite de quantité sauvegardée avec succès'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isConfigLoading = false);
    }
  }

  Future<void> _toggleQuantityService(bool value) async {
    if (!mounted) return;
    setState(() => _isConfigLoading = true);

    try {
      final service = Provider.of<BoutiqueService>(context, listen: false);
      await service.togglePaidService(
        widget.store.id,
        'max_quantity_limit',
        value,
      );

      if (mounted) {
        setState(() {
          _isQuantityServiceEnabled = value;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              value
                  ? 'Service de limite de quantité activé 🔓'
                  : 'Service de limite de quantité désactivé 🔒',
            ),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isConfigLoading = false);
    }
  }

  // ============================================================================
  // SAUVEGARDE DE LA BOUTIQUE
  // ============================================================================

  Future<void> _saveStore() async {
    if (!_formKey.currentState!.validate()) return;

    if (!mounted) return;
    setState(() => _isLoading = true);

    try {
      final updatedStore = BoutiqueModel(
        id: widget.store.id,
        name: _nameController.text.trim(),
        slug: _slugController.text.trim(),
        phone: _phoneController.text.trim(),
        email: _emailController.text.trim(),
        slogan: _sloganController.text.trim(),
        storeType: _selectedStoreType ?? 0,
        isActive: _isActive,
        totalEmployee: widget.store.totalEmployee,
        totalProducts: widget.store.totalProducts,
        totalPendingOrders: widget.store.totalPendingOrders,
        address: AddressModel(
          id: widget.store.address.id,
          fullAddress: '',
          addressLine1: _addressLine1Controller.text.trim(),
          addressLine2: _addressLine2Controller.text.trim(),
          city: _cityController.text.trim(),
          state: _stateController.text.trim(),
          postalCode: _postalCodeController.text.trim(),
          country: _countryController.text.trim(),
          latitude: widget.store.address.latitude,
          longitude: widget.store.address.longitude,
        ),
        openingHours: {
          'opening_time': _openingTimeController.text.trim(),
          'closing_time': _closingTimeController.text.trim(),
        },
        logoUrl: widget.store.logoUrl,
        bannerUrl: widget.store.bannerUrl,
        configuration: widget.store.configuration,
        createdAt: widget.store.createdAt,
        updatedAt: DateTime.now(),
      );

      final boutiqueService = Provider.of<BoutiqueService>(
        context,
        listen: false,
      );

      final result = await boutiqueService.updateStore(updatedStore);

      if (mounted && result['success'] == true) {
        NotificationService.showSuccess(
          context,
          'Boutique modifiée avec succès',
        );
        Navigator.pop(context, true);
      } else {
        if (mounted) {
          NotificationService.showError(context, result['message']);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ============================================================================
  // BUILD
  // ============================================================================

  @override
  Widget build(BuildContext context) {
    if (_isConfigLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Modifier la boutique'),
          backgroundColor: const Color(0xFF2E3A59),
          foregroundColor: Colors.white,
          elevation: 0,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Modifier la boutique'),
        backgroundColor: const Color(0xFF2E3A59),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton.icon(
            onPressed: _isLoading ? null : _saveStore,
            icon: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.save, color: Colors.white),
            label: Text(
              'Enregistrer',
              style: TextStyle(
                color: _isLoading ? Colors.white70 : Colors.white,
              ),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildForm(),
    );
  }

  // ============================================================================
  // CONSTRUCTION DU FORMULAIRE
  // ============================================================================

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section: Informations générales
            _buildSection(
              title: 'Informations générales',
              icon: Icons.store,
              children: [
                StoreTextField(
                  controller: _nameController,
                  label: 'Nom de la boutique *',
                  icon: Icons.store,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Le nom est requis';
                    }
                    return null;
                  },
                ),
                StoreTextField(
                  controller: _slugController,
                  label: 'Slug',
                  icon: Icons.link,
                  enabled: false,
                  helperText: 'Identifiant unique (généré automatiquement)',
                ),
                Row(
                  children: [
                    Expanded(
                      child: StoreTimePickerField(
                        controller: _openingTimeController,
                        label: 'Heure d\'ouverture',
                        icon: Icons.access_time,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StoreTimePickerField(
                        controller: _closingTimeController,
                        label: 'Heure de fermeture',
                        icon: Icons.access_time,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Section: Contact
            _buildSection(
              title: 'Contact',
              icon: Icons.contact_phone,
              children: [
                StoreTextField(
                  controller: _phoneController,
                  label: 'Téléphone',
                  icon: Icons.phone,
                  keyboardType: TextInputType.phone,
                  validator: (value) {
                    if (value != null && value.isNotEmpty && value.length < 8) {
                      return 'Numéro invalide';
                    }
                    return null;
                  },
                ),
                StoreTextField(
                  controller: _emailController,
                  label: 'Email',
                  icon: Icons.email,
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value != null && value.isNotEmpty) {
                      if (!value.contains('@') || !value.contains('.')) {
                        return 'Email invalide';
                      }
                    }
                    return null;
                  },
                ),
                StoreTextField(
                  controller: _sloganController,
                  label: 'Slogan',
                  icon: Icons.tag,
                  maxLines: 2,
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Section: Adresse
            _buildSection(
              title: 'Adresse',
              icon: Icons.location_on,
              children: [
                StoreTextField(
                  controller: _addressLine1Controller,
                  label: 'Adresse ligne 1 *',
                  icon: Icons.location_on,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'L\'adresse est requise';
                    }
                    return null;
                  },
                ),
                StoreTextField(
                  controller: _addressLine2Controller,
                  label: 'Adresse ligne 2',
                  icon: Icons.location_on,
                ),
                Row(
                  children: [
                    Expanded(
                      child: StoreTextField(
                        controller: _cityController,
                        label: 'Ville *',
                        icon: Icons.location_city,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'La ville est requise';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StoreTextField(
                        controller: _stateController,
                        label: 'Région',
                        icon: Icons.map,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Expanded(
                      child: StoreTextField(
                        controller: _postalCodeController,
                        label: 'Code postal',
                        icon: Icons.markunread_mailbox,
                        keyboardType: TextInputType.number,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StoreTextField(
                        controller: _countryController,
                        label: 'Pays *',
                        icon: Icons.flag,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Le pays est requis';
                          }
                          return null;
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Section: Configuration des commandes en ligne
            _buildSection(
              title: 'Commandes en ligne',
              icon: Icons.shopping_cart,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _isQuantityServiceEnabled
                        ? Colors.green[50]
                        : Colors.grey[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _isQuantityServiceEnabled ? Colors.green : Colors.grey,
                      width: 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _isQuantityServiceEnabled
                                ? Icons.lock_open
                                : Icons.lock,
                            color: _isQuantityServiceEnabled
                                ? Colors.green
                                : Colors.orange,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Limite de quantité par article',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  _isQuantityServiceEnabled
                                      ? 'Service activé 🔓'
                                      : 'Service désactivé 🔒',
                                  style: TextStyle(
                                    color: _isQuantityServiceEnabled
                                        ? Colors.green
                                        : Colors.grey,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _isQuantityServiceEnabled,
                            onChanged: _toggleQuantityService,
                          ),
                        ],
                      ),
                      if (_isQuantityServiceEnabled) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _maxQuantityController,
                                decoration: InputDecoration(
                                  labelText: 'Quantité max par article',
                                  hintText: 'Laisser vide = pas de limite',
                                  border: const OutlineInputBorder(),
                                  prefixIcon: const Icon(Icons.numbers),
                                  suffixText: 'unités',
                                ),
                                keyboardType: TextInputType.number,
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton.icon(
                              onPressed: _saveQuantityLimit,
                              icon: const Icon(Icons.save, size: 18),
                              label: const Text('Sauvegarder'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue,
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        if (_maxOnlineItemQuantity != null) ...[
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.info_outline,
                                  size: 16,
                                  color: Colors.blue,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Limite actuelle: ${_maxOnlineItemQuantity != null ? "$_maxOnlineItemQuantity unités" : "Aucune limite"}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.blue[700],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Text(
                          'Cette limite s\'applique uniquement aux commandes en ligne',
                          style: TextStyle(
                            color: Colors.orange[700],
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Section: Paramètres
            _buildSection(
              title: 'Paramètres',
              icon: Icons.settings,
              children: [
                Consumer<BoutiqueService>(
                  builder: (context, service, child) {
                    final storeTypes = service.getBoutiqueTypes ?? [];
                    return StoreDropdownField(
                      value: _selectedStoreType,
                      label: 'Type de boutique',
                      icon: Icons.category,
                      items: storeTypes.map((type) {
                        return DropdownMenuItem<int>(
                          value: type.id,
                          child: Text(type.name),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedStoreType = value;
                          });
                        }
                      },
                    );
                  },
                ),
                StoreSwitchTile(
                  value: _isActive,
                  onChanged: (value) {
                    setState(() => _isActive = value);
                  },
                  title: 'Boutique active',
                  subtitle: 'Désactivez pour masquer temporairement la boutique',
                  icon: Icons.power_settings_new,
                ),
              ],
            ),

            const SizedBox(height: 30),

            // Bouton de sauvegarde
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saveStore,
                icon: const Icon(Icons.save),
                label: const Text('ENREGISTRER LES MODIFICATIONS'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  textStyle: const TextStyle(fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  // ============================================================================
  // WIDGETS AIDANTS
  // ============================================================================

  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, color: Colors.blue[700], size: 20),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.blue[700],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ...children,
      ],
    );
  }
}