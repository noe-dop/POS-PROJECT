import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/config/app_config.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:nsp_pos_mobile/features/payment/service/genius_pay_service.dart';

class OnlinePaymentScreen extends StatefulWidget {
  final double amount;
  final int customerId;
  final int? orderId;
  final int? saleId;
  final String paymentMethod;

  const OnlinePaymentScreen({
    super.key,
    required this.amount,
    required this.customerId,
    this.orderId,
    this.saleId,
    this.paymentMethod = 'CARD',
  });

  @override
  State<OnlinePaymentScreen> createState() => _OnlinePaymentScreenState();
}

class _OnlinePaymentScreenState extends State<OnlinePaymentScreen> {
  final GeniusPayService _paymentService = GeniusPayService();
  bool _isLoading = true;
  String? _errorMessage;
  String? _paymentUrl;
  String? _paymentId;
  
  late final WebViewController _webViewController;

  @override
  void initState() {
    super.initState();
    _initPayment();
  }

  Future<void> _initPayment() async {
    try {
      final result = await _paymentService.initiatePayment(
        orderId: widget.orderId,
        saleId: widget.saleId,
        amount: widget.amount,
        customerId: widget.customerId,
        paymentMethod: widget.paymentMethod,
        successUrl: '${ApiConfig.onlineBaseUrl}online-payments/success/${widget.saleId ?? widget.orderId}',
        cancelUrl: '${ApiConfig.onlineBaseUrl}online-payments/cancel/',
      );

      if (mounted) {
        setState(() {
          _paymentUrl = result['payment_url'] ?? result['redirect_url'];
          _paymentId = result['payment_id'].toString();
          _isLoading = false;
        });

        _initWebView();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _initWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            setState(() => _isLoading = false);
          },
          onUrlChange: (change) {
            // Vérifier si l'URL est celle de succès ou d'échec
            final url = change.url ?? '';
            if (url.contains('/success/')) {
              _onPaymentSuccess();
            } else if (url.contains('/cancel/')) {
              _onPaymentCancel();
            }
          },
          onWebResourceError: (error) {
            setState(() {
              _errorMessage = 'Erreur de chargement: ${error.description}';
            });
          },
        ),
      )
      ..loadRequest(Uri.parse(_paymentUrl!));
  }

  void _onPaymentSuccess() {
    Navigator.pop(context, {'status': 'success'});
  }

  void _onPaymentCancel() {
    Navigator.pop(context, {'status': 'cancelled'});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Paiement en ligne'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (_paymentUrl != null) {
                _webViewController.reload();
              }
            },
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Initiation du paiement...'),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Erreur: $_errorMessage',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _initPayment,
              child: const Text('Réessayer'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler'),
            ),
          ],
        ),
      );
    }

    if (_paymentUrl != null) {
      return WebViewWidget(
        controller: _webViewController,
      );
    }

    return const Center(child: Text('Aucune URL de paiement disponible'));
  }
}