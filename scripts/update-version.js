#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFilePath = path.join(__dirname, '../src/data/versions.ts');
const packageJsonPath = path.join(__dirname, '../package.json');

function getGitCommits(count = 20) {
  try {
    const commits = execSync('git log --pretty=format:"%s|%ad" --date=short', {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    })
      .split('\n')
      .slice(0, count)
      .map(line => {
        const [message, date] = line.split('|');
        return { message: message.trim(), date: date.trim() };
      })
      .filter(commit => commit.message);

    return commits;
  } catch (error) {
    console.warn('Could not read git history. Using default commits.');
    return [];
  }
}

function categorizeCommit(message) {
  const lower = message.toLowerCase();

  if (lower.includes('fix') || lower.includes('bug')) return 'bugfix';
  if (lower.includes('security') || lower.includes('auth')) return 'security';
  if (lower.includes('performance') || lower.includes('optimize')) return 'performance';
  if (lower.includes('docs') || lower.includes('documentation')) return 'documentation';
  if (lower.includes('enhance') || lower.includes('improve') || lower.includes('update')) return 'enhancement';

  return 'feature';
}

function generateVersionFile(newVersion) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;

  const versionToUse = newVersion || currentVersion;

  let existingVersions = [];
  if (fs.existsSync(versionFilePath)) {
    const content = fs.readFileSync(versionFilePath, 'utf-8');
    const match = content.match(/export const versions: Version\[\] = (\[[\s\S]*?\]);/);
    if (match) {
      try {
        const versionsStr = match[1]
          .replace(/(\w+):/g, '"$1":')
          .replace(/'/g, '"');
        existingVersions = eval(versionsStr);

        existingVersions = existingVersions.map(v => ({ ...v, isCurrent: false }));
      } catch (e) {
        console.warn('Could not parse existing versions:', e.message);
      }
    }
  }

  const gitCommits = getGitCommits(20);

  const commits = gitCommits.length > 0
    ? gitCommits.map(commit => ({
        title: commit.message,
        description: '',
        category: categorizeCommit(commit.message),
        date: commit.date
      }))
    : [
        {
          title: 'Initial release',
          description: 'First version of the application',
          category: 'feature',
          date: new Date().toISOString().split('T')[0]
        }
      ];

  const newVersionObj = {
    version: versionToUse,
    releaseDate: new Date().toISOString().split('T')[0],
    isCurrent: true,
    notes: `Release version ${versionToUse} with ${commits.length} changes`,
    commits: commits
  };

  const allVersions = [newVersionObj, ...existingVersions];

  const fileContent = `export interface VersionCommit {
  title: string;
  description?: string;
  category: 'feature' | 'bugfix' | 'enhancement' | 'security' | 'performance' | 'documentation';
  date: string;
}

export interface Version {
  version: string;
  releaseDate: string;
  isCurrent: boolean;
  notes: string;
  commits: VersionCommit[];
}

export const versions: Version[] = ${JSON.stringify(allVersions, null, 2)};
`;

  fs.writeFileSync(versionFilePath, fileContent, 'utf-8');

  console.log(`✅ Version file updated successfully!`);
  console.log(`   Version: ${versionToUse}`);
  console.log(`   Commits: ${commits.length}`);
  console.log(`   File: ${versionFilePath}`);
}

const args = process.argv.slice(2);
const newVersion = args[0];

if (newVersion && !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('❌ Invalid version format. Use: npm run update-version 1.2.3');
  process.exit(1);
}

generateVersionFile(newVersion);
