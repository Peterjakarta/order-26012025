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

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details?: string;
  category: 'auth' | 'feature' | 'system';
}