export interface SystemPermission {
  id: string;
  label: string;
  category: 'Operations' | 'Reception' | 'Host' | 'Admin' | 'Intelligence';
  description?: string;
}

export const ALL_PERMISSIONS: SystemPermission[] = [
  { 
    id: '1_central_ops', 
    label: 'Central Operations & Live Lobby', 
    category: 'Operations', 
    description: 'Central command operations dashboard aggregating facility health and alerts.' 
  },
  { 
    id: '8_manual_override', 
    label: 'Front Desk & Manual Check-in', 
    category: 'Reception', 
    description: 'Desk operations for manual visitor check-ins, badge printing, and walk-in handling.' 
  },
  { 
    id: '21_reassign_guests', 
    label: 'Reassign Guests', 
    category: 'Reception', 
    description: 'Transfer waiting visitors to other available team members or hosts.' 
  },
  { 
    id: '13_personal_queue', 
    label: 'Personal Visitor Queue', 
    category: 'Host', 
    description: 'Host dashboard for personal guest appointments, pre-registration, and meeting status.' 
  },
  { 
    id: '15_manage_availability', 
    label: 'Schedule Management', 
    category: 'Host', 
    description: 'Set working hours, availability status (Available, In Meeting, OOO), and shifts.' 
  },
  { 
    id: '17_kiosk_communication', 
    label: 'Kiosk Two-Way Comms', 
    category: 'Host', 
    description: 'Real-time communication and custom quick replies directly to the front kiosk.' 
  },
  { 
    id: '19_notification_feed', 
    label: 'Arrival Alerts & Notifications', 
    category: 'Host', 
    description: 'Real-time arrival notification bell and slide-out feed for guest arrivals and updates.' 
  },
  { 
    id: '4_manage_directory', 
    label: 'Staff & Host Directory Management', 
    category: 'Admin', 
    description: 'Manually add, edit, or remove employee profiles and directory sync.' 
  },
  { 
    id: '5_compliance_reports', 
    label: 'Compliance & Audit Reports', 
    category: 'Admin', 
    description: 'Access historical visitor records, security compliance audits, and data exports.' 
  },
  { 
    id: '6_manage_roles', 
    label: 'User & Role Management', 
    category: 'Admin', 
    description: 'Provision user accounts, configure roles, and assign granular permissions.' 
  },
  { 
    id: '20_kiosk_customization', 
    label: 'Kiosk Branding & Content', 
    category: 'Admin', 
    description: 'Configure front desk kiosk greetings, themes, background media, and interface text.' 
  },
  { 
    id: '22_ai_assistant', 
    label: 'AI Executive Assistant', 
    category: 'Intelligence', 
    description: 'Natural language analytical assistant for real-time visitor traffic and facility insights.' 
  }
];
