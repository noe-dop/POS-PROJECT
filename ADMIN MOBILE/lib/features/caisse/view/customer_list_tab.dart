import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/customers/service/customer_service.dart';
import 'package:nsp_pos_mobile/features/customers/view/create_customer_dialog.dart';
import 'package:provider/provider.dart';

class CustomersListTab extends StatefulWidget {
  final int storeId;
  final Function(Map<String, dynamic>)? onCustomerSelected;
  const CustomersListTab({
    super.key,
    required this.storeId,
    this.onCustomerSelected,
  });

  @override
  State<CustomersListTab> createState() => _CustomersListTabState();
}

class _CustomersListTabState extends State<CustomersListTab> {
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _customers = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _searchCustomers();
  }

  Future<void> _searchCustomers() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() => _customers = []);
      return;
    }
    setState(() => _isLoading = true);
    try {
      final provider = context.read<CustomerProvider>();
      final results = await provider.searchCustomers(query);
      setState(() {
        _customers = results;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _showCreateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => CreateCustomerDialog(
        onCustomerCreated: (customerData) {
          // Recharger la liste des clients après création
          _searchCustomers();
          // Si un callback est fourni, l'appeler avec les données du nouveau client
          if (widget.onCustomerSelected != null) {
            widget.onCustomerSelected!(customerData);
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Barre de recherche + bouton Nouveau
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Rechercher un client...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    filled: true,
                    fillColor: Colors.grey[50],
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _searchCustomers();
                            },
                          )
                        : null,
                  ),
                  onChanged: (_) => _searchCustomers(),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: () => _showCreateDialog(context),
                icon: const Icon(Icons.add),
                label: const Text('Nouveau'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),

        // Liste des clients
        Expanded(child: _buildCustomerList()),
      ],
    );
  }

  Widget _buildCustomerList() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_customers.isEmpty) {
      return Center(
        child: Text(
          _searchController.text.isEmpty
              ? 'Saisissez un nom ou un email pour rechercher'
              : 'Aucun client trouvé',
          style: TextStyle(color: Colors.grey[600]),
        ),
      );
    }

    return ListView.builder(
      itemCount: _customers.length,
      itemBuilder: (context, index) {
        final customer = _customers[index];
        final user = customer['user'] ?? {};
        final cards = customer['cards'] as List?;
        final hasCards = cards != null && cards.isNotEmpty;

        return ListTile(
          title: Text(user['full_name'] ?? 'Client inconnu'),
          subtitle: Text(user['email'] ?? ''),
          trailing: hasCards
              ? const Icon(Icons.chevron_right)
              : const Icon(Icons.warning_amber, color: Colors.orange),
          onTap: () {
            if (widget.onCustomerSelected != null) {
              widget.onCustomerSelected!(customer);
            }
          },
        );
      },
    );
  }
}
