import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/caisse/services/caisse_provider.dart';
import 'package:provider/provider.dart';

class SalesHistorySheet extends StatefulWidget {
  const SalesHistorySheet({super.key});

  @override
  State<SalesHistorySheet> createState() => _SalesHistorySheetState();
}

class _SalesHistorySheetState extends State<SalesHistorySheet> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<CaisseProvider>(context, listen: false);
      provider.fetchSales(refresh: true);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent * 0.8) {
      final provider = Provider.of<CaisseProvider>(context, listen: false);
      provider.loadMoreSales();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CaisseProvider>(
      builder: (context, provider, child) {
        final sales = provider.sales;

        return Container(
          padding: const EdgeInsets.all(16),
          height: MediaQuery.of(context).size.height * 0.85,
          child: Column(
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Historique des ventes',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Infos
              Row(
                children: [
                  Text(
                    '${sales.length} vente(s)',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                  const Spacer(),
                  if (provider.isLoadingSales)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
              const Divider(),

              // Liste des ventes
              Expanded(
                child: sales.isEmpty && !provider.isLoadingSales
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.history,
                              size: 60,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Aucune vente enregistrée',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        itemCount:
                            sales.length + (provider.hasMoreSales ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == sales.length) {
                            return const Padding(
                              padding: EdgeInsets.all(16),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              ),
                            );
                          }
                          return _buildSaleItem(sales[index]);
                        },
                      ),
              ),

              const Divider(),

              // Bouton Fermer
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Fermer'),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSaleItem(Map<String, dynamic> sale) {
    // Adapter selon la structure réelle de l'API
    final saleId = sale['id'] ?? 'N/A';
    final total = FormatUtils.toDouble(sale['total_amount']);
    final dateStr = sale['sale_date'] ??  '';
    final items = sale['items'] as List? ?? [];
    final itemCount = items.length;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: Colors.blue[50],
          child: Icon(Icons.receipt, color: Colors.blue[700]),
        ),
        title: Text(
          'Vente #$saleId',
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              FormatUtils.formatCurrency(total!, 'FCFA'),
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              itemCount > 0 ? '$itemCount article(s)' : '0 article',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: Text(
          _formatDate(dateStr),
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        children: [
          // Liste des articles
          if (items.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                children: items.map<Widget>((item) {
                  return _buildSaleItemRow(item);
                }).toList(),
              ),
            )
          else
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'Aucun article détaillé',
                style: TextStyle(color: Colors.grey),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSaleItemRow(Map<String, dynamic> item) {
    final productName = item['product_name'] ?? item['name'] ?? 'Produit';
    final quantity = FormatUtils.toInt(item['quantity']);
    final unitPrice = FormatUtils.toDouble(item['unit_price']) ?? 0.0;
    final total = unitPrice! * quantity!;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Text(
              productName,
              style: const TextStyle(fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Expanded(
            flex: 1,
            child: Text(
              'x$quantity',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              FormatUtils.formatCurrency(unitPrice, 'FCFA'),
              style: const TextStyle(fontSize: 12),
              textAlign: TextAlign.end,
            ),
          ),
          Expanded(
            flex: 2,
            child: Text(
              FormatUtils.formatCurrency(total, 'FCFA'),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.green,
              ),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateStr;
    }
  }
}
