import pytest
from app.schemas.user import (
    ALL_SYSTEM_PERMISSIONS,
    DEFAULT_ROLE_PERMISSIONS,
    get_effective_permissions,
)
from app.routers.users import DYNAMIC_ROLE_REGISTRY


def test_permission_catalog_completeness():
    assert len(ALL_SYSTEM_PERMISSIONS) == 12
    keys = [p["key"] for p in ALL_SYSTEM_PERMISSIONS]
    assert "1_central_ops" in keys
    assert "8_manual_override" in keys
    assert "21_reassign_guests" in keys
    assert "13_personal_queue" in keys
    assert "15_manage_availability" in keys
    assert "17_kiosk_communication" in keys
    assert "19_notification_feed" in keys
    assert "4_manage_directory" in keys
    assert "5_compliance_reports" in keys
    assert "6_manage_roles" in keys
    assert "20_kiosk_customization" in keys
    assert "22_ai_assistant" in keys


def test_role_default_permissions_mapping():
    super_admin_perms = DEFAULT_ROLE_PERMISSIONS["SUPER_ADMIN"]
    assert "6_manage_roles" in super_admin_perms
    assert "1_central_ops" in super_admin_perms
    assert "22_ai_assistant" in super_admin_perms

    reception_perms = DEFAULT_ROLE_PERMISSIONS["RECEPTION"]
    assert "1_central_ops" in reception_perms
    assert "8_manual_override" in reception_perms
    assert "21_reassign_guests" in reception_perms
    assert "6_manage_roles" not in reception_perms

    host_perms = DEFAULT_ROLE_PERMISSIONS["HOST"]
    assert "13_personal_queue" in host_perms
    assert "15_manage_availability" in host_perms
    assert "17_kiosk_communication" in host_perms
    assert "5_compliance_reports" not in host_perms


def test_get_effective_permissions_fallback_and_custom():
    # Fallback to role defaults when no custom permissions string
    perms = get_effective_permissions("RECEPTION", None)
    assert "1_central_ops" in perms
    assert "8_manual_override" in perms

    # Custom override permissions string
    custom_perms = get_effective_permissions("HOST", "1_central_ops,8_manual_override,13_personal_queue")
    assert "1_central_ops" in custom_perms
    assert "8_manual_override" in custom_perms
    assert "13_personal_queue" in custom_perms
    assert "15_manage_availability" not in custom_perms  # excluded from custom list


def test_dynamic_role_registry():
    assert "SUPER_ADMIN" in DYNAMIC_ROLE_REGISTRY
    assert "ADMIN" in DYNAMIC_ROLE_REGISTRY
    assert "RECEPTION" in DYNAMIC_ROLE_REGISTRY
    assert "HOST" in DYNAMIC_ROLE_REGISTRY
    assert "OTHER" in DYNAMIC_ROLE_REGISTRY
