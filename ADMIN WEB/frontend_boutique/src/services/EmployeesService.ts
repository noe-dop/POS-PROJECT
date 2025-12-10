// src/services/EmployeesService.ts - VERSION CORRIGÉE
import { api } from './api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: number;
  user_type_name: string;
  phone: string;
  phone2: string;
  address: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  updated_at: string;
}

export interface Employee {
  id: number;
  user: User;
  full_name: string;
  hire_date: string;
  salary: string;
  emergency_contact: string;
  is_active: boolean;
  store: number;
  store_name: string;
  department: number | null;
  department_name?: string;
  role: number;
  role_name: string;
  photo: string | null;
}

// Interface pour la création d'employé
export interface CreateEmployeeData {
  user_id: number;
  hire_date: string;
  salary: string;
  emergency_contact: string;
  store: number;
  department?: number;
  role: number;
  photo?: string | null;
}

// Interface pour la création combinée utilisateur + employé
export interface CreateEmployeeWithUserData {
  userData: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    phone2?: string;
    address: string;
    password: string;
    password_confirm: string;
    user_type: number;
  };
  employeeData: Omit<CreateEmployeeData, 'user_id'>;
}

// Interface pour la mise à jour
export interface UpdateEmployeeData {
  hire_date?: string;
  salary?: string;
  emergency_contact?: string;
  store?: number;
  department?: number | null;
  role?: number;
  photo?: string | null;
  is_active?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  phone2?: string;
  address?: string;
  email?: string;
  username?: string;
  password?: string;
  password_confirm?: string;
  is_active?: boolean;
}

class EmployeesService {
  /**
   * Récupérer tous les employés
   */
  async getEmployees(): Promise<Employee[]> {
    try {
      const response = await api.get<Employee[]>('/employees/');
      return response;
    } catch (error) {
      console.error('Erreur lors du chargement des employés:', error);
      throw error;
    }
  }

  /**
   * Récupérer un employé par son ID
   */
  async getEmployeeById(id: number): Promise<Employee> {
    try {
      const response = await api.get<Employee>(`/employees/${id}/`);
      return response;
    } catch (error) {
      console.error(`Erreur lors du chargement de l'employé ${id}:`, error);
      throw error;
    }
  }

