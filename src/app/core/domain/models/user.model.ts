export interface User {
  id: string;
  username: string;
  email: string;
  active: boolean;
  role: string;
  roles?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
}

