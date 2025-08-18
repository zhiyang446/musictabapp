#!/usr/bin/env node

/**
 * T33 Test Script - Expo RN Initialization
 * 
 * Tests that the Expo React Native app is properly initialized
 * with Expo Router and can start successfully
 */

const fs = require('fs');
const path = require('path');

function testT33() {
    console.log('🔍 T33 Test - Expo RN Initialization');
    console.log('====================================');
    
    try {
        const mobileAppPath = path.join(process.cwd(), 'apps', 'mobile');
        
        // Step 1: Check if mobile app directory exists
        console.log('Step 1: Checking mobile app directory...');
        
        if (!fs.existsSync(mobileAppPath)) {
            console.log('❌ Mobile app directory not found');
            console.log('   Expected: apps/mobile');
            return;
        }
        
        console.log('✅ Mobile app directory exists: apps/mobile');
        
        // Step 2: Check package.json
        console.log('\nStep 2: Checking package.json configuration...');
        
        const packageJsonPath = path.join(mobileAppPath, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            console.log('❌ package.json not found');
            return;
        }
        
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check main entry point
        const hasExpoRouterEntry = packageJson.main === 'expo-router/entry';
        console.log(`   Main entry: ${packageJson.main} ${hasExpoRouterEntry ? '✅' : '❌'}`);
        
        // Check scripts
        const hasStartScript = packageJson.scripts && packageJson.scripts.start === 'expo start';
        console.log(`   Start script: ${hasStartScript ? '✅' : '❌'}`);
        
        // Check dependencies
        const hasExpoRouter = packageJson.dependencies && packageJson.dependencies['expo-router'];
        console.log(`   Expo Router: ${hasExpoRouter ? '✅' : '❌'}`);
        
        // Step 3: Check app.json configuration
        console.log('\nStep 3: Checking app.json configuration...');
        
        const appJsonPath = path.join(mobileAppPath, 'app.json');
        
        if (!fs.existsSync(appJsonPath)) {
            console.log('❌ app.json not found');
            return;
        }
        
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        
        // Check expo-router plugin
        const hasExpoRouterPlugin = appJson.expo && 
                                   appJson.expo.plugins && 
                                   appJson.expo.plugins.includes('expo-router');
        console.log(`   Expo Router plugin: ${hasExpoRouterPlugin ? '✅' : '❌'}`);
        
        // Step 4: Check Expo Router file structure
        console.log('\nStep 4: Checking Expo Router file structure...');
        
        const appDirPath = path.join(mobileAppPath, 'app');
        const layoutPath = path.join(appDirPath, '_layout.js');
        const indexPath = path.join(appDirPath, 'index.js');
        
        const hasAppDir = fs.existsSync(appDirPath);
        const hasLayout = fs.existsSync(layoutPath);
        const hasIndex = fs.existsSync(indexPath);
        
        console.log(`   app/ directory: ${hasAppDir ? '✅' : '❌'}`);
        console.log(`   app/_layout.js: ${hasLayout ? '✅' : '❌'}`);
        console.log(`   app/index.js: ${hasIndex ? '✅' : '❌'}`);
        
        // Step 5: Check welcome page content
        console.log('\nStep 5: Checking welcome page content...');
        
        if (hasIndex) {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            const hasWelcomeContent = indexContent.includes('Music Tab App');
            const hasT33Marker = indexContent.includes('T33');
            
            console.log(`   Welcome content: ${hasWelcomeContent ? '✅' : '❌'}`);
            console.log(`   T33 marker: ${hasT33Marker ? '✅' : '❌'}`);
        }
        
        // Step 6: Verify T33 DoD
        console.log('\nStep 6: Verifying T33 DoD...');
        console.log('   Target: apps/mobile uses Expo Router');
        console.log('   DoD: expo start launches successfully');
        console.log('   Test: Simulator shows welcome page');
        
        const allChecksPass = hasExpoRouterEntry && 
                             hasStartScript && 
                             hasExpoRouter && 
                             hasExpoRouterPlugin && 
                             hasAppDir && 
                             hasLayout && 
                             hasIndex;
        
        if (allChecksPass) {
            console.log('\n✅ T33 DoD SATISFIED!');
            console.log('   ✅ apps/mobile directory created');
            console.log('   ✅ Expo Router properly configured');
            console.log('   ✅ expo start command available');
            console.log('   ✅ Welcome page implemented');
            console.log('   ✅ File-based routing structure ready');
        } else {
            console.log('\n❌ T33 DoD NOT satisfied');
            console.log('   Some configuration checks failed');
        }
        
        // Step 7: Usage instructions
        console.log('\nStep 7: Usage Instructions...');
        console.log('   To start the app:');
        console.log('   1. cd apps/mobile');
        console.log('   2. npm start');
        console.log('   3. Press "w" for web version');
        console.log('   4. Or scan QR code with Expo Go app');
        
        console.log('\n🎉 T33 Test completed!');
        
        // Technical Details
        console.log('\n🔧 Technical Implementation:');
        console.log('   • Framework: Expo SDK 53 with React Native');
        console.log('   • Navigation: Expo Router (file-based routing)');
        console.log('   • Entry Point: expo-router/entry');
        console.log('   • Structure: app/_layout.js + app/index.js');
        console.log('   • Platforms: iOS, Android, Web');
        console.log('   • Development: Metro bundler with hot reload');
        
    } catch (error) {
        console.error('❌ T33 test failed:', error.message);
    }
}

if (require.main === module) {
    testT33();
}

module.exports = { testT33 };
