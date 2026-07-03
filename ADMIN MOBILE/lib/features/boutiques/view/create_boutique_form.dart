import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_form_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/widgets/simple_location_picker.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';

class CreateBoutiqueForm extends StatefulWidget {
  final VoidCallback? onSuccess;
  final VoidCallback? onCancel;

  const CreateBoutiqueForm({super.key, this.onSuccess, this.onCancel});

  @override
  State<CreateBoutiqueForm> createState() => _CreateBoutiqueFormState();
}

class _CreateBoutiqueFormState extends State<CreateBoutiqueForm> {
  final _formKey = GlobalKey<FormState>();
  final _scrollController = ScrollController();
  final _boutiqueForm = BoutiqueFormModel.empty();

  // Contrôleurs
  final _nameController = TextEditingController();
  final _sloganController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _openingTimeController = TextEditingController(text: '08:00');
  final _closingTimeController = TextEditingController(text: '20:00');
  final _addressLine1Controller = TextEditingController();
  final _cityController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _stateController = TextEditingController();
  // Pays defini par defaut avant la récuperation GPS
  final _countryController = TextEditingController(text: "Côte d'Ivoire");

  // États
  TimeOfDay? _selectedOpeningTime;
  TimeOfDay? _selectedClosingTime;
  File? _logoFile;
  String? _logoUrl;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _sloganController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressLine1Controller.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _stateController.dispose();
    _openingTimeController.dispose();
    _closingTimeController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _selectTime(BuildContext context, bool isOpening) async {
    final initialTime = isOpening
        ? (_selectedOpeningTime ?? const TimeOfDay(hour: 8, minute: 0))
        : (_selectedClosingTime ?? const TimeOfDay(hour: 20, minute: 0));

    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: initialTime,
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isOpening) {
          _selectedOpeningTime = picked;
          _openingTimeController.text =
              '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
        } else {
          _selectedClosingTime = picked;
          _closingTimeController.text =
              '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
        }
      });
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    _formKey.currentState!.save();
    setState(() => _isLoading = true);

    try {
      final boutiqueService = Provider.of<BoutiqueService>(
        context,
        listen: false,
      );

      // Mettre à jour les heures d'ouverture
      _boutiqueForm.openingHours = {
        'opening_time': _openingTimeController.text,
        'closing_time': _closingTimeController.text,
      };

      // Mettre à jour les fichiers
      if (_logoFile != null) {
        _boutiqueForm.logoFile = _logoFile;
      }

      final result = await boutiqueService.createBoutique(_boutiqueForm);

      if (mounted) {
        if (result['success'] == true) {
          NotificationService.showSuccess(context, LocaleKeys.storeCreateBoutiqueSuccess.tr());
          
          widget.onSuccess?.call();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("${result['data']}: ${result['message']}"),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${LocaleKeys.storeCreateBoutiqueError.tr()}: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickLogo() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );

    if (pickedFile != null) {
      setState(() {
        _logoFile = File(pickedFile.path);
        _logoUrl = null;
      });
    }
  }

  Widget _buildLogoPicker() {
    return GestureDetector(
      onTap: _pickLogo,
      child: Container(
        height: 120,
        width: 120,
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: _logoFile != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  _logoFile!,
                  fit: BoxFit.cover,
                ),
              )
            : _logoUrl != null && _logoUrl!.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      _logoUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _buildPlaceholder();
                      },
                    ),
                  )
                : _buildPlaceholder(),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.add_a_photo, size: 40, color: Colors.grey[400]),
        const SizedBox(height: 8),
        Text(
          LocaleKeys.storeCreateAddlogo.tr(),
          style: TextStyle(color: Colors.grey[600]),
        ),
      ],
    );
  }

  Widget _buildFormField({
    required String label,
    required TextEditingController controller,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    String? Function(String?)? validator,
    void Function(String?)? onSaved,
    bool required = true,
    bool enabled = true,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[700],
                ),
              ),
              if (required) ...[
                const SizedBox(width: 4),
                Text(
                  '*',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 4),
          TextFormField(
            controller: controller,
            maxLines: maxLines,
            keyboardType: keyboardType,
            inputFormatters: inputFormatters,
            decoration: InputDecoration(
              hintText: label,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(color: Colors.grey[300]!),
              ),
              filled: true,
              fillColor: enabled ? Colors.white : Colors.grey[100],
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
            validator: validator,
            onSaved: onSaved,
            enabled: enabled,
          ),
        ],
      ),
    );
  }

  Widget _buildTimeField({
    required String label,
    required TextEditingController controller,
    required bool isOpening,
  }) {
    return GestureDetector(
      onTap: () => _selectTime(context, isOpening),
      child: AbsorbPointer(
        child: _buildFormField(
          label: label,
          controller: controller,
          keyboardType: TextInputType.datetime,
        ),
      ),
    );
  }

  Widget _buildLocationSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          LocaleKeys.storeCreateAddress.tr(),
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 16),

        // Bouton GPS
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => SimpleLocationPicker(),
                ),
              );

              if (result != null && result is Map<String, dynamic>) {
                setState(() {
                  _addressLine1Controller.text = result['address'] ?? '';
                  _countryController.text = result["country"] ?? '';
                  _cityController.text = result['city'] ?? '';
                  _stateController.text = result['state'] ?? '';
                  _boutiqueForm.address.addressLine1 = result['address'] ?? '';
                  
                  if (result['latitude'] != null) {
                    _boutiqueForm.address.latitude = result['latitude'];
                  }
                  if (result['longitude'] != null) {
                    _boutiqueForm.address.longitude = result['longitude'];
                  }
                });
              }
            },
            icon: const Icon(Icons.my_location),
            label: Text('Utiliser la localisation GPS'.tr()),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue[50],
              foregroundColor: Colors.blue[700],
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Adresse ligne 1
        _buildFormField(
          label: 'Adresse*',
          controller: _addressLine1Controller,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'L\'adresse est requise';
            }
            return null;
          },
          onSaved: (value) => _boutiqueForm.address.addressLine1 = value!,
        ),

        // Ville
        _buildFormField(
          label: 'Ville*',
          controller: _cityController,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'La ville est requise';
            }
            return null;
          },
          onSaved: (value) => _boutiqueForm.address.city = value!,
        ),

        // Code postal
        _buildFormField(
          label: 'Code postal',
          controller: _postalCodeController,
          keyboardType: TextInputType.number,
          required: false,
          onSaved: (value) => _boutiqueForm.address.postalCode = value!,
        ),

        // Région
        _buildFormField(
          label: 'Région',
          controller: _stateController,
          required: false,
          onSaved: (value) => _boutiqueForm.address.state = value ?? '',
        ),

        // Pays (pré-rempli)
        _buildFormField(
          label: 'Pays',
          controller: _countryController,
          enabled: false,
          onSaved: (value) => _boutiqueForm.address.country = value!,
        ),
      ],
    );
  }

  Widget _buildMobileLayout() {
    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Logo
            Center(child: _buildLogoPicker()),
            const SizedBox(height: 24),

            // SECTION 1: INFORMATIONS DE BASE
            Text(
              LocaleKeys.storeCreateBasicInfo.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),

            // Nom
            _buildFormField(
              label: LocaleKeys.storeCreateName.tr(),
              controller: _nameController,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return LocaleKeys.storeCreateBoutiqueRequiredField.tr();
                }
                return null;
              },
              onSaved: (value) => _boutiqueForm.name = value!,
            ),

            // Description
            _buildFormField(
              label: LocaleKeys.storeCreateSlogan.tr(),
              controller: _sloganController,
              maxLines: 3,
              onSaved: (value) => _boutiqueForm.slogan = value ?? '',
            ),

            // Type de boutique
            Consumer<BoutiqueService>(
              builder: (context, boutiqueService, child) {
                final types = boutiqueService.getBoutiqueTypes ?? [];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            LocaleKeys.storeCreateType.tr(),
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: Colors.grey[700],
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            '*',
                            style: TextStyle(
                              color: Colors.red,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      DropdownButtonFormField<int>(
                        initialValue: _boutiqueForm.storeTypeId == 0
                            ? null
                            : _boutiqueForm.storeTypeId,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: Colors.grey[300]!),
                          ),
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ),
                        ),
                        items: types.map((type) {
                          return DropdownMenuItem<int>(
                            value: type.id,
                            child: Text(type.name),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _boutiqueForm.storeTypeId = value ?? 0;
                          });
                        },
                        validator: (value) {
                          if (value == null || value == 0) {
                            return LocaleKeys.storeCreateBoutiqueRequiredField
                                .tr();
                          }
                          return null;
                        },
                        hint: Text(LocaleKeys.storeCreateSelectType.tr()),
                      ),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // SECTION 2: INFORMATIONS DE CONTACT
            Text(
              LocaleKeys.storeCreateContactInfo.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),

            // Téléphone
            _buildFormField(
              label: LocaleKeys.storeCreatePhone.tr(),
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return LocaleKeys.storeCreateBoutiqueRequiredField.tr();
                }
                if (value.replaceAll(RegExp(r'[^\d]'), '').length < 8) {
                  return LocaleKeys.storeCreateInvalidphone.tr();
                }
                return null;
              },
              onSaved: (value) => _boutiqueForm.phone = value!,
            ),

            // Email
            _buildFormField(
              label: 'Email',
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return LocaleKeys.storeCreateBoutiqueRequiredField.tr();
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                    .hasMatch(value)) {
                  return LocaleKeys.storeCreateInvalidEmail.tr();
                }
                return null;
              },
              onSaved: (value) => _boutiqueForm.email = value!,
            ),

            const SizedBox(height: 24),

            // SECTION 3: HORAIRES
            Text(
              LocaleKeys.storeCreateSchedule.tr(),
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 16),

            // Heure d'ouverture
            _buildTimeField(
              label: LocaleKeys.storeCreateOpeningTime.tr(),
              controller: _openingTimeController,
              isOpening: true,
            ),

            // Heure de fermeture
            _buildTimeField(
              label: LocaleKeys.storeCreateClosingTime.tr(),
              controller: _closingTimeController,
              isOpening: false,
            ),

            const SizedBox(height: 24),

            // SECTION 4: LOCALISATION
            _buildLocationSection(),

            const SizedBox(height: 32),

            // BOUTONS D'ACTION
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: widget.onCancel,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: BorderSide(color: Colors.grey[300]!),
                    ),
                    child: Text(
                      LocaleKeys.commonCancel.tr(),
                      style: TextStyle(color: Colors.grey[700]),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitForm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : Text(
                            LocaleKeys.storeCreateBoutique.tr(),
                            style: const TextStyle(color: Colors.white),
                          ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDesktopLayout() {
    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.all(32),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // En-tête
            Row(
              children: [
                Icon(
                  Icons.store,
                  size: 32,
                  color: Theme.of(context).primaryColor,
                ),
                const SizedBox(width: 16),
                Text(
                  LocaleKeys.storeCreateNewBoutique.tr(),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // PREMIÈRE LIGNE : Logo + Infos de base
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Logo
                Column(
                  children: [
                    _buildLogoPicker(),
                    const SizedBox(height: 16),
                    Text(
                      LocaleKeys.storeLogo.tr(),
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
                const SizedBox(width: 32),

                // Informations de base
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        LocaleKeys.storeCreateBasicInfo.tr(),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),

                      Row(
                        children: [
                          Expanded(
                            // Nom 
                            child: _buildFormField(
                              label: LocaleKeys.storeCreateName.tr(),
                              controller: _nameController,
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return LocaleKeys
                                      .storeCreateBoutiqueRequiredField
                                      .tr();
                                }
                                return null;
                              },
                              onSaved: (value) => _boutiqueForm.name = value!,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            // Type de Boutique
                            child: Consumer<BoutiqueService>(
                              builder: (context, boutiqueService, child) {
                                final types =
                                    boutiqueService.getBoutiqueTypes ?? [];
                                return Padding(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 8.0),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Text(
                                            LocaleKeys.storeCreateType.tr(),
                                            style: TextStyle(
                                              fontWeight: FontWeight.w500,
                                              color: Colors.grey[700],
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          const Text(
                                            '*',
                                            style: TextStyle(
                                              color: Colors.red,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      DropdownButtonFormField<int>(
                                        initialValue: _boutiqueForm.storeTypeId == 0
                                            ? null
                                            : _boutiqueForm.storeTypeId,
                                        decoration: InputDecoration(
                                          border: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            borderSide: BorderSide(
                                                color: Colors.grey[300]!),
                                          ),
                                          filled: true,
                                          fillColor: Colors.white,
                                          contentPadding:
                                              const EdgeInsets.symmetric(
                                            horizontal: 16,
                                            vertical: 12,
                                          ),
                                        ),
                                        items: types.map((type) {
                                          return DropdownMenuItem<int>(
                                            value: type.id,
                                            child: Text(type.name),
                                          );
                                        }).toList(),
                                        onChanged: (value) {
                                          setState(() {
                                            _boutiqueForm.storeTypeId =
                                                value ?? 0;
                                          });
                                        },
                                        validator: (value) {
                                          if (value == null || value == 0) {
                                            return LocaleKeys
                                                .storeCreateBoutiqueRequiredField
                                                .tr();
                                          }
                                          return null;
                                        },
                                        hint: Text(
                                            LocaleKeys.storeCreateSelectType.tr()),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),

                      _buildFormField(
                        label: LocaleKeys.storeCreateSlogan.tr(),
                        controller: _sloganController,
                        maxLines: 3,
                        onSaved: (value) =>
                            _boutiqueForm.slogan = value ?? '',
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // DEUXIÈME LIGNE : Contact et horaires
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Contact
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        LocaleKeys.storeCreateContactInfo.tr(),
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 16),

                      _buildFormField(
                        label: LocaleKeys.storeCreatePhone.tr(),
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly
                        ],
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return LocaleKeys.storeCreateBoutiqueRequiredField
                                .tr();
                          }
                          if (value.replaceAll(RegExp(r'[^\d]'), '').length <
                              8) {
                            return LocaleKeys.storeCreateInvalidphone.tr();
                          }
                          return null;
                        },
                        onSaved: (value) => _boutiqueForm.phone = value!,
                      ),

                      _buildFormField(
                        label: 'Email',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return LocaleKeys.storeCreateBoutiqueRequiredField
                                .tr();
                          }
                          if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                              .hasMatch(value)) {
                            return LocaleKeys.storeCreateInvalidEmail.tr();
                          }
                          return null;
                        },
                        onSaved: (value) => _boutiqueForm.email = value!,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 32),

                // Horaires
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        LocaleKeys.storeCreateSchedule.tr(),
                        style:
                            Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                      const SizedBox(height: 16),

                      _buildTimeField(
                        label: LocaleKeys.storeCreateOpeningTime.tr(),
                        controller: _openingTimeController,
                        isOpening: true,
                      ),

                      _buildTimeField(
                        label: LocaleKeys.storeCreateClosingTime.tr(),
                        controller: _closingTimeController,
                        isOpening: false,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // TROISIÈME LIGNE : Localisation
            _buildLocationSection(),

            const SizedBox(height: 40),

            // BOUTONS
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton(
                  onPressed: widget.onCancel,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 40,
                      vertical: 16,
                    ),
                    side: BorderSide(color: Colors.grey[300]!),
                  ),
                  child: Text(
                    LocaleKeys.commonCancel.tr(),
                    style: TextStyle(color: Colors.grey[700]),
                  ),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 40,
                      vertical: 16,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_isLoading)
                        const Padding(
                          padding: EdgeInsets.only(right: 8.0),
                          child: SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          ),
                        ),
                      const Icon(Icons.add, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        LocaleKeys.storeCreateBoutique.tr(),
                        style: const TextStyle(color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 768;

    return Scaffold(
      appBar: AppBar(
        title: Text(LocaleKeys.storeCreateNewBoutique.tr()),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.onCancel ?? () => Navigator.pop(context),
        ),
      ),
      body: isMobile ? _buildMobileLayout() : _buildDesktopLayout(),
    );
  }
}