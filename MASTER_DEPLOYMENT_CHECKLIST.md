# 🚀 COMPLETE DEPLOYMENT CHECKLIST - Phase 1-5 + RLS

## Status: **READY FOR PRODUCTION DEPLOYMENT** ✅

This is your master checklist for deploying the entire UCC IP Office system overhaul.

---

## 📋 Pre-Deployment (Do This First)

### Code Review
- [ ] Review all 4 commits in git log
- [ ] Review COMPREHENSIVE_SYSTEM_OVERHAUL.md
- [ ] Review PHASES_1_5_SUMMARY.md
- [ ] Run `npm run lint` (should pass)
- [ ] Run `npm run build` (should build successfully)

### Environment Setup
- [ ] Set `RESEND_API_KEY` in Supabase environment variables
- [ ] Verify `VITE_SUPABASE_URL` is correct in .env
- [ ] Verify `VITE_SUPABASE_ANON_KEY` is correct in .env
- [ ] Verify Supabase storage bucket `ip-documents` exists
- [ ] Verify Supabase storage bucket `certificates` exists
- [ ] Verify database tables exist: `ip_records`, `ip_documents`, `process_tracking`, `users`, `evaluations`

### Database Verification
- [ ] `ip_records` table has: `id, applicant_id, supervisor_id, evaluator_id, status, current_stage`
- [ ] `ip_documents` table has: `id, ip_record_id, uploader_id, file_path, doc_type`
- [ ] `process_tracking` table has: `id, ip_record_id, status, stage, actor_id, actor_name`
- [ ] `users` table has: `id, auth_user_id, role, full_name, email`
- [ ] All tables have proper indexes on foreign keys

---

## 🔄 Phase 1: Deploy Code

### Step 1: Build Application
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] dist/ folder created

### Step 2: Deploy Frontend
Choose your hosting platform:

**Option A: Vercel**
```bash
vercel deploy
```
- [ ] Deployment completes
- [ ] Check live URL works
- [ ] Hard refresh (Ctrl+Shift+R)

**Option B: Netlify**
```bash
netlify deploy --prod
```
- [ ] Deployment completes
- [ ] Check live URL works

**Option C: Manual**
- [ ] Upload dist/ contents to your server
- [ ] Configure server to serve index.html for SPA routing
- [ ] Test site loads at your URL

### Step 3: Verify Frontend Deployed
- [ ] Can access login page
- [ ] Can see landing page
- [ ] Console shows no errors
- [ ] Network requests go to correct Supabase URL

---

## 🛡️ Phase 2: Deploy Edge Functions

### Step 1: Deploy send-status-notification
1. Open Supabase Dashboard → Functions
2. Click **send-status-notification** function
3. Paste contents from `supabase/functions/send-status-notification/index.ts`
4. Set environment variables:
   - `RESEND_API_KEY`: [Your Resend API key]
5. Click Deploy
- [ ] Function deployed successfully
- [ ] No syntax errors
- [ ] Environment variable set

### Step 2: Deploy generate-certificate
1. Open Supabase Dashboard → Functions
2. Click **generate-certificate** function
3. Paste contents from `supabase/functions/generate-certificate/index.ts`
4. No additional env vars needed for this one
5. Click Deploy
- [ ] Function deployed successfully
- [ ] No syntax errors

### Step 3: Test Functions
```bash
# Test email function
curl -X POST https://your-project.supabase.co/functions/v1/send-status-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantEmail": "test@example.com",
    "applicantName": "Test User",
    "recordTitle": "Test IP",
    "referenceNumber": "REF-001",
    "oldStatus": "submitted",
    "newStatus": "waiting_evaluation",
    "currentStage": "Evaluation",
    "remarks": "Test"
  }'
```
- [ ] Response is 200 OK
- [ ] Email is queued/sent

---

## 🔐 Phase 3: Apply RLS Policies

### Step 1: Open Supabase SQL Editor
1. Go to Supabase Dashboard
2. Click SQL Editor
3. Click New Query

