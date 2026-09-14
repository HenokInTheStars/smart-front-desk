import React, { useState } from 'react';
import { Save, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';

interface ProfileTabProps {
  currentEmail: string;
  currentName: string;
  currentPhone?: string;
  setToastMessage: (msg: string) => void;
  onProfileUpdated: () => void;
}

export default function ProfileTab({ currentEmail, currentName, currentPhone, setToastMessage, onProfileUpdated }: ProfileTabProps) {
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(currentPhone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    const payload: any = {};
    if (email !== currentEmail) payload.email = email;
    if (phone !== currentPhone) payload.phone = phone;
    
    if (newPassword) {
      if (!currentPassword) {
        setErrorMsg("Current password is required to set a new password.");
        setIsSaving(false);
        return;
      }
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setToastMessage("No changes to save.");
      setIsSaving(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setToastMessage("Profile updated successfully!");
        setCurrentPassword('');
        setNewPassword('');
        onProfileUpdated();
        
        if (payload.new_password) {
          // Password changed, they will need to login again next time, or we log them out.
          setToastMessage("Password changed successfully.");
        }
      } else {
        const data = await response.json();
        setErrorMsg(data.detail || "Failed to update profile.");
      }
    } catch (err) {
      setErrorMsg("Network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8 border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="text-blue-600" /> My Profile
        </h2>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information, contact details, and security.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        
        {/* Name (Read-only) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name (Read-only)</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              value={currentName} 
              disabled 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">Please contact an admin to change your registered name.</p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input 
              type="tel" 
              value={phone} 
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Used for AI routing SMS notifications.</p>
        </div>

        <hr className="border-slate-200 my-6" />

        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Lock className="text-slate-500 w-5 h-5" /> Security
          </h3>
          <p className="text-xs text-slate-500 mt-1">Leave blank if you do not wish to change your password.</p>
        </div>

        {/* Current Password */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
          <div className="relative">
            <input 
              type={showCurrentPassword ? "text" : "password"} 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
            />
            <button 
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
          <div className="relative">
            <input 
              type={showNewPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
            />
            <button 
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  );
}
