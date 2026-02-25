# Email Verification Flow - Visual Reference

## Complete Registration → Verification → Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Visits /register page
                             │
        ┌────────────────────▼─────────────────────┐
        │   STEP 1: User Registration Form         │
        │   ─────────────────────────────────────  │
        │   Email:        user@example.com          │
        │   Password:     SecurePass123             │
        │   Full Name:    John Doe                  │
        │   Department:   (optional)                │
        └────────────────────┬─────────────────────┘
                             │
                             │ POST /functions/v1/register-user
                             │ + JSON body with form data
                             │
            ┌────────────────▼──────────────────┐
            │  STEP 2: EDGE FUNCTION            │
            │  register-user (Supabase Deno)    │
            └────────────────┬──────────────────┘
                             │
                    ┌────────▼──────────┐
                    │  2a. Validate     │
                    │  ─────────────    │
                    │  ✓ Email valid    │
                    │  ✓ Pass 6+ chars  │
                    │  ✓ Not existing   │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────────────────────┐
                    │  2b. Create auth.user             │
                    │  ─────────────────────────        │
                    │  Supabase Admin API               │
                    │  email, password                  │
                    │  email_confirm = false            │
                    │  (waiting for verification)       │
                    └────────┬──────────────────────────┘
                             │
                    ┌────────▼──────────────────────────┐
                    │  2c. Generate Email Link          │
                    │  ──────────────────────────────── │
                    │  generateLink({                   │
                    │    type: "signup" ← KEY!          │
                    │    email,                         │
                    │    redirectTo: .../auth/callback  │
                    │  })                               │
                    │                                   │
                    │  Response:                        │
                    │  {                                │
                    │    properties: {                  │
                    │      action_link: "https://..."   │
                    │    }                              │
                    │  }                                │
                    └────────┬──────────────────────────┘
                             │
                    ┌────────▼──────────────────────────┐
                    │  2d. Send Email via Resend        │
                    │  ────────────────────────────────│
                    │  POST https://api.resend.com      │
                    │  Headers:                         │
                    │    Authorization: Bearer ...      │
                    │  Body:                            │
                    │    from: noreply@ucc-ipo.com      │
                    │    to: user@example.com           │
                    │    html: [email template]         │
                    │    (includes action_link)         │
                    │                                   │
                    │  Response:                        │
                    │  { id: "msg_123...", ok }         │
                    └────────┬──────────────────────────┘
                             │
            ┌────────────────▼──────────────────┐
            │  STEP 3: Return Success           │
            │  ────────────────────────────────│
            │  HTTP 200                        │
            │  {                               │
            │    success: true,                │
            │    message: "Check your email"   │
            │  }                               │
            └────────────────┬──────────────────┘
                             │
                             │ Response shown to user
                             │ "Check your email..."
                             │
        ┌────────────────────▼─────────────────────┐
        │  STEP 4: User Receives Email             │
        │  ──────────────────────────────────────│
        │  From: UCC IP Office <noreply@...>      │
        │  Subject: Verify Your Email             │
        │                                          │
        │  Email Content:                          │
        │  ───────────────                         │
        │  └─ UCC IP Management Branding           │
        │  └─ Hello John Doe,                      │
        │  └─ [Big Blue Button]                    │
        │     Verify Email Address                 │
        │  └─ Or copy: https://xyzabc.supabase... │
        │  └─ Link expires in 24 hours             │
        │  └─ Security warning (if not you...)     │
        │                                          │
        └────────────────────┬─────────────────────┘
                             │
                             │ User clicks button
                             │ (or clicks link)
                             │
        ┌────────────────────▼─────────────────────┐
        │  STEP 5: Email Verification Flow         │
        │  ──────────────────────────────────────│
        │  Browser redirects to:                  │
        │  https://xyzabc.supabase.co/auth/v1/    │
        │  verify?token=xxx&type=signup&...       │
        │                                          │
        │  Supabase backend:                       │
        │  1. Validates token (valid? not used?)   │
        │  2. Marks email as verified              │
        │  3. Sets email_confirmed_at timestamp    │
        │  4. Redirects to:                        │
        │     https://ucc-ipo.com/auth/callback?   │
        │     code=exchange_code                   │
        │                                          │
        └────────────────────┬─────────────────────┘
                             │
        ┌────────────────────▼──────────────────────┐
        │  STEP 6: Frontend Auth Callback Handler   │
        │  ───────────────────────────────────     │
        │  Route: https://ucc-ipo.com/auth/callback│
        │                                           │
        │  Supabase SDK:                            │
        │  1. Detects code in URL                  │
        │  2. Exchanges code for session            │
        │  3. User is now authenticated             │
        │  4. Redirect to dashboard                 │
        │                                           │
        └────────────────────┬──────────────────────┘
                             │
            ┌────────────────▼──────────────────┐
            │  STEP 7: Database Trigger Fires   │
            │  ────────────────────────────────│
            │  on_auth_user_verified trigger    │
            │  handle_verified_user()           │
            │                                   │
            │  Creates public.users record:     │
            │  ─────────────────────────────── │
            │  • auth_user_id: (from auth)      │
            │  • email: user@example.com        │
            │  • full_name: John Doe            │
            │  • role: 'applicant'              │
            │  • is_approved: false             │
            │  • created_at: now                │
            │                                   │
            └────────────────┬──────────────────┘
                             │
        ┌────────────────────▼──────────────────────┐
        │  STEP 8: Admin Approval Required          │
        │  ───────────────────────────────────     │
        │  User is created but...                  │
        │  is_approved = false                     │
        │                                          │
        │  Admin Dashboard:                        │
        │  → Sees John Doe in pending approvals    │
        │  → Reviews department assignment         │
        │  → Approves or rejects                   │
        │                                          │
        │  If Approved:                            │
        │  • is_approved = true                    │
        │  • User can now access dashboard         │
        │                                          │
        │  If Rejected:                            │
        │  • Account deactivated                   │
        │  • User sees "Access Denied"             │
        │                                          │
        └────────────────────┬──────────────────────┘
                             │
        ┌────────────────────▼──────────────────────┐
        │  STEP 9: User Can Now Log In              │
        │  ───────────────────────────────────     │
        │  Visit: https://ucc-ipo.com/login        │
        │                                          │
        │  Enter:                                  │
        │  • Email: user@example.com               │
        │  • Password: SecurePass123               │
        │                                          │
        │  Supabase SDK:                           │
        │  signInWithPassword({ email, password }) │
        │                                          │
        │  ✅ LOGIN SUCCESSFUL                     │
        │  → User is logged in                     │
        │  → Redirected to dashboard               │
        │  → Can submit IPO applications           │
        │                                          │
        └────────────────────────────────────────────┘
