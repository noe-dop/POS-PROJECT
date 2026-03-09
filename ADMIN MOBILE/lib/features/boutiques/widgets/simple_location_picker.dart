import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:nsp_pos_mobile/core/services/notifications.dart';

class SimpleLocationPicker extends StatefulWidget {
  final Function(double lat, double lng, String address)? onLocationSelected;

  const SimpleLocationPicker({super.key, this.onLocationSelected});

  @override
  State<SimpleLocationPicker> createState() => _SimpleLocationPickerState();
}

class _SimpleLocationPickerState extends State<SimpleLocationPicker> {
  double? _latitude;
  double? _longitude;
  String _address = '';
  String _city = '';
  String _state = '';
  String _postalCode = '';
  String _street = '';
  String _country = '';
  bool _isLoading = false;
  String _error = '';

  Future<void> _getCurrentLocation() async {
    setState(() {
      _isLoading = true;
      _error = '';
    });

    try {
      // Vérifier si le service de localisation est activé
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _error =
              'Le service de localisation est désactivé. Veuillez l\'activer.'
                  .tr();
          _isLoading = false;
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
            _isLoading = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _error =
              'Les permissions de localisation sont définitivement refusées. Veuillez les activer dans les paramètres.'
                  .tr();
          _isLoading = false;
        });
        return;
      }

      // Obtenir la position
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.best, 
      );

      // Vérifier si les coordonnées sont valides
      if (position.latitude == 0.0 && position.longitude == 0.0) {
        setState(() {
          _error = 'Impossible d\'obtenir une position valide'.tr();
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _isLoading = false;
      });

      // Essayer de récupérer l'adresse (mais pas bloquant si ça échoue)
      _tryGetAddress(position.latitude, position.longitude);

      widget.onLocationSelected?.call(
        position.latitude,
        position.longitude,
        _address,
      );
    } catch (e) {
      setState(() {
        _error = 'Erreur lors de la localisation: ${e.toString()}'.tr();
        _isLoading = false;
      });
    }
  }

  Future<void> _tryGetAddress(double lat, double lng) async {
    try {
      // Utiliser OpenStreetMap Nominatim API (gratuit, pas de clé API requise)
      final dio = Dio();
      final response = await dio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {
          'lat': lat.toString(),
          'lon': lng.toString(),
          'format': 'json',
          'accept-language': 'fr',
          'zoom': 18, // Niveau de détail
        },
        options: Options(
          headers: {
            'User-Agent': 'NSP-POS-App/1.0', // Important pour Nominatim
          },
        ),
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final address = data['address'] as Map<String, dynamic>?;

        if (address != null) {
          final parts = <String>[];

          // Extraire les parties de l'adresse selon le format Nominatim
          // ignore: unused_element
          void addIfPresent(String key, String? value) {
            if (value != null && value.isNotEmpty) {
              parts.add(value);
            } else if (address[key] != null) {
              parts.add(address[key].toString());
            }
          }

          // Construction de l'adresse dans l'ordre logique
          final neighbourhood = address['neighbourhood'];
          final suburb = address['suburb'];
          final road = address['road'] ?? address['street'];
          final houseNumber = address['house_number'];
          final postcode = address['postcode'];
          final city = address['city'] ?? address['town'] ?? address['village'];
          final state = address['state'];
          final country = address['country'];
          // Nom de cité a proximité dans certain cas
          String proxiAddress = '';
          if (neighbourhood != null) proxiAddress += '$neighbourhood';
          if (suburb != null) {
            proxiAddress += neighbourhood != null ? ',$suburb' : suburb;
          }
          if (proxiAddress.isNotEmpty) parts.add(proxiAddress.trim());
          // Construire l'adresse de rue
          String streetAddress = '';
          if (houseNumber != null) streetAddress += '$houseNumber ';
          if (road != null) streetAddress += road;
          if (streetAddress.isNotEmpty) parts.add(streetAddress.trim());

          // Ville et code postal
          String cityPart = '';
          if (postcode != null) cityPart += '$postcode ';
          if (city != null) cityPart += city;
          if (cityPart.isNotEmpty) parts.add(cityPart.trim());

          // Région et pays
          if (state != null && state != city) parts.add(state);
          if (country != null) parts.add(country);

          final fullAddress = parts.join(', ');

          setState(() {
            _address = fullAddress;
            _street = streetAddress.trim();
            _city = city;
            _postalCode = postcode?.toString() ?? '';
            _country = country;
            _state = state;
          });
        }
      } else {
        if (mounted) {
          dynamic e = response.data;
          NotificationService.showError(
            context,
            "Erreur lors de la récuperation de l'addresse \n Verifier votre connexion internet \n $e",
          );
        }
      }
    } catch (e) {
      setState(() {
        _address = 'Adresse non disponible';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Sélectionner un emplacement'.tr())),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const SizedBox(height: 40),

                    // Illustration
                    Icon(
                      Icons.location_on,
                      size: 80,
                      color: Theme.of(context).primaryColor,
                    ),
                    const SizedBox(height: 20),

                    Text(
                      'Localisez votre boutique'.tr(),
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),

                    Text(
                      'Cliquez sur le bouton pour obtenir automatiquement votre position GPS'
                          .tr(),
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey[600], fontSize: 16),
                    ),

                    const SizedBox(height: 40),

                    // Bouton principal
                    SizedBox(
                      width: double.infinity,
                      height: 60,
                      child: ElevatedButton.icon(
                        onPressed: _isLoading ? null : _getCurrentLocation,
                        icon: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation(
                                    Colors.white,
                                  ),
                                ),
                              )
                            : const Icon(Icons.my_location, size: 24),
                        label: Text(
                          _isLoading
                              ? 'Localisation en cours...'.tr()
                              : 'Obtenir ma position GPS'.tr(),
                          style: const TextStyle(fontSize: 18),
                        ),
                        style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Message d'erreur
                    if (_error.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.red[50],
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.red[200]!),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.error_outline, color: Colors.red[700]),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _error,
                                style: TextStyle(
                                  color: Colors.red[700],
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Résultats
                    if (_latitude != null && _longitude != null) ...[
                      const SizedBox(height: 40),

                      Card(
                        elevation: 4,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(Icons.check_circle, color: Colors.green),
                                  const SizedBox(width: 10),
                                  Text(
                                    'Position obtenue'.tr(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                    ),
                                  ),
                                ],
                              ),

                              const SizedBox(height: 20),

                              _buildInfoRow(
                                Icons.explore,
                                'Latitude',
                                _latitude!.toStringAsFixed(6),
                              ),

                              const SizedBox(height: 12),

                              _buildInfoRow(
                                Icons.explore,
                                'Longitude',
                                _longitude!.toStringAsFixed(6),
                              ),

                              if (_address.isNotEmpty &&
                                  _address != 'Adresse non disponible') ...[
                                const SizedBox(height: 20),
                                const Divider(),
                                const SizedBox(height: 12),

                                Row(
                                  children: [
                                    Icon(Icons.place, color: Colors.blue),
                                    const SizedBox(width: 10),
                                    Text(
                                      'Adresse'.tr(),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 8),

                                Padding(
                                  padding: const EdgeInsets.only(left: 34),
                                  child: Text(
                                    _address,
                                    style: const TextStyle(fontSize: 15),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),

          // Bouton de validation
          if (_latitude != null && _longitude != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey[300]!)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha:0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context, {
                      'latitude': _latitude,
                      'longitude': _longitude,
                      "address": _address,
                      "city": _city,
                      "country": _country,
                      "state": _state,
                      "postalCode": _postalCode,
                      "street": _street,
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Utiliser cette position'.tr(),
                    style: const TextStyle(fontSize: 18),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.grey[600]),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      value,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: value));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('$label copié'.tr()),
                          backgroundColor: Colors.green,
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
