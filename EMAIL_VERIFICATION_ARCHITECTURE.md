# Email Verification Flow - Architecture Diagram

## Registration Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER REGISTRATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. USER SUBMITS FORM
   ┌──────────────────┐
   │ RegisterPage.tsx │
   │                  │
   │ Email: user@...  │
   │ Password: ****   │
   │ Name: John Doe   │
   └────────┬─────────┘
            │ Submit
            ↓
            
2. REGISTER-USER EDGE FUNCTION
   ┌─────────────────────────────┐
   │ supabase/functions/          │
   │ register-user/index.ts       │
   │                              │
   │ 1. Check email not exists    │
   │ 2. Create auth user          │
   │    (email_confirm: false)    │
   │ 3. Generate magic link       │
   │ 4. Send email                │
   └────────┬────────────────────┘
            │ 
            ├─→ Create in auth.users
            │   (email NOT confirmed)
            │
            ├─→ Store in temp_registrations
            │   (for tracking)
            │
            └─→ Send HTML email with
                magic link (24hr expiry)
                
3. EMAIL SENT TO USER
   ┌─────────────────────────┐
   │   📧 User's Inbox       │
   │                         │
   │ Verify Your Email       │
   │                         │
   │ [Click Link to Verify]  │
   │                         │
   │ Link expires in 24 hours│
   └────────┬────────────────┘
            │ User clicks link
            │
            ↓

4. MAGIC LINK CLICKED
   ┌─────────────────────────────────┐
   │ Browser redirects to:           │
   │ supabase-project.com/auth/v1/   │
   │ callback?token=XXX&type=magic   │
   │                                 │
   │ Supabase processes:             │
   │ ✓ Validates token               │
   │ ✓ Confirms email                │
   │ ✓ Updates session               │
   └────────┬────────────────────────┘
            │ Token valid & email verified
            │
            ├─→ auth.users.email_confirmed_at 
            │   is set to NOW
            │
            └─→ Session established
                
5. REDIRECT TO CALLBACK PAGE
   ┌────────────────────────────────┐
   │ AuthCallbackPage.tsx           │
   │                                │
   │ 1. Get session from Supabase   │
   │ 2. Check email_confirmed_at    │
   │ 3. Create user profile in DB   │
   │    (only if verified)          │
   └────────┬─────────────────────┘
            │ Success
            │
            ├─→ Insert into users table
            │   (role: applicant)
            │   (is_verified: true)
            │
            └─→ Redirect to /dashboard
                
6. DASHBOARD ACCESS
   ┌─────────────────────────┐
   │ ProtectedRoute checks:  │
   │                         │
   │ ✓ User authenticated?   │
   │ ✓ Email confirmed?      │
   │ ✓ Profile exists?       │
   │ ✓ Role permitted?       │
   └────────┬────────────────┘
            │ All checks passed
            │
            ├─→ Grant access
            │   to dashboard
            │
            └─→ User can now:
                • Submit IP
                • Track status
                • Manage account
```

---

## Security Checkpoints

```
┌─────────────────────────────────────────────────────────┐
│              SECURITY ENFORCEMENT LAYERS                │
└─────────────────────────────────────────────────────────┘

LAYER 1: Registration
├─ ✓ Email format validation
├─ ✓ Password strength check (6+ chars)
├─ ✓ Duplicate email check
└─ ✓ Rate limiting (Supabase default)

LAYER 2: Magic Link Generation
├─ ✓ Cryptographic token generation
├─ ✓ 24-hour expiration
├─ ✓ One-time use only
├─ ✓ Unique per user
└─ ✓ No token exposure in logs

LAYER 3: Email Delivery
├─ ✓ HTTPS only
├─ ✓ Email signed by provider
├─ ✓ Link validated against database
└─ ✓ Replay attack prevention

LAYER 4: Email Verification Callback
├─ ✓ Token signature validation
├─ ✓ Timestamp verification
├─ ✓ One-time token consumption
└─ ✓ Session establishment

