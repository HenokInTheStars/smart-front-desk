'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar as CalendarIcon, Clock, Shield, Settings, 
  LogOut, Building, UserCheck, Lock, Activity,
  AlertCircle, FileText, Smartphone, Monitor, BadgeCheck, Bell, MessageSquare,
  Sun, Moon, X, BellRing
} from 'lucide-react';

import GlobalLobbyView from '@/components/portal/GlobalLobbyView';
import PersonalQueue from '@/components/portal/PersonalQueue';
import RoleManagement from '@/components/portal/RoleManagement';
import CentralOps from '@/components/portal/CentralOps';
import ManualCheckIn from '@/components/portal/ManualCheckIn';

// Batch 2 Imports
import HostFollowup from '@/components/portal/HostFollowup';
import KioskCustomization from '@/components/portal/KioskCustomization';

// Batch 3 Imports
import ManageDirectory from '@/components/portal/ManageDirectory';
import ComplianceReports from '@/components/portal/ComplianceReports';
import ManageAvailability from '@/components/portal/ManageAvailability';
import ReassignGuests from '@/components/portal/ReassignGuests';
import KioskCommunication from '@/components/portal/KioskCommunication';
import SecuritySettings from '@/components/portal/SecuritySettings';
import NotificationFeed from '@/components/portal/NotificationFeed';

import { useTheme } from 'next-themes';

