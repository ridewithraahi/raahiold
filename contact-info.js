// Function to update contact information UI
async function updateContactUI(driverProfile, passengerProfile) {
    const isDriver = currentUser.uid === currentRide.driverId;
    const otherParty = isDriver ? passengerProfile : driverProfile;

    // Hide both contact cards initially
    document.getElementById('driverContact').classList.add('hidden');
    document.getElementById('passengerContact').classList.add('hidden');

    // Show only the relevant contact card based on user role
    if (isDriver) {
        // If user is driver, show passenger contact card
        const passengerCard = document.getElementById('passengerContact');
        passengerCard.classList.remove('hidden');
        
        // Update passenger information
        document.getElementById('passengerImage').src = passengerProfile.profilePicture || 'assets/default-avatar.png';
        document.getElementById('passengerName').textContent = passengerProfile.fullName;
        document.getElementById('passengerPhone').textContent = passengerProfile.phone;
    } else {
        // If user is passenger, show driver contact card
        const driverCard = document.getElementById('driverContact');
        driverCard.classList.remove('hidden');
        
        // Update driver information
        document.getElementById('driverImage').src = driverProfile.profilePicture || 'assets/default-avatar.png';
        document.getElementById('driverName').textContent = driverProfile.fullName;
        document.getElementById('driverPhone').textContent = driverProfile.phone;
    }

    // Update ride details
    document.getElementById('route').textContent = `${currentRide.startLocation} → ${currentRide.destination}`;
    document.getElementById('date').textContent = new Date(currentRide.date).toLocaleDateString();
    document.getElementById('time').textContent = currentRide.time;
    document.getElementById('seats').textContent = currentBooking.seats;
    document.getElementById('price').textContent = `₹${currentBooking.totalPrice}`;

    // Set up contact and WhatsApp buttons
    const contactBtn = document.getElementById('contactBtn');
    const whatsappContainer = document.getElementById('whatsappContainer');
    const whatsappBtn = document.getElementById('whatsappBtn');

    // Handle contact button click
    contactBtn.addEventListener('click', () => {
        // Show other party's contact information
        const otherPartyName = isDriver ? passengerProfile.fullName : driverProfile.fullName;
        const otherPartyPhone = isDriver ? passengerProfile.phone : driverProfile.phone;
        alert(`Contact ${otherPartyName} at: ${otherPartyPhone}`);
    });

    // Handle WhatsApp button click
    whatsappBtn.addEventListener('click', async () => {
        try {
            const messageLink = generateRideMessageLink({
                phone: otherParty.phone,
                isDriver,
                startLocation: currentRide.startLocation,
                destination: currentRide.destination,
                date: currentRide.date,
                time: currentRide.time,
                template: isDriver ? 'RIDE_CONFIRMATION.DRIVER' : 'RIDE_CONFIRMATION.PASSENGER'
            });
            await openWhatsApp(messageLink);
        } catch (error) {
            console.error('Error opening WhatsApp:', error);
            alert('Failed to open WhatsApp. Please try again.');
        }
    });

    // Add quick action buttons
    const quickActions = document.createElement('div');
    quickActions.className = 'mt-4 grid grid-cols-2 gap-2';
    
    // Define quick actions based on user role
    const quickActionButtons = isDriver ? [
        { text: 'I have arrived', icon: 'fa-location-dot', updateType: 'ARRIVED' },
        { text: 'I am running late', icon: 'fa-clock', updateType: 'DELAY', needsInput: true },
        { text: 'I am on my way', icon: 'fa-car', updateType: 'ON_WAY' },
        { text: 'Emergency/Breakdown', icon: 'fa-triangle-exclamation', isEmergency: true }
    ] : [
        { text: 'I am coming', icon: 'fa-walking', updateType: 'ON_WAY' },
        { text: 'I will be late', icon: 'fa-clock', updateType: 'DELAY', needsInput: true },
        { text: 'I am at pickup point', icon: 'fa-location-dot', updateType: 'ARRIVED' },
        { text: 'Emergency', icon: 'fa-triangle-exclamation', isEmergency: true }
    ];

    // Create quick action buttons
    quickActionButtons.forEach(action => {
        const button = document.createElement('button');
        button.className = 'quick-action-btn flex items-center justify-center bg-gray-100 hover:bg-gray-200 p-2 rounded-lg text-sm';
        button.innerHTML = `<i class="fas ${action.icon} mr-2"></i>${action.text}`;
        
        button.addEventListener('click', async () => {
            try {
                let messageLink;

                if (action.isEmergency) {
                    // Handle emergency messages
                    messageLink = generateEmergencyMessageLink({
                        phone: otherParty.phone,
                        name: currentUser.displayName || 'User',
                        location: currentRide.startLocation,
                        emergencyType: isDriver ? 'BREAKDOWN' : 'SOS'
                    });
                } else if (action.needsInput) {
                    // Handle delay messages with user input
                    const minutes = prompt('How many minutes will you be delayed?');
                    if (!minutes) return;
                    
                    messageLink = sendRideStatusUpdate({
                        phone: otherParty.phone,
                        updateType: action.updateType,
                        extras: { minutes }
                    });
                } else {
                    // Handle regular status updates
                    messageLink = sendRideStatusUpdate({
                        phone: otherParty.phone,
                        updateType: action.updateType
                    });
                }

                await openWhatsApp(messageLink);
            } catch (error) {
                console.error('Error sending WhatsApp message:', error);
                alert('Failed to send message. Please try again.');
            }
        });

        quickActions.appendChild(button);
    });

    // Add quick actions to the appropriate contact card
    const targetCard = isDriver ? 
        document.getElementById('passengerContact') : 
        document.getElementById('driverContact');
    targetCard.appendChild(quickActions);
} 