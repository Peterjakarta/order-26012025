import React, { useState, useEffect } from 'react';
import { Github, Download, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function GitHubIntegration() {
  const [isStackBlitz, setIsStackBlitz] = useState(false);

  useEffect(() => {
    setIsStackBlitz(window.location.hostname.includes('stackblitz') ||
                    window.location.hostname.includes('bolt.new'));
  }, []);

  const handleManualDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const instructionsText = `
# Code Backup Instructions
Generated: ${new Date().toLocaleString()}

## How to Backup Your Code

### Option 1: Using Bolt.new (Recommended)
1. Click the "Share" button in the top-right corner of Bolt.new
2. Select "Push to GitHub"
3. Authorize Bolt.new to access your GitHub account
4. Choose a repository name
5. Click "Push to GitHub"

Your code is now safely backed up to GitHub and you can:
- View your code anytime at github.com/yourusername/repository-name
- Clone it to your computer
- Deploy it to hosting services
- Collaborate with others

### Option 2: Manual Download (Emergency Backup)
1. In Bolt.new, click on the folder icon in the left sidebar
2. Right-click on the project folder
3. Select "Download as ZIP"
4. Save the ZIP file to your computer

### What Gets Backed Up to GitHub:
✓ All React components and pages
✓ Utility functions and hooks
✓ Configuration files (package.json, tsconfig.json, etc.)
✓ Styling files (CSS, Tailwind config)
✓ Environment configuration templates
✓ All other source code files

### What's NOT Backed Up (Database Data):
Your database data is stored in Supabase and backed up separately.
Use the "Backup & Restore" tab in Settings to backup your data.

### Recommended Workflow:
1. Set up GitHub integration (one-time setup)
2. Bolt.new will automatically track changes
3. Regularly backup database using "Backup & Restore" tab
4. You have complete protection for both code AND data

## Need Help?
- GitHub Setup: https://docs.github.com/en/get-started
- Bolt.new Docs: https://bolt.new/docs
`;

    const blob = new Blob([instructionsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code-backup-instructions-${timestamp}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Code Backup with GitHub</h3>
        <p className="text-gray-600 text-sm">
          Protect your application code by connecting to GitHub. This is separate from your database backups.
        </p>
      </div>

      {isStackBlitz ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Github className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">
                GitHub Integration Available
              </h4>
              <p className="text-sm text-blue-800 mb-4">
                You're running on Bolt.new/StackBlitz which has built-in GitHub integration.
                This is the easiest way to backup your code automatically.
              </p>

              <div className="space-y-3">
                <div className="bg-white rounded p-3 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Connect to GitHub</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Click the "Share" button (top-right) and select "Push to GitHub"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Authorize Access</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Grant Bolt.new permission to create repositories in your GitHub account
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded p-3 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Choose Repository Name</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Enter a name like "cokelateh-order-system" and push
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium">After setup:</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-blue-700 ml-6">
                  <li>• All your code files are backed up</li>
                  <li>• Changes are tracked automatically</li>
                  <li>• You can clone and work locally</li>
                  <li>• Easy to deploy to hosting services</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-2">
                Manual Setup Required
              </h4>
              <p className="text-sm text-yellow-800 mb-2">
                You're not running on Bolt.new. You'll need to set up GitHub manually:
              </p>
              <ol className="text-sm text-yellow-700 space-y-1 ml-4 list-decimal">
                <li>Create a GitHub repository</li>
                <li>Initialize git in your project: <code className="bg-yellow-100 px-1 rounded">git init</code></li>
                <li>Add files: <code className="bg-yellow-100 px-1 rounded">git add .</code></li>
                <li>Commit: <code className="bg-yellow-100 px-1 rounded">git commit -m "Initial commit"</code></li>
                <li>Push to GitHub: <code className="bg-yellow-100 px-1 rounded">git push</code></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Alternative: Manual Backup
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Download backup instructions and learn how to manually backup your code as a ZIP file.
        </p>
        <button
          onClick={handleManualDownload}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Backup Instructions
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          What's Backed Up?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Code Backup (GitHub):</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ React components</li>
              <li>✓ Utilities and hooks</li>
              <li>✓ Configuration files</li>
              <li>✓ Styles and assets</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Data Backup (Supabase):</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Products & categories</li>
              <li>✓ Orders & completed orders</li>
              <li>✓ Ingredients & recipes</li>
              <li>✓ All database records</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Use the "Backup & Restore" tab to backup your database data separately.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold mb-2 text-blue-900">Why GitHub?</h4>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>Version Control:</strong> Track every change and revert if needed</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>Collaboration:</strong> Share code with team members securely</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>Deployment:</strong> Easy integration with Netlify, Vercel, etc.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>Free & Industry Standard:</strong> Used by millions of developers</span>
          </li>
        </ul>
      </div>

      <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Important:</strong> GitHub backs up your code, but your database is separate.
          Always use both GitHub (for code) and the Backup & Restore tab (for data) to ensure complete protection.
        </p>
      </div>
    </div>
  );
}
