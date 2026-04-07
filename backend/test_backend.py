#!/usr/bin/env python3
"""
Minimal Backend API Test
Tests basic endpoints without requiring full compilation
"""

import requests
import json
import time
import sys
import subprocess
import os
from threading import Thread

def start_backend():
    """Start backend server in background"""
    try:
        # Try to start with cargo run
        process = subprocess.Popen(
            ["cargo", "run"],
            cwd="/home/admin/KaruTeens1/backend",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return process
    except Exception as e:
        print(f"Failed to start backend: {e}")
        return None

def test_basic_endpoints():
    """Test basic API endpoints"""
    base_url = "http://localhost:8080"
    
    endpoints = [
        "/health",
        "/auth/register", 
        "/auth/login",
        "/posts",
        "/events",
        "/groups",
        "/stories"
    ]
    
    results = {}
    
    for endpoint in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            print(f"Testing {url}...")
            
            # Try GET request first
            response = requests.get(url, timeout=5)
            results[endpoint] = {
                "status": response.status_code,
                "response": response.text[:200]  # First 200 chars
            }
            print(f"✅ {endpoint}: {response.status_code}")
            
        except requests.exceptions.ConnectionError:
            results[endpoint] = {"error": "Connection refused"}
            print(f"❌ {endpoint}: Connection refused")
        except requests.exceptions.Timeout:
            results[endpoint] = {"error": "Timeout"}
            print(f"⏰ {endpoint}: Timeout")
        except Exception as e:
            results[endpoint] = {"error": str(e)}
            print(f"❌ {endpoint}: {e}")
    
    return results

def main():
    print("🚀 Starting Backend API Test")
    print("=" * 50)
    
    # Start backend in background
    print("Starting backend server...")
    backend_process = start_backend()
    
    if not backend_process:
        print("❌ Failed to start backend")
        return False
    
    # Wait a bit for server to start
    print("Waiting for server to start...")
    time.sleep(10)
    
    # Test endpoints
    print("\nTesting API endpoints...")
    results = test_basic_endpoints()
    
    # Print results summary
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    success_count = 0
    total_count = len(results)
    
    for endpoint, result in results.items():
        if "status" in result:
            success_count += 1
            print(f"✅ {endpoint}: {result['status']}")
        else:
            print(f"❌ {endpoint}: {result.get('error', 'Unknown error')}")
    
    print(f"\nSuccess Rate: {success_count}/{total_count} ({success_count/total_count*100:.1f}%)")
    
    # Cleanup
    if backend_process:
        print("\nStopping backend server...")
        backend_process.terminate()
        backend_process.wait(timeout=5)
    
    return success_count > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
