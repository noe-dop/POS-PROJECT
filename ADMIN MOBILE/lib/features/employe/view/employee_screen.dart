// lib/features/employe/view/employee_screen.dart
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:nsp_pos_mobile/core/utils/format_utils.dart';
import 'package:nsp_pos_mobile/features/boutiques/viewmodel/boutique_model.dart';
import 'package:nsp_pos_mobile/app/side_menu.dart';
import 'package:nsp_pos_mobile/features/boutiques/service/boutique_service.dart';
import 'package:nsp_pos_mobile/core/config/currency_config.dart';
import 'package:nsp_pos_mobile/features/employe/service/employe_provider.dart';
import 'package:nsp_pos_mobile/features/employe/view/employee_form_widget.dart';
import 'package:nsp_pos_mobile/features/employe/viewmodel/employe_model.dart';
import 'package:nsp_pos_mobile/localization/locale_keys.dart';
import 'package:provider/provider.dart';

class EmployeeScreen extends StatefulWidget {
  const EmployeeScreen({super.key});

  @override
  State<EmployeeScreen> createState() => _EmployeeScreenState();
}

class _EmployeeScreenState extends State<EmployeeScreen> {
  final String currency = "FCFA";
  late final config = CurrencyConfig.currencies[currency];

  String? selectedBoutiqueId;
  String? selectedEmployeeId;

  bool _isSearching = false;
  final TextEditingController _searchController = TextEditingController();

  bool showSalary = false;

  List<StoreWithPermission> get _accessibleStores {
    final boutiqueService = Provider.of<BoutiqueService>(context, listen: true);
    return boutiqueService.accessibleStores;
  }

  List<String> get _boutiqueNames {
    return _accessibleStores.map((s) => s.boutique.name).toList()..sort();
  }

