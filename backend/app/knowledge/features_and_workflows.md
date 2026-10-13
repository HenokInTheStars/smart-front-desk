# Facility Features & Operational Workflows

## 1. Visitor Check-In Experience
Visitors can check in through two methods:
- **Self-Service Kiosk**:
  1. The visitor enters their contact information (First Name, Last Name, Email, Phone number).
  2. The visitor selects their host or enters their meeting purpose; if unsure, the AI host matcher recommends the appropriate employee based on department and role description.
  3. The badge generator generates a printable visitor badge PDF formatted for standard 100mm x 62mm thermal label paper with visitor name, host name, and check-in date.
- **Manual Reception Check-In**:
  1. Reception staff navigate to the sidebar tab **"Manual Check-in"**.
  2. On the **"Registration & Badges"** tab, click the **"New Registration"** button to open the check-in modal.
  3. In Step 1 (Visitor Info), fill in Full Name, Company / Visit Purpose, Host, Phone, and Email, then click **"Proceed to Verification"**.
  4. In Step 2 (Verification), capture visitor webcam photo or scan physical ID, then click **"Complete & Print Badge"**.

## 2. Visitor Checkout & Evacuation Safety
- **Guest Checkout**:
  1. Hosts navigate to the sidebar tab **"Personal Queue"**.
  2. On the **"Live Assigned Queue"** tab, locate the visitor currently marked with status `Meeting`.
  3. Click the **"Complete"** button in the Actions column to check out the visitor upon departure.
  4. This updates the appointment record status to `COMPLETED` and records `checked_out_at`.
- **Global Lobby View (Monitoring Only)**:
  Reception staff navigate to the sidebar tab **"Global Lobby View"** to monitor real-time premise activity, KPI cards ("Currently in Lobby", "In Active Meetings", "Expected Today"), and the live event stream. The Global Lobby View is strictly an observational feed and does not provide check-out action buttons; departures and visit completions are performed by hosts in their "Personal Queue".
- **Evacuation Roster (Emergency Protocol)**:
  In the event of an emergency evacuation, security personnel or administrators navigate to the sidebar tab **"Central Operations"** and select the **"Lobby & Perimeter"** tab. The view provides a real-time list of visitors currently inside the facility (`status IN ('CHECKED_IN', 'IN_MEETING')`).
- **Emergency Lockdown**:
  When an emergency is active, the kiosk displays a full-screen emergency alert screen instructing visitors that the building is in evacuation mode and directs them to the nearest assembly point. Central operations broadcasts the emergency state via SSE.

## 3. Host Scheduling & Shift Availability
- **My Schedule Navigation**:
  Hosts navigate to the sidebar tab **"My Schedule"**.
- **Real-Time Status**:
  Toggle status pills at the top: **"Available"**, **"In Meeting"**, or **"Out of Office"**.
- **Weekly Shifts (`HostShift`)**:
  Under Weekly Working Shifts, toggle days (Monday through Sunday) using checkboxes, set start and end times (e.g., 09:00 to 17:00), and click the **"Save Schedule"** button.
- **Out of Office Setup (`HostHoliday`)**:
  In the Out of Office Setup section, enter **"Start"** and **"End"** dates and click **"Save Schedule"**.
- **Live Availability Engine**:
  When evaluating host availability, the system verifies:
  1. Is today an active shift day for the host?
  2. Is current time within the host's shift hours?
  3. Is the host marked on holiday today?
  4. Is the host currently in an active meeting (`status = 'IN_MEETING'`)?
  If the host is unavailable, the appointment can be marked `NEEDS_REASSIGNMENT` so reception staff can reassign the visitor.

## 4. Guest Reassignment Protocol
1. When a host is unavailable or cancels an appointment in their **"Personal Queue"**, they click **"Cancel"**, enter an explanation, and click **"Confirm & Reassign"**.
2. Reception staff navigate to the sidebar tab **"Reassign Guests"**.
3. In the Active Alerts list, click the **"Reassign"** button next to the guest.
4. Select a replacement employee from the **"Select new host..."** dropdown.
5. Click **"Confirm"** to assign the new host and set the appointment status back to `CHECKED_IN`. (Alternatively, click **"Dismiss"** to cancel the appointment).

## 5. Compliance Reporting & Audit Logs
1. Administrators navigate to the sidebar tab **"Compliance & Reports"**.
2. Browse reporting tabs: **"Guest Insights"**, **"Host Metrics"**, **"Flow Dynamics"**, and **"PDF Exports"**.
3. Under **"PDF Exports"**, select a report card (such as **"Traffic Summary"**) and click **"Export PDF"** to open a preview modal, then click **"Download PDF"** to save the file.
4. System actions, authentication events, status updates, and AI Assistant queries are recorded in the `audit_logs` table with user IDs, timestamps, and client IP addresses.
