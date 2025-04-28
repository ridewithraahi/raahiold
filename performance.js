/**
 * Raahi Performance Optimization Module
 * This module provides performance enhancements for the Raahi application
 */

// Cache for storing frequently accessed data
const performanceCache = {
    // User data cache
    currentUser: null,
    userProfile: null,
    userLastChecked: 0,
    
    // Rides data cache
    activeRides: null,
    ridesLastChecked: 0,
    
    // Driver profiles cache
    driverProfiles: {},
    
    // Cache durations (in milliseconds)
    USER_CACHE_DURATION: 60000, // 1 minute
    RIDES_CACHE_DURATION: 30000, // 30 seconds
    DRIVER_CACHE_DURATION: 300000, // 5 minutes
    
    // Clear all caches
    clearAll() {
        this.currentUser = null;
        this.userProfile = null;
        this.userLastChecked = 0;
        this.activeRides = null;
        this.ridesLastChecked = 0;
        this.driverProfiles = {};
        console.log('All performance caches cleared');
    }
};

/**
 * Optimized page initialization
 * @param {Function} initCallback - Callback function to run after initialization
 */
function initializePage(initCallback) {
    // Start loading animation immediately
    document.addEventListener('DOMContentLoaded', function() {
        // Show loading indicators
        const skeletons = document.querySelectorAll('.skeleton-item');
        skeletons.forEach(skeleton => skeleton.style.display = 'block');
        
        // Initialize the app with a slight delay to allow UI to render
        setTimeout(() => {
            if (typeof initCallback === 'function') {
                initCallback();
            }
        }, 100);
    });
}

/**
 * Progressive loading of UI elements
 * @param {Array} elements - Array of DOM elements to load progressively
 * @param {number} delay - Base delay in milliseconds
 * @param {number} increment - Delay increment for each element
 */
function loadProgressively(elements, delay = 50, increment = 50) {
    if (!elements || !elements.length) return;
    
    elements.forEach((element, index) => {
        setTimeout(() => {
            element.classList.add('visible');
        }, delay + (index * increment));
    });
}

/**
 * Optimize image loading
 * @param {string} selector - CSS selector for images to optimize
 */
function optimizeImages(selector = 'img') {
    const images = document.querySelectorAll(selector);
    
    if ('loading' in HTMLImageElement.prototype) {
        // Browser supports native lazy loading
        images.forEach(img => {
            img.loading = 'lazy';
        });
    } else {
        // Fallback for browsers that don't support native lazy loading
        const lazyLoadImages = () => {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => {
                const src = img.src;
                img.setAttribute('data-src', src);
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
                imageObserver.observe(img);
            });
        };
        
        // Initialize lazy loading
        if ('IntersectionObserver' in window) {
            lazyLoadImages();
        }
    }
}

/**
 * Apply performance optimizations to the page
 */
function applyPerformanceOptimizations() {
    // Add will-change hints for elements that will animate
    document.querySelectorAll('.ride-card, .skeleton, .loading-spinner').forEach(el => {
        el.style.willChange = 'transform, opacity';
    });
    
    // Optimize image loading
    optimizeImages();
    
    // Add event listener for page visibility changes to pause animations when tab is not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            document.body.classList.add('page-hidden');
        } else {
            document.body.classList.remove('page-hidden');
        }
    });
    
    // Add CSS for performance optimizations
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .page-hidden .loading-spinner,
        .page-hidden .skeleton {
            animation-play-state: paused !important;
        }
        
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
            }
        }
        
        .ride-card {
            opacity: 0;
            transform: translateY(10px);
            animation: fadeIn 0.5s ease forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .ride-card:nth-child(1) { animation-delay: 0.05s; }
        .ride-card:nth-child(2) { animation-delay: 0.1s; }
        .ride-card:nth-child(3) { animation-delay: 0.15s; }
        .ride-card:nth-child(4) { animation-delay: 0.2s; }
        .ride-card:nth-child(5) { animation-delay: 0.25s; }
    `;
    document.head.appendChild(styleEl);
}

// Export functions for use in other files
export {
    performanceCache,
    initializePage,
    loadProgressively,
    optimizeImages,
    applyPerformanceOptimizations
};