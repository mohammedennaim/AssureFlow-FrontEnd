export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  policiesCount?: number;
  totalPremium?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}
