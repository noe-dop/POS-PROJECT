import os
import django

# Indique à Django où se trouve ton fichier settings.py
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'walee.settings')

# Initialise Django
django.setup()
from django.db import connections

try:
    print("Debut de la connexion")
    # Tente de se connecter à la base de données
    conn = connections['default']
    conn.ensure_connection()

    # Si aucune erreur n'est levée, la connexion est réussie.
    print("✅ Connexion à Supabase réussie !")
    print(f"Version du serveur : {conn.connection.server_version}") 

except Exception as e:
    print(f"❌ Échec de la connexion à Supabase : {e}")

finally:
    # Ferme la connexion (bonne pratique)
    conn.close()

# Quittez le shell :
# exit()
