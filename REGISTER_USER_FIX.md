# Registration 400 Error - Fix & Debugging Guide

## Problem
Registration page is showing "Edge Function returned a non-2xx status code: 400" when users attempt to register.

## Analysis
The `register-user` Edge Function code appears syntactically correct, but is returning a 400 error. This could be caused by:

1. ✅ **Form validation failing** - Frontend sends invalid data
2. ✅ **Request parsing failing** - Invalid JSON in request body
3. ✅ **Field validation failing** - Missing required fields (email, fullName, password)
4. ✅ **Auth API call failing** - Supabase auth.admin.createUser() throws error
5. ✅ **Email format invalid** - Email address doesn't pass regex validation

## Solution Implemented

### Step 1: Enhanced Logging
Added detailed console.log statements to the `register-user` function to track:
- Request data received
- Extracted fields (email, fullName, password, departmentId)
- Validation failures with specific reasons
- Auth error messages and details
- Auth user creation success/failure

### Step 2: Added Email Validation
- Email format validation using regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Full name empty/whitespace check
- Returns clear 400 errors with specific validation failure messages

### Step 3: Enhanced Error Messages
Auth errors now include:
- Error message from Supabase
- Error status code
- Full error details as JSON
- All critical for debugging

## Deployment Steps

### For Development/Testing:
1. **Deploy Edge Functions to Supabase:**
   ```bash
   supabase functions deploy register-user
   supabase functions deploy send-notification-email
   supabase functions deploy generate-disclosure
   supabase functions deploy generate-documentation
   ```

2. **View Function Logs:**
   ```bash
   supabase functions list
   supabase functions show register-user
   ```

   Or use Supabase Dashboard → Functions → register-user → Logs

3. **Test Registration:**
   - Open the registration form
   - Try to register with test credentials
   - Check the Supabase function logs for detailed error messages

### For Production:
1. Push changes to main branch (already done ✅)
2. Supabase should auto-deploy via GitHub integration
3. Monitor function logs via Supabase Dashboard

## Expected Debug Output

When registration is attempted, you should see logs like:

```
Request data received: { email: "test@example.com", fullName: "John Doe", password: "password123", departmentId: "dept-id" }
Extracted fields - email: test@example.com fullName: John Doe password: true departmentId: dept-id
```

If there's a validation error:
```
Validation failed - missing fields: { email: true, fullName: true, password: false }
```

Or auth error:
```
Auth error: { message: "...", status: 400, ... }
Auth error message: specific error description
Auth error details: { ... }
```

## Quick Checklist

- [x] Code logging enhanced in register-user function
- [x] Email validation added
- [x] Error messages improved
- [x] Changes committed and pushed to origin/main
- [ ] **NEXT: Deploy Edge Functions** (`supabase functions deploy`)
- [ ] **NEXT: Check Supabase logs** for detailed error messages
- [ ] **NEXT: Test registration** with actual form submission
- [ ] **FIX:** Once logs show the specific error, implement corresponding fix

## Next Steps

1. Run `supabase functions deploy register-user` to deploy the updated function
2. Try registering again and check the Supabase function logs
3. The logs will show exactly where and why the 400 error is occurring
4. Report back with the specific error message and we can implement the fix

## File Modified
- `supabase/functions/register-user/index.ts` - Added logging and validation

## Commits
- `aff5ca8` - Add detailed logging to register-user function
- `813289b` - Add comprehensive logging and email validation
