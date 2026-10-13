# Facility Features & Operational Workflows

## 1. Visitor Check-In Experience
Visitors can check in through two methods:
- **Self-Service Kiosk**:
  1. The visitor enters their contact information (First Name, Last Name, Email, Phone number).
  2. The visitor selects their host or enters their meeting purpose; if unsure, the AI host matcher recommends the appropriate employee based on department and role description.
  3. The badge generator generates a printable visitor badge PDF formatted for standard 100mm x 62mm thermal label paper with visitor name, host name, and check-in date.
- **Manual Reception Check-In**:
  A receptionist with permission `8_manual_override` can register a walk-in guest or check in an expected guest directly via the portal interface.

## 2. Visitor Checkout & Evacuation Safety
- **Guest Checkout**:
  When a visitor departs the building, the receptionist or host marks them checked out via `10_manage_checkout`. The record sets `checked_out_at` on the appointment.
- **Evacuation Roster (Emergency Protocol)**:
  In the event of an emergency evacuation, security personnel or administrators with permission `3_evacuation_roster` access the Evacuation Roster endpoint. The view provides a real-time list of visitors currently inside the facility (`status IN ('CHECKED_IN', 'IN_MEETING')`).
- **Emergency Lockdown**:
  When an emergency is active, the kiosk displays a full-screen emergency alert screen instructing visitors that the building is in evacuation mode and directs them to the nearest assembly point. Central operations with `1_central_ops` broadcasts the emergency state via SSE.

## 3. Host Scheduling & Shift Availability
- **Weekly Shifts (`HostShift`)**:
  Hosts configure recurring weekly working hours (e.g., Monday through Friday, 09:00 to 17:00).
- **Out-of-Office Holidays (`HostHoliday`)**:
  Hosts mark specific dates for planned leave or public holidays.
- **Live Availability Engine**:
  When evaluating host availability, the system verifies:
  1. Is today an active shift day for the host?
  2. Is current time within the host's shift hours?
  3. Is the host marked on holiday today?
  4. Is the host currently in an active meeting (`status = 'IN_MEETING'`)?
  If the host is unavailable, the appointment can be marked `NEEDS_REASSIGNMENT` so reception staff can reassign the visitor.

## 4. Guest Reassignment Protocol
When a host is unavailable, receptionists with permission `21_reassign_guests` can reassign the visitor to an on-shift colleague in the same department. Updating the appointment sets the new `host_id` and transitions the appointment status to `CHECKED_IN`.

## 5. Compliance Reporting & Audit Logs
Administrators with permission `5_compliance_reports` can audit historical visits, view aggregated trends, and generate compliance PDF exports. System actions, authentication events, status updates, and AI Assistant queries are recorded in the `audit_logs` table with user IDs, timestamps, and client IP addresses.
