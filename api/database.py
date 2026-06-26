import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def get_connection():
    return await asyncpg.connect(DATABASE_URL)

async def setup_db():
    conn = await get_connection()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL,
            payload JSONB,
            status TEXT DEFAULT 'queued',
            retries INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            result TEXT,
            error TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    await conn.close()
    print("Database ready.")