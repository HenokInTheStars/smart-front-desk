'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar as CalendarIcon, Clock, Shield, Settings, 
  LogOut, Building, UserCheck, Lock, Activity, Users as UsersIcon,
  AlertCircle, FileText, Smartphone, Search, Monitor, BadgeCheck, Bell
} from 'lucide-react';

import GlobalLobbyView from '@/components/portal/GlobalLobbyView';
import PersonalQueue from '@/components/portal/PersonalQueue';
import RoleManagement from '@/components/portal/RoleManagement';
import CentralOps from '@/components/portal/CentralOps';
import PreRegisterForm from '@/components/portal/PreRegisterForm';
import ManualCheckIn from '@/components/portal/ManualCheckIn';

// Batch 2 Imports
import LiveStream from '@/components/portal/LiveStream';
import EvacuationRoster from '@/components/portal/EvacuationRoster';
import BadgeManagement from '@/components/portal/BadgeManagement';
import HostFollowup from '@/components/portal/HostFollowup';
import KioskCustomization from '@/components/portal/KioskCustomization';

// Batch 3 Imports
import ManageDirectory from '@/components/portal/ManageDirectory';
import ComplianceReports from '@/components/portal/ComplianceReports';
import ManageAvailability from '@/components/portal/ManageAvailability';
import ArrivalAlerts from '@/components/portal/ArrivalAlerts';
import KioskCommunication from '@/components/portal/KioskCommunication';
import MeetingStatus from '@/components/portal/MeetingStatus';
import SecuritySettings from '@/components/portal/SecuritySettings';
import NotificationFeed from '@/components/portal/NotificationFeed';

import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';

