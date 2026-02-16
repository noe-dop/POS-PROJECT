// src/pages/Employees.tsx - VERSION 100% SANS DONNÉES MOCKÉES
import React, { useState, useEffect, useCallback } from 'react';
import { employeesService, Employee, CreateEmployeeWithUserData } from '@services/EmployeesService';

interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone2?: string;
  address: string;
  password: string;
  password_confirm: string;
}

interface EmployeeFormData {
  user_id: number;
  hire_date: string;
  salary: string;
  emergency_contact: string;
  store: number;
  role: number;
  department?: number;
}

interface ApiError {
  response?: {
    data?: any;
    status?: number;
  };
  message?: string;
}

interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Role {
  id: number;
  name: string;
  code?: string;
  description?: string;
  permissions?: Record<string, any>;
}

interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

interface CurrencyRate {
  currency: string;
  rate: number;
  updated_at: string;
}

// Icônes (inchangées)
const SearchIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CameraIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Composant Avatar avec photo ou initiales
const Avatar: React.FC<{ 
  src?: string | null; 
  alt?: string; 
  firstName?: string; 
  lastName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ src, alt, firstName, lastName, className = "", size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const getInitials = () => {
    if (!firstName && !lastName) return '?';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (src) {
    return (
      <img
        src={src}
        alt={alt || `${firstName} ${lastName}`}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold ${sizeClasses[size]} ${className}`}>
      {getInitials()}
    </div>
  );
};

// Composant Badge pour le statut
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = () => {
    switch(status.toLowerCase()) {
      case 'actif':
        return 'bg-green-100 text-green-800';
      case 'en congé':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactif':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {status}
    </span>
  );
};

// Composant Badge pour le rôle
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const getRoleColor = () => {
    if (!role) return 'bg-gray-100 text-gray-800';
    
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('directeur') || roleLower.includes('administrateur')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (roleLower.includes('manager') || roleLower.includes('responsable') || roleLower.includes('gérant')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (roleLower.includes('boucher') || roleLower.includes('charcutier') || 
        roleLower.includes('poissonnier') || roleLower.includes('fromager') || 
        roleLower.includes('boulanger') || roleLower.includes('pâtissier') || 
        roleLower.includes('primeur')) {
      return 'bg-indigo-100 text-indigo-800';
    }
    if (roleLower.includes('caissier') || roleLower.includes('vendeur') || 
        roleLower.includes('hôte') || roleLower.includes('agent d\'accueil')) {
      return 'bg-green-100 text-green-800';
    }
    if (roleLower.includes('magasinier') || roleLower.includes('cariste') || 
        roleLower.includes('préparateur') || roleLower.includes('livreur')) {
      return 'bg-amber-100 text-amber-800';
    }
    if (roleLower.includes('entretien') || roleLower.includes('maintenance') || 
        roleLower.includes('technicien') || roleLower.includes('informaticien')) {
      return 'bg-gray-100 text-gray-800';
    }
    if (roleLower.includes('comptable') || roleLower.includes('rh') || 
        roleLower.includes('secrétaire') || roleLower.includes('administratif')) {
      return 'bg-teal-100 text-teal-800';
    }
    if (roleLower.includes('marketing') || roleLower.includes('promoteur')) {
      return 'bg-pink-100 text-pink-800';
    }
    if (roleLower.includes('sécurité') || roleLower.includes('agent de sécurité')) {
      return 'bg-red-100 text-red-800';
    }
    if (roleLower.includes('stagiaire') || roleLower.includes('apprenti')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor()}`}>
      {role || 'Non défini'}
    </span>
  );
};

// Composant EmployeeCard
const EmployeeCard: React.FC<{
  employee: Employee;
  isSelected: boolean;
  onClick: () => void;
}> = ({ employee, isSelected, onClick }) => {
  if (!employee?.user) return null;
  
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 mt-1">
        <input 
          type="checkbox" 
          checked={isSelected}
          onChange={() => {}}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-gray-900 truncate">
            {employee.user.first_name} {employee.user.last_name}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <RoleBadge role={employee.role_name} />
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={employee.user.is_active ? 'Actif' : 'Inactif'} />
        </div>
        
        <div className="text-xs text-gray-500 truncate">
          {employee.user.email}
        </div>
      </div>
    </div>
  );
};

