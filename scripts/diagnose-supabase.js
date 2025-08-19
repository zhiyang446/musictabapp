#!/usr/bin/env node

/**
 * Supabase Diagnosis Script
 * 
 * Diagnoses why T35 registration/login might not be creating records in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnoseSupabase() {
    console.log('🔍 Supabase Diagnosis - T35 Registration Issue');
    console.log('==============================================');
    
    try {
        // Step 1: Check environment variables
        console.log('Step 1: Checking environment variables...');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
        console.log(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}`);
        console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅' : '❌'}`);
        
        if (!supabaseUrl || !supabaseAnonKey) {
            console.log('❌ Missing required environment variables');
            return;
        }
        
        // Step 2: Test basic connection
        console.log('\nStep 2: Testing basic connection...');
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Test connection with a simple query
        const { data: healthData, error: healthError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
        
        if (healthError) {
            console.log('⚠️  Connection test (expected for anonymous):', healthError.message);
        } else {
            console.log('✅ Basic connection successful');
        }
        
        // Step 3: Test authentication configuration
        console.log('\nStep 3: Testing authentication configuration...');
        
        try {
            // Try to get current session (should be null for anonymous)
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.log('❌ Session error:', sessionError.message);
            } else {
                console.log('✅ Auth session check successful');
                console.log('   Current session:', sessionData.session ? 'Authenticated' : 'Anonymous');
            }
        } catch (authError) {
            console.log('❌ Auth configuration error:', authError.message);
        }
        
        // Step 4: Test user registration (with service role)
        console.log('\nStep 4: Testing user registration capability...');
        
        if (supabaseServiceKey) {
            const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
            
            try {
                // Try to list users (admin operation)
                const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers();
                
                if (usersError) {
                    console.log('❌ Admin users list error:', usersError.message);
                } else {
                    console.log('✅ Admin access working');
                    console.log(`   Total users in database: ${usersData.users.length}`);
                    
                    if (usersData.users.length > 0) {
                        console.log('   Recent users:');
                        usersData.users.slice(-3).forEach((user, index) => {
                            console.log(`     ${index + 1}. ${user.email} (${user.created_at})`);
                        });
                    }
                }
            } catch (adminError) {
                console.log('❌ Admin operation failed:', adminError.message);
            }
        } else {
            console.log('⚠️  No service role key - cannot check user database');
        }
        
        // Step 5: Check auth settings
        console.log('\nStep 5: Checking auth settings...');
        
        console.log('   Common issues to check in Supabase dashboard:');
        console.log('   1. Email confirmation required?');
        console.log('   2. Email templates configured?');
        console.log('   3. SMTP settings configured?');
        console.log('   4. Auth providers enabled?');
        console.log('   5. RLS policies blocking user creation?');
        
        // Step 6: Test registration flow
        console.log('\nStep 6: Testing registration flow...');
        
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'TestPassword123!';
        
        console.log(`   Attempting to register: ${testEmail}`);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
        });
        
        if (signUpError) {
            console.log('❌ Registration failed:', signUpError.message);
            
            // Common error analysis
            if (signUpError.message.includes('email')) {
                console.log('   💡 Possible cause: Email confirmation required');
            }
            if (signUpError.message.includes('password')) {
                console.log('   💡 Possible cause: Password policy not met');
            }
            if (signUpError.message.includes('rate')) {
                console.log('   💡 Possible cause: Rate limiting');
            }
        } else {
            console.log('✅ Registration successful!');
            console.log('   User ID:', signUpData.user?.id);
            console.log('   Email:', signUpData.user?.email);
            console.log('   Confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
            console.log('   Session:', signUpData.session ? 'Created' : 'Pending confirmation');
            
            if (!signUpData.session) {
                console.log('   💡 User created but needs email confirmation');
            }
        }
        
        // Step 7: Recommendations
        console.log('\nStep 7: Recommendations...');
        
        console.log('   To fix registration issues:');
        console.log('   1. Check Supabase Dashboard > Authentication > Settings');
        console.log('   2. Verify "Enable email confirmations" setting');
        console.log('   3. Configure SMTP settings if email confirmation is required');
        console.log('   4. Check "Enable sign ups" is turned on');
        console.log('   5. Review any custom auth hooks or triggers');
        console.log('   6. Check browser console for detailed error messages');
        
        console.log('\n   Supabase Dashboard URL:');
        console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/auth/users`);
        
    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    }
}

if (require.main === module) {
    diagnoseSupabase();
}

module.exports = { diagnoseSupabase };
