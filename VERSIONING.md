# Automatic Version Tracking with GitHub Actions

This project uses **fully automatic version tracking** that reads your git commits and updates the version display whenever you push to GitHub.

## 🚀 How It Works

When you push commits to GitHub:

1. **GitHub Action triggers** automatically
2. **Reads your git commit history** since the last release
3. **Categorizes commits** based on keywords in commit messages
4. **Generates version file** (`src/data/versions.ts`)
5. **Commits and pushes** the updated version file
6. **App automatically shows** the new version info

## ✨ Zero Manual Work Required

You just need to:
1. Write good commit messages
2. Push to GitHub
3. Version info updates automatically!

## 📝 Commit Message Best Practices

The system automatically categorizes your commits based on keywords:

| Keywords in Commit | Category | Icon |
|-------------------|----------|------|
| `fix:`, `bug`, `fixes` | 🐛 Bugfix | Bug icon |
| `security`, `auth`, `vulnerability` | 🔒 Security | Shield icon |
| `performance`, `optimize`, `speed` | ⚡ Performance | Gauge icon |
| `docs:`, `documentation`, `readme` | 📝 Documentation | File icon |
| `enhance`, `improve`, `refactor` | ✨ Enhancement | Zap icon |
| `feat:`, `add`, `implement` | 🎁 Feature | Package icon |

### ✅ Good Commit Messages

```bash
# Features
git commit -m "Add bulk product import functionality"
git commit -m "feat: implement recipe calculator"
git commit -m "Implement user profile editing"

# Bug Fixes
git commit -m "Fix order total calculation bug"
git commit -m "fix: resolve stock deduction issue"
git commit -m "Fixes crash when deleting category"

# Performance
git commit -m "Optimize database query performance"
git commit -m "Improve page load speed"

# Security
git commit -m "Update authentication security"
git commit -m "Fix auth token vulnerability"

# Enhancements
git commit -m "Enhance order list UI with filters"
git commit -m "Improve error messages"
git commit -m "Refactor product management code"

# Documentation
git commit -m "docs: add API documentation"
git commit -m "Update README with setup instructions"
```

### ❌ Avoid These

```bash
# Too vague
git commit -m "update"
git commit -m "changes"
git commit -m "wip"

# All lowercase with no context
git commit -m "fixed it"
git commit -m "done"
```

## 🔄 Your Workflow

### Simple Push Workflow

```bash
# 1. Make changes and commit with a good message
git add .
git commit -m "Add bulk import for products and categories"

# 2. Push to GitHub
git push origin main

# 3. That's it! GitHub Actions will:
#    - Run the version update script
#    - Commit the updated version file
#    - Push the changes back
#    - Your app will show the new version automatically
```

## 📊 Version Display

Users see the version information at:
**Management → Settings → Version Information**

It shows:
- **Current Version** with all recent changes
- **Previous Versions** (expandable list)
- **Commit categories** with color-coded badges
- **Real commit dates** from your git history
- **System information** from package.json

## 🛠️ GitHub Action Configuration

The GitHub Action (`.github/workflows/version-tracking.yml`) runs automatically on every push to `main` or `master` branch.

### What It Does

1. Checks out your code with full git history
2. Runs `node scripts/update-version.js`
3. Checks if version file changed
4. Commits changes with `[skip ci]` to prevent infinite loops
5. Pushes back to your repository

### Permissions

The action uses `GITHUB_TOKEN` which has default permissions. No setup needed!

## 🔧 Manual Testing

To test the version generation locally:

```bash
npm run update-version
```

This will:
- Read your local git history
- Generate the version file
- Show you what will be committed

## 📦 Version Bumping

To bump the version number:

1. Update `package.json`:
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. Commit and push:
   ```bash
   git add package.json
   git commit -m "Bump version to 1.1.0"
   git push origin main
   ```

3. GitHub Actions will automatically create a new version entry with all commits since the last release!

## 🎯 Advanced: Semantic Versioning

Follow semantic versioning for version numbers:

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backwards compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes

Use commit prefixes:
```bash
# Patch bump (bug fixes)
git commit -m "fix: resolve calculation error"

# Minor bump (new features)
git commit -m "feat: add export to CSV"

# Major bump (breaking changes)
git commit -m "BREAKING CHANGE: redesign API structure"
```

## 🚨 Troubleshooting

### Version not updating?

1. Check GitHub Actions tab for errors
2. Ensure you pushed to `main` or `master` branch
3. Verify commit messages don't contain `[skip ci]`

### Too many commits showing?

The system shows the last 50 commits. To start fresh:

1. Manually edit `src/data/versions.ts`
2. Update the `releaseDate` to today
3. Commit and push - next update will only show new commits

### Action not running?

1. Go to GitHub repository → Settings → Actions
2. Ensure Actions are enabled
3. Check if the workflow file exists in `.github/workflows/`

## 📖 How Version File Works

The `src/data/versions.ts` file contains:

```typescript
export const versions: Version[] = [
  {
    version: "1.0.0",           // From package.json
    releaseDate: "2025-01-30",  // Today's date
    isCurrent: true,            // Marks current version
    notes: "Release 1.0.0: ...", // Auto-generated summary
    commits: [                  // From git history
      {
        title: "Add feature",
        category: "feature",
        date: "2025-01-29"
      }
    ]
  }
];
```

This file is:
- ✅ **Auto-generated** by GitHub Actions
- ✅ **Committed automatically** after each push
- ✅ **Read by the app** to display version info
- ❌ **Not manually edited** (changes will be overwritten)

## 🎉 Benefits

- **No manual work** - completely automatic
- **Always up-to-date** - reflects actual git history
- **Professional changelog** - auto-categorized and formatted
- **Version history** - keeps track of all previous versions
- **Real dates** - uses actual commit dates from git
- **No fake data** - everything is pulled from your real commits

---

**That's it!** Just write good commit messages and push to GitHub. The version tracking handles itself automatically! 🚀
