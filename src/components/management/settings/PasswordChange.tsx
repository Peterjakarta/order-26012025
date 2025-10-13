import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, getAuth } from 'firebase/auth';
import { createLogEntry } from '../../../lib/firebase';

export default function PasswordChange() {
  const { user } = useAuth();
  const auth = getAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError('You must be logged in to change your password');
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    if (!auth.currentUser?.email) {
      setError('Unable to verify user email. Please try logging in again.');
      setLoading(false);
      return;
    }

    try {
      // Validate passwords
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Validate current password is not the same as new password
      if (currentPassword === newPassword) {
        throw new Error('New password must be different from current password');
      }

      // Additional validation for admin password
      if (user?.role === 'admin' && newPassword.length < 12) {
        throw new Error('Admin password must be at least 12 characters long');
      }

      // Create credentials with current password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );

      // Reauthenticate user
      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (err) {
        throw new Error('Current password is incorrect. Please verify and try again.');
      }

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswords(false);

      // Create log entry for password change
      try {
        await createLogEntry({
          userId: auth.currentUser.uid,
          username: auth.currentUser.email || '',
          action: 'Password Changed',
          category: 'auth'
        });
      } catch (err) {
        console.error('Error creating log entry:', err);
        // Don't throw error here as password change was successful
      }

    } catch (err) {
      console.error('Error changing password:', err);
      if (err instanceof Error) {
        if (err.message.includes('auth/requires-recent-login')) {
          setError('For security reasons, please log out and log back in before changing your password.');
        } else if (err.message.includes('auth/invalid-credential')) {
          setError('Current password is incorrect. Please verify and try again.');
        } else if (err.message.includes('auth/weak-password')) {
          setError('New password is too weak. Please choose a stronger password.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 rounded-lg">
          <KeyRound className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Change Password</h2>
          <p className="text-sm text-gray-600 mt-1">
            {user?.role === 'admin' ? 
              'Admin password must be at least 12 characters long' :
              'Password must be at least 8 characters long'
            }
          </p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
          Password changed successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative group">
              <input
                type={showPasswords ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPasswords ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
      </form>
    </div>
  );
}