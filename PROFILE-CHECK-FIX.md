# Profile Check Fix for Raahi

## Issue
When users navigated to the Find page (Untitled-1.html) or other pages, they were being redirected to the login page again automatically, even though they were already logged in.

## Root Cause
The issue was in how the application was checking if a user's profile was complete. The pages were only checking if the profile existed (`if (!userProfile)`), but not if it was marked as complete.

This was inconsistent with the login page, which was checking for profile completion using `profile.profileComplete || profile.isProfileComplete`.

## Solution

### Updated Profile Completion Check
Modified the profile check in multiple pages to check for both the existence of the profile and its completion status:

```javascript
// Before
if (!userProfile) {
    // Profile not complete, redirect to profile page
    window.location.href = 'Untitled-6.html';
    return;
}

// After
if (!userProfile || !(userProfile.profileComplete || userProfile.isProfileComplete)) {
    // Profile not complete, redirect to profile completion page
    window.location.href = 'Untitled-6.html';
    return;
}
```

### Files Modified
1. `Untitled-1.html` (Find a Ride page)
2. `Untitled-2.html` (Offer a Ride page)
3. `Untitled-9.html` (My Rides page)

## Result
Users who are logged in and have completed their profile should now be able to navigate to the Find page and other pages without being redirected to the login page again.

## Note
This fix works in conjunction with the previous profile completion fix, which ensures that users only need to complete their profile once.