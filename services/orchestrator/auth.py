"""
JWT Authentication middleware for Supabase
Validates Bearer tokens and injects user_id
"""

import os
import jwt
import httpx
from typing import Optional
from fastapi import HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

class SupabaseJWTBearer(HTTPBearer):
    """Supabase JWT Bearer token validator"""
    
    def __init__(self, auto_error: bool = True):
        super().__init__(auto_error=auto_error)
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET") or os.getenv("JWT_SECRET")
        
        if not all([self.supabase_url, self.supabase_anon_key]):
            raise ValueError("Missing Supabase configuration")
    
    async def __call__(self, request: Request) -> Optional[str]:
        """Validate JWT token and return user_id"""
        try:
            credentials: HTTPAuthorizationCredentials = await super().__call__(request)
        except HTTPException as e:
            if self.auto_error:
                # Convert 403 to 401 for missing token
                raise HTTPException(status_code=401, detail="Missing authorization token")
            return None

        if not credentials:
            if self.auto_error:
                raise HTTPException(status_code=401, detail="Missing authorization token")
            return None

        if credentials.scheme != "Bearer":
            if self.auto_error:
                raise HTTPException(status_code=401, detail="Invalid authentication scheme")
            return None

        user_id = await self.verify_jwt_token(credentials.credentials)
        if not user_id:
            if self.auto_error:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            return None

        # Inject user_id into request state
        request.state.user_id = user_id
        return user_id
    
    async def verify_jwt_token(self, token: str) -> Optional[str]:
        """Verify JWT token with Supabase"""
        try:
            # Method 1: Verify with JWT secret if available
            if self.jwt_secret:
                try:
                    decoded = jwt.decode(
                        token,
                        self.jwt_secret,
                        algorithms=["HS256"],
                        options={"verify_aud": False}  # Supabase doesn't always set aud
                    )
                    user_id = decoded.get("sub")
                    if user_id:
                        return user_id
                except jwt.InvalidTokenError as e:
                    print(f"JWT signature verification failed: {e}")
                    # Fall through to API verification

            # Method 2: Verify with Supabase API (more reliable)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/auth/v1/user",
                    headers={
                        "apikey": self.supabase_anon_key,
                        "Authorization": f"Bearer {token}"
                    },
                    timeout=5.0
                )

                if response.status_code == 200:
                    user_data = response.json()
                    return user_data.get("id")
                else:
                    print(f"Supabase API verification failed: {response.status_code}")
                    return None

        except jwt.InvalidTokenError as e:
            print(f"JWT token invalid: {e}")
            return None
        except Exception as e:
            print(f"JWT verification error: {e}")
            return None

# Global JWT bearer instance
jwt_bearer = SupabaseJWTBearer(auto_error=True)
jwt_bearer_optional = SupabaseJWTBearer(auto_error=False)

def get_current_user_id(request: Request) -> str:
    """Get current user ID from request state"""
    user_id = getattr(request.state, 'user_id', None)
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    return user_id
