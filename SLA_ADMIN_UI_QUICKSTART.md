# SLA Admin UI - Quick Start Guide

## 🚀 Access SLA Policies Admin Panel

**For Admin Users Only**

### Where to Find It
1. Log in to your admin account
2. Click "Dashboard" (auto-loads)
3. Look at the **left sidebar menu**
4. Scroll down to find **"SLA Policies"** option
5. Click it

### Direct URL
```
https://your-domain/dashboard/sla-policies
```

---

## 📋 Managing SLA Policies

### What You Can See
- **5 Workflow Stages** with their SLA settings:
  1. Supervisor Review
  2. Evaluation
  3. Revision Requested
  4. Materials Requested
  5. Certificate Issued

### What You Can Edit
For each stage, you can adjust:

| Field | Meaning | Example |
|-------|---------|---------|
| **Duration (Days)** | How many days to complete this stage | 7, 10, 14 |
| **Grace Period (Days)** | Buffer days after deadline before OVERDUE | 0, 2, 3 |
| **Allow Extensions** | Can deadline be extended if needed? | Yes/No |
| **Max Extensions** | How many extensions allowed? | 1, 2, 3 |
| **Extension Duration** | Extra days per extension request | 7, 14 |

---

## ✏️ How to Edit

1. **Click any field** you want to change (all editable)
2. **Type new value** (must be valid number)
3. **Scroll down** to bottom of card
4. **Click "Save Changes"** button
5. **See confirmation** message appear (green = success)

### Validation Rules
- Duration must be at least **1 day**
- Grace days must be **0 or more days**
- If extensions enabled:
  - Max extensions must be **at least 1**
  - Extension days must be **at least 1**

---

## ⚠️ Important Notes

### Scope of Changes
✅ **New records** created AFTER you save use new SLA values  
❌ **Existing records** in progress keep their original SLA deadlines  

### Consequences
- **Shorter Duration:** New submissions will have tighter deadlines
- **Longer Duration:** New submissions get more time
- **Grace Period:** Affects when "OVERDUE" status appears
- **Extensions:** Affects whether users can request more time

### Recommendations
- **Supervisor Review:** 7 days (quick initial feedback)
- **Evaluation:** 10 days (thorough technical review)
- **Revision:** 14 days (applicants need time to make changes)
- **Materials:** 7 days (documentation is usually ready)
- **Certificate:** 3 days (system automated, no grace needed)

---

## 🔍 Understanding Each Field

### Duration Days
How long to complete the stage before hitting the deadline.
- **Supervisor Review:** 7 days = "supervisor has until day 7 to review"
- **Evaluation:** 10 days = "evaluator has until day 10 to assess"

### Grace Days
Extra buffer AFTER deadline before marking as OVERDUE.
- Set to 0 = deadline is hard (OVERDUE starts immediately after due date)
- Set to 2 = 2-day grace period (notifications sent after grace expires)

### Allow Extensions
Whether users/supervisors can request more time.
- **Off:** Hard deadlines, no extensions possible
- **On:** Users can request deadline extensions up to max allowed

### Max Extensions
How many extension requests are allowed.
- Set to 0 = no extensions (if turned off)
- Set to 1 = can extend once (7 or 14 more days)
- Set to 2 = can extend twice (potentially 14-28 more days)

### Extension Duration
How many days added per extension request.
- Set to 7 = each extension adds 1 week
- Set to 14 = each extension adds 2 weeks

---

## 📊 Example Scenario

### Current Settings
- Supervisor Review: 7 days + 2 day grace
- Max 2 extensions of 7 days each

### What This Means
- Day 1: Supervisor gets record
- Day 7: Original deadline
- Day 9: Grace period ends, marked OVERDUE
- Day 9+: Supervisor can extend deadline
- Day 16: First extension deadline
- Day 23: Second extension deadline (last one allowed)
- Day 30+: Stage fails, escalated to admin

---

## ❌ Non-Admin Access

### If You're Not an Admin
- **Menu item:** You won't see "SLA Policies" in sidebar
- **Direct URL:** If you try `/dashboard/sla-policies`, you'll see "Access Denied"
- **Database:** Any edit attempts are blocked at database level
- **Security:** Triple-protected (UI + route + database RLS)

---

## 🆘 Troubleshooting

### Problem: Button shows "Saving..." forever
**Solution:** Check internet connection, refresh page, try again

### Problem: "Access Denied" message
**Solution:** You must be logged in as an admin. Contact system administrator.

### Problem: Changes not appearing in new records
**Solution:** Changes apply only to NEW records created AFTER save. Existing records use original SLA.

### Problem: Can't change a field
**Solution:** Some fields are disabled. If extensions are OFF, max/extension fields are disabled. Turn ON extensions to edit them.

---

## 📞 Support

**Use Case:** SLA policies not updating workflow deadlines  
**Action:** Contact system administrator - may need to restart edge functions

**Use Case:** Need to update SLA for existing records  
**Action:** Not possible - SLA deadline is set when record enters stage. Only admins can manually adjust via database.

**Use Case:** Created wrong duration value  
**Action:** Simply edit again and re-save. Previous value is overwritten.

---

**Last Updated:** February 25, 2026  
**Status:** Production Ready ✅
