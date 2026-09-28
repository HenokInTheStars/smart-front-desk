import requests
import sys

BASE_URL = "http://localhost:8000"

def run_tests():
    print("--- Testing User & Role Management Endpoints ---")
    
    # 1. Login
    print("1. Logging in as Super Admin...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@example.com", "password": "secret"})
    if resp.status_code != 200:
        print(f"FAIL: Login failed: {resp.text}")
        sys.exit(1)
    
    token = resp.json()["data"].get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("PASS: Logged in.")

    # 1.5 Cleanup previous runs
    resp = requests.get(f"{BASE_URL}/users", headers=headers)
    for u in resp.json()["data"]:
        if u["email"] in ["testhost@example.com", "nightguard@example.com"]:
            requests.delete(f"{BASE_URL}/users/{u['id']}", headers=headers)

    # 2. List initial users
    print("2. Fetching users list...")
    resp = requests.get(f"{BASE_URL}/users", headers=headers)
    if resp.status_code != 200:
        print(f"FAIL: List users failed: {resp.text}")
        sys.exit(1)
    
    initial_count = len(resp.json()["data"])
    print(f"PASS: Found {initial_count} initial users.")

    # 3. Create user (Host, no description)
    print("3. Creating standard user...")
    payload1 = {
        "email": "testhost@example.com",
        "password": "password123",
        "role": "HOST",
        "permissions": ["1_central_ops"]
    }
    resp = requests.post(f"{BASE_URL}/users", headers=headers, json=payload1)
    if resp.status_code != 201:
        print(f"FAIL: Create user failed: {resp.text}")
        sys.exit(1)
    
    user1_id = resp.json()["data"]["id"]
    print("PASS: Created user testhost@example.com.")

    # 4. Create user (OTHER, custom_role_name, description)
    print("4. Creating custom role user...")
    payload2 = {
        "email": "nightguard@example.com",
        "password": "password123",
        "role": "OTHER",
        "custom_role_name": "Night Guard",
        "description": "Talk to him for after-hours access.",
        "permissions": ["3_evacuation_roster"]
    }
    resp = requests.post(f"{BASE_URL}/users", headers=headers, json=payload2)
    if resp.status_code != 201:
        print(f"FAIL: Create custom role user failed: {resp.text}")
        sys.exit(1)
    
    user2_id = resp.json()["data"]["id"]
    print("PASS: Created user nightguard@example.com.")

    # 5. Edit user 1
    print("5. Editing standard user...")
    edit_payload = {
        "role": "RECEPTION",
        "description": "Front desk receptionist",
        "is_active": False,
        "permissions": ["7_global_lobby_view", "8_manual_override"]
    }
    resp = requests.put(f"{BASE_URL}/users/{user1_id}/role", headers=headers, json=edit_payload)
    if resp.status_code != 200:
        print(f"FAIL: Edit user failed: {resp.text}")
        sys.exit(1)
    
    data = resp.json()["data"]
    if data["role"] != "RECEPTION" or data["is_active"] != False or data["description"] != "Front desk receptionist":
        print("FAIL: Edit user data mismatch")
        sys.exit(1)
    print("PASS: Edited user correctly (suspended, changed to RECEPTION).")

    # 6. Delete user 2
    print("6. Deleting custom role user...")
    resp = requests.delete(f"{BASE_URL}/users/{user2_id}", headers=headers)
    if resp.status_code != 200:
        print(f"FAIL: Delete user failed: {resp.text}")
        sys.exit(1)
    print("PASS: Deleted user nightguard@example.com.")

    # 7. Clean up (delete user 1)
    print("7. Cleaning up (deleting test user 1)...")
    requests.delete(f"{BASE_URL}/users/{user1_id}", headers=headers)
    print("PASS: Cleaned up.")

    print("--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    run_tests()
