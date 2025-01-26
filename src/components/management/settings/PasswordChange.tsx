import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import bcrypt from 'bcryptjs';

export default function PasswordChange() {
  const { user, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!user) {
        throw new Error('Not logged in');
      }

      // Validate passwords
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters long');
      }

      // Get user document
      const usersRef = collection(db, 'users');
      let userDoc;
      
      if (user.username === 'admin') {
        // For admin user, get document directly by ID
        userDoc = await getDoc(doc(usersRef, 'admin'));
        if (!userDoc.exists()) {
          throw new Error('Admin user not found');
        }
      } else {
        // For other users, query by username
        const q = query(usersRef, where('username', '==', user.username));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          throw new Error('User not found');
        }
        userDoc = snapshot.docs[0];
      }
      
      const userData = userDoc.data();

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userData.password_hash);
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Additional validation for admin password
      if (user.username === 'admin' && newPassword.length < 12) {
        throw new Error('Admin password must be at least 12 characters long');
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password in Firestore
      await updateDoc(userDoc.ref, {
        password_hash: newHash,
        updated_at: serverTimestamp()
      });

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
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
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
  );
}