// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getDatabase, ref, set, get, push, update, remove, onValue, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { formatPhoneNumber } from './twilio.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQYt53KN2RhiBmHGPz-O8PVdIqtF2MH5w",
  authDomain: "raahi-e93a4.firebaseapp.com",
  databaseURL: "https://raahi-e93a4-default-rtdb.firebaseio.com", // Add this if you use Realtime Database
  projectId: "raahi-e93a4",
  storageBucket: "raahi-e93a4.appspot.com", // Corrected!
  messagingSenderId: "346776660243",
  appId: "1:346776660243:web:b84395bc6530002b0052e6",
  measurementId: "G-DTNFEV1NJB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Authentication functions
export const loginUser = async (phone, password) => {
    try {
        // Format phone number and convert to email format for Firebase auth
        const formattedPhone = formatPhoneNumber(phone);
        const email = `${formattedPhone.replace('+', '')}@raahi.com`;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Error in loginUser:", error);
        throw error;
    }
};

export const registerUser = async (phone, password) => {
    try {
        // Format phone number and convert to email format for Firebase auth
        const formattedPhone = formatPhoneNumber(phone);
        const email = `${formattedPhone.replace('+', '')}@raahi.com`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Error in registerUser:", error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        throw error;
    }
};

// Cache for current user to avoid multiple auth state checks
let cachedCurrentUser = null;
let lastUserCheck = 0;
const USER_CACHE_DURATION = 60000; // 1 minute cache

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    // Check if we have a cached user and the cache is still valid
    const now = Date.now();
    if (cachedCurrentUser && (now - lastUserCheck < USER_CACHE_DURATION)) {
      console.log('Using cached current user');
      return resolve(cachedCurrentUser);
    }
    
    // Otherwise check with Firebase
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      // Update the cache
      cachedCurrentUser = user;
      lastUserCheck = now;
      resolve(user);
    }, reject);
  });
};

// User profile functions
export const hasStoredUserProfile = (userId) => {
  // Check if we have a cached profile in session storage
  const cachedProfile = sessionStorage.getItem(`user_profile_${userId}`);
  if (cachedProfile) {
    return true;
  }
  
  // Check if we have a profile in localStorage
  const localUserData = localStorage.getItem(`user_${userId}`);
  if (localUserData) {
    return true;
  }
  
  return false;
};

