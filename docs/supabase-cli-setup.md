# Supabase CLI Setup Guide

This guide walks you through setting up the Supabase CLI for local development.

## Current Status

Run this command to check your current setup status:
```bash
npm run check-supabase
```

## Step 1: Install Docker Desktop (Required)

Supabase CLI requires Docker for local development.

### Windows Installation

1. **Download Docker Desktop**
   - Visit [https://docs.docker.com/desktop/install/windows-install/](https://docs.docker.com/desktop/install/windows-install/)
   - Download Docker Desktop for Windows

2. **Install Docker Desktop**
   - Run the installer
   - Follow the installation wizard
   - **Important**: Enable WSL 2 integration if prompted

3. **Start Docker Desktop**
   - Launch Docker Desktop from Start menu
   - Wait for it to fully start (whale icon in system tray should be stable)

4. **Verify Installation**
   ```bash
   docker --version
   docker ps
   ```

## Step 2: Supabase CLI Commands

Once Docker is installed, you can use these commands:

### Basic Commands
```bash
# Check CLI status
npm run check-supabase

# Start local development environment
npm run supabase start

# Check status of local services
npm run supabase status

# Stop local services
npm run supabase stop

# Reset local database
npm run supabase db reset
```

### Project Management
```bash
# Link to remote project (optional)
npm run supabase link --project-ref YOUR_PROJECT_ID

# Pull remote schema (after linking)
npm run supabase db pull

# Push local changes to remote (after linking)
npm run supabase db push
```

## Step 3: Local Development Environment

After installing Docker, start the local Supabase stack:

```bash
npm run supabase start
```

This will start:
- **PostgreSQL Database** (port 54322)
- **API Gateway** (port 54321)
- **Auth Server** (port 54324)
- **Storage Server** (port 54325)
- **Realtime Server** (port 54326)
- **Dashboard** (port 54323)

### Expected Output
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 4: Verify Local Setup

1. **Check Status**
   ```bash
   npm run supabase status
   ```

2. **Access Local Dashboard**
   - Open [http://localhost:54323](http://localhost:54323)
   - This is your local Supabase Studio

3. **Test Database Connection**
   ```bash
   npm run supabase db reset
   ```

## Step 5: Link to Remote Project (Optional)

If you want to sync with your remote Supabase project:

1. **Link Project**
   ```bash
   npm run supabase link --project-ref jvmcekqjavgesucxytwh
   ```

2. **Enter Database Password**
   - Use the password you set when creating your Supabase project
   - You can reset it from: [Dashboard → Settings → Database](https://supabase.com/dashboard/project/jvmcekqjavgesucxytwh/settings/database)

3. **Pull Remote Schema**
   ```bash
   npm run supabase db pull
   ```

## Troubleshooting

### Common Issues

1. **"Docker not available"**
   - Install Docker Desktop
   - Make sure Docker Desktop is running
   - Restart your terminal after installation

2. **"Permission denied" on Windows**
   - Run PowerShell as Administrator
   - Or enable WSL 2 integration in Docker Desktop

3. **"Port already in use"**
   ```bash
   npm run supabase stop
   npm run supabase start
   ```

4. **"Failed to connect to postgres"**
   - Check if you entered the correct database password
   - Reset password from Supabase Dashboard if needed
   - Check your internet connection

5. **"Services not starting"**
   - Make sure Docker Desktop is running
   - Check Docker Desktop logs for errors
   - Try restarting Docker Desktop

### Getting Help

1. **Check Docker Status**
   ```bash
   docker ps
   docker version
   ```

2. **Check Supabase Logs**
   ```bash
   npm run supabase logs
   ```

3. **Reset Everything**
   ```bash
   npm run supabase stop
   npm run supabase start
   ```

## Development Workflow

### For Local Development Only
1. `npm run supabase start` - Start local services
2. Develop your application using `http://localhost:54321`
3. Use local Studio at `http://localhost:54323`
4. `npm run supabase stop` - Stop when done

### For Remote Sync Development
1. `npm run supabase link` - Link to remote project
2. `npm run supabase db pull` - Get remote schema
3. `npm run supabase start` - Start local services
4. Develop locally
5. `npm run supabase db push` - Push changes to remote
6. `npm run supabase stop` - Stop when done

## Next Steps

Once your local environment is running:
1. ✅ Local Supabase services are available
2. ✅ You can create database tables and functions
3. ✅ You can test authentication and storage
4. ✅ You can develop your application locally

Your local development environment is now ready! 🎉
