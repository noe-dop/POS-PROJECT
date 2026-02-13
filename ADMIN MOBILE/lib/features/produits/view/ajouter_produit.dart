// pages/ajouter_produit_page.dart
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/features/produits/viewmodel/product_model.dart';
import 'package:nsp_pos_mobile/features/produits/widgets/produit_form_widget.dart';

class AjouterProduitPage extends StatelessWidget {
  final Product? produit;

  const AjouterProduitPage({super.key, this.produit});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(produit != null ? 'Modifier le produit' : 'Nouveau produit'),
        actions: [
          if (produit != null)
            IconButton(
              icon: Icon(Icons.delete),
              onPressed: () => _confirmerSuppression(context),
            ),
        ],
      ),
      body: ProduitFormWidget(
        produit: produit,
        onSave: (nouveauProduit) => _sauvegarderProduit(nouveauProduit, context),
        onCancel: () => Navigator.pop(context),
      ),
    );
  }

  void _sauvegarderProduit(Product produit, BuildContext context) async {
    try {
      // TODO: Sauvegarder dans Firebase/SQLite/API
      // await ProduitService().saveProduct(produit);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Produit ${this.produit != null ? 'mis à jour' : 'créé'} avec succès!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
      
      Navigator.pop(context, produit);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
    }
  }

  void _confirmerSuppression(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Confirmer la suppression'),
        content: Text('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              try {
                // TODO: Supprimer le produit
                // await ProduitService().deleteProduct(produit!.id);
                
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Produit supprimé avec succès!'),
                    backgroundColor: Colors.green,
                  ),
                );
                
                Navigator.pop(context); // Fermer dialogue
                Navigator.pop(context); // Retour à la liste
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Erreur: ${e.toString()}'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Supprimer'),
          ),
        ],
      ),
    );
  }
}