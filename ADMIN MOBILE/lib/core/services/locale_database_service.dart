import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:sqflite_sqlcipher/sqflite.dart' as sqlcipher;
import 'package:sqflite/sqflite.dart' as sqflite;
import 'package:path/path.dart' as p;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:encrypt/encrypt.dart' as encrypt;

/// Gère la base de données SQLite locale utilisée pour le mode hors ligne
/// de la caisse.
///
/// Sur mobile, la base est chiffrée nativement via `sqflite_sqlcipher`
/// (chiffrement au niveau du fichier). Sur desktop (Windows/macOS/Linux),
/// où SQLCipher n'est pas disponible, un chiffrement applicatif AES est
/// préparé via [_initEncryption] (clé dérivée et stockée dans le
/// stockage sécurisé de l'appareil).
///
/// La base contient trois tables :
/// - `products` : cache local du catalogue produits/variantes ;
/// - `outbox` : file d'attente des ventes à synchroniser avec le serveur ;
/// - `cash_sessions` : sauvegarde locale des sessions de caisse.
///
/// La classe est un singleton ([LocalDatabaseService.new] retourne
/// toujours la même instance) afin de garantir une connexion unique à la
/// base de données pour toute l'application.
class LocalDatabaseService {
  static final LocalDatabaseService _instance =
      LocalDatabaseService._internal();

  /// Retourne l'instance unique de [LocalDatabaseService].
  factory LocalDatabaseService() => _instance;
  LocalDatabaseService._internal();

  static dynamic _db;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  // Champs pour le chiffrement applicatif (desktop)
  encrypt.Encrypter? _encrypter;

  /// Retourne la connexion active à la base de données locale, en
  /// l'ouvrant si nécessaire.
  ///
  /// Vérifie d'abord que la connexion existante (le cas échéant) est
  /// toujours valide via une requête de test ; si la base a été fermée
  /// entre-temps, elle est automatiquement rouverte.
  Future<dynamic> get database async {
    if (_db != null) {
      try {
        await _db!.rawQuery('SELECT 1');
        return _db!;
      } catch (e) {
        if (e.toString().contains('database_closed')) {
          _db = null;
        } else {
          rethrow;
        }
      }
    }
    _db = await _initDB();
    return _db!;
  }

  /// Génère une clé aléatoire de 32 octets encodée en base64, utilisée
  /// comme clé de chiffrement de la base (mobile) ou de chiffrement
  /// applicatif (desktop).
  String _generateRandomKey() {
    final random = Random.secure();
    final bytes = List<int>.generate(32, (_) => random.nextInt(256));
    return base64.encode(bytes);
  }

  /// Initialise le chiffrement applicatif AES utilisé sur desktop (là où
  /// SQLCipher n'est pas disponible).
  ///
  /// Charge la clé depuis le stockage sécurisé ou en génère une nouvelle
  /// si elle n'existe pas encore, dérive un vecteur d'initialisation (IV)
  /// à partir du hash SHA-256 de la clé, puis initialise [_encrypter].
  /// Ne fait rien si le chiffrement est déjà initialisé.
  Future<void> _initEncryption() async {
    if (_encrypter != null) return;

    final keyString = await _secureStorage.read(key: 'app_encryption_key');
    final key = keyString != null
        ? encrypt.Key.fromBase64(keyString)
        : encrypt.Key.fromBase64(_generateRandomKey());

    _encrypter = encrypt.Encrypter(encrypt.AES(key));

    if (keyString == null) {
      await _secureStorage.write(key: 'app_encryption_key', value: key.base64);
    }
  }

