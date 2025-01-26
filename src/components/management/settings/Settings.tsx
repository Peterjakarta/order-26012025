import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import PasswordChange from './PasswordChange';
import UserManagement from './UserManagement';
import { useAuth } from '../../../hooks/useAuth';

export default function Settings() {
  const { hasPermission } = useAuth();
  const canManageUsers = hasPermission('manage_users');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList>
          <TabsTrigger value="password">Password</TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="users">Users</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="password">
          <PasswordChange />
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}