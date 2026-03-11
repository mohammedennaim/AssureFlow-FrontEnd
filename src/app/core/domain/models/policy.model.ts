export interface Policy {
  id: string;
  policyNumber: string;
  clientId: string;
  clientName?: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  premium: number;
  coverageAmount?: number;
  createdAt: string;
}
