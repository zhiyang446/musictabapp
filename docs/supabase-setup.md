# Supabase Setup Guide

This guide walks you through setting up a Supabase project for the Music Tab App.

## Step 1: Create a Supabase Project

1. **Visit Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Sign up or log in to your account

2. **Create New Project**
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - **Name**: `music-tab-app` (or your preferred name)
     - **Database Password**: Generate a strong password (save it!)
     - **Region**: Choose closest to your location
   - Click "Create new project"

3. **Wait for Setup**
   - Project creation takes 1-2 minutes
   - You'll see a progress indicator

## Step 2: Get Your Project Credentials

1. **Navigate to API Settings**
   - In your project dashboard, go to **Settings** → **API**
   - You'll see the API settings page

2. **Copy the Required Values**
   - **Project URL**: Copy the URL (looks like `https://abcdefghijk.supabase.co`)
   - **anon public**: Copy the `anon` key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - **service_role**: Copy the `service_role` key (also starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

## Step 3: Update Your Environment Variables

1. **Open your `.env` file**
   ```bash
   # If you don't have a .env file yet:
   npm run setup-env
   ```

2. **Replace the placeholder values**
   ```env
   # Replace these lines in your .env file:
   SUPABASE_URL=https://your-actual-project-id.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-service-key
   ```

3. **Save the file**

## Step 4: Test Your Connection

Run the connection tests to verify everything is working:

```bash
# Test HTTP connection
npm run test-supabase-http

# Test Supabase client connection
npm run test-supabase

# Check all environment variables
npm run check-env
```

## Expected Test Results

### Successful HTTP Test
```
Testing Supabase HTTP connection...

Configuration:
   SUPABASE_URL: https://your-project-id.supabase.co

Testing HTTP connection...
SUCCESS: HTTP connection successful!
   Status Code: 200
   Status Description: OK
SUCCESS: Status code is acceptable (200/301/302)

SUCCESS: Supabase HTTP test passed!
   Your Supabase URL is accessible
```

### Successful Supabase Client Test
```
🔍 Testing Supabase connection...

📋 Configuration Check:
=======================
✅ SUPABASE_URL: https://your-project-id.supabase.co
✅ SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5...
✅ SUPABASE_SERVICE_ROLE_KEY: eyJhbGciOiJIUzI1NiIsInR5...

🌐 Testing HTTP Connection:
============================
✅ HTTP Status: 200 OK

🔐 Testing Supabase Client:
============================
✅ Supabase client created successfully
✅ Anonymous session: None (expected for anonymous)
✅ Database connection test passed

🎉 Supabase Connection Test Results:
=====================================
✅ HTTP connection successful
✅ Supabase client initialization successful
✅ Anonymous session handling working

🚀 Ready to proceed with Supabase integration!
```

## Troubleshooting

### Common Issues

1. **"SUPABASE_URL contains placeholder value"**
   - You haven't updated the `.env` file yet
   - Copy the actual URL from your Supabase project settings

2. **"HTTP connection failed"**
   - Check your internet connection
   - Verify the URL is correct (should end with `.supabase.co`)
   - Make sure the project is fully created (not still setting up)

3. **"Invalid API key"**
   - Double-check you copied the keys correctly
   - Make sure there are no extra spaces or line breaks
   - Verify you're using the right project's keys

4. **"Project not found"**
   - The project might still be setting up
   - Wait a few minutes and try again
   - Check if the project was created successfully in the dashboard

### Getting Help

If you're still having issues:

1. **Check Supabase Status**
   - Visit [https://status.supabase.com](https://status.supabase.com)

2. **Verify Project Status**
   - Go to your Supabase dashboard
   - Make sure the project shows as "Active"

3. **Double-check Credentials**
   - Re-copy the URL and keys from Settings → API
   - Make sure you're in the correct project

## Security Notes

- **Never commit your `.env` file** to version control
- **Keep your service role key secret** - only use it on the server side
- **The anon key is safe** to use in client-side code
- **Use different projects** for development and production

## Next Steps

Once your connection tests pass, you're ready to:
1. Set up database tables (T08-T13)
2. Configure Row Level Security (T14-T16)
3. Start building the application features

Your Supabase project is now connected and ready to use! 🎉
