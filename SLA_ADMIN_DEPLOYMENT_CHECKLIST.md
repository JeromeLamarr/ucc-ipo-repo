# SLA Admin Implementation - Deployment Checklist

**Date:** February 25, 2026  
**Estimated Deployment Time:** 2-3 hours  
**Risk Level:** 🟢 LOW (no breaking changes)

---

## 📋 Pre-Deployment Phase

### Code Review
- [ ] Review RLS migration (`20260225000500_enable_rls_sla_policies.sql`)
  - Verify 4 RLS policies created (SELECT, INSERT, UPDATE, DELETE)
  - Verify RLS enabled on correct table
  - Confirm no data operations

- [ ] Review modified edge functions
  - `check-overdue-stages/index.ts`: SLA notifications enhanced
  - `send-notification-email/index.ts`: additionalInfo support added
  - Both maintain backward compatibility

- [ ] Review updated component
  - `ProcessTrackingWizard.tsx`: Deadline display added
  - Verify fetchStageInstances() and getSLAStatus() logic
  - Confirm visual indicators correct

- [ ] Review new optional component
  - `SLAPolicyManager.tsx`: Admin UI for policy management
  - Verify RLS protection on UPDATE calls
  - Confirm error handling present

### Documentation Review
- [ ] At least one team member has read:
  - [ ] SLA_ADMIN_QUICKSTART.md (overview)
  - [ ] SLA_ADMIN_IMPLEMENTATION_GUIDE.md (details)

- [ ] DevOps has reviewed deployment steps
  - [ ] Environment variables correct
  - [ ] Database access verified
  - [ ] Edge function webhooks configured

### Team Alignment
- [ ] Product has approved implementation
- [ ] QA understands test plan
- [ ] Support has reviewed user-facing changes
- [ ] DBAs have verified migration safety

---

## 🗂️ File Checklist

### New Migration File
- [ ] File exists: `supabase/migrations/20260225000500_enable_rls_sla_policies.sql`
- [ ] File size: ~300 lines (reasonable for RLS setup)
- [ ] Contains: RLS ENABLE, 4 policies, comments

### New Component File
- [ ] File exists: `src/components/SLAPolicyManager.tsx`
- [ ] File size: ~350 lines (reasonable for admin panel)
- [ ] Contains: Table, edit form, RLS integration

### Modified Files
- [ ] `supabase/functions/check-overdue-stages/index.ts` updated
  - No syntax errors
  - formatSLADetails() helper present
  - Notification payload includes sla_duration_days, sla_grace_days
  
- [ ] `supabase/functions/send-notification-email/index.ts` updated
  - EmailRequest interface has additionalInfo
  - Template shows SLA details table
  - Backward compatible with legacy calls
  
- [ ] `src/components/ProcessTrackingWizard.tsx` updated
  - fetchStageInstances() function added
  - fetchSLAPolicies() function added
  - Enhanced getSLAStatus() with policy data
  - Deadline card UI added
  - Visual badges added

### Documentation Files (9 total)
- [ ] SLA_ADMIN_QUICKSTART.md (deployment guide)
- [ ] SLA_ADMIN_IMPLEMENTATION_GUIDE.md (technical details)
- [ ] SLA_ADMIN_ARCHITECTURE.md (system design)
- [ ] SLA_ADMIN_BEFORE_AFTER.md (comparison)
- [ ] SLA_ADMIN_COMPLETION_REPORT.md (final status)
- [ ] SLA_ADMIN_DOCS_INDEX.md (navigation)
- [ ] SLA_ADMIN_RLS_TEST.sql (verification)
- [ ] SLA_ADMIN_SETUP.sql (admin setup)
- [ ] SLA_ADMIN_FINAL_SUMMARY.txt (this summary)

---

## 🚀 Deployment Phase

### Step 1: Database Migration (30 minutes)

**Objective:** Enable RLS on workflow_sla_policies

#### Option A: Using Supabase CLI
```bash
# Prerequisites
[ ] Supabase CLI installed
[ ] SUPABASE_ACCESS_TOKEN set
[ ] Project directory initialized

# Execution
supabase migrations push

# Verification
[ ] No errors in CLI output
[ ] Supabase dashboard shows migration applied
[ ] Run SLA_ADMIN_RLS_TEST.sql → All tests pass
```

#### Option B: Manual SQL in Dashboard
1. [ ] Open Supabase Dashboard
2. [ ] Go to SQL Editor
3. [ ] Open file: `20260225000500_enable_rls_sla_policies.sql`
4. [ ] Copy entire content
5. [ ] Paste in SQL Editor
6. [ ] Review syntax (highlight check)
7. [ ] Click "Run"
8. [ ] Verify: No error messages
9. [ ] Run verification: First 3 tests from SLA_ADMIN_RLS_TEST.sql

