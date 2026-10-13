import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, AsyncGenerator, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import openai
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import RequirePermission
from app.db.session import get_db, AsyncReadonlySessionLocal
from app.db.models import User, Employee, AuditLog
from app.schemas.responses import StandardResponseEnvelope
from app.services.assistant_tools import (
    ASSISTANT_TOOL_DEFINITIONS,
    dispatch_tool_call,
    execute_create_chart,
    EAT_TZ,
)

logger = logging.getLogger("assistant.timing")
if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("[%(asctime)s] %(name)s %(levelname)s: %(message)s"))
    logger.addHandler(_handler)
logger.setLevel(logging.INFO)

settings = get_settings()

router = APIRouter(prefix="/assistant", tags=["assistant"])

# In-memory per-user sliding window rate limit (60 requests/min)
_user_rate_limits: dict[str, list[float]] = {}

def check_rate_limit(user_id: str):
    now = time.time()
    timestamps = _user_rate_limits.setdefault(user_id, [])
    valid_timestamps = [t for t in timestamps if now - t < 60.0]
    _user_rate_limits[user_id] = valid_timestamps
    if len(valid_timestamps) >= 60:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment before sending another query."
        )
    _user_rate_limits[user_id].append(now)


# Live operational tools that must NOT be cached (or have max 10s TTL)
LIVE_OPERATIONAL_TOOLS = {"get_current_lobby_status", "get_host_availability_now"}

from collections import OrderedDict

MAX_CACHE_SIZE = 200
_ai_cache: OrderedDict[str, tuple[dict, float]] = OrderedDict()

def get_cache_key(today_str: str, user_role: str, host_id: Optional[uuid.UUID], prompt: str) -> str:
    norm = prompt.strip().lower()
    if user_role == "HOST" and host_id:
        return f"DATE:{today_str}:HOST:{host_id}:{norm}"
    return f"DATE:{today_str}:ROLE:{user_role}:{norm}"

def get_from_cache(cache_key: str) -> Optional[dict]:
    now = time.time()
    if cache_key in _ai_cache:
        data, exp = _ai_cache[cache_key]
        if now < exp:
            _ai_cache.move_to_end(cache_key)
            return data
        del _ai_cache[cache_key]
    return None

def set_in_cache(cache_key: str, data: dict, ttl: float = 300.0):
    now = time.time()
    if cache_key in _ai_cache:
        _ai_cache.move_to_end(cache_key)
    _ai_cache[cache_key] = (data, now + ttl)
    # Evict oldest entry if size exceeds MAX_CACHE_SIZE (200 entries)
    while len(_ai_cache) > MAX_CACHE_SIZE:
        _ai_cache.popitem(last=False)


