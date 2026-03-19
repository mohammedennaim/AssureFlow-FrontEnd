export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  clientId: string;
  status: string;
  incidentDate?: string;
  description: string;
  estimatedAmount?: number;
  approvedAmount?: number;
  amount?: number;
  submittedAt?: string;
  createdAt?: string;
  resolvedAt?: string;
  submittedBy?: string;
  approvedBy?: string;
  assignedTo?: string;
}