export default function UnifiedPortal() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        setAuthError('Authentication required. Please log in.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const dataRaw = await res.json();
          const meData = dataRaw.data !== undefined ? dataRaw.data : dataRaw;
          setCurrentUser(meData);
          setPermissions(meData.permissions || []);
          
          // Apply Theme from Preferences
          if (meData.preferences?.theme) {
            setTheme(meData.preferences.theme);
          }

          // Determine initial active tab
          let initialTab = '';
          const preferredModule = meData.preferences?.default_module;
          
          if (preferredModule && (preferredModule === 'settings' || (meData.permissions && meData.permissions.includes(preferredModule)))) {
            initialTab = preferredModule;
          } else if (meData.permissions && meData.permissions.length > 0) {
            initialTab = meData.permissions[0];
          } else {
             initialTab = 'no_access';
          }
          setActiveTab(initialTab);
        } else {
          setAuthError('Session expired. Please log in again.');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setAuthError('Error connecting to backend server.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = () => {
    sessionStorage.removeItem('access_token');
    router.push('/');
  };

  // Helper to check if user has a permission
  const hasPerm = (key: string) => permissions.includes(key);

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Authentication Required</h2>
          <p className="text-sm text-slate-500">{authError}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Define sidebar items based on the 18 specific permissions
  const sidebarItems = [
    { key: '1_central_ops', label: 'Central Operations', icon: <Activity size={18} /> },
    { key: '2_live_stream', label: 'Live Stream', icon: <Monitor size={18} /> },
    { key: '3_evacuation_roster', label: 'Evacuation Roster', icon: <AlertCircle size={18} /> },
    { key: '5_compliance_reports', label: 'Compliance & Reports', icon: <FileText size={18} /> },
    { key: '6_manage_roles', label: 'User & Role Mgt', icon: <Lock size={18} /> },
    { key: '7_global_lobby_view', label: 'Global Lobby View', icon: <Building size={18} /> },
    { key: '8_manual_override', label: 'Manual Check-in', icon: <UserCheck size={18} /> },
    { key: '9_manage_badges', label: 'Badge Printing', icon: <BadgeCheck size={18} /> },
    { key: '12_host_followup', label: 'Host Follow-up', icon: <Smartphone size={18} /> },
    { key: '20_kiosk_customization', label: 'Kiosk Branding', icon: <Settings size={18} /> },
    { key: '13_personal_queue', label: 'Personal Queue', icon: <Users size={18} /> },
    { key: '14_pre_register', label: 'Pre-Registration', icon: <CalendarIcon size={18} /> },
    { key: '15_manage_availability', label: 'My Schedule', icon: <Clock size={18} /> },
    { key: '16_arrival_alerts', label: 'Arrival Alerts Settings', icon: <AlertCircle size={18} /> },
    { key: '17_kiosk_communication', label: 'Kiosk Messages', icon: <Monitor size={18} /> },
    { key: '18_meeting_status', label: 'Meeting Controls', icon: <Activity size={18} /> },
    { key: '19_notification_feed', label: 'Notification Feed', icon: <Bell size={18} /> }
  ];

  // Render the appropriate content based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case '1_central_ops': return <CentralOps currentUser={currentUser} />;
      case '2_live_stream': return <LiveStream currentUser={currentUser} />;
      case '3_evacuation_roster': return <EvacuationRoster currentUser={currentUser} />;
      case '4_manage_directory': return <ManageDirectory currentUser={currentUser} />;
      case '5_compliance_reports': return <ComplianceReports currentUser={currentUser} />;
      case '6_manage_roles': return <RoleManagement currentUser={currentUser} />;
      case '7_global_lobby_view': return <GlobalLobbyView currentUser={currentUser} />;
      case '8_manual_override': return <ManualCheckIn currentUser={currentUser} />;
      case '9_manage_badges': return <BadgeManagement currentUser={currentUser} />;
      case '12_host_followup': return <HostFollowup currentUser={currentUser} />;
      case '20_kiosk_customization': return <KioskCustomization currentUser={currentUser} />;
      case '13_personal_queue': return <PersonalQueue currentUser={currentUser} />;
      case '14_pre_register': return <PreRegisterForm currentUser={currentUser} />;
      case '15_manage_availability': return <ManageAvailability currentUser={currentUser} />;
      case '16_arrival_alerts': return <ArrivalAlerts currentUser={currentUser} />;
      case '17_kiosk_communication': return <KioskCommunication currentUser={currentUser} />;
      case '18_meeting_status': return <MeetingStatus currentUser={currentUser} />;
      case '19_notification_feed': return <NotificationFeed currentUser={currentUser} />;
      case 'settings': return <SecuritySettings currentUser={currentUser} />;
      
      case 'no_access': return (
        <div className="p-8 text-center mt-20 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4 border border-rose-100">
             <Shield size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No Operational Permissions</h2>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">
            Your account has not been assigned any active operational modules. Please contact your Super Admin for access.
          </p>
        </div>
      );
      default: return (
        <div className="p-8 text-center mt-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Clock size={32} />
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            {activeTab === 'settings' ? 'Security & Settings' : sidebarItems.find(i => i.key === activeTab)?.label || 'Module'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">This module is scheduled for development in the next phase.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans antialiased overflow-hidden selection:bg-primary selection:text-primary-foreground">
      
      {/* Dynamic Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-10">
        <div className="h-16 flex items-center px-6 border-b border-border/60 bg-card">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            <Building size={16} strokeWidth={2} />
          </div>
          <div className="ml-3">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">Unified Portal</h1>
          </div>
        </div>

        {/* User Profile Snippet */}
        <div className="p-5 border-b border-border/60">
          <p className="text-[13px] font-bold text-foreground truncate">{currentUser?.full_name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{currentUser?.email}</p>
          <div className="mt-3 flex gap-1 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md uppercase tracking-wider">
              {currentUser?.role}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <div className="flex-1 overflow-y-auto py-5 px-4 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Your Modules</p>
          
          {sidebarItems.map(item => {
            if (hasPerm(item.key)) {
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all ${
                    activeTab === item.key 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground dark:bg-sidebar-primary dark:text-sidebar-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            }
            return null;
          })}
        </div>

        <div className="p-4 border-t border-border/60 space-y-2">
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all ${
              activeTab === 'settings' 
                ? 'bg-sidebar-accent text-sidebar-accent-foreground dark:bg-sidebar-primary dark:text-sidebar-primary-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Settings size={18} />
            <span className="truncate">Security & Settings</span>
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full py-2.5 px-3 bg-card hover:bg-destructive/5 border border-border hover:border-destructive/30 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border px-8 flex items-center justify-between shrink-0 shadow-[0_1px_10px_rgba(0,0,0,0.01)] z-10">
          <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
            {activeTab === 'settings' ? <Settings size={18} /> : sidebarItems.find(i => i.key === activeTab)?.icon}
            {activeTab === 'settings' ? 'Security & Settings' : sidebarItems.find(i => i.key === activeTab)?.label || 'Module'}
          </h2>
          <div className="flex items-center gap-4">
             <ThemeToggle />
             <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                {currentUser?.full_name?.[0] || 'U'}
              </div>
          </div>
        </header>

        {/* Dynamic Viewport */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