  /// Ouvre (ou crée) la base de données locale selon la plateforme.
  ///
  /// Sur mobile, utilise `sqflite_sqlcipher` avec une clé de chiffrement
  /// stockée de façon sécurisée. Sur desktop, utilise `sqflite` standard
  /// et initialise le chiffrement applicatif via [_initEncryption].
  ///
  /// Si une base existante est détectée comme incompatible avec le schéma
  /// attendu (voir [_isDatabaseCompatible]), elle est sauvegardée
  /// ([_backupDatabase]) puis recréée. Applique enfin des réglages
  /// SQLite garantissant un accès exclusif et cohérent (`journal_mode`,
  /// `locking_mode`).
  Future<dynamic> _initDB() async {
    final path = p.join(await sqflite.getDatabasesPath(), 'eboutik.db');
    final dbExists = await sqflite.databaseExists(path);
    final isMobile =
        !Platform.isWindows && !Platform.isMacOS && !Platform.isLinux;

    dynamic db;
    bool needCreate = false;

    if (isMobile) {
      String? key = await _secureStorage.read(key: 'db_encryption_key');
      if (key == null) {
        key = _generateRandomKey();
        await _secureStorage.write(key: 'db_encryption_key', value: key);
      }

      if (dbExists) {
        try {
          db = await sqlcipher.openDatabase(
            path,
            version: 3,
            onUpgrade: _onUpgradeCipher,
            password: key,
          );
          if (!await _isDatabaseCompatible(db)) {
            await _backupDatabase(path);
            _db = null;
            await db.close();
            await sqflite.deleteDatabase(path);
            needCreate = true;
          }
        } catch (e) {
          _db = null;
          await sqflite.deleteDatabase(path);
          needCreate = true;
        }
      } else {
        needCreate = true;
      }

      if (needCreate) {
        db = await sqlcipher.openDatabase(
          path,
          version: 3,
          onCreate: _onCreateCipher,
          onUpgrade: _onUpgradeCipher,
          password: key,
        );
      }
    } else {
      await _initEncryption();

      if (dbExists) {
        try {
          db = await sqflite.openDatabase(
            path,
            version: 3,
            onUpgrade: _onUpgradeStandard,
          );
          if (!await _isDatabaseCompatible(db)) {
            await _backupDatabase(path);
            _db = null;
            await db.close();
            await sqflite.deleteDatabase(path);
            needCreate = true;
          }
        } catch (e) {
          _db = null;
          await sqflite.deleteDatabase(path);
          needCreate = true;
        }
      } else {
        needCreate = true;
      }

      if (needCreate) {
        db = await sqflite.openDatabase(
          path,
          version: 3,
          onCreate: _onCreateStandard,
          onUpgrade: _onUpgradeStandard,
        );
      }
    }

    db ??= isMobile
        ? await sqlcipher.openDatabase(
            path,
            version: 3,
            onCreate: _onCreateCipher,
            onUpgrade: _onUpgradeCipher,
            password: await _secureStorage.read(key: 'db_encryption_key') ?? '',
          )
        : await sqflite.openDatabase(
            path,
            version: 3,
            onCreate: _onCreateStandard,
            onUpgrade: _onUpgradeStandard,
          );

    // Verrouillage exclusif (empêche les accès concurrents pendant l'exécution)
    await db!.execute('PRAGMA journal_mode = DELETE;');
    await db!.execute('PRAGMA locking_mode = EXCLUSIVE;');
    await db!.rawQuery('SELECT COUNT(*) FROM sqlite_master;');

    return db!;
  }

  // ===== SCHÉMA COMMUN =====

  /// Crée les tables `products`, `outbox` et `cash_sessions` sur une base
  /// vierge.
  Future<void> _createTables(dynamic db) async {
    await db.execute('''
      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        store_product_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        sku TEXT,
        barcode TEXT,
        variant_id INTEGER,
        variant_name TEXT,
        quantity REAL,
        sale_price_1 REAL,
        store_variant_price REAL,
        store_variant_id INTEGER,
        stock_quantity INTEGER,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        updated_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE outbox (
        id TEXT PRIMARY KEY,
        store_id INTEGER,
        employee_id INTEGER,
        cash_register_id INTEGER,
        cash_session_id INTEGER,
        payload TEXT,
        created_at INTEGER,
        attempts INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        error TEXT,
        transaction_data TEXT
      )
    ''');

    await db.execute('''
      CREATE TABLE cash_sessions (
        id INTEGER PRIMARY KEY,
        start_time INTEGER,
        end_time INTEGER,
        initial_cash TEXT,
        current_cash TEXT,
        transactions TEXT,
        currency TEXT,
        store_id INTEGER
      )
    ''');
  }

  // ===== SQLCIPHER (mobile) =====

  /// Callback de création de la base chiffrée (mobile).
  void _onCreateCipher(dynamic db, int version) async => _createTables(db);

