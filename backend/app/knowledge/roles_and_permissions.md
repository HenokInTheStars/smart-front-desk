# Roles, Access Control & Permissions

## User Roles
The facility uses five distinct user roles defined in `user_role_enum`:
1. **SUPER_ADMIN**: Full system-level authority across all operations, security policies, and permission management.
2. **ADMIN**: Operational administrator managing facility directories, employee accounts, compliance audit logs, and system configuration.
3. **RECEPTION**: Front-desk operations staff responsible for welcoming visitors, managing the live lobby queue, manual overrides, reassignment, and visitor checkout.
4. **HOST**: Facility staff member who hosts visitors. Restricted strictly to their own appointments, personal visitor queue, schedule settings, and guest pre-registration. Host-scoping is derived on the server from the authenticated JWT user and cannot be bypassed.
5. **OTHER**: Custom internal staff profile configured with a customizable job title (`custom_role_name`) and selective permission keys.

## Permission Capabilities (18 Core Modules)
Permissions are stored as capability keys on user accounts and checked via `@router` route dependencies:
- `1_central_ops`: Central command operations dashboard aggregating facility health and alerts.
- `2_live_stream`: Real-time streaming log of visitor check-in and checkout events.
- `3_evacuation_roster`: Security evacuation muster roll displaying all visitors currently physically in the building.
- `4_manage_directory`: Employee and department directory management (CRUD operations).
- `5_compliance_reports`: Access to historical compliance reports, visitor logs, and PDF compliance exports.
- `6_manage_roles`: Capability to provision roles and grant/revoke permissions for users.
- `7_global_lobby_view`: Reception view of all expected, waiting, and active visitors across all hosts.
- `8_manual_override`: Front desk ability to perform manual walk-in registration, badge printing, and manual check-ins.
- `10_manage_checkout`: Receptionist capability to check out guests upon departure and mark badges returned.
- `11_monitor_watchlists`: Security watchlist monitoring capability.
- `12_host_followup`: Facility reception tool to send reminders and notifications to hosts about waiting guests.
- `13_personal_queue`: Host's personal dashboard tab displaying scheduled and arrived guests for that host only.
- `14_pre_register`: Advance guest booking tool allowing hosts to pre-register visitors.
- `15_manage_availability`: Schedule management for hosts to configure recurring weekly shifts and out-of-office holidays.
- `17_kiosk_communication`: Two-way messaging interface allowing hosts to communicate directly with visitors at the kiosk.
- `18_meeting_status`: Meeting controls allowing hosts to transition appointments from `IN_MEETING` to `COMPLETED`.
- `21_reassign_guests`: Receptionist tool to transfer a visitor from an unavailable or absent host to another available employee.
- `22_ai_assistant`: Read-only access to the AI Executive Assistant analytics tool and chatbot.

## Host Scoping Enforcement
For users with the `HOST` role, all queries, appointments, and AI Assistant analytics are strictly scoped to the host's own appointments (`Appointment.host_id == employee.id`). Host identification is resolved directly on the server from the authenticated user token, preventing any host from viewing other hosts' guests or analytics.
