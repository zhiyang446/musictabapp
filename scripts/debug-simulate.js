/**
 * Debug script to test simulate progress functionality
 * Run this in the browser console
 */

// Test function to debug simulate progress
function debugSimulateProgress() {
    console.log('🧪 Starting debug test...');
    
    // Check if elements exist
    const jobSelect = document.getElementById('jobSelect');
    const simulateBtn = document.getElementById('simulateProgressBtn');
    
    console.log('Elements found:');
    console.log('- jobSelect:', jobSelect);
    console.log('- simulateBtn:', simulateBtn);
    
    if (!jobSelect) {
        console.error('❌ jobSelect element not found!');
        return;
    }
    
    if (!simulateBtn) {
        console.error('❌ simulateBtn element not found!');
        return;
    }
    
    // Check job options
    const options = Array.from(jobSelect.options).map(opt => ({
        value: opt.value,
        text: opt.textContent
    }));
    console.log('Job options:', options);
    
    // Check current selection
    console.log('Current job selection:', jobSelect.value);
    
    // Check if button has event listeners
    console.log('Button disabled:', simulateBtn.disabled);
    console.log('Button innerHTML:', simulateBtn.innerHTML);
    
    // Try to get the app instance
    if (window.app) {
        console.log('App instance found:', window.app);
        
        // Test if simulateProgress method exists
        if (typeof window.app.simulateProgress === 'function') {
            console.log('✅ simulateProgress method exists');
            
            // If there's a job selected, try to call it directly
            if (jobSelect.value) {
                console.log('🚀 Calling simulateProgress directly...');
                window.app.simulateProgress().catch(console.error);
            } else {
                console.log('⚠️ No job selected, selecting first available job...');
                if (options.length > 1) {
                    jobSelect.value = options[1].value;
                    console.log('Selected job:', jobSelect.value);
                    console.log('🚀 Calling simulateProgress directly...');
                    window.app.simulateProgress().catch(console.error);
                } else {
                    console.log('❌ No jobs available');
                }
            }
        } else {
            console.error('❌ simulateProgress method not found on app instance');
        }
    } else {
        console.error('❌ App instance not found on window');
    }
    
    // Try clicking the button programmatically
    console.log('🖱️ Trying to click button programmatically...');
    simulateBtn.click();
}

// Also test event listener binding
function testEventListeners() {
    console.log('🔍 Testing event listeners...');
    
    const simulateBtn = document.getElementById('simulateProgressBtn');
    if (simulateBtn) {
        // Remove existing listeners and add a test one
        const newBtn = simulateBtn.cloneNode(true);
        simulateBtn.parentNode.replaceChild(newBtn, simulateBtn);
        
        newBtn.addEventListener('click', function() {
            console.log('🎯 Test click event fired!');
            alert('Button clicked successfully!');
        });
        
        console.log('✅ Test event listener added. Try clicking the button now.');
    }
}

// Export functions to global scope for easy access
window.debugSimulateProgress = debugSimulateProgress;
window.testEventListeners = testEventListeners;

console.log('🛠️ Debug functions loaded. Run:');
console.log('- debugSimulateProgress() to test the simulate function');
console.log('- testEventListeners() to test if click events work');
