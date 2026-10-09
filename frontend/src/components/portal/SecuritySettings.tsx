'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Key, Bell, BellOff, Smartphone, CheckCircle2, AlertTriangle, Monitor, Save } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ALL_PERMISSIONS } from '../../lib/permissions';

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

  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 -mt-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Security & Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account security and personalize your workspace.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-6 border-b border-border">
        <button 
          onClick={() => setActiveTab('general')} 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          General Settings
        </button>
        <button 
          onClick={() => setActiveTab('security')} 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'security' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Security & Password
        </button>
      </div>

      <div className="pt-2">
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Profile Information */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
               <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-5 border-b border-border/50 pb-2 flex items-center gap-2">
                 <Shield size={16} className="text-primary" /> Profile Information
               </h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                   <label className="block text-xs font-bold text-foreground/90 mb-1.5">Email Address</label>
                   <input 
                     type="email" 
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-foreground/90 mb-1.5">Phone Number</label>
                   <input 
                     type="tel" 
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder="+251 912 345 678"
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
                   />
                 </div>
               </div>
            </div>

            {/* Application Preferences */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
               <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-5 border-b border-border/50 pb-2 flex items-center gap-2">
                 <Monitor size={16} className="text-primary" /> Application Preferences
               </h2>
               <div>
                 <label className="block text-xs font-bold text-foreground/90 mb-2">Default Startup Module</label>
                 <select 
                   value={defaultModule}
                   onChange={(e) => setDefaultModule(e.target.value)}
                   className="w-full sm:max-w-xs bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
                 >
                   <option value="1_central_ops">Central Operations</option>
                   <option value="13_personal_queue">Personal Queue</option>
                   <option value="8_manual_override">Manual Check-in</option>
                   <option value="15_manage_availability">My Schedule</option>
                 </select>
                 <p className="text-[11px] text-muted-foreground mt-2">This module will automatically open when you log into the portal.</p>
               </div>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end pt-2">
               <button 
                 onClick={handleSavePreferences}
                 disabled={isSaving}
                 className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center gap-2 disabled:opacity-50"
               >
                 <Save size={18} /> {isSaving ? 'Saving Changes...' : 'Save General Settings'}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Account Details Summary */}
            <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
               <div className="flex items-center gap-4 mb-5">
                 <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                   {currentUser?.email?.substring(0,2).toUpperCase()}
                 </div>
                 <div>
                   <p className="text-sm font-bold text-foreground truncate">{currentUser?.email}</p>
                   <div className="inline-block mt-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded-md text-[10px] font-bold uppercase tracking-wider">
                     {currentUser?.role}
                   </div>
                 </div>
               </div>
               
               <div className="pt-5 border-t border-border/50">
                 <p className="text-xs font-bold text-foreground/80 mb-3 flex items-center gap-2">
                   <CheckCircle2 size={14} className="text-emerald-500" /> Active Permissions
                 </p>
                 <div className="flex flex-wrap gap-2">
                   {currentUser?.permissions?.filter((p: string) => ALL_PERMISSIONS.some(ap => ap.id === p)).map((perm: string) => (
                     <span key={perm} className="px-2.5 py-1 bg-muted border border-border/80 rounded-md text-[10px] font-mono font-medium text-foreground">
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
               <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-5 border-b border-border/50 pb-2 flex items-center gap-2">
                 <Key size={16} className="text-primary" /> Update Password
               </h2>
               
               <form onSubmit={handleUpdatePassword} className="space-y-4">
                 {passwordError && (
                   <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-destructive font-bold flex items-start gap-2">
                     <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                     {passwordError}
                   </div>
                 )}
                 
                 <div>
                   <label className="block text-xs font-bold text-foreground/90 mb-1.5">Current Password</label>
                   <input 
                     type="password" 
                     value={currentPassword}
                     onChange={e => setCurrentPassword(e.target.value)}
                     required
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
                   />
                 </div>
                 
                 <div className="pt-2 border-t border-border/30">
                   <label className="block text-xs font-bold text-foreground/90 mb-1.5">New Password</label>
                   <input 
                     type="password" 
                     value={newPassword}
                     onChange={e => setNewPassword(e.target.value)}
                     required
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary mb-4 transition-all"
                   />
                   
                   <label className="block text-xs font-bold text-foreground/90 mb-1.5">Confirm New Password</label>
                   <input 
                     type="password" 
                     value={confirmPassword}
                     onChange={e => setConfirmPassword(e.target.value)}
                     required
                     className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all"
                   />
                 </div>

                 <div className="pt-5 mt-2 border-t border-border/50">
                   <button 
                     type="submit"
                     disabled={isPasswordSaving}
                     className="w-full py-3 bg-muted/50 text-foreground border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     <Key size={16} /> {isPasswordSaving ? 'Updating...' : 'Change Password'}
                   </button>
                 </div>
               </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
