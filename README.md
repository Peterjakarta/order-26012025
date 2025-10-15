# Cokelateh Orders System

A comprehensive order management system with product catalog, recipe tracking, stock management, and production planning.

[Edit in StackBlitz next generation editor ⚡️](https://stackblitz.com/~/github.com/Peterjakarta/Cokelateh-orders)

## ✨ Features

- 📦 **Order Management** - Complete order workflows
- 🏷️ **Product Catalog** - Categories, pricing, inventory
- 🧪 **Recipe Management** - Ingredient tracking & cost calculations
- 📊 **Stock Management** - Real-time inventory tracking
- 📅 **Production Planning** - Schedule and plan production
- 📝 **Activity Logging** - Comprehensive system logs
- 👥 **User Management** - Role-based access control
- 🔬 **R&D Products** - Research & development tracking

## 🚀 Automatic Version Tracking

This project features **fully automatic version tracking** powered by GitHub Actions!

### How It Works

Every time you push to GitHub:
1. GitHub Actions reads your git commit history
2. Automatically categorizes commits (feature, bugfix, security, etc.)
3. Updates the version information file
4. Displays in the app under **Settings → Version Information**

**No manual work required!** Just write good commit messages and push.

See [VERSIONING.md](./VERSIONING.md) for detailed documentation.

## 📝 Development

### Prerequisites

- Node.js 18+
- Git (for version tracking)

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Version Info

```bash
# Test version generation locally
npm run update-version
```

## 🎯 Commit Message Best Practices

The system auto-categorizes commits:

- `feat:` or `add` → Feature
- `fix:` or `bug` → Bugfix
- `security` or `auth` → Security
- `performance` or `optimize` → Performance
- `docs:` or `documentation` → Documentation
- `enhance` or `improve` → Enhancement

Example:
```bash
git commit -m "feat: add bulk product import"
git commit -m "fix: resolve stock calculation bug"
git commit -m "performance: optimize database queries"
```

## 📖 Documentation

- [VERSIONING.md](./VERSIONING.md) - Complete version tracking guide
- [.github/README.md](./.github/README.md) - GitHub Actions documentation

## 🏗️ Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (Database)
- Firebase (Legacy support)
- Lucide React (Icons)

---

**Made with ❤️ by the Cokelateh team**