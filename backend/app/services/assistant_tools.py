from datetime import datetime, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo
from uuid import UUID
from typing import Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.services.knowledge_service import search_knowledge_base

def _sanitize_for_json(val: Any) -> Any:
    if isinstance(val, dict):
        return {k: _sanitize_for_json(v) for k, v in val.items()}
    elif isinstance(val, (list, tuple)):
        return [_sanitize_for_json(v) for v in val]
    elif isinstance(val, Decimal):
        return float(val)
    elif isinstance(val, UUID):
        return str(val)
    elif isinstance(val, datetime):
        return val.isoformat()
    return val

try:
    EAT_TZ = ZoneInfo("Africa/Addis_Ababa")
except Exception:
    EAT_TZ = timezone(timedelta(hours=3))

VALID_GROUP_BY = {"hour", "day", "week", "month", "department", "host", "status", "purpose", "source"}
VALID_METRICS = {"hosts", "departments", "days", "hours"}
VALID_FILTER_KEYS = {"department", "host_id", "status", "purpose", "source"}
VALID_CHART_TYPES = {"line", "bar", "pie"}


def parse_date_range_eat_to_utc(start_str: str, end_str: Optional[str] = None) -> tuple[datetime, datetime, str, str]:
    """
    Parses start and end dates formatted as YYYY-MM-DD.
    Computes range boundaries in Africa/Addis_Ababa local time and converts
    them to UTC for filtering on TIMESTAMPTZ columns.
    Ensures max window is <= 366 days.
    """
    if not start_str or not isinstance(start_str, str):
        raise ValueError("start_date is required and must be formatted as YYYY-MM-DD.")
    try:
        s_date = datetime.strptime(start_str.strip(), "%Y-%m-%d").date()
    except Exception:
        raise ValueError(f"Invalid start_date '{start_str}'. Must be formatted as YYYY-MM-DD.")

    if end_str and isinstance(end_str, str) and end_str.strip():
        try:
            e_date = datetime.strptime(end_str.strip(), "%Y-%m-%d").date()
        except Exception:
            raise ValueError(f"Invalid end_date '{end_str}'. Must be formatted as YYYY-MM-DD.")
    else:
        e_date = s_date

    if s_date > e_date:
        s_date, e_date = e_date, s_date

    if (e_date - s_date).days > 366:
        raise ValueError(f"Date range of {(e_date - s_date).days} days exceeds maximum limit of 366 days.")

    # Addis Ababa start of day -> UTC
    eat_start = datetime(s_date.year, s_date.month, s_date.day, 0, 0, 0, tzinfo=EAT_TZ)
    start_utc = eat_start.astimezone(timezone.utc)

    # Addis Ababa end of day (start of next day) -> UTC
    next_day = e_date + timedelta(days=1)
    eat_end = datetime(next_day.year, next_day.month, next_day.day, 0, 0, 0, tzinfo=EAT_TZ)
    end_utc = eat_end.astimezone(timezone.utc)

    return start_utc, end_utc, s_date.strftime("%Y-%m-%d"), e_date.strftime("%Y-%m-%d")


def build_filter_clauses(
    filters: Optional[dict],
    host_id: Optional[UUID],
    params: dict
) -> str:
    """
    Validates filter keys and constructs safe parameterized WHERE clauses.
    Strictly forces host_id when user is a HOST.
    """
    where_parts = []
    if host_id:
        params["scoped_host_id"] = str(host_id)
        where_parts.append("v.host_id = :scoped_host_id")

    if filters and isinstance(filters, dict):
        for k, v in filters.items():
            if k not in VALID_FILTER_KEYS:
                raise ValueError(f"Unknown filter key '{k}'. Allowed filter keys: {sorted(list(VALID_FILTER_KEYS))}")
            if v is None or v == "":
                continue

            if k == "department":
                params["f_dept"] = f"%{v.strip()}%"
                where_parts.append("v.clean_department ILIKE :f_dept")
            elif k == "status":
                st = str(v).strip().upper()
                if st == "CANCELLED":
                    where_parts.append("(v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%')")
                else:
                    params["f_status"] = st
                    where_parts.append("v.status = :f_status")
            elif k == "purpose":
                params["f_purpose"] = f"%{v.strip()}%"
                where_parts.append("v.purpose ILIKE :f_purpose")
            elif k == "source":
                v_str = str(v).lower()
                if "walk" in v_str:
                    where_parts.append("v.source IN ('WALK_IN', 'MANUAL')")
                elif "manual" in v_str:
                    where_parts.append("v.source = 'MANUAL'")
                else:
                    where_parts.append("v.source = 'PRE_REGISTERED'")
            elif k == "host_id" and not host_id:
                params["f_host_id"] = str(v).strip()
                where_parts.append("v.host_id = :f_host_id")

    return (" AND " + " AND ".join(where_parts)) if where_parts else ""


