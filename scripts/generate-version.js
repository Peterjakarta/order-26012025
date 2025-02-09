const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get package version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Get current date/time
const deploymentDate = new Date().toISOString();

// Try to get latest commit message
let commitMessage = 'No commit message available';
try {
  commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
} catch (err) {
  console.warn('Warning: Could not get git commit message:', err.message);
}

// Create version info
const versionInfo = {
  version,
  deploymentDate,
  commitMessage
};

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write version info to file
fs.writeFileSync(
  path.join(distDir, 'version.json'),
  JSON.stringify(versionInfo, null, 2)
);

console.log('Generated version.json:', versionInfo);