// User data management
export const UserService = {
    // Save user data to localStorage
    saveUserData(userData) {
        localStorage.setItem('raahi_user_data', JSON.stringify({
            name: userData.fullName || userData.name || 'User',
            phone: userData.phoneNumber || userData.phone,
            role: userData.hasVehicle ? 'driver' : 'rider',
            userId: userData.uid || userData.userId
        }));
    },

    // Get user data from localStorage
    getUserData() {
        try {
            return JSON.parse(localStorage.getItem('raahi_user_data'));
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    // Clear user data from localStorage
    clearUserData() {
        localStorage.removeItem('raahi_user_data');
    },

    // Check if user is logged in and data is valid
    isUserLoggedIn() {
        const userData = this.getUserData();
        return userData && userData.userId;
    },

    // Handle contact button state and click
    handleContact(ride, userRole) {
        const isApproved = ride.status === 'approved';
        const userData = this.getUserData();
        
        if (!userData) {
            return {
                enabled: false,
                onClick: null
            };
        }

        return {
            enabled: isApproved,
            onClick: isApproved ? () => {
                const phoneToShow = userRole === 'rider' ? ride.driverPhone : ride.passengerPhone;
                const name = userRole === 'rider' ? ride.driverName : ride.passengerName;
                alert(`Contact ${name} at: ${phoneToShow}`);
            } : null
        };
    }
}; 