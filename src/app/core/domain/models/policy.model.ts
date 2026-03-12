export interface Policy {
  id: string;
  policyNumber: string;
  clientId: string;
  clientName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  premium: number; // premiumAmount from backend
  coverageAmount?: number;
  createdAt?: string;
}