def build_trimmed_system_prompt(host_id: Optional[uuid.UUID]) -> tuple[str, str, str]:
    now_eat = datetime.now(EAT_TZ)
    today_str = now_eat.strftime("%Y-%m-%d")
    yesterday_str = (now_eat - timedelta(days=1)).strftime("%Y-%m-%d")
    day_name = now_eat.strftime("%A")
    time_str = now_eat.strftime("%H:%M")

    week_start_str = (now_eat - timedelta(days=now_eat.weekday())).strftime("%Y-%m-%d")
    last_week_start_str = (now_eat - timedelta(days=now_eat.weekday() + 7)).strftime("%Y-%m-%d")
    last_week_end_str = (now_eat - timedelta(days=now_eat.weekday() + 1)).strftime("%Y-%m-%d")
    month_start_str = now_eat.strftime("%Y-%m-01")
    first_of_this_month = now_eat.replace(day=1)
    last_day_prev_month = first_of_this_month - timedelta(days=1)
    prev_month_start_str = last_day_prev_month.strftime("%Y-%m-01")
    prev_month_end_str = last_day_prev_month.strftime("%Y-%m-%d")
    year_start_str = now_eat.strftime("%Y-01-01")

    scope_context = (
        "SCOPE: SYSTEM-WIDE EXECUTIVE ACCESS across all facility departments."
        if not host_id
        else f"SCOPE: HOST-SCOPED ACCESS. Strictly restricted to Host ID: {host_id} (enforced on queries)."
    )

    system_prompt = f"""You are the AI Executive Assistant for the Smart Front Desk System.
{scope_context}

FACILITY CONTEXT (Africa/Addis_Ababa Time):
- Current Time: {today_str} ({day_name}) {time_str} EAT
- Today: {today_str} | Yesterday: {yesterday_str}
- This Week: {week_start_str} to {today_str} | Last Week: {last_week_start_str} to {last_week_end_str}
- This Month: {month_start_str} to {today_str} | Last Month: {prev_month_start_str} to {prev_month_end_str} | This Year: {year_start_str} to {today_str}

DEFINITIONS:
- Statuses: SCHEDULED, EXPECTED, CHECKED_IN, IN_MEETING, COMPLETED, CANCELLED, NO_SHOW, NEEDS_REASSIGNMENT.
- Arrived/Came: checked_in_at is recorded (CHECKED_IN, IN_MEETING, COMPLETED).
- Duration: completed_at - checked_in_at. Sources: 'walk_in', 'pre_registered'.
- Cancellations: status CANCELLED, NEEDS_REASSIGNMENT, or host cancellations with reason.

TOOL SELECTION:
- Rankings/superlatives: `get_top_n(metric=..., start_date=..., end_date=...)`.
- Counts/volumes: `get_visit_stats(start_date=..., end_date=...)`. For breakdowns, pass group_by ('hour', 'day', 'host', 'department').
- Charts: If hourly comparison data was requested, the backend will auto-attach the chart; otherwise call `create_chart(...)`.
- Duration: `get_visit_duration_stats(...)`.
- Cancellations/no-shows: `get_no_show_and_cancellation_rates(...)`.
- Upcoming appointments: `get_upcoming_appointments(...)`.
- Live lobby/hosts: `get_current_lobby_status()`, `get_host_availability_now()`.
- Docs/knowledge: `search_docs(query=...)`. Call `search_docs` at most twice. If nothing relevant is returned, say you do not have that information instead of guessing.
- Always pass exact start_date and end_date matching the user's requested period (e.g. yesterday: '{yesterday_str}' to '{yesterday_str}').

RULES & PRIVACY:
- Explicitly state the date range evaluated in the answer. If results are 0, state 0.
- Out of scope (weather, sports, personal advice): politely refuse and remind user of front desk reception scope.
- Knowledge base: Call `search_docs` at most twice. If nothing relevant is returned, explicitly state that you do not have that information instead of guessing. Answer how-to questions only with what the retrieved documents say and do not add steps or effects that are not in them.
- PRIVACY: Never output individual visitor names, email addresses, phone numbers, or badge identifiers. Report only aggregated totals, trends, and percentages.
- Tone: Direct, executive, concise. Core answer first, followed by key takeaway bullet points.
"""
    return system_prompt, today_str, yesterday_str


def get_client() -> AsyncOpenAI:
    client_kwargs = {"api_key": settings.ai_api_key}
    if settings.ai_base_url:
        client_kwargs["base_url"] = settings.ai_base_url
    # Upstream AI provider client timeout aligned to 45s
    return AsyncOpenAI(**client_kwargs, max_retries=0, timeout=45.0)


async def execute_single_tool(tc: Any, host_id: Optional[uuid.UUID], charts_collector: list) -> tuple:
    func_name = tc.function.name
    try:
        args = json.loads(tc.function.arguments or "{}")
    except Exception:
        args = {}

    t_start = time.perf_counter()
    try:
        async with AsyncReadonlySessionLocal() as ro_db:
            result = await dispatch_tool_call(
                tool_name=func_name,
                tool_args=args,
                db=ro_db,
                host_id=host_id,
                charts_list=charts_collector
            )
    except Exception as ex:
        result = {"error": str(ex)}
    t_dur = round(time.perf_counter() - t_start, 3)
    return tc, func_name, args, result, t_dur


def auto_build_hourly_comparison_chart(tool_results: list, charts_collector: list) -> bool:
    """
    If multiple hourly get_visit_stats results are returned (e.g. yesterday vs today),
    synthesize the line chart immediately on the backend so the model does not need
    a separate create_chart round.
    """
    hourly_series = []
    for tc, func_name, args, result, dur in tool_results:
        if func_name == "get_visit_stats" and isinstance(args, dict) and args.get("group_by") == "hour":
            if isinstance(result, dict) and "results" in result and "start_date" in result:
                s_date = result.get("start_date")
                items = result.get("results") or []
                labels = [item.get("time", f"{i:02d}:00") for i, item in enumerate(items)]
                counts = [item.get("count", 0) for item in items]
                hourly_series.append({
                    "date": s_date,
                    "labels": labels,
                    "counts": counts
                })

    if len(hourly_series) >= 2 and not any(c.get("title", "").startswith("Hourly Visitor Traffic") for c in charts_collector):
        labels = hourly_series[0]["labels"]
        # Sort so earlier date comes first
        hourly_series.sort(key=lambda s: s["date"])
        datasets = [
            {"label": f"Traffic ({s['date']})", "data": s["counts"]}
            for s in hourly_series
        ]
        execute_create_chart(
            charts_list=charts_collector,
            chart_type="line",
            title=f"Hourly Visitor Traffic: {hourly_series[0]['date']} vs {hourly_series[1]['date']}",
            labels=labels,
            datasets=datasets
        )
        return True
    return False


