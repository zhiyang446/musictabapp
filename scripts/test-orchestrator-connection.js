#!/usr/bin/env node

/**
 * Test Orchestrator Connection
 * Simple test to verify the Orchestrator service is accessible
 */

async function testConnection() {
    console.log('🔗 Testing Orchestrator Connection');
    console.log('==================================');
    
    const ORCHESTRATOR_URL = 'http://localhost:8000';
    
    try {
        console.log(`Attempting to connect to: ${ORCHESTRATOR_URL}`);
        
        const response = await fetch(`${ORCHESTRATOR_URL}/`, {
            method: 'GET'
        });
        
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const text = await response.text();
            console.log(`Response body: ${text}`);
            console.log('✅ Orchestrator is accessible!');
        } else {
            console.log('⚠️  Orchestrator responded with error status');
        }
        
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure Orchestrator service is running');
        console.log('2. Check if port 8000 is available');
        console.log('3. Verify no firewall blocking the connection');
    }
}

if (require.main === module) {
    testConnection();
}

module.exports = { testConnection };
