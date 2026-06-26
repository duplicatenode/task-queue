# Distributed Task Queue

A production-style distributed task queue built from scratch, without using any existing queue frameworks like Celery or BullMQ.

## What is this?

In production systems, long-running tasks (sending emails, processing images, generating reports) cannot block the main API response. This project implements a task queue system that decouples task submission from task execution — the API accepts jobs instantly and returns, while background workers process them asynchronously.

## Architecture
┌─────────────┐         ┌─────────────┐         ┌─────────────┐

│   Client    │──POST──▶│  FastAPI    │──LPUSH──▶│    Redis    │

│  (React)    │         │    API      │          │   (Queue)   │

└─────────────┘         └──────┬──────┘          └──────┬──────┘

│                        │

INSERT                   RPOP

│                        │

▼                        ▼

┌─────────────┐         ┌─────────────┐

│ PostgreSQL  │◀─UPDATE─│   Worker    │

│  (Storage)  │         │  (Python)   │

└─────────────┘         └─────────────┘

Flow:
1. Client submits a job via POST /jobs
2. API saves job to PostgreSQL with status queued and pushes job ID to Redis
3. Worker polls Redis, picks up the job ID, fetches job details from PostgreSQL
4. Worker executes the task, updates status to running then done or failed
5. Dashboard polls GET /jobs every 3 seconds and displays live status

## Key Engineering Decisions

**Why Redis as the broker?**
Redis lists support O(1) push/pop operations making them ideal for a queue. Using LPUSH to enqueue and RPOP to dequeue ensures FIFO ordering.

**How are race conditions prevented?**
Redis RPOP is atomic — only one worker can pop a given job ID, preventing two workers from processing the same job simultaneously.

**Retry logic**
Failed jobs are re-enqueued up to max_retries times (default: 3) with the error stored in PostgreSQL. After max retries the job is marked failed permanently.

**At-least-once delivery**
If a worker crashes mid-job, the job remains in running state in PostgreSQL. A recovery mechanism can detect stale running jobs and re-enqueue them.

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| API | FastAPI (Python) | Async support, automatic docs |
| Queue Broker | Redis (Upstash) | Atomic operations, O(1) push/pop |
| Storage | PostgreSQL (Neon) | Persistent job state and history |
| Worker | Python asyncio | Concurrent task execution |
| Dashboard | React + Vite | Real-time job monitoring |
| Deployment | Render + Vercel | Free tier, zero config |

## Features

- Job submission via REST API with type and JSON payload
- Real-time dashboard with live status updates every 3 seconds
- Automatic retries with configurable max retry count
- Error tracking — failed jobs store the error message
- Job history — all jobs persisted in PostgreSQL
- Three built-in task types — easily extensible to add more

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Health check |
| POST | /jobs | Submit a new job |
| GET | /jobs | List all jobs |
| GET | /jobs/{id} | Get a specific job |

## Running Locally

### Prerequisites
- Python 3.12+
- Node.js 18+
- A free Neon account (https://neon.tech) for PostgreSQL
- A free Upstash account (https://upstash.com) for Redis

### Setup

1. Clone the repo

git clone https://github.com/duplicatenode/task-queue.git
cd task-queue

2. Create api/.env and worker/.env with:

DATABASE_URL=your-neon-connection-string
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

3. Start the API

cd api
pip install -r requirements.txt
uvicorn main:app --reload

4. Start the worker

cd worker
pip install -r requirements.txt
python worker.py

5. Start the dashboard

cd dashboard
npm install
npm run dev

Visit http://localhost:5173 for the dashboard and http://localhost:8000/docs for the API docs.

## Adding New Task Types

Add a function to worker/tasks.py and register it in TASK_REGISTRY:

async def process_csv(payload: dict) -> str:
    filename = payload.get("filename")
    return f"Processed {filename}"

TASK_REGISTRY = {
    "send_email": send_email,
    "resize_image": resize_image,
    "generate_report": generate_report,
    "process_csv": process_csv,
}

The API and worker automatically support the new type with no other changes needed.