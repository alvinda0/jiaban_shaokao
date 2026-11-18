# Password Login Issue - Fix Guide

## Problem

When logging in with a user created with password `123456`, the login fails saying "Invalid email or password".

## Root Cause

The `findByEmail()` and `findById()` queries in UserModel were NOT selecting the `password` field from the database. This caused `bcrypt.compare()` to fail because `user.password` was `undefined`.

### Issue in Database Queries

```javascript
// ❌ WRONG - Doesn't include password
SELECT u.id, u.name, u.email, u.store_id, u.is_active, u.created_at, ...

// ✅ CORRECT - Includes password with u.*
SELECT u.*, r.name AS role_name ...
```

## Solution

### ✅ Backend Fixes Applied

1. **`backend/src/models/user.model.js`**
   - Changed `findByEmail()` to use `u.*` (includes password)
   - Changed `findById()` to use `u.*` (includes password)

2. **`backend/src/controllers/auth.controller.js`**
   - Updated `me()` endpoint to exclude password from response
   - Added `{ password, ...userData }` destructuring

3. **`backend/src/controllers/user.controller.js`**
   - Updated `getAll()` to exclude passwords from response
   - Updated `getById()` to exclude passwords from response

### 📋 What Changed

```javascript
// Login flow - password is now accessible for comparison
const user = await UserModel.findByEmail(email); // Now includes password
const match = await bcrypt.compare(password, user.password); // ✅ Works!

// Response to client - password is never sent
const { password, ...userData } = user;
return success(res, userData, '...'); // ✅ No password exposed
```

## Testing the Fix

### 1. Test with Existing Users

If you have existing users with unhashed passwords:

```bash
# Run the fix script
node backend/scripts/fix_unhashed_passwords.js
```

This script will:
- ✅ Find all users with unhashed passwords
- ✅ Hash them with bcrypt (salt rounds: 10)
- ✅ Update the database
- ✅ Show results

### 2. Test Login

**With user:** `rama@shaokao.com`  
**Password:** `123456`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rama@shaokao.com", "password": "123456"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Login successful"
}
```

### 3. Test User Endpoints

```bash
# Get all users (should NOT include password field)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users

# Get specific user (should NOT include password field)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users/user-id

# Get current user (should NOT include password field)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me
```

## Database Check

### Check which users have unhashed passwords

```sql
SELECT id, email, password, created_at
FROM users
WHERE password NOT LIKE '$2%'
ORDER BY created_at DESC;
```

Unhashed passwords:
- ❌ Look like plain text: `123456`
- ❌ Start with other hashes: `$1$...`, `md5$...`, etc.

Hashed passwords (correct):
- ✅ Start with: `$2a$`, `$2b$`, or `$2y$`
- ✅ Example: `$2b$10$rLs8aBBOPvdJtlkxYeRa9OaNtk3oqkMZXUDG.QjXz1P3VFbZ3p.gG`

## Troubleshooting

### Issue: Still can't login after fix

1. **Verify the fix was applied:**
   ```bash
   # Check if password was updated
   SELECT id, email, password FROM users WHERE email = 'rama@shaokao.com';
   ```

2. **Run the hash fix script:**
   ```bash
   node backend/scripts/fix_unhashed_passwords.js
   ```

3. **Verify bcrypt is installed:**
   ```bash
   npm list bcryptjs
   ```

### Issue: Script shows "Found 0 users" but login still fails

The password might have been corrupted. Solution:

1. **Update password manually:**
   ```javascript
   // Node.js REPL
   const bcrypt = require('bcryptjs');
   bcrypt.hash('123456', 10).then(hash => console.log(hash));
   ```

2. **Copy the hash and update database:**
   ```sql
   UPDATE users 
   SET password = '$2b$10/...' 
   WHERE email = 'rama@shaokao.com';
   ```

### Issue: Multiple users affected

Run the fix script which handles all users automatically:

```bash
node backend/scripts/fix_unhashed_passwords.js
```

## Prevention

### For future user creation

The fixed code ensures:

1. ✅ **Controller hashes password** before passing to service
2. ✅ **Service hashes password** again (defensive coding)
3. ✅ **Database stores hashed password** with bcrypt
4. ✅ **Login compares using bcrypt.compare()**
5. ✅ **API never returns password** in responses

### Code to prevent regression

```javascript
// ✅ Correct pattern
const hashedPassword = await bcrypt.hash(password, 10);
await UserModel.create({ password: hashedPassword, ... });

// ❌ Never do this
await UserModel.create({ password: plainPassword, ... }); // WRONG!
```

## Files Changed

1. `backend/src/models/user.model.js` - Fixed query selection
2. `backend/src/controllers/auth.controller.js` - Filter password from response
3. `backend/src/controllers/user.controller.js` - Filter password from response
4. `backend/scripts/fix_unhashed_passwords.js` - New fix script
5. `backend/src/migrations/fix_unhashed_passwords.sql` - Migration guide

## Quick Start

```bash
# 1. Apply the backend fixes (already done)
# 2. Fix existing unhashed passwords
node backend/scripts/fix_unhashed_passwords.js

# 3. Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rama@shaokao.com", "password": "123456"}'

# 4. Should see success response with token
```

---

**Status**: ✅ Fixed  
**Affected Users**: Users created before this fix with plain text passwords  
**Action Required**: Run `fix_unhashed_passwords.js` script once

