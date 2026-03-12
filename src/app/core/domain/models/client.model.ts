export interface Client {
  id: string;
  clientNumber?: string; // Added for backend compatibility
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string; // Added for backend compatibility
  cin?: string; // Added for backend compatibility
  address?: string;
  city?: string;
  zipCode?: string;
  addresses?: Address[]; // Added for backend compatibility
  policiesCount?: number;
  totalPremium?: number;
  status?: string;
  type?: string; // Added for backend compatibility (ClientType)
  userId?: string; // Added for backend compatibility
  createdAt?: string;
  updatedAt?: string;
}

export interface Address {
  id: string;
  street: string;
  city: string;
  postalCode?: string;
  country: string;
  isPrimary?: boolean;
}
