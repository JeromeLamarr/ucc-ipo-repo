#!/usr/bin/env python3
"""Test the register-user edge function to see the exact error"""

import requests
import json
import os
from datetime import datetime

# Get environment variables
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://mgiitubvalwemtxpagps.supabase.co")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "")

# Function endpoint
FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/register-user"

# Test data - exactly what the form sends
test_data = {
    "email": f"test-{datetime.now().timestamp()}@example.com",
    "fullName": "Test User",
    "password": "TestPassword123",
    "departmentId": "test-dept-id"
}

print(f"Testing edge function registration...")
print(f"Function URL: {FUNCTION_URL}")
print(f"Test data: {json.dumps(test_data, indent=2)}")
print("-" * 80)

try:
    response = requests.post(
        FUNCTION_URL,
        json=test_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {SUPABASE_KEY}" if SUPABASE_KEY else ""
        },
        timeout=30
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Body: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS!")
    else:
        print(f"\n❌ ERROR: Got {response.status_code}")
        
except Exception as e:
    print(f"❌ ERROR: {e}")
    print(f"Error type: {type(e).__name__}")
