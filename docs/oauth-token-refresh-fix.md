# OAuth Token Refresh Fix

## Problem

Users were experiencing an error "Got ID token, but need OAuth access token for Classroom API" when:

1. Closing the browser and reopening it
2. Installing the app as a PWA (Add to Home Screen) and reopening it
3. Leaving the app inactive for some time and returning

This happened because:

- OAuth access tokens were stored in `sessionStorage`, which gets cleared when the browser/tab is closed
- The Firebase auth session (ID token) persists, but the OAuth access token doesn't
- When users returned, they had a valid Firebase session but no OAuth token to access Google Classroom API

## Solution

### 1. Added Token Refresh Functionality (`auth-context.tsx`)

- Added `refreshAccessToken()` function to the auth context
- This function triggers a new OAuth flow with `prompt: "select_account"` to quickly re-authenticate
- Uses the user's email as a `login_hint` for faster re-authentication
- Stores the new access token in sessionStorage

### 2. Automatic Token Refresh in Sync (`classroom-context.tsx`)

- Modified `syncClassroom()` to automatically attempt token refresh when no access token is found
- If refresh succeeds, the sync continues normally
- If refresh fails, shows a user-friendly error message

### 3. Better Error UI (`token-refresh-prompt.tsx`)

- Created a new component that provides a clear, actionable error message
- Includes a "Refresh Access" button that triggers the token refresh flow
- Includes a "Sign Out" button as an alternative
- Shows loading state during refresh

### 4. Updated Dashboard Error Handling

- Dashboard now detects session-related errors
- Shows the TokenRefreshPrompt component instead of a generic error
- Provides a better user experience with clear next steps

## How It Works

1. **User returns to app**: Firebase auth session is still valid, but OAuth token is missing
2. **Sync is triggered**: The app detects missing OAuth token
3. **Automatic refresh**: The app calls `refreshAccessToken()` which:
   - Opens a Google sign-in popup with the user's email pre-filled
   - User clicks their account (or it auto-selects)
   - New OAuth access token is obtained and stored
4. **Sync continues**: With the new token, data sync proceeds normally

## User Experience

### Before Fix:

- Error message: "Access token expired. Please sign out and sign in again"
- User had to manually sign out and sign in
- Lost any unsaved state

### After Fix:

- Automatic token refresh attempt
- If automatic refresh fails, shows friendly prompt with "Refresh Access" button
- One-click refresh without losing state
- Faster re-authentication with pre-filled email

## Technical Details

### Token Storage:

- **ID Token**: Managed by Firebase Auth, persists across sessions
- **OAuth Access Token**: Stored in sessionStorage, cleared on browser close
- **Refresh Token**: Not currently used (would require server-side implementation)

### OAuth Scopes:

The refresh flow requests these scopes:

- `classroom.courses.readonly`
- `classroom.coursework.me`
- `classroom.courseworkmaterials.readonly`
- `classroom.student-submissions.me.readonly`

### Error Handling:

- Network errors: Caught and logged
- Permission denied: Shows appropriate error message
- Token refresh failure: Falls back to sign-out option

## Testing Scenarios

1. ✅ Close browser and reopen
2. ✅ Install as PWA and reopen after closing
3. ✅ Leave app inactive and return
4. ✅ Clear sessionStorage manually
5. ✅ Revoke permissions and try to refresh

## Future Improvements

1. **Server-side refresh tokens**: Implement proper OAuth refresh token flow with server-side storage
2. **Background token refresh**: Proactively refresh tokens before they expire
3. **Offline support**: Cache data for offline access
4. **Token expiry detection**: Monitor token expiry time and refresh proactively
