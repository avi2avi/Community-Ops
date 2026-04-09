export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'resident' | 'gatekeeper' | 'vendor' | 'manager';
  society_id?: string;
  unit_id?: string;
  profile_pic?: string;
  emergency_contact?: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Society {
  id: string;
  name: string;
  address: string;
  total_units: number;
  admin_id: string;
  created_at: string;
}

export interface Unit {
  id: string;
  unit_number: string;
  building?: string;
  society_id: string;
  owner_id?: string;
  tenant_id?: string;
  parking_slots: string[];
  created_at: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone: string;
  purpose: string;
  unit_id: string;
  resident_id: string;
  entry_time: string;
  exit_time?: string;
  photo?: string;
  status: 'pending' | 'approved' | 'inside' | 'exited';
  vehicle_number?: string;
  created_at: string;
}

export interface Bill {
  id: string;
  unit_id: string;
  month: number;
  year: number;
  maintenance: number;
  parking: number;
  other_charges: number;
  penalty: number;
  total: number;
  paid: boolean;
  payment_id?: string;
  due_date: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  unit_id: string;
  user_id: string;
  photos: string[];
  status: 'open' | 'in_progress' | 'resolved';
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  society_id: string;
  created_by: string;
  priority: 'normal' | 'urgent';
  created_at: string;
}

export interface DashboardStats {
  total_units: number;
  total_residents: number;
  pending_bills: number;
  today_visitors: number;
  open_complaints: number;
  total_collection: number;
  total_expenses: number;
  balance: number;
}
