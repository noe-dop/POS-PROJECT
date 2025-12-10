// types/Store.ts
export interface Store {
  id: number;
  name: string;
  store_type_name: string;
  network_name: string;
  address_details: {
    full_address: string;
    city: string;
    country: string;
  };
  phone: string;
  email: string;
  total_employees: number;
  total_products: number;
  is_active: boolean;
  opening_hours: Record<string, string>;
  configuration: {
    has_parking: boolean;
    accepts_card: boolean;
    has_delivery: boolean;
  };
  created_at: string;
}

// types/Employee.ts
export interface Employee {
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    user_type_name: string;
  };
  hire_date: string;
  salary: string;
  store_name: string;
  role_name: string;
  department_name: string | null;
  is_active: boolean;
  photo: string | null;
}

// types/DashboardStats.ts
export interface DashboardStats {
  // Adaptez selon la structure de vos stats
  total_sales?: number;
  daily_sales?: any[];
  // ... autres propriétés
}