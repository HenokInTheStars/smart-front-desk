# Roles, Access Control & Permissions

## User Roles
The facility uses five distinct user roles defined in `user_role_enum`:
1. **SUPER_ADMIN**: Full system-level authority across all operations, security policies, and permission management.
2. **ADMIN**: Operational administrator managing facility directories, employee accounts, compliance audit logs, kiosk content customization, and system configuration.
3. **RECEPTION**: Front-desk operations staff responsible for welcoming visitors, managing the live lobby queue, manual check-ins, guest reassignment, and kiosk messaging.
4. **HOST**: Facility staff member who hosts visitors. Restricted strictly to their own appointments, personal visitor queue, schedule settings, and guest pre-registration. Host-scoping is derived on the server from the authenticated JWT user and cannot be bypassed.
5. **OTHER**: Custom internal staff profile configured with a customizable job title (`custom_role_name`) and selective permission keys.

## Permission Capabilities (12 Active Core Modules)
Permissions are stored as capability keys on user accounts and checked via UI navigation and `@router` route dependencies:
- `1_central_ops`: Central Operations & Live Lobby dashboard aggregating facility metrics, active check-ins, and visitor status.
- `8_manual_override`: Front desk reception desk for manual walk-in check-in, badge management, and guest checkout.
- `21_reassign_guests`: Receptionist tool to transfer a visitor from an unavailable or absent host to another available employee.
- `13_personal_queue`: Host's personal dashboard displaying scheduled and arrived guests for that host, guest pre-registration, and meeting status controls.
- `15_manage_availability`: Schedule management for hosts to configure recurring weekly shifts and out-of-office status.
- `17_kiosk_communication`: Two-way messaging interface allowing hosts and front desk to communicate directly with visitors at the kiosk.
- `19_notification_feed`: Real-time arrival notification bell and slide-out feed for guest arrivals and updates.
- `4_manage_directory`: Employee and department directory management (CRUD operations).
- `5_compliance_reports`: Access to historical compliance reports, visitor logs, and audit exports.
- `6_manage_roles`: Capability to provision user accounts, manage credentials, and grant/revoke permissions.
- `20_kiosk_customization`: Content and branding customization for kiosk displays (greetings, background media, and themes).
- `22_ai_assistant`: Interactive analytical AI assistant for real-time visitor traffic insights, charts, and natural language queries.

## Host Scoping Enforcement
For users with the `HOST` role, all queries, appointments, and AI Assistant analytics are strictly scoped to the host's own appointments (`Appointment.host_id == employee.id`). Host identification is resolved directly on the server from the authenticated user token, preventing any host from viewing other hosts' guests or analytics.
