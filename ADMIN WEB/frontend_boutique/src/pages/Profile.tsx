import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  CheckCircle,
  Camera,
  Package,
  Smartphone,
  Monitor,
  Loader2
} from 'lucide-react';

// Types
type TabId = 'profile' | 'activity' | 'sessions' | 'security' | 'purchases';
type MessageType = 'success' | 'error';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}

interface EnrichedActivity {
  id: number;
  type: 'vente' | 'commande' | 'connexion' | 'produit' | 'caisse' | 'autre';
  action: string;
  details: string;
  amount?: number;
  timestamp: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  model_name?: string;
  object_id?: string;
}

interface EnrichedSession {
  id: number;
  login_time: string;
  logout_time: string | null;
  device_info: {
    browser: string;
    os: string;
    device: string;
    is_mobile: boolean;
  } | null;
  ip_address: string | null;
  location: string;
  duration: number;
  isCurrent: boolean;
}

// Configuration des onglets
const TAB_CONFIG: TabConfig[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'activity', label: 'Activité', icon: Clock },
  { id: 'sessions', label: 'Sessions', icon: Shield },
  { id: 'security', label: 'Sécurité', icon: Key }
];

const Profile: React.FC = () => {
  const { 
    profile, 
    loading, 
    error, 
    sessions = [],
    activities = [],
    stats = {},
    isAuthenticated,
    userRole,
    updateProfile,
    changePassword,
    logout,
    clearError
  } = useProfile();

  // États
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });

  // État pour la photo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // État pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: MessageType; text: string} | null>(null);

  // État pour les filtres d'activité
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // État pour afficher toutes les sessions
  const [showAllSessions, setShowAllSessions] = useState(false);

  // Récupération des données utilisateur avec sécurités
  const user = profile?.user || null;
  const fullName = useMemo(() => 
    user?.full_name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : null) || user?.username || 'Utilisateur',
    [user]
  );

  // ========== GESTION DE LA PHOTO ==========
  useEffect(() => {
    if (profile) {
      console.log("📦 Profil reçu:", profile);
    }
  }, [profile]);

  // Construire l'URL de la photo - VERSION CORRIGÉE (sans process.env)
  const profilePhoto = useMemo(() => {
    if (!profile) return null;
    
    let photoPath = null;
    let photoRole = '';
    
    if (profile.owner_profile?.photo) {
      photoPath = profile.owner_profile.photo;
      photoRole = 'owner';
      console.log("📸 Photo propriétaire trouvée:", photoPath);
    } else if (profile.employee_profile?.photo) {
      photoPath = profile.employee_profile.photo;
      photoRole = 'employee';
      console.log("📸 Photo employé trouvée:", photoPath);
    } else if (profile.shareholder_profile?.photo) {
      photoPath = profile.shareholder_profile.photo;
      photoRole = 'shareholder';
      console.log("📸 Photo actionnaire trouvée:", photoPath);
    } else if (profile.customer_profile?.photo) {
      photoPath = profile.customer_profile.photo;
      photoRole = 'customer';
      console.log("📸 Photo client trouvée:", photoPath);
    }
    
    if (!photoPath) {
      console.log("📸 Aucune photo trouvée");
      return null;
    }
    
    // Si c'est déjà une URL absolue
    if (photoPath.startsWith('http')) {
      console.log("✅ URL absolue:", photoPath);
      return photoPath;
    }
    
    // ✅ URL en dur sans process.env
    const baseUrl = 'http://127.0.0.1:8000';
    // S'assurer que le chemin commence par /
    const normalizedPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
    // Ajouter un timestamp pour éviter le cache
    const fullUrl = `${baseUrl}${normalizedPath}?t=${Date.now()}`;
    
    console.log(`✅ URL construite pour ${photoRole}:`, fullUrl);
    
    return fullUrl;
  }, [profile]);

  // Réinitialiser l'erreur d'image
  useEffect(() => {
    setImageError(false);
  }, [profilePhoto]);

  // Configuration dynamique des onglets
  const tabs = useMemo(() => {
    const baseTabs = [...TAB_CONFIG];
    if (user?.customer_profile) {
      baseTabs.push({ id: 'purchases', label: 'Achats', icon: ShoppingBag });
    }
    return baseTabs;
  }, [user]);

  // Initialisation du formulaire
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  // Handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('L\'image ne doit pas dépasser 5 Mo');
        return;
      }
      
      setSelectedFile(file);
      setImageLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setImageLoading(false);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const success = await updateProfile({
        ...formData,
        photo: selectedFile
      });
      if (success) {
        setSelectedFile(null);
        setPhotoPreview(null);
        setImageError(false);
      }
    } catch (error) {
      console.error("❌ Erreur upload:", error);
      alert("Erreur lors de l'upload de la photo");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, formData, updateProfile]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordMessage(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await updateProfile(formData);
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error("❌ Erreur mise à jour:", error);
    }
  }, [formData, updateProfile]);

  const validatePassword = useCallback((): boolean => {
    if (!passwordData.current_password) {
      setPasswordMessage({ type: 'error', text: 'Veuillez saisir votre mot de passe actuel' });
      return false;
    }

    if (passwordData.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return false;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
      return false;
    }

    return true;
  }, [passwordData]);

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    
    if (!validatePassword()) return;

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
        const errorMessage = result.message?.includes('incorrect')
          ? '❌ Mot de passe actuel incorrect. Veuillez réessayer.'
          : result.message || 'Échec de la modification';
        
        setPasswordMessage({ type: 'error', text: errorMessage });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: '❌ Erreur réseau. Vérifiez votre connexion.' });
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordData, changePassword, validatePassword]);

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = '/login';
  }, [logout]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // Données enrichies
  const enrichedActivities = useMemo((): EnrichedActivity[] => {
    return (activities || []).map(act => {
      if (act.model_name === 'Sale' || act.action?.toLowerCase().includes('vente')) {
        return {
          ...act,
          type: 'vente',
          icon: ShoppingBag,
          color: 'bg-green-500',
          details: act.details?.total_amount 
            ? `Vente de ${act.details.total_amount} FCFA` 
            : 'Nouvelle vente'
        };
      }
      if (act.model_name === 'Order' || act.action?.toLowerCase().includes('commande')) {
        return {
          ...act,
          type: 'commande',
          icon: ShoppingBag,
          color: 'bg-purple-500',
          details: 'Commande créée'
        };
      }
      if (act.action?.toLowerCase().includes('login') || act.action?.toLowerCase().includes('connexion')) {
        return {
          ...act,
          type: 'connexion',
          icon: LogOut,
          color: 'bg-blue-500',
          details: `Connexion ${act.details?.ip ? `depuis ${act.details.ip}` : ''}`
        };
      }
      if (act.model_name === 'Product' || act.action?.toLowerCase().includes('produit')) {
        return {
          ...act,
          type: 'produit',
          icon: Package,
          color: 'bg-orange-500',
          details: `Produit ${act.action}`
        };
      }
      if (act.model_name === 'CashRegister' || act.action?.toLowerCase().includes('caisse')) {
        return {
          ...act,
          type: 'caisse',
          icon: Monitor,
          color: 'bg-yellow-500',
          details: `Opération caisse`
        };
      }
      return {
        ...act,
        type: 'autre',
        icon: Clock,
        color: 'bg-gray-500',
        details: act.action || 'Activité'
      };
    });
  }, [activities]);

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return enrichedActivities;
    return enrichedActivities.filter(a => a.type === activityFilter);
  }, [enrichedActivities, activityFilter]);

  const activityStats = useMemo(() => ({
    ventes: enrichedActivities.filter(a => a.type === 'vente').length,
    commandes: enrichedActivities.filter(a => a.type === 'commande').length,
    connexions: enrichedActivities.filter(a => a.type === 'connexion').length,
    produits: enrichedActivities.filter(a => a.type === 'produit').length,
    total: enrichedActivities.length
  }), [enrichedActivities]);

  const enrichedSessions = useMemo((): EnrichedSession[] => {
    return (sessions || []).map((session, index) => {
      const loginTime = new Date(session.login_time);
      const now = new Date();
      const duration = session.logout_time 
        ? Math.round((new Date(session.logout_time).getTime() - loginTime.getTime()) / 60000)
        : Math.round((now.getTime() - loginTime.getTime()) / 60000);
      
      const location = session.ip_address?.startsWith('192.168.') || session.ip_address?.startsWith('10.')
        ? 'Réseau local'
        : session.ip_address === '127.0.0.1' 
          ? 'Localhost'
          : session.ip_address 
            ? 'Connexion distante'
            : 'Localisation inconnue';
      
      return {
        ...session,
        duration,
        location,
        isCurrent: index === 0 && !session.logout_time
      };
    });
  }, [sessions]);

  const activeSessions = enrichedSessions.filter(s => !s.logout_time);
  const displayedSessions = showAllSessions 
    ? enrichedSessions 
    : enrichedSessions.slice(0, 5);

  const sessionStats = useMemo(() => {
    const total = enrichedSessions.length;
    const active = activeSessions.length;
    const avgDuration = total > 0 ? enrichedSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / total : 0;
    
    const browsers = enrichedSessions.reduce((acc, s) => {
      const browser = s.device_info?.browser || 'Inconnu';
      acc[browser] = (acc[browser] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, active, avgDuration, browsers: Object.keys(browsers).length };
  }, [enrichedSessions, activeSessions]);

  // États de chargement et erreurs
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  if (!loading && !isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

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
            onClick={handleRetry}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données utilisateur...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
          aria-label="Déconnexion"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </header>

      {/* Message d'erreur global */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={clearError} 
            className="text-red-700 hover:text-red-900 text-xl"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 md:mb-8 bg-white rounded-t-lg">
        <nav className="flex space-x-4 md:space-x-8 overflow-x-auto px-4 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 md:py-4 px-2 border-b-2 font-medium text-xs md:text-sm flex items-center space-x-1 md:space-x-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Contenu principal */}
      <main className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Onglet Profil */}
        {activeTab === 'profile' && (
          <section className="p-4 md:p-8">
            {/* Photo et infos de base */}
            <div className="flex flex-col md:flex-row items-start space-y-4 md:space-y-0 md:space-x-6 mb-8">
              <div className="relative group">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-2 border-blue-200">
                  {imageLoading ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  ) : photoPreview || (profilePhoto && !imageError) ? (
                    <img 
                      src={photoPreview || profilePhoto} 
                      alt={fullName}
                      onLoad={() => {
                        console.log("✅ Image chargée");
                        setImageLoading(false);
                      }}
                      onError={() => {
                        console.error("❌ Erreur chargement image:", profilePhoto);
                        setImageError(true);
                        setImageLoading(false);
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 md:w-12 md:h-12 text-blue-500" />
                  )}
                </div>
                
                {/* Bouton de changement de photo */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || imageLoading}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  title="Changer la photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                
                {selectedFile && (
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
                    <button
                      onClick={handlePhotoUpload}
                      disabled={isUploading}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isUploading ? 'Envoi...' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPhotoPreview(null);
                      }}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">{fullName}</h2>
                <p className="text-sm md:text-base text-gray-600">@{user.username || 'utilisateur'}</p>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <InfoItem icon={Mail} text={user.email || 'Email non renseigné'} />
                  <InfoItem icon={Phone} text={user.phone || 'Non renseigné'} />
                  <InfoItem 
                    icon={Calendar} 
                    text={user.date_joined ? `Membre depuis ${new Date(user.date_joined).toLocaleDateString()}` : 'Date inconnue'} 
                  />
                  <InfoItem icon={MapPin} text={user.address || 'Non renseigné'} />
                </div>
              </div>

              <EditButton 
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onCancel={() => setIsEditing(false)}
                onSave={handleSubmit}
              />
            </div>

            {/* Formulaire d'édition */}
            {isEditing && (
              <ProfileForm 
                formData={formData}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                onCancel={() => setIsEditing(false)}
              />
            )}

            {/* Statistiques */}
            <Statistics 
              stats={stats || {}}
              user={user}
            />
          </section>
        )}

        {/* Onglet Activité */}
        {activeTab === 'activity' && (
          <ActivityList 
            activities={filteredActivities}
            stats={activityStats}
            filter={activityFilter}
            onFilterChange={setActivityFilter}
          />
        )}

        {/* Onglet Sessions */}
        {activeTab === 'sessions' && (
          <SessionList 
            sessions={displayedSessions}
            activeCount={activeSessions.length}
            totalCount={enrichedSessions.length}
            stats={sessionStats}
            showAll={showAllSessions}
            onToggleShowAll={() => setShowAllSessions(!showAllSessions)}
          />
        )}

        {/* Onglet Sécurité */}
        {activeTab === 'security' && (
          <SecurityForm
            passwordData={passwordData}
            onPasswordChange={handlePasswordChange}
            onSubmit={handlePasswordSubmit}
            message={passwordMessage}
            isChanging={isChangingPassword}
          />
        )}

        {/* Onglet Achats */}
        {activeTab === 'purchases' && user?.customer_profile && (
          <Purchases customerProfile={user.customer_profile} />
        )}
      </main>
    </div>
  );
};

// ============================================================================
// COMPOSANTS RÉUTILISABLES
// ============================================================================

const InfoItem: React.FC<{ icon: React.FC<{ className?: string }>; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex items-center text-sm md:text-base text-gray-600">
    <Icon className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
    <span className="truncate">{text}</span>
  </div>
);

const EditButton: React.FC<{
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}> = ({ isEditing, onEdit, onCancel, onSave }) => {
  if (!isEditing) {
    return (
      <button
        onClick={onEdit}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 self-start transition-colors shadow-sm"
      >
        <Edit2 className="w-4 h-4" />
        <span>Modifier</span>
      </button>
    );
  }

  return (
    <div className="flex space-x-2 self-start">
      <button
        onClick={onCancel}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        title="Annuler"
      >
        <X className="w-4 h-4" />
      </button>
      <button
        onClick={onSave}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        title="Enregistrer"
      >
        <Save className="w-4 h-4" />
      </button>
    </div>
  );
};

const ProfileForm: React.FC<{
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}> = ({ formData, onChange, onSubmit, onCancel }) => (
  <form onSubmit={onSubmit} className="border-t pt-6">
    <h3 className="text-lg font-semibold mb-4">Modifier mes informations</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        label="Prénom"
        name="first_name"
        value={formData.first_name}
        onChange={onChange}
      />
      <FormField
        label="Nom"
        name="last_name"
        value={formData.last_name}
        onChange={onChange}
      />
      <FormField
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={onChange}
      />
      <FormField
        label="Téléphone"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={onChange}
      />
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={onChange}
          rows={3}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
        />
      </div>
    </div>
    <div className="mt-4 flex justify-end space-x-2">
      <button
        type="button"
        onClick={onCancel}
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
);

const FormField: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}> = ({ label, name, value, onChange, type = 'text' }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
    />
  </div>
);

const Statistics: React.FC<{ stats: any; user: any }> = ({ stats, user }) => {
  if (!user) return null;
  
  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t pt-6">
      <StatCard
        value={stats?.total_logins || 0}
        label="Connexions"
        color="blue"
      />
      
      {user.customer_profile && (
        <>
          <StatCard
            value={user.customer_profile.loyalty_points || 0}
            label="Points fidélité"
            color="green"
          />
          <StatCard
            value={`${user.customer_profile.total_spent?.toLocaleString() || 0} FCFA`}
            label="Total dépensé"
            color="purple"
          />
        </>
      )}

      {user.employee_profile && (
        <div className="bg-orange-50 rounded-lg p-4 text-center md:col-span-2">
          <div className="text-xs md:text-sm text-gray-600 mb-1">Employé chez</div>
          <div className="text-base md:text-lg font-semibold text-gray-800">
            {user.employee_profile.store_name || 'Non assigné'}
          </div>
          <div className="text-xs md:text-sm text-gray-600 mt-1">
            {user.employee_profile.role_name || 'Rôle non défini'}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ value: string | number; label: string; color: 'blue' | 'green' | 'purple' }> = ({ 
  value, 
  label, 
  color 
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4 text-center`}>
      <div className="text-xl md:text-2xl font-bold">{value}</div>
      <div className="text-xs md:text-sm text-gray-600">{label}</div>
    </div>
  );
};

const ActivityList: React.FC<{ 
  activities: EnrichedActivity[];
  stats: any;
  filter: string;
  onFilterChange: (filter: string) => void;
}> = ({ activities, stats, filter, onFilterChange }) => (
  <div className="p-4 md:p-8">
    <h3 className="text-lg font-semibold mb-4">Activités récentes</h3>
    
    {/* Statistiques des activités */}
    <div className="grid grid-cols-4 gap-2 mb-6">
      <ActivityStat 
        label="Ventes" 
        value={stats?.ventes || 0} 
        icon={ShoppingBag}
        color="bg-green-100 text-green-700"
      />
      <ActivityStat 
        label="Commandes" 
        value={stats?.commandes || 0} 
        icon={ShoppingBag}
        color="bg-purple-100 text-purple-700"
      />
      <ActivityStat 
        label="Connexions" 
        value={stats?.connexions || 0} 
        icon={LogOut}
        color="bg-blue-100 text-blue-700"
      />
      <ActivityStat 
        label="Produits" 
        value={stats?.produits || 0} 
        icon={Package}
        color="bg-orange-100 text-orange-700"
      />
    </div>
    
    {/* Filtres */}
    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
      <FilterButton 
        active={filter === 'all'} 
        onClick={() => onFilterChange('all')}
      >
        Tous ({stats?.total || 0})
      </FilterButton>
      <FilterButton 
        active={filter === 'vente'} 
        onClick={() => onFilterChange('vente')}
      >
        Ventes ({stats?.ventes || 0})
      </FilterButton>
      <FilterButton 
        active={filter === 'commande'} 
        onClick={() => onFilterChange('commande')}
      >
        Commandes ({stats?.commandes || 0})
      </FilterButton>
      <FilterButton 
        active={filter === 'connexion'} 
        onClick={() => onFilterChange('connexion')}
      >
        Connexions ({stats?.connexions || 0})
      </FilterButton>
      <FilterButton 
        active={filter === 'produit'} 
        onClick={() => onFilterChange('produit')}
      >
        Produits ({stats?.produits || 0})
      </FilterButton>
    </div>
    
    {!activities || activities.length === 0 ? (
      <EmptyState icon={Clock} message="Aucune activité récente" />
    ) : (
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    )}
  </div>
);

const ActivityStat: React.FC<{ label: string; value: number; icon: any; color: string }> = ({ 
  label, value, icon: Icon, color 
}) => (
  <div className={`${color} rounded-lg p-2 text-center`}>
    <Icon className="w-4 h-4 mx-auto mb-1" />
    <div className="text-xs font-semibold">{value}</div>
    <div className="text-[10px]">{label}</div>
  </div>
);

const FilterButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ 
  active, onClick, children 
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

const ActivityItem: React.FC<{ activity: EnrichedActivity }> = ({ activity }) => {
  const Icon = activity.icon;
  
  return (
    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className={`p-2 rounded-full ${activity.color} bg-opacity-20`}>
        <Icon className={`w-4 h-4 ${activity.color.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex-1">
        <p className="text-gray-800 text-sm font-medium">{activity.action}</p>
        <p className="text-xs text-gray-600 mt-0.5">{activity.details}</p>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(activity.timestamp).toLocaleString()}
        </p>
      </div>
      {activity.amount && (
        <div className="text-sm font-semibold text-green-600">
          +{activity.amount.toLocaleString()} FCFA
        </div>
      )}
    </div>
  );
};

const SessionList: React.FC<{ 
  sessions: EnrichedSession[];
  activeCount: number;
  totalCount: number;
  stats: any;
  showAll: boolean;
  onToggleShowAll: () => void;
}> = ({ sessions, activeCount, totalCount, stats, showAll, onToggleShowAll }) => (
  <div className="p-4 md:p-8">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold">Sessions de connexion</h3>
      <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
        {activeCount} active{activeCount > 1 ? 's' : ''}
      </span>
    </div>
    
    {/* Session en cours (mise en avant) */}
    {activeCount > 0 && (
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-full">
              <LogOut className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Session en cours</p>
              <p className="text-sm text-blue-700">
                Connecté depuis {sessions.find(s => s.isCurrent)?.duration || 0} minutes
              </p>
            </div>
          </div>
          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full animate-pulse">
            Active
          </span>
        </div>
      </div>
    )}
    
    {/* Liste des sessions */}
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
    
    {/* Bouton pour voir plus */}
    {totalCount > 5 && (
      <button
        onClick={onToggleShowAll}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        {showAll ? 'Voir moins' : `Voir les ${totalCount - 5} autres sessions`}
      </button>
    )}
    
    {/* Statistiques des sessions */}
    <SessionStats stats={stats} />
  </div>
);

const SessionCard: React.FC<{ session: EnrichedSession }> = ({ session }) => {
  const getDeviceIcon = () => {
    if (session.device_info?.is_mobile) return Smartphone;
    return Monitor;
  };
  const DeviceIcon = getDeviceIcon();

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? mins : ''}`;
  };

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      session.isCurrent ? 'bg-blue-50/50 border-blue-300' : 'hover:shadow-md'
    }`}>
      <div className="flex flex-col md:flex-row justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <DeviceIcon className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium text-sm md:text-base">
                {session.device_info?.browser || 'Navigateur inconnu'} 
                sur {session.device_info?.os || 'OS inconnu'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {session.device_info?.device || 'Appareil inconnu'}
              </p>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="text-xs">
              <span className="text-gray-500">IP:</span>
              <span className="ml-1 text-gray-700">{session.ip_address || 'Inconnue'}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Localisation:</span>
              <span className="ml-1 text-gray-700">{session.location}</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Connecté le:</span>
              <span className="ml-1 text-gray-700">
                {new Date(session.login_time).toLocaleDateString()}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-gray-500">Durée:</span>
              <span className="ml-1 text-gray-700">{formatDuration(session.duration)}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-3 md:mt-0 flex items-center space-x-2">
          {!session.logout_time && (
            <>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Active
              </span>
              {!session.isCurrent && (
                <button className="text-xs text-red-600 hover:text-red-800">
                  Déconnecter
                </button>
              )}
            </>
          )}
          {session.logout_time && (
            <span className="text-xs text-gray-500">
              Déconnecté le {new Date(session.logout_time).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const SessionStats: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="mt-6 pt-4 border-t">
    <h4 className="text-sm font-medium text-gray-700 mb-3">Statistiques des sessions</h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-gray-50 p-3 rounded-lg text-center">
        <div className="text-xl font-bold text-gray-800">{stats?.total || 0}</div>
        <div className="text-xs text-gray-600">Total sessions</div>
      </div>
      <div className="bg-gray-50 p-3 rounded-lg text-center">
        <div className="text-xl font-bold text-green-600">{stats?.active || 0}</div>
        <div className="text-xs text-gray-600">Actives</div>
      </div>
      <div className="bg-gray-50 p-3 rounded-lg text-center">
        <div className="text-xl font-bold text-blue-600">
          {Math.round(stats?.avgDuration || 0)} min
        </div>
        <div className="text-xs text-gray-600">Durée moyenne</div>
      </div>
      <div className="bg-gray-50 p-3 rounded-lg text-center">
        <div className="text-xl font-bold text-purple-600">
          {stats?.browsers || 0}
        </div>
        <div className="text-xs text-gray-600">Navigateurs</div>
      </div>
    </div>
  </div>
);

const SecurityForm: React.FC<{
  passwordData: any;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  message: { type: MessageType; text: string } | null;
  isChanging: boolean;
}> = ({ passwordData, onPasswordChange, onSubmit, message, isChanging }) => (
  <div className="p-4 md:p-8">
    <h3 className="text-lg font-semibold mb-4">Changer le mot de passe</h3>
    
    {message && (
      <div className={`mb-4 p-3 rounded-lg flex items-center ${
        message.type === 'success' 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        {message.type === 'success' 
          ? <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /> 
          : <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
        }
        <span className="text-sm md:text-base">{message.text}</span>
      </div>
    )}
    
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <PasswordField
        label="Mot de passe actuel"
        name="current_password"
        value={passwordData.current_password}
        onChange={onPasswordChange}
      />
      <PasswordField
        label="Nouveau mot de passe"
        name="new_password"
        value={passwordData.new_password}
        onChange={onPasswordChange}
        minLength={6}
        hint="Minimum 6 caractères"
      />
      <PasswordField
        label="Confirmer le mot de passe"
        name="confirm_password"
        value={passwordData.confirm_password}
        onChange={onPasswordChange}
      />
      
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
        disabled={isChanging}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {isChanging ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Modification en cours...
          </>
        ) : (
          'Changer le mot de passe'
        )}
      </button>
    </form>
  </div>
);

const PasswordField: React.FC<{
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minLength?: number;
  hint?: string;
}> = ({ label, name, value, onChange, minLength, hint }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type="password"
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
      required
      minLength={minLength}
    />
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

const Purchases: React.FC<{ customerProfile: any }> = ({ customerProfile }) => (
  <div className="p-4 md:p-8">
    <h3 className="text-lg font-semibold mb-4">Historique d'achats</h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <StatCard
        value={customerProfile?.purchase_count || 0}
        label="Achats"
        color="blue"
      />
      <StatCard
        value={`${customerProfile?.average_basket?.toLocaleString() || 0} FCFA`}
        label="Panier moyen"
        color="green"
      />
    </div>

    <EmptyState icon={ShoppingBag} message="Fonctionnalité à venir : Liste détaillée des achats" />
  </div>
);

const EmptyState: React.FC<{ icon: React.FC<{ className?: string }>; message: string }> = ({ 
  icon: Icon, 
  message 
}) => (
  <div className="text-center py-12">
    <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
    <p className="text-gray-500 text-sm md:text-base">{message}</p>
  </div>
);

export default Profile;