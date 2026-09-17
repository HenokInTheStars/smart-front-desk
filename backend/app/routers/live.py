import asyncio
from fastapi import APIRouter
from starlette.responses import StreamingResponse
from typing import AsyncGenerator
import json
import logging

router = APIRouter(prefix="/live", tags=["live"])

# In-memory subscriber list for SSE clients
subscribers: list[asyncio.Queue] = []

async def broadcast_event(event_name: str, payload: dict):
    """
    Broadcasts an event to all connected SSE clients.
    Call this from other routes (e.g., when a visitor checks in).
    """
    message = f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"
    for queue in subscribers:
        await queue.put(message)

async def event_generator(queue: asyncio.Queue) -> AsyncGenerator[str, None]:
    try:
        while True:
            message = await queue.get()
            yield message
    except asyncio.CancelledError:
        pass
    finally:
        subscribers.remove(queue)

@router.get("/updates")
async def live_updates():
    """
    SSE Endpoint for real-time frontend updates.
    The frontend can subscribe to this endpoint using EventSource.
    """
    queue = asyncio.Queue()
    subscribers.append(queue)
    return StreamingResponse(event_generator(queue), media_type="text/event-stream")
