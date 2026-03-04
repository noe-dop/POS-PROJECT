import React, { useState, useEffect } from 'react';
import { useProfile } from '../hooks/useProfile';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Clock,
  LogOut,
  Edit2,
  Save,
  X,
  ShoppingBag,
  Key,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const Profile: React.FC = () => {
  const { 
    profile, 
    loading, 
    error, 
    sessions,
    activities,
    stats,
    isAuthenticated,
    userRole,
    updateProfile,
    changePassword,
    logout,
    clearError
  } = useProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });

  // État pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (profile?.user) {
      setFormData({
        first_name: profile.user.first_name || '',
        last_name: profile.user.last_name || '',
        email: profile.user.email || '',
        phone: profile.user.phone || '',
        address: profile.user.address || '',
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile(formData);
    if (success) {
      setIsEditing(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    
    // Validations
    if (!passwordData.current_password) {
      setPasswordMessage({ type: 'error', text: 'Veuillez saisir votre mot de passe actuel' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
      return;
    }

    setIsChangingPassword(true);
    
    try {
      const result = await changePassword(passwordData);
      
      if (result.success) {
        setPasswordMessage({ 
          type: 'success', 
          text: result.message || 'Mot de passe modifié avec succès' 
        });
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
      } else {
        let errorMessage = result.message || 'Échec de la modification';
        if (errorMessage.includes('incorrect')) {
          errorMessage = '❌ Mot de passe actuel incorrect. Veuillez réessayer.';
        }
        setPasswordMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: '❌ Erreur réseau. Vérifiez votre connexion.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Affichage du chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  // Redirection si non authentifié
  if (!loading && !isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  // Message si profil non trouvé
  if (!loading && isAuthenticated && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-yellow-50 p-8 rounded-xl max-w-md">
          <User className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Profil non trouvé</h2>
          <p className="text-gray-600 mb-6">
            Impossible de charger les informations de votre profil.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const user = profile?.user;
  if (!user) return null;

  const fullName = user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.username;

  const profilePhoto = 
    user.owner_profile?.photo ||
    user.employee_profile?.photo ||
    user.shareholder_profile?.photo ||
    null;

  // Configuration des onglets
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'activity', label: 'Activité', icon: Clock },
    { id: 'sessions', label: 'Sessions', icon: Shield },
    { id: 'security', label: 'Sécurité', icon: Key }
  ];

  if (user.customer_profile) {
    tabs.push({ id: 'purchases', label: 'Achats', icon: ShoppingBag });
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'owner' && '👑 Propriétaire'}
            {userRole === 'employee' && '👔 Employé'}
            {userRole === 'customer' && '🛒 Client'}
            {userRole === 'shareholder' && '📈 Actionnaire'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* Message d'erreur global */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-red-700 hover:text-red-900 text-xl">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 md:mb-8 bg-white rounded-t-lg">
        <nav className="flex space-x-4 md:space-x-8 overflow-x-auto px-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 md:py-4 px-2 border-b-2 font-medium text-xs md:text-sm flex items-center space-x-1 md:space-x-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Onglet Profil */}
        {activeTab === 'profile' && (
          <div className="p-4 md:p-8">
            {/* Photo et infos de base */}
            <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6 mb-8">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-2 border-blue-200">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 md:w-12 md:h-12 text-blue-500" />
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{fullName}</h2>
                <p className="text-sm md:text-base text-gray-600">@{user.username}</p>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="flex items-center text-sm md:text-base text-gray-600">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                    <span>{user.phone || 'Non renseigné'}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                    <span>Membre depuis {new Date(user.date_joined).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{user.address || 'Non renseigné'}</span>
                  </div>
                </div>
              </div>

              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 self-start transition-colors shadow-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
              ) : (
                <div className="flex space-x-2 self-start">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Annuler"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Enregistrer"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Formulaire d'édition */}
            {isEditing && (
              <form onSubmit={handleSubmit} className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Modifier mes informations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            {/* Statistiques */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{stats?.total_logins || 0}</div>
                <div className="text-xs md:text-sm text-gray-600">Connexions</div>
              </div>
              
              {user.customer_profile && (
                <>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-xl md:text-2xl font-bold text-green-600">
                      {user.customer_profile.loyalty_points || 0}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">Points fidélité</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-xl md:text-2xl font-bold text-purple-600">
                      {user.customer_profile.total_spent?.toLocaleString()} FCFA
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">Total dépensé</div>
                  </div>
                </>
              )}

              {user.employee_profile && (
                <div className="bg-orange-50 rounded-lg p-4 text-center md:col-span-2">
                  <div className="text-xs md:text-sm text-gray-600 mb-1">Employé chez</div>
                  <div className="text-base md:text-lg font-semibold text-gray-800">
                    {user.employee_profile.store_name}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 mt-1">
                    {user.employee_profile.role_name}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Onglet Activité */}
        {activeTab === 'activity' && (
          <div className="p-4 md:p-8">
            <h3 className="text-lg font-semibold mb-4">Activités récentes</h3>
            
            {activities.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune activité récente</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-600"></div>
                    <div className="flex-1">
                      <p className="text-gray-800 text-sm md:text-base">{activity.action}</p>
                      <p className="text-xs md:text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Sessions */}
        {activeTab === 'sessions' && (
          <div className="p-4 md:p-8">
            <h3 className="text-lg font-semibold mb-4">Sessions actives</h3>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune session active</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start">
                      <div>
                        <p className="font-medium text-sm md:text-base">
                          {session.device_info?.browser || 'Navigateur inconnu'} 
                          sur {session.device_info?.os || 'OS inconnu'}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600 mt-1">
                          IP: {session.ip_address || 'Inconnue'}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600">
                          Connecté le {new Date(session.login_time).toLocaleString()}
                        </p>
                      </div>
                      {!session.logout_time && (
                        <span className="mt-2 md:mt-0 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onglet Sécurité (Mot de passe) */}
        {activeTab === 'security' && (
          <div className="p-4 md:p-8">
            <h3 className="text-lg font-semibold mb-4">Changer le mot de passe</h3>
            
            {passwordMessage && (
              <div className={`mb-4 p-3 rounded-lg flex items-center ${
                passwordMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {passwordMessage.type === 'success' 
                  ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> 
                  : <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                }
                <span className="text-sm md:text-base">{passwordMessage.text}</span>
              </div>
            )}
            
            <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  required
                />
              </div>
              <div className="text-right">
                <Link 
                  to="/forgot-password" 
                  className="text-xs md:text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isChangingPassword ? 'Modification en cours...' : 'Changer le mot de passe'}
              </button>
            </form>
          </div>
        )}

        {/* Onglet Achats */}
        {activeTab === 'purchases' && user.customer_profile && (
          <div className="p-4 md:p-8">
            <h3 className="text-lg font-semibold mb-4">Historique d'achats</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600">
                  {user.customer_profile.purchase_count || 0}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Achats</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600">
                  {user.customer_profile.average_basket?.toLocaleString() || 0} FCFA
                </div>
                <div className="text-xs md:text-sm text-gray-600">Panier moyen</div>
              </div>
            </div>

            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm md:text-base">
                Fonctionnalité à venir : Liste détaillée des achats
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;