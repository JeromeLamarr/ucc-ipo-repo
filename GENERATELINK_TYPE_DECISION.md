# Email Verification Implementation: Design Decisions

## generateLink Type Decision: "signup" vs Alternatives

### The Question
What is the correct Supabase `generateLink` type for email verification during user registration?

### The Answer: **"signup"** ✅

---

## Why "signup" (Not "magiclink")

### Option 1: `type: "signup"` ✅ CORRECT FOR REGISTRATION
```typescript
const { data, error } = await supabase.auth.admin.generateLink({
  type: "signup",
  email: "user@example.com",
  options: {
    redirectTo: "https://app.example.com/auth/callback",
  },
});
```

**Purpose:** Email verification link during **signup/registration**
- User must click the link to verify email and complete registration
- Creates a proper signup flow (email confirmation)
- After clicking: `email_confirmed_at` is set, user is ready to log in
- Link is one-time use and expires after 24 hours
- **Perfect for:** New user registration with email verification

### Option 2: `type: "magiclink"` ❌ NOT FOR REGISTRATION
```typescript
const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email: "user@example.com",
});
```

**Purpose:** Passwordless sign-in (sign in without password)
- User clicks link → automatically logged in (no password needed)
- Does NOT verify email as part of signup flow
- Used for "Sign In" (not "Register")
- **Wrong for:** Registration flow where you want email verification

### Option 3: `type: "recovery"` ❌ NOT FOR REGISTRATION
**Purpose:** Password reset only
- Used when user forgets password
- Not registration-related

### Option 4: `type: "invite"` ❌ NOT FOR REGISTRATION  
**Purpose:** Invite link for admin to add users
- Used for admin-invited accounts
- Not self-service registration

---

## Side-by-Side Comparison

| Aspect | "signup" | "magiclink" | "recovery" | "invite" |
|--------|----------|------------|-----------|----------|
| **Verification Link** | ✅ Email verification | ❌ Sign-in only | ❌ Password reset | ❌ Invite |
| **Sets `email_confirmed_at`** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **Requires Password** | ✅ Yes (set at signup) | ❌ No (passwordless) | ✅ Yes (reset) | ✅ Yes (admin) |
| **Flow Type** | Registration | Sign-in | Forgot Password | Admin Invite |
| **Perfect For** | 🎯 **Our Use Case** | Self-service signin | Password recovery | Invite users |

---

## Implementation Details

### What We're Using
```typescript
const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
  type: "signup",  // ← Email verification for registration
  email: "applicant@ucc-ipo.com",
  options: {
    redirectTo: "https://ucc-ipo.com/auth/callback",  // ← User clicks link, comes here
  },
});

// Extract the confirmation link
const actionLink = linkData?.properties?.action_link;
// actionLink = "https://xyzabc.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=..."
```

### What Happens When User Clicks Link
1. Link redirects to: `https://ucc-ipo.com/auth/callback?code=xyz`
2. Frontend's Supabase client exchanges code for session
3. Supabase backend verifies the code
4. Sets `email_confirmed_at` timestamp
5. User's email is now verified
6. Trigger fires: `handle_verified_user()` creates `public.users` record
7. User can now log in

---

## Email Content Structure

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>Verify Your Email</h2>
    <p>Click the button below to confirm your email and complete registration:</p>
    
    <a href="https://xyzabc.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=https://ucc-ipo.com/auth/callback">
      Verify Email Address
    </a>
    
    <p>Or copy this link:</p>
    <p>https://xyzabc.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=https://ucc-ipo.com/auth/callback</p>
    
    <p><strong>This link expires in 24 hours.</strong></p>
  </body>
</html>
```

---

## Why NOT Use "magiclink"

### The Problem
If we used `type: "magiclink"`:
```typescript
const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",  // ← Wrong for registration!
  email: "user@example.com",
  options: {
    redirectTo: "https://app.example.com/auth/callback",
  },
});
```

**Issues:**
1. ❌ User clicks link → **Automatically logged in** (no password check)
2. ❌ User set a password during registration, but it's ignored
3. ❌ `email_confirmed_at` may not be set properly
4. ❌ Doesn't trigger our email verification workflow
5. ❌ User ID mismatch in auth flow

### The Correct Flow (signup)
Using `type: "signup"`:
1. ✅ User registers (email + password)
2. ✅ Email link is sent
3. ✅ User clicks link
4. ✅ Email is verified (`email_confirmed_at` set)
5. ✅ User can now log in with email + password
6. ✅ Proper security: password is required for access

---

## Verification Timeline

```
t=0s: User submits registration form
  → Email: user@example.com, Password: secure123

t=1s: Edge Function:
  → Creates auth user (email_confirm=false)
  → Generates signup link via generateLink(type: "signup")
  → Sends email via Resend with the link

t=2s: User receives email
  → "Verify Email Address" button
  → Links to: https://xyzabc.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=https://ucc-ipo.com/auth/callback

t=5m: User clicks link
  → Redirects to https://ucc-ipo.com/auth/callback?code=xxx
  → Frontend exchanges code for session
  → Supabase verifies the code
  → Sets email_confirmed_at

t=6m: Trigger fires
  → handle_verified_user() creates public.users record
  → role='applicant', is_approved=false (pending admin approval)

t=10m: User logs in
  → Email: user@example.com
  → Password: secure123
  → ✅ Access granted (or waiting for admin approval)
```

---

## Response Structure from generateLink

```typescript
// Response when type: "signup"
{
  data: {
    properties: {
      action_link: "https://xyzabc.supabase.co/auth/v1/verify?token=xxx&type=signup&redirect_to=..."
    }
  },
  error: null
}

// Extraction in code:
const actionLink = linkData?.properties?.action_link;
```

---

## Key Takeaways

| Key Point | Details |
|-----------|---------|
| **Correct Type** | `type: "signup"` for registration email verification |
| **Wrong Choice** | `type: "magiclink"` is for passwordless sign-in, not registration |
| **Link Extraction** | `actionLink = linkData.properties.action_link` |
| **Email Provider** | Resend (via REST API with Bearer token) |
| **Link Expiry** | 24 hours |
| **After User Clicks** | Triggers `handle_verified_user()` database trigger |
| **Security** | Links are one-time use, email must match registered email |

---

## Related Resources

- [Supabase Auth API Docs](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)
- [Email Verification Flow](https://supabase.com/docs/guides/auth#email-verification)
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
