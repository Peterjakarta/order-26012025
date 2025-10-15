# Automatic Version Management

This project uses an automatic version tracking system that reads your git commits and generates the version information displayed in the app.

## How It Works

The version information is stored in `src/data/versions.ts` and is automatically updated based on your git commit history.

## Updating Version Before Push to GitHub

### Option 1: Quick Update (Recommended)

Before pushing to GitHub, run:

```bash
npm run update-version
```

This will:
- Read your recent git commits (last 20)
- Automatically categorize them (feature, bugfix, security, etc.)
- Update `src/data/versions.ts` with the current version from `package.json`
- Mark previous versions as not current

### Option 2: Update with New Version Number

To bump the version number:

```bash
npm run update-version 1.1.0
```

This will:
- Update the version to 1.1.0
- Read git commits
- Generate the version file
- You should also update `package.json` manually to match

## Commit Message Best Practices

The system automatically categorizes commits based on keywords in your commit messages:

| Keywords | Category |
|----------|----------|
| fix, bug | 🐛 bugfix |
| security, auth | 🔒 security |
| performance, optimize | ⚡ performance |
| docs, documentation | 📝 documentation |
| enhance, improve, update | ✨ enhancement |
| (default) | 🎁 feature |

### Example Good Commit Messages

```bash
git commit -m "Add user profile editing feature"
git commit -m "Fix order completion bug"
git commit -m "Improve database query performance"
git commit -m "Update authentication security"
git commit -m "Enhance order list UI"
git commit -m "Add product export documentation"
```

## Workflow

### Before Every GitHub Push:

1. **Make your changes and commit them**
   ```bash
   git add .
   git commit -m "Add new feature: bulk product import"
   ```

2. **Update version information**
   ```bash
   npm run update-version
   ```

3. **Build to ensure everything works**
   ```bash
   npm run build
   ```

4. **Commit the version file**
   ```bash
   git add src/data/versions.ts
   git commit -m "Update version information"
   ```

5. **Push to GitHub**
   ```bash
   git push origin main
   ```

## Manual Version Management

If you prefer manual control, you can edit `src/data/versions.ts` directly:

```typescript
export const versions: Version[] = [
  {
    version: '1.1.0',
    releaseDate: '2025-01-30',
    isCurrent: true,
    notes: 'New features and improvements',
    commits: [
      {
        title: 'Add bulk import feature',
        description: 'Users can now import products in bulk via CSV',
        category: 'feature',
        date: '2025-01-28'
      },
      {
        title: 'Fix stock calculation bug',
        description: 'Resolved issue with negative stock values',
        category: 'bugfix',
        date: '2025-01-29'
      }
    ]
  },
  {
    version: '1.0.0',
    releaseDate: '2025-01-24',
    isCurrent: false,  // Set to false for previous versions
    notes: 'Initial release',
    commits: [...]
  }
];
```

## Version Display

The version information is displayed in the app at:
**Management → Settings → Version Information**

It shows:
- Current version with all changes
- Previous versions (collapsible)
- System information
- Key features list

## Tips

1. **Commit often** - More commits = better version history
2. **Write clear commit messages** - They become your changelog
3. **Run update-version before push** - Keep version info current
4. **Update package.json** when bumping major/minor versions
5. **Review generated versions.ts** - Edit if auto-categorization is wrong
