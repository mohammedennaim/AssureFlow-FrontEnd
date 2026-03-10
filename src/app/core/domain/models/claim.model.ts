export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  clientId: string;
  status: string;
  description: string;
  amount: number;
  submittedAt: string;
  resolvedAt?: string;
}