```

---

## Key Decision Points

### "signup" vs "magiclink"

```
CORRECT (Our Implementation):
User Registration
    ↓
User sets password: "SecurePass123"
    ↓
Email verification link sent
    ↓
User clicks link → Email verified
    ↓
User logs in with email + password
    ↓
✅ Password required for every login


WRONG (If we used "magiclink"):
User Registration
    ↓
User sets password: "SecurePass123"
    ↓
Magic link sent (for passwordless signin)
    ↓
User clicks link → AUTO-LOGGED IN (ignored password!)
    ↓
❌ User's password is never used
❌ Security issue: Not the intended flow
```

---

## Error Handling Paths

```
Registration Request
    │
    ├─→ Invalid email/password?
    │   └─→ Error: "Missing required field(s): ..."
    │       HTTP 400
    │
    ├─→ User already exists?
    │   └─→ Success: { alreadyExists: true }
    │       HTTP 200
    │
    ├─→ Auth user creation fails?
    │   └─→ Error: "ERR_AUTH: [details]"
    │       HTTP 200 (per design)
    │
    ├─→ Link generation fails?
    │   └─→ Error: "Failed to generate email confirmation link"
    │       Throws error → caught → returns error
    │       HTTP 200
    │
    ├─→ RESEND_API_KEY not set?
    │   └─→ Error: "Email service not configured"
    │       Throws error → returns error
    │       HTTP 200
    │
    ├─→ Email send fails (HTTP error)?
    │   └─→ Error: "Email service error (HTTP 401): ..."
    │       Throws error → returns error
    │       HTTP 200
    │
    ├─→ Unexpected response format?
    │   └─→ Error: "Email service did not confirm delivery"
    │       Throws error → returns error
    │       HTTP 200
    │
    └─→ Everything succeeds? ✅
        └─→ Success: { success: true, message: "..." }
            HTTP 200
```

---

## Timing Diagram

```
t=0s     User clicks "Register"
         └─ Browser sends POST to register-user

t=0.1s   Edge Function validates input
         ├─ Email format ✓
         ├─ Password strength ✓
         └─ Not already exists ✓

t=0.2s   Create auth.user
         └─ Supabase Auth API response

t=0.3s   Wait 1.5s for trigger
         └─ Allows handle_verified_user() to complete

t=1.8s   Generate email link (generateLink)
         └─ Supabase Admin API response

t=1.9s   Send email via Resend
         └─ HTTP POST to api.resend.com

t=2.0s   Return success to browser
         └─ "Check your email for verification link"

         ───────────────────────────────────────

t=5m     User opens email
         ├─ From: UCC IP Office <noreply@ucc-ipo.com>
         ├─ Subject: Verify Your Email
         └─ Content: [email template with action_link]

t=6m     User clicks "Verify Email Address" button
         ├─ Browser → Supabase Auth verification endpoint
         ├─ Supabase validates token
         ├─ Sets email_confirmed_at
         └─ Redirects to /auth/callback

t=6.1s   Frontend receives callback code
         ├─ Supabase SDK exchanges code
         ├─ User session created
         └─ Redirected to dashboard

t=6.5s   Database trigger: handle_verified_user()
         ├─ Creates public.users record
         ├─ role='applicant'
         ├─ is_approved=false
         └─ Awaiting admin approval

         ───────────────────────────────────────

