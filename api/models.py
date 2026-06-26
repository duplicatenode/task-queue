from pydantic import BaseModel
from typing import Optional, Any

class JobRequest(BaseModel):
    type: str
    payload: Optional[dict[str, Any]] = None

class JobResponse(BaseModel):
    id: int
    type: str
    status: str
    retries: int
    result: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str