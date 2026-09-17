import pytest
from app.schemas.user import (
    ALL_SYSTEM_PERMISSIONS,
    DEFAULT_ROLE_PERMISSIONS,
    get_effective_permissions,
)
from app.routers.users import DYNAMIC_ROLE_REGISTRY


def test_permission_catalog_completeness():
    assert len(ALL_SYSTEM_PERMISSIONS) >= 9
    keys = [p["key"] for p in ALL_SYSTEM_PERMISSIONS]
    assert "view_queue" in keys
    assert "manual_checkin" in keys
    assert "print_badge" in keys
    assert "admit_visitor" in keys
    assert "manage_schedules" in keys
    assert "view_reports" in keys
    assert "manage_users" in keys
    assert "system_logs" in keys


def test_role_default_permissions_mapping():
    super_admin_perms = DEFAULT_ROLE_PERMISSIONS["SUPER_ADMIN"]
    assert "manage_users" in super_admin_perms
    assert "view_queue" in super_admin_perms

    reception_perms = DEFAULT_ROLE_PERMISSIONS["RECEPTION"]
    assert "view_queue" in reception_perms
    assert "print_badge" in reception_perms
    assert "manage_users" not in reception_perms

    host_perms = DEFAULT_ROLE_PERMISSIONS["HOST"]
    assert "admit_visitor" in host_perms
    assert "manage_schedules" in host_perms
    assert "view_reports" not in host_perms


def test_get_effective_permissions_fallback_and_custom():
    # Fallback to role defaults when no custom permissions string
    perms = get_effective_permissions("RECEPTION", None)
    assert "view_queue" in perms
    assert "print_badge" in perms

    # Custom override permissions string
    custom_perms = get_effective_permissions("HOST", "view_queue,print_badge,admit_visitor")
    assert "view_queue" in custom_perms
    assert "print_badge" in custom_perms
    assert "admit_visitor" in custom_perms
    assert "manage_schedules" not in custom_perms  # excluded from custom list


def test_dynamic_role_registry():
    assert "SUPER_ADMIN" in DYNAMIC_ROLE_REGISTRY
    assert "ADMIN" in DYNAMIC_ROLE_REGISTRY
    assert "RECEPTION" in DYNAMIC_ROLE_REGISTRY
    assert "HOST" in DYNAMIC_ROLE_REGISTRY
    assert "SECURITY" in DYNAMIC_ROLE_REGISTRY
    assert "AUDITOR" in DYNAMIC_ROLE_REGISTRY
