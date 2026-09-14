---
version: 1.0.0
last_updated: 2026-09-14
status: Draft
author: Matrix
---

# Smart Front Desk: Feature & System Gaps

## Overview
While the current technical foundation provides basic endpoints for Visitors, Employees, and Appointments, a complete **Smart Front Desk System** requires several functional components to be viable for enterprise deployment. This document outlines the functional gaps between the current codebase and a fully featured front desk system.

---

## 1. Visitor Management & Check-In Experience
### Current State:
Basic check-in endpoint (`/visitors/checkin`) that takes a name and purpose, and generates a simple badge token.
### Gaps / Required Features:
- **Kiosk Mode UI:** A dedicated, locked-down frontend interface (e.g., for iPads at the front desk) for self-service check-in.
- **ID Verification:** Integration with a camera or scanner to capture and verify visitor IDs (Driver's License, Passport).
- **Badge Printing:** Integration with thermal label printers (e.g., Brother, Dymo) to automatically print visitor badges upon check-in.
- **Pre-registration:** Allow hosts to pre-register guests. Guests receive a QR code via email for instant scan-and-go check-in.
- **NDA & Document Signing:** Digital capture of signatures for Non-Disclosure Agreements or Health & Safety waivers during the check-in flow.

## 2. Host Notifications & Communication
### Current State:
The AI routes the visitor to a host, and an appointment is created in the database.
### Gaps / Required Features:
- **Real-Time Alerts:** Automatic notifications sent to the host when their guest arrives via Email, SMS, or messaging platforms (Slack/Microsoft Teams).
- **Two-Way Communication:** Allow the host to reply (e.g., "I'll be there in 5 minutes") which is then displayed to the visitor on the kiosk or via SMS.

## 3. Security & Compliance
### Current State:
Basic tracking of visitor entry time via the `created_at` timestamp.
### Gaps / Required Features:
- **Check-Out Flow:** Visitors must be able to check out when they leave to maintain an accurate roster of who is currently in the building.
- **Evacuation/Emergency List:** A one-click dashboard feature for security personnel to generate a list of all currently checked-in visitors in case of a fire or emergency.
- **Watchlists/Blocklists:** Ability for security to flag certain individuals, preventing them from checking in and silently alerting security personnel if they attempt to.

## 4. Admin Dashboard & Analytics
### Current State:
No frontend dashboard; only basic CRUD API endpoints exist.
### Gaps / Required Features:
- **Live Lobby View:** A web dashboard for receptionists to see expected visitors, currently checked-in visitors, and recently departed visitors.
- **Reporting & Analytics:** Historical data on visitor volumes, peak lobby times, and host statistics to optimize front desk staffing.
- **Directory Sync:** Automated syncing of the `Employee` table with Active Directory, Google Workspace, or HR systems (Workday, BambooHR) so the host list is always up-to-date.