# =====================================================================
# TOOL EXECUTORS (Querying assistant_visits view via read-only session)
# =====================================================================

async def execute_get_visit_stats(
    db: AsyncSession,
    host_id: Optional[UUID],
    start_date: str,
    end_date: Optional[str] = None,
    group_by: Optional[str] = None,
    filters: Optional[dict] = None
) -> dict:
    start_utc, end_utc, s_str, e_str = parse_date_range_eat_to_utc(start_date, end_date)
    params: dict[str, Any] = {"start_utc": start_utc, "end_utc": end_utc}

    filter_sql = build_filter_clauses(filters, host_id, params)

    if group_by:
        group_by = group_by.strip().lower()
        if group_by not in VALID_GROUP_BY:
            raise ValueError(f"Invalid group_by '{group_by}'. Must be one of: {sorted(list(VALID_GROUP_BY))}")

    # No group_by -> Aggregate overview
    if not group_by:
        query = f"""
        SELECT 
            count(*) AS total_visits,
            count(*) FILTER (WHERE v.source IN ('WALK_IN', 'MANUAL')) AS walk_in_count,
            count(*) FILTER (WHERE v.source = 'PRE_REGISTERED') AS pre_registered_count,
            count(*) FILTER (WHERE v.status = 'COMPLETED') AS completed_count,
            count(*) FILTER (WHERE v.status IN ('SCHEDULED', 'EXPECTED')) AS expected_count,
            count(*) FILTER (WHERE v.status IN ('NO_SHOW', 'CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%') AS cancelled_count
        FROM assistant_visits v
        WHERE ((v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc)
               OR (v.updated_at >= :start_utc AND v.updated_at < :end_utc AND (v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%'))) {filter_sql};
        """
        res = (await db.execute(text(query), params)).mappings().first() or {}
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "metrics": dict(res)
        }

    # Hourly grouping
    if group_by == "hour":
        query = f"""
        SELECT 
            EXTRACT(HOUR FROM (v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa'))::integer AS hour,
            to_char(date_trunc('hour', v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa'), 'HH24:00') AS time_label,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY hour, time_label
        ORDER BY hour;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        hour_map = {r["hour"]: r["count"] for r in rows}
        complete_hourly = [
            {"time": f"{h:02d}:00", "count": hour_map.get(h, 0)}
            for h in range(24)
        ]
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "hour",
            "results": complete_hourly
        }

    # Day grouping
    elif group_by == "day":
        query = f"""
        SELECT 
            to_char(v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD') AS date,
            TRIM(to_char(v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa', 'Day')) AS weekday,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY date, weekday
        ORDER BY date;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "day",
            "results": [dict(r) for r in rows]
        }

    # Week grouping
    elif group_by == "week":
        query = f"""
        SELECT 
            to_char(date_trunc('week', v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa'), 'YYYY-MM-DD') AS week_start,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY week_start
        ORDER BY week_start;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "week",
            "results": [dict(r) for r in rows]
        }

    # Month grouping
    elif group_by == "month":
        query = f"""
        SELECT 
            to_char(date_trunc('month', v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa'), 'YYYY-MM') AS month,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY month
        ORDER BY month;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "month",
            "results": [dict(r) for r in rows]
        }

    # Department grouping
    elif group_by == "department":
        query = f"""
        SELECT 
            v.clean_department AS department,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY v.clean_department
        ORDER BY count DESC;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "department",
            "results": [dict(r) for r in rows]
        }

    # Host grouping
    elif group_by == "host":
        query = f"""
        SELECT 
            e.full_name AS host_name,
            count(*) AS count
        FROM assistant_visits v
        JOIN employees e ON v.host_id = e.id
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY e.full_name
        ORDER BY count DESC;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "host",
            "results": [dict(r) for r in rows]
        }

    # Status grouping
    elif group_by == "status":
        query = f"""
        SELECT 
            v.status AS status,
            count(*) AS count
        FROM assistant_visits v
        WHERE ((v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc)
               OR (v.updated_at >= :start_utc AND v.updated_at < :end_utc AND (v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%'))) {filter_sql}
        GROUP BY v.status
        ORDER BY count DESC;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "status",
            "results": [dict(r) for r in rows]
        }

    # Purpose grouping
    elif group_by == "purpose":
        query = f"""
        SELECT 
            v.purpose AS purpose,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY v.purpose
        ORDER BY count DESC;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "purpose",
            "results": [dict(r) for r in rows]
        }

    # Source grouping
    elif group_by == "source":
        query = f"""
        SELECT 
            v.source AS source,
            count(*) AS count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {filter_sql}
        GROUP BY v.source
        ORDER BY count DESC;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": "source",
            "results": [dict(r) for r in rows]
        }


async def execute_get_top_n(
    db: AsyncSession,
    host_id: Optional[UUID],
    metric: str,
    start_date: str,
    end_date: Optional[str] = None,
    n: int = 5
) -> dict:
    start_utc, end_utc, s_str, e_str = parse_date_range_eat_to_utc(start_date, end_date)
    metric = (metric or "").strip().lower()
    if metric not in VALID_METRICS:
        raise ValueError(f"Invalid metric '{metric}'. Must be one of: {sorted(list(VALID_METRICS))}")

    if not isinstance(n, int) or n < 1 or n > 50:
        raise ValueError("Parameter 'n' must be an integer between 1 and 50.")

    params: dict[str, Any] = {"start_utc": start_utc, "end_utc": end_utc, "n_limit": n}
    host_clause = ""
    if host_id:
        params["scoped_host_id"] = str(host_id)
        host_clause = "AND v.host_id = :scoped_host_id"

    if metric == "hosts":
        query = f"""
        SELECT 
            e.full_name AS item,
            count(*) AS visitors
        FROM assistant_visits v
        JOIN employees e ON v.host_id = e.id
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {host_clause}
        GROUP BY e.full_name
        ORDER BY visitors DESC
        LIMIT :n_limit;
        """
    elif metric == "departments":
        query = f"""
        SELECT 
            v.clean_department AS item,
            count(*) AS visitors
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {host_clause}
        GROUP BY v.clean_department
        ORDER BY visitors DESC
        LIMIT :n_limit;
        """
    elif metric == "days":
        query = f"""
        SELECT 
            to_char(v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD (Dy)') AS item,
            count(*) AS visitors
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {host_clause}
        GROUP BY item
        ORDER BY visitors DESC
        LIMIT :n_limit;
        """
    elif metric == "hours":
        query = f"""
        SELECT 
            to_char(date_trunc('hour', v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa'), 'HH24:00') AS item,
            count(*) AS visitors
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {host_clause}
        GROUP BY item
        ORDER BY visitors DESC
        LIMIT :n_limit;
        """

    rows = (await db.execute(text(query), params)).mappings().all()
    return {
        "start_date": s_str,
        "end_date": e_str,
        "timezone": "Africa/Addis_Ababa",
        "metric": metric,
        "top_n": [dict(r) for r in rows]
    }


async def execute_get_visit_duration_stats(
    db: AsyncSession,
    host_id: Optional[UUID],
    start_date: str,
    end_date: Optional[str] = None,
    group_by: Optional[str] = None
) -> dict:
    start_utc, end_utc, s_str, e_str = parse_date_range_eat_to_utc(start_date, end_date)
    params: dict[str, Any] = {"start_utc": start_utc, "end_utc": end_utc}

    host_clause = ""
    if host_id:
        params["scoped_host_id"] = str(host_id)
        host_clause = "AND v.host_id = :scoped_host_id"

    if group_by:
        group_by = group_by.strip().lower()
        if group_by not in ["day", "week", "month", "department", "source"]:
            raise ValueError("group_by for duration stats must be one of: 'day', 'week', 'month', 'department', 'source'")

    if not group_by:
        query = f"""
        SELECT 
            ROUND(AVG(EXTRACT(EPOCH FROM (v.completed_at - v.checked_in_at)) / 60.0)::numeric, 1) AS avg_duration_minutes,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (v.completed_at - v.checked_in_at)) / 60.0))::numeric, 1) AS median_duration_minutes,
            count(*) AS sample_size
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc
          AND v.checked_in_at IS NOT NULL AND v.completed_at IS NOT NULL {host_clause};
        """
        row = (await db.execute(text(query), params)).mappings().first() or {}
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "stats": dict(row)
        }
    else:
        group_col = "v.clean_department" if group_by == "department" else f"v.{group_by}" if group_by == "source" else f"to_char(v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD')"
        query = f"""
        SELECT 
            {group_col} AS group_label,
            ROUND(AVG(EXTRACT(EPOCH FROM (v.completed_at - v.checked_in_at)) / 60.0)::numeric, 1) AS avg_duration_minutes,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY (EXTRACT(EPOCH FROM (v.completed_at - v.checked_in_at)) / 60.0))::numeric, 1) AS median_duration_minutes,
            count(*) AS sample_size
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc
          AND v.checked_in_at IS NOT NULL AND v.completed_at IS NOT NULL {host_clause}
        GROUP BY group_label
        ORDER BY avg_duration_minutes DESC;
        """
        rows = (await db.execute(text(query), params)).mappings().all()
        return {
            "start_date": s_str,
            "end_date": e_str,
            "timezone": "Africa/Addis_Ababa",
            "group_by": group_by,
            "breakdown": [dict(r) for r in rows]
        }


async def execute_get_no_show_and_cancellation_rates(
    db: AsyncSession,
    host_id: Optional[UUID],
    start_date: str,
    end_date: Optional[str] = None,
    group_by: Optional[str] = None
) -> dict:
    start_utc, end_utc, s_str, e_str = parse_date_range_eat_to_utc(start_date, end_date)
    params: dict[str, Any] = {"start_utc": start_utc, "end_utc": end_utc}

    host_clause = ""
    if host_id:
        params["scoped_host_id"] = str(host_id)
        host_clause = "AND v.host_id = :scoped_host_id"

    query = f"""
    SELECT 
        count(*) AS total_scheduled,
        count(*) FILTER (WHERE v.status = 'NO_SHOW') AS no_show_count,
        count(*) FILTER (WHERE v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%') AS cancelled_count,
        count(*) FILTER (WHERE v.status = 'NEEDS_REASSIGNMENT' OR v.notes LIKE '%[HOST_CANCELLED]%') AS host_cancelled_count,
        count(*) FILTER (WHERE v.status IN ('NO_SHOW', 'CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%') AS unfulfilled_count,
        ROUND((count(*) FILTER (WHERE v.status IN ('NO_SHOW', 'CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%')::numeric / NULLIF(count(*), 0) * 100), 1) AS unfulfilled_rate_pct
    FROM assistant_visits v
    WHERE ((v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc)
           OR (v.updated_at >= :start_utc AND v.updated_at < :end_utc AND (v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%')))
      {host_clause};
    """
    row = (await db.execute(text(query), params)).mappings().first() or {}

    details_query = f"""
    SELECT 
        v.id,
        v.status,
        to_char(v.scheduled_time AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD HH24:MI') as scheduled_time_eat,
        to_char(v.updated_at AT TIME ZONE 'Africa/Addis_Ababa', 'YYYY-MM-DD HH24:MI') as cancelled_time_eat,
        v.purpose,
        v.clean_department,
        CASE 
            WHEN v.notes LIKE '%[HOST_CANCELLED]%' THEN TRIM(REPLACE(SUBSTRING(v.notes FROM '\\[HOST_CANCELLED\\]\\s*([^\\r\\n]+)'), '[HOST_CANCELLED]', ''))
            ELSE NULL 
        END AS cancel_reason
    FROM assistant_visits v
    WHERE ((v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc)
           OR (v.updated_at >= :start_utc AND v.updated_at < :end_utc AND (v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%')))
      AND (v.status IN ('CANCELLED', 'NEEDS_REASSIGNMENT') OR v.notes LIKE '%[HOST_CANCELLED]%')
      {host_clause}
    ORDER BY v.updated_at DESC
    LIMIT 10;
    """
    details = (await db.execute(text(details_query), params)).mappings().all()

    return {
        "start_date": s_str,
        "end_date": e_str,
        "timezone": "Africa/Addis_Ababa",
        "rates": dict(row),
        "cancelled_appointments": [
            {
                "id": str(d["id"]),
                "status": d["status"],
                "scheduled_time": d["scheduled_time_eat"],
                "cancelled_time": d["cancelled_time_eat"],
                "purpose": d["purpose"],
                "department": d["clean_department"],
                "cancel_reason": d["cancel_reason"]
            }
            for d in details
        ]
    }


async def execute_get_upcoming_appointments(
    db: AsyncSession,
    host_id: Optional[UUID],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> dict:
    now_eat = datetime.now(EAT_TZ)
    now_utc = now_eat.astimezone(timezone.utc)
    s_date = start_date or now_eat.strftime("%Y-%m-%d")
    start_utc, end_utc, s_str, e_str = parse_date_range_eat_to_utc(s_date, end_date)

    params: dict[str, Any] = {"start_utc": max(start_utc, now_utc), "end_utc": end_utc}
    host_clause = ""
    if host_id:
        params["scoped_host_id"] = str(host_id)
        host_clause = "AND v.host_id = :scoped_host_id"

    query = f"""
    SELECT 
        count(*) AS total_upcoming,
        count(*) FILTER (WHERE v.source IN ('WALK_IN', 'MANUAL')) AS walk_in_count,
        count(*) FILTER (WHERE v.source = 'PRE_REGISTERED') AS pre_registered_count
    FROM assistant_visits v
    WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc
      AND v.status IN ('SCHEDULED', 'EXPECTED') {host_clause};
    """
    row = (await db.execute(text(query), params)).mappings().first() or {}

    # Department breakdown
    dept_query = f"""
    SELECT 
        v.clean_department AS department,
        count(*) AS upcoming_count
    FROM assistant_visits v
    WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc
      AND v.status IN ('SCHEDULED', 'EXPECTED') {host_clause}
    GROUP BY v.clean_department
    ORDER BY upcoming_count DESC;
    """
    dept_rows = (await db.execute(text(dept_query), params)).mappings().all()

    return {
        "start_date": s_str,
        "end_date": e_str,
        "timezone": "Africa/Addis_Ababa",
        "totals": dict(row),
        "department_distribution": [dict(r) for r in dept_rows]
    }


async def execute_get_host_availability_now(
    db: AsyncSession,
    host_id: Optional[UUID]
) -> dict:
    now_eat = datetime.now(EAT_TZ)
    weekday = now_eat.weekday() # 0 = Monday ... 6 = Sunday
    current_time_str = now_eat.strftime("%H:%M")
    today_str = now_eat.strftime("%Y-%m-%d")

    # 1. Total hosts and shift schedules
    query_shifts = """
    SELECT 
        e.id AS employee_id,
        e.full_name,
        e.department,
        hs.start_time,
        hs.end_time
    FROM employees e
    JOIN host_shifts hs ON e.id = hs.employee_id
    WHERE hs.day_of_week = :weekday
      AND hs.start_time <= :current_time
      AND hs.end_time >= :current_time;
    """
    on_shift_rows = (await db.execute(text(query_shifts), {"weekday": weekday, "current_time": current_time_str})).mappings().all()

    # 2. Check holidays
    query_holidays = """
    SELECT employee_id FROM host_holidays WHERE date = :today_str;
    """
    holiday_rows = (await db.execute(text(query_holidays), {"today_str": today_str})).scalars().all()
    holiday_emp_ids = set(holiday_rows)

    # 3. Check current in-meeting hosts from assistant_visits
    query_in_meeting = """
    SELECT DISTINCT host_id FROM assistant_visits WHERE status = 'IN_MEETING';
    """
    in_meeting_rows = (await db.execute(text(query_in_meeting))).scalars().all()
    in_meeting_ids = set(in_meeting_rows)

    active_hosts = []
    for r in on_shift_rows:
        emp_id = r["employee_id"]
        if emp_id in holiday_emp_ids:
            continue
        status_label = "IN_MEETING" if emp_id in in_meeting_ids else "AVAILABLE"
        active_hosts.append({
            "host_name": r["full_name"],
            "department": r["department"],
            "status": status_label,
            "shift_hours": f"{r['start_time']} - {r['end_time']}"
        })

    return {
        "current_time_eat": now_eat.strftime("%Y-%m-%d %H:%M"),
        "total_on_shift": len(active_hosts),
        "available_now": len([h for h in active_hosts if h["status"] == "AVAILABLE"]),
        "in_meeting_now": len([h for h in active_hosts if h["status"] == "IN_MEETING"]),
        "hosts": active_hosts
    }


async def execute_get_repeat_visitor_stats(
    db: AsyncSession,
    host_id: Optional[UUID],
    start_date: str,
    end_date: Optional[str] = None
) -> dict:
    start_utc, end_utc, s_str, e_str = parse_date_range_eat_to_utc(start_date, end_date)
    params: dict[str, Any] = {"start_utc": start_utc, "end_utc": end_utc}

    host_clause = ""
    if host_id:
        params["scoped_host_id"] = str(host_id)
        host_clause = "AND v.host_id = :scoped_host_id"

    query = f"""
    WITH visitor_visit_counts AS (
        SELECT v.visitor_id, count(*) AS visit_count
        FROM assistant_visits v
        WHERE v.scheduled_time >= :start_utc AND v.scheduled_time < :end_utc {host_clause}
        GROUP BY v.visitor_id
    )
    SELECT 
        count(*) AS unique_visitors,
        count(*) FILTER (WHERE visit_count = 1) AS single_visit_visitors,
        count(*) FILTER (WHERE visit_count > 1) AS repeat_visitors,
        ROUND((count(*) FILTER (WHERE visit_count > 1)::numeric / NULLIF(count(*), 0) * 100), 1) AS repeat_visitor_pct
    FROM visitor_visit_counts;
    """
    row = (await db.execute(text(query), params)).mappings().first() or {}
    return {
        "start_date": s_str,
        "end_date": e_str,
        "timezone": "Africa/Addis_Ababa",
        "retention": dict(row)
    }


async def execute_get_current_lobby_status(
    db: AsyncSession,
    host_id: Optional[UUID]
) -> dict:
    now_eat = datetime.now(EAT_TZ)
    today_start = datetime(now_eat.year, now_eat.month, now_eat.day, 0, 0, 0, tzinfo=EAT_TZ).astimezone(timezone.utc)
    today_end = datetime(now_eat.year, now_eat.month, now_eat.day, 23, 59, 59, tzinfo=EAT_TZ).astimezone(timezone.utc)

    params: dict[str, Any] = {"today_start_utc": today_start, "today_end_utc": today_end}
    host_clause = ""
    if host_id:
        params["scoped_host_id"] = str(host_id)
        host_clause = "AND v.host_id = :scoped_host_id"

    query = f"""
    SELECT 
        count(*) FILTER (WHERE v.status = 'CHECKED_IN') AS waiting_in_lobby,
        count(*) FILTER (WHERE v.status = 'IN_MEETING') AS in_meeting,
        count(*) FILTER (WHERE v.status IN ('SCHEDULED', 'EXPECTED') AND v.scheduled_time >= :today_start_utc AND v.scheduled_time <= :today_end_utc) AS expected_today,
        count(*) FILTER (WHERE v.status = 'COMPLETED' AND v.scheduled_time >= :today_start_utc AND v.scheduled_time <= :today_end_utc) AS completed_today
    FROM assistant_visits v
    WHERE 1=1 {host_clause};
    """
    row = (await db.execute(text(query), params)).mappings().first() or {}
    return {
        "current_time_eat": now_eat.strftime("%Y-%m-%d %H:%M"),
        "status_summary": dict(row)
    }


def execute_create_chart(charts_list: list, chart_type: str, title: str, labels: list[str], datasets: list[dict]) -> dict:
    chart_type = (chart_type or "").strip().lower()
    if chart_type not in VALID_CHART_TYPES:
        raise ValueError(f"chart_type must be one of: {sorted(list(VALID_CHART_TYPES))}")

    if not isinstance(labels, list) or not labels:
        raise ValueError("labels must be a non-empty list of string category names or timestamps.")

    if not isinstance(datasets, list) or not datasets:
        raise ValueError("datasets must be a non-empty list of series objects with label and data.")

    chart_obj = {
        "id": f"chart-{len(charts_list) + 1}",
        "type": chart_type,
        "title": (title or "Visitor Analytics Chart").strip(),
        "labels": [str(l) for l in labels],
        "datasets": datasets
    }
    charts_list.append(chart_obj)
    return {
        "status": "success",
        "chart_id": chart_obj["id"],
        "chart_title": chart_obj["title"]
    }


def execute_search_docs(query: str) -> dict:
    if not query or not isinstance(query, str):
        raise ValueError("query must be a non-empty string.")
    q = query.strip()
    if len(q) < 2 or len(q) > 200:
        raise ValueError("query must be between 2 and 200 characters.")
    results = search_knowledge_base(q, top_k=2)
    trimmed_results = [
        {
            "file": r["file"],
            "heading": r["heading"],
            "content": r["content"][:350] + ("..." if len(r["content"]) > 350 else "")
        }
        for r in results
    ]
    return {
        "query": q,
        "matches_count": len(trimmed_results),
        "results": trimmed_results,
        "message": "Matching documentation retrieved." if trimmed_results else "No matching documentation found."
    }


# =====================================================================
# TOOL SPECIFICATIONS (OpenAI / Gemini function calling catalog)
# =====================================================================

ASSISTANT_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "get_visit_stats",
            "description": "Answers questions about visitor counts, arrival volumes, and breakdowns across dimensions (hour, day, week, month, department, host, status, purpose, source). Use group_by='host' to get visits broken down by host staff member for a bar chart or breakdown list. Use without group_by to get total visit counts. Always pass start_date and end_date matching the exact period requested (e.g. for yesterday, pass yesterday's date for both start and end; for a month, pass YYYY-MM-01 to end of month). Never default to today if another date range was requested.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date formatted as YYYY-MM-DD (e.g. '2026-09-01' for September 1, 2026)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date formatted as YYYY-MM-DD (e.g. '2026-09-30' for September 30, 2026). Defaults to start_date if omitted."
                    },
                    "group_by": {
                        "type": "string",
                        "enum": ["hour", "day", "week", "month", "department", "host", "status", "purpose", "source"],
                        "description": "Dimension to group by. Use 'host' to get visits by host staff member, 'department' for department traffic, 'hour' for hourly breakdown. If omitted, returns total visits summary."
                    },
                    "filters": {
                        "type": "object",
                        "description": "Optional filters to restrict results. Allowed keys: department, host_id, status, purpose, source.",
                        "properties": {
                            "department": {"type": "string", "description": "Filter by department name"},
                            "host_id": {"type": "string", "description": "Filter by host employee UUID"},
                            "status": {"type": "string", "description": "Filter by appointment status"},
                            "purpose": {"type": "string", "description": "Filter by appointment purpose"},
                            "source": {"type": "string", "description": "Filter by walk_in or pre_registered"}
                        }
                    }
                },
                "required": ["start_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_n",
            "description": "Answers ranking and superlative questions such as 'Which hosts had the most visitors in <period>?' (use metric='hosts') or 'Which departments had the most visitors?' (use metric='departments'). Ranks top categories by visitor traffic for the specified date range. Always pass start_date and end_date covering the entire period requested (e.g. for September: start_date='2026-09-01', end_date='2026-09-30').",
            "parameters": {
                "type": "object",
                "properties": {
                    "metric": {
                        "type": "string",
                        "enum": ["hosts", "departments", "days", "hours"],
                        "description": "The dimension to rank top items for. Use 'hosts' for staff hosts with most visitors, 'departments' for busiest departments."
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Start date formatted as YYYY-MM-DD (e.g. '2026-09-01')"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date formatted as YYYY-MM-DD (e.g. '2026-09-30'). Defaults to start_date if omitted."
                    },
                    "n": {
                        "type": "integer",
                        "description": "Number of top results to return (between 1 and 50, default is 5)."
                    }
                },
                "required": ["metric", "start_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_visit_duration_stats",
            "description": "Calculate average and median visit duration in minutes (from arrival checked_in_at to completed_at) using PostgreSQL percentile_cont(0.5).",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date formatted as YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date formatted as YYYY-MM-DD. Defaults to start_date if omitted."
                    },
                    "group_by": {
                        "type": "string",
                        "enum": ["day", "week", "month", "department", "source"],
                        "description": "Optional breakdown dimension for duration comparison."
                    }
                },
                "required": ["start_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_no_show_and_cancellation_rates",
            "description": "Calculate no-show and cancellation rates, counts, and reasons for appointments scheduled or cancelled within a date range (including host-cancelled visits and visits awaiting reassignment). Returns cancelled appointment details and host cancel reasons.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date formatted as YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date formatted as YYYY-MM-DD. Defaults to start_date if omitted."
                    }
                },
                "required": ["start_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_appointments",
            "description": "Get aggregated counts of upcoming scheduled and expected appointments from the current time onward.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date formatted as YYYY-MM-DD. Defaults to today."
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date formatted as YYYY-MM-DD."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_host_availability_now",
            "description": "Check current staff shift schedules, active meetings, and holiday statuses in East Africa Time.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_repeat_visitor_stats",
            "description": "Retrieve unique vs. repeat visitor counts and return percentage for a date range without exposing any visitor identities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Start date formatted as YYYY-MM-DD"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date formatted as YYYY-MM-DD. Defaults to start_date if omitted."
                    }
                },
                "required": ["start_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_lobby_status",
            "description": "Get real-time snapshot of the facility lobby: visitors waiting in queue, currently in meetings, expected today, and completed today.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_chart",
            "description": "Render an interactive visual chart (line, bar, or pie) on the frontend dashboard. Always call analytical data tools first to fetch real numbers before calling create_chart.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["line", "bar", "pie"],
                        "description": "The visual chart visualization style."
                    },
                    "title": {
                        "type": "string",
                        "description": "Descriptive title for the chart (e.g. 'Hourly Visitor Traffic: Yesterday vs Today')."
                    },
                    "labels": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "X-axis category labels or hourly timestamps (e.g. ['08:00', '09:00', ...])."
                    },
                    "datasets": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string", "description": "Series name (e.g. 'Yesterday', 'Today')"},
                                "data": {"type": "array", "items": {"type": "number"}, "description": "Numeric data points matching labels length."}
                            },
                            "required": ["label", "data"]
                        },
                        "description": "Array of data series. For multi-series comparisons (e.g. yesterday vs today), provide one dataset for each period."
                    }
                },
                "required": ["chart_type", "title", "labels", "datasets"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_docs",
            "description": "Search the official Smart Front Desk System documentation and facility knowledge base for questions about system features, operational workflows, user roles, permission capabilities, appointment statuses, visitor check-in/checkout rules, evacuation protocols, or security watchlists.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search keywords or question topic (e.g. 'reassign guests', 'evacuation roster', 'receptionist permissions', 'needs reassignment status')."
                    }
                },
                "required": ["query"]
            }
        }
    }
]


# =====================================================================
# SAFE DISPATCHER (Invokes tools, catches exceptions, isolates host)
# =====================================================================

async def dispatch_tool_call(
    tool_name: str,
    tool_args: dict,
    db: AsyncSession,
    host_id: Optional[UUID],
    charts_list: list
) -> dict:
    """
    Safely dispatches a requested analytical tool against the read-only session.
    Catches any validation or query error and returns {"error": "..."} instead of failing.
    Never exposes raw visitor details or executes raw SQL.
    """
    try:
        res = None
        # 1. Parameterized visit stats
        if tool_name == "get_visit_stats":
            res = await execute_get_visit_stats(db, host_id, **tool_args)

        # 2. Top N categories
        elif tool_name == "get_top_n":
            res = await execute_get_top_n(db, host_id, **tool_args)

        # 3. Visit duration stats (avg & median percentile_cont)
        elif tool_name == "get_visit_duration_stats":
            res = await execute_get_visit_duration_stats(db, host_id, **tool_args)

        # 4. No-show and cancellation rates
        elif tool_name == "get_no_show_and_cancellation_rates":
            res = await execute_get_no_show_and_cancellation_rates(db, host_id, **tool_args)

        # 5. Upcoming appointments
        elif tool_name == "get_upcoming_appointments":
            res = await execute_get_upcoming_appointments(db, host_id, **tool_args)

        # 6. Host availability
        elif tool_name == "get_host_availability_now":
            res = await execute_get_host_availability_now(db, host_id)

        # 7. Repeat visitor statistics
        elif tool_name == "get_repeat_visitor_stats":
            res = await execute_get_repeat_visitor_stats(db, host_id, **tool_args)

        # 8. Real-time lobby queue
        elif tool_name == "get_current_lobby_status":
            res = await execute_get_current_lobby_status(db, host_id)

        # 9. Chart renderer
        elif tool_name == "create_chart":
            res = execute_create_chart(charts_list, **tool_args)

        # 10. Facility documentation search
        elif tool_name == "search_docs":
            q = tool_args.get("query")
            res = execute_search_docs(query=q)

        # Backward compatibility for legacy tool names
        elif tool_name == "get_visitor_count":
            s_d = tool_args.get("start_date")
            e_d = tool_args.get("end_date")
            res = await execute_get_visit_stats(db, host_id, start_date=s_d, end_date=e_d)
        elif tool_name == "get_visitors_by_hour":
            d = tool_args.get("date")
            res = await execute_get_visit_stats(db, host_id, start_date=d, end_date=d, group_by="hour")
        elif tool_name == "get_visitors_by_department":
            s_d = tool_args.get("start_date")
            e_d = tool_args.get("end_date")
            res = await execute_get_visit_stats(db, host_id, start_date=s_d, end_date=e_d, group_by="department")
        elif tool_name == "get_status_breakdown":
            s_d = tool_args.get("start_date")
            e_d = tool_args.get("end_date")
            res = await execute_get_visit_stats(db, host_id, start_date=s_d, end_date=e_d, group_by="status")
        elif tool_name == "get_walkin_vs_preregistered":
            s_d = tool_args.get("start_date")
            e_d = tool_args.get("end_date")
            res = await execute_get_visit_stats(db, host_id, start_date=s_d, end_date=e_d, group_by="source")

        else:
            res = {"error": f"Unknown tool '{tool_name}'."}

        return _sanitize_for_json(res)

    except Exception as exc:
        return {"error": str(exc)}
