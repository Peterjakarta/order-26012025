import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import PasswordChange from './PasswordChange';
import UserManagement from './UserManagement';
import BackupRestore from './BackupRestore';
import VersionInfo from './VersionInfo';
import { useAuth } from '../../../hooks/useAuth';

export default function Settings() {
  const { hasPermission } = useAuth();
  const canManageUsers = hasPermission('manage_users');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Settings</h2>
      </div>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList>
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
          <TabsTrigger value="version">Version Info</TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users">User Management</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="password">
          <div className="bg-white p-6 rounded-lg shadow-sm">
          <PasswordChange />
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <BackupRestore />
          </div>
        </TabsContent>

        <TabsContent value="version">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <VersionInfo />
          </div>
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users">
            <div className="bg-white p-6 rounded-lg shadow-sm">
            <UserManagement />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}