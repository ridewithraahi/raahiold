# Firebase Rules Fix for Raahi

## Issue
The application is encountering errors related to missing indexes in Firebase Realtime Database:

```
Error loading statistics: Error: Index not defined, add ".indexOn": "driverId", for path "/rides"
Error loading available rides: Error: Index not defined, add ".indexOn": "status", for path "/rides"
```

## Solution

### Option 1: Update Firebase Rules (Recommended)

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`raahi-2b943`)
3. Click on "Realtime Database" in the left sidebar
4. Click on the "Rules" tab
5. Replace the current rules with the updated rules below:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "rides": {
      ".read": "auth != null",
      ".write": "auth != null",
      ".indexOn": ["driverId", "status"],
      "$rideId": {
        ".write": "auth != null && (!data.exists() || data.child('driverId').val() === auth.uid)"
      }
            {
     "rules": {
       "users": {
         ".read": "auth != null",
         ".write": "auth != null"
       }
     }
   }
    },
    "bookings": {
      ".read": "auth != null",
      ".write": "auth != null",
      "$bookingId": {
        ".write": "auth != null && (!data.exists() || data.child('passengerId').val() === auth.uid || root.child('rides').child(data.child('rideId').val()).child('driverId').val() === auth.uid)"
      }
    }
  }
}
```

6. Click "Publish" to save the changes

### Option 2: Use the Code Workaround (Already Implemented)

The application has been updated with a workaround that:
1. First attempts to use the indexed query
2. If an index error occurs, falls back to retrieving all rides and filtering them client-side
3. If a permission error occurs, falls back to using mock data from localStorage

This workaround is less efficient but allows the application to function until the Firebase rules are properly updated.

## Why This Fix Works

The `.indexOn` rule tells Firebase to create and maintain an index for the specified fields, which makes queries that filter or order by those fields much more efficient. Without these indexes, Firebase would need to scan the entire dataset for each query, which is inefficient and not allowed by default.

The updated rules add indexes for:
- `driverId` - Used when querying rides created by a specific user
- `status` - Used when querying active rides

## Additional Information

For more information about Firebase indexing, see the [Firebase documentation on indexing data](https://firebase.google.com/docs/database/security/indexing-data).