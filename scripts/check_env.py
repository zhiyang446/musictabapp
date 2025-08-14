#!/usr/bin/env python3
"""
Environment Variables Checker (Python version)
Validates that all required environment variables are present
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple


# Required environment variables
REQUIRED_VARS = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY", 
    "SUPABASE_SERVICE_ROLE_KEY",
    "API_BASE_URL",
    "JWT_SECRET"
]

# Optional but recommended variables
RECOMMENDED_VARS = [
    "REDIS_URL",
    "NODE_ENV",
    "CORS_ORIGINS",
    "MAX_FILE_SIZE"
]


def load_env_file(file_path: Path) -> Dict[str, str]:
    """Load environment variables from a .env file."""
    env_vars = {}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, *value_parts = line.split('=')
                    value = '='.join(value_parts).strip()
                    if key and value:
                        env_vars[key] = value
        return env_vars
    except FileNotFoundError:
        return {}
    except Exception as e:
        print(f"❌ Error reading .env file: {e}")
        return {}


def check_environment() -> bool:
    """Check environment variables and return True if all required vars are configured."""
    print("🔍 Checking environment variables...\n")
    
    # Check if .env file exists
    env_path = Path(".env")
    env_example_path = Path(".env.example")
    
    if not env_path.exists():
        print("❌ .env file not found")
        if env_example_path.exists():
            print("💡 Run: cp .env.example .env")
            print("   Then edit .env with your actual values")
        return False
    
    # Load environment variables
    env_vars = load_env_file(env_path)
    if not env_vars:
        print("❌ Failed to read .env file")
        return False
    
    print("✅ .env file found and readable\n")
    
    # Check required variables
    missing_required = []
    empty_required = []
    
    for var_name in REQUIRED_VARS:
        if var_name not in env_vars:
            missing_required.append(var_name)
        elif (not env_vars[var_name] or 
              'your-' in env_vars[var_name] or 
              'localhost' in env_vars[var_name]):
            empty_required.append(var_name)
    
    # Check recommended variables
    missing_recommended = []
    
    for var_name in RECOMMENDED_VARS:
        if var_name not in env_vars:
            missing_recommended.append(var_name)
    
    # Report results
    print("📋 Environment Variables Status:")
    print("================================")
    
    if not missing_required and not empty_required:
        print("✅ All required variables are present and configured")
    else:
        if missing_required:
            print("❌ Missing required variables:")
            for var_name in missing_required:
                print(f"   - {var_name}")
        
        if empty_required:
            print("⚠️  Required variables with placeholder values:")
            for var_name in empty_required:
                print(f"   - {var_name}: {env_vars[var_name]}")
    
    if missing_recommended:
        print("\n💡 Missing recommended variables:")
        for var_name in missing_recommended:
            print(f"   - {var_name}")
    
    print(f"\n📊 Summary:")
    configured_count = len(REQUIRED_VARS) - len(missing_required) - len(empty_required)
    present_count = len(RECOMMENDED_VARS) - len(missing_recommended)
    print(f"   Required: {configured_count}/{len(REQUIRED_VARS)} configured")
    print(f"   Recommended: {present_count}/{len(RECOMMENDED_VARS)} present")
    
    # Return success status
    success = len(missing_required) == 0 and len(empty_required) == 0
    
    if success:
        print("\n✅ Environment check passed")
    else:
        print("\n❌ Environment check failed")
    
    return success


def main():
    """Main entry point."""
    success = check_environment()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
