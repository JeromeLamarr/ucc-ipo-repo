# Phase 7: Enhanced Deployment Documentation

## Table of Contents
1. [Deployment Checklist](#deployment-checklist)
2. [Step-by-Step Deployment Guide](#step-by-step-deployment-guide)
3. [Troubleshooting Guide](#troubleshooting-guide)
4. [Configuration Reference](#configuration-reference)
5. [Quick Reference Cards](#quick-reference-cards)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Deployment Checklist

### Pre-Deployment Phase (1-3 days before)

**Environment Verification**
- [ ] All team members have access to hosting dashboard
- [ ] SSH keys configured for server access
- [ ] Database backup strategy verified
- [ ] Staging environment mirrors production
- [ ] All environment variables documented

**Code Quality Checks**
- [ ] All tests passing (npm run test)
- [ ] Coverage ≥95% (npm run test:coverage)
- [ ] No linting errors (npm run lint)
- [ ] No TypeScript errors (npm run typecheck)
- [ ] Commit history is clean and descriptive
- [ ] All features documented in FEATURES.md

**Documentation Ready**
- [ ] Deployment guide reviewed
- [ ] Troubleshooting guide available
- [ ] Team trained on rollback procedures
- [ ] Emergency contacts documented
- [ ] Change log updated

**Security Checks**
- [ ] Secrets not in git history (npm audit)
- [ ] Dependencies scanned for vulnerabilities
- [ ] CORS policies reviewed
- [ ] Rate limiting configured
- [ ] RLS policies verified in Supabase

**Performance Testing**
- [ ] Load testing completed (npm run test:performance)
- [ ] Database query performance verified
- [ ] Edge function response times acceptable
- [ ] Email queue stress tested
- [ ] File upload performance baseline established

---

### Deployment Phase (Day of Release)

**Pre-Deployment (1 hour before)
- [ ] Database backup initiated
- [ ] On-call team assembled
- [ ] Communication channels open (Slack, Teams)
- [ ] Maintenance page prepared (if needed)
- [ ] Rollback environment ready
- [ ] Monitoring dashboards open

**Deployment Steps (45 minutes)
1. [ ] Pull latest code from main branch
2. [ ] Run npm install to update dependencies
3. [ ] Build project: npm run build
4. [ ] Verify build succeeds
5. [ ] Run production tests: npm run test:coverage
6. [ ] Deploy to staging first
7. [ ] Verify staging deployment
8. [ ] Deploy Edge Functions to production
9. [ ] Deploy frontend to production
10. [ ] Verify all services up

**Post-Deployment (30 minutes)
- [ ] Run smoke tests against production
- [ ] Verify database migrations completed
- [ ] Check application logs for errors
- [ ] Monitor performance metrics
- [ ] Verify email notifications working
- [ ] Confirm certificate generation working
- [ ] Test sample submission workflow

**Communication**
- [ ] Notify users deployment complete
- [ ] Share release notes
- [ ] Update status page
- [ ] Log deployment in change management
- [ ] Archive deployment logs

---

### Post-Deployment Phase (1-7 days after)

**Monitoring (First 24 hours)**
- [ ] Monitor error logs hourly
- [ ] Check performance metrics every 2 hours
- [ ] Verify email delivery rates
- [ ] Monitor database performance
- [ ] Check file upload success rates
- [ ] Monitor authentication service

**User Feedback (Days 2-3)**
- [ ] Monitor support channel for issues
- [ ] Collect user feedback
- [ ] Address reported bugs
- [ ] Performance optimization if needed
- [ ] Document any issues and fixes

**Stabilization (Days 4-7)**
- [ ] Mark deployment as stable
- [ ] Release non-critical bug fixes
- [ ] Plan next phase improvements
- [ ] Archive deployment documentation
- [ ] Update runbook with lessons learned

---

## Step-by-Step Deployment Guide

### 1. Prepare Deployment Environment

```bash
# 1.1 Update code from repository
cd /opt/ucc-ipo-repo
git pull origin main
git log --oneline -5  # Verify latest commits

# 1.2 Verify Node.js version
node --version        # Must be >= 18.0.0
npm --version         # Must be >= 9.0.0

# 1.3 Install dependencies (clean install)
rm -rf node_modules package-lock.json
npm install

# 1.4 Create backup of current .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "Backup created: .env.backup.*"
```

### 2. Configure Environment Variables

```bash
# 2.1 Verify all required environment variables
required_vars=(
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "VITE_SUPABASE_SERVICE_ROLE_KEY"
  "RESEND_API_KEY"
  "VITE_APP_URL"
  "VITE_EMAIL_FROM"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Set: $var"
  fi
done

# 2.2 Test Supabase connection
npx supabase projects list

# 2.3 Test Resend email service
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com"}' || echo "Email service test"
```

### 3. Build and Test

```bash
# 3.1 Run type checking
npm run typecheck
# Expected: ✅ No errors

# 3.2 Run linting
npm run lint
# Expected: ✅ No errors or warnings

# 3.3 Run unit tests
npm run test
# Expected: ✅ All tests pass

# 3.4 Generate coverage report
npm run test:coverage
# Expected: ✅ Coverage ≥ 95%

# 3.5 Build production bundle
npm run build
# Expected: ✅ dist/ folder created

# 3.6 Verify build output
ls -lah dist/
du -sh dist/
echo "Build size $(du -sh dist/ | cut -f1) should be < 5MB"
```

### 4. Deploy Edge Functions

```bash
# 4.1 List current Edge Functions
supabase functions list

# 4.2 Deploy individual functions
supabase functions deploy create-user --project-id $SUPABASE_PROJECT_ID
supabase functions deploy send-verification-code --project-id $SUPABASE_PROJECT_ID
supabase functions deploy verify-code --project-id $SUPABASE_PROJECT_ID
supabase functions deploy send-status-notification --project-id $SUPABASE_PROJECT_ID
supabase functions deploy send-certificate-email --project-id $SUPABASE_PROJECT_ID
supabase functions deploy generate-certificate --project-id $SUPABASE_PROJECT_ID
supabase functions deploy initialize-evaluators --project-id $SUPABASE_PROJECT_ID
supabase functions deploy send-completion-notification --project-id $SUPABASE_PROJECT_ID
supabase functions deploy generate-pdf --project-id $SUPABASE_PROJECT_ID
supabase functions deploy send-notification-email --project-id $SUPABASE_PROJECT_ID

# 4.3 Verify all functions deployed
supabase functions list --project-id $SUPABASE_PROJECT_ID
# Expected: All functions listed with ✓ status
```

### 5. Deploy Frontend

```bash
# 5.1 Deploy to Bolt hosting
# Option 1: Using Bolt CLI (if configured)
bolt deploy --environment production

# Option 2: Using FTP/SCP (if applicable)
scp -r dist/* user@hosting.com:/var/www/ucc-ipo/

# Option 3: Using Docker (if containerized)
docker build -t ucc-ipo:latest .
docker push registry.com/ucc-ipo:latest
docker pull registry.com/ucc-ipo:latest && docker run -d -p 80:3000 ucc-ipo:latest

# 5.2 Verify frontend deployment
curl -I https://your-app-url.com/
# Expected: HTTP 200 OK

# 5.3 Check application is responsive
curl https://your-app-url.com/ | head -20
# Expected: HTML content returned
```

### 6. Verify Deployment

```bash
# 6.1 Smoke tests
echo "Testing application endpoints..."

# Check homepage
curl -s https://app.ucc-ipo.com/ | grep -q "UCC" && echo "✅ Homepage loads" || echo "❌ Homepage failed"

# Check API health
curl -s https://app.ucc-ipo.com/api/health | grep -q "ok" && echo "✅ API healthy" || echo "❌ API unhealthy"

# Check database connection
curl -s https://app.ucc-ipo.com/api/status | grep -q "database" && echo "✅ Database connected" || echo "❌ Database failed"

# 6.2 Test sample workflow
echo "Testing submission workflow..."
# Simulate user registration, login, submission

# 6.3 Test email notifications
echo "Testing email service..."
# Verify test email received

# 6.4 Test file uploads
echo "Testing file upload..."
# Upload test document

# 6.5 Check performance metrics
echo "Performance baseline:"
curl -w "@curl-format.txt" -o /dev/null -s https://app.ucc-ipo.com/
```

### 7. Database Migrations

```bash
# 7.1 Check pending migrations
supabase migrations list --project-id $SUPABASE_PROJECT_ID

# 7.2 Run pending migrations
supabase db push --project-id $SUPABASE_PROJECT_ID

# 7.3 Verify migration status
supabase migration list --project-id $SUPABASE_PROJECT_ID

# 7.4 Check database schema
psql -d $DATABASE_URL -c "SELECT * FROM information_schema.tables WHERE table_schema = 'public';"

# 7.5 Verify RLS policies
psql -d $DATABASE_URL -c "SELECT * FROM pg_policies WHERE schemaname = 'public';"
```

### 8. Finalize Deployment

```bash
# 8.1 Update deployment log
echo "Deployment: $(date)" >> /var/log/deployments.log
echo "Version: $(cat package.json | grep version)" >> /var/log/deployments.log
echo "User: $(whoami)" >> /var/log/deployments.log

# 8.2 Notify team
# Send Slack/Teams notification with:
# - Deployment time
# - Version deployed
# - Key changes
# - Any issues

# 8.3 Mark in change management
# Log deployment in Jira/GitHub/tracking system

# 8.4 Celebrate! 🎉
echo "✅ Deployment completed successfully!"
```

---

## Troubleshooting Guide

### Build Failures

**Issue: npm install fails with version conflicts**
```
Error: peer dep missing

Solution:
# 1. Clear npm cache
npm cache clean --force

# 2. Remove lock file and reinstall
rm package-lock.json
npm install

# 3. If still failing, check Node version
node --version  # Must be >= 18.0.0

# 4. Update npm itself
npm install -g npm@latest
```

**Issue: Build fails with "Cannot find module"**
```
Error: Cannot find module '@supabase/supabase-js'

Solution:
# 1. Verify module is in package.json
grep "supabase-js" package.json

# 2. Reinstall dependencies
npm install

# 3. Clear Vite cache
rm -rf dist .vite

# 4. Rebuild
npm run build
```

**Issue: TypeScript compilation errors**
```
Error: 'any' is deprecated

Solution:
# 1. Check tsconfig.json settings
cat tsconfig.json | grep -A5 "noImplicitAny"

# 2. Fix type errors in source files
npm run typecheck -- --noEmit

# 3. Review error details
npm run typecheck 2>&1 | head -20

# 4. Fix reported issues then rebuild
npm run build
```

### Deployment Failures

**Issue: Frontend not accessible after deployment**
```
Error: 404 Not Found when accessing app URL

Solution:
# 1. Verify files deployed to correct location
ls -la /var/www/ucc-ipo/dist/

# 2. Check web server configuration
cat /etc/nginx/sites-enabled/ucc-ipo.conf

# 3. Verify web server is running
sudo systemctl status nginx

# 4. Check file permissions
chmod -R 755 /var/www/ucc-ipo/
chmod -R 644 /var/www/ucc-ipo/dist/*

# 5. Restart web server
sudo systemctl restart nginx

# 6. Test access again
curl -I https://app.ucc-ipo.com/
```

**Issue: Edge Functions not deploying**
```
Error: Deployment failed for edge function

Solution:
# 1. Verify Supabase CLI is updated
supabase --version

# 2. Check function syntax
node --check supabase/functions/send-status-notification/index.ts

# 3. Verify function dependencies
cat supabase/functions/send-status-notification/deno.json

# 4. Check Supabase project credentials
echo $SUPABASE_PROJECT_ID
echo $SUPABASE_PROJECT_MANAGEMENT_API_TOKEN

# 5. Redeploy individual function
supabase functions deploy send-status-notification --project-id $SUPABASE_PROJECT_ID
```

### Database Issues

**Issue: RLS policies blocking queries**
```
Error: new row violates row-level security policy

Solution:
# 1. Check RLS policies
psql -d $DATABASE_URL -c "SELECT * FROM pg_policies LIMIT 10;"

# 2. Verify user authentication context
psql -d $DATABASE_URL -c "SELECT auth.uid();"

# 3. Review policy logic
psql -d $DATABASE_URL -c "SELECT policyname, qual FROM pg_policies WHERE tablename = 'submissions';"

# 4. Temporarily disable RLS for testing
psql -d $DATABASE_URL -c "ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;"

# 5. Test query
psql -d $DATABASE_URL -c "SELECT * FROM submissions LIMIT 1;"

# 6. Re-enable RLS
psql -d $DATABASE_URL -c "ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;"

# 7. Debug policy conditions
# Check if auth.uid() matches row owner_id
```

**Issue: Database migrations fail**
```
Error: migration contains invalid SQL

Solution:
# 1. Check migration file syntax
cat supabase/migrations/20251115150428_*.sql

# 2. Test migration locally
psql -d $DATABASE_URL < supabase/migrations/20251115150428_*.sql

# 3. Check for conflicts with existing data
psql -d $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'new_table';"

# 4. Backup database before retry
pg_dump $DATABASE_URL > backup_pre_migration.sql

# 5. Manually apply migration
psql -d $DATABASE_URL < supabase/migrations/20251115150428_*.sql

# 6. Verify migration applied
psql -d $DATABASE_URL -c "SELECT * FROM information_schema.tables WHERE table_name = 'new_table';"
```

### Email Service Issues

**Issue: Emails not sending**
```
Error: Email verification code not received

Solution:
# 1. Verify Resend API key
echo $RESEND_API_KEY | head -c 20

# 2. Test email service directly
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@example.com",
    "to": "test@example.com",
    "subject": "Test",
    "html": "Test email"
  }'

# 3. Check Edge Function logs
supabase functions logs send-verification-code --project-id $SUPABASE_PROJECT_ID

# 4. Verify email template exists
ls supabase/functions/send-verification-code/

# 5. Check email queue
psql -d $DATABASE_URL -c "SELECT * FROM email_queue LIMIT 5;"

# 6. Manually retry failed emails
psql -d $DATABASE_URL -c "UPDATE email_queue SET status = 'pending' WHERE status = 'failed';"
```

### Performance Issues

**Issue: Slow page loads after deployment**
```
Problem: Frontend takes > 5 seconds to load

Solution:
# 1. Check build bundle size
du -sh dist/
ls -lah dist/assets/

# 2. Run Lighthouse audit
# Use Chrome DevTools > Lighthouse

# 3. Check database query performance
psql -d $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM submissions LIMIT 10;"

# 4. Enable browser caching
# Update HTTP headers:
# Cache-Control: max-age=3600

# 5. Enable GZIP compression
# Verify in web server config:
gzip on;
gzip_types text/plain text/css application/json;

# 6. Check CDN cache status
curl -I -X HEAD https://app.ucc-ipo.com/index.html | grep -i "cache\|age"
```

### Authentication Issues

**Issue: Login fails after deployment**
```
Error: User cannot login with valid credentials

Solution:
# 1. Verify Supabase authentication URL
echo $VITE_SUPABASE_URL

# 2. Test Supabase connection
curl -X GET $VITE_SUPABASE_URL/rest/v1/users \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY"

# 3. Check authentication policies
psql -d $DATABASE_URL -c "SELECT * FROM auth.users LIMIT 1;"

# 4. Verify JWT token validity
# Check token expiration in browser console

# 5. Clear browser cache and cookies
# Or test in incognito window

# 6. Check CORS configuration
# Ensure app URL is in Supabase CORS whitelist
```

### File Upload Issues

**Issue: File uploads fail silently**
```
Problem: Users can't upload documents

Solution:
# 1. Verify storage bucket exists
supabase storage list --project-id $SUPABASE_PROJECT_ID

# 2. Check storage policies
psql -d $DATABASE_URL -c "SELECT * FROM storage.objects LIMIT 5;"

# 3. Verify file size limits
# Check: MAX_FILE_SIZE in validation.ts

# 4. Check disk space on server
df -h /var/www/

# 5. Test file upload directly
curl -X POST https://app.ucc-ipo.com/api/upload \
  -F "file=@test.pdf"

# 6. Check Edge Function for upload handling
cat supabase/functions/handle-upload/index.ts
```

---

## Configuration Reference

### Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email Service
RESEND_API_KEY=re_your_api_key_here
VITE_EMAIL_FROM=noreply@ucc-ipo.com

# Application Configuration
VITE_APP_URL=https://app.ucc-ipo.com
VITE_APP_ENV=production
NODE_ENV=production

# Database (if not using Supabase)
DATABASE_URL=postgresql://user:password@host:5432/ucc_ipo_db

# Feature Flags
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### Database Configuration

```sql
-- RLS Policy for submissions table
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Storage policy for uploads
CREATE POLICY "Users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

### Web Server Configuration (Nginx)

```nginx
server {
  listen 443 ssl;
  server_name app.ucc-ipo.com;

  # SSL configuration
  ssl_certificate /etc/letsencrypt/live/app.ucc-ipo.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.ucc-ipo.com/privkey.pem;

  # Compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;

  # Caching
  location /assets/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
  }

  # Fallback to index.html for SPA
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API proxy
  location /api/ {
    proxy_pass https://your-supabase-url/;
    proxy_set_header Authorization $http_authorization;
  }
}
```

---

## Quick Reference Cards

### Deployment Quick Start

```
1. PREPARE
   git pull origin main
   npm install
   npm run test
   npm run build

2. DEPLOY FUNCTIONS
   supabase functions deploy create-user
   supabase functions deploy send-verification-code
   supabase functions deploy send-status-notification
   [... deploy all 10 functions ...]

3. DEPLOY FRONTEND
   scp -r dist/* user@host:/var/www/

4. VERIFY
   curl https://app.ucc-ipo.com/
   Check logs for errors
   Test sample submission

5. NOTIFY
   Post deployment notice
   Share release notes
   Update status page
```

### Troubleshooting Quick Start

```
ISSUE             | SOLUTION
==================|====================================
Build fails       | npm install && npm run build
Deploy fails      | Check logs, verify credentials
Login not working | Clear cookies, check CORS
File upload fails | Check storage bucket, permissions
Email not sending | Verify API key, check logs
Slow loads        | Check bundle size, enable caching
Database error    | Check RLS policies, migrations
```

### Rollback Quick Start

```
1. Identify issue
2. SSH to server
3. Rollback code: git checkout previous-tag
4. Redeploy: npm run build && deploy
5. Verify working
6. Investigate issue
7. Document in postmortem
```

---

## Rollback Procedures

### Immediate Rollback (If Critical Issue)

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script

set -e  # Exit on any error

echo "🚨 INITIATING ROLLBACK..."

# 1. Stop current deployment
sudo systemctl stop ucc-ipo || true

# 2. Restore previous version
cd /opt/ucc-ipo-repo
git tag                              # List available tags
git checkout v1.5.0                  # Checkout previous stable version
git log --oneline -3                 # Verify checkout

# 3. Restore database backup
echo "Restoring database backup..."
pg_restore -d $DATABASE_URL backup_pre_deployment.sql

# 4. Rebuild and restart
npm install
npm run build
sudo systemctl start ucc-ipo

# 5. Verify working
sleep 5
curl -I https://app.ucc-ipo.com/
echo "✅ Rollback completed!"

# 6. Alert team
echo "⚠️  Rollback complete. Check logs for issues."
```

### Gradual Rollback (Blue-Green Deployment)

```bash
# 1. Deploy new version to green environment
cd /opt/ucc-ipo-green
git checkout main
npm install && npm run build
npm run test

# 2. Verify green deployment
curl -I https://green.ucc-ipo.com/

# 3. Switch traffic to green (if all good)
# Update load balancer/DNS

# 4. Keep blue as fallback
# If issues found, switch back immediately

# 5. After 24h of monitoring, decommission blue
```

### Staged Rollback (For Gradual Issues)

```bash
# If issue manifests after deployment:
# 1. Identify specific feature causing issue
# 2. Deploy hotfix OR
# 3. Rollback only affected component
# 4. Keep rest of deployment

# Example: Rollback only email service
git checkout main -- supabase/functions/send-verification-code/
supabase functions deploy send-verification-code
```

---

## Monitoring & Maintenance

### Continuous Monitoring

```bash
# Run every 5 minutes (cron job)
*/5 * * * * /opt/scripts/health-check.sh

# Check application health
curl https://app.ucc-ipo.com/api/health

# Monitor error logs
tail -f /var/log/ucc-ipo.log

# Monitor database
psql -d $DATABASE_URL -c "SELECT COUNT(*) FROM submissions WHERE created_at > NOW() - interval '1 hour';"

# Monitor email delivery
psql -d $DATABASE_URL -c "SELECT status, COUNT(*) FROM email_queue GROUP BY status;"
```

### Regular Maintenance

```bash
# Daily
- Review error logs
- Check performance metrics
- Verify backups completed

# Weekly  
- Update dependencies: npm update
- Run security audit: npm audit
- Database optimization: VACUUM ANALYZE

# Monthly
- Update OS packages: apt update && apt upgrade
- Review security logs
- Archive old logs
- Test disaster recovery

# Quarterly
- Full penetration testing
- Load testing
- Disaster recovery drill
```

---

**Phase 7 Status**: ✅ COMPLETE - Comprehensive Deployment Documentation Ready
