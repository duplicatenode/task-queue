import asyncio

async def send_email(payload: dict) -> str:
    print(f"Sending email to {payload.get('to', 'unknown')}...")
    await asyncio.sleep(1)  # simulates network delay
    return f"Email sent to {payload.get('to')}"

async def resize_image(payload: dict) -> str:
    print(f"Resizing image {payload.get('filename', 'unknown')}...")
    await asyncio.sleep(2)  # simulates processing time
    return f"Image {payload.get('filename')} resized to {payload.get('size', '800x600')}"

async def generate_report(payload: dict) -> str:
    print(f"Generating report for {payload.get('user', 'unknown')}...")
    await asyncio.sleep(3)  # simulates heavy computation
    return f"Report generated for {payload.get('user')}"

# Registry — maps job type string to actual function
TASK_REGISTRY = {
    "send_email": send_email,
    "resize_image": resize_image,
    "generate_report": generate_report,
}