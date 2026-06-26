from fastapi import APIRouter, HTTPException
from models import JobRequest, JobResponse
from database import get_connection
from upstash_redis import Redis
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

redis = Redis(
    url=os.getenv("UPSTASH_REDIS_REST_URL"),
    token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
)

@router.post("/jobs", response_model=JobResponse)
async def create_job(job: JobRequest):
    conn = await get_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO jobs (type, payload, status)
            VALUES ($1, $2, 'queued')
            RETURNING id, type, status, retries, result, error,
                      created_at::text, updated_at::text
            """,
            job.type,
            json.dumps(job.payload) if job.payload else None
        )
        redis.lpush("job_queue", str(row["id"]))
        return JobResponse(**dict(row))
    finally:
        await conn.close()

@router.get("/jobs")
async def get_all_jobs():
    conn = await get_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT id, type, status, retries, result, error,
                   created_at::text, updated_at::text
            FROM jobs
            ORDER BY created_at DESC
            """
        )
        return [dict(row) for row in rows]
    finally:
        await conn.close()

@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: int):
    conn = await get_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT id, type, status, retries, result, error,
                   created_at::text, updated_at::text
            FROM jobs WHERE id = $1
            """,
            job_id
        )
        if not row:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobResponse(**dict(row))
    finally:
        await conn.close()