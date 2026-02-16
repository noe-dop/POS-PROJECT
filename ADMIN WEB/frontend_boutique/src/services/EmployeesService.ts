// src/services/EmployeesService.ts - VERSION FINALE CORRIGÉE
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
   * Créer un nouvel employé (déjà existant)
   */
  async createEmployee(employeeData: CreateEmployeeData): Promise<Employee> {
    try {
      const formattedData = {
        ...employeeData,
        salary: String(employeeData.salary)
      };
      
      const response = await api.post<Employee>('/employees/', formattedData);
      return response;
    } catch (error: any) {
      console.error('Erreur lors de la création de l\'employé:', error);
      throw error;
    }
  }

  /**
   * ✅ SOLUTION FINALE - UNE SEULE REQUÊTE !
   * Le backend EmployeeCreateSerializer attend TOUT en une fois
   */
  async createEmployeeWithUser(data: CreateEmployeeWithUserData): Promise<Employee> {
    try {
      console.log('🚀 Création employé avec utilisateur (une seule requête)');
      
      const username = data.userData.username.trim() || 
        `${data.userData.first_name.toLowerCase()}.${data.userData.last_name.toLowerCase()}`;
      
      // ✅ TOUTES LES DONNÉES EN UNE SEULE REQUÊTE !
      const registrationData = {
        // Données utilisateur (RegisterSerializer)
        username: username,
        email: data.userData.email,
        password: data.userData.password,
        password_confirm: data.userData.password_confirm,
        first_name: data.userData.first_name,
        last_name: data.userData.last_name,
        phone: data.userData.phone || '',
        phone2: data.userData.phone2 || '',
        address: data.userData.address || '',
        
        // ✅ Données employé (EmployeeCreateSerializer)
        store_id: Number(data.employeeData.store),     // ⚠️ store_id (pas store)
        role_id: Number(data.employeeData.role),       // ⚠️ role_id (pas role)
        hire_date: data.employeeData.hire_date,
        salary: String(data.employeeData.salary),
        emergency_contact: data.employeeData.emergency_contact,
        ...(data.employeeData.department && { department_id: Number(data.employeeData.department) }),
        ...(data.employeeData.photo && { photo: data.employeeData.photo })
      };

      console.log('📤 Envoi à /employee/register/ (TOUTES les données):', {
        ...registrationData,
        password: '***',
        password_confirm: '***'
      });
      
      // ✅ UN SEUL APPEL API !
      const response = await api.post<any>('/employee/register/', registrationData);
      
      console.log('✅ Réception:', response);
      
      // ✅ Le serializer retourne l'employé directement
      if (response && response.id) {
        return response as Employee;
      } else if (response && response.employee) {
        return response.employee as Employee;
      } else if (response && response.data && response.data.employee) {
        return response.data.employee as Employee;
      } else {
        console.warn('⚠️ Structure de réponse inattendue:', response);
        throw new Error('Format de réponse inattendu du serveur');
      }
      
    } catch (error: any) {
      console.error('💥 Erreur création employé:', error);
      
      if (error.response?.data) {
        console.error('📋 Détails erreur API:', {
          status: error.response.status,
          data: error.response.data
        });
        
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

  // ... (toutes les autres méthodes restent inchangées)
  
  async updateEmployee(id: number, employeeData: UpdateEmployeeData): Promise<Employee> {
    try {
      const dataToSend: any = {};
      
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

  async updateEmployeeWithUserInfo(
    employeeId: number, 
    employeeUpdate: UpdateEmployeeData, 
    userUpdate: UpdateUserData
  ): Promise<Employee> {
    try {
      let updatedEmployee: Employee;

      if (userUpdate && Object.keys(userUpdate).length > 0) {
        const employee = await this.getEmployeeById(employeeId);
        const userId = employee.user.id;
        await this.updateUser(userId, userUpdate);
      }
      
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

  async deleteEmployee(id: number): Promise<void> {
    try {
      await api.delete(`/employees/${id}/`);
    } catch (error) {
      console.error(`Erreur suppression employé ${id}:`, error);
      throw error;
    }
  }

  async getEmployeesByStore(storeId: number): Promise<Employee[]> {
    try {
      const response = await api.get<Employee[]>(`/employees/?store=${storeId}`);
      return response;
    } catch (error) {
      console.error(`Erreur chargement employés boutique ${storeId}:`, error);
      throw error;
    }
  }

  async searchEmployees(query: string): Promise<Employee[]> {
    try {
      const response = await api.get<Employee[]>(`/employees/?search=${encodeURIComponent(query)}`);
      return response;
    } catch (error) {
      console.error('Erreur recherche employés:', error);
      throw error;
    }
  }

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