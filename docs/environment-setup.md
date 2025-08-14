# Environment Setup Guide

This guide explains how to set up environment variables for the Music Tab App.

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual values**

3. **Verify your configuration:**
   ```bash
   npm run check-env
   # or
   python scripts/check_env.py
   ```

## Required Variables

### Supabase Configuration

You'll need to create a Supabase project and get these values from your dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing one
3. Go to Settings → API
4. Copy the values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-service-key
```

### API Configuration

```env
API_BASE_URL=http://localhost:8000
JWT_SECRET=your-super-secret-jwt-key-here
```

**Generate a secure JWT secret:**
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Python
python -c "import secrets; print(secrets.token_hex(64))"

# OpenSSL
openssl rand -hex 64
```

## Optional but Recommended

### Redis (for queues and caching)
```env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
```

### Development Settings
```env
NODE_ENV=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:19006
```

### File Upload Limits
```env
MAX_FILE_SIZE=104857600
ALLOWED_AUDIO_TYPES=audio/mpeg,audio/wav,audio/mp4,audio/flac,audio/ogg
```

## Production Configuration

For production deployment, also set:

```env
NODE_ENV=production
DOMAIN=yourdomain.com
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Validation

The project includes environment validation scripts:

- **JavaScript version:** `npm run check-env`
- **Python version:** `python scripts/check_env.py`

These scripts will:
- ✅ Check if `.env` file exists
- ✅ Validate all required variables are present
- ⚠️ Warn about placeholder values
- 💡 Suggest missing recommended variables

## Security Notes

- **Never commit `.env` files** to version control
- **Keep service role keys secret** - only use on server-side
- **Use different keys** for development and production
- **Rotate keys regularly** in production

## Troubleshooting

### Common Issues

1. **`.env` file not found**
   ```bash
   cp .env.example .env
   ```

2. **Permission denied on scripts**
   ```bash
   chmod +x scripts/check_env.py
   ```

3. **Invalid Supabase URL format**
   - Must start with `https://`
   - Must end with `.supabase.co`
   - Example: `https://abcdefghijklmnop.supabase.co`

4. **JWT secret too short**
   - Should be at least 32 characters
   - Use a cryptographically secure random string

### Getting Help

If you encounter issues:
1. Check the [Supabase documentation](https://supabase.com/docs)
2. Verify your project settings in Supabase dashboard
3. Run the environment checker for detailed error messages
