import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:nsp_pos_mobile/core/widgets/image_picker_widget.dart';
import 'package:nsp_pos_mobile/features/produits/service/product_service.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/variante_model.dart';
import 'package:provider/provider.dart';

class VariantFormWidget extends StatefulWidget {
  final int productId;
  final int storeId;
  final Variant? variant;
  final VoidCallback onVariantCreated;

  const VariantFormWidget({
    super.key,
    required this.productId,
    required this.storeId,
    this.variant,
    required this.onVariantCreated,
  });

  @override
  State<VariantFormWidget> createState() => _VariantFormWidgetState();
}

class _VariantFormWidgetState extends State<VariantFormWidget> {
  final _formKey = GlobalKey<FormState>();

  // Controllers
  late final TextEditingController _barcodeController;
  late final TextEditingController _nameController;
  late final TextEditingController _quantityController;
  late final TextEditingController _salePrice1Controller; // Prix global
  late final TextEditingController _storePriceController; // Prix boutique
  late final TextEditingController _storeOnlinePriceController; // Prix en ligne
  late final TextEditingController _salePrice2Controller; // Prix promotionnel

  // State
  List<XFile> _selectedImages = [];
  bool _isSubmitting = false;
  bool _isEditing = false;
  bool _isLinked = false;

  // Focus nodes pour la navigation
  final FocusNode _barcodeFocus = FocusNode();
  final FocusNode _nameFocus = FocusNode();
  final FocusNode _quantityFocus = FocusNode();
  final FocusNode _salePrice1Focus = FocusNode();
  final FocusNode _storePriceFocus = FocusNode();
  final FocusNode _storeOnlinePriceFocus = FocusNode();
  final FocusNode _salePrice2Focus = FocusNode();

  @override
  void initState() {
    super.initState();
    _isEditing = widget.variant != null;
    _isLinked = widget.variant?.isLinkedToStore ?? false;

    _initControllers();
  }

  void _initControllers() {
    final v = widget.variant;

    // Champs de la variante globale (NON MODIFIABLES)
    _barcodeController = TextEditingController(text: v?.barcode ?? '');
    _nameController = TextEditingController(text: v?.name ?? '');
    _quantityController = TextEditingController(
      text: (v?.quantity ?? 0).toString(),
    );
    _salePrice1Controller = TextEditingController(
      text: v?.salePrice1.toString() ?? '',
    );

    // Champs de la boutique (MODIFIABLES)
    _storePriceController = TextEditingController(
      text: v?.storeVariantPrice?.toString() ?? '',
    );
    _storeOnlinePriceController = TextEditingController(
      text: v?.storeOnlinePrice?.toString() ?? '',
    );
    _salePrice2Controller = TextEditingController(
      text: v?.prixReduction?.toString() ?? '',
    );

    // Initialiser l'image
    if (v?.hasValidImage == true) {
      _selectedImages = [XFile(v!.imageUrl!)];
    }
  }

