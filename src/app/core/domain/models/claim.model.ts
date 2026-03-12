export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  clientId: string;
  status: string;
  incidentDate?: string; // Added for backend compatibility
  description: string;
  amount: number; // estimatedAmount from backend
  approvedAmount?: number; // Added for backend compatibility
  submittedAt?: string; // createdAt from backend
  createdAt?: string; // Added for backend compatibility
  resolvedAt?: string;
  submittedBy?: string; // Added for backend compatibility
}