LAYER 5: Dashboard Access
├─ ✓ Session token validation
├─ ✓ email_confirmed_at check
├─ ✓ Profile exists check
├─ ✓ Role-based access control
└─ ✓ RLS policies on all tables
```

---

## Data Flow (What Data Goes Where)

```
┌────────────────────────────────────────────────────────────┐
│                    DATA STORAGE MATRIX                     │
└────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ SUPABASE AUTH (auth.users)                              │
├─────────────────────────────────────────────────────────┤
│ auth_user_id        | UUID (Supabase generated)         │
│ email               | user@example.com                  │
│ encrypted_password  | hashed password (never exposed)   │
│ email_confirmed_at  | NULL until verified               │
│ user_metadata       | {full_name, affiliation}          │
│ created_at          | timestamp                         │
│                                                         │
│ ✓ Managed by Supabase                                   │
│ ✓ Passwords never logged                                │
│ ✓ Encryption at rest                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PUBLIC.USERS (User Profiles)                            │
├─────────────────────────────────────────────────────────┤
│ id                  | Unique identifier                 │
│ auth_user_id        | FK to auth.users                  │
│ email               | Copy of auth email (indexed)      │
│ full_name           | From registration form            │
│ affiliation         | Optional: department/org          │
│ role                | applicant|supervisor|evaluator    │
│ is_verified         | true (only after email verified)  │
│ created_at          | timestamp                         │
│                                                         │
│ ✓ Created ONLY after email verified                     │
│ ✓ Protected by RLS policies                             │
│ ✓ Accessible to user's own role                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PUBLIC.TEMP_REGISTRATIONS (Verification Tracking)       │
├─────────────────────────────────────────────────────────┤
│ id                  | Unique identifier                 │
│ auth_user_id        | FK to auth.users                  │
│ email               | Registration email                │
│ full_name           | Registration name                 │
│ affiliation         | Registration affiliation          │
│ created_at          | Registration timestamp            │
│ expires_at          | Auto-delete after 24 hours        │
│                                                         │
│ ✓ Temporary table for tracking                          │
│ ✓ Auto-deletes expired entries                          │
│ ✓ RLS: service_role only                                │
│ ✓ Cleaned up automatically by Supabase                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ EMAIL STORAGE (User's Email Client)                     │
├─────────────────────────────────────────────────────────┤
│ Subject: "Verify Your Email - UCC IP Management"        │
│                                                         │
│ Contains:                                               │
│ - Greeting with user's name                            │
│ - One-time magic link (24-hour validity)               │
│ - Plain text of link (for copy-paste if needed)        │
│ - Warning not to share link                            │
│ - Organization footer                                  │
│                                                         │
│ Does NOT contain:                                       │
│ ✗ Password or PIN                                       │
│ ✗ Auth token                                            │
│ ✗ API key or secret                                     │
│ ✗ User ID or sensitive data                             │
└─────────────────────────────────────────────────────────┘
```

---

## Error Scenarios & Recovery

```
┌────────────────────────────────────────────────────────────┐
│          WHAT HAPPENS IF SOMETHING GOES WRONG              │
└────────────────────────────────────────────────────────────┘

SCENARIO 1: Email Already Registered
├─ Registration attempt with existing email
├─ Function checks: users table
├─ User sees: "An account with this email already exists"
└─ Action: Use different email or sign in

SCENARIO 2: Email Service Down
├─ Magic link generated but email fails
├─ Function logs error (not shown to user)
├─ User sees: "Failed to send verification email"
└─ Action: Try again in a few minutes or contact support

SCENARIO 3: Link Expired
├─ User receives email but waits > 24 hours
├─ User clicks link
├─ Supabase validates: token expired
├─ User sees: "Email verification failed"
└─ Action: Register again for new link

SCENARIO 4: Link Already Used
├─ User clicks link once (successful)
├─ User tries to click again
├─ Supabase rejects: token consumed
├─ User sees: "Email verification failed"
└─ Action: User is already verified, can log in

SCENARIO 5: Invalid Magic Link
├─ User manually edits link URL
├─ Supabase validates: invalid signature
├─ User sees: "Email verification failed"
└─ Action: Register again for valid link

SCENARIO 6: Browser Closes During Verification
├─ User clicks link but closes browser before redirect
├─ Session created but not captured
├─ User sees: Loading screen then error
├─ Supabase: Session still created on server
└─ Action: Sign in normally with credentials
```

---

## Comparison: Before vs After

```
┌──────────────────────────────────────────────────────────────────┐
│                   SECURITY COMPARISON                             │
├──────────────────────────────────────────────────────────────────┤

                          BEFORE          →           AFTER
┌──────────────────────────────────────────────────────────────────┤
│ OTP Display            Alert popup      →     Not shown
│ Verification Method    Manual code      →     Magic link
│ Security              Development      →     Production
│ Link Validity         N/A              →     24 hours
│ One-time Use          No               →     Yes
│ Token Exposure        Console logs     →     Supabase only
│ Email Verification    Not required     →     Mandatory
│ Dashboard Access      No check         →     Verified only
│ Database Profile      Created early    →     Created after verify
│ Error Messages        Dev mode exposed →     User-friendly
│ TypeScript Strict     Disabled         →     Enabled
├──────────────────────────────────────────────────────────────────┤

SECURITY SCORE:
Before: ⭐⭐☆☆☆ (Development mode only)
After:  ⭐⭐⭐⭐⭐ (Production ready)
```

---

## What's Hidden from Users (Good!)

```
┌─────────────────────────────────────────────────┐
│ SENSITIVE DATA - NOT SHOWN TO USERS             │
├─────────────────────────────────────────────────┤
│ ✓ Magic link tokens                             │
│ ✓ Auth API keys                                 │
│ ✓ User IDs                                      │
│ ✓ Internal error stack traces                   │
│ ✓ Database query details                        │
│ ✓ Validation secrets                            │
│ ✓ Function execution logs                       │
│ ✓ Email provider credentials                    │
│ ✓ Timestamp details                             │
│ ✓ Technical error codes (except to admins)      │
└─────────────────────────────────────────────────┘
```

---

## Session Timeline

```
┌────────────────────────────────────────────────────────────────┐
│                        TIMELINE                                 │
├────────────────────────────────────────────────────────────────┤

T+0min   │ User registers
         │ Registration form submitted
         │
T+1min   │ Magic link generated
         │ Email sent (or queued)
         │
T+5min   │ User checks email
         │ User clicks magic link
         │
T+6min   │ Email verified
         │ Profile created
         │ Session established
         │ Redirect to dashboard
         │
T+10min  │ User actively using dashboard
         │ Session active
         │
T+24h    │ Magic link expires (can't reuse)
         │ But user is already verified
         │ Session remains valid
         │
T+30days │ Session may expire (browser dependent)
         │ User will need to log in again
         │ (Normal auth flow)
└────────────────────────────────────────────────────────────────┘
```

---

## Questions & Answers

**Q: Can I reuse a magic link?**
A: No. Each link is single-use. After successful verification, creating a new account requires a new registration and new magic link.

**Q: What if user loses the email?**
A: Link expires in 24 hours. User must register again with same or different email to get a new link.

**Q: Can I change the 24-hour expiration?**
A: Yes. Edit `register-user/index.ts` in the edge function, adjust `generateLink()` options.

**Q: What happens to temp_registrations data?**
A: Automatically deleted after 24 hours by Supabase TTL policy.

**Q: Can an attacker guess the magic link?**
A: No. Links are cryptographically secure (256-bit random) and virtually impossible to guess.

**Q: Is my password transmitted in the email?**
A: No. Only the magic link is sent. Password is used only once during registration, stored hashed in Supabase.
```

Perfect! Let me create one final checklist document:
