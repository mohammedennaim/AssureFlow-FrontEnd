export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  user?: Record<string, unknown>;
}
