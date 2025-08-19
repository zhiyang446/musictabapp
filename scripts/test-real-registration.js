#!/usr/bin/env node

/**
 * Real Registration Test Script
 * 
 * Tests T35 registration with a real email address
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testRealRegistration() {
    console.log('🔍 T35 Real Registration Test');
    console.log('=============================');
    
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
            console.log('❌ Missing Supabase environment variables');
            return;
        }
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Test with a real email format (but still a test email)
        const testEmail = `test.user.${Date.now()}@gmail.com`;
        const testPassword = 'TestPassword123!';
        
        console.log(`📧 Testing registration with: ${testEmail}`);
        console.log(`🔐 Password: ${testPassword}`);
        
        // Step 1: Test sign up
        console.log('\nStep 1: Attempting registration...');
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });
        
        if (signUpError) {
            console.log('❌ Registration failed:', signUpError.message);
            
            // Analyze common errors
            if (signUpError.message.includes('email')) {
                console.log('   💡 Email-related issue');
            }
            if (signUpError.message.includes('password')) {
                console.log('   💡 Password policy issue');
            }
            if (signUpError.message.includes('confirmation')) {
                console.log('   💡 Email confirmation required');
            }
            
            return;
        }
        
        console.log('✅ Registration successful!');
        console.log('📋 Registration details:');
        console.log(`   User ID: ${signUpData.user?.id}`);
        console.log(`   Email: ${signUpData.user?.email}`);
        console.log(`   Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Session created: ${signUpData.session ? 'Yes' : 'No'}`);
        
        if (signUpData.session) {
            console.log(`   Access token: ${signUpData.session.access_token ? 'Present' : 'Missing'}`);
        }
        
        // Step 2: Check if email confirmation is required
        if (!signUpData.session) {
            console.log('\n⚠️  Email confirmation required');
            console.log('   The user was created but needs to confirm their email');
            console.log('   Check the email inbox for a confirmation link');
            console.log('   This is normal behavior if email confirmation is enabled');
        }
        
        // Step 3: Test sign in with the same credentials
        console.log('\nStep 2: Testing sign in with same credentials...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });
        
        if (signInError) {
            console.log('❌ Sign in failed:', signInError.message);
            
            if (signInError.message.includes('confirmation')) {
                console.log('   💡 Email needs to be confirmed first');
            }
            if (signInError.message.includes('credentials')) {
                console.log('   💡 Invalid credentials (user might not exist)');
            }
        } else {
            console.log('✅ Sign in successful!');
            console.log(`   User ID: ${signInData.user?.id}`);
            console.log(`   Access token: ${signInData.session?.access_token ? 'Present' : 'Missing'}`);
        }
        
        // Step 4: Check user in database
        console.log('\nStep 3: Checking user in database...');
        
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceKey) {
            const adminSupabase = createClient(supabaseUrl, serviceKey);
            
            const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers();
            
            if (usersError) {
                console.log('❌ Failed to check users:', usersError.message);
            } else {
                const testUser = usersData.users.find(user => user.email === testEmail);
                
                if (testUser) {
                    console.log('✅ User found in database!');
                    console.log(`   Created at: ${testUser.created_at}`);
                    console.log(`   Email confirmed: ${testUser.email_confirmed_at ? 'Yes' : 'No'}`);
                    console.log(`   Last sign in: ${testUser.last_sign_in_at || 'Never'}`);
                } else {
                    console.log('❌ User not found in database');
                }
            }
        }
        
        // Step 5: Summary
        console.log('\nStep 4: Summary...');
        
        if (signUpData.user) {
            console.log('✅ T35 Registration is working correctly!');
            console.log('   Users are being created in Supabase');
            
            if (!signUpData.session) {
                console.log('   📧 Email confirmation is required');
                console.log('   This is a security feature, not a bug');
            }
        }
        
        console.log('\n🔧 To see users in Supabase Dashboard:');
        console.log(`   https://supabase.com/dashboard/project/jvmcekqjavgesucxytwh/auth/users`);
        
        console.log('\n💡 If you\'re not seeing users in the dashboard:');
        console.log('   1. Make sure you\'re looking at the correct project');
        console.log('   2. Check if email confirmation is enabled');
        console.log('   3. Users might be in "unconfirmed" state');
        console.log('   4. Try using a real email address for testing');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

if (require.main === module) {
    testRealRegistration();
}

module.exports = { testRealRegistration };
