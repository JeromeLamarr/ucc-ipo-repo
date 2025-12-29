# Deployment Checklist

Use this checklist before each deployment to ensure code quality and production readiness.

## Pre-Deployment Tasks

### Code Quality
- [ ] Run type checking: `npm run typecheck`
  - No TypeScript errors should be present
  - All types should be properly defined
  
- [ ] Run linting: `npm run lint`
  - No ESLint errors
  - No unused variables or imports
  - Code follows configured style rules

- [ ] Test build: `npm run build`
  - Build completes without errors
  - No warnings about missing modules
  - `dist/` folder is generated correctly

- [ ] Preview production build: `npm run preview`
  - Application loads without errors
  - All pages accessible
  - No console errors in DevTools (F12)

### Functionality Testing
- [ ] Test all user flows:
  - [ ] User registration works
  - [ ] Login with valid credentials works
  - [ ] Logout clears session
  - [ ] Protected routes require authentication
  - [ ] Role-based access (supervisor, evaluator, admin) works

- [ ] Test data operations:
  - [ ] Submissions can be created
  - [ ] Data loads from Supabase correctly
  - [ ] No console errors or failed requests
  - [ ] Error handling displays user-friendly messages

### Environment Configuration
- [ ] Verify `.env.local` exists and is in `.gitignore`
  - Run: `git status | grep ".env"`
  - Should show no `.env` files staged for commit

- [ ] Confirm Bolt.new environment variables are set:
  - [ ] `VITE_SUPABASE_URL` is configured
  - [ ] `VITE_SUPABASE_ANON_KEY` is configured
  - [ ] No other sensitive credentials in environment

### Git & Repository
- [ ] All changes are committed:
  - [ ] No uncommitted files: `git status` shows clean
  - [ ] Meaningful commit message prepared

- [ ] Verify git history:
  - [ ] Commits are logically organized
  - [ ] No accidental commits of `.env` files
  - [ ] Branch is up to date with main

### Documentation
- [ ] Update relevant documentation if needed:
  - [ ] Changes documented in comments if complex
  - [ ] API changes noted for team
  - [ ] New environment variables added to `.env.example`

## Deployment Steps

### Local Verification (Final Check)
```bash
# 1. Clean build
npm run build

# 2. Type check
npm run typecheck

# 3. Lint
npm run lint

# 4. Preview production build
npm run preview
```

### Deploy to GitHub
```bash
# 1. Stage all changes
git add .

# 2. Commit with clear message
git commit -m "update: [describe what changed]"

# 3. Push to main branch
git push origin main
```

### Post-Deployment Verification
- [ ] Bolt.new build starts automatically
- [ ] Check Bolt.new deployment logs for errors
- [ ] Visit deployed URL and verify it loads
- [ ] Test core functionality on live site:
  - [ ] Can register new user
  - [ ] Can log in
  - [ ] Can access dashboard
  - [ ] Can create submission (if applicable)

## Rollback Procedure

If something goes wrong after deployment:

1. **Identify the problem**
   - Check Bolt.new build logs
   - Check browser console (F12)
   - Check network tab for failed requests

2. **Revert on GitHub**
   ```bash
   git revert HEAD
   git push origin main
   ```
   (Bolt.new will automatically rebuild with previous version)

3. **Or, revert to specific commit**
   ```bash
   git log  # Find the commit hash
   git reset --hard <commit-hash>
   git push origin main --force
   ```

## Common Issues & Fixes

### Build Fails
1. Run `npm install` to ensure dependencies are installed
2. Check for TypeScript errors: `npm run typecheck`
3. Clear node_modules: `rm -r node_modules && npm install`

### Environment Variables Not Working
1. Verify variables are set in Bolt.new settings
2. Check spelling matches `VITE_*` prefix
3. Trigger manual rebuild in Bolt.new if needed

### Application Loads but Errors
1. Open DevTools (F12) → Console tab
2. Check for Supabase connection errors
3. Verify environment variables in Network tab → XHR requests

### Git Push Fails
1. Pull latest changes: `git pull origin main`
2. Resolve any merge conflicts
3. Try pushing again: `git push origin main`

## Performance Checklist

After deployment, verify performance:

- [ ] Page loads in < 3 seconds
- [ ] No console warnings or errors
- [ ] Images/assets load correctly
- [ ] Interactions are responsive (< 100ms delay)
- [ ] No memory leaks (DevTools → Performance)

## Security Checklist

- [ ] No hardcoded secrets in code
- [ ] Environment variables properly configured
- [ ] HTTPS enabled (Bolt.new handles this)
- [ ] Auth tokens properly stored
- [ ] CORS policies configured correctly
- [ ] Input validation in place

---

**Last Updated**: 2025-11-23
**For Issues**: Check SETUP.md and BOLT_ENVIRONMENT.md