#### Verification
```bash
[ ] RLS enabled: SELECT rowsecurity FROM pg_tables WHERE tablename = 'workflow_sla_policies';
    Expected: true
    
[ ] Policy count: SELECT COUNT(*) FROM pg_policies WHERE tablename = 'workflow_sla_policies';
    Expected: 4
```

### Step 2: Deploy Edge Functions (30 minutes)

**Objective:** Update notification system with SLA details

#### Prerequisites
- [ ] Supabase CLI installed
- [ ] Current directory is project root
- [ ] .env has SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

#### Deploy check-overdue-stages
```bash
supabase functions deploy check-overdue-stages

[ ] No deployment errors
[ ] Function visible in Supabase Dashboard
[ ] Can invoke function without errors
```

#### Deploy send-notification-email
```bash
supabase functions deploy send-notification-email

[ ] No deployment errors
[ ] Function visible in Supabase Dashboard
[ ] Accepts additionalInfo parameter
```

#### Verification
```bash
# Test check-overdue-stages
curl -X POST https://[PROJECT].supabase.co/functions/v1/check-overdue-stages \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json"

[ ] Returns JSON with timestamp, message (not 500 error)

# Test send-notification-email
curl -X POST https://[PROJECT].supabase.co/functions/v1/send-notification-email \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "to":"test@test.com",
    "subject":"Test",
    "html":"<p>Test</p>",
    "additionalInfo":{"key":"value"}
  }'

[ ] Returns JSON with success: true (or error explanation)
```

### Step 3: Update React Components (30 minutes)

**Objective:** Add deadline display to ProcessTrackingWizard

#### Update ProcessTrackingWizard.tsx
- [ ] Backup current version (or commit to git)
- [ ] Replace with updated version
- [ ] Check syntax: No red underlines in IDE
- [ ] Run: `npm run build` → No errors
- [ ] Verify: Component imports correct types

#### Add SLAPolicyManager.tsx (optional)
- [ ] Copy new component file to `src/components/`
- [ ] Update admin dashboard to import/include component
  - OR keep in sidebar for later use
- [ ] If included, verify RLS integration works

#### Frontend Testing
```bash
# Build frontend
npm run build

[ ] No TypeScript errors
[ ] No import errors
[ ] Build completes successfully

# If running locally
npm run dev

[ ] App starts without errors
[ ] No console errors on page load
[ ] ProcessTrackingWizard renders correctly
```

---

## ✅ Post-Deployment Phase

### Verification Testing (45 minutes)

#### Test 1: Database RLS Works
```bash
# Run SQL tests
supabase sql -f SLA_ADMIN_RLS_TEST.sql

[ ] All query results match expected output
[ ] No SQL errors
[ ] Policy exists and functions
```

#### Test 2: Admin Access Control
```bash
# As admin user:
1. [ ] Go to Supabase SQL Editor
2. [ ] SELECT * FROM workflow_sla_policies;
       Expected: Returns all policies ✅
3. [ ] UPDATE workflow_sla_policies SET duration_days = 999
       Expected: Success ✅

# As non-admin user:
1. [ ] Try to update SLA policy via API
       Expected: RLS error 403 ❌ (correct behavior)
```

#### Test 3: Deadline Display in UI
```bash
1. [ ] Open application
2. [ ] Navigate to Process Tracking page
3. [ ] Create or open record with active workflow stage
4. [ ] Verify deadline card displays:
   [ ] Due date shown
   [ ] Remaining days shown
   [ ] Grace period info visible
   [ ] Visual badge color correct
5. [ ] Reload page - data persists
```

#### Test 4: Overdue Notifications
```bash
1. [ ] Create test stage with past due_at
2. [ ] Run check-overdue-stages function:
       curl -X POST https://[PROJECT].supabase.co/functions/v1/check-overdue-stages
3. [ ] Verify:
   [ ] Notification created
   [ ] Payload includes sla_duration_days
   [ ] Payload includes sla_grace_days
   [ ] Status updated to OVERDUE/EXPIRED
4. [ ] Check email (if connected):
   [ ] Received (check spam folder)
   [ ] Contains "Duration:" info
   [ ] Contains "Grace Period:" info
```

#### Test 5: Grace Period Logic
```bash
1. [ ] For revision_requested stage (applicant):
2. [ ] Current time = past due_at but before grace deadline
3. [ ] Run check-overdue-stages
4. [ ] Verify: Status = 'OVERDUE' (not EXPIRED) ✅
5. [ ] Move current time past grace deadline
6. [ ] Run check-overdue-stages again
7. [ ] Verify: Status = 'EXPIRED' ✅
```

#### Test 6: Backward Compatibility
```bash
1. [ ] Old records still display correctly
2. [ ] ProcessTrackingWizard still works for old records
3. [ ] Existing notifications still send (without SLA details)
4. [ ] Workflow transitions still work normally
5. [ ] No data loss or corruption
```

### User Acceptance Testing (optional, 30 minutes)