  /// Callback de migration de la base chiffrée (mobile). Ajoute la
  /// colonne `transaction_data` à `outbox` lors du passage à la version 3.
  void _onUpgradeCipher(dynamic db, int oldVersion, int newVersion) async {
    if (oldVersion < 3) {
      await db.execute('ALTER TABLE outbox ADD COLUMN transaction_data TEXT');
    }
  }

  // ===== STANDARD (desktop) =====

  /// Callback de création de la base standard (desktop).
  void _onCreateStandard(dynamic db, int version) async => _createTables(db);

  /// Callback de migration de la base standard (desktop). Ajoute la
  /// colonne `transaction_data` à `outbox` lors du passage à la version 3.
  void _onUpgradeStandard(dynamic db, int oldVersion, int newVersion) async {
    if (oldVersion < 3) {
      await db.execute('ALTER TABLE outbox ADD COLUMN transaction_data TEXT');
    }
  }

  // ===== COMPATIBILITÉ =====

  /// Vérifie que [db] contient bien toutes les tables et colonnes
  /// attendues par le schéma courant.
  ///
  /// Utilisé pour détecter une base issue d'une ancienne version de
  /// l'application (schéma obsolète) avant de la recréer proprement.
  /// Retourne `true` si le schéma est complet, `false` sinon.
  Future<bool> _isDatabaseCompatible(dynamic db) async {
    final requiredTables = {
      'products': {
        'id',
        'store_product_id',
        'product_id',
        'product_name',
        'sku',
        'barcode',
        'variant_id',
        'variant_name',
        'quantity',
        'sale_price_1',
        'store_variant_price',
        'store_variant_id',
        'stock_quantity',
        'image_url',
        'is_active',
        'updated_at',
      },
      'outbox': {
        'id',
        'store_id',
        'employee_id',
        'cash_register_id',
        'cash_session_id',
        'payload',
        'created_at',
        'attempts',
        'status',
        'error',
        'transaction_data',
      },
      'cash_sessions': {
        'id',
        'start_time',
        'end_time',
        'initial_cash',
        'current_cash',
        'transactions',
        'currency',
        'store_id',
      },
    };

    for (var tableName in requiredTables.keys) {
      final tableExists = await db.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName],
      );
      if (tableExists.isEmpty) {
        return false;
      }

      final columns = await db.rawQuery("PRAGMA table_info($tableName)");
      final Set<String> columnNames = columns
          .map((row) => row['name'] as String?)
          .whereType<String>()
          .toSet();