class ChatMessage(BaseModel):
    role: str # "user" | "assistant" | "system"
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)


async def run_assistant_pipeline(
    current_user: User,
    payload: ChatRequest,
    client_ip: str,
    db: AsyncSession,
    is_stream: bool = False
) -> AsyncGenerator[tuple[str, dict], None]:
    """
    Unified execution pipeline used by both /assistant/chat and /assistant/chat/stream.
    Enforces:
    - Rate limiting
    - Host-scoping resolution
    - Audit logging on EVERY query (cache hit or miss)
    - Addis Ababa date in cache key
    - Live operational tools non-cacheable
    - Parallel tool calls & capped rounds (max 4)
    - Auto-generated hourly comparison chart on backend
    - Yields tuples of (event_type, event_data)
    """
    check_rate_limit(str(current_user.id))

    if not settings.ai_api_key or settings.ai_api_key in ["your_gemini_api_key_here", "sk-..."]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant is not configured. Please set your Gemini API key in backend/.env under AI_API_KEY."
        )

    # 1. Resolve host scoping
    user_role = (current_user.role or "").strip().upper()
    host_id = None
    audit_host_id = None
    if user_role == "HOST":
        emp_res = await db.execute(select(Employee).where(Employee.user_id == current_user.id))
        emp = emp_res.scalar_one_or_none()
        if emp:
            host_id = emp.id
            audit_host_id = emp.id
        else:
            host_id = uuid.uuid4()
            audit_host_id = None

    # 2. Date in Addis Ababa
    now_eat = datetime.now(EAT_TZ)
    today_str = now_eat.strftime("%Y-%m-%d")

    # 3. Check Cache (Do NOT read from cache if conversation history is present)
    has_history = bool(payload.history and len(payload.history) > 0)
    cache_key = get_cache_key(today_str, user_role, host_id, payload.message)
    cached_data = get_from_cache(cache_key) if not has_history else None

    # 4. Mandatory Audit Log Entry (ALWAYS written before tools run)
    audit_action = "AI_QUERY_STREAM" if is_stream else "AI_QUERY"
    audit_detail = {
        "prompt": payload.message[:500],
        "user_email": current_user.email,
        "user_role": user_role,
        "host_id": str(host_id) if host_id else None,
        "cached": bool(cached_data),
        "model": settings.ai_model,
        "tools_called": []
    }
    audit_query = AuditLog(
        action=audit_action,
        detail=json.dumps(audit_detail),
        tag="ASSISTANT",
        user_id=current_user.id,
        host_id=audit_host_id,
        ip_address=client_ip,
        anomaly_flag=False,
        created_at=datetime.now(timezone.utc)
    )
    db.add(audit_query)
    await db.commit()
    await db.refresh(audit_query)
    audit_id = audit_query.id

    # 5. Handle Cache Hit
    if cached_data:
        logger.info(f"[AI Assistant Cache] Cache hit for query: '{payload.message[:50]}' (key: {cache_key})")
        cached_copy = dict(cached_data)
        cached_copy["metadata"] = dict(cached_data.get("metadata", {}))
        cached_copy["metadata"]["cached"] = True

        if is_stream:
            yield ("status", {"status": "Loading cached visitor insights..."})
            await asyncio.sleep(0.02)
            ans = cached_copy.get("answer", "")
            chunk_sz = 30
            for i in range(0, len(ans), chunk_sz):
                yield ("delta", {"delta": ans[i:i+chunk_sz]})
                await asyncio.sleep(0.005)

        yield ("done", cached_copy)
        return

    # 6. Build trimmed system prompt & message payload
    system_prompt, today_str, yesterday_str = build_trimmed_system_prompt(host_id)
    messages: list[dict] = [{"role": "system", "content": system_prompt}]
    for msg in payload.history[-10:]:
        if msg.role in ["user", "assistant"]:
            messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": payload.message})

    t_req_start = time.perf_counter()
    timing_logs = {
        "total_time_sec": 0.0,
        "llm_rounds": 0,
        "llm_calls": [],
        "tool_calls": []
    }
    tools_tracker: list[dict] = []
    charts_collector: list = []
    answer_text = ""

    client = get_client()
    extra_kwargs = {}
    if settings.ai_reasoning_effort and settings.ai_reasoning_effort.strip():
        extra_kwargs["reasoning_effort"] = settings.ai_reasoning_effort.strip()

    max_rounds = 4

    for round_idx in range(1, max_rounds + 1):
        t_llm_start = time.perf_counter()
        response = await client.chat.completions.create(
            model=settings.ai_model,
            messages=messages,
            tools=ASSISTANT_TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.2,
            **extra_kwargs
        )
        t_llm_dur = round(time.perf_counter() - t_llm_start, 3)
        tokens_info = None
        if getattr(response, "usage", None):
            tokens_info = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        timing_logs["llm_calls"].append({
            "round": round_idx,
            "model": settings.ai_model,
            "duration_sec": t_llm_dur,
            "tokens": tokens_info
        })
        timing_logs["llm_rounds"] = round_idx
        logger.info(
            f"[AI Assistant Timing] Round {round_idx} LLM call: {t_llm_dur:.3f}s | Model: {settings.ai_model} | Tokens: {tokens_info}"
        )

        choice = response.choices[0]
        resp_msg = choice.message

        if resp_msg.tool_calls:
            if is_stream:
                yield ("status", {
                    "status": "Looking up visitor data...",
                    "tools": [tc.function.name for tc in resp_msg.tool_calls]
                })

            messages.append({
                "role": "assistant",
                "content": resp_msg.content or "",
                "tool_calls": [tc.model_dump(exclude_none=True) for tc in resp_msg.tool_calls]
            })

            # Execute tool calls concurrently in parallel
            tool_results = await asyncio.gather(*[
                execute_single_tool(tc, host_id, charts_collector)
                for tc in resp_msg.tool_calls
            ])

            # Check if we can auto-build the hourly comparison chart directly on the backend
            chart_auto_built = auto_build_hourly_comparison_chart(tool_results, charts_collector)

            for tc, func_name, args, result, dur in tool_results:
                tools_tracker.append({"tool": func_name, "args": args})
                timing_logs["tool_calls"].append({
                    "tool": func_name,
                    "duration_sec": dur,
                    "args": args
                })
                logger.info(f"[AI Assistant Timing] Tool '{func_name}' completed in {dur:.3f}s")

                tool_content_dict = dict(result) if isinstance(result, dict) else {"result": result}
                if chart_auto_built:
                    tool_content_dict["_chart_note"] = (
                        "An interactive line chart comparing hourly traffic has been automatically constructed "
                        "and attached to the user view. Please provide your executive textual comparison directly without calling create_chart."
                    )

                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": func_name,
                    "content": json.dumps(tool_content_dict, default=str)
                })
        else:
            answer_text = resp_msg.content or ""
            if is_stream:
                chunk_sz = 20
                for i in range(0, len(answer_text), chunk_sz):
                    delta_piece = answer_text[i:i+chunk_sz]
                    yield ("delta", {"delta": delta_piece})
                    await asyncio.sleep(0.005)
            break

    t_total_dur = round(time.perf_counter() - t_req_start, 3)
    timing_logs["total_time_sec"] = t_total_dur
    logger.info(
        f"[AI Assistant Timing] Completed query '{payload.message[:60]}' in {t_total_dur:.3f}s ({timing_logs['llm_rounds']} LLM rounds, {len(timing_logs['tool_calls'])} tool calls)"
    )

    distinct_tools = list(dict.fromkeys([t["tool"] for t in tools_tracker]))
    date_ranges = []
    for t in tools_tracker:
        t_args = t.get("args") or {}
        if "start_date" in t_args:
            s = t_args.get("start_date")
            e = t_args.get("end_date") or s
            date_ranges.append(f"{s} to {e}" if s != e else str(s))

    actual_range_str = ", ".join(list(dict.fromkeys(date_ranges))) if date_ranges else f"{today_str} (Africa/Addis_Ababa)"

    if date_ranges and answer_text:
        has_dates_in_answer = any(dr in answer_text for dr in date_ranges)
        p_lower = payload.message.lower()
        if "september" in p_lower and not ("09" in date_ranges[0] or "september" in answer_text.lower()):
            answer_text += f"\n\n*(Guard Notice: The evaluated date range was {actual_range_str}, which differs from the requested period.)*"
        elif not has_dates_in_answer and not any(k in answer_text.lower() for k in ["for the period", "date range", "evaluated", "between", "from "]):
            answer_text += f"\n\n*(Date range evaluated: {actual_range_str})*"

    final_data = {
        "answer": answer_text,
        "charts": charts_collector,
        "metadata": {
            "tools_used": distinct_tools if distinct_tools else ["direct_reasoning"],
            "date_range": actual_range_str,
            "timing_breakdown": timing_logs,
            "cached": False
        }
    }

    # Cache Policy:
    # Do NOT cache live operational statuses or when request includes conversation history
    has_live_tool = any(t.get("tool") in LIVE_OPERATIONAL_TOOLS for t in tools_tracker)
    if has_history:
        logger.info(f"[AI Assistant Cache] Skipping cache write: follow-up inquiry with conversation history")
    elif has_live_tool:
        logger.info(f"[AI Assistant Cache] Live operational query '{payload.message[:50]}' excluded from cache")
    else:
        set_in_cache(cache_key, final_data, ttl=300.0)

    # Update Audit Log Entry with tools called (names and arguments, NO result data) and model used
    tools_summary = [
        {"name": t["tool"], "arguments": t.get("args") or {}}
        for t in tools_tracker
    ]
    audit_detail["tools_called"] = tools_summary
    audit_detail["model"] = settings.ai_model
    audit_detail["llm_rounds"] = timing_logs.get("llm_rounds", 0)
    audit_detail["total_time_sec"] = timing_logs.get("total_time_sec", 0.0)

    try:
        audit_res = await db.execute(select(AuditLog).where(AuditLog.id == audit_id))
        rec = audit_res.scalar_one_or_none()
        if rec:
            rec.detail = json.dumps(audit_detail)
            await db.commit()
    except Exception as audit_err:
        logger.warning(f"Failed to update audit log entry {audit_id}: {audit_err}")

    yield ("done", final_data)