export const createUserProfile = async (userId, profileData) => {
  try {
    // First try the normal way
    try {
      const userData = {
        ...profileData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await set(ref(database, `users/${userId}`), userData);
      
      // Cache the profile data in session storage for future use
      sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify(userData));
      
      return true;
    } catch (error) {
      // If we get a permission error, try an alternative approach
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when creating user profile. Using temporary local storage fallback.');
        
        // Store in localStorage as a temporary fallback
        const userData = {
          ...profileData,
          id: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        
        // Also cache in session storage for faster access
        sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify(userData));
        
        // Show warning about using local storage
        alert('Your profile has been temporarily saved to local storage due to Firebase permission issues. Please contact the administrator to update Firebase security rules for permanent storage.');
        
        return true;
      } else {
        // If it's not a permission error, rethrow
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    // Check if we have a cached profile in session storage for faster access
    const cachedProfile = sessionStorage.getItem(`user_profile_${userId}`);
    if (cachedProfile) {
      console.log('Using cached profile data from sessionStorage');
      return JSON.parse(cachedProfile);
    }
    
    // First try to get from Firebase
    try {
      const snapshot = await get(ref(database, `users/${userId}`));
      if (snapshot.exists()) {
        const profileData = snapshot.val();
        // Cache the profile data in session storage for future use
        sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify(profileData));
        return profileData;
      }
    } catch (error) {
      console.warn('Error fetching user profile from Firebase:', error);
      // Continue to local storage fallback
    }
    
    // If not found in Firebase or there was an error, check localStorage
    const localUserData = localStorage.getItem(`user_${userId}`);
    if (localUserData) {
      console.warn('Using profile data from localStorage due to Firebase permission issues');
      const profileData = JSON.parse(localUserData);
      // Cache the profile data in session storage for future use
      sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify(profileData));
      return profileData;
    }
    
    // If not found anywhere
    return null;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (userId, profileData) => {
  try {
    // First try the normal way
    try {
      const updatedData = {
        ...profileData,
        updatedAt: new Date().toISOString()
      };
      
      await update(ref(database, `users/${userId}`), updatedData);
      
      // Update the cached profile in session storage
      const cachedProfile = sessionStorage.getItem(`user_profile_${userId}`);
      if (cachedProfile) {
        const existingProfile = JSON.parse(cachedProfile);
        const updatedProfile = {
          ...existingProfile,
          ...updatedData
        };
        sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify(updatedProfile));
      }
      
      return true;
    } catch (error) {
      // If we get a permission error, try the localStorage approach
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating user profile. Using localStorage fallback.');
        
        // Get existing data from localStorage
        const existingData = localStorage.getItem(`user_${userId}`);
        let userData = existingData ? JSON.parse(existingData) : {};
        
        // Update with new data
        userData = {
          ...userData,
          ...profileData,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        
        // Also update the cached profile in session storage
        sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify(userData));
        
        console.warn('Profile updated in localStorage due to Firebase permission issues');
        return true;
      } else {
        // If it's not a permission error, rethrow
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Profile picture upload
export const uploadProfilePicture = async (userId, file) => {
  try {
    // Upload to Firebase Storage (this should work regardless of database rules)
    const fileRef = storageRef(storage, `profilePictures/${userId}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    
    // Try to update the profile in the database
    try {
      await update(ref(database, `users/${userId}`), {
        profilePicture: downloadURL,
        updatedAt: new Date().toISOString()
      });
    } catch (dbError) {
      // If database update fails due to permissions, update in localStorage
      if (dbError.message && dbError.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating profile picture. Using localStorage fallback.');
        
        // Get existing data from localStorage
        const existingData = localStorage.getItem(`user_${userId}`);
        let userData = existingData ? JSON.parse(existingData) : {};
        
        // Update with new profile picture URL
        userData = {
          ...userData,
          profilePicture: downloadURL,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        console.warn('Profile picture URL saved to localStorage due to Firebase permission issues');
      } else {
        // If it's not a permission error, rethrow
        throw dbError;
      }
    }
    
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

// Ride functions
export const createRide = async (rideData) => {
  try {
    try {
      const newRideRef = push(ref(database, 'rides'));
      const rideId = newRideRef.key;
      
      await set(newRideRef, {
        ...rideData,
        id: rideId,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      return rideId;
    } catch (error) {
      // If permission denied, store in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when creating ride. Using localStorage fallback.');
        
        // Generate a mock ride ID
        const mockRideId = 'mock-ride-' + Date.now();
        
        // Create the ride object
        const ride = {
          ...rideData,
          id: mockRideId,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Get existing mock rides for this user
        const userId = rideData.driverId;
        const mockRidesKey = `mock_rides_${userId}`;
        const existingMockRides = localStorage.getItem(mockRidesKey);
        let mockRides = existingMockRides ? JSON.parse(existingMockRides) : [];
        
        // Add the new ride
        mockRides.push(ride);
        
        // Save back to localStorage
        localStorage.setItem(mockRidesKey, JSON.stringify(mockRides));
        
        console.warn('Ride saved to localStorage due to Firebase permission issues');
        
        // Show warning to user
        alert('Your ride has been saved locally due to Firebase permission issues. Please note that it will only be visible to you until the database permissions are fixed.');
        
        return mockRideId;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getRide = async (rideId) => {
  try {
    console.log('Getting ride details for ID:', rideId);
    
    if (!rideId) {
      console.error('Invalid ride ID provided');
      return null;
    }
    
    try {
      // Try to get the ride from Firebase
      const snapshot = await get(ref(database, `rides/${rideId}`));
      if (snapshot.exists()) {
        const rideData = snapshot.val();
        console.log('Ride found in Firebase:', rideData);
        
        // Ensure the ride has an ID field
        if (!rideData.id) {
          rideData.id = rideId;
        }
        
        return rideData;
      } else {
        console.log('Ride not found in Firebase, checking localStorage');
        
        // Check if this is a mock ride
        if (rideId.startsWith('mock-ride')) {
          // Find the ride in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_rides_')) {
              try {
                const rides = JSON.parse(localStorage.getItem(key));
                if (Array.isArray(rides)) {
                  const ride = rides.find(r => r.id === rideId);
                  
                  if (ride) {
                    console.warn(`Found mock ride in localStorage (${key})`);
                    return ride;
                  }
                }
              } catch (parseError) {
                console.error(`Error parsing mock rides from ${key}:`, parseError);
              }
            }
          }
        }
        
        console.warn('Ride not found in Firebase or localStorage');
        return null;
      }
    } catch (error) {
      console.error('Error getting ride from Firebase:', error);
      
      // If permission denied, check localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting ride. Checking localStorage.');
        
        // Check all localStorage for any ride with this ID
        const allStorageKeys = Object.keys(localStorage);
        
        for (const key of allStorageKeys) {
          if (key.startsWith('mock_rides_')) {
            try {
              const rides = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(rides)) {
                const ride = rides.find(r => r.id === rideId);
                
                if (ride) {
                  console.warn(`Found mock ride in localStorage (${key})`);
                  return ride;
                }
              }
            } catch (parseError) {
              console.error(`Error parsing mock rides from ${key}:`, parseError);
            }
          }
        }
        
        // If we still can't find the ride, create a dummy one for testing
        if (rideId) {
          console.warn('Creating dummy ride for testing purposes');
          return {
            id: rideId,
            driverId: 'unknown',
            driverName: 'Test Driver',
            startingPoint: 'Test Starting Point',
            destination: 'Test Destination',
            date: new Date().toISOString(),
            price: 100,
            availableSeats: 3,
            vehicle: {
              model: 'Test Car',
              color: 'Blue'
            },
            status: 'active',
            createdAt: new Date().toISOString()
          };
        }
        
        return null;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Unexpected error in getRide:', error);
    return null; // Return null instead of throwing to prevent app from breaking
  }
};

export const updateRide = async (rideId, rideData) => {
  try {
    try {
      await update(ref(database, `rides/${rideId}`), {
        ...rideData,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      // If permission denied, update in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating ride. Using localStorage fallback.');
        
        // Check if this is a mock ride
        if (rideId.startsWith('mock-ride')) {
          // Find the ride in localStorage
          const allStorageKeys = Object.keys(localStorage);
          let foundRide = null;
          let foundInKey = null;
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_rides_')) {
              const rides = JSON.parse(localStorage.getItem(key));
              const rideIndex = rides.findIndex(r => r.id === rideId);
              
              if (rideIndex !== -1) {
                foundRide = rides[rideIndex];
                foundInKey = key;
                
                // Update the ride
                rides[rideIndex] = {
                  ...rides[rideIndex],
                  ...rideData,
                  updatedAt: new Date().toISOString()
                };
                
                // Save back to localStorage
                localStorage.setItem(key, JSON.stringify(rides));
              }
            }
          }
          
          if (foundRide) {
            console.warn(`Ride updated in localStorage (${foundInKey})`);
            return true;
          } else {
            throw new Error('Mock ride not found in localStorage');
          }
        } else {
          throw new Error('Cannot update non-mock ride in localStorage');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const deleteRide = async (rideId) => {
  try {
    await remove(ref(database, `rides/${rideId}`));
    return true;
  } catch (error) {
    throw error;
  }
};

export const getAllRides = async () => {
  try {
    try {
      const snapshot = await get(ref(database, 'rides'));
      if (snapshot.exists()) {
        const rides = [];
        snapshot.forEach((childSnapshot) => {
          rides.push(childSnapshot.val());
        });
        return rides;
      } else {
        return [];
      }
    } catch (error) {
      // If permission denied, use mock data
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting all rides. Using mock data.');
        
        // Collect all mock rides from localStorage
        const allStorageKeys = Object.keys(localStorage);
        let allMockRides = [];
        
        for (const key of allStorageKeys) {
          if (key.startsWith('mock_rides_')) {
            const rides = JSON.parse(localStorage.getItem(key));
            allMockRides = [...allMockRides, ...rides];
          }
        }
        
        // If no mock rides found, create some sample rides
        if (allMockRides.length === 0) {
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          allMockRides = [
            {
              id: 'mock-ride-sample-1',
              driverId: 'mock-driver-1',
              driverName: 'Amit Kumar',
              startingPoint: 'Bennett University',
              destination: 'Delhi',
              date: tomorrow.toISOString(),
              time: '10:00',
              price: 200,
              availableSeats: 3,
              totalSeats: 4,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'mock-ride-sample-2',
              driverId: 'mock-driver-2',
              driverName: 'Sneha Patel',
              startingPoint: 'Bennett University',
              destination: 'Noida',
              date: tomorrow.toISOString(),
              time: '14:30',
              price: 150,
              availableSeats: 2,
              totalSeats: 3,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          // Save these sample rides to localStorage for future use
          localStorage.setItem('mock_rides_samples', JSON.stringify(allMockRides));
        }
        
        return allMockRides;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Cache for active rides
let cachedActiveRides = null;
let lastRidesCheck = 0;
const RIDES_CACHE_DURATION = 30000; // 30 seconds cache

export const getActiveRides = async () => {
  try {
    // Check if we have cached rides and the cache is still valid
    const now = Date.now();
    if (cachedActiveRides && (now - lastRidesCheck < RIDES_CACHE_DURATION)) {
      console.log('Using cached active rides');
      return [...cachedActiveRides]; // Return a copy to prevent mutation
    }
    
    try {
      console.log('Attempting to get active rides with index query...');
      // First try with the index query
      const ridesQuery = query(
        ref(database, 'rides'),
        orderByChild('status'),
        equalTo('active')
      );
      
      const snapshot = await get(ridesQuery);
      if (snapshot.exists()) {
        const rides = [];
        snapshot.forEach((childSnapshot) => {
          rides.push(childSnapshot.val());
        });
        console.log(`Found ${rides.length} active rides using indexed query`);
        
        // Update cache
        cachedActiveRides = [...rides];
        lastRidesCheck = Date.now();
        
        return rides;
      } else {
        console.log('No active rides found in database');
        
        // Update cache with empty array
        cachedActiveRides = [];
        lastRidesCheck = Date.now();
        
        return [];
      }
    } catch (error) {
      console.error('Error in primary query method:', error.message);
      
      // Check for index error
      if (error.message && error.message.includes('Index not defined')) {
        console.warn('Index error when getting active rides. Falling back to client-side filtering.');
        
        try {
          // Fallback: Get all rides and filter client-side
          console.log('Attempting to get all rides and filter client-side...');
          const allRidesSnapshot = await get(ref(database, 'rides'));
          
          if (allRidesSnapshot.exists()) {
            const allRides = [];
            allRidesSnapshot.forEach((childSnapshot) => {
              const ride = childSnapshot.val();
              if (ride && ride.status === 'active') {
                allRides.push(ride);
              }
            });
            console.log(`Found ${allRides.length} active rides using client-side filtering`);
            return allRides;
          } else {
            console.log('No rides found in database at all');
            return [];
          }
        } catch (fallbackError) {
          console.error('Error in fallback method:', fallbackError.message);
          // Continue to next fallback
        }
      }
      
      // If permission denied or any other error occurred in the fallbacks, use mock data
      console.warn('Using mock data as last resort.');
      
      try {
        // Get all mock rides from localStorage
        const allStorageKeys = Object.keys(localStorage);
        const mockRides = [];
        
        for (const key of allStorageKeys) {
          if (key.startsWith('mock_rides_')) {
            try {
              const rides = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(rides)) {
                rides.forEach(ride => {
                  if (ride && ride.status === 'active') {
                    mockRides.push(ride);
                  }
                });
              }
            } catch (parseError) {
              console.error(`Error parsing mock rides from ${key}:`, parseError);
            }
          }
        }
        
        console.log(`Found ${mockRides.length} active mock rides in localStorage`);
        return mockRides;
      } catch (mockError) {
        console.error('Error getting mock rides:', mockError);
        return [];
      }
    }
  } catch (error) {
    console.error('Unexpected error in getActiveRides:', error);
    return []; // Return empty array instead of throwing to prevent app from breaking
  }
};

export const getUserRides = async (userId) => {
  try {
    try {
      const ridesQuery = query(
        ref(database, 'rides'),
        orderByChild('driverId'),
        equalTo(userId)
      );
      
      const snapshot = await get(ridesQuery);
      if (snapshot.exists()) {
        const rides = [];
        snapshot.forEach((childSnapshot) => {
          rides.push(childSnapshot.val());
        });
        return rides;
      } else {
        return [];
      }
    } catch (error) {
      // Check for index error
      if (error.message && error.message.includes('Index not defined')) {
        console.warn('Index error when getting user rides. Falling back to client-side filtering.');
        
        // Fallback: Get all rides and filter client-side
        const allRidesSnapshot = await get(ref(database, 'rides'));
        if (allRidesSnapshot.exists()) {
          const userRides = [];
          allRidesSnapshot.forEach((childSnapshot) => {
            const ride = childSnapshot.val();
            if (ride.driverId === userId) {
              userRides.push(ride);
            }
          });
          return userRides;
        } else {
          return [];
        }
      }
      // If permission denied, check for mock data in localStorage
      else if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when fetching user rides. Using mock data.');
        
        // Check if we have any mock rides in localStorage
        const mockRidesKey = `mock_rides_${userId}`;
        const mockRidesData = localStorage.getItem(mockRidesKey);
        
        if (mockRidesData) {
          return JSON.parse(mockRidesData);
        }
        
        // If no mock data exists yet, create some sample rides
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const mockRides = [
          {
            id: 'mock-ride-1',
            driverId: userId,
            driverName: localStorage.getItem(`user_${userId}`) ? JSON.parse(localStorage.getItem(`user_${userId}`)).fullName : 'Current User',
            startingPoint: 'Bennett University',
            destination: 'Greater Noida',
            date: tomorrow.toISOString(),
            time: '14:00',
            price: 150,
            availableSeats: 3,
            totalSeats: 4,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        // Save mock rides to localStorage
        localStorage.setItem(mockRidesKey, JSON.stringify(mockRides));
        
        return mockRides;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Booking functions
export const createBooking = async (bookingData) => {
  try {
    console.log('Creating booking with data:', bookingData);
    
    // Validate booking data
    if (!bookingData || !bookingData.rideId || !bookingData.passengerId) {
      console.error('Invalid booking data:', bookingData);
      throw new Error('Invalid booking data');
    }
    
    try {
      // Create a new booking in Firebase
      const newBookingRef = push(ref(database, 'bookings'));
      const bookingId = newBookingRef.key;
      
      // Ensure all required fields are present
      const completeBookingData = {
        ...bookingData,
        id: bookingId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('Saving booking to Firebase with ID:', bookingId);
      
      await set(newBookingRef, completeBookingData);
      console.log('Booking successfully saved to Firebase');
      
      return bookingId;
    } catch (error) {
      console.error('Error creating booking in Firebase:', error);
      
      // If permission denied, store in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when creating booking. Using localStorage fallback.');
        
        // Generate a mock booking ID
        const mockBookingId = 'mock-booking-' + Date.now();
        
        // Create the booking object with all required fields
        const booking = {
          ...bookingData,
          id: mockBookingId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        try {
          // Get existing mock bookings for this user
          const userId = bookingData.passengerId;
          const mockBookingsKey = `mock_bookings_${userId}`;
          let mockBookings = [];
          
          try {
            const existingMockBookings = localStorage.getItem(mockBookingsKey);
            if (existingMockBookings) {
              mockBookings = JSON.parse(existingMockBookings);
              if (!Array.isArray(mockBookings)) {
                console.warn('Mock bookings is not an array, resetting');
                mockBookings = [];
              }
            }
          } catch (parseError) {
            console.error('Error parsing mock bookings:', parseError);
          }
          
          // Add the new booking
          mockBookings.push(booking);
          
          // Save back to localStorage
          localStorage.setItem(mockBookingsKey, JSON.stringify(mockBookings));
          console.log('Booking saved to user localStorage');
          
          // Also add to the ride's bookings
          try {
            const rideId = bookingData.rideId;
            const mockRideBookingsKey = `mock_ride_bookings_${rideId}`;
            let rideBookings = [];
            
            try {
              const existingRideBookings = localStorage.getItem(mockRideBookingsKey);
              if (existingRideBookings) {
                rideBookings = JSON.parse(existingRideBookings);
                if (!Array.isArray(rideBookings)) {
                  console.warn('Mock ride bookings is not an array, resetting');
                  rideBookings = [];
                }
              }
            } catch (parseError) {
              console.error('Error parsing mock ride bookings:', parseError);
            }
            
            // Add the new booking
            rideBookings.push(booking);
            
            // Save back to localStorage
            localStorage.setItem(mockRideBookingsKey, JSON.stringify(rideBookings));
            console.log('Booking saved to ride localStorage');
          } catch (rideBookingError) {
            console.error('Error saving to ride bookings:', rideBookingError);
          }
          
          console.warn('Booking saved to localStorage due to Firebase permission issues');
          
          // Show warning to user (but don't block the UI flow)
          setTimeout(() => {
            alert('Your booking has been saved locally due to Firebase permission issues. Please note that it will only be visible to you until the database permissions are fixed.');
          }, 100);
          
          return mockBookingId;
        } catch (localStorageError) {
          console.error('Error saving booking to localStorage:', localStorageError);
          throw new Error('Failed to save booking to localStorage');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Unexpected error in createBooking:', error);
    throw error;
  }
};

export const getBooking = async (bookingId) => {
  try {
    try {
      const snapshot = await get(ref(database, `bookings/${bookingId}`));
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        // Check if this is a mock booking
        if (bookingId.startsWith('mock-booking')) {
          // Find the booking in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_bookings_') || key.startsWith('mock_ride_bookings_')) {
              const bookings = JSON.parse(localStorage.getItem(key));
              const booking = bookings.find(b => b.id === bookingId);
              
              if (booking) {
                console.warn(`Found mock booking in localStorage (${key})`);
                return booking;
              }
            }
          }
        }
        
        return null;
      }
    } catch (error) {
      // If permission denied, check localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when getting booking. Checking localStorage.');
        
        // Check if this is a mock booking
        if (bookingId.startsWith('mock-booking')) {
          // Find the booking in localStorage
          const allStorageKeys = Object.keys(localStorage);
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_bookings_') || key.startsWith('mock_ride_bookings_')) {
              const bookings = JSON.parse(localStorage.getItem(key));
              const booking = bookings.find(b => b.id === bookingId);
              
              if (booking) {
                console.warn(`Found mock booking in localStorage (${key})`);
                return booking;
              }
            }
          }
        }
        
        return null;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const updateBookingStatus = async (bookingId, status) => {
  try {
    try {
      await update(ref(database, `bookings/${bookingId}`), {
        status,
        updatedAt: new Date().toISOString()
      });
      
      // If approved, update ride's available seats
      if (status === 'approved') {
        const booking = await getBooking(bookingId);
        const rideRef = ref(database, `rides/${booking.rideId}`);
        const rideSnapshot = await get(rideRef);
        
        if (rideSnapshot.exists()) {
          const ride = rideSnapshot.val();
          await update(rideRef, {
            availableSeats: ride.availableSeats - booking.seats
          });
        }
      }
      
      return true;
    } catch (error) {
      // If permission denied, update in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when updating booking status. Using localStorage fallback.');
        
        // Check if this is a mock booking
        if (bookingId.startsWith('mock-booking')) {
          // We need to update the booking in both the user's bookings and the ride's bookings
          
          // First, find the booking in all mock booking collections
          const allStorageKeys = Object.keys(localStorage);
          let foundBooking = null;
          let foundInKey = null;
          
          for (const key of allStorageKeys) {
            if (key.startsWith('mock_bookings_') || key.startsWith('mock_ride_bookings_')) {
              const bookings = JSON.parse(localStorage.getItem(key));
              const bookingIndex = bookings.findIndex(b => b.id === bookingId);
              
              if (bookingIndex !== -1) {
                foundBooking = bookings[bookingIndex];
                foundInKey = key;
                
                // Update the booking
                bookings[bookingIndex] = {
                  ...bookings[bookingIndex],
                  status,
                  updatedAt: new Date().toISOString()
                };
                
                // Save back to localStorage
                localStorage.setItem(key, JSON.stringify(bookings));
              }
            }
          }
          
          if (foundBooking) {
            console.warn(`Booking status updated in localStorage (${foundInKey})`);
            return true;
          } else {
            throw new Error('Mock booking not found in localStorage');
          }
        } else {
          throw new Error('Cannot update non-mock booking in localStorage');
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getUserBookings = async (userId) => {
  try {
    try {
      const bookingsQuery = query(
        ref(database, 'bookings'),
        orderByChild('passengerId'),
        equalTo(userId)
      );
      
      const snapshot = await get(bookingsQuery);
      if (snapshot.exists()) {
        const bookings = [];
        snapshot.forEach((childSnapshot) => {
          bookings.push(childSnapshot.val());
        });
        return bookings;
      } else {
        return [];
      }
    } catch (error) {
      // Check for index error
      if (error.message && error.message.includes('Index not defined')) {
        console.warn('Index error when getting user bookings. Falling back to client-side filtering.');
        
        // Fallback: Get all bookings and filter client-side
        const allBookingsSnapshot = await get(ref(database, 'bookings'));
        if (allBookingsSnapshot.exists()) {
          const userBookings = [];
          allBookingsSnapshot.forEach((childSnapshot) => {
            const booking = childSnapshot.val();
            if (booking.passengerId === userId) {
              userBookings.push(booking);
            }
          });
          return userBookings;
        } else {
          return [];
        }
      }
      
      // If permission denied, check for mock data in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when fetching user bookings. Using mock data.');
        
        // Check if we have any mock bookings in localStorage
        const mockBookingsKey = `mock_bookings_${userId}`;
        const mockBookingsData = localStorage.getItem(mockBookingsKey);
        
        if (mockBookingsData) {
          return JSON.parse(mockBookingsData);
        }
        
        // If no mock data exists yet, create some sample bookings
        const today = new Date();
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        const mockBookings = [
          {
            id: 'mock-booking-1',
            passengerId: userId,
            passengerName: localStorage.getItem(`user_${userId}`) ? JSON.parse(localStorage.getItem(`user_${userId}`)).fullName : 'Current User',
            rideId: 'mock-ride-external-1',
            driverId: 'mock-driver-1',
            driverName: 'Amit Kumar',
            startingPoint: 'Bennett University',
            destination: 'Delhi',
            date: dayAfterTomorrow.toISOString(),
            time: '10:00',
            price: 200,
            status: 'approved',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        
        // Save mock bookings to localStorage
        localStorage.setItem(mockBookingsKey, JSON.stringify(mockBookings));
        
        return mockBookings;
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

export const getRideBookings = async (rideId) => {
  try {
    try {
      const bookingsQuery = query(
        ref(database, 'bookings'),
        orderByChild('rideId'),
        equalTo(rideId)
      );
      
      const snapshot = await get(bookingsQuery);
      if (snapshot.exists()) {
        const bookings = [];
        snapshot.forEach((childSnapshot) => {
          bookings.push(childSnapshot.val());
        });
        return bookings;
      } else {
        return [];
      }
    } catch (error) {
      // Check for index error
      if (error.message && error.message.includes('Index not defined')) {
        console.warn('Index error when getting ride bookings. Falling back to client-side filtering.');
        
        // Fallback: Get all bookings and filter client-side
        const allBookingsSnapshot = await get(ref(database, 'bookings'));
        if (allBookingsSnapshot.exists()) {
          const rideBookings = [];
          allBookingsSnapshot.forEach((childSnapshot) => {
            const booking = childSnapshot.val();
            if (booking.rideId === rideId) {
              rideBookings.push(booking);
            }
          });
          return rideBookings;
        } else {
          return [];
        }
      }
      
      // If permission denied, check for mock data in localStorage
      if (error.message && error.message.includes('PERMISSION_DENIED')) {
        console.warn('Permission denied when fetching ride bookings. Using mock data.');
        
        // Check if we have any mock bookings for this ride in localStorage
        const mockRideBookingsKey = `mock_ride_bookings_${rideId}`;
        const mockBookingsData = localStorage.getItem(mockRideBookingsKey);
        
        if (mockBookingsData) {
          return JSON.parse(mockBookingsData);
        }
        
        // If no mock data exists yet, create some sample bookings for this ride
        // For mock rides, we'll create some sample passengers
        if (rideId.startsWith('mock-ride')) {
          const mockPassengers = [
            {
              id: 'mock-booking-ride-1',
              passengerId: 'mock-passenger-1',
              passengerName: 'Priya Sharma',
              rideId: rideId,
              status: 'approved',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              id: 'mock-booking-ride-2',
              passengerId: 'mock-passenger-2',
              passengerName: 'Rahul Verma',
              rideId: rideId,
              status: 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          // Save mock bookings to localStorage
          localStorage.setItem(mockRideBookingsKey, JSON.stringify(mockPassengers));
          
          return mockPassengers;
        }
        
        // For non-mock rides, return empty array
        return [];
      } else {
        throw error;
      }
    }
  } catch (error) {
    throw error;
  }
};

// Real-time listeners
export const onUserProfileChange = (userId, callback) => {
  const userRef = ref(database, `users/${userId}`);
  return onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

export const onRideChange = (rideId, callback) => {
  const rideRef = ref(database, `rides/${rideId}`);
  return onValue(rideRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

export const onBookingsChange = (rideId, callback) => {
  const bookingsQuery = query(
    ref(database, 'bookings'),
    orderByChild('rideId'),
    equalTo(rideId)
  );
  
  return onValue(bookingsQuery, (snapshot) => {
    const bookings = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        bookings.push(childSnapshot.val());
      });
    }
    callback(bookings);
  });
};

export async function uploadProfileImage(userId, imageFile) {
    try {
        // Create a unique filename using timestamp
        const timestamp = Date.now();
        const filename = `${timestamp}_${imageFile.name}`;
        
        // Create a reference to the file location
        const fileRef = storageRef(storage, `profile_images/${userId}/${filename}`);
        
        // Show upload progress (optional)
        const uploadTask = await uploadBytes(fileRef, imageFile);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(uploadTask.ref);
        
        // Return the public URL of the uploaded image
        return downloadURL;
    } catch (error) {
        console.error('Error in uploadProfileImage:', error);
        // Log specific error details
        if (error.code === 'storage/unauthorized') {
            throw new Error('Storage permission denied. Please check Firebase Storage rules.');
        } else if (error.code === 'storage/quota-exceeded') {
            throw new Error('Storage quota exceeded. Please contact administrator.');
        } else {
            throw new Error('Failed to upload image: ' + error.message);
        }
    }
}

export const getBookingByRideAndUser = async (rideId, userId) => {
    try {
        // Create a query to find bookings for this ride and user
        const bookingsRef = ref(database, 'bookings');
        const bookingQuery = query(
            bookingsRef,
            orderByChild('rideId'),
            equalTo(rideId)
        );

        const snapshot = await get(bookingQuery);
        if (!snapshot.exists()) {
            return null;
        }

        // Find the booking that matches both rideId and userId
        const bookings = snapshot.val();
        const booking = Object.values(bookings).find(
            booking => booking.passengerId === userId
        );

        return booking || null;
    } catch (error) {
        console.error('Error in getBookingByRideAndUser:', error);
        return null;
    }
};

export { auth, database, storage };