### Step 2: Apply Migration
1. Open file: `supabase/migrations/20251126_fix_rls_policies_for_document_tracking_visibility.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click Run
- [ ] Query executes successfully
- [ ] No errors shown
- [ ] Message says "Query executed successfully"

### Step 3: Verify Policies
1. Go to Table Editor
2. Click **ip_documents** table
3. Click **Policies** tab
4. Verify these 5 policies exist:
   - [ ] Applicants view own documents
   - [ ] Applicants upload documents
   - [ ] Supervisors view documents
   - [ ] Evaluators view documents
   - [ ] Admins view all documents

5. Click **process_tracking** table
6. Click **Policies** tab
7. Verify these 5 policies exist:
   - [ ] Applicants view their tracking
   - [ ] Supervisors view tracking
   - [ ] Evaluators view tracking
   - [ ] Admins view all tracking
   - [ ] Admins and supervisors insert tracking

---

## ✅ Phase 4: Run Comprehensive Testing

### Document Upload Testing
1. Log in as **applicant**
2. Click "New Submission"
3. Fill form and reach Step 5
- [ ] Can upload PDF file ✅
- [ ] Can upload DOCX file ✅
- [ ] Can upload PNG file ✅
- [ ] Cannot upload .exe file (rejected) ✅
- [ ] Cannot upload file > 10MB (rejected) ✅
- [ ] Must upload all 3 required docs ✅
- [ ] Submit button disabled until all docs uploaded ✅
- [ ] Can submit with all docs ✅

### Supervisor Workflow Testing
1. Log in as **supervisor**
2. Go to Supervisor Dashboard
3. Find assigned submission
4. Click to open
- [ ] Can see **Document List** with all uploaded files ✅
- [ ] Can see **Process Tracking** timeline ✅
- [ ] Can download documents ✅
- [ ] Can click "Review" button ✅

5. Click Review → Approve
- [ ] Can enter remarks ✅
- [ ] Can see evaluation score fields ✅
- [ ] Can submit approval ✅
- [ ] Success message appears ✅
- [ ] Email sent to applicant ✅ (check email service)

### Evaluator Workflow Testing
1. Log in as **evaluator**
2. Go to Evaluator Dashboard
3. Find assigned submission
4. Click to open
- [ ] Can see **Document List** ✅
- [ ] Can see **Process Tracking** ✅
- [ ] Can download documents ✅

5. Click "Start Evaluation"
- [ ] Can enter 4 scores (0-10 each) ✅
- [ ] Cannot enter score > 10 (rejected) ✅
- [ ] Cannot enter score < 0 (rejected) ✅
- [ ] Cannot enter non-numeric score ✅
- [ ] Can select decision (approved/revision/rejected) ✅
- [ ] Must enter remarks ✅
- [ ] Can submit evaluation ✅
- [ ] Email sent to applicant ✅

### Certificate Generation Testing
1. Log in as **admin**
2. Find an approved submission
3. Click "Generate Certificate"
- [ ] PDF generates successfully ✅
- [ ] No "Missing required fields" error ✅
- [ ] Certificate shows correct title ✅
- [ ] Certificate shows correct creator name ✅
- [ ] Certificate shows correct grade ✅
- [ ] Can download certificate ✅

4. Log in as **applicant**
5. Try to generate certificate
- [ ] Can generate (as owner) ✅

6. Log in as **unauthorized user**
7. Try to generate certificate for someone else's record
- [ ] Cannot generate (permission denied) ✅

### Process Tracking Testing
1. Log in as **applicant**
2. Open a submission with full history
- [ ] Submission stage shows ✅
- [ ] Supervisor review stage shows ✅
- [ ] Evaluation stage shows ✅
- [ ] Legal prep stage shows (if applicable) ✅
- [ ] Completion stage shows (if applicable) ✅
- [ ] Dates display correctly ✅
- [ ] Actor names display ✅
- [ ] Timeline flows correctly ✅

### Email Testing
1. Trigger supervisor approval
- [ ] Email arrives in inbox ✅
- [ ] Subject is correct ✅
- [ ] Body contains submission title ✅
- [ ] Body contains reference number ✅
- [ ] HTML renders correctly ✅
- [ ] No XSS issues ✅

2. Trigger evaluator evaluation
- [ ] Email arrives ✅
- [ ] Contains grade and remarks ✅

3. Trigger admin completion
- [ ] Email arrives ✅
- [ ] Contains certificate link (if applicable) ✅

### Security Testing
1. Try SQL injection in search: ✅ (should be rejected)
2. Try XSS in remarks: `<script>alert('xss')</script>` ✅ (should be escaped)
3. Try to view other user's documents: ✅ (RLS should block)
4. Try to generate unauthorized certificate: ✅ (auth check should fail)
5. Console has no XSS warnings: ✅

---

## 📊 Phase 5: Monitor & Verify

### Console Monitoring
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Perform all workflows above
- [ ] No JavaScript errors ✅
- [ ] No warnings ✅
- [ ] Network requests succeed (200, 201 status codes) ✅

### Database Monitoring
1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Run monitoring queries:
   ```sql
   -- Check recent submissions
   SELECT COUNT(*) FROM ip_records WHERE created_at > NOW() - INTERVAL '1 hour';
   
   -- Check document uploads
   SELECT COUNT(*) FROM ip_documents WHERE created_at > NOW() - INTERVAL '1 hour';
   
   -- Check process tracking
   SELECT COUNT(*) FROM process_tracking WHERE created_at > NOW() - INTERVAL '1 hour';
   ```
- [ ] Recent activity shows ✅
- [ ] No errors in logs ✅

### Email Service Monitoring
1. Go to Resend.com Dashboard
2. Check email logs
- [ ] Recent emails delivered ✅
- [ ] Bounce rate is 0% ✅
- [ ] Open rate > 30% (if enough emails) ✅

---

## 🎯 Phase 6: User Acceptance Testing (UAT)

### Stakeholder Testing
1. Invite supervisors to test
   - [ ] Can review submissions ✅
   - [ ] Can see documents ✅
   - [ ] Can send feedback ✅

2. Invite evaluators to test
   - [ ] Can evaluate submissions ✅
   - [ ] Scores validate correctly ✅
   - [ ] Can make decisions ✅

3. Invite admins to test
   - [ ] Can manage all submissions ✅
   - [ ] Can generate certificates ✅
   - [ ] Can complete submissions ✅

4. Invite applicants to test
   - [ ] Can submit IP ✅
   - [ ] Receive email notifications ✅
   - [ ] Can track progress ✅
   - [ ] Can download certificate ✅

### Collect Feedback
- [ ] All users report working correctly
- [ ] No major issues reported
- [ ] Performance acceptable (< 3 second load times)
- [ ] UI is intuitive
- [ ] Emails are professional

---

## 🚀 Phase 7: Production Deployment

### Final Checklist Before Going Live
- [ ] All code deployed to production
- [ ] All Edge Functions deployed
- [ ] All RLS policies applied
- [ ] All tests passed
- [ ] UAT completed successfully
- [ ] Error logging configured
- [ ] Email service configured
- [ ] Database backups configured
- [ ] HTTPS enabled
- [ ] Security headers configured

### Deployment Announcement
- [ ] Notify users of deployment date/time
- [ ] Schedule maintenance window (if needed)
- [ ] Have support team on standby
- [ ] Monitor logs closely for first 2 hours

### Post-Deployment (First 24 Hours)
- [ ] Monitor error logs every hour
- [ ] Check email delivery every 2 hours
- [ ] Monitor database performance
- [ ] Respond to user issues quickly
- [ ] Keep backup of previous version ready
- [ ] Document any issues encountered

---

## 📈 Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Page load time | < 2 seconds | ___ |
| API response time | < 500ms | ___ |
| Certificate generation | < 5 seconds | ___ |
| Email delivery | < 1 minute | ___ |
| Database query | < 100ms | ___ |
| Uptime | 99.9% | ___ |

---

## 🔄 Rollback Plan (If Critical Issue)

### Immediate Rollback (< 15 minutes)
1. Revert frontend to previous version (git revert)
2. Revert Edge Functions to backup
3. Notify users of temporary maintenance
4. Investigate issue

### Database Rollback (If RLS Issues)
1. Open SQL Editor
2. Run DROP POLICY commands (see RLS_POLICIES_DEPLOYMENT.md)
3. Restore from backup if needed

### Full Rollback Procedure
1. Revert all commits to previous stable version
2. Redeploy frontend with previous code
3. Restore database from backup
4. Document all issues
5. Plan fixes before next deployment

---

## 📞 Support Contacts

- **Frontend Issues**: Check browser console, try hard refresh
- **Database Issues**: Check Supabase dashboard, review logs
- **Email Issues**: Check Resend.com dashboard, verify API key
- **Certificate Issues**: Check Edge Function logs, verify PDF generation
- **RLS Issues**: Verify policies in Supabase, check user roles

---

## 📚 Documentation Reference

- 📖 **COMPREHENSIVE_SYSTEM_OVERHAUL.md** - Full deployment guide
- 📚 **PHASES_1_5_SUMMARY.md** - Developer reference
- 🎯 **SYSTEM_OVERHAUL_COMPLETE.md** - Executive summary
- 🔐 **RLS_POLICIES_DEPLOYMENT.md** - RLS deployment guide
- 🚀 **Complete Deployment Checklist** - This document

---

## ✨ Success Criteria

**Deployment is successful when:**

✅ All pages load without errors
✅ Users can submit documents with validation
✅ Supervisors can review and approve
✅ Evaluators can evaluate with score validation
✅ Emails send to all users
✅ Certificates generate on demand
✅ Process tracking shows correct timeline
✅ RLS prevents unauthorized access
✅ No console errors
✅ Performance meets targets
✅ All UAT tests pass

---

## 🎉 Congratulations!

When all items are checked, you have successfully deployed the UCC IP Office system overhaul to production!

**Next Steps**:
- Monitor system for 24 hours
- Collect user feedback
- Fix any issues that arise
- Plan for Phase 6-8 improvements

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Status**: _______________
**Time to Deploy**: _______________