  /**
   * Créer un nouvel employé
   */
  async createEmployee(employeeData: CreateEmployeeData): Promise<Employee> {
    try {
      // Formater le salaire comme string (important!)
      const formattedData = {
        ...employeeData,
        salary: String(employeeData.salary)
      };
      
      const response = await api.post<Employee>('/employees/', formattedData);
      return response;
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'employé:', error);
      if (error.response?.data) {
        console.error('Détails de l\'erreur employé:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Créer un utilisateur puis un employé - VERSION SIMPLIFIÉE ET FONCTIONNELLE
   */
  async createEmployeeWithUser(data: CreateEmployeeWithUserData): Promise<Employee> {
    try {
      console.log('🚀 Début création employé avec utilisateur');
      
      // 1. Vérifier et formater les données utilisateur
      const username = data.userData.username.trim() || 
        `${data.userData.first_name.toLowerCase()}.${data.userData.last_name.toLowerCase()}`;
      
      const userData = {
        username: username,
        email: data.userData.email,
        password: data.userData.password,
        password_confirm: data.userData.password_confirm,
        first_name: data.userData.first_name,
        last_name: data.userData.last_name,
        phone: data.userData.phone || '',
        address: data.userData.address || '',
        user_type: Number(data.userData.user_type) || 4  // Toujours 4 pour employé
      };

      console.log('📤 Données utilisateur envoyées:', { ...userData, password: '***', password_confirm: '***' });
      
      // 2. Créer l'utilisateur
      const userResponse = await api.post<any>('/auth/register/', userData);
      console.log('✅ Réponse création utilisateur:', userResponse);
      
      // 3. DEBUG: Afficher la structure complète
      console.log('🔍 Structure réponse complète:');
      console.log('Type:', typeof userResponse);
      console.log('Est objet?', typeof userResponse === 'object');
      if (userResponse && typeof userResponse === 'object') {
        console.log('Clés:', Object.keys(userResponse));
        console.log('JSON stringify:', JSON.stringify(userResponse, null, 2));
      }
      
      // 4. Extraire l'ID utilisateur - méthode robuste
      let userId: number;
      
      // Fonction pour chercher récursivement un ID numérique
      const findUserId = (obj: any): number | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        // Chercher 'id' au niveau racine
        if (obj.id !== undefined && typeof obj.id === 'number') {
          return obj.id;
        }
        
        // Chercher dans toutes les propriétés
        for (const key in obj) {
          const value = obj[key];
          
          // Si la propriété est 'id' et c'est un nombre
          if (key.toLowerCase() === 'id' && typeof value === 'number') {
            return value;
          }
          
          // Si la valeur est un objet, chercher dedans
          if (value && typeof value === 'object') {
            const found = findUserId(value);
            if (found !== null) return found;
          }
        }
        
        return null;
      };
      
      const foundId = findUserId(userResponse);
      
      if (foundId !== null) {
        userId = foundId;
        console.log('✅ ID utilisateur trouvé:', userId);
      } else {
        // Si on ne trouve pas l'ID, chercher l'utilisateur par email
        console.warn('⚠️ ID non trouvé dans la réponse, recherche par email...');
        
        try {
          // Chercher l'utilisateur par email
          const users = await api.get<any[]>('/users/');
          const foundUser = users.find(u => u.email === data.userData.email);
          
          if (foundUser && foundUser.id) {
            userId = foundUser.id;
            console.log('✅ ID trouvé par recherche email:', userId);
          } else {
            throw new Error('ID utilisateur introuvable après création');
          }
        } catch (searchError) {
          console.error('Erreur recherche utilisateur:', searchError);
          throw new Error('Impossible de récupérer l\'ID utilisateur créé');
        }
      }
      
      // 5. Créer l'employé avec l'ID utilisateur
      const employeePayload: CreateEmployeeData = {
        user_id: userId,
        hire_date: data.employeeData.hire_date,
        salary: String(data.employeeData.salary), // Convertir en string
        emergency_contact: data.employeeData.emergency_contact,
        store: data.employeeData.store,
        role: data.employeeData.role,
        ...(data.employeeData.department && { department: data.employeeData.department }),
        ...(data.employeeData.photo && { photo: data.employeeData.photo })
      };

      console.log('📤 Données employé envoyées:', employeePayload);
      
      // 6. Créer l'employé
      const employeeResponse = await this.createEmployee(employeePayload);
      
      console.log('🎉 Employé créé avec succès, ID:', employeeResponse.id);
      return employeeResponse;
      
    } catch (error: any) {
      console.error('💥 Erreur création employé avec utilisateur:', error);
      
      if (error.response?.data) {
        console.error('📋 Détails erreur API:', {
          status: error.response.status,
          data: error.response.data
        });
        
        // Formater l'erreur pour l'utilisateur
        const errorData = error.response.data;
        let errorMessage = 'Erreur lors de la création: ';
        
        if (typeof errorData === 'object') {
          const errors = [];
          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              errors.push(`${field}: ${messages.join(', ')}`);
            } else {
              errors.push(`${field}: ${messages}`);
            }
          }
          errorMessage += errors.join('; ');
        } else {
          errorMessage += JSON.stringify(errorData);
        }
        
        throw new Error(errorMessage);
      }
      
      throw error;
    }
  }

