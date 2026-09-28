'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Key, Bell, BellOff, Smartphone, CheckCircle2, AlertTriangle, Monitor, Save } from 'lucide-react';
import { useTheme } from 'next-themes';

interface SecuritySettingsProps {
  currentUser: any;
}

export default function SecuritySettings({ currentUser }: SecuritySettingsProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Profile state
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');

  // Preference state
  const [defaultModule, setDefaultModule] = useState(currentUser?.preferences?.default_module || 'dashboard');
  const [notifications, setNotifications] = useState({
    email: currentUser?.preferences?.notifications?.email ?? true,
    sms: currentUser?.preferences?.notifications?.sms ?? false,
    mute_sounds: currentUser?.preferences?.notifications?.mute_sounds ?? false,
  });

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      const payload = {
        email: email !== currentUser?.email ? email : undefined,
        phone: phone !== currentUser?.phone ? phone : undefined,
        preferences: {
          ...currentUser?.preferences,
          default_module: defaultModule,
          notifications,
          theme: theme 
        }
      };

      const res = await fetch('http://localhost:8000/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save preferences');
      
      // Update local storage or just show success
      alert('Preferences saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    setIsPasswordSaving(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      const payload = {
        current_password: currentPassword,
        new_password: newPassword
      };

      const res = await fetch('http://localhost:8000/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update password');
      }

      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Security & Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account security, notifications, and personalize your workspace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Personalization & Notifications */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Contact Information & Display */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
             <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
               <Monitor size={16} className="text-primary" /> Profile & Display
             </h2>
             
             <div className="space-y-5">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-foreground/90 mb-1">Email Address</label>
                   <input 
                     type="email" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-foreground/90 mb-1">Phone Number</label>
                   <input 
                     type="tel" 
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder="+1 (555) 000-0000"
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-foreground/90 mb-2">Default Startup Module</label>
                 <select 
                   value={defaultModule}
                   onChange={(e) => setDefaultModule(e.target.value)}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                 >
                   <option value="dashboard">Dashboard Overview</option>
                   <option value="live_stream">Live Visitor Stream</option>
                   <option value="central_ops">Central Operations</option>
                   <option value="manage_availability">Schedule & Availability</option>
                   <option value="global_lobby_view">Live Lobby View</option>
                 </select>
                 <p className="text-[10px] text-muted-foreground mt-1.5">This module will automatically open when you log into the portal.</p>
               </div>
             </div>
          </div>

          {/* Notifications */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
             <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
               <Bell size={16} className="text-primary" /> Notifications & Alerts
             </h2>
             
             <div className="space-y-3">
               <label className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${notifications.email ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                     <AlertTriangle size={16} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">Email Notifications</p>
                     <p className="text-[10px] text-muted-foreground">Receive daily summaries and critical alerts</p>
                   </div>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={notifications.email} 
                   onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                   className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                 />
               </label>

               <label className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${notifications.sms ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                     <Smartphone size={16} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">SMS Alerts</p>
                     <p className="text-[10px] text-muted-foreground">Instant text messages for guest arrivals</p>
                   </div>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={notifications.sms} 
                   onChange={(e) => setNotifications({...notifications, sms: e.target.checked})}
                   className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                 />
               </label>

               <label className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${notifications.mute_sounds ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'}`}>
                     <BellOff size={16} />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-foreground">Mute Audio Chimes</p>
                     <p className="text-[10px] text-muted-foreground">Disable sound effects for in-app notifications</p>
                   </div>
                 </div>
                 <input 
                   type="checkbox" 
                   checked={notifications.mute_sounds} 
                   onChange={(e) => setNotifications({...notifications, mute_sounds: e.target.checked})}
                   className="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 cursor-pointer"
                 />
               </label>
             </div>

             <div className="mt-6 flex justify-end pt-4 border-t border-border/50">
               <button 
                 onClick={handleSavePreferences}
                 disabled={isSaving}
                 className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex items-center gap-2 disabled:opacity-50"
               >
                 <Save size={16} /> {isSaving ? 'Saving...' : 'Save Preferences'}
               </button>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Security & Account */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Account Details Summary */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
             <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                 {currentUser?.email?.substring(0,2).toUpperCase()}
               </div>
               <div>
                 <p className="text-sm font-bold text-foreground">{currentUser?.email}</p>
                 <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
               </div>
             </div>
             
             <div className="pt-4 border-t border-border/50">
               <p className="text-xs font-bold text-foreground/80 mb-2">Active Permissions</p>
               <div className="flex flex-wrap gap-1.5">
                 {currentUser?.permissions?.map((perm: string) => (
                   <span key={perm} className="px-2 py-1 bg-muted/50 border border-border/50 rounded-md text-[9px] font-mono text-muted-foreground">
                     {perm}
                   </span>
                 ))}
                 {(!currentUser?.permissions || currentUser.permissions.length === 0) && (
                   <span className="text-xs text-muted-foreground italic">No specific permissions assigned.</span>
                 )}
               </div>
             </div>
          </div>

          {/* Change Password */}
          <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
             <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2 flex items-center gap-2">
               <Shield size={16} className="text-primary" /> Update Password
             </h2>
             
             <form onSubmit={handleUpdatePassword} className="space-y-4">
               {passwordError && (
                 <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 font-bold flex items-start gap-2">
                   <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                   {passwordError}
                 </div>
               )}
               
               <div>
                 <label className="block text-xs font-bold text-foreground/90 mb-1">Current Password</label>
                 <input 
                   type="password" 
                   value={currentPassword}
                   onChange={e => setCurrentPassword(e.target.value)}
                   required
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                 />
               </div>
               
               <div className="pt-2 border-t border-border/30">
                 <label className="block text-xs font-bold text-foreground/90 mb-1">New Password</label>
                 <input 
                   type="password" 
                   value={newPassword}
                   onChange={e => setNewPassword(e.target.value)}
                   required
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary mb-3"
                 />
                 
                 <label className="block text-xs font-bold text-foreground/90 mb-1">Confirm New Password</label>
                 <input 
                   type="password" 
                   value={confirmPassword}
                   onChange={e => setConfirmPassword(e.target.value)}
                   required
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                 />
               </div>

               <div className="pt-4 mt-2 border-t border-border/50">
                 <button 
                   type="submit"
                   disabled={isPasswordSaving}
                   className="w-full py-2.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   <Key size={16} /> {isPasswordSaving ? 'Updating...' : 'Update Password'}
                 </button>
               </div>
             </form>
          </div>

        </div>

      </div>
    </div>
  );
}