  @override
  void dispose() {
    _barcodeController.dispose();
    _nameController.dispose();
    _quantityController.dispose();
    _salePrice1Controller.dispose();
    _storePriceController.dispose();
    _storeOnlinePriceController.dispose();
    _salePrice2Controller.dispose();
    _barcodeFocus.dispose();
    _nameFocus.dispose();
    _quantityFocus.dispose();
    _salePrice1Focus.dispose();
    _storePriceFocus.dispose();
    _storeOnlinePriceFocus.dispose();
    _salePrice2Focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: 650,
        constraints: const BoxConstraints(maxHeight: 700),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(),
              const SizedBox(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildImageSection(),
                      const SizedBox(height: 20),
                      _buildGlobalVariantFields(),
                      const Divider(height: 32),
                      if (_isLinked) _buildStoreVariantFields(),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              _buildActionButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _isEditing ? 'Modifier la variante' : 'Nouvelle variante',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (_isEditing && _isLinked) ...[
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'Variante liée à la boutique',
                    style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
                  ),
                ),
              ],
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ],
    );
  }

  Widget _buildImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ImagePickerWidget(
          initialImages: _selectedImages.isEmpty ? null : _selectedImages,
          maxImages: 1,
          allowMultiple: false,
          onImagesSelected: (images) {
            setState(() => _selectedImages = images);
          },
          showRemoveButton: !_isEditing || (_isEditing && !_isLinked),
          customAddButton: Container(
            height: 120,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey.shade50,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.add_photo_alternate,
                  color: Theme.of(context).primaryColor,
                  size: 40,
                ),
                const SizedBox(height: 8),
                Text(
                  'Cliquez pour ajouter une image',
                  style: TextStyle(
                    color: Theme.of(context).primaryColor,
                    fontSize: 12,
                  ),
                ),
                Text(
                  '(Optionnel)',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 10),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildGlobalVariantFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Icon(Icons.inventory, size: 20, color: Colors.grey.shade600),
              const SizedBox(width: 8),
              Text(
                'Informations globales ${_isLinked ? '(non modifiables)' : ''}',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey.shade700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // Code barre
        TextFormField(
          controller: _barcodeController,
          focusNode: _barcodeFocus,
          enabled: !_isLinked,
          validator: _isLinked ? null : _validateBarcode,
          decoration: InputDecoration(
            labelText: 'Code barre *',
            hintText: 'Code unique de la variante',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.qr_code),
            suffixIcon: !_isLinked
                ? IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: _generateBarcode,
                    tooltip: 'Générer un code barre',
                  )
                : null,
            filled: true,
            fillColor: _isLinked ? Colors.grey.shade50 : Colors.white,
            errorMaxLines: 2,
          ),
        ),
        const SizedBox(height: 16),

        // Nom
        TextFormField(
          controller: _nameController,
          focusNode: _nameFocus,
          enabled: !_isLinked,
          validator: _isLinked ? null : _validateName,
          decoration: InputDecoration(
            labelText: 'Nom de la variante *',
            hintText: 'Ex: Pack 6 bouteilles, Format 500ml',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.label),
            filled: true,
            fillColor: _isLinked ? Colors.grey.shade50 : Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Quantité avec support décimal
        TextFormField(
          controller: _quantityController,
          focusNode: _quantityFocus,
          enabled: !_isLinked,
          validator: _isLinked ? null : _validateQuantity,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            _DecimalTextInputFormatter(),
          ],
          decoration: InputDecoration(
            labelText: "Quantité d'item *",
            hintText: 'Ex: 1, 0.5, 0.33, 2.5',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.inventory),
            helperText: 'Nombre d\'unités',
            suffixIcon: !_isLinked
                ? PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) {
                      _insertDecimalPoint();
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'decimal',
                        child: Row(
                          children: [
                            Icon(Icons.pin, size: 18),
                            SizedBox(width: 8),
                            Text('Insérer un point décimal .'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'clear',
                        child: Row(
                          children: [
                            Icon(Icons.clear, size: 18),
                            SizedBox(width: 8),
                            Text('Effacer le champ'),
                          ],
                        ),
                      ),
                    ],
                  )
                : null,
            filled: true,
            fillColor: _isLinked ? Colors.grey.shade50 : Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Prix global
        TextFormField(
          controller: _salePrice1Controller,
          focusNode: _salePrice1Focus,
          enabled: !_isLinked,
          validator: _isLinked ? null : _validatePrice,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Prix global (prix fabricant) *',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.attach_money),
            prefixText: 'FCFA ',
            helperText: 'Prix d\'achat ou prix de base',
            filled: true,
            fillColor: _isLinked ? Colors.grey.shade50 : Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildStoreVariantFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Icon(Icons.store, size: 20, color: Colors.blue.shade600),
              const SizedBox(width: 8),
              Text(
                'Paramètres spécifiques à la boutique',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue.shade700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // Prix boutique
        TextFormField(
          controller: _storePriceController,
          focusNode: _storePriceFocus,
          validator: _validateStorePrice,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Prix boutique *',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.storefront),
            prefixText: 'FCFA ',
            helperText: 'Prix de vente en magasin physique',
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Prix en ligne
        TextFormField(
          controller: _storeOnlinePriceController,
          focusNode: _storeOnlinePriceFocus,
          validator: _validateOnlinePrice,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Prix en ligne *',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.shopping_cart),
            prefixText: 'FCFA ',
            helperText: 'Prix de vente en ligne (doit être ≥ prix boutique)',
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Prix promotionnel
        TextFormField(
          controller: _salePrice2Controller,
          focusNode: _salePrice2Focus,
          validator: _validatePromotionPrice,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            labelText: 'Prix promotionnel',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.local_offer),
            prefixText: 'FCFA ',
            helperText: 'Prix en promotion (optionnel, doit être ≤ prix boutique)',
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Informations sur la hiérarchie des prix
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue.shade700),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Hiérarchie des prix :',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade800,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.only(left: 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildPriceRule(
                      'Prix promotionnel',
                      '≤',
                      'Prix boutique',
                      Colors.green,
                    ),
                    const SizedBox(height: 4),
                    _buildPriceRule(
                      'Prix boutique',
                      '≤',
                      'Prix en ligne',
                      Colors.orange,
                    ),
                    const SizedBox(height: 4),
                    _buildPriceRule(
                      'Prix en ligne',
                      '≥',
                      'Prix boutique',
                      Colors.blue,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Note: Le prix en ligne est généralement plus élevé que le prix boutique pour couvrir les frais de livraison.',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.amber.shade800,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.amber.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.shade200),
          ),
          child: Row(
            children: [
              Icon(Icons.info_outline, color: Colors.amber.shade700),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Les informations globales (code barre, nom, quantité par paquet) ne peuvent pas être modifiées. '
                  'Pour changer ces informations, créez une nouvelle variante.',
                  style: TextStyle(fontSize: 12, color: Colors.amber.shade800),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPriceRule(String label, String operator, String reference, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '$label $operator $reference',
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey.shade700,
          ),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        const SizedBox(width: 12),
        ElevatedButton(
          onPressed: _isSubmitting ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            minimumSize: const Size(120, 40),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Text(_isEditing ? 'Mettre à jour' : 'Créer'),
        ),
      ],
    );
  }

  // ==================== VALIDATIONS ====================

  String? _validateBarcode(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Le code barre est requis';
    }
    if (value.trim().length < 7) {
      return 'Le code barre doit contenir au moins 7 caractères';
    }
    return null;
  }

  String? _validateName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Le nom de la variante est requis';
    }
    if (value.trim().length < 4) {
      return 'Le nom doit contenir au moins 4 caractères';
    }
    return null;
  }

  String? _validateQuantity(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'La quantité est requise';
    }

    String normalizedValue = value.trim().replaceAll(',', '.');

    try {
      double quantity = double.parse(normalizedValue);
      if (quantity <= 0) {
        return 'La quantité doit être supérieure à 0';
      }
      if (quantity > 1000) {
        return 'La quantité ne peut pas dépasser 1000';
      }
      if (normalizedValue.contains('.')) {
        int decimals = normalizedValue.split('.')[1].length;
        if (decimals > 3) {
          return 'Maximum 3 décimales autorisées';
        }
      }
      return null;
    } catch (e) {
      return 'Veuillez entrer un nombre valide (ex: 1, 0.5, 2.5)';
    }
  }

  String? _validatePrice(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Le prix est requis';
    }

    String normalizedValue = value.trim().replaceAll(',', '.');

    try {
      double price = double.parse(normalizedValue);
      if (price <= 0) {
        return 'Le prix doit être supérieur à 0';
      }
      if (price > 10000000) {
        return 'Le prix ne peut pas dépasser 10 000 000 FCFA';
      }
      return null;
    } catch (e) {
      return 'Veuillez entrer un prix valide';
    }
  }

  String? _validateStorePrice(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Le prix boutique est requis';
    }

    String normalizedValue = value.trim().replaceAll(',', '.');

    try {
      double price = double.parse(normalizedValue);
      if (price <= 0) {
        return 'Le prix doit être supérieur à 0';
      }
      if (price > 10000000) {
        return 'Le prix ne peut pas dépasser 10 000 000 FCFA';
      }
      return null;
    } catch (e) {
      return 'Veuillez entrer un prix valide';
    }
  }

  String? _validateOnlinePrice(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Le prix en ligne est requis';
    }

    String normalizedValue = value.trim().replaceAll(',', '.');

    try {
      double onlinePrice = double.parse(normalizedValue);
      if (onlinePrice <= 0) {
        return 'Le prix en ligne doit être supérieur à 0';
      }
      if (onlinePrice > 10000000) {
        return 'Le prix ne peut pas dépasser 10 000 000 FCFA';
      }

      // Vérifier que le prix en ligne est >= prix boutique
      if (_storePriceController.text.trim().isNotEmpty) {
        double storePrice = double.parse(
          _storePriceController.text.trim().replaceAll(',', '.'),
        );
        if (onlinePrice < storePrice) {
          return 'Le prix en ligne doit être supérieur ou égal au prix boutique (${storePrice.toStringAsFixed(2)} FCFA)';
        }
      }

      return null;
    } catch (e) {
      return 'Veuillez entrer un prix valide';
    }
  }

  String? _validatePromotionPrice(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null; // Optionnel
    }

    String normalizedValue = value.trim().replaceAll(',', '.');

    try {
      double promotionPrice = double.parse(normalizedValue);
      if (promotionPrice <= 0) {
        return 'Le prix promotionnel doit être supérieur à 0';
      }

      // Vérifier que le prix promotionnel est inférieur ou égal au prix boutique
      if (_storePriceController.text.trim().isNotEmpty) {
        double storePrice = double.parse(
          _storePriceController.text.trim().replaceAll(',', '.'),
        );
        if (promotionPrice > storePrice) {
          return 'Le prix promotionnel doit être inférieur ou égal au prix boutique (${storePrice.toStringAsFixed(2)} FCFA)';
        }
      }

      return null;
    } catch (e) {
      return 'Veuillez entrer un prix valide';
    }
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  void _insertDecimalPoint() {
    final text = _quantityController.text;
    final selection = _quantityController.selection;

    if (text.contains('.') || text.contains(',')) {
      _showSnackBar('Un séparateur décimal existe déjà', isError: false);
      return;
    }

    final newText = '$text.';
    _quantityController.value = TextEditingValue(
      text: newText,
      selection: TextSelection.collapsed(offset: newText.length),
    );
  }

  Future<void> _generateBarcode() async {
    try {
      final provider = context.read<ProductProvider>();
      final response = await provider.generateCode();

      if (response['barcode'] != null) {
        _barcodeController.text = response['barcode'].toString();
        _showSnackBar('Code barre généré avec succès', isError: false);
      } else {
        _showSnackBar('Erreur lors de la génération', isError: true);
      }
    } catch (e) {
      _showSnackBar(
        'Erreur lors de la génération du code barre',
        isError: true,
      );
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _submit() async {
    // Valider le formulaire
    if (!_formKey.currentState!.validate()) {
      _showSnackBar(
        'Veuillez remplir tous les champs obligatoires',
        isError: true,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final provider = context.read<ProductProvider>();
      final Map<String, dynamic> response;

      final image = _selectedImages.isNotEmpty ? _selectedImages.first : null;

      // Normaliser la quantité (remplacer virgule par point)
      String quantityText = _quantityController.text.trim().replaceAll(',', '.');
      double quantity = double.parse(quantityText);

      // Normaliser les prix
      String salePrice1Text = _salePrice1Controller.text.trim().replaceAll(',', '.');
      double salePrice1 = double.parse(salePrice1Text);

      if (!_isEditing) {
        // CRÉATION d'une nouvelle variante
        final variantData = {
          'barcode': _barcodeController.text.trim(),
          'name': _nameController.text.trim(),
          'quantity': quantity,
          'sale_price_1': salePrice1,
          'store_base_price': _storePriceController.text.trim().isNotEmpty
              ? double.parse(
                  _storePriceController.text.trim().replaceAll(',', '.'),
                )
              : null,
          'store_online_price': _storeOnlinePriceController.text.trim().isNotEmpty
              ? double.parse(
                  _storeOnlinePriceController.text.trim().replaceAll(',', '.'),
                )
              : null,
        };

        response = await provider.createAndLinkVariant(
          productId: widget.productId,
          storeId: widget.storeId,
          variantData: variantData,
          image: image,
        );
        
        if (mounted) {
          if (response['status'] == true) {
            Navigator.pop(context);
            widget.onVariantCreated();
            _showSnackBar(response['message']);
          } else {
            NotificationService.showError(context, response['message']);
          }
        }
      } else {
        // MISE À JOUR - Seulement les champs boutique
        response = await provider.updateStoreVariant(
          storeVariantId: widget.variant!.storeVariantId!,
          storePrice: _storePriceController.text.trim().isNotEmpty
              ? double.parse(
                  _storePriceController.text.trim().replaceAll(',', '.'),
                )
              : null,
          storeOnlinePrice: _storeOnlinePriceController.text.trim().isNotEmpty
              ? double.parse(
                  _storeOnlinePriceController.text.trim().replaceAll(',', '.'),
                )
              : null,
          prixReduction: _salePrice2Controller.text.trim().isNotEmpty
              ? double.parse(
                  _salePrice2Controller.text.trim().replaceAll(',', '.'),
                )
              : null,
          image: image,
        );
      }

      if (mounted) {
        if (response['status'] == true) {
          Navigator.pop(context);
          widget.onVariantCreated();
          _showSnackBar(response['message']);
        } else {
          _showSnackBar(response['message'], isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Une erreur est survenue: $e', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }
}

// ==================== FORMATTER PERSONNALISÉ ====================

class _DecimalTextInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Permettre la suppression
    if (newValue.text.isEmpty) {
      return newValue;
    }

    // Remplacer les virgules par des points
    String text = newValue.text.replaceAll(',', '.');

    // Ne permettre qu'un seul point décimal
    final parts = text.split('.');
    if (parts.length > 2) {
      return oldValue;
    }

    // Permettre les nombres négatifs ? Non, on veut uniquement positifs
    // Mais on autorise le point seul pour permettre la saisie
    if (text == '.') {
      return newValue;
    }

    // Vérifier que c'est un nombre valide (ou en cours de saisie)
    final regex = RegExp(r'^\d*\.?\d*$');
    if (!regex.hasMatch(text)) {
      return oldValue;
    }

    // Limiter à 3 décimales
    if (parts.length == 2 && parts[1].length > 3) {
      return oldValue;
    }

    return newValue.copyWith(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}