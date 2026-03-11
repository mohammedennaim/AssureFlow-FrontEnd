export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalPolicies: number;
  totalClaims: number;
  totalInvoices: number;
  totalWorkflows: number;
  activePolicies?: number;
  pendingClaims?: number;
  monthlyRevenue?: number;
}
