from fastapi.testclient import TestClient
from app.main import app
import sys

client = TestClient(app)

def run_tests():
    print("Testing Backend Changes...")
    
    # Test 1: Check Evacuation Roster
    print("\n--- Test 1: GET /dashboard/evacuation-roster ---")
    response = client.get("/dashboard/evacuation-roster")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    if response.status_code == 200 and "data" in response.json():
        print("[SUCCESS] Evacuation roster test passed! StandardResponseEnvelope is working.")
    else:
        print("[ERROR] Evacuation roster test failed!")

if __name__ == "__main__":
    run_tests()
