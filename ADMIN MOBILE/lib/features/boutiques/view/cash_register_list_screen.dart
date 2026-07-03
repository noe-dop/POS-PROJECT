import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/cash_register_service.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/cash_register_model.dart';
import 'package:nsp_pos_mobile/features/boutiques/widgets/cash_register_form.dart';
import 'package:provider/provider.dart';

class CashRegisterListScreen extends StatefulWidget {
  final int storeId;
  const CashRegisterListScreen({super.key, required this.storeId});

  @override
  State<CashRegisterListScreen> createState() => _CashRegisterListScreenState();
}

class _CashRegisterListScreenState extends State<CashRegisterListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CashRegisterService>().fetchCashRegisters(widget.storeId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Caisses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showForm(),
          ),
        ],
      ),
      body: Consumer<CashRegisterService>(
        builder: (context, service, child) {
          if (service.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          if (service.errorMessage != null) {
            return Center(child: Text('Erreur: ${service.errorMessage}'));
          }
          if (service.cashRegisters.isEmpty) {
            return const Center(child: Text('Aucune caisse pour cette boutique'));
          }
          return ListView.builder(
            itemCount: service.cashRegisters.length,
            itemBuilder: (context, index) {
              final cr = service.cashRegisters[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListTile(
                  leading: Icon(Icons.point_of_sale, color: cr.isActive ? Colors.green : Colors.red),
                  title: Text(cr.name),
                  subtitle: Text(cr.code ?? ''),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => _showForm(cr),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () => _deleteCashRegister(cr.id!),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  void _showForm([CashRegisterModel? cashRegister]) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => CashRegisterForm(
        storeId: widget.storeId,
        cashRegister: cashRegister,
        onSaved: () {
          context.read<CashRegisterService>().fetchCashRegisters(widget.storeId);
        },
      ),
    );
  }

  Future<void> _deleteCashRegister(int id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la caisse'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Supprimer')),
        ],
      ),
    );
    if (confirm == true) {
      await context.read<CashRegisterService>().deleteCashRegister(id);
      context.read<CashRegisterService>().fetchCashRegisters(widget.storeId);
    }
  }
}