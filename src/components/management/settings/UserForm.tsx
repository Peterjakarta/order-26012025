@@ .. @@
           <label htmlFor="role" className="block text-sm font-medium text-gray-700">
             Role
           </label>
-          <select
-            id="role"
-            value={role}
-            onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'staff')}
-            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
-          >
-            <option value="staff">Staff</option>
-            <option value="admin">Admin</option>
-          </select>
+          {initialData?.username === 'admin' ? (
+            <div className="mt-1 block w-full px-4 py-2 bg-gray-100 border rounded-lg text-gray-700">
+              Admin (Fixed)
+            </div>
+          ) : (
+            <select
+              id="role"
+              value={role}
+              onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'staff')}
+              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
+            >
+              <option value="staff">Staff</option>
+              <option value="admin">Admin</option>
+            </select>
+          )}
         </div>
       </div>

       <UserPermissions
         selectedPermissions={permissions}
-        onChange={setPermissions}
+        onChange={(newPermissions) => {
+          // For admin user, ensure all permissions are always selected
+          if (initialData?.username === 'admin') {
+            setPermissions(AVAILABLE_PERMISSIONS.map(p => p.id));
+          } else {
+            setPermissions(newPermissions);
+          }
+        }}
+        disabled={initialData?.username === 'admin'}
       />