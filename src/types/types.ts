// Add these types to the existing types.ts file
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}