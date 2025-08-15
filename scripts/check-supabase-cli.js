#!/usr/bin/env node

/**
 * Supabase CLI Status Checker
 * Checks if Supabase CLI is properly installed and configured
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runCommand(command, args = []) {
  return new Promise((resolve) => {
    const process = spawn(command, args, { 
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true 
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    process.on('error', (error) => {
      resolve({ code: 1, stdout: '', stderr: error.message });
    });
  });
}

async function checkSupabaseCLI() {
  console.log('🔍 Checking Supabase CLI status...\n');
  
  // Check if Supabase CLI is available
  console.log('📋 CLI Installation Check:');
  console.log('==========================');
  
  const versionResult = await runCommand('npx', ['supabase', '--version']);
  if (versionResult.code === 0) {
    const version = versionResult.stdout.trim();
    console.log(`✅ Supabase CLI: v${version}`);
  } else {
    console.log('❌ Supabase CLI not available');
    console.log('💡 Install with: npm install -g supabase');
    return false;
  }
  
  // Check if project is initialized
  console.log('\n📁 Project Initialization:');
  console.log('===========================');
  
  const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
  if (fs.existsSync(configPath)) {
    console.log('✅ Supabase project initialized');
    console.log(`   Config file: ${configPath}`);
  } else {
    console.log('❌ Supabase project not initialized');
    console.log('💡 Run: npm run supabase init');
    return false;
  }
  
  // Check Docker availability
  console.log('\n🐳 Docker Status:');
  console.log('==================');
  
  const dockerResult = await runCommand('docker', ['--version']);
  if (dockerResult.code === 0) {
    const dockerVersion = dockerResult.stdout.trim();
    console.log(`✅ Docker: ${dockerVersion}`);
    
    // Check if Docker is running
    const dockerPsResult = await runCommand('docker', ['ps']);
    if (dockerPsResult.code === 0) {
      console.log('✅ Docker daemon is running');
    } else {
      console.log('⚠️  Docker is installed but not running');
      console.log('💡 Start Docker Desktop');
    }
  } else {
    console.log('❌ Docker not available');
    console.log('💡 Install Docker Desktop: https://docs.docker.com/desktop');
    console.log('   This is required for local Supabase development');
  }
  
  // Check login status
  console.log('\n🔐 Authentication Status:');
  console.log('==========================');
  
  const loginResult = await runCommand('npx', ['supabase', 'projects', 'list']);
  if (loginResult.code === 0 && !loginResult.stderr.includes('not logged in')) {
    console.log('✅ Logged in to Supabase');
  } else {
    console.log('⚠️  Not logged in to Supabase');
    console.log('💡 Run: npm run supabase login');
  }
  
  // Try to get local status
  console.log('\n🏠 Local Development Status:');
  console.log('=============================');
  
  const statusResult = await runCommand('npx', ['supabase', 'status']);
  if (statusResult.code === 0) {
    console.log('✅ Local Supabase services status:');
    console.log(statusResult.stdout);
  } else {
    console.log('⚠️  Local services not running');
    if (statusResult.stderr.includes('Docker')) {
      console.log('💡 Docker is required. Install Docker Desktop first.');
    } else {
      console.log('💡 Run: npm run supabase start');
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('============');
  
  const checks = [
    { name: 'CLI Installed', status: versionResult.code === 0 },
    { name: 'Project Initialized', status: fs.existsSync(configPath) },
    { name: 'Docker Available', status: dockerResult.code === 0 },
    { name: 'Logged In', status: loginResult.code === 0 && !loginResult.stderr.includes('not logged in') }
  ];
  
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
  });
  
  const allPassed = checks.every(check => check.status);
  
  if (allPassed) {
    console.log('\n🎉 Supabase CLI is fully configured!');
    console.log('🚀 Ready for local development');
  } else {
    console.log('\n⚠️  Some setup steps are missing');
    console.log('📖 See the output above for next steps');
  }
  
  return allPassed;
}

// Run the check
checkSupabaseCLI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.log('\n💥 Unexpected error:', error.message);
  process.exit(1);
});