  /**
   * Mettre à jour un employé
   */
  async updateEmployee(id: number, employeeData: UpdateEmployeeData): Promise<Employee> {
    try {
      const dataToSend: any = {};
      
      // Formater les données
      if (employeeData.salary !== undefined) {
        dataToSend.salary = String(employeeData.salary);
      }
      if (employeeData.store !== undefined) {
        dataToSend.store = Number(employeeData.store);
      }
      if (employeeData.role !== undefined) {
        dataToSend.role = Number(employeeData.role);
      }
      if (employeeData.department !== undefined) {
        dataToSend.department = employeeData.department !== null ? Number(employeeData.department) : null;
      }
      
      // Autres champs
      if (employeeData.hire_date !== undefined) dataToSend.hire_date = employeeData.hire_date;
      if (employeeData.emergency_contact !== undefined) dataToSend.emergency_contact = employeeData.emergency_contact;
      if (employeeData.photo !== undefined) dataToSend.photo = employeeData.photo;
      if (employeeData.is_active !== undefined) dataToSend.is_active = employeeData.is_active;
      
      const response = await api.patch<Employee>(`/employees/${id}/`, dataToSend);
      return response;
    } catch (error) {
      console.error(`Erreur mise à jour employé ${id}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId: number, userData: UpdateUserData): Promise<User> {
    try {
      const dataToSend: any = {};
      
      Object.keys(userData).forEach(key => {
        if (userData[key as keyof UpdateUserData] !== undefined) {
          dataToSend[key] = userData[key as keyof UpdateUserData];
        }
      });
      
      const response = await api.patch<User>(`/users/${userId}/`, dataToSend);
      return response;
    } catch (error) {
      console.error(`Erreur mise à jour utilisateur ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour un employé et son utilisateur
   */
  async updateEmployeeWithUserInfo(
    employeeId: number, 
    employeeUpdate: UpdateEmployeeData, 
    userUpdate: UpdateUserData
  ): Promise<Employee> {
    try {
      let updatedEmployee: Employee;

      // 1. Mettre à jour l'utilisateur si nécessaire
      if (userUpdate && Object.keys(userUpdate).length > 0) {
        const employee = await this.getEmployeeById(employeeId);
        const userId = employee.user.id;
        await this.updateUser(userId, userUpdate);
      }
      
      // 2. Mettre à jour l'employé si nécessaire
      if (employeeUpdate && Object.keys(employeeUpdate).length > 0) {
        updatedEmployee = await this.updateEmployee(employeeId, employeeUpdate);
      } else {
        updatedEmployee = await this.getEmployeeById(employeeId);
      }
      
      return updatedEmployee;
    } catch (error) {
      console.error(`Erreur mise à jour complète employé ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un employé
   */
  async deleteEmployee(id: number): Promise<void> {
    try {
      await api.delete(`/employees/${id}/`);
    } catch (error) {
      console.error(`Erreur suppression employé ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les employés par boutique
   */
  async getEmployeesByStore(storeId: number): Promise<Employee[]> {
    try {
      const response = await api.get<Employee[]>(`/employees/?store=${storeId}`);
      return response;
    } catch (error) {
      console.error(`Erreur chargement employés boutique ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Rechercher des employés
   */
  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      const response = await api.get<Employee[]>(`/employees/?search=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.error('Erreur recherche employés:', error);
      throw error;
    }
  }

  /**
   * Récupérer les rôles disponibles
   */
  async getEmployeeRoles(): Promise<{id: number, name: string}[]> {
    try {
      const response = await api.get<any[]>('/employee-roles/');
      return response.map(role => ({
        id: role.id,
        name: role.name
      }));
    } catch (error) {
      console.error('Erreur chargement rôles employés:', error);
      throw error;
    }
  }

  /**
   * Activer/désactiver un employé
   */
  async toggleEmployeeStatus(id: number, isActive: boolean): Promise<Employee> {
    try {
      const response = await api.patch<Employee>(`/employees/${id}/`, {
        is_active: isActive
      });
      return response;
    } catch (error) {
      console.error(`Erreur changement statut employé ${id}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les boutiques disponibles
   */
  async getStores(): Promise<{id: number, name: string}[]> {
    try {
      const response = await api.get<any[]>('/stores/');
      return response.map(store => ({
        id: store.id,
        name: store.name
      }));
    } catch (error) {
      console.error('Erreur chargement boutiques:', error);
      throw error;
    }
  }
}

export const employeesService = new EmployeesService();
export default employeesService;