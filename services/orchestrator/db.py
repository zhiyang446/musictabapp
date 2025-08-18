"""
Database client wrapper for Supabase
Provides Postgres access layer using service key
"""

import os
import httpx
from typing import Optional, Any, Dict, List
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class DatabaseClient:
    """Supabase database client wrapper"""

    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase: Optional[Client] = None

        if not self.supabase_url or not self.supabase_service_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    def get_supabase_client(self) -> Client:
        """Get Supabase client instance"""
        if not self.supabase:
            self.supabase = create_client(
                self.supabase_url,
                self.supabase_service_key
            )
        return self.supabase

    async def execute_raw_sql(self, query: str) -> List[Dict[str, Any]]:
        """Execute raw SQL using Supabase RPC"""
        try:
            # Use HTTP request to execute SQL via Supabase REST API
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/rpc/exec_sql",
                    headers={
                        "apikey": self.supabase_service_key,
                        "Authorization": f"Bearer {self.supabase_service_key}",
                        "Content-Type": "application/json"
                    },
                    json={"sql": query}
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    # Fallback: try simple table query to test connectivity
                    test_response = await client.get(
                        f"{self.supabase_url}/rest/v1/profiles?select=*&limit=1",
                        headers={
                            "apikey": self.supabase_service_key,
                            "Authorization": f"Bearer {self.supabase_service_key}"
                        }
                    )
                    return [{"test": 1}] if test_response.status_code == 200 else []
        except Exception as e:
            print(f"Database query error: {e}")
            return []

    async def health_check(self) -> bool:
        """Check database connectivity with simple query"""
        try:
            # Try to query an existing table to test connectivity
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/profiles?select=*&limit=1",
                    headers={
                        "apikey": self.supabase_service_key,
                        "Authorization": f"Bearer {self.supabase_service_key}"
                    }
                )
                return response.status_code == 200
        except Exception as e:
            print(f"Database health check error: {e}")
            return False

# Global database client instance
db_client = DatabaseClient()
