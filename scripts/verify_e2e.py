import sqlite3
import httpx
import time
import os
import uuid

API_BASE = "http://localhost:8000"
DB_PATH = "test.db"

def setup_test_user():
    print("[1/6] Setting up test user in local database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Ensure tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not cursor.fetchone():
        print("Error: Database tables not initialized. Please ensure the backend is running.")
        conn.close()
        return None
        
    email = "e2e-test@example.com"
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    if row:
        user_id = row[0]
        if "-" not in user_id:
            try:
                user_id = str(uuid.UUID(user_id))
            except ValueError:
                pass
        print(f"Found existing test user: {user_id}")
    else:
        user_id = str(uuid.uuid4())
        user_id_hex = user_id.replace("-", "")
        cursor.execute(
            "INSERT INTO users (id, email, subscription_status) VALUES (?, ?, ?)",
            (user_id_hex, email, "active")
        )
        conn.commit()
        print(f"Created new test user: {user_id}")
        
    conn.close()
    return user_id

async def run_e2e():
    user_id = setup_test_user()
    if not user_id:
        return
        
    headers = {
        "Authorization": f"Bearer {user_id}",
        "Content-Type": "application/json"
    }
    
    user_id_hex = user_id.replace("-", "")
    
    async with httpx.AsyncClient() as client:
        # Check health
        resp = await client.get(f"{API_BASE}/health")
        print(f"Backend Health check: {resp.status_code} - {resp.json()}")
        
        # 2. Add a competitor
        print("\n[2/6] Adding a new competitor...")
        comp_url = "https://e2etestsaas.com"
        comp_name = "E2E Test SaaS"
        
        # Clear existing to avoid duplicate name conflicts in local runs
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM competitors WHERE user_id = ? AND url = ?", (user_id_hex, comp_url))
        conn.commit()
        conn.close()
        
        resp = await client.post(
            f"{API_BASE}/api/v1/competitors",
            json={"url": comp_url, "name": comp_name},
            headers=headers
        )
        assert resp.status_code == 200, f"Add competitor failed: {resp.text}"
        competitor = resp.json()
        competitor_id = competitor["id"]
        print(f"Successfully added competitor. ID: {competitor_id}")
        
        competitor_id_hex = competitor_id.replace("-", "")
        
        # 3. Trigger first scan (Sets base snapshot)
        print("\n[3/6] Triggering first scan (sets baseline snapshot)...")
        resp = await client.post(f"{API_BASE}/api/v1/scan/now", headers=headers)
        assert resp.status_code == 200, f"Scan failed: {resp.text}"
        
        # Wait for the background task to complete and create the first snapshot
        print("Waiting for scan to complete...")
        for i in range(15):
            time.sleep(1)
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT count(*) FROM snapshots WHERE competitor_id = ?", (competitor_id_hex,))
            count = c.fetchone()[0]
            conn.close()
            if count >= 1:
                print(f"First snapshot captured! (Total: {count})")
                break
        else:
            raise TimeoutError("Baseline scan timed out.")
            
        # 4. Trigger second scan (triggers pricing change)
        print("\n[4/6] Triggering second scan (will simulate a pricing change)...")
        resp = await client.post(f"{API_BASE}/api/v1/scan/now", headers=headers)
        assert resp.status_code == 200, f"Scan failed: {resp.text}"
        
        # Wait for second snapshot and change event
        print("Waiting for change detection and queue draft generation...")
        for i in range(15):
            time.sleep(1)
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT count(*) FROM snapshots WHERE competitor_id = ?", (competitor_id_hex,))
            snap_count = c.fetchone()[0]
            c.execute("SELECT count(*) FROM change_events WHERE competitor_id = ?", (competitor_id_hex,))
            change_count = c.fetchone()[0]
            conn.close()
            if snap_count >= 2 and change_count >= 1:
                print(f"Pricing change detected! (Snapshots: {snap_count}, Changes: {change_count})")
                break
        else:
            raise TimeoutError("Second scan or change detection timed out.")
            
        # 5. Fetch Dashboard & Action Queue
        print("\n[5/6] Fetching dashboard data and queue...")
        resp = await client.get(f"{API_BASE}/api/v1/dashboard", headers=headers)
        dashboard = resp.json()
        print(f"Dashboard Stats: Competitor count = {dashboard.get('competitor_count')}, Events count = {len(dashboard.get('events', []))}")
        
        resp = await client.get(f"{API_BASE}/api/v1/queue", headers=headers)
        queue = resp.json()
        actions = queue.get("actions", [])
        print(f"Action Queue size: {len(actions)}")
        for action in actions:
            print(f"  - Action Type: {action['action_type']}")
            print(f"    Draft preview: {action['original_draft'][:90]}...")
            
        assert len(actions) > 0, "No actions generated in the queue!"
        
        # 6. Generate Battle Card
        print("\n[6/6] Generating competitor battle card...")
        resp = await client.get(f"{API_BASE}/api/v1/battlecards/generate/{competitor_id}", headers=headers)
        assert resp.status_code == 200, f"Battle card generation failed: {resp.text}"
        battlecard = resp.json()
        print("Generated E2E Action Plan:")
        for idx, action in enumerate(battlecard.get("actions", []), 1):
            print(f"  {idx}. {action}")
            
        print("\n==========================================")
        print(" SUCCESS: E2E scan and AI pipeline test passed!")
        print("==========================================")

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_e2e())