      final requiredColumns = requiredTables[tableName]!;
      for (var col in requiredColumns) {
        if (!columnNames.contains(col)) {
          return false;
        }
      }
    }
    return true;
  }

  // ===== BACKUP =====

  /// Copie le fichier de base de données existant vers un fichier
  /// `.backup-<timestamp>.bak` avant qu'il ne soit supprimé et recréé,
  /// afin de ne pas perdre de données en cas de schéma incompatible.
  Future<void> _backupDatabase(String path) async {
    final backupPath =
        '$path.backup-${DateTime.now().millisecondsSinceEpoch}.bak';
    if (await File(path).exists()) {
      await File(path).copy(backupPath);
    }
  }

  // ========== MÉTHODES PUBLIQUES ==========

  /// Remplace intégralement le contenu de la table `products` par
  /// [products] (vidage puis réinsertion). Utilisé après un
  /// rafraîchissement du catalogue depuis le serveur.
  Future<void> saveProducts(List<Map<String, dynamic>> products) async {
    final db = await database;
    await db.delete('products');
    for (var p in products) {
      await db.insert('products', p);
    }
  }

  /// Recherche des produits locaux dont le nom, le SKU, le code-barres ou
  /// le nom de variante contient [query] (recherche insensible à la
  /// casse). Une [query] vide retourne l'ensemble des produits.
  ///
  /// [limit] et [offset] permettent une pagination optionnelle. Les
  /// résultats sont triés par nom de variante.
  Future<List<Map<String, dynamic>>> searchProducts(
    String query, {
    int? limit,
    int? offset,
  }) async {
    final db = await database;
    String sql = 'SELECT * FROM products';
    List<Object?> args = [];

    if (query.isNotEmpty) {
      sql +=
          ' WHERE product_name LIKE ? OR sku LIKE ? OR barcode LIKE ? OR variant_name LIKE ?';
      args = ['%$query%', '%$query%', '%$query%', '%$query%'];
    }
    sql += ' ORDER BY variant_name COLLATE NOCASE';

    if (limit != null) {
      sql += ' LIMIT ?';
      args.add(limit);
    }
    if (offset != null) {
      sql += ' OFFSET ?';
      args.add(offset);
    }

    return await db.rawQuery(sql, args);
  }

  /// Recherche un produit local par [barcode] exact. Retourne `null` si
  /// aucun produit ne correspond.
  Future<Map<String, dynamic>?> findProductByBarcode(String barcode) async {
    final db = await database;
    final results = await db.query(
      'products',
      where: 'barcode = ?',
      whereArgs: [barcode],
      limit: 1,
    );
    return results.isNotEmpty ? results.first : null;
  }

  /// Retourne le nombre total de lignes de la table `products`.
  Future<int> getProductCount() async {
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM products');
    return sqflite.Sqflite.firstIntValue(result) ?? 0;
  }

  // ===== OUTBOX =====

  /// Insère une nouvelle entrée dans l'outbox (vente en attente de
  /// synchronisation avec le serveur).
  Future<void> insertOutboxEntry(Map<String, dynamic> entry) async {
    final db = await database;
    await db.insert('outbox', entry);
  }

  /// Retourne toutes les entrées de l'outbox au statut `pending`, triées
  /// par date de création croissante (ordre de traitement).
  Future<List<Map<String, dynamic>>> getPendingOutboxEntries() async {
    final db = await database;
    return await db.query(
      'outbox',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );
  }

  /// Retourne l'entrée de l'outbox correspondant à [id], ou `null` si
  /// elle n'existe pas.
  Future<Map<String, dynamic>?> getOutboxEntry(String id) async {
    final db = await database;
    final results = await db.query(
      'outbox',
      where: 'id = ?',
      whereArgs: [id],
      limit: 1,
    );
    return results.isNotEmpty ? results.first : null;
  }

  /// Retourne toutes les entrées de l'outbox au statut `failed` (échec
  /// définitif de synchronisation).
  Future<List<Map<String, dynamic>>> getFailedOutboxEntries() async {
    final db = await database;
    return await db.query('outbox', where: 'status = ?', whereArgs: ['failed']);
  }

  /// Met à jour le [status] (et éventuellement le message [error]) d'une
  /// entrée d'outbox identifiée par [id].
  ///
  /// Si [incrementAttempts] vaut `true`, le compteur de tentatives est
  /// incrémenté atomiquement en base.
  Future<void> updateOutboxStatus(
    String id,
    String status, {
    String? error,
    bool incrementAttempts = false,
  }) async {
    final db = await database;
    if (incrementAttempts) {
      await db.rawUpdate(
        'UPDATE outbox SET status = ?, error = ?, attempts = attempts + 1 WHERE id = ?',
        [status, error, id],
      );
    } else {
      await db.update(
        'outbox',
        {'status': status, 'error': error},
        where: 'id = ?',
        whereArgs: [id],
      );
    }
  }

  /// Supprime définitivement une entrée de l'outbox après synchronisation
  /// réussie.
  Future<void> deleteOutboxEntry(String id) async {
    final db = await database;
    await db.delete('outbox', where: 'id = ?', whereArgs: [id]);
  }

  /// Retourne le nombre d'entrées de l'outbox au statut `pending`.
  Future<int> getPendingOutboxCount() async {
    final db = await database;
    final result = await db.rawQuery(
      "SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'",
    );
    return sqflite.Sqflite.firstIntValue(result) ?? 0;
  }

  // ===== SESSIONS =====

  /// Sauvegarde (ou remplace, si l'`id` existe déjà) une session de
  /// caisse dans la table `cash_sessions`.
  Future<void> saveCashSession(Map<String, dynamic> session) async {
    final db = await database;
    await db.insert(
      'cash_sessions',
      session,
      conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
    );
  }

  /// Retourne la session de caisse locale correspondant à [id], ou `null`
  /// si elle n'existe pas.
  Future<Map<String, dynamic>?> getCashSession(int id) async {
    final db = await database;
    final results = await db.query(
      'cash_sessions',
      where: 'id = ?',
      whereArgs: [id],
    );
    return results.isNotEmpty ? results.first : null;
  }
}