- [ ] Demo to product/stakeholders
- [ ] Test on staging environment (or production if small team)
- [ ] Collect feedback
- [ ] No critical issues identified

### Documentation Verification

- [ ] Team has access to all documentation
- [ ] Admin setup guide understood
- [ ] Deployment process documented
- [ ] Rollback procedure known
- [ ] Support team briefed

---

## 🛑 Go/No-Go Decision

### Success Criteria (Must All Pass)
- [ ] All database migrations applied successfully
- [ ] Both edge functions deployed without errors
- [ ] React components updated and compiling
- [ ] RLS tests all pass
- [ ] Admin can update SLA policies
- [ ] Non-admin cannot update SLA policies
- [ ] UI shows deadlines/grace periods correctly
- [ ] Notifications include SLA information
- [ ] No breaking changes to existing workflow
- [ ] Backward compatibility verified

### If Any Criteria Fail:
- [ ] Review detailed error messages
- [ ] Consult troubleshooting guide
- [ ] Contact support/team lead
- [ ] DO NOT PROCEED until fixed

### Final Approval
- [ ] Project Lead: _________________ Date: _____
- [ ] Tech Lead: _________________ Date: _____
- [ ] QA Lead: _________________ Date: _____
- [ ] Product Lead: _________________ Date: _____

---

## 📊 Go-Live Phase

### Notification to Stakeholders
- [ ] Email sent to IT team
- [ ] Email sent to support team
- [ ] Email sent to users (if relevant)
- [ ] Downtime window communicated (if any)

### Monitor After Deployment
- [ ] Supabase dashboard: No errors
- [ ] Edge function logs: No failures
- [ ] Application: No new errors in console
- [ ] Email delivery: Notifications arriving (if applicable)
- [ ] User feedback: No critical issues reported

### Document Deployment
- [ ] Record deployment date/time
- [ ] Note which version deployed
- [ ] Save any configuration changes
- [ ] File deployment reports

---

## 🔄 Rollback Plan (If Needed)

**Time to Rollback:** ~15 minutes

### Step 1: Disable RLS (Database)
```sql
ALTER TABLE workflow_sla_policies DISABLE ROW LEVEL SECURITY;

[ ] RLS disabled
[ ] Anyone can read/write workflows_sla_policies again
```

### Step 2: Rollback Edge Functions
```bash
# Redeploy old versions (from git history)
git checkout HEAD~1 -- supabase/functions/check-overdue-stages/
git checkout HEAD~1 -- supabase/functions/send-notification-email/

supabase functions deploy check-overdue-stages
supabase functions deploy send-notification-email

[ ] Old versions deployed
[ ] No errors in dashboard
```

### Step 3: Rollback React Components
```bash
# Revert ProcessTrackingWizard.tsx from backup/git
git checkout HEAD~1 -- src/components/ProcessTrackingWizard.tsx

npm run build

[ ] Build succeeds
[ ] No component errors
```

### Step 4: Verify System
- [ ] Database tests pass
- [ ] UI displays old format
- [ ] Workflow works normally
- [ ] All users can access system

### Step 5: Document Rollback
- [ ] Note date/time of rollback
- [ ] Document reason for rollback
- [ ] Schedule postmortem if needed

---

## 📝 Sign-Off

### Deployment ReadinessCertification
```
I certify that:

✅ All code changes have been reviewed
✅ All documentation is complete
✅ All tests have been prepared
✅ Rollback plan is in place
✅ Team is informed and ready
✅ No breaking changes identified
✅ Backward compatibility verified

Deployment is APPROVED and READY.
```

**Deployment Manager:** _________________ Date: _____  
**Tech Approval:** _________________ Date: _____  
**Operations Approval:** _________________ Date: _____  

---

## 📞 During Deployment

**If Something Goes Wrong:**

1. **Stop.** Don't continue.
2. **Check Logs:** Dashboard → Functions → View logs
3. **Review Error:** Match against troubleshooting guide
4. **If Unclear:** Call tech lead or check SLA_ADMIN_QUICKSTART.md
5. **Roll Back:** Follow rollback steps above
6. **Document:** Note what went wrong for postmortem

**Emergency Contact:** [Team Lead Phone/Email]

---

## ✨ Post-Go-Live Support

### Week 1 - Monitoring
- [ ] Daily check of function logs
- [ ] Monitor for error patterns
- [ ] Check user feedback channels
- [ ] Be available for support questions

### Week 2+ - Optimization
- [ ] Collect usage metrics
- [ ] Fine-tune notification schedules if needed
- [ ] Gather user feedback
- [ ] Plan any improvements

### Admin Training
- [ ] Conduct training session for SLA admins
- [ ] Walk through SLAPolicyManager
- [ ] Explain how policies affect new vs old records
- [ ] Provide admin contact/support info

---

**CHECKLIST COMPLETE ✅**

You are now ready to deploy SLA Admin Implementation!

Safe deployment! 🚀
