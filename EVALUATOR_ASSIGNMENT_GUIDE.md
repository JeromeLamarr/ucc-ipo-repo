# Evaluator Assignment System - Complete Guide

## Overview

The system supports **two evaluation assignment methods**:

1. **Automatic Category-Based Assignment** - Evaluators matched by specialization
2. **Admin Manual Assignment** - Override automatic assignment when needed

Both methods create comprehensive audit trails and notifications.

---

## Table of Contents

- [Automatic Category-Based Assignment](#automatic-category-based-assignment)
- [Admin Manual Assignment](#admin-manual-assignment)
- [Evaluator Specializations](#evaluator-specializations)
- [Assignment Flow](#assignment-flow)
- [Tracking & Audit Logs](#tracking--audit-logs)
- [UI Features](#ui-features)
- [Troubleshooting](#troubleshooting)

---

## Automatic Category-Based Assignment

### How It Works

When an IP submission is created **without a supervisor**, the system automatically finds an evaluator with matching category specialization:

```
Submission Created
    ↓
Check Category
    ↓
Find Evaluator with matching category_specialization
    ↓
Auto-Assign Evaluator
    ↓
Create evaluator_assignments record
    ↓
Update ip_records with evaluator_id
    ↓
Send Notification to Evaluator
```

### Process Details

**In NewSubmissionPage (Submission Creation):**

```typescript
// Line 276-305: Auto-assignment logic
const { data: evaluators } = await supabase
  .from('users')
  .select('id')
  .eq('role', 'evaluator')
  .eq('category_specialization', formData.category)
  .limit(1);

const categoryEvaluator = evaluators && evaluators.length > 0 
  ? evaluators[0] 
  : null;

if (categoryEvaluator) {
  // Create assignment record
  await supabase.from('evaluator_assignments').insert({
    ip_record_id: ipRecord.id,
    evaluator_id: categoryEvaluator.id,
    category: formData.category,
    assigned_by: profile.id,
  });

  // Update IP record with evaluator_id
  await supabase.from('ip_records').update({
    evaluator_id: categoryEvaluator.id,
  }).eq('id', ipRecord.id);

  // Notify evaluator
  await supabase.from('notifications').insert({
    user_id: categoryEvaluator.id,
    type: 'assignment',
    title: 'New IP Submission for Evaluation',
    message: `A ${formData.category} submission... has been assigned automatically`,
    payload: { ip_record_id: ipRecord.id },
  });

  // Track assignment
  await supabase.from('activity_logs').insert({
    user_id: profile.id,
    ip_record_id: ipRecord.id,
    action: 'evaluator_auto_assigned',
    details: {
      evaluator_id: categoryEvaluator.id,
      category: formData.category,
      method: 'automatic',
    },
  });
}
```

### After Supervisor Approval

When a supervisor approves a submission, the same category-based auto-assignment applies:

**In SupervisorDashboard (Supervisor Approval):**

```typescript
// Lines 173-194: Auto-assign after supervisor approval
const { data: evaluators } = await supabase
  .from('users')
  .select('id')
  .eq('role', 'evaluator')
  .eq('category_specialization', selectedRecord.category)
  .limit(1);

if (categoryEvaluator) {
  // Create assignment record
  await supabase.from('evaluator_assignments').insert({
    ip_record_id: selectedRecord.id,
    evaluator_id: categoryEvaluator.id,
    category: selectedRecord.category,
    assigned_by: profile.id,
  });

  // Same tracking and notification as above
}
```

### Automatic Assignment Success Criteria

✅ Triggers when:
- No supervisor is assigned
- OR supervisor has approved the submission
- AND evaluator exists with `category_specialization = submission.category`

❌ Fails when:
- No evaluator found with matching specialization
- Evaluator with that category doesn't exist

---

## Admin Manual Assignment

### How It Works

Admins can override or assign evaluators manually via Assignment Management page:

```
Admin accesses Assignment Management
    ↓
Selects IP Record
    ↓
Clicks "Assign" button
    ↓
Modal shows:
  - Current assignments
  - Recommended evaluator (by category)
  - All available evaluators
    ↓
Admin selects evaluator
    ↓
System creates/updates assignments
    ↓
Notifications sent
    ↓
Audit trail created
```

### Two Assignment Methods in Assignment Management UI

#### Method 1: Auto-Assign Button (Quick)

```
For unassigned records:
[Auto-Assign] [Assign]

Clicking "Auto-Assign":
- Finds evaluator with matching category
- Pre-fills modal with recommended evaluator
- Admin confirms assignment
```

**Code Location:** `AssignmentManagementPage.tsx` (Line ~231-244)

```typescript
const handleAutoAssignEvaluator = (record: IpRecord) => {
  // Find evaluator with matching category specialization
  const categoryEvaluator = evaluators.find(
    e => e.category_specialization === record.category
  );

  if (categoryEvaluator) {
    setSelectedRecord(record);
    setAssignmentData({
      supervisorId: record.supervisor_id || '',
      evaluatorId: categoryEvaluator.id,
    });
    setShowAssignModal(true);
  } else {
    alert(`No evaluator found specialized in ${record.category}`);
  }
};
```

#### Method 2: Full Assignment Modal

```
Clicking "Assign" button:
- Opens Assignment Modal
- Shows all evaluators (filtered by category)
- Shows recommended evaluator in green highlight
- Admin can choose any evaluator
- Can assign supervisor AND evaluator simultaneously
```

### Admin Assignment Process

**In AssignmentManagementPage (`handleAssign` method):**

```typescript
// Lines 103-177: Complete assignment handler

// 1. Update ip_records table
const updates = {
  supervisor_id: assignmentData.supervisorId || null,
  evaluator_id: assignmentData.evaluatorId || null,
  updated_at: new Date().toISOString(),
};

await supabase.from('ip_records').update(updates).eq('id', selectedRecord.id);

// 2. If evaluator changed, create new evaluator_assignments record
if (assignmentData.evaluatorId !== selectedRecord.evaluator_id) {
  // Check for duplicate assignment
  const { data: existingAssignment } = await supabase
    .from('evaluator_assignments')
    .select('id')
    .eq('ip_record_id', selectedRecord.id)
    .eq('evaluator_id', assignmentData.evaluatorId)
    .maybeSingle();

  if (!existingAssignment) {
    await supabase.from('evaluator_assignments').insert({
      ip_record_id: selectedRecord.id,
      evaluator_id: assignmentData.evaluatorId,
      category: selectedRecord.category,
      assigned_by: user.id,  // Admin's user ID
    });
  }

  // 3. Send notification to evaluator
  await supabase.from('notifications').insert({
    user_id: assignmentData.evaluatorId,
    type: 'assignment',
    title: 'IP Submission Assigned for Evaluation',
    message: `You have been assigned to evaluate: ${selectedRecord.title}`,
    payload: { ip_record_id: selectedRecord.id },
  });

  // 4. Log to activity_logs
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    ip_record_id: selectedRecord.id,
    action: 'evaluator_assigned',
    details: {
      evaluator_id: assignmentData.evaluatorId,
      category: selectedRecord.category,
      method: 'admin_manual',
      evaluator_name: selectedEvaluator?.full_name,
    },
  });

  // 5. Track in process_tracking
  await supabase.from('process_tracking').insert({
    ip_record_id: selectedRecord.id,
    stage: 'Evaluator Assignment',
    status: 'evaluator_assigned',
    actor_id: user.id,
    actor_name: 'Admin',
    actor_role: 'Admin',
    action: 'evaluator_assigned',
    description: `Evaluator "${evaluatorName}" assigned by admin`,
    metadata: { evaluator_id: assignmentData.evaluatorId },
  });
}
```

---

## Evaluator Specializations

### Available Categories

| Category | Specialization Value | Example Evaluator Email |
|----------|----------------------|------------------------|
| Patent | `patent` | patent-evaluator@ucc-ipo.com |
| Copyright | `copyright` | copyright-evaluator@ucc-ipo.com |
| Trademark | `trademark` | trademark-evaluator@ucc-ipo.com |
| Industrial Design | `design` | design-evaluator@ucc-ipo.com |
| Utility Model | `utility_model` | utility-evaluator@ucc-ipo.com |
| Other | `other` | other-evaluator@ucc-ipo.com |

### Checking Evaluator Specialization

**In Database:**

```sql
-- View all evaluators and their specializations
SELECT id, full_name, email, category_specialization, role
FROM users
WHERE role = 'evaluator'
ORDER BY category_specialization;
```

**In Application:**

- Assignment Management page shows evaluators with their specializations
- Filter automatically applied: "Only showing evaluators specialized in [category]"
- Unspecialized evaluators also appear as fallback

---

## Assignment Flow

### Complete Workflow: Submission to Evaluation

```
┌─────────────────────────────────────────────────────────┐
│ 1. APPLICANT SUBMITS IP                                 │
└─────────────────────────────────────────────────────────┘
           │
           ├─── If SUPERVISOR selected
           │    └─→ Wait for supervisor review
           │
           └─── If NO SUPERVISOR
                └─→ Auto-assign evaluator by category
                    ├─ Create evaluator_assignments
                    ├─ Set ip_records.evaluator_id
                    ├─ Send notification to evaluator
                    └─ Log action: 'evaluator_auto_assigned'

┌─────────────────────────────────────────────────────────┐
│ 2. SUPERVISOR REVIEWS (if assigned)                     │
└─────────────────────────────────────────────────────────┘
           │
           ├─── APPROVE
           │    └─→ Auto-assign evaluator by category
           │        ├─ Create evaluator_assignments
           │        ├─ Set ip_records.evaluator_id
           │        ├─ Send notification
           │        └─ Log action: 'evaluator_auto_assigned'
           │
           ├─── REJECT
           │    └─→ Return to applicant (no evaluator assignment)
           │
           └─── REQUEST REVISION
                └─→ Await applicant response (no evaluator assignment)

┌─────────────────────────────────────────────────────────┐
│ 3. ADMIN CAN OVERRIDE AT ANY TIME                       │
└─────────────────────────────────────────────────────────┘
           │
           ├─→ Assignment Management page
           │   ├─ Click "Auto-Assign" → Recommend category evaluator
           │   └─ Click "Assign" → Choose any evaluator
           │
           └─→ Updates:
               ├─ Create new evaluator_assignments record
               ├─ Update ip_records.evaluator_id
               ├─ Send notification
               ├─ Log: 'evaluator_assigned' (method: 'admin_manual')
               └─ Log: 'evaluator_reassigned' (if previous evaluator exists)

┌─────────────────────────────────────────────────────────┐
│ 4. EVALUATOR RECEIVES SUBMISSION                        │
└─────────────────────────────────────────────────────────┘
           │
           ├─ Notification email/in-app
           ├─ Appears in Evaluator Dashboard
           └─ Can view and evaluate submission

```

---

## Tracking & Audit Logs

### Activity Logs

All evaluator assignments create detailed logs in `activity_logs` table:

#### Automatic Assignment
```json
{
  "action": "evaluator_auto_assigned",
  "details": {
    "evaluator_id": "uuid-of-evaluator",
    "category": "patent",
    "method": "automatic"
  }
}
```

#### After Supervisor Approval
```json
{
  "action": "evaluator_auto_assigned",
  "details": {
    "evaluator_id": "uuid-of-evaluator",
    "category": "patent",
    "method": "supervisor_approval"
  }
}
```

#### Manual Admin Assignment
```json
{
  "action": "evaluator_assigned",
  "details": {
    "evaluator_id": "uuid-of-evaluator",
    "category": "patent",
    "method": "admin_manual",
    "evaluator_name": "Patent Evaluator"
  }
}
```

### Process Tracking

Admin manual assignment also creates entry in `process_tracking`:

```json
{
  "stage": "Evaluator Assignment",
  "status": "evaluator_assigned",
  "actor_id": "admin-uuid",
  "actor_name": "Admin",
  "actor_role": "Admin",
  "action": "evaluator_assigned",
  "description": "Evaluator \"Patent Evaluator\" assigned by admin",
  "metadata": {
    "evaluator_id": "uuid-of-evaluator"
  }
}
```

### Evaluator Assignments Table

Records each assignment attempt:

```sql
SELECT 
  id,
  ip_record_id,
  evaluator_id,
  category,
  assigned_by,  -- Profile ID of who assigned
  created_at,
  updated_at
FROM evaluator_assignments
WHERE ip_record_id = 'submission-id';
```

---

## UI Features

### Assignment Management Page

#### Auto-Assign Button
- **Location:** Actions column, right side
- **Visibility:** Only shows if evaluator NOT yet assigned
- **Function:** Auto-finds category-matching evaluator and pre-fills modal
- **Color:** Green (indicates quick/automatic action)
- **Text:** "Auto-Assign"

#### Manual Assign Button
- **Location:** Actions column, always present
- **Function:** Opens full assignment modal for manual control
- **Color:** Blue
- **Text:** "Assign" with UserCheck icon

#### Assignment Modal

**Top Section:**
- Selected IP record title
- Category (highlighted)
- Current status

**Supervisor Field:**
- Dropdown with all supervisors
- Shows "(Already Assigned)" indicator if supervisor exists

**Evaluator Field:**
- Dropdown with filtered evaluators
  - Shows specialists for that category
  - Shows unspecialized evaluators as fallback
- **Green recommendation box:**
  - "Recommended: [Evaluator Name] (category specialist)"
- Helper text: "Only showing evaluators specialized in or without specialization"

**Info Box:**
- "Note: Category-specialized evaluators are automatically recommended based on their specialization field."

**Action Buttons:**
- "Cancel" - Close modal without saving
- "Assign" - Save assignments (disabled if nothing selected)

---

## Troubleshooting

### Issue: "No evaluator found for category"

**Symptoms:**
- Alert appears during submission or supervisor approval
- Evaluator not assigned even though submitted

**Root Causes:**
1. No evaluator created for that category
2. Evaluator exists but `category_specialization` field is NULL or wrong value
3. Evaluator account is deleted/disabled

**Solutions:**
1. Create evaluator for category in User Management:
   ```
   Email: [category]-evaluator@ucc-ipo.com
   Full Name: [Category] Evaluator
   Role: Evaluator
   Category Specialization: [exact category value]
   ```

2. Verify existing evaluators:
   ```sql
   SELECT email, category_specialization, role FROM users 
   WHERE role = 'evaluator' 
   ORDER BY category_specialization;
   ```

3. Update evaluator specialization if needed:
   ```sql
   UPDATE users 
   SET category_specialization = 'patent' 
   WHERE email = 'patent-evaluator@ucc-ipo.com';
   ```

4. Use Assignment Management to manually assign:
   - Go to Assignment Management
   - Click "Assign" on the submission
   - Manually select an available evaluator from dropdown

### Issue: Auto-Assign Button Not Appearing

**Symptoms:**
- Only "Assign" button visible, no "Auto-Assign" button
- Even for submissions without evaluators

**Root Causes:**
1. Evaluator already assigned to record
2. No category-matching evaluator exists
3. Bug in UI rendering

**Solutions:**
1. Check if evaluator already assigned:
   - View the record in Assignment Management
   - "Evaluator" column shows name if assigned

2. Use manual "Assign" button instead:
   - Click "Assign"
   - Modal will show recommended evaluator in green box
   - Select and confirm

### Issue: Evaluator Reassignment Not Working

**Symptoms:**
- Changed evaluator in modal
- Clicked "Assign"
- Evaluator didn't change in table

**Root Causes:**
1. Permission issue (not admin role)
2. Network error during save
3. Modal didn't close properly

**Solutions:**
1. Verify you're logged in as admin:
   - Check user role in database
   - Verify JWT token in browser console

2. Check browser console for errors:
   - F12 → Console tab
   - Look for error messages
   - Copy error and troubleshoot

3. Refresh page and try again:
   - F5 or Ctrl+Shift+R
   - Reload data
   - Retry assignment

### Issue: Notification Not Sent to Evaluator

**Symptoms:**
- Evaluator assigned but no notification appears
- Evaluator doesn't know about assignment

**Root Causes:**
1. Notification creation failed
2. Evaluator didn't refresh page to see notification
3. Email service issue (if email notifications configured)

**Solutions:**
1. Check in-app notifications:
   - Evaluator logs in
   - Clicks notification icon
   - Should see "IP Submission Assigned..." message

2. Check notification table:
   ```sql
   SELECT * FROM notifications 
   WHERE user_id = 'evaluator-id' 
   AND type = 'assignment' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. Manually refresh Evaluator Dashboard:
   - Evaluator visits page
   - Press F5
   - Submissions should appear

### Issue: Wrong Evaluator Assigned

**Symptoms:**
- Wrong person assigned to submission
- Evaluator of different category assigned

**Root Causes:**
1. Admin selected wrong evaluator manually
2. Auto-assign picked wrong evaluator (rare)
3. Multiple evaluators with same category

**Solutions:**
1. Reassign immediately:
   - Go to Assignment Management
   - Click "Assign" on record
   - Select correct evaluator
   - Click "Assign" to overwrite

2. Verify evaluator specializations:
   ```sql
   SELECT full_name, category_specialization FROM users 
   WHERE role = 'evaluator' 
   ORDER BY category_specialization;
   ```

3. If multiple evaluators for same category:
   - System will pick first one
   - Manually assign if different one needed
   - Consider updating specializations

---

## Best Practices

1. **Set up all evaluators first:**
   - Before receiving submissions
   - One evaluator per category minimum
   - Set `category_specialization` correctly

2. **Let automatic assignment work:**
   - It's fast and reliable
   - Only override when necessary
   - Document why override was needed

3. **Check Assignment Management regularly:**
   - Review newly submitted IPs
   - Verify evaluators assigned
   - Follow up if assignments missing

4. **Use Activity Logs for auditing:**
   - See all assignments ever made
   - Understand assignment method (auto vs manual)
   - Track admin changes

5. **Test with sample submission:**
   - Create test submission
   - Verify evaluator auto-assigned
   - Check notifications sent
   - Try manual reassignment

---

## Key Database Tables

### ip_records
- `id` - Unique identifier
- `category` - IP category (patent, copyright, etc.)
- `evaluator_id` - Current evaluator UUID
- `supervisor_id` - Current supervisor UUID

### evaluator_assignments
- `id` - Assignment record ID
- `ip_record_id` - Which submission
- `evaluator_id` - Which evaluator
- `category` - IP category of assignment
- `assigned_by` - Admin who assigned (NULL if automatic)

### activity_logs
- `action` - 'evaluator_auto_assigned', 'evaluator_assigned', etc.
- `details` - JSON with method, evaluator_id, category, etc.

### process_tracking
- `stage` - 'Evaluator Assignment'
- `action` - 'evaluator_assigned'
- `description` - Human readable description
- `metadata` - Assignment details

---

## Support

For issues with evaluator assignment:
1. Check this guide first
2. Review Activity Logs for context
3. Verify evaluator exists and has correct specialization
4. Contact admin support if needed
