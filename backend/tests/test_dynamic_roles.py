import pytest
from app.schemas.user import (
    ALL_SYSTEM_PERMISSIONS,
    DEFAULT_ROLE_PERMISSIONS,
    get_effective_permissions,
)
from app.routers.users import DYNAMIC_ROLE_REGISTRY


def test_permission_catalog_completeness():
    assert len(ALL_SYSTEM_PERMISSIONS) >= 20
    keys = [p["key"] for p in ALL_SYSTEM_PERMISSIONS]
    assert "7_global_lobby_view" in keys
    assert "8_manual_override" in keys
    assert "9_manage_badges" in keys
    assert "18_meeting_status" in keys
    assert "15_manage_availability" in keys
    assert "5_compliance_reports" in keys
    assert "6_manage_roles" in keys
    assert "1_central_ops" in keys


def test_role_default_permissions_mapping():
    super_admin_perms = DEFAULT_ROLE_PERMISSIONS["SUPER_ADMIN"]
    assert "6_manage_roles" in super_admin_perms
    assert "7_global_lobby_view" in super_admin_perms

    reception_perms = DEFAULT_ROLE_PERMISSIONS["RECEPTION"]
    assert "7_global_lobby_view" in reception_perms
    assert "9_manage_badges" in reception_perms
    assert "6_manage_roles" not in reception_perms

    host_perms = DEFAULT_ROLE_PERMISSIONS["HOST"]
    assert "18_meeting_status" in host_perms
    assert "15_manage_availability" in host_perms
    assert "5_compliance_reports" not in host_perms


def test_get_effective_permissions_fallback_and_custom():
    # Fallback to role defaults when no custom permissions string
    perms = get_effective_permissions("RECEPTION", None)
    assert "7_global_lobby_view" in perms
    assert "9_manage_badges" in perms

    # Custom override permissions string
    custom_perms = get_effective_permissions("HOST", "7_global_lobby_view,9_manage_badges,18_meeting_status")
    assert "7_global_lobby_view" in custom_perms
    assert "9_manage_badges" in custom_perms
    assert "18_meeting_status" in custom_perms
    assert "15_manage_availability" not in custom_perms  # excluded from custom list


def test_dynamic_role_registry():
    assert "SUPER_ADMIN" in DYNAMIC_ROLE_REGISTRY
    assert "ADMIN" in DYNAMIC_ROLE_REGISTRY
    assert "RECEPTION" in DYNAMIC_ROLE_REGISTRY
    assert "HOST" in DYNAMIC_ROLE_REGISTRY
    assert "OTHER" in DYNAMIC_ROLE_REGISTRY
