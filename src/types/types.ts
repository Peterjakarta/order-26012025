// Add these types to the existing types.ts file
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff';
  permissions: string[];
  email?: string;
  phoneNumber?: string;
  twoFactorMethod?: '2fa_email' | '2fa_sms' | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}