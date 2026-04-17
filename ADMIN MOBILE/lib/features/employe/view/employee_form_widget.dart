// lib/features/employe/view/employee_form_widget.dart
import 'dart:math';
import 'dart:typed_data';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:nsp_pos_mobile/core/utils/password_generator.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/features/caisse/viewmodel/caisse_model.dart';
import 'package:nsp_pos_mobile/features/employe/service/employe_provider.dart';
import 'package:nsp_pos_mobile/features/employe/viewmodel/employe_model.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';

class EmployeeFormWidget extends StatefulWidget {
  final Employee? employee;
  final List<StoreWithPermission> accessibleStores;
  final VoidCallback onSuccess;

  const EmployeeFormWidget({
    super.key,
    this.employee,
    required this.accessibleStores,
    required this.onSuccess,
  });

  @override
  State<EmployeeFormWidget> createState() => _EmployeeFormWidgetState();
}

class _EmployeeFormWidgetState extends State<EmployeeFormWidget> {
  final _formKey = GlobalKey<FormState>();

  // Controllers pour User
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _usernameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _passwordController;
  late TextEditingController _addressController;

  // Controllers pour Employee
  late TextEditingController _salaryController;
  late TextEditingController _emergencyContactController;

  // Pour la date d'embauche
  DateTime? _hireDate;

  List<int> _selectedStoreIds = [];
  String? _selectedRole;
  Uint8List? _profileImage;
  bool _showPassword = false;
  bool _isEditing = false;
  bool _isSubmitting = false;

  List<Map<String, dynamic>> _availableRoles = [];
  bool _canSelectMultipleStores = false;

  final String currency = "FCFA";
  late final config = CurrencyConfig.currencies[currency];

  @override
  void initState() {
    super.initState();
    _isEditing = widget.employee != null;

    // Initialisation des contrôleurs User
    _firstNameController = TextEditingController(
      text: widget.employee?.firstName ?? '',
    );
    _lastNameController = TextEditingController(
      text: widget.employee?.lastName ?? '',
    );
    _usernameController = TextEditingController(
      text: widget.employee?.username ?? '',
    );
    _emailController = TextEditingController(
      text: widget.employee?.email ?? '',
    );
    _phoneController = TextEditingController(
      text: widget.employee?.phone ?? '',
    );
    _passwordController = TextEditingController();
    _addressController = TextEditingController(
      text: widget.employee?.address ?? '',
    );

    // Initialisation des contrôleurs Employee
    _salaryController = TextEditingController(
      text: widget.employee?.salary?.toString() ?? '',
    );
    _emergencyContactController = TextEditingController(
      text: widget.employee?.emergencyContact ?? '',
    );

    // Initialisation de la date d'embauche
    _hireDate = widget.employee?.hireDate ?? DateTime.now();

    if (_isEditing && widget.employee != null) {
      _selectedStoreIds = widget.employee!.assignedStores!.map((store) => store["id"] as int).toList();
      _selectedRole = widget.employee!.roleName;
        _canSelectMultipleStores = widget.employee!.canAccessMultipleStores;
    }

    _loadRoles();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _addressController.dispose();
    _salaryController.dispose();
    _emergencyContactController.dispose();
    super.dispose();
  }

  Future<void> _loadRoles() async {
    final provider = Provider.of<EmployeeProvider>(context, listen: false);
    _availableRoles = provider.getRolesForDropdown();
    setState(() {});
  }

  void _updateMultipleStoreSelection(String? roleName) {
    if (roleName != null) {
      final role = _availableRoles.firstWhere(
        (r) => r['name'] == roleName,
        orElse: () => {},
      );
      _canSelectMultipleStores = role['can_access_multiple_stores'] ?? false;

      if (!_canSelectMultipleStores && _selectedStoreIds.length > 1) {
        _selectedStoreIds = [_selectedStoreIds.first];
      }
    }
    setState(() {});
  }

  Future<void> _pickProfileImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      final bytes = await pickedFile.readAsBytes();
      setState(() => _profileImage = bytes);
    }
  }

  String _generateUsername(String firstName, String lastName, String email) {
    if (firstName.isNotEmpty) {
      String base = firstName.trim().toLowerCase();
      if (lastName.isNotEmpty) {
        base = '${base}.${lastName.trim().toLowerCase()}';
      }
      // Ajouter un nombre aléatoire pour éviter les doublons
      base = base.replaceAll(' ', '');
      int randomNumber = Random().nextInt(999) + 1;
      String formattedNumber = randomNumber.toString().padLeft(3, '0');
      return '${base}_$formattedNumber';
    }
    if (email.isNotEmpty) {
      return email.split('@').first;
    }
    return 'user_${DateTime.now().millisecondsSinceEpoch}';
  }

  Future<void> _selectHireDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _hireDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _hireDate) {
      setState(() {
        _hireDate = picked;
      });
    }
  }

  // Future<void> _submit() async {
  //   print('Debut de la soummission du formulaire');
  //   print(_isSubmitting);
  //   print(_isEditing);
  //   if (_isSubmitting) return;
  //   if (!_formKey.currentState!.validate()) return;
  //   if (_selectedStoreIds.isEmpty) {
  //     _showSnackBar('Veuillez sélectionner au moins une boutique', Colors.red);
  //     return;
  //   }
  //   if (_selectedRole == null) {
  //     _showSnackBar('Veuillez sélectionner un rôle', Colors.red);
  //     return;
  //   }
  //   if (_hireDate == null) {
  //     _showSnackBar('Veuillez sélectionner la date d\'embauche', Colors.red);
  //     return;
  //   }

  //   setState(() => _isSubmitting = true);

  //   final provider = Provider.of<EmployeeProvider>(context, listen: false);

  //   // Générer le nom d'utilisateur si vide
  //   String username = _usernameController.text.trim();
  //   if (username.isEmpty) {
  //     username = _generateUsername(
  //       _firstNameController.text,
  //       _lastNameController.text,
  //       _emailController.text
  //     );
  //   }

  //   if (_isEditing && widget.employee != null) {
  //     print('Debut mise à jour de l\'employé avec ID: ${widget.employee!.id}');
  //     // Mise à jour de l'employé
  //     final result = await provider.updateEmployee(
  //       employeeId: widget.employee!.id,
  //       firstName: _firstNameController.text.trim(),
  //       lastName: _lastNameController.text.trim(),
  //       email: _emailController.text.trim(),
  //       phone: _phoneController.text.trim(),
  //       address: _addressController.text.trim(),
  //       storeId: _selectedStoreIds.first,
  //       roleId: provider.getRoleIdByName(_selectedRole!) ?? widget.employee!.roleId,
  //       hireDate: _hireDate!,
  //       salary: double.tryParse(_salaryController.text),
  //       emergencyContact: _emergencyContactController.text.trim(),
  //       photo: _profileImage,
  //     );

  //     setState(() => _isSubmitting = false);

  //     if (mounted && result['status'] == true) {
  //       _showSnackBar('Employé mis à jour avec succès', Colors.green);
  //       await provider.loadAllData(storeId: provider.selectedStoreId);
  //       widget.onSuccess();
  //       if (mounted) Navigator.pop(context);
  //     } else if (mounted) {
  //       _showSnackBar(result['message'] ?? 'Erreur lors de la mise à jour', Colors.red);
  //     }
  //   } else {
  //     // Création d'un nouvel employé
  //     final result = await provider.createEmployee(
  //       username: username,
  //       firstName: _firstNameController.text.trim(),
  //       lastName: _lastNameController.text.trim(),
  //       email: _emailController.text.trim(),
  //       phone: _phoneController.text.trim(),
  //       address: _addressController.text.trim(),
  //       password: _passwordController.text,
  //       storeId: _selectedStoreIds.first,
  //       roleId: provider.getRoleIdByName(_selectedRole!) ?? 1,
  //       hireDate: _hireDate!,
  //       salary: double.tryParse(_salaryController.text),
  //       emergencyContact: _emergencyContactController.text.trim(),
  //       photo: _profileImage,
  //     );

  //     setState(() => _isSubmitting = false);

  //     if (mounted && result['status'] == true) {
  //       final employee = result['employee'];

  //       if (_selectedStoreIds.length > 1) {
  //         await provider.assignEmployeeToStores(
  //           employeeId: employee.id,
  //           storeIds: _selectedStoreIds,
  //           permissionType: _selectedRole!.toLowerCase(),
  //         );
  //       }

  //       await provider.loadAllData(storeId: provider.selectedStoreId);
  //       _showSnackBar('Employé ajouté avec succès', Colors.green);
  //       widget.onSuccess();
  //       if (mounted) Navigator.pop(context);
  //     } else if (mounted) {
  //       _showSnackBar(result['message'] ?? 'Erreur lors de l\'ajout', Colors.red);
  //     }
  //   }
  // }

  Future<void> _submit() async {
    if (_isSubmitting) {
      return;
    }

    // FORCER la validation et l'affichage des erreurs
    final bool isValid = _formKey.currentState!.validate();


    if (!isValid) {
      // Forcer l'affichage des erreurs
      setState(() {});
      _showSnackBar(
        'Veuillez corriger les erreurs dans le formulaire',
        Colors.orange,
      );
      return;
    }

    if (_selectedStoreIds.isEmpty) {
      _showSnackBar('Veuillez sélectionner au moins une boutique', Colors.red);
      return;
    }
    if (_selectedRole == null) {
      _showSnackBar('Veuillez sélectionner un rôle', Colors.red);
      return;
    }
    if (_hireDate == null) {
      _showSnackBar('Veuillez sélectionner la date d\'embauche', Colors.red);
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final provider = Provider.of<EmployeeProvider>(context, listen: false);

      // Générer le nom d'utilisateur si vide
      String username = _usernameController.text.trim();
      if (username.isEmpty) {
        username = _generateUsername(
          _firstNameController.text,
          _lastNameController.text,
          _emailController.text,
        );
      }

      if (_isEditing && widget.employee != null) {
        final roleId = provider.getRoleIdByName(_selectedRole!);

        // Mise à jour de l'employé
        final result = await provider.updateEmployee(
          employeeId: widget.employee!.id,
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          email: _emailController.text.trim(),
          phone: _phoneController.text.trim(),
          address: _addressController.text.trim(),
          storeId: _selectedStoreIds.first,
          roleId: roleId ?? widget.employee!.roleId,
          hireDate: _hireDate!,
          salary: double.tryParse(_salaryController.text),
          emergencyContact: _emergencyContactController.text.trim(),
          photo: _profileImage,
          assignedStoreIds: _canSelectMultipleStores && _selectedStoreIds.length > 1 ? _selectedStoreIds : null,
          
        );

        setState(() => _isSubmitting = false);

        if (mounted && result['status'] == true) {
          _showSnackBar('Employé mis à jour avec succès', Colors.green);
          await provider.loadAllData(storeId: provider.selectedStoreId);
          widget.onSuccess();
          if (mounted) Navigator.pop(context);
        } else if (mounted) {
          _showSnackBar(
            result['message'] ?? 'Erreur lors de la mise à jour',
            Colors.red,
          );
        }
      } else {
        // Création d'un nouvel employé
        final result = await provider.createEmployee(
          username: username,
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          email: _emailController.text.trim(),
          phone: _phoneController.text.trim(),
          address: _addressController.text.trim(),
          password: _passwordController.text,
          storeId: _selectedStoreIds.first,
          roleId: provider.getRoleIdByName(_selectedRole!) ?? 1,
          hireDate: _hireDate!,
          salary: double.tryParse(_salaryController.text),
          emergencyContact: _emergencyContactController.text.trim(),
          photo: _profileImage,
        );

        setState(() => _isSubmitting = false);

        if (mounted && result['status'] == true) {
          final employee = result['employee'];

          if (_selectedStoreIds.length > 1) {
            await provider.assignEmployeeToStores(
              employeeId: employee.id,
              storeIds: _selectedStoreIds,
              permissionType: _selectedRole!.toLowerCase(),
            );
          }

          await provider.loadAllData(storeId: provider.selectedStoreId);
          _showSnackBar('Employé ajouté avec succès', Colors.green);
          widget.onSuccess();
          if (mounted) Navigator.pop(context);
        } else if (mounted) {
          _showSnackBar(
            result['message'] ?? 'Erreur lors de l\'ajout',
            Colors.red,
          );
        }
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      if (mounted) {
        _showSnackBar('Erreur: ${e.toString()}', Colors.red);
      }
    }

  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message), backgroundColor: color));
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: _isSubmitting
                    ? const Center(child: CircularProgressIndicator())
                    : SingleChildScrollView(
                        controller: scrollController,
                        padding: const EdgeInsets.all(16),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            children: [
                              _buildProfileImage(),
                              const SizedBox(height: 24),
                              _buildFirstNameField(),
                              const SizedBox(height: 16),
                              _buildLastNameField(),
                              const SizedBox(height: 16),
                              if (!_isEditing) _buildUsernameField(),
                              const SizedBox(height: 16),
                              _buildEmailField(),
                              const SizedBox(height: 16),
                              _buildPhoneField(),
                              const SizedBox(height: 16),
                              _buildAddressField(),
                              const SizedBox(height: 16),
                              if (!_isEditing) _buildPasswordField(),
                              const SizedBox(height: 16),
                              _buildHireDateField(),
                              const SizedBox(height: 16),
                              _buildRoleDropdown(),
                              const SizedBox(height: 16),
                              _buildStoreSelection(),
                              const SizedBox(height: 16),
                              _buildSalaryField(),
                              const SizedBox(height: 16),
                              _buildEmergencyContactField(),
                              const SizedBox(height: 32),
                              _buildActionButtons(),
                            ],
                          ),
                        ),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade300)),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: Text(
              _isEditing
                  ? LocaleKeys.employeeEditProfileTitle.tr()
                  : "Nouvel employé",
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileImage() {
    return GestureDetector(
      onTap: _pickProfileImage,
      child: Stack(
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: Colors.blue.shade300, width: 3),
              color: Colors.grey.shade200,
            ),
            child: _profileImage != null
                ? ClipOval(
                    child: Image.memory(
                      _profileImage!,
                      width: 120,
                      height: 120,
                      fit: BoxFit.cover,
                    ),
                  )
                : widget.employee?.photoUrl != null
                ? ClipOval(
                    child: Image.network(
                      widget.employee!.photoUrl!,
                      width: 120,
                      height: 120,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Icon(
                        Icons.person,
                        size: 60,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  )
                : Icon(Icons.person, size: 60, color: Colors.grey.shade500),
          ),
          Positioned(
            bottom: 0,
            right: 0,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.blue,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(
                Icons.camera_alt,
                size: 18,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFirstNameField() {
    return TextFormField(
      controller: _firstNameController,
      decoration: const InputDecoration(
        labelText: "Prénom *",
        prefixIcon: Icon(Icons.person),
        border: OutlineInputBorder(),
      ),
      validator: (value) =>
          value == null || value.isEmpty ? 'Le prénom est obligatoire' : null,
    );
  }

  Widget _buildLastNameField() {
    return TextFormField(
      controller: _lastNameController,
      decoration: const InputDecoration(
        labelText: "Nom *",
        prefixIcon: Icon(Icons.person_outline),
        border: OutlineInputBorder(),
      ),
      validator: (value) =>
          value == null || value.isEmpty ? 'Le nom est obligatoire' : null,
    );
  }

  Widget _buildUsernameField() {
    return TextFormField(
      controller: _usernameController,
      decoration: InputDecoration(
        labelText: "Nom d'utilisateur",
        prefixIcon: const Icon(Icons.alternate_email),
        border: const OutlineInputBorder(),
        helperText: "Optionnel - Généré automatiquement si vide",
        suffixIcon: IconButton(
          onPressed: () {
            String username = _generateUsername(
              _firstNameController.text,
              _lastNameController.text,
              _emailController.text,
            );
            _usernameController.text = username;
            setState(() {});
          },
          icon: const Icon(Icons.autorenew),
          tooltip: "Générer un nom d'utilisateur automatiquement",
        ),
      ),
      validator: (value) {
        if (value != null && value.isNotEmpty) {
          if (value.length < 3) return 'Minimum 3 caractères';
          if (!RegExp(r'^[a-zA-Z0-9._-]+$').hasMatch(value)) {
            return 'Lettres, chiffres, . _ - uniquement';
          }
        }
        return null;
      },
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: _emailController,
      decoration: const InputDecoration(
        labelText: 'Email *',
        prefixIcon: Icon(Icons.email),
        border: OutlineInputBorder(),
      ),
      keyboardType: TextInputType.emailAddress,
      validator: (value) {
        if (value == null || value.isEmpty) return 'Veuillez entrer l\'email';
        if (!value.contains('@')) return 'Email invalide';
        return null;
      },
    );
  }

  Widget _buildPhoneField() {
    return TextFormField(
      controller: _phoneController,
      decoration: const InputDecoration(
        labelText: 'Téléphone *',
        prefixIcon: Icon(Icons.phone),
        border: OutlineInputBorder(),
      ),
      keyboardType: TextInputType.phone,
      validator: (value) {
        if (value == null || value.isEmpty)
          return 'Veuillez entrer le numéro de téléphone';
        if (!RegExp(r'^\+?[0-9]{7,15}$').hasMatch(value)) {
          return 'Numéro de téléphone invalide';
        }
        return null;
      },
    );
  }

  Widget _buildAddressField() {
    return TextFormField(
      controller: _addressController,
      decoration: const InputDecoration(
        labelText: 'Adresse',
        prefixIcon: Icon(Icons.location_on),
        border: OutlineInputBorder(),
      ),
      maxLines: 2,
    );
  }

  Widget _buildPasswordField() {
    return Row(
      children: [
        Expanded(
          child: TextFormField(
            controller: _passwordController,
            obscureText: !_showPassword,
            decoration: InputDecoration(
              labelText: "Mot de passe *",
              prefixIcon: const Icon(Icons.lock),
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                icon: Icon(
                  _showPassword ? CupertinoIcons.eye_slash : CupertinoIcons.eye,
                ),
                onPressed: () => setState(() => _showPassword = !_showPassword),
              ),
            ),
            validator: (value) {
              if (value == null || value.isEmpty)
                return 'Veuillez entrer un mot de passe';
              if (value.length < 6) return 'Minimum 6 caractères';
              return null;
            },
          ),
        ),
        const SizedBox(width: 8),
        ElevatedButton(
          onPressed: () => _passwordController.text = generatePassword(),
          child: Text(LocaleKeys.generatePassword.tr()),
        ),
      ],
    );
  }

  Widget _buildHireDateField() {
    return GestureDetector(
      onTap: _selectHireDate,
      child: AbsorbPointer(
        child: TextFormField(
          decoration: const InputDecoration(
            labelText: "Date d'embauche *",
            prefixIcon: Icon(Icons.calendar_today),
            border: OutlineInputBorder(),
          ),
          controller: TextEditingController(
            text: _hireDate != null
                ? DateFormat('dd/MM/yyyy').format(_hireDate!)
                : '',
          ),
          validator: (value) => _hireDate == null
              ? 'Veuillez sélectionner la date d\'embauche'
              : null,
        ),
      ),
    );
  }

  Widget _buildRoleDropdown() {
    return DropdownButtonFormField<String>(
      value: _selectedRole,
      decoration: const InputDecoration(
        labelText: "Rôle *",
        prefixIcon: Icon(Icons.work),
        border: OutlineInputBorder(),
      ),
      isExpanded: true,
      items: [
        const DropdownMenuItem<String>(
          value: null,
          child: Text("Sélectionnez un rôle"),
        ),
        ..._availableRoles.map((role) {
          return DropdownMenuItem<String>(
            value: role['name'],
            child: Row(
              children: [
                Expanded(child: Text(role['name'])),
                if (role['can_access_multiple_stores'] == true)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text('Multi', style: TextStyle(fontSize: 10)),
                  ),
              ],
            ),
          );
        }),
      ],
      onChanged: (value) {
        setState(() {
          _selectedRole = value;
          _updateMultipleStoreSelection(value);
        });
      },
      validator: (value) =>
          value == null ? 'Veuillez sélectionner un rôle' : null,
    );
  }

  Widget _buildStoreSelection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              _canSelectMultipleStores
                  ? "Boutiques * (sélection multiple)"
                  : "Boutique *",
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            if (_canSelectMultipleStores)
              Container(
                margin: const EdgeInsets.only(left: 8),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.shade100,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Multi-sélection',
                  style: TextStyle(fontSize: 10),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (_canSelectMultipleStores)
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.accessibleStores.length,
              itemBuilder: (context, index) {
                final store = widget.accessibleStores[index];
                final isSelected = _selectedStoreIds.contains(
                  store.boutique.id,
                );
                return CheckboxListTile(
                  title: Text(store.boutique.name),
                  subtitle: Text(store.boutique.address.city),
                  value: isSelected,
                  onChanged: (selected) {
                    setState(() {
                      if (selected == true) {
                        _selectedStoreIds.add(store.boutique.id);
                      } else {
                        _selectedStoreIds.remove(store.boutique.id);
                      }
                    });
                  },
                  dense: true,
                  controlAffinity: ListTileControlAffinity.leading,
                );
              },
            ),
          )
        else
          DropdownButtonFormField<int>(
            value: _selectedStoreIds.isNotEmpty
                ? _selectedStoreIds.first
                : null,
            decoration: const InputDecoration(
              hintText: "Sélectionnez une boutique",
              border: OutlineInputBorder(),
            ),
            items: [
              const DropdownMenuItem<int>(
                value: null,
                child: Text("Sélectionnez une boutique"),
              ),
              ...widget.accessibleStores.map(
                (store) => DropdownMenuItem<int>(
                  value: store.boutique.id,
                  child: Text(store.boutique.name),
                ),
              ),
            ],
            onChanged: (value) {
              setState(() {
                if (value != null) {
                  _selectedStoreIds = [value];
                } else {
                  _selectedStoreIds = [];
                }
              });
            },
            validator: (value) => _selectedStoreIds.isEmpty
                ? 'Veuillez sélectionner une boutique'
                : null,
          ),
        if (_canSelectMultipleStores && _selectedStoreIds.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              "${_selectedStoreIds.length} boutique(s) sélectionnée(s)",
              style: TextStyle(fontSize: 12, color: Colors.green.shade700),
            ),
          ),
      ],
    );
  }

  Widget _buildSalaryField() {
    return TextFormField(
      controller: _salaryController,
      decoration: InputDecoration(
        labelText: 'Salaire',
        prefixText: '${config!.symbol} ',
        prefixIcon: const Icon(Icons.monetization_on),
        border: const OutlineInputBorder(),
        suffixText: '/mois',
      ),
      keyboardType: TextInputType.number,
    );
  }

  Widget _buildEmergencyContactField() {
    return TextFormField(
      controller: _emergencyContactController,
      decoration: const InputDecoration(
        labelText: 'Contact d\'urgence',
        prefixIcon: Icon(Icons.emergency),
        border: OutlineInputBorder(),
      ),
      keyboardType: TextInputType.phone,
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocaleKeys.commonCancel.tr()),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
            child: Text(
              _isEditing
                  ? LocaleKeys.commonUpdate.tr()
                  : LocaleKeys.commonSave.tr(),
            ),
          ),
        ),
      ],
    );
  }
}