  List<String> get _boutiqueNamesWithAll {
    return ['Tous'] + _boutiqueNames;
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
        _filterEmployees('');
      }
    });
  }

  void _filterEmployees(String query) {
    Provider.of<EmployeeProvider>(context, listen: false);

    setState(() {
      if (query.isEmpty) {
      } else {
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      _filterEmployees(_searchController.text);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  Future<void> _loadData() async {
    final boutiqueService = context.read<BoutiqueService>();
    final employeeProvider = context.read<EmployeeProvider>();

    if (boutiqueService.accessibleStores.isEmpty) {
      await boutiqueService.fetchAccessibleStores();
    }

    await employeeProvider.loadAllData();

    setState(() {
    });
  }

  Future<void> _refreshData() async {
    final boutiqueService = context.read<BoutiqueService>();
    final employeeProvider = context.read<EmployeeProvider>();

    final storeId = boutiqueService.selectedStore?.boutique.id;
    await employeeProvider.loadAllData(storeId: storeId);

    setState(() {
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showDeleteConfirmationDialog(Employee employe) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(LocaleKeys.employeeDeleteProfileTitle.tr()),
        content: Text(
          LocaleKeys.employeeDeleteMessage.tr(args: [employe.fullName]),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(LocaleKeys.commonCancel.tr()),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              final provider = Provider.of<EmployeeProvider>(
                context,
                listen: false,
              );
              final result = await provider.deleteEmployee(employe.id);

              if (mounted && result['status'] == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Employé supprimé avec succès')),
                );
                if (selectedEmployeeId == employe.id.toString()) {
                  setState(() => selectedEmployeeId = null);
                }
                await _refreshData();
              } else if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      result['message'] ?? 'Erreur lors de la suppression',
                    ),
                  ),
                );
              }
              Navigator.pop(context);
            },
            child: Text(LocaleKeys.commonDelete.tr()),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<EmployeeProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading && provider.employees.isEmpty) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final displayedEmployees =
            selectedBoutiqueId != null && selectedBoutiqueId != 'Tous'
            ? provider.getEmployeesByStore(int.parse(_accessibleStores.firstWhere(
                (s) => s.boutique.name == selectedBoutiqueId,
                orElse: () => _accessibleStores.first,
              ).boutique.id.toString()))
            : provider.employees;

        final filteredList = _searchController.text.isEmpty
            ? displayedEmployees
            : displayedEmployees
                  .where(
                    (emp) => emp.fullName.toLowerCase().contains(
                      _searchController.text.toLowerCase(),
                    ),
                  )
                  .toList();

        return Scaffold(
          appBar: AppBar(
            title: const Text('Employés'),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _refreshData,
                tooltip: 'Rafraîchir',
              ),
            ],
          ),
          drawer: const SideMenu(),
          body: RefreshIndicator(
            onRefresh: _refreshData,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    LocaleKeys.employeesTitle.tr(),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    LocaleKeys.employeesDescription.tr(),
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Divider(),
                  Expanded(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: _buildEmployeeList(filteredList, provider),
                        ),
                        if (selectedEmployeeId != null)
                          Expanded(
                            flex: 3,
                            child: _buildEmployeeDetails(provider),
                          )
                        else
                          Expanded(flex: 3, child: _buildEmptyDetails()),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmployeeList(
    List<Employee> filteredList,
    EmployeeProvider provider,
  ) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        border: Border(
          right: BorderSide(color: Colors.grey.shade300, width: 1.0),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: _buildStoreFilter()),
              const SizedBox(width: 16),
              ElevatedButton.icon(
                onPressed: () => _showAddEmployeeForm(),
                icon: const Icon(Icons.person_add, size: 20),
                label: const Text("Ajouter"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (!_isSearching)
            Row(
              children: [
                Expanded(
                  child: Text(
                    "Liste des employés",
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _toggleSearch,
                  icon: const Icon(Icons.search, color: Colors.blue),
                  tooltip: "Rechercher",
                ),
              ],
            ),
          if (_isSearching) _buildSearchBar(),
          if (_isSearching && _searchController.text.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                "${filteredList.length} résultat(s) trouvé(s)",
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
            ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: filteredList.length,
              itemBuilder: (context, index) {
                final employe = filteredList[index];
                final isSelected = selectedEmployeeId == employe.id.toString();
                return _buildEmployeeCard(employe, isSelected);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStoreFilter() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: selectedBoutiqueId ?? "Tous",
          icon: const Icon(Icons.arrow_drop_down),
          style: const TextStyle(fontSize: 14, color: Colors.black87),
          items: _boutiqueNamesWithAll
              .map(
                (value) => DropdownMenuItem(value: value, child: Text(value)),
              )
              .toList(),
          onChanged: (value) {
            setState(() => selectedBoutiqueId = value == "Tous" ? null : value);
            _refreshData();
          },
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE0E0E0)),
      ),
      child: Row(
        children: [
          const Icon(Icons.search, color: Colors.grey),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: _searchController,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: "Rechercher...",
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
              onChanged: _filterEmployees,
            ),
          ),
          IconButton(
            onPressed: () => _searchController.text.isNotEmpty
                ? _searchController.clear()
                : _toggleSearch(),
            icon: Icon(
              _searchController.text.isNotEmpty ? Icons.clear : Icons.close,
              color: Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmployeeCard(Employee employe, bool isSelected) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        border: isSelected
            ? Border.all(color: Colors.blue.shade500, width: 2)
            : null,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Card(
        elevation: isSelected ? 3 : 1,
        color: isSelected ? Colors.blue.shade50 : null,
        child: ListTile(
          title: Text(
            employe.fullName,
            style: TextStyle(
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
          subtitle: Text('${employe.roleName} • ${employe.storeName}'),
          leading: CircleAvatar(
            backgroundColor: isSelected
                ? Colors.blue.shade500
                : Colors.grey.shade300,
            child: employe.photoUrl != null
                ? ClipOval(
                    child: Image.network(
                      employe.photoUrl!,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Text(employe.fullName[0]),
                    ),
                  )
                : Text(employe.fullName[0]),
          ),
          trailing: Icon(
            Icons.arrow_forward_ios,
            size: 16,
            color: isSelected ? Colors.blue.shade500 : Colors.grey,
          ),
          onTap: () =>
              setState(() => selectedEmployeeId = employe.id.toString()),
        ),
      ),
    );
  }

  Widget _buildEmptyDetails() {
    return Container(
      color: Colors.grey.shade50,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.person_search, size: 80, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              LocaleKeys.employeeSelectToViewDetails.tr(),
              style: const TextStyle(fontSize: 16, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmployeeDetails(EmployeeProvider provider) {
    final employe = provider.employees.firstWhere(
      (emp) => emp.id.toString() == selectedEmployeeId,
      orElse: () => provider.employees.first,
    );

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => setState(() => selectedEmployeeId = null),
                ),
                Text(
                  LocaleKeys.employeeProfileTitle.tr(),
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Center(
              child: Column(
                children: [
                  Container(
                    width: 65,
                    height: 65,
                    decoration: BoxDecoration(
                      color: Colors.blue.shade100,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.blue.shade300, width: 3),
                    ),
                    child: employe.photoUrl != null
                        ? ClipOval(
                            child: Image.network(
                              employe.photoUrl!,
                              width: 65,
                              height: 65,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Icon(Icons.person),
                            ),
                          )
                        : const Icon(Icons.person),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    employe.fullName,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Chip(
                    label: Text(employe.roleName),
                    backgroundColor: Colors.blue.shade100,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    ..._buildAllInfoItems(employe),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.edit),
                            label: Text(LocaleKeys.commonEdit.tr()),
                            onPressed: () => _showEditEmployeeForm(employe),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.delete),
                            label: Text(LocaleKeys.commonDelete.tr()),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade50,
                              foregroundColor: Colors.red,
                            ),
                            onPressed: () =>
                                _showDeleteConfirmationDialog(employe),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            _buildAssignedStores(employe),
            const SizedBox(height: 8),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(
                      LocaleKeys.commonStatistics.tr(),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildStatCard(
                          title: LocaleKeys.commonYears.tr(),
                          value: (DateTime.now().year - employe.hireDate.year)
                              .toString(),
                          icon: Icons.calendar_today,
                        ),
                        _buildStatCard(
                          title: LocaleKeys.commonHours.tr(),
                          value: 'N/A',
                          icon: Icons.access_time,
                        ),
                        _buildStatCard(
                          title: LocaleKeys.commonRating.tr(),
                          value: 'N/A',
                          icon: Icons.star,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignedStores(Employee employe) {
    if (employe.assignedStores.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      margin: const EdgeInsets.only(top: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.store, color: Colors.blue),
                const SizedBox(width: 8),
                const Text(
                  'Boutiques assignées',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...employe.assignedStores.map((store) {
              final isPrimary = store.isPrimary;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isPrimary ? Colors.blue.shade50 : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isPrimary
                        ? Colors.blue.shade200
                        : Colors.grey.shade200,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.store,
                      color: isPrimary ? Colors.blue : Colors.grey,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            store.name,
                            style: TextStyle(
                              fontWeight: isPrimary
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                          if (isPrimary)
                            Text(
                              'Boutique principale',
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.blue.shade600,
                              ),
                            ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        store.permissionType,
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  void _showAddEmployeeForm() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EmployeeFormWidget(
        accessibleStores: _accessibleStores,
        onSuccess: () => _refreshData(),
      ),
    );
  }

  void _showEditEmployeeForm(Employee employe) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => EmployeeFormWidget(
        employee: employe,
        accessibleStores: _accessibleStores,
        onSuccess: () => _refreshData(),
      ),
    );
  }

  List<Widget> _buildAllInfoItems(Employee employe) {
    final List<Map<String, dynamic>> infoItems = [
      {
        'icon': Icons.work,
        'label': LocaleKeys.employeeRole.tr(),
        'value': employe.roleName,
      },
      {
        'icon': Icons.store,
        'label': LocaleKeys.employeeStore.tr(),
        'value': employe.storeName,
      },
      {
        'icon': Icons.email,
        'label': 'Email',
        'value': employe.email.isNotEmpty ? employe.email : 'Non renseigné',
      },
      {
        'icon': Icons.phone,
        'label': 'Téléphone',
        'value': employe.phone.isNotEmpty ? employe.phone : 'Non renseigné',
      },
      {
        'icon': Icons.monetization_on,
        'label': 'Salaire',
        'value': employe.salary != null
            ? '${employe.salary!.toStringAsFixed(0)} ${config!.symbol}'
            : 'Non renseigné',
      },
      {
        'icon': Icons.date_range,
        'label': 'Date d\'embauche',
        'value': FormatUtils.formatDateTime(employe.hireDate),
      },
      {
        'icon': Icons.info,
        'label': 'Statut',
        'value': employe.isActive ? 'Actif' : 'Inactif',
      },
    ];

    final List<Widget> rows = [];
    for (int i = 0; i < infoItems.length; i += 2) {
      final firstItem = infoItems[i];
      final secondItem = i + 1 < infoItems.length ? infoItems[i + 1] : null;

      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 20),
          child: Row(
            children: [
              Expanded(
                child: _buildDetailColumn(
                  icon: firstItem['icon'] as IconData,
                  label: firstItem['label'] as String,
                  value: firstItem['value'] as String,
                  isEmpty: firstItem['value'] == 'Non renseigné',
                ),
              ),
              if (secondItem != null) ...[
                const SizedBox(width: 16),
                Expanded(
                  child: _buildDetailColumn(
                    icon: secondItem['icon'] as IconData,
                    label: secondItem['label'] as String,
                    value: secondItem['value'] as String,
                    isEmpty: secondItem['value'] == 'Non renseigné',
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }
    return rows;
  }

  Widget _buildDetailColumn({
    required IconData icon,
    required String label,
    required String value,
    bool isEmpty = false,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              icon,
              color: isEmpty ? Colors.grey.shade500 : Colors.blue.shade600,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey.shade700,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (label == "Salaire")
          TextButton(
            onPressed: () => setState(() => showSalary = !showSalary),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  showSalary == false ? "********" : value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isEmpty
                        ? Colors.grey.shade500
                        : const Color(0xFF1565C0),
                    fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  showSalary == false
                      ? CupertinoIcons.eye
                      : CupertinoIcons.eye_slash,
                  size: 18,
                ),
              ],
            ),
          )
        else
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isEmpty ? Colors.grey.shade500 : const Color(0xFF1565C0),
              fontStyle: isEmpty ? FontStyle.italic : FontStyle.normal,
            ),
          ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Column(
      children: [
        CircleAvatar(
          backgroundColor: Colors.blue.shade100,
          child: Icon(icon, color: Colors.blue.shade600),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        Text(title, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