// Composant pour l'upload de photo
const PhotoUpload: React.FC<{
  preview: string | null;
  onFileChange: (file: File) => void;
}> = ({ preview, onFileChange }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className={`relative rounded-full border-2 border-dashed ${preview ? 'border-transparent' : 'border-gray-300'} cursor-pointer hover:border-blue-500 transition-colors`}
        onClick={handleClick}
      >
        {preview ? (
          <img
            src={preview}
            alt="Photo de profil"
            className="w-32 h-32 rounded-full object-cover"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-100 flex flex-col items-center justify-center">
            <CameraIcon className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Ajouter une photo</span>
          </div>
        )}
        
        <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors">
          <CameraIcon className="w-4 h-4" />
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <p className="text-xs text-gray-500 mt-2 text-center">
        PNG, JPG, JPEG jusqu'à 5MB
      </p>
    </div>
  );
};

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currencyRate, setCurrencyRate] = useState<CurrencyRate | null>(null);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    phone2: '',
    address: '',
    password: '',
    password_confirm: '',
  });
  
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>({
    user_id: 0,
    hire_date: new Date().toISOString().split('T')[0],
    salary: '',
    emergency_contact: '',
    store: 0,  // ✅ Plus de valeur par défaut mockée
    role: 0    // ✅ Plus de valeur par défaut mockée
  });

  const [userUpdateData, setUserUpdateData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    phone2: '',
    address: ''
  });

  // ✅ Fonction pour formater les montants en FCFA (depuis le backend)
  const formatCFA = (amount: string | number): string => {
    if (!amount && amount !== 0) return 'Non spécifié';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 FCFA';
    return num.toLocaleString('fr-FR') + ' FCFA';
  };

  // ✅ Fonction pour convertir en Euro (avec taux depuis le backend)
  const convertToEuro = (amount: string | number): string => {
    if (!amount && amount !== 0) return '';
    if (!currencyRate) return ''; // Pas de taux disponible
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '';
    
    const euroAmount = num / currencyRate.rate;
    return euroAmount.toLocaleString('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + ' €';
  };

  const handleApiError = (error: ApiError, defaultMessage: string): string => {
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        return Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('\n');
      }
      return errorData.message || errorData.toString() || defaultMessage;
    }
    return error.message || defaultMessage;
  };

  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // ✅ Fonctions API
  const fetchStores = async (): Promise<Store[]> => {
    try {
      const response = await fetch('http://localhost:8000/api/stores/');
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      const data = await response.json();
      
      if (Array.isArray(data)) return data;
      if (data.results && Array.isArray(data.results)) return data.results;
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des boutiques:', error);
      return [];
    }
  };

  const fetchRoles = async (): Promise<Role[]> => {
    try {
      const response = await fetch('http://localhost:8000/api/employee-roles/');
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data.map(role => ({
          id: role.id,
          name: role.name,
          code: role.code || role.name.toUpperCase().replace(/\s+/g, '_'),
          description: role.description || role.name,
          permissions: role.permissions || {}
        }));
      }
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((role: any) => ({
          id: role.id,
          name: role.name,
          code: role.code || role.name.toUpperCase().replace(/\s+/g, '_'),
          description: role.description || role.name,
          permissions: role.permissions || {}
        }));
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      return [];
    }
  };

  const fetchDepartments = async (): Promise<Department[]> => {
    try {
      const response = await fetch('http://localhost:8000/api/departments/');
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data.map(dept => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description
        }));
      }
      if (data.results && Array.isArray(data.results)) {
        return data.results.map((dept: any) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description
        }));
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des départements:', error);
      return [];
    }
  };

  const fetchCurrencyRate = async (): Promise<CurrencyRate | null> => {
    try {
      const response = await fetch('http://localhost:8000/api/currencies/XOF/');
      if (!response.ok) return null;
      const data = await response.json();
      return {
        currency: data.code || 'XOF',
        rate: data.rate_to_euro || 656,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Erreur lors du chargement du taux de change:', error);
      return null;
    }
  };

  // ✅ Plus de dépendance circulaire
  const fetchEmployeesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [storesData, employeesData, rolesData, departmentsData, currencyRateData] = await Promise.all([
        fetchStores(),
        employeesService.getEmployees(),
        fetchRoles(),
        fetchDepartments(),
        fetchCurrencyRate()
      ]);
      
      setStores(storesData);
      setEmployees(employeesData);
      setRoles(rolesData);
      setDepartments(departmentsData);
      setCurrencyRate(currencyRateData);
      setFilteredEmployees(employeesData);
      
      if (employeesData.length > 0 && !selectedEmployee) {
        setSelectedEmployee(employeesData[0]);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      const errorMessage = handleApiError(error as ApiError, 'Impossible de charger les données depuis l\'API.');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // ✅ Dépendances vides - plus de dépendance circulaire

  // Effets
  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  // Filtrer les employés
  useEffect(() => {
    let filtered = employees;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(employee =>
        employee.full_name?.toLowerCase().includes(term) ||
        employee.user?.full_name?.toLowerCase().includes(term) ||
        employee.user?.first_name?.toLowerCase().includes(term) ||
        employee.user?.last_name?.toLowerCase().includes(term) ||
        employee.role_name?.toLowerCase().includes(term) ||
        employee.user?.email?.toLowerCase().includes(term) ||
        employee.user?.username?.toLowerCase().includes(term)
      );
    }

    if (selectedStore !== 'all') {
      const storeId = parseInt(selectedStore);
      filtered = filtered.filter(employee => employee.store === storeId);
    }

    setFilteredEmployees(filtered);
    
    if (selectedEmployee && !filtered.find(e => e.id === selectedEmployee.id) && filtered.length > 0) {
      setSelectedEmployee(filtered[0]);
    } else if (!selectedEmployee && filtered.length > 0) {
      setSelectedEmployee(filtered[0]);
    } else if (filtered.length === 0) {
      setSelectedEmployee(null);
    }
  }, [searchTerm, employees, selectedStore]);

  // Gestionnaires
  const handleStoreFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStore(e.target.value);
  };

  const getStoreName = (storeId: number | string): string => {
    if (storeId === 'all') return 'Toutes les boutiques';
    const store = stores.find(s => s.id === parseInt(storeId as string));
    return store ? store.name : `Boutique #${storeId}`;
  };

  const getEmployeeStoreName = (employee: Employee): string => {
    const store = stores.find(s => s.id === employee.store);
    return store ? store.name : `Boutique #${employee.store}`;
  };

  const getStoreDetails = (storeId: number): string => {
    const store = stores.find(s => s.id === storeId);
    if (!store) return '';
    const details = [];
    if (store.address) details.push(store.address);
    if (store.phone) details.push(`Tél: ${store.phone}`);
    return details.join(' • ');
  };

  const getEmployeeFullName = (employee: Employee) => {
    return employee.full_name || `${employee.user?.first_name || ''} ${employee.user?.last_name || ''}`.trim() || 'Nom non défini';
  };

  const getEmployeeStatus = (employee: Employee) => {
    return employee.user?.is_active ? 'Actif' : 'Inactif';
  };

  // ✅ Départements depuis l'API
  const getDepartmentName = (employee: Employee): string => {
    if (employee.department_name) {
      return employee.department_name;
    }
    if (employee.department) {
      const department = departments.find(d => d.id === employee.department);
      return department?.name || `Département #${employee.department}`;
    }
    return 'Non défini';
  };

  const handleCreateEmployee = () => {
    setFormMode('create');
    setEditingEmployee(null);
    setUserFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      phone2: '',
      address: '',
      password: '',
      password_confirm: '',
    });
    setEmployeeFormData({
      user_id: 0,
      hire_date: new Date().toISOString().split('T')[0],
      salary: '',
      emergency_contact: '',
      store: 0,  // ✅ Pas de valeur par défaut
      role: 0    // ✅ Pas de valeur par défaut
    });
    setPhotoPreview(null);
    setPhotoFile(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setFormMode('edit');
    setEditingEmployee(employee);
    
    setUserUpdateData({
      first_name: employee.user.first_name || '',
      last_name: employee.user.last_name || '',
      phone: employee.user.phone || '',
      phone2: employee.user.phone2 || '',
      address: employee.user.address || ''
    });
    
    setEmployeeFormData({
      user_id: employee.user.id,
      hire_date: formatDateForInput(employee.hire_date),
      salary: employee.salary,
      emergency_contact: employee.emergency_contact || '',
      store: employee.store,
      role: employee.role,
      department: employee.department || undefined
    });
    
    setPhotoPreview(employee.photo || null);
    setPhotoFile(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleDeleteEmployee = async (employeeId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet employé ?')) {
      try {
        await employeesService.deleteEmployee(employeeId);
        await fetchEmployeesData();
        alert('Employé supprimé avec succès');
      } catch (error) {
        console.error('Erreur suppression:', error);
        const errorMessage = handleApiError(error as ApiError, 'Erreur lors de la suppression de l\'employé');
        alert(errorMessage);
      }
    }
  };

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserUpdateData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployeeFormData(prev => ({
      ...prev,
      [name]: name === 'store' || name === 'role' || name === 'department' ? (value ? parseInt(value) : 0) : value
    }));
  };

  const handlePhotoUpload = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormError(null);
    setEditingEmployee(null);
    setPhotoPreview(null);
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormLoading(true);
    setFormError(null);

    try {
      if (formMode === 'create') {
        // Validations
        if (!userFormData.password) {
          setFormError('Le mot de passe est obligatoire pour la création');
          setFormLoading(false);
          return;
        }

        if (userFormData.password !== userFormData.password_confirm) {
          setFormError('Les mots de passe ne correspondent pas');
          setFormLoading(false);
          return;
        }

        if (!employeeFormData.store || employeeFormData.store === 0) {
          setFormError('Veuillez sélectionner une boutique');
          setFormLoading(false);
          return;
        }

        if (!employeeFormData.role || employeeFormData.role === 0) {
          setFormError('Veuillez sélectionner un rôle');
          setFormLoading(false);
          return;
        }

        const salaryNumber = parseFloat(employeeFormData.salary);
        if (isNaN(salaryNumber) || salaryNumber < 50000) {
          setFormError('Le salaire doit être d\'au moins 50 000 FCFA');
          setFormLoading(false);
          return;
        }

        if (!employeeFormData.emergency_contact) {
          setFormError('Le contact d\'urgence est obligatoire');
          setFormLoading(false);
          return;
        }

        if (employeeFormData.emergency_contact.length > 15) {
          setFormError('Le contact d\'urgence ne doit pas dépasser 15 caractères');
          setFormLoading(false);
          return;
        }

        if (!/^\d+$/.test(employeeFormData.emergency_contact)) {
          setFormError('Le contact d\'urgence ne doit contenir que des chiffres');
          setFormLoading(false);
          return;
        }

        let photoBase64 = null;
        if (photoFile) {
          photoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(photoFile);
          });
        }

        const createData: CreateEmployeeWithUserData = {
          userData: {
            username: userFormData.username,
            email: userFormData.email,
            first_name: userFormData.first_name,
            last_name: userFormData.last_name,
            phone: userFormData.phone,
            phone2: userFormData.phone2 || '',
            address: userFormData.address,
            password: userFormData.password,
            password_confirm: userFormData.password_confirm,
          },
          employeeData: {
            hire_date: employeeFormData.hire_date,
            salary: employeeFormData.salary,
            emergency_contact: employeeFormData.emergency_contact,
            store: employeeFormData.store,
            role: employeeFormData.role,
            ...(employeeFormData.department && { department: employeeFormData.department }),
            ...(photoBase64 && { photo: photoBase64 })
          }
        };

        await employeesService.createEmployeeWithUser(createData);
        await fetchEmployeesData();
        alert('Employé créé avec succès !');
        setShowForm(false);
        
      } else {
        if (!editingEmployee) return;

        const employeeUpdate: any = {};
        
        if (employeeFormData.hire_date !== editingEmployee.hire_date) {
          employeeUpdate.hire_date = employeeFormData.hire_date;
        }
        
        if (employeeFormData.salary !== editingEmployee.salary) {
          employeeUpdate.salary = employeeFormData.salary;
        }
        
        if (employeeFormData.emergency_contact !== editingEmployee.emergency_contact) {
          employeeUpdate.emergency_contact = employeeFormData.emergency_contact;
        }
        
        if (Number(employeeFormData.store) !== editingEmployee.store) {
          employeeUpdate.store = Number(employeeFormData.store);
        }
        
        if (Number(employeeFormData.role) !== editingEmployee.role) {
          employeeUpdate.role = Number(employeeFormData.role);
        }

        if (employeeFormData.department !== editingEmployee.department) {
          employeeUpdate.department = employeeFormData.department || null;
        }

        if (photoFile) {
          const photoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(photoFile);
          });
          employeeUpdate.photo = photoBase64;
        } else if (photoPreview === null && editingEmployee.photo) {
          employeeUpdate.photo = null;
        }

        const userUpdate: any = {};
        if (userUpdateData.first_name !== editingEmployee.user.first_name) {
          userUpdate.first_name = userUpdateData.first_name;
        }
        if (userUpdateData.last_name !== editingEmployee.user.last_name) {
          userUpdate.last_name = userUpdateData.last_name;
        }
        if (userUpdateData.phone !== editingEmployee.user.phone) {
          userUpdate.phone = userUpdateData.phone;
        }
        if (userUpdateData.phone2 !== editingEmployee.user.phone2) {
          userUpdate.phone2 = userUpdateData.phone2;
        }
        if (userUpdateData.address !== editingEmployee.user.address) {
          userUpdate.address = userUpdateData.address;
        }

        await employeesService.updateEmployeeWithUserInfo(
          editingEmployee.id,
          employeeUpdate,
          userUpdate
        );

        await fetchEmployeesData();
        alert('Employé modifié avec succès !');
        setShowForm(false);
      }
      
    } catch (error: any) {
      console.error(`Erreur ${formMode} employé:`, error);
      setFormError(handleApiError(error, `Erreur lors de ${formMode === 'create' ? 'la création' : 'la modification'} de l'employé`));
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (phone && phone.length === 10) {
      return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone || 'Non spécifié';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-700 text-sm font-medium">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* SECTION 1 : Gestion des Employés */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Employés</h1>
        <p className="text-gray-600 mt-1">Gérez l'ensemble des informations de vos employés, leurs rôles et statuts.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* SECTION 2 : FILTRE PAR BOUTIQUE */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Filtrer par boutique :</span>
          <div className="relative">
            <select
              value={selectedStore}
              onChange={handleStoreFilterChange}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Toutes les boutiques</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-gray-500">
            {selectedStore === 'all' 
              ? `(${filteredEmployees.length} employés)` 
              : `(${filteredEmployees.length} employés dans ${getStoreName(selectedStore)})`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau gauche : Liste des employés */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Liste des Employés</h2>
              <p className="text-gray-600 text-sm mb-4">Gérer et visualiser les employés de votre entreprise.</p>
              
              <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleCreateEmployee}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Ajouter un employé
              </button>
            </div>

            <div className="space-y-3">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  isSelected={selectedEmployee?.id === employee.id}
                  onClick={() => setSelectedEmployee(employee)}
                />
              ))}

              {filteredEmployees.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm">Aucun employé trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panneau droit : Profil de l'employé */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil de l'Employé</h2>
            <p className="text-gray-600 text-sm mb-6">Informations détaillées et gestion du profil.</p>

            {selectedEmployee ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <Avatar
                    src={selectedEmployee.photo}
                    firstName={selectedEmployee.user?.first_name}
                    lastName={selectedEmployee.user?.last_name}
                    size="lg"
                  />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {getEmployeeFullName(selectedEmployee)}
                    </h3>
                    <p className="text-gray-600">{selectedEmployee.user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {getEmployeeStoreName(selectedEmployee)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <table className="w-full">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 text-sm font-medium text-gray-500 w-1/3">Rôle</td>
                        <td className="py-3">
                          <RoleBadge role={selectedEmployee.role_name} />
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-500 w-1/3">Statut</td>
                        <td className="py-3">
                          <StatusBadge status={getEmployeeStatus(selectedEmployee)} />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 text-sm font-medium text-gray-500">Téléphone</td>
                        <td className="py-3 text-gray-900">{formatPhoneNumber(selectedEmployee.user?.phone)}</td>
                        <td className="py-3 text-sm font-medium text-gray-500">Date d'embauche</td>
                        <td className="py-3 text-gray-900">{formatDate(selectedEmployee.hire_date)}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 text-sm font-medium text-gray-500">Adresse</td>
                        <td className="py-3 text-gray-900">{selectedEmployee.user?.address || 'Non spécifiée'}</td>
                        <td className="py-3 text-sm font-medium text-gray-500">Boutique affiliée</td>
                        <td className="py-3 text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-blue-600">
                              {getEmployeeStoreName(selectedEmployee)}
                            </span>
                            {getStoreDetails(selectedEmployee.store) && (
                              <span className="text-xs text-gray-500">
                                ({getStoreDetails(selectedEmployee.store)})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 text-sm font-medium text-gray-500">Département</td>
                        <td className="py-3 text-gray-900">{getDepartmentName(selectedEmployee)}</td>
                        <td className="py-3 text-sm font-medium text-gray-500">Contact d'urgence</td>
                        <td className="py-3 text-gray-900">{selectedEmployee.emergency_contact || 'Non spécifié'}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 text-sm font-medium text-gray-500">Salaire</td>
                        <td className="py-3 text-gray-900" colSpan={3}>
                          <div className="flex flex-col">
                            <span className="font-semibold">{formatCFA(selectedEmployee.salary)}</span>
                            {currencyRate && (
                              <span className="text-xs text-gray-500 mt-1">
                                ≈ {convertToEuro(selectedEmployee.salary)} (1 € = {currencyRate.rate} FCFA)
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => handleEditEmployee(selectedEmployee)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <EditIcon className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <DeleteIcon className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Sélectionnez un employé pour voir son profil</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL FORMULAIRE */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {formMode === 'create' ? 'Créer un nouvel employé' : `Modifier l'employé`}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                  <p className="text-red-800 whitespace-pre-line text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Photo de profil (optionnel)</h3>
                  <PhotoUpload 
                    preview={photoPreview}
                    onFileChange={handlePhotoUpload}
                  />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Informations personnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom *
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formMode === 'create' ? userFormData.first_name : userUpdateData.first_name}
                        onChange={formMode === 'create' ? handleUserFormChange : handleUserUpdateChange}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formMode === 'create' ? userFormData.last_name : userUpdateData.last_name}
                        onChange={formMode === 'create' ? handleUserFormChange : handleUserUpdateChange}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    {formMode === 'create' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nom d'utilisateur *
                          </label>
                          <input
                            type="text"
                            name="username"
                            value={userFormData.username}
                            onChange={handleUserFormChange}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={userFormData.email}
                            onChange={handleUserFormChange}
                            required
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formMode === 'create' ? userFormData.phone : userUpdateData.phone}
                        onChange={formMode === 'create' ? handleUserFormChange : handleUserUpdateChange}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone secondaire (optionnel)
                      </label>
                      <input
                        type="tel"
                        name="phone2"
                        value={formMode === 'create' ? userFormData.phone2 : userUpdateData.phone2}
                        onChange={formMode === 'create' ? handleUserFormChange : handleUserUpdateChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formMode === 'create' ? userFormData.address : userUpdateData.address}
                      onChange={formMode === 'create' ? handleUserFormChange : handleUserUpdateChange}
                      required
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {formMode === 'create' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe *
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={userFormData.password}
                          onChange={handleUserFormChange}
                          required
                          minLength={6}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmer le mot de passe *
                        </label>
                        <input
                          type="password"
                          name="password_confirm"
                          value={userFormData.password_confirm}
                          onChange={handleUserFormChange}
                          required
                          minLength={6}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Informations professionnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date d'embauche *
                      </label>
                      <input
                        type="date"
                        name="hire_date"
                        value={employeeFormData.hire_date}
                        onChange={handleEmployeeFormChange}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salaire (FCFA) *
                      </label>
                      <input
                        type="number"
                        name="salary"
                        value={employeeFormData.salary}
                        onChange={handleEmployeeFormChange}
                        required
                        min="50000"
                        step="1000"
                        placeholder="Ex: 250000"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        {employeeFormData.salary ? (
                          <span>Minimum 50 000 FCFA</span>
                        ) : (
                          <span>Minimum 50 000 FCFA</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Boutique *
                      </label>
                      <select
                        name="store"
                        value={employeeFormData.store}
                        onChange={handleEmployeeFormChange}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionnez une boutique</option>
                        {stores.map(store => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle *
                      </label>
                      <select
                        name="role"
                        value={employeeFormData.role}
                        onChange={handleEmployeeFormChange}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionnez un rôle</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Département
                      </label>
                      <select
                        name="department"
                        value={employeeFormData.department || ''}
                        onChange={handleEmployeeFormChange}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Sélectionnez un département</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact d'urgence *
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact"
                        value={employeeFormData.emergency_contact}
                        onChange={handleEmployeeFormChange}
                        required
                        maxLength={15}
                        pattern="\d*"
                        title="Le contact d'urgence ne doit contenir que des chiffres (max 15)"
                        placeholder="Ex: 0708091011"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="mt-1 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {employeeFormData.emergency_contact?.length || 0}/15 caractères
                        </span>
                        {employeeFormData.emergency_contact?.length > 15 && (
                          <span className="text-xs text-red-600">
                            Trop long (max 15)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        {formMode === 'create' ? 'Création...' : 'Modification...'}
                      </>
                    ) : (
                      formMode === 'create' ? 'Créer l\'employé' : 'Modifier l\'employé'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;