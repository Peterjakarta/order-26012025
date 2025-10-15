#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFilePath = path.join(__dirname, '../src/data/versions.ts');
const packageJsonPath = path.join(__dirname, '../package.json');

function getGitInfo() {
  try {
    const isGitRepo = execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();

    if (isGitRepo !== 'true') {
      throw new Error('Not a git repository');
    }

    return true;
  } catch (error) {
    return false;
  }
}

function getGitCommits(since = null) {
  try {
    const sinceFlag = since ? `--since="${since}"` : '--all';

    const commitLog = execSync(
      `git log ${sinceFlag} --pretty=format:"%H|%s|%ad|%an" --date=short --no-merges`,
      {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      }
    );

    const commits = commitLog
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, message, date, author] = line.split('|');
        return {
          hash: hash.trim(),
          message: message.trim(),
          date: date.trim(),
          author: author.trim()
        };
      })
      .filter(commit => {
        const msg = commit.message.toLowerCase();
        return !msg.includes('[skip ci]') &&
               !msg.includes('merge branch') &&
               !msg.includes('update version tracking');
      });

    return commits;
  } catch (error) {
    console.warn('Could not read git history:', error.message);
    return [];
  }
}

function getLastReleaseDate() {
  try {
    if (fs.existsSync(versionFilePath)) {
      const content = fs.readFileSync(versionFilePath, 'utf-8');
      const match = content.match(/"releaseDate":\s*"([^"]+)"/);
      if (match) {
        return match[1];
      }
    }
  } catch (error) {
    console.warn('Could not read last release date:', error.message);
  }
  return null;
}

function categorizeCommit(message) {
  const lower = message.toLowerCase();

  if (lower.match(/fix(es|ed)?[\s:]/i) || lower.includes('bug')) return 'bugfix';
  if (lower.includes('security') || lower.includes('auth') || lower.includes('vulnerability')) return 'security';
  if (lower.includes('performance') || lower.includes('optimize') || lower.includes('speed')) return 'performance';
  if (lower.match(/docs?[\s:]/i) || lower.includes('documentation') || lower.includes('readme')) return 'documentation';
  if (lower.includes('enhance') || lower.includes('improve') || lower.includes('refactor')) return 'enhancement';
  if (lower.match(/^(add|feat|feature)[\s:]/i) || lower.includes('implement')) return 'feature';

  return 'feature';
}

function formatCommitMessage(message) {
  message = message.replace(/^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\([^)]+\))?:\s*/i, '');

  return message.charAt(0).toUpperCase() + message.slice(1);
}

function generateVersionFile() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;

  const hasGit = getGitInfo();

  if (!hasGit) {
    console.log('⚠️  Not a git repository. Using default version info.');
    createDefaultVersionFile(currentVersion);
    return;
  }

  let existingVersions = [];
  const lastReleaseDate = getLastReleaseDate();

  if (fs.existsSync(versionFilePath)) {
    try {
      const content = fs.readFileSync(versionFilePath, 'utf-8');
      const match = content.match(/export const versions: Version\[\] = (\[[\s\S]*?\]);/);
      if (match) {
        const versionsStr = match[1]
          .replace(/(\w+):/g, '"$1":')
          .replace(/'/g, '"');
        existingVersions = eval(versionsStr);

        existingVersions = existingVersions.map(v => ({
          ...v,
          isCurrent: false
        }));
      }
    } catch (e) {
      console.warn('Could not parse existing versions:', e.message);
    }
  }

  const gitCommits = getGitCommits(lastReleaseDate);

  if (gitCommits.length === 0) {
    console.log('ℹ️  No new commits since last release.');
    return;
  }

  const commits = gitCommits.map(commit => ({
    title: formatCommitMessage(commit.message),
    description: '',
    category: categorizeCommit(commit.message),
    date: commit.date
  }));

  const categoryCount = commits.reduce((acc, commit) => {
    acc[commit.category] = (acc[commit.category] || 0) + 1;
    return acc;
  }, {});

  const categoryDescriptions = Object.entries(categoryCount)
    .map(([cat, count]) => `${count} ${cat}${count > 1 ? 's' : ''}`)
    .join(', ');

  const newVersionObj = {
    version: currentVersion,
    releaseDate: new Date().toISOString().split('T')[0],
    isCurrent: true,
    notes: `Release ${currentVersion}: ${categoryDescriptions}`,
    commits: commits.slice(0, 50)
  };

  const allVersions = [newVersionObj, ...existingVersions.slice(0, 9)];

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

  console.log(`✅ Version tracking updated!`);
  console.log(`   Version: ${currentVersion}`);
  console.log(`   New commits: ${commits.length}`);
  console.log(`   Categories: ${categoryDescriptions}`);
  console.log(`   File: ${versionFilePath}`);
}

function createDefaultVersionFile(version) {
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

export const versions: Version[] = [
  {
    version: "${version}",
    releaseDate: "${new Date().toISOString().split('T')[0]}",
    isCurrent: true,
    notes: "Current version",
    commits: [
      {
        title: "Initial setup",
        description: "Application initialized",
        category: "feature",
        date: "${new Date().toISOString().split('T')[0]}"
      }
    ]
  }
];
`;

  fs.writeFileSync(versionFilePath, fileContent, 'utf-8');
  console.log(`✅ Default version file created`);
}

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: npm run update-version

This script automatically generates version tracking information from your git commit history.

Options:
  --help, -h    Show this help message

How it works:
  1. Reads your git commit history since the last release
  2. Automatically categorizes commits based on their message
  3. Updates src/data/versions.ts with the new version information
  4. This file is then committed and pushed by GitHub Actions

Commit message conventions for auto-categorization:
  - "fix:", "bug" → bugfix
  - "security", "auth" → security
  - "performance", "optimize" → performance
  - "docs:", "documentation" → documentation
  - "enhance", "improve", "refactor" → enhancement
  - "feat:", "add", "implement" → feature
  `);
  process.exit(0);
}

generateVersionFile();
