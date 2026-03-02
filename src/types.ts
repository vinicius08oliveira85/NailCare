export enum PaymentStatus {
  PENDING = 'Pendente',
  PAID = 'Pago',
  CANCELED = 'Cancelado'
}

export interface Client {
  id: string;
  name: string;
  phone: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Appointment {
  id: string;
  clientId?: string;
  clientName?: string;
  serviceId: string;
  date: string; // ISO string
  status: PaymentStatus;
}

export interface DashboardStats {
  today: number;
  week: number;
  month: number;
}
