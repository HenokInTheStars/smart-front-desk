from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID

RoleEnum = Literal["SUPER_ADMIN", "ADMIN", "RECEPTION", "HOST", "OTHER"]

# Standard System Permissions Catalog
ALL_SYSTEM_PERMISSIONS = [
    {"key": "1_central_ops", "label": "Central Operations & Command", "category": "System", "description": "Full oversight of configuration, settings, and infrastructure health."},
    {"key": "2_live_stream", "label": "Live Visitor Stream", "category": "System", "description": "Access to unfiltered, raw data stream of all check-ins/outs."},
    {"key": "3_evacuation_roster", "label": "Evacuation Roster", "category": "Security", "description": "Instant access to master list of everyone inside for emergencies."},
    {"key": "4_manage_directory", "label": "Staff & Host Directory Management", "category": "Administration", "description": "Manually add/edit/remove employee profiles or configure sync."},
    {"key": "5_compliance_reports", "label": "Compliance & Reports", "category": "Administration", "description": "Generate historical reports, manage data retention and security."},
    {"key": "6_manage_roles", "label": "Role & Permission Assignment", "category": "Administration", "description": "Grant granular permissions to other users."},
    {"key": "7_global_lobby_view", "label": "Live Lobby View", "category": "Reception", "description": "Global dashboard showing all expected and current visitors."},
    {"key": "8_manual_override", "label": "Manual Overrides & Check-In", "category": "Reception", "description": "Bypass kiosk to manually check in a guest or verify ID."},
    {"key": "9_manage_badges", "label": "Badge Printing Management", "category": "Reception", "description": "Oversee thermal printers and re-print badges."},
    {"key": "10_manage_checkout", "label": "Checkout Management", "category": "Reception", "description": "Ensure guests are checked out upon departure."},
    {"key": "11_monitor_watchlists", "label": "Watchlist & Blocklist Monitoring", "category": "Security", "description": "Receive silent alerts for flagged individuals at the kiosk."},
    {"key": "12_host_followup", "label": "Host Follow-up", "category": "Reception", "description": "Ping/call unresponsive hosts for waiting visitors."},
    {"key": "13_personal_queue", "label": "Personal Visitor Queue", "category": "Host", "description": "Private dashboard for personal guests and active meetings."},
    {"key": "14_pre_register", "label": "Guest Pre-Registration", "category": "Host", "description": "Pre-book a guest for a future date (sends QR code)."},
    {"key": "15_manage_availability", "label": "Schedule & Availability Management", "category": "Host", "description": "Set real-time status updates (Available, In Meeting, OOO)."},
    {"key": "16_arrival_alerts", "label": "Real-Time Arrival Alerts", "category": "Host", "description": "Receive instant notifications upon guest arrival."},
    {"key": "17_kiosk_communication", "label": "Two-Way Kiosk Communication", "category": "Host", "description": "Send quick replies to the kiosk."},
    {"key": "18_meeting_status", "label": "Meeting Status Updates", "category": "Host", "description": "Manually progress visitor status (Waiting -> In Meeting -> Completed)."},
    {"key": "20_kiosk_customization", "label": "Kiosk Branding & Customization", "category": "Administration", "description": "Change kiosk background images and text."}
]

DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "SUPER_ADMIN": [
        "1_central_ops", "2_live_stream", "3_evacuation_roster", "4_manage_directory", 
        "5_compliance_reports", "6_manage_roles", "7_global_lobby_view", "8_manual_override", 
        "9_manage_badges", "10_manage_checkout", "11_monitor_watchlists", "12_host_followup",
        "13_personal_queue", "14_pre_register", "15_manage_availability", "16_arrival_alerts",
        "17_kiosk_communication", "18_meeting_status", "20_kiosk_customization"
    ],
    "ADMIN": [
        "1_central_ops", "2_live_stream", "3_evacuation_roster", "4_manage_directory", 
        "5_compliance_reports", "6_manage_roles", "20_kiosk_customization"
    ],
    "RECEPTION": [
        "7_global_lobby_view", "8_manual_override", "9_manage_badges", "10_manage_checkout", 
        "11_monitor_watchlists", "12_host_followup"
    ],
    "HOST": [
        "13_personal_queue", "14_pre_register", "15_manage_availability", "16_arrival_alerts",
        "17_kiosk_communication", "18_meeting_status"
    ],
    "OTHER": []
}


def get_effective_permissions(role: str, permissions_str: Optional[str] = None) -> List[str]:
    """Calculates active permissions: uses custom explicit permissions if set, else role defaults."""
    if permissions_str and permissions_str.strip():
        return [p.strip() for p in permissions_str.split(",") if p.strip()]
    return DEFAULT_ROLE_PERMISSIONS.get(role, [])


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: RoleEnum = "HOST"
    custom_role_name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserRoleUpdate(BaseModel):
    role: Optional[RoleEnum] = None
    custom_role_name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class UserAdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    new_password: Optional[str] = None


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: RoleEnum
    custom_role_name: Optional[str] = None
    description: Optional[str] = None
    permissions: List[str] = []
    preferences: dict = {}
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class RoleDefinition(BaseModel):
    role: RoleEnum
    description: str
    default_permissions: List[str]


class CustomRoleCreate(BaseModel):
    role: RoleEnum
    description: str = ""
    permissions: List[str] = []
