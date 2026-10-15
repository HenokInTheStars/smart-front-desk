from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID

RoleEnum = Literal["SUPER_ADMIN", "ADMIN", "RECEPTION", "HOST", "OTHER"]

# Standard System Permissions Catalog (Active Core Capabilities)
ALL_SYSTEM_PERMISSIONS = [
    {"key": "1_central_ops", "label": "Central Operations & Live Lobby", "category": "Operations", "description": "Full oversight of configuration, settings, lobby queue, and infrastructure health."},
    {"key": "8_manual_override", "label": "Front Desk & Manual Check-in", "category": "Reception", "description": "Desk operations for manual visitor check-ins, badge printing, and walk-in handling."},
    {"key": "21_reassign_guests", "label": "Reassign Guests", "category": "Reception", "description": "Transfer waiting visitors to other available team members or hosts."},
    {"key": "13_personal_queue", "label": "Personal Visitor Queue", "category": "Host", "description": "Host dashboard for personal guest appointments, pre-registration, and meeting status."},
    {"key": "15_manage_availability", "label": "Schedule Management", "category": "Host", "description": "Set working hours, availability status (Available, In Meeting, OOO), and shifts."},
    {"key": "17_kiosk_communication", "label": "Kiosk Two-Way Comms", "category": "Host", "description": "Real-time communication and custom quick replies directly to the front kiosk."},
    {"key": "19_notification_feed", "label": "Arrival Alerts & Notifications", "category": "Host", "description": "Real-time arrival notification bell and slide-out feed for guest arrivals and updates."},
    {"key": "4_manage_directory", "label": "Staff & Host Directory Management", "category": "Administration", "description": "Manually add, edit, or remove employee profiles and directory sync."},
    {"key": "5_compliance_reports", "label": "Compliance & Audit Reports", "category": "Administration", "description": "Access historical visitor records, security compliance audits, and data exports."},
    {"key": "6_manage_roles", "label": "User & Role Management", "category": "Administration", "description": "Provision user accounts, configure roles, and assign granular permissions."},
    {"key": "20_kiosk_customization", "label": "Kiosk Branding & Content", "category": "Administration", "description": "Configure front desk kiosk greetings, themes, background media, and interface text."},
    {"key": "22_ai_assistant", "label": "AI Executive Assistant", "category": "Intelligence", "description": "Natural language analytical assistant for real-time visitor traffic and facility insights."}
]

DEFAULT_ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "SUPER_ADMIN": [
        "1_central_ops", "4_manage_directory", "5_compliance_reports", 
        "6_manage_roles", "8_manual_override", "13_personal_queue", 
        "15_manage_availability", "17_kiosk_communication", "19_notification_feed",
        "20_kiosk_customization", "21_reassign_guests", "22_ai_assistant"
    ],
    "ADMIN": [
        "1_central_ops", "4_manage_directory", "5_compliance_reports", 
        "6_manage_roles", "19_notification_feed", "20_kiosk_customization", "22_ai_assistant"
    ],
    "RECEPTION": [
        "1_central_ops", "8_manual_override", "21_reassign_guests", "17_kiosk_communication", "19_notification_feed"
    ],
    "HOST": [
        "13_personal_queue", "15_manage_availability", "17_kiosk_communication", "19_notification_feed"
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
