# Legacy IP Records - Deployment Checklist

## Pre-Deployment

- [ ] Code review completed
- [ ] TypeScript compilation passes (✅ Verified - no errors)
- [ ] All components tested locally
- [ ] Database migration syntax validated
- [ ] User requirements reviewed and met

## Database Deployment

- [ ] Backup production database
- [ ] Run migration: `supabase db push`
- [ ] Verify new columns exist:
  ```sql
  SELECT is_legacy_record, legacy_source, digitized_at, created_by_admin_id 
  FROM ip_records LIMIT 1;
  ```
- [ ] Verify views created:
  ```sql
  SELECT * FROM workflow_ip_records LIMIT 1;
  SELECT * FROM legacy_ip_records LIMIT 1;
  ```
- [ ] Test RLS policies (admin can create, non-admin cannot)

## Frontend Deployment

- [ ] Build application: `npm run build`
- [ ] No build errors
- [ ] Deploy to staging first
- [ ] Deploy to production

## Feature Testing - Workflow Records Section

- [ ] Section displays correctly
- [ ] Title: "Workflow IP Records"
- [ ] Only shows records where `is_legacy_record = false`
- [ ] Search bar filters by title/applicant
- [ ] Status filter works
- [ ] Category filter works
- [ ] Export to CSV works
- [ ] Record count accurate
- [ ] View button links to detail page

## Feature Testing - Legacy Records Section

- [ ] Section displays with amber/orange styling
- [ ] Title: "Legacy / Historical IP Records"
- [ ] Disclaimer text displays correctly
- [ ] Only shows records where `is_legacy_record = true`
- [ ] "+ Add Legacy Record" button visible and clickable
- [ ] Search bar filters by title/inventor
- [ ] Category filter works
- [ ] Source filter works
- [ ] Export to CSV works
- [ ] Record count accurate
- [ ] View button links to detail page

## Feature Testing - Add Legacy Record Modal

- [ ] Modal opens when button clicked
- [ ] Close button (X) works
- [ ] Step 1: IP Information
  - [ ] Title input required validation
  - [ ] Category dropdown works
  - [ ] Abstract textarea works
  - [ ] Can add inventors
  - [ ] Can remove inventors
  - [ ] Can upload files
  - [ ] Can remove uploaded files
  - [ ] Next button validates and moves to step 2
- [ ] Step 2: Legacy Details
  - [ ] Record source dropdown shows all options
  - [ ] Original filing date required validation
  - [ ] IPOPHIL application no. optional
  - [ ] Remarks textarea works
  - [ ] Back button returns to step 1
  - [ ] Create Record button submits form
- [ ] Form validation works (required fields)
- [ ] Success/error messages display

## Feature Testing - Permissions

- [ ] Admin can create legacy records
- [ ] Admin can view legacy records
- [ ] Admin can edit legacy records (when implemented)
- [ ] Admin can delete legacy records (when implemented)
- [ ] Non-admin user cannot access create form
- [ ] Non-admin user can view legacy records (read-only)
- [ ] RLS policies enforced correctly

## Feature Testing - Data Integrity

- [ ] New legacy records have `is_legacy_record = true`
- [ ] New legacy records have `created_by_admin_id` set
- [ ] New legacy records have `digitized_at` set
- [ ] New legacy records have `legacy_source` set
- [ ] Workflow records are never marked as legacy
- [ ] Legacy records don't have workflow fields set
- [ ] Files uploaded correctly to storage
- [ ] Document records created in database

## Feature Testing - No Side Effects

- [ ] Workflow email notifications NOT sent for legacy records
- [ ] Evaluator assignments NOT triggered for legacy records
- [ ] Status change notifications NOT triggered
- [ ] Workflow counts NOT affected by legacy records
- [ ] Analytics NOT affected by legacy records
- [ ] Existing workflow functionality unchanged

## Feature Testing - UI/UX

- [ ] Legacy Record Badge displays on all legacy records
- [ ] Badge tooltip shows on hover
- [ ] Badge shows source information in tooltip
- [ ] Visual distinction between sections clear
- [ ] Two sections properly separated
- [ ] Filters are intuitive and work as expected
- [ ] Export buttons are in correct locations
- [ ] Form is user-friendly and accessible
- [ ] Error messages are clear and helpful
- [ ] Success messages confirm action

## Browser Testing

- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Mobile Testing

- [ ] Responsive design works on mobile
- [ ] Modal displays correctly on mobile
- [ ] Filters work on mobile
- [ ] Touch interactions work
- [ ] Tables scroll properly on mobile

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader reads all elements
- [ ] Aria labels present and correct
- [ ] Form labels associated with inputs
- [ ] Color contrast meets standards
- [ ] Focus indicators visible

## Performance Testing

- [ ] Page loads quickly
- [ ] Filters respond immediately
- [ ] File uploads complete successfully
- [ ] Export to CSV completes quickly
- [ ] No console errors
- [ ] No console warnings

## Documentation

- [ ] LEGACY_IP_RECORDS_IMPLEMENTATION.md complete
- [ ] LEGACY_IP_RECORDS_QUICK_START.md complete
- [ ] LEGACY_IP_RECORDS_FEATURE_SUMMARY.md complete
- [ ] Code comments clear
- [ ] README updated (if applicable)

## Post-Deployment

- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Verify admin can create legacy records
- [ ] Verify records appear in correct section
- [ ] Send user notification about new feature
- [ ] Provide access to documentation
- [ ] Schedule training session (if needed)

## Rollback Plan

If issues occur:
1. [ ] Disable feature in frontend (hide sections)
2. [ ] Investigate issue
3. [ ] Deploy fix
4. [ ] Re-enable feature

Alternative:
- [ ] Revert migration: `supabase db reset`
- [ ] Revert frontend to previous version
- [ ] Document issue
- [ ] Fix and re-deploy

## Known Issues & Workarounds

None currently identified.

## Future Enhancements

- [ ] Edit legacy records
- [ ] Delete legacy records with audit trail
- [ ] Bulk import via CSV
- [ ] Archive section
- [ ] OCR integration
- [ ] Advanced search with date ranges
- [ ] Batch operations (export, delete)

---

## Sign-Off

- **Feature Owner:** [To be filled]
- **QA Lead:** [To be filled]
- **DevOps Lead:** [To be filled]
- **Deployment Date:** [To be filled]

---

## Notes

[Space for deployment notes]

---

**Last Updated:** December 29, 2025
**Status:** Ready for Deployment
