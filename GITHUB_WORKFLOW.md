# GitHub Workflow & Deployment Guide

This guide explains how to work with this GitHub-connected Bolt.new project.

## Overview

Your project is connected to GitHub and automatically deploys through Bolt.new. Every push to the `main` branch triggers:

1. **Bolt.new picks up changes**
2. **Installs dependencies** (`npm install`)
3. **Builds the project** (`npm run build`)
4. **Deploys to live URL**

## Local Development Workflow

### 1. Start Development
```bash
# Install dependencies (first time only)
npm install

# Start development server with hot reload
npm run dev
```
Visit `http://localhost:5173` in your browser.

### 2. Make Changes
- Edit files in `src/`
- Changes automatically reload in browser
- TypeScript errors show in terminal and browser

### 3. Verify Before Committing
```bash
# Check TypeScript types
npm run typecheck

# Check code style with ESLint
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

All commands should complete without errors.

### 4. Commit & Push
```bash
# Stage all changes
git add .

# Commit with clear message
git commit -m "update: describe what changed"

# Push to main branch (triggers Bolt.new deployment)
git push origin main
```

## Commit Message Best Practices

Use clear, descriptive commit messages:

```bash
# Good ✓
git commit -m "feature: add email verification system"
git commit -m "fix: correct authentication flow bug"
git commit -m "refactor: improve component structure"

# Avoid ✗
git commit -m "update"
git commit -m "fixes"
git commit -m "stuff"
```

Format:
```
<type>: <short description>

Optional longer explanation if needed
```

Types:
- `feature:` - New feature or functionality
- `fix:` - Bug fix
- `refactor:` - Code reorganization without behavior change
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `perf:` - Performance improvements
- `chore:` - Dependency updates, build config changes

## Environment Variables

### Local Development
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```

3. `.env.local` is in `.gitignore` - it will NOT be committed

### Bolt.new Production
1. Go to your Bolt.new project dashboard
2. Settings → Environment Variables
3. Add or update:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

> **Important**: Changes to environment variables may require a manual rebuild in Bolt.new

## File Organization Guidelines

### Adding New Pages
1. Create in `src/pages/MyNewPage.tsx`
2. Add route in `src/App.tsx`
3. Import components from `@components/`
4. Use `@lib/` for utilities

### Adding New Components
1. Create in `src/components/MyComponent.tsx`
2. Keep components focused and reusable
3. Use `@pages/` or `@contexts/` in imports as needed

### Adding New Utilities
1. Create in `src/lib/myUtility.ts`
2. Export functions for reuse
3. Add TypeScript types

### Never
- ❌ Hardcode environment variables
- ❌ Add credentials to source code
- ❌ Create files outside src/ (except config files)
- ❌ Use relative imports when aliases available
- ❌ Leave unused imports or variables

## Troubleshooting

### Issue: Local changes don't reflect in browser
```bash
# Clear node_modules and reinstall
rm -r node_modules
npm install

# Restart dev server
npm run dev
```

### Issue: Lint errors when committing
```bash
# Check what ESLint found
npm run lint

# Fix auto-fixable errors
npm run lint -- --fix
```

### Issue: TypeScript errors
```bash
npm run typecheck
# Fix type errors before committing
```

### Issue: Build fails
1. Clear build cache: `rm -r dist`
2. Rebuild: `npm run build`
3. Check for missing imports or syntax errors

### Issue: Bolt.new deployment fails
1. Check Bolt.new build logs
2. Verify environment variables are set
3. Ensure no errors locally with `npm run build`
4. Check `.env.local` is NOT in git: `git status`

## Git Commands Reference

```bash
# View status
git status

# View commit history
git log --oneline

# See what changed
git diff

# Undo uncommitted changes
git restore <filename>

# View branches
git branch

# Create new branch (for feature development)
git checkout -b feature/my-feature
git push origin feature/my-feature

# Switch to main
git checkout main

# Pull latest changes
git pull origin main
```

## Deployment Flow

```
Local Development
    ↓
git add . && git commit -m "..." && git push
    ↓
GitHub receives push to main
    ↓
Bolt.new detects change
    ↓
npm install
npm run build
    ↓
Deploy to live URL
    ↓
Visit your live site
```

## Monitoring Deployments

### Check Bolt.new Build Status
1. Open Bolt.new dashboard
2. View recent deployments
3. Check build logs for errors

### Common Deployment Errors

**"Missing environment variables"**
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Bolt.new settings
- Trigger manual rebuild after setting variables

**"Build failed"**
- Verify `npm run build` works locally
- Check for TypeScript errors: `npm run typecheck`
- Check for lint errors: `npm run lint`

**"Module not found"**
- Verify imports use correct path aliases
- Check file paths are correct
- Ensure file exists in correct directory

## Security Best Practices

✓ Always use environment variables for credentials
✓ Never commit `.env` or `.env.local` files
✓ Use `.gitignore` for sensitive files
✓ Keep secrets out of version control
✓ Update dependencies regularly: `npm update`
✓ Run security audit: `npm audit`

## Performance Tips

- Use React.lazy() for code splitting
- Optimize images before committing
- Keep components small and focused
- Use path aliases to keep imports clean
- Monitor build size: `npm run build` shows output size

## Rollback Procedure

If something breaks in production:

```bash
# View commit history
git log --oneline

# Revert last commit
git revert HEAD
git push origin main

# Or, reset to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

Bolt.new will automatically rebuild with the previous version.

## Team Collaboration

When working in a team:

```bash
# Always pull before starting work
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Commit locally as you work
git commit -m "work in progress"

# Push branch when ready
git push origin feature/my-feature

# Create Pull Request on GitHub for review

# After review, merge to main
# (Bolt.new auto-deploys from main)
```

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com)
- [Bolt.new Documentation](https://bolt.new/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)

---

**Remember**: Every commit to `main` automatically deploys to production. Keep your commits clean and test locally before pushing!

**Last Updated**: 2025-11-23
