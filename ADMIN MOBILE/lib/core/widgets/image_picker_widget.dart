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

  Future<void> _pickImage() async {
    if (Platform.isWindows) {
      await _pickImageWindows();
    } else {
      await _showImageSourceDialog();
    }
  }

  // Dans _ImagePickerWidgetState, ajoutez cette méthode
  ImageProvider _getImageProvider(String path) {
    if (path.startsWith('http')) {
      return NetworkImage(path);
    } else {
      return FileImage(File(path));
    }
  }

  Future<void> _pickImageWindows() async {
    const XTypeGroup typeGroup = XTypeGroup(
      label: 'Images',
      extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
    );
    final files = await openFiles(acceptedTypeGroups: [typeGroup]);
    if (files.isNotEmpty) {
      setState(() {
        if (widget.allowMultiple) {
          _selectedImages.addAll(files);
        } else {
          _selectedImages = files.take(1).toList();
        }
      });
      widget.onImagesSelected(_selectedImages);
    }
  }

  Future<void> _showImageSourceDialog() async {
    // Vérification des permissions sur mobile
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
      // Sélection multiple depuis la galerie
      final pickedFiles = await picker.pickMultiImage(
        maxWidth: null,
        maxHeight: null,
        imageQuality: 85,
      );
      if (pickedFiles.isNotEmpty) {
        setState(() {
          _selectedImages.addAll(pickedFiles);
        });
        widget.onImagesSelected(_selectedImages);
      }
    } else {
      // Choix entre galerie et caméra
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_selectedImages.isNotEmpty)
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection: widget.scrollDirection,
              itemCount: _selectedImages.length,
              itemBuilder: (context, index) {
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Container(
                      width: 120,
                      height: 120,
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
                            child: const Icon(
                              Icons.close,
                              size: 16,
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
          widget.customAddButton ??
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  width: double.infinity,
                  height: 100,
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
                        size: 40,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Ajouter une image (${_selectedImages.length}/${widget.maxImages})',
                        style: TextStyle(color: Theme.of(context).primaryColor),
                      ),
                    ],
                  ),
                ),
              ),
      ],
    );
  }
}
