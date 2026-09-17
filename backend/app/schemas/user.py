from typing import Optional, List, Dict
from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID

# Standard System Permissions Catalog
ALL_SYSTEM_PERMISSIONS = [
    {
        "key": "view_queue",
        "label": "Live Lobby Queue",
        "category": "Front Desk",
        "description": "View real-time waiting visitors in lobby and kiosk check-ins"
    },
    {
        "key": "manual_checkin",
        "label": "Manual Check-In",
        "category": "Front Desk",
        "description": "Manually register walk-ins and direct visitors to hosts"
    },
    {
        "key": "print_badge",
        "label": "Print Badges",
        "category": "Front Desk",
        "description": "Generate and print visitor ID badges"
    },
    {
        "key": "admit_visitor",
        "label": "Admit & Meeting Control",
        "category": "Host Operations",
        "description": "Admit checked-in visitors, extend timers, and complete meetings"
    },
    {
        "key": "manage_schedules",
        "label": "Manage Schedule & Shifts",
        "category": "Host Operations",
        "description": "Set weekly working shifts and out-of-office dates"
    },
    {
        "key": "pre_register",
        "label": "Pre-Register Guests",
        "category": "Host Operations",
        "description": "Schedule anticipated guests before they arrive"
    },
    {
        "key": "view_reports",
        "label": "Export Reports & SLA",
        "category": "Administration",
        "description": "Generate daily traffic summaries, SLA compliance, and security audits"
    },
    {
        "key": "manage_users",
        "label": "Manage Users & Roles",
        "category": "Administration",
        "description": "Grant or revoke user access, assign dynamic roles and permissions"
    },
    {
        "key": "system_logs",
        "label": "Security & Audit Logs",
        "category": "Administration",
        "description": "Access system diagnostic events and authentication audit trails"
    }
]

DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "SUPER_ADMIN": [
        "view_queue", "manual_checkin", "print_badge", "admit_visitor",
        "manage_schedules", "pre_register", "view_reports", "manage_users", "system_logs"
    ],
    "ADMIN": [
        "view_queue", "manual_checkin", "print_badge", "view_reports", "manage_users", "system_logs"
    ],
    "RECEPTION": [
        "view_queue", "manual_checkin", "print_badge", "pre_register"
    ],
    "HOST": [
        "admit_visitor", "manage_schedules", "pre_register"
    ],
    "OTHER": [
        "view_queue", "print_badge", "system_logs", "view_reports"
    ]
}


def get_effective_permissions(role: str, permissions_str: Optional[str] = None) -> List[str]:
    """Calculates active permissions: uses custom explicit permissions if set, else role defaults."""
    if permissions_str and permissions_str.strip():
        return [p.strip() for p in permissions_str.split(",") if p.strip()]
    return DEFAULT_ROLE_PERMISSIONS.get(role, [])


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "HOST"
    permissions: Optional[List[str]] = None


class UserRoleUpdate(BaseModel):
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    permissions: List[str] = []
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class RoleDefinition(BaseModel):
    role: str
    description: str
    default_permissions: List[str]


class CustomRoleCreate(BaseModel):
    role: str
    description: str = ""
    permissions: List[str] = []
