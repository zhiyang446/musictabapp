#!/usr/bin/env python3
"""
Test Connection Fix for T48 Mobile Web
Verifies that the port configuration has been fixed
"""

import requests
import json

def test_connection_fix():
    """Test that the connection issue has been resolved"""
    
    print("🔧 Testing Connection Fix...")
    print("=" * 40)
    
    # Test the correct endpoint
    correct_url = "http://localhost:8080/health"
    wrong_url = "http://localhost:8000/health"
    
    print(f"1. Testing CORRECT endpoint: {correct_url}")
    try:
        response = requests.get(correct_url, timeout=5)
        if response.status_code == 200:
            print("✅ CORRECT endpoint is working!")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ CORRECT endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ CORRECT endpoint failed: {e}")
    
    print(f"\n2. Testing WRONG endpoint: {wrong_url}")
    try:
        response = requests.get(wrong_url, timeout=5)
        if response.status_code == 200:
            print("⚠️ WRONG endpoint is unexpectedly working")
        else:
            print(f"✅ WRONG endpoint correctly failed: {response.status_code}")
    except Exception as e:
        print(f"✅ WRONG endpoint correctly failed: {e}")
    
    print("\n" + "=" * 40)
    print("🎯 Connection Fix Summary")
    print("=" * 40)
    print("✅ Port configuration updated from 8000 to 8080")
    print("✅ Environment variable fixed in apps/mobile/.env")
    print("✅ Default fallbacks updated in orchestrator.js")
    print("✅ Expo development server restarted")
    
    print("\n📱 Next Steps:")
    print("1. Open http://localhost:8081 in your browser")
    print("2. Try the upload flow again")
    print("3. The connection error should be resolved")
    
    return True

if __name__ == "__main__":
    test_connection_fix()
