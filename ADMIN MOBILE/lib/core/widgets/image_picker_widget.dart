// core/widgets/image_picker_widget.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_selector/file_selector.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';
import 'package:permission_handler/permission_handler.dart';

typedef ImagesSelectedCallback = void Function(List<XFile> images);

class ImagePickerWidget extends StatefulWidget {
  final List<XFile>? initialImages;
  final int maxImages;
  final bool allowMultiple;
  final double? aspectRatio;
  final ImagesSelectedCallback onImagesSelected;
  final bool showRemoveButton;
  final Axis scrollDirection;
  final Widget? customAddButton;

  const ImagePickerWidget({
    super.key,
    this.initialImages,
    this.maxImages = 5,
    this.allowMultiple = true,
    this.aspectRatio,
    required this.onImagesSelected,
    this.showRemoveButton = true,
    this.scrollDirection = Axis.horizontal,
    this.customAddButton,
  });

  @override
  State<ImagePickerWidget> createState() => _ImagePickerWidgetState();
}

class _ImagePickerWidgetState extends State<ImagePickerWidget> {
  List<XFile> _selectedImages = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialImages != null) {
      _selectedImages = List.from(widget.initialImages!);
    }
  }

  Future<void> pickImage() async {
    if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
      await _pickImageDesktop();
    } else {
      await _showImageSourceDialog();
    }
  }

  ImageProvider _getImageProvider(String path) {
    if (path.startsWith('http')) {
      return NetworkImage(path);
    } else {
      return FileImage(File(path));
    }
  }

  Future<void> _pickImageDesktop() async {
    const XTypeGroup typeGroup = XTypeGroup(
      label: 'Images',
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    );
    final files = await openFiles(acceptedTypeGroups: [typeGroup]);
    if (files.isNotEmpty) {
      final remainingSlots = widget.maxImages - _selectedImages.length;

      if (remainingSlots <= 0) {
        if (mounted) {
          NotificationService.showWarning(
            context,
            "Vous avez déjà atteint la limite de ${widget.maxImages} image(s)",
          );
        }
        return;
      }

      List<XFile> filesToAdd;
      if (widget.allowMultiple) {
        filesToAdd = files.take(remainingSlots).toList();

        if (files.length > remainingSlots && mounted) {
          NotificationService.showInfo(
            context,
            "Seulement $remainingSlots image(s) sur ${files.length} ont été ajoutées (limite: ${widget.maxImages})",
          );
        }
      } else {
        filesToAdd = files.take(1).toList();
      }

      setState(() {
        if (widget.allowMultiple) {
          _selectedImages.addAll(filesToAdd);
        } else {
          _selectedImages = filesToAdd;
        }
      });
      widget.onImagesSelected(_selectedImages);
    }
  }

  Future<void> _showImageSourceDialog() async {
    if (Platform.isAndroid || Platform.isIOS) {
      final status = await Permission.photos.request();
      if (!status.isGranted) {
        if (mounted) {
          NotificationService.showError(context, "Accès aux photos requis");
        }
        return;
      }
    }

    final ImagePicker picker = ImagePicker();
    if (widget.allowMultiple) {
      final pickedFiles = await picker.pickMultiImage(
        maxWidth: null,
        maxHeight: null,
        imageQuality: 85,
      );
      if (pickedFiles.isNotEmpty) {
        // Vérifier la limite sur mobile aussi
        final remainingSlots = widget.maxImages - _selectedImages.length;
        if (remainingSlots <= 0) {
          if (mounted) {
            NotificationService.showWarning(
              context,
              "Vous avez déjà atteint la limite de ${widget.maxImages} image(s)",
            );
          }
          return;
        }

        final filesToAdd = pickedFiles.take(remainingSlots).toList();

        if (pickedFiles.length > remainingSlots && mounted) {
          NotificationService.showInfo(
            context,
            "Seulement $remainingSlots image(s) sur ${pickedFiles.length} ont été ajoutées (limite: ${widget.maxImages})",
          );
        }

        setState(() {
          _selectedImages.addAll(filesToAdd);
        });
        widget.onImagesSelected(_selectedImages);
      }
    } else {
      showModalBottomSheet(
        context: context,
        builder: (context) {
          return SafeArea(
            child: Wrap(
              children: [
                ListTile(
                  leading: const Icon(Icons.photo_library),
                  title: const Text('Choisir depuis la galerie'),
                  onTap: () async {
                    Navigator.pop(context);
                    final file = await picker.pickImage(
                      source: ImageSource.gallery,
                      maxWidth: null,
                      maxHeight: null,
                      imageQuality: 85,
                    );
                    if (file != null) {
                      setState(() {
                        _selectedImages = [file];
                      });
                      widget.onImagesSelected(_selectedImages);
                    }
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.camera_alt),
                  title: const Text('Prendre une photo'),
                  onTap: () async {
                    Navigator.pop(context);
                    final file = await picker.pickImage(
                      source: ImageSource.camera,
                      maxWidth: null,
                      maxHeight: null,
                      imageQuality: 85,
                    );
                    if (file != null) {
                      setState(() {
                        _selectedImages = [file];
                      });
                      widget.onImagesSelected(_selectedImages);
                    }
                  },
                ),
              ],
            ),
          );
        },
      );
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
    widget.onImagesSelected(_selectedImages);
  }

  @override
  Widget build(BuildContext context) {
    final canAddMore = _selectedImages.length < widget.maxImages;

    // Dimensions responsives basées sur la plateforme et la taille de l'écran
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth < 600;
    final isDesktop =
        Platform.isWindows || Platform.isMacOS || Platform.isLinux;

    // Ajuster les dimensions selon la plateforme
    double imageSize;
    double buttonHeight;
    double iconSize;
    double fontSize;
    double closeIconSize;
    EdgeInsetsGeometry padding;

    if (isDesktop) {
      imageSize = 120;
      buttonHeight = 100;
      iconSize = 40;
      fontSize = 12;
      closeIconSize = 16;
      padding = const EdgeInsets.all(8);
    } else if (isMobile) {
      imageSize = 80; // Plus petit sur mobile
      buttonHeight = 70;
      iconSize = 32;
      fontSize = 11;
      closeIconSize = 12;
      padding = const EdgeInsets.symmetric(vertical: 4);
    } else {
      imageSize = 100; // Tablette
      buttonHeight = 85;
      iconSize = 36;
      fontSize = 12;
      closeIconSize = 14;
      padding = const EdgeInsets.all(6);
    }

    // Appliquer l'aspectRatio si défini
    double imageHeight = imageSize;
    double imageWidth = imageSize;

    if (widget.aspectRatio != null) {
      imageWidth = imageSize;
      imageHeight = imageSize / widget.aspectRatio!;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize:
          MainAxisSize.min, // IMPORTANT : permet au parent de scroller
      children: [
        if (_selectedImages.isNotEmpty)
          SizedBox(
            height: imageHeight + 20,
            child: ListView.builder(
              scrollDirection: widget.scrollDirection,
              itemCount: _selectedImages.length,
              padding: padding,
              itemBuilder: (context, index) {
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: imageWidth,
                      height: imageHeight,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade300),
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: _getImageProvider(_selectedImages[index].path),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                    if (widget.showRemoveButton)
                      Positioned(
                        top: -4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () => _removeImage(index),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.close,
                              size: closeIconSize,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        const SizedBox(height: 8),
        if (canAddMore)
          widget.customAddButton != null
              ? GestureDetector(onTap: pickImage, child: widget.customAddButton)
              : GestureDetector(
                  onTap: pickImage,
                  child: Container(
                    width: double.infinity,
                    height: buttonHeight,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_photo_alternate,
                          color: Theme.of(context).primaryColor,
                          size: iconSize,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Ajouter une image (${_selectedImages.length}/${widget.maxImages})',
                          style: TextStyle(
                            color: Theme.of(context).primaryColor,
                            fontSize: fontSize,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
      ],
    );
  }
}
