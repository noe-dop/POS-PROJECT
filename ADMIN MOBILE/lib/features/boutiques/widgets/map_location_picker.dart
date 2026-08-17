import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:easy_localization/easy_localization.dart';

class MapLocationPicker extends StatefulWidget {
  final LatLng? initialLocation;
  final ValueChanged<LatLng>? onLocationSelected;
  
  const MapLocationPicker({
    super.key,
    this.initialLocation,
    this.onLocationSelected,
  });

  @override
  State<MapLocationPicker> createState() => _MapLocationPickerState();
}

class _MapLocationPickerState extends State<MapLocationPicker> {
  late MapController _mapController;
  LatLng? _selectedLocation;
  bool _isLoading = true;
  String _address = '';
  String _error = '';

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _initializeLocation();
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _initializeLocation() async {
    try {
      // Vérifier si le service de localisation est activé
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _error = 'Le service de localisation est désactivé. Veuillez l\'activer.'.tr();
          _selectedLocation = widget.initialLocation ?? const LatLng(48.8566, 2.3522);
        });
        return;
      }

      // Demander la permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _error = 'Les permissions de localisation ont été refusées.'.tr();
            _selectedLocation = widget.initialLocation ?? const LatLng(48.8566, 2.3522);
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _error = 'Les permissions de localisation sont définitivement refusées.'.tr();
          _selectedLocation = widget.initialLocation ?? const LatLng(48.8566, 2.3522);
        });
        return;
      }

      // Obtenir la position
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );

      setState(() {
        _selectedLocation = LatLng(position.latitude, position.longitude);
      });

      // Récupérer l'adresse
      await _getAddressFromCoordinates(_selectedLocation!);
      
    } catch (e) {
      setState(() {
        _error = 'Erreur lors de l\'obtention de la position: $e'.tr();
        _selectedLocation = widget.initialLocation ?? const LatLng(48.8566, 2.3522);
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _getAddressFromCoordinates(LatLng location) async {
    try {
      final placemarks = await placemarkFromCoordinates(
        location.latitude,
        location.longitude,
      );
      
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        setState(() {
          _address = [
            placemark.street,
            placemark.subThoroughfare,
            placemark.thoroughfare,
            placemark.postalCode,
            placemark.locality,
            placemark.country,
          ].where((part) => part != null && part.isNotEmpty).join(', ');
        });
      }
    } catch (e) {
      print('Erreur adresse: $e');
    }
  }

  void _onMapTap(TapPosition tapPosition, LatLng latlng) {
    setState(() {
      _selectedLocation = latlng;
    });
    widget.onLocationSelected?.call(latlng);
    _getAddressFromCoordinates(latlng);
  }

  Future<void> _goToMyLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
      );
      final location = LatLng(position.latitude, position.longitude);
      
      setState(() {
        _selectedLocation = location;
      });
      
      // Déplacer la carte
      _mapController.move(location, 15.0);
      
      await _getAddressFromCoordinates(location);
      widget.onLocationSelected?.call(location);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Impossible d\'obtenir votre position: $e'.tr())),
      );
    }
  }

  Widget _buildError() {
    if (_error.isEmpty) return Container();
    
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.orange[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.orange[100]!),
        ),
        child: Row(
          children: [
            Icon(Icons.warning, color: Colors.orange[700]),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _error,
                style: TextStyle(color: Colors.orange[700]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final initialLocation = _selectedLocation ?? const LatLng(48.8566, 2.3522);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Sélectionner un emplacement'.tr()),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: _goToMyLocation,
            tooltip: 'Aller à ma position'.tr(),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Message d'erreur
                _buildError(),
                
                // Carte
                Expanded(
                  child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: initialLocation,
                      initialZoom: 13.0,
                      onTap: _onMapTap,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.nsp.pos',
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _selectedLocation!,
                            width: 50,
                            height: 50,
                            child: const Icon(
                              Icons.location_pin,
                              color: Colors.red,
                              size: 50,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Infos de localisation
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Coordonnées:'.tr(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_selectedLocation!.latitude.toStringAsFixed(6)}, ${_selectedLocation!.longitude.toStringAsFixed(6)}',
                        style: const TextStyle(fontSize: 16),
                      ),
                      if (_address.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          'Adresse:'.tr(),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _address,
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pop(context, {
                              'latitude': _selectedLocation!.latitude,
                              'longitude': _selectedLocation!.longitude,
                              'address': _address,
                            });
                          },
                          child: Text('Utiliser cet emplacement'.tr()),
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