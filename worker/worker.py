import asyncio
import asyncpg
import os
import ast
from dotenv import load_dotenv
from upstash_redis import Redis
from tasks import TASK_REGISTRY

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
redis = Redis(
    url=os.getenv("UPSTASH_REDIS_REST_URL"),
    token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
)

async def update_job(conn, job_id, status, result=None, error=None, increment_retry=False):
    await conn.execute(
        """
        UPDATE jobs
        SET status = $1,
            result = $2,
            error = $3,
            retries = retries + $4,
            updated_at = NOW()
        WHERE id = $5
        """,
        status, result, error, 1 if increment_retry else 0, job_id
    )

async def process_job(job_id: int):
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        row = await conn.fetchrow("SELECT * FROM jobs WHERE id = $1", job_id)
        if not row:
            print(f"Job {job_id} not found.")
            return

        job_type = row["type"]
        payload_raw = row["payload"]
        retries = row["retries"]
        max_retries = row["max_retries"]

        # Parse payload
        try:
            payload = ast.literal_eval(payload_raw) if payload_raw else {}
        except Exception:
            payload = {}

        # Check if job type exists
        task_fn = TASK_REGISTRY.get(job_type)
        if not task_fn:
            await update_job(conn, job_id, "failed", error=f"Unknown job type: {job_type}")
            return

        # Mark as running
        await update_job(conn, job_id, "running")
        print(f"Running job {job_id} of type '{job_type}'...")

        try:
            result = await task_fn(payload)
            await update_job(conn, job_id, "done", result=result)
            print(f"Job {job_id} completed: {result}")

        except Exception as e:
            if retries + 1 >= max_retries:
                await update_job(conn, job_id, "failed", error=str(e), increment_retry=True)
                print(f"Job {job_id} failed permanently after {max_retries} retries.")
            else:
                await update_job(conn, job_id, "queued", error=str(e), increment_retry=True)
                redis.lpush("job_queue", str(job_id))
                print(f"Job {job_id} failed, retrying... ({retries + 1}/{max_retries})")

    finally:
        await conn.close()

async def main():
    print("Worker started. Waiting for jobs...")
    while True:
        result = redis.rpop("job_queue")
        if result:
            job_id = int(result)
            print(f"Picked up job {job_id}")
            await process_job(job_id)
        else:
            print("No jobs in queue. Waiting...")
            await asyncio.sleep(3)

if __name__ == "__main__":
    asyncio.run(main())