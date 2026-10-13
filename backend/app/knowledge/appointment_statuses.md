# Appointment Lifecycle & Status Definitions

## Appointment Status Enum Values
The system tracks appointments using eight discrete lifecycle states defined in `appointment_status_enum`:

1. **SCHEDULED**: The visit has been pre-registered or scheduled for an upcoming date/time. The visitor has not yet arrived on premises.
2. **EXPECTED**: The appointment is scheduled for today during current business hours, and the front desk is anticipating the visitor's arrival.
3. **CHECKED_IN**: The visitor has arrived at the kiosk or front desk reception, completed check-in, and received a badge. The visitor is physically in the reception lobby waiting for their host.
4. **IN_MEETING**: The host has received the visitor in the lobby and transitioned the appointment into an active meeting session.
5. **COMPLETED**: The appointment has concluded. The visitor has either been marked completed by the host or checked out at the front desk with badge returned.
6. **CANCELLED**: The appointment was cancelled by the host, visitor, or administrator prior to check-in.
7. **NEEDS_REASSIGNMENT**: The assigned host is unavailable, off shift, or on holiday when the visitor arrives. The visit appears on reception's Reassign Guests dashboard to assign an alternate host.
8. **NO_SHOW**: The visitor failed to arrive for their scheduled appointment during the allotted time window.

## Key Operational Metrics & Definitions
- **"Visitor Came" / "Arrived"**: An appointment where arrival is verified by a non-null `checked_in_at` timestamp. This includes records with status `CHECKED_IN`, `IN_MEETING`, or `COMPLETED`.
- **"Walk-in"**: A visitor who registered on-site at reception or kiosk without advance booking. In analytics, walk-ins are identified by visitor emails starting with `walkin_` (`Visitor.email.ilike('walkin_%')`).
- **"Pre-registered"**: A visit created in advance by a host or administrator. In analytics, pre-registered visits are identified by visitor emails not starting with `walkin_` (`Visitor.email.notilike('walkin_%')`).
- **"Visit Duration"**: The total elapsed meeting duration, calculated as `completed_at - checked_in_at` (only valid for visits where both timestamps exist).
- **"No-Show Rate"**: Percentage of scheduled appointments where the visitor never arrived: `(NO_SHOW count / total scheduled appointments) * 100`.
- **"Cancellation Rate"**: Percentage of scheduled appointments cancelled prior to arrival: `(CANCELLED count / total scheduled appointments) * 100`.
- **"Unfulfilled Rate"**: Combined rate of no-shows and cancellations: `((NO_SHOW + CANCELLED) / total scheduled) * 100`.
