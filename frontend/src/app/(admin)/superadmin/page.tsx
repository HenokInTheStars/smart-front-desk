'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, ShieldCheck, Activity, Settings, 
  Search, Bell, UserPlus, KeyRound, Shield, AlertTriangle, CheckCircle, X, Lock
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

export default function SuperAdminDashboard() {
  const [currentView, setCurrentView] = useState<'overview' | 'users' | 'logs'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({ email: '', password: '', role: 'Other' });
  const [formMessage, setFormMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage('');
    setIsSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ email: formData.email, password: formData.password, role: formData.role })
      });
      if (response.ok) {
        setFormMessage('✓ User registered successfully.');
        setFormData({ email: '', password: '', role: 'Other' });
        setTimeout(() => {
          setShowCreateModal(false);
          setFormMessage('');
          fetchUsers();
        }, 1200);
      } else {
        const errData = await response.json();
        setFormMessage(`Error: ${errData.detail || 'Could not create user'}`);
      }
    } catch (err) {
      setFormMessage('Error connecting to backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeHosts = users.filter(u => u.role === 'Host').length;
  const activeReceptionists = users.filter(u => u.role === 'Reception').length;

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-purple-500/20">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-wide">Super Admin</h1>
            <p className="text-[11px] text-purple-600 font-medium">Root Administration</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <UserPlus size={14} /> Create User Account
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'overview' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={18} /> Overview
          </button>

          <button 
            onClick={() => setCurrentView('users')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'users' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users size={18} /> User Accounts
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'users' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {users.length}
            </span>
          </button>

          <button 
            onClick={() => setCurrentView('logs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'logs' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity size={18} /> System Audit Logs
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Tier: <span className="text-purple-600 font-semibold">Root Authority</span></span>
          <Lock size={12} className="text-purple-600" />
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user accounts or roles..." 
              className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Super Administrator</span>
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                SA
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* VIEW 1: OVERVIEW */}
            {currentView === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">System Security & Access Overview</h2>
                  <p className="text-xs text-slate-500 mt-0.5">High-level account provisioning and role distribution across the platform.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Total Registered Users</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{users.length}</h3>
                    <p className="text-[11px] text-purple-600 mt-2 font-medium">All roles included</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Host Accounts</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeHosts}</h3>
                    <p className="text-[11px] text-blue-600 mt-2 font-medium">Active meeting receivers</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Receptionists</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeReceptionists}</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">Lobby & check-in staff</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Security Alerts</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">0</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">All credentials compliant</p>
                  </div>
                </div>

                {/* Users Fast Look */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Recent System Accounts</h3>
                    <button 
                      onClick={() => setCurrentView('users')}
                      className="text-xs text-purple-600 hover:underline font-semibold"
                    >
                      Manage All Accounts →
                    </button>
                  </div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">User Email</th>
                        <th className="px-6 py-3 font-semibold">Assigned Role</th>
                        <th className="px-6 py-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {users.slice(0, 4).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{u.email}</td>
                          <td className="px-6 py-3.5">
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right text-xs text-emerald-600 font-semibold">Active</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: USERS MANAGEMENT */}
            {currentView === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">User Accounts & Roles</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Provision new credentials and assign role permissions across the system.</p>
                  </div>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <UserPlus size={14} /> Add User
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Email Address</th>
                        <th className="px-6 py-3 font-semibold">Role Tier</th>
                        <th className="px-6 py-3 font-semibold">Account State</th>
                        <th className="px-6 py-3 font-semibold text-right">Access Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5 font-medium text-slate-900">{u.email}</td>
                            <td className="px-6 py-3.5">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                u.role === 'Super Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                u.role === 'Admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                u.role === 'Reception' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5 text-xs text-emerald-600 font-semibold">Active</td>
                            <td className="px-6 py-3.5 text-right text-xs text-slate-500 font-mono">
                              {u.role === 'Super Admin' ? 'Full Authority' : u.role === 'Admin' ? 'Operations' : u.role === 'Reception' ? 'Lobby Kiosk' : 'Standard'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No user accounts match your search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: SYSTEM AUDIT LOGS */}
            {currentView === 'logs' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">System Security & Audit Logs</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Immutable audit trail of authentication events and permission grants.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-xs">
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50/80">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Super Admin session authenticated via JWT</p>
                      <span className="text-xs text-slate-400">IP: 127.0.0.1 • Auth Token Verified</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">Just now</span>
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50/80">
                    <div>
                      <p className="text-sm font-medium text-slate-800">New user reception@example.com role assigned: Reception</p>
                      <span className="text-xs text-slate-400">Authorized by Super Admin</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">2 hours ago</span>
                  </div>
                  <div className="p-4 flex items-center justify-between hover:bg-slate-50/80">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Database backup archive snapshot completed</p>
                      <span className="text-xs text-slate-400">PostgreSQL Cloud Sync</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">4 hours ago</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Register New User Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="user@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input 
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                >
                  <option value="Super Admin">Super Admin (Root)</option>
                  <option value="Admin">Admin (Operations)</option>
                  <option value="Host">Host (Employee)</option>
                  <option value="Reception">Reception (Front Desk)</option>
                  <option value="Other">Other (Restricted)</option>
                </select>
              </div>

              {formMessage && (
                <p className={`p-2.5 rounded-lg text-xs font-medium ${formMessage.includes('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {formMessage}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