export default function UnifiedPortal() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<string>('');
  const [sidePanel, setSidePanel] = useState<'notifications' | 'messages' | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toasts, setToasts] = useState<{id: string, title: string, message: string}[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef(false);

  // Request Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Poll for new appointments to trigger Chrome Notifications
  useEffect(() => {
    if (!currentUser) return;
    
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    const pollAppointments = async () => {
      try {
        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments`;
        // If not global lobby view, filter to just this user's appointments
        if (!currentUser.permissions?.includes('7_global_lobby_view') && currentUser.numeric_host_id) {
           url += `?host_id=${currentUser.numeric_host_id}`;
        }
        
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store'
        });
        
        if (res.ok) {
          const raw = await res.json();
          const apts = raw.data || [];
          
          if (!initialFetchDone.current) {
             seenIdsRef.current = new Set(apts.map((a: any) => `${a.id}-${a.status}`));
             initialFetchDone.current = true;
          } else {
             const newApts = apts.filter((a: any) => {
               if (seenIdsRef.current.has(`${a.id}-${a.status}`)) return false;
               return a.status === 'CHECKED_IN' || a.status === 'EXPECTED';
             });

             if (newApts.length > 0) {
               newApts.forEach((a: any) => seenIdsRef.current.add(`${a.id}-${a.status}`));
               
               const newToasts = newApts.map((apt: any) => {
                 const title = apt.status === 'CHECKED_IN' ? 'Guest Arrived' : 'New Guest Booking';
                 const hostName = apt.host?.full_name || 'you';
                 const guestName = apt.visitor?.full_name || 'A guest';
                 const actionWord = apt.status === 'CHECKED_IN' ? 'arrived for their' : 'booked a';
                 const msg = `${guestName} has ${actionWord} appointment with ${hostName}.`;
                 return { id: Math.random().toString(), title, message: msg };
               });
               
               setToasts(prev => [...prev, ...newToasts]);
               
               setTimeout(() => {
                 setToasts(prev => prev.filter(t => !newToasts.find(nt => nt.id === t.id)));
               }, 6000);

               if (typeof window !== 'undefined' && 'Notification' in window) {
                 if (Notification.permission === 'granted') {
                   const muteSounds = currentUser.preferences?.notifications?.mute_sounds;
                   
                   newToasts.forEach((t: any) => {
                     try {
                       new Notification(t.title, { body: t.message, silent: Boolean(muteSounds), icon: '/favicon.ico' });
                     } catch (err) {
                       console.error("Browser notification failed:", err);
                     }
                   });
                 } else {
                   console.log("Desktop notification skipped. Permission is:", Notification.permission);
                 }
               }
             }

             // Also make sure we add ALL new statuses to seenIdsRef so they don't trigger later
             apts.forEach((a: any) => seenIdsRef.current.add(`${a.id}-${a.status}`));
          }
        }
      } catch (err) {
        console.error("Notification poll error", err);
      }
    };

    pollAppointments();
    const intervalId = setInterval(pollAppointments, 10000); // Check every 10 seconds
    return () => clearInterval(intervalId);
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          
          if (meData.role) {
            const roleFormatted = meData.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
            document.title = `${roleFormatted} Portal | Smart Front Desk`;
          }
          
          if (meData.preferences?.theme) {
            setTheme(meData.preferences.theme);
          }

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
  }, []); // Remove setTheme from dependency array so it doesn't re-run and overwrite the theme

  const updateThemePreference = async (newTheme: string) => {
    setTheme(newTheme);
    const token = sessionStorage.getItem('access_token');
    if (!token || !currentUser) return;
    
    try {
      const payload = {
        preferences: {
          ...currentUser.preferences,
          theme: newTheme
        }
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setCurrentUser({...currentUser, preferences: payload.preferences});
      }
    } catch (err) {
      console.error('Failed to save theme to backend', err);
    }
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('access_token');
    router.push('/');
  };

  const hasPerm = (key: string) => permissions.includes(key);

  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans text-foreground">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
            <Lock size={24} />
          </div>
          <h2 className="text-xl font-bold">Authentication Required</h2>
          <p className="text-sm text-muted-foreground">{authError}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const flattenedNavItems = [
    { key: '1_central_ops', label: 'Central Operations', icon: <Activity size={16} /> },
    { key: '8_manual_override', label: 'Manual Check-in', icon: <UserCheck size={16} /> },
    { key: '21_reassign_guests', label: 'Reassign Guests', icon: <BellRing size={16} /> },
    { key: '13_personal_queue', label: 'Personal Queue', icon: <Users size={16} /> },
    { key: '5_compliance_reports', label: 'Compliance & Reports', icon: <FileText size={16} /> }
  ].filter(item => {
    if (item.key === '1_central_ops') return hasPerm('1_central_ops') || hasPerm('7_global_lobby_view');
    return hasPerm(item.key);
  });

  const settingsRoles = [
    { key: '15_manage_availability', label: 'My Schedule', icon: <Clock size={16} /> },
    { key: '4_manage_directory', label: 'Employee Directory', icon: <FileText size={16} /> },
    { key: '6_manage_roles', label: 'User & Role Mgt', icon: <Users size={16} /> },
    { key: '20_kiosk_customization', label: 'Content Management', icon: <Monitor size={16} /> },
    { key: 'settings', label: 'Security & Settings', icon: <Settings size={16} /> }
  ].filter(item => hasPerm(item.key) || item.key === 'settings');

  const renderContent = () => {
    switch (activeTab) {
      case '1_central_ops': return <CentralOps currentUser={currentUser} />;
      case '4_manage_directory': return <ManageDirectory currentUser={currentUser} />;
      case '5_compliance_reports': return <ComplianceReports currentUser={currentUser} />;
      case '6_manage_roles': return <RoleManagement currentUser={currentUser} />;
      case '8_manual_override': return <ManualCheckIn currentUser={currentUser} />;
      case '20_kiosk_customization': return <KioskCustomization currentUser={currentUser} />;
      case '13_personal_queue': return <PersonalQueue currentUser={currentUser} />;
      case '15_manage_availability': return <ManageAvailability currentUser={currentUser} />;
      case '21_reassign_guests': return <ReassignGuests currentUser={currentUser} />;
      case '17_kiosk_communication': return <KioskCommunication currentUser={currentUser} />;
      case '19_notification_feed': return <NotificationFeed currentUser={currentUser} />;
      case 'settings': return <SecuritySettings currentUser={currentUser} />;
      
      case 'no_access': return (
        <div className="p-8 text-center mt-20 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mx-auto mb-4 border border-destructive/20">
             <Shield size={32} />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Operational Permissions</h2>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            Your account has not been assigned any active operational modules. Please contact your Super Admin for access.
          </p>
        </div>
      );
      default: return (
        <div className="p-8 text-center mt-20">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground mx-auto mb-4">
            <Clock size={32} />
          </div>
          <h1 className="text-lg font-bold text-foreground">
            {flattenedNavItems.find(i => i.key === activeTab)?.label || settingsRoles.find(i => i.key === activeTab)?.label || 'Module'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">This module is scheduled for development in the next phase.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans antialiased overflow-hidden selection:bg-primary selection:text-primary-foreground">
      
      {/* Top Header */}
      <header className="h-16 bg-card border-b border-border px-8 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            <Building size={16} strokeWidth={2} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Smart Front Desk</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Header Icons for Notifications and Messages */}
          {(hasPerm('19_notification_feed') || hasPerm('16_arrival_alerts')) && (
            <button 
              onClick={() => setSidePanel(sidePanel === 'notifications' ? null : 'notifications')}
              className={`p-2 rounded-full transition-colors ${sidePanel === 'notifications' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
              title="Arrival Alerts / Notifications"
            >
              <Bell size={20} />
            </button>
          )}

          {hasPerm('17_kiosk_communication') && (
            <button 
              onClick={() => setSidePanel(sidePanel === 'messages' ? null : 'messages')}
              className={`p-2 rounded-full transition-colors ${sidePanel === 'messages' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
              title="Kiosk Messages"
            >
              <MessageSquare size={20} />
            </button>
          )}
          
          <div className="w-px h-6 bg-border mx-1"></div>
          
          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border border-primary/20 overflow-hidden">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.full_name?.[0] || 'U'
                )}
              </div>
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Profile Header */}
                <div className="p-4 flex items-center gap-3 border-b border-border/50">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border border-primary/20 shrink-0 overflow-hidden">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.full_name?.[0] || 'U'
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-foreground truncate">{currentUser?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                  </div>
                </div>

                {/* Theme Toggle */}
                <div className="p-2 border-b border-border/50">
                  <div className="flex items-center bg-muted/50 p-1 rounded-xl">
                    <button onClick={() => updateThemePreference('light')} className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-card shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`} title="Light Mode">
                      <Sun size={14} />
                    </button>
                    <button onClick={() => updateThemePreference('dark')} className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-card shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`} title="Dark Mode">
                      <Moon size={14} />
                    </button>
                    <button onClick={() => updateThemePreference('system')} className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${theme === 'system' ? 'bg-card shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`} title="System Match">
                      <Monitor size={14} />
                    </button>
                  </div>
                </div>

                {/* Settings Links */}
                <div className="p-2 space-y-0.5 border-b border-border/50">
                  {settingsRoles.map(item => (
                    <button
                      key={item.key}
                      onClick={() => { setActiveTab(item.key); setIsProfileOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeTab === item.key 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Log Out */}
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Horizontal Navigation Bar (The Tabs) */}
      {flattenedNavItems.length > 0 && (
        <div className="bg-card/50 backdrop-blur-sm border-b border-border flex justify-center z-10 overflow-x-auto w-full" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-6 px-8 max-w-7xl w-full justify-center">
            {flattenedNavItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`flex items-center gap-2 py-3 px-1 text-[13px] font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === item.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Slide-Over Side Panel (Notifications & Messages) */}
      {sidePanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/10 backdrop-blur-sm transition-all duration-300">
           {/* Click away to close */}
           <div className="absolute inset-0" onClick={() => setSidePanel(null)}></div>
           
           {/* Panel Body */}
           <div className="relative w-full max-w-md bg-card shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-5 border-b border-border flex justify-between items-center bg-card/80 backdrop-blur-md shrink-0">
               <h2 className="font-black text-xl tracking-tight text-foreground">
                 {sidePanel === 'notifications' ? 'Arrival Alerts' : 'Kiosk Messages'}
               </h2>
               <button onClick={() => setSidePanel(null)} className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors text-muted-foreground"><X size={16}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto overflow-x-hidden">
               {sidePanel === 'notifications' && <NotificationFeed currentUser={currentUser} isPanel={true} />}
               {sidePanel === 'messages' && <KioskCommunication currentUser={currentUser} isPanel={true} />}
             </div>
           </div>
        </div>
      )}
      {/* In-App Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-card border border-border shadow-lg rounded-xl p-4 w-80 animate-in slide-in-from-right-8 fade-in duration-300">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Bell size={14} className="text-primary" /> {toast.title}
              </h4>
              <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