t=24h    Email link expires
         └─ User must re-register if not used

         ───────────────────────────────────────

t=?      Admin approves user
         ├─ Sets is_approved=true
         └─ User can now access dashboard

t=?      User logs in
         ├─ Email: user@example.com
         ├─ Password: SecurePass123
         └─ ✅ Access granted!
```

---

## Data Flow

```
┌──────────────────┐
│  User's Browser  │
└────────┬─────────┘
         │
         │ POST /functions/v1/register-user
         │ { email, password, fullName, ... }
         │
         ▼
┌────────────────────────────────────────┐
│  Supabase Edge Function (Deno)         │
│  ─────────────────────────────────────│
│                                        │
│  1. Validate input                     │
│  2. Create auth.user (via Admin API)   │
│  3. Generate link (via Admin API)      │
│  4. Send email (via Resend HTTP)       │
│  5. Return success                     │
│                                        │
└────┬──────────────────┬────────────────┘
     │                  │
     │ Calls            │ Calls
     │                  │
     ▼                  ▼
┌────────────────┐  ┌───────────────────┐
│ Supabase Auth  │  │ Resend API        │
│ Admin API      │  │ (Email Provider)  │
│                │  │                   │
│ • createUser   │  │ POST /emails      │
│ • generateLink │  │ With action_link  │
│ (type: signup) │  │ in HTML           │
│                │  │                   │
└────────────────┘  └───────────────────┘
     ▲                  ▲
     │ Returns          │ Returns
     │ auth user        │ { id: "..." }
     │ & link           │

         ▼

┌────────────────────────────────────────┐
│  User's Inbox                          │
│  ────────────────────────────────────│
│  From: noreply@ucc-ipo.com             │
│  To: user@example.com                  │
│  Subject: Verify Your Email            │
│                                        │
│  [HTML Email with action_link]         │
│                                        │
└────┬─────────────────────────────────┘
     │
     │ User clicks "Verify Email Address"
     │ or clicks raw link
     │
     ▼
┌────────────────────────────────────────┐
│  https://xyzabc.supabase.co/auth/v1/   │
│  verify?token=...&type=signup&...      │
│                                        │
│  Supabase Auth Backend:                │
│  • Validates token                     │
│  • Sets email_confirmed_at             │
│  • Creates session                     │
│  • Redirects to /auth/callback         │
│                                        │
└────┬─────────────────────────────────┘
     │
     │ Redirect: /auth/callback?code=...
     │
     ▼
┌────────────────────────────────────────┐
│  User's Browser                        │
│  ────────────────────────────────────│
│  Route: /auth/callback                 │
│                                        │
│  Frontend Supabase Client:             │
│  • Detects code in URL                 │
│  • Exchanges code for session          │
│  • User is authenticated               │
│  • Redirects to /dashboard             │
│                                        │
└────┬─────────────────────────────────┘
     │
     │ Trigger fires (PostgreSQL)
     │ handle_verified_user()
     │
     ▼
┌────────────────────────────────────────┐
│  Supabase Database                     │
│  ────────────────────────────────────│
│                                        │
│  Tables:                               │
│  • auth.users                          │
│    ├─ email_confirmed_at: [timestamp] │
│    └─ user_id                          │
│                                        │
│  • public.users (created by trigger)   │
│    ├─ auth_user_id (FK)                │
│    ├─ email: user@example.com          │
│    ├─ full_name: John Doe              │
│    ├─ role: 'applicant'                │
│    ├─ is_approved: false               │
│    └─ created_at: [now]                │
│                                        │
│  • public.departments (if assigned)    │
│    └─ department_id: [UUID]            │
│                                        │
└────────────────────────────────────────┘
```

---

## Success Indicators

```
✅ Registration submitted
   └─ User sees: "Check your email for verification link"

✅ Email sent successfully
   └─ Resend dashboard shows: Status "Delivered"
   └─ User receives email within 1-5 minutes

✅ Email verified
   └─ User redirected to /auth/callback
   └─ Browser shows: "Verifying your email..."

✅ Profile created
   └─ Check Supabase → public.users table
   └─ New record with role='applicant', is_approved=false

✅ Can log in
   └─ User visits /login
   └─ Enters email + password
   └─ Successfully authenticated

✅ Awaiting admin approval
   └─ Admin visits admin dashboard
   └─ Sees user in "Pending Approval"
   └─ Can approve or reject
```

---

## Reference: SMTP vs HTTP Comparison

```
BEFORE (Attempted Supabase SMTP):
├─ Auth user created
├─ Supabase SMTP attempts to send
├─ ❌ SMTP not configured
└─ ❌ User never receives email

AFTER (Our Implementation - Resend HTTP):
├─ Auth user created
├─ Generate link via Supabase Admin API
├─ Send email via Resend HTTP API
│  ├─ POST https://api.resend.com/emails
│  ├─ Authorization: Bearer {RESEND_API_KEY}
│  └─ Returns { id: "msg_123", ok: true }
├─ ✅ Email reliably delivered
├─ User receives verification email
├─ User clicks link
└─ ✅ Account fully activated
```