@router.post("/chat", response_model=StandardResponseEnvelope[dict])
async def chat_with_assistant(
    request: Request,
    payload: ChatRequest,
    current_user: User = Depends(RequirePermission(["22_ai_assistant"])),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"

    final_result = None
    try:
        async for event_type, event_data in run_assistant_pipeline(
            current_user=current_user,
            payload=payload,
            client_ip=client_ip,
            db=db,
            is_stream=False
        ):
            if event_type == "done":
                final_result = event_data
            elif event_type == "error":
                raise HTTPException(status_code=500, detail=event_data.get("error", "AI service error"))

    except openai.RateLimitError as rle:
        logger.warning(f"AI Provider Rate Limit (429): {rle}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI service rate limit exceeded. Please wait a moment before sending another query."
        )
    except openai.InternalServerError as ise:
        logger.warning(f"AI Provider Service Unavailable (503): {ise}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is temporarily experiencing high demand. Please try again in a moment."
        )
    except openai.APITimeoutError as te:
        logger.error(f"AI Provider Timeout (45s): {te}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI service timed out after 45 seconds. Please try again."
        )

    if not final_result:
        raise HTTPException(status_code=500, detail="Failed to generate AI assistant response")

    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    return StandardResponseEnvelope(
        internalCode="SUCCESS-200",
        statusCode=200,
        status="SUCCESS",
        message="AI assistant query completed successfully",
        requestId=request_id,
        data=final_result
    )


@router.post("/chat/stream")
async def chat_with_assistant_stream(
    request: Request,
    payload: ChatRequest,
    current_user: User = Depends(RequirePermission(["22_ai_assistant"])),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"

    async def sse_event_stream():
        try:
            async for event_type, event_data in run_assistant_pipeline(
                current_user=current_user,
                payload=payload,
                client_ip=client_ip,
                db=db,
                is_stream=True
            ):
                yield f"event: {event_type}\ndata: {json.dumps(event_data)}\n\n"

        except openai.RateLimitError as rle:
            logger.warning(f"AI Rate Limit (429) in stream: {rle}")
            yield f"event: error\ndata: {json.dumps({'error': 'AI service rate limit exceeded (429). Please wait a moment before trying again.'})}\n\n"
        except openai.APITimeoutError as te:
            logger.error(f"AI Timeout (20s) in stream: {te}")
            yield f"event: error\ndata: {json.dumps({'error': 'AI service timed out after 20 seconds. Please try again.'})}\n\n"
        except Exception as ex:
            logger.error(f"AI Error in stream: {ex}")
            yield f"event: error\ndata: {json.dumps({'error': f'AI service error: {str(ex)}'})}\n\n"

    return StreamingResponse(
        sse_event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
