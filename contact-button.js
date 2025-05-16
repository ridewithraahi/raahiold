// Contact button functionality
export class ContactButton {
    constructor(container, ride, userRole) {
        this.container = container;
        this.ride = ride;
        this.userRole = userRole;
        this.button = null;
        this.isApproved = ride.status === 'approved';
    }

    render() {
        this.button = document.createElement('button');
        this.button.className = `contact-btn px-3 py-1 text-sm border border-gray-300 rounded-lg ${
            this.isApproved ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
        }`;
        this.button.disabled = !this.isApproved;
        this.button.innerHTML = '<i class="fas fa-phone-alt mr-1"></i>Contact';

        if (this.isApproved) {
            this.button.addEventListener('click', () => this.handleClick());
        }

        this.container.appendChild(this.button);
        return this.button;
    }

    handleClick() {
        const userData = this.getUserData();
        if (!userData) {
            alert('Please complete your profile first');
            return;
        }

        const contactInfo = this.getContactInfo();
        if (contactInfo) {
            alert(`Contact ${contactInfo.name} at: ${contactInfo.phone}`);
        } else {
            alert('Contact information not available');
        }
    }

    getUserData() {
        try {
            return JSON.parse(localStorage.getItem('raahi_user_data'));
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    getContactInfo() {
        if (this.userRole === 'rider') {
            return {
                name: this.ride.driverName,
                phone: this.ride.driverPhone
            };
        } else {
            return {
                name: this.ride.passengerName,
                phone: this.ride.passengerPhone
            };
        }
    }
} 
