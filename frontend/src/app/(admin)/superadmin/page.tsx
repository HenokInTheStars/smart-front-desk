'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, ShieldCheck, Activity, Settings, 
  Search, Bell, UserPlus, KeyRound, Shield, AlertTriangle, CheckCircle, X, Lock,
  Check, ToggleLeft, ToggleRight, Trash2, Edit3, Sparkles, RefreshCw, Layers, Sliders, ChevronRight, LogOut,
  ArrowUpDown, ArrowUp, ArrowDown, Clock
} from 'lucide-react';

interface User {
  id: number;
  email: string;
  role: string;
  permissions: string[];
  is_active: boolean;
}

interface PermissionCatalogItem {
  key: string;
  label: string;
  category: string;
  description: string;
}

interface RoleDefinition {
  role: string;
  description: string;
  default_permissions: string[];
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'overview' | 'users' | 'roles' | 'logs'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogItem[]>([]);
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // System audit log entries
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; text: string; detail: string; time: string; tag: string }>>([
    { id: '1', text: 'Dynamic Role Management System initialized', detail: 'Granular permissions engine active', time: 'Just now', tag: 'System' },
    { id: '2', text: 'Super Admin authenticated via JWT session', detail: 'IP: 127.0.0.1 • Root Tier Verified', time: '5 mins ago', tag: 'Auth' },
    { id: '3', text: 'Default role security presets loaded', detail: 'Super Admin, Admin, Reception, Host, Security, Auditor', time: '10 mins ago', tag: 'Security' },
  ]);

  // Modal: Create User
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'Host' });
  const [createFormMessage, setCreateFormMessage] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal: Manage Role & Permissions
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>('Host');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Modal: Create Custom Dynamic Role Preset
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<string[]>([]);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const addAuditLog = (text: string, detail: string, tag: string = 'Role Admin') => {
    const newEntry = {
      id: Date.now().toString(),
      text,
      detail,
      time: 'Just now',
      tag
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignOut = () => {
    localStorage.removeItem('access_token');
    router.push('/');
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setAuthError('Authentication required. Please sign in with your Super Admin credentials.');
        setIsLoading(false);
        return;
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setAuthError(null);
      } else if (response.status === 401 || response.status === 403) {
        setAuthError('Session expired or unauthorized. Please sign in as Super Admin.');
      } else {
        setAuthError(`Server returned status ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setAuthError('Could not reach backend API server at http://localhost:8000.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRolesCatalog = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/roles/catalog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.permissions) setPermissionCatalog(data.permissions);
        if (data.roles) setRoleDefinitions(data.roles);
      }
    } catch (err) {
      console.error('Failed to fetch roles catalog:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRolesCatalog();
  }, []);

  // Open Edit Role & Permissions Modal
  const handleOpenRoleModal = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditPermissions(user.permissions || []);
  };

  // When changing the role preset in the modal, optionally load its default permissions
  const handleRolePresetSelect = (roleName: string) => {
    setEditRole(roleName);
    const def = roleDefinitions.find(r => r.role === roleName);
    if (def) {
      setEditPermissions(def.default_permissions);
    }
  };

  // Toggle individual permission checkbox
  const handleTogglePermission = (permKey: string) => {
    setEditPermissions(prev => 
      prev.includes(permKey) ? prev.filter(k => k !== permKey) : [...prev, permKey]
    );
  };

  // Grant All Permissions
  const handleGrantAll = () => {
    setEditPermissions(permissionCatalog.map(p => p.key));
  };

  // Revoke All Permissions
  const handleRevokeAll = () => {
    setEditPermissions([]);
  };

  // Save Role and Permissions
  const handleSaveUserRoleAndPermissions = async () => {
    if (!selectedUser) return;
    setIsSavingRole(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          role: editRole,
          permissions: editPermissions
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        showToast(`✓ Updated role & permissions for ${selectedUser.email} to '${editRole}'`);
        addAuditLog(
          `Modified role & permissions for ${selectedUser.email}`,
          `Assigned Role: ${editRole} • ${editPermissions.length} active permissions granted`,
          'RBAC'
        );
        setSelectedUser(null);
      } else {
        const err = await response.json();
        showToast(`✗ Error: ${err.detail || 'Failed to update user'}`, 'error');
      }
    } catch (err) {
      showToast('✗ Network error while updating user role.', 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  // Toggle User Active/Suspended Status
  const handleToggleUserActive = async (user: User) => {
    const nextState = !user.is_active;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          is_active: nextState
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        showToast(`✓ Account ${user.email} is now ${nextState ? 'Active' : 'Suspended'}`);
        addAuditLog(
          `Account status toggled for ${user.email}`,
          `New state: ${nextState ? 'Active (Access Allowed)' : 'Suspended (Access Revoked)'}`,
          'Security'
        );
      } else {
        const err = await response.json();
        showToast(`✗ ${err.detail || 'Could not change status'}`, 'error');
      }
    } catch (err) {
      showToast('✗ Network error updating user status', 'error');
    }
  };

  // Delete User Account
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to permanently delete the account for ${user.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        showToast(`✓ User account ${user.email} deleted.`);
        addAuditLog(`Account deleted: ${user.email}`, `Permanent deletion authorized by Super Admin`, 'Account Deletion');
      } else {
        const err = await response.json();
        showToast(`✗ ${err.detail || 'Failed to delete user'}`, 'error');
      }
    } catch (err) {
      showToast('✗ Network error deleting user', 'error');
    }
  };

  // Create User Submission
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFormMessage('');
    setIsSubmittingCreate(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(createForm)
      });
      if (response.ok) {
        setCreateFormMessage('✓ User registered successfully.');
        addAuditLog(`New user registered: ${createForm.email}`, `Assigned Role: ${createForm.role}`, 'Provisioning');
        setCreateForm({ email: '', password: '', role: 'Host' });
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateFormMessage('');
          fetchUsers();
        }, 1000);
      } else {
        const errData = await response.json();
        setCreateFormMessage(`Error: ${errData.detail || 'Could not create user'}`);
      }
    } catch (err) {
      setCreateFormMessage('Error connecting to backend server.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Create New Dynamic Role Preset Submission
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setIsCreatingRole(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/roles/catalog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          role: newRoleName.trim(),
          description: newRoleDesc.trim(),
          permissions: newRolePerms
        })
      });

      if (response.ok) {
        showToast(`✓ New dynamic role '${newRoleName}' created.`);
        addAuditLog(`Created new dynamic role: ${newRoleName}`, `${newRolePerms.length} permissions defined by Super Admin`, 'RBAC Config');
        setShowNewRoleModal(false);
        setNewRoleName('');
        setNewRoleDesc('');
        setNewRolePerms([]);
        fetchRolesCatalog();
      } else {
        const err = await response.json();
        showToast(`✗ ${err.detail || 'Failed to create role'}`, 'error');
      }
    } catch (err) {
      showToast('✗ Network error creating role', 'error');
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Delete Dynamic Role Preset Submission
  const handleDeleteRolePreset = async (roleName: string) => {
    if (roleName.toLowerCase() === 'super admin') {
      showToast('⚠️ The root Super Admin role cannot be deleted.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete the dynamic role preset '${roleName}'?`)) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/roles/catalog/${encodeURIComponent(roleName)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      });

      if (response.ok) {
        showToast(`✓ Dynamic role '${roleName}' removed from catalog.`);
        addAuditLog(`Role preset deleted: ${roleName}`, `Removed by Super Admin from dynamic role registry`, 'RBAC Config');
        fetchRolesCatalog();
      } else {
        const err = await response.json();
        showToast(`✗ ${err.detail || 'Failed to delete role preset'}`, 'error');
      }
    } catch (err) {
      showToast('✗ Network error while deleting role preset.', 'error');
    }
  };

  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const [userSortField, setUserSortField] = useState<'email' | 'role' | 'permissions' | 'status'>('email');
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('asc');

  const [permSortField, setPermSortField] = useState<'key' | 'label' | 'category'>('key');
  const [permSortDirection, setPermSortDirection] = useState<'asc' | 'desc'>('asc');

  const [logSortField, setLogSortField] = useState<'time' | 'text' | 'tag'>('time');
  const [logSortDirection, setLogSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleUserSort = (field: 'email' | 'role' | 'permissions' | 'status') => {
    if (userSortField === field) {
      setUserSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setUserSortField(field);
      setUserSortDirection('asc');
    }
  };

  const handlePermSort = (field: 'key' | 'label' | 'category') => {
    if (permSortField === field) {
      setPermSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPermSortField(field);
      setPermSortDirection('asc');
    }
  };

  const handleLogSort = (field: 'time' | 'text' | 'tag') => {
    if (logSortField === field) {
      setLogSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setLogSortField(field);
      setLogSortDirection(field === 'time' ? 'desc' : 'asc');
    }
  };

  const activeSuperAdmins = users.filter(u => u.role.toLowerCase() === 'super admin').length;
  const activeAdmins = users.filter(u => u.role.toLowerCase() === 'admin').length;
  const activeReceptionists = users.filter(u => u.role.toLowerCase() === 'reception').length;
  const activeHosts = users.filter(u => u.role.toLowerCase() === 'host').length;
  const activeSecurity = users.filter(u => u.role.toLowerCase() === 'security').length;

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.permissions && u.permissions.some(p => p.toLowerCase().includes(q)));
    const matchesRole = selectedRoleFilter === 'all' || u.role.toLowerCase() === selectedRoleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    if (userSortField === 'email') {
      comparison = (a.email || '').localeCompare(b.email || '');
    } else if (userSortField === 'role') {
      comparison = (a.role || '').localeCompare(b.role || '');
    } else if (userSortField === 'permissions') {
      comparison = (a.permissions?.length || 0) - (b.permissions?.length || 0);
    } else if (userSortField === 'status') {
      comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
    }
    return userSortDirection === 'asc' ? comparison : -comparison;
  });

  const sortedCatalog = [...permissionCatalog].sort((a, b) => {
    let comparison = 0;
    if (permSortField === 'key') {
      comparison = (a.key || '').localeCompare(b.key || '');
    } else if (permSortField === 'label') {
      comparison = (a.label || '').localeCompare(b.label || '');
    } else if (permSortField === 'category') {
      comparison = (a.category || '').localeCompare(b.category || '');
    }
    return permSortDirection === 'asc' ? comparison : -comparison;
  });

  const sortedAuditLogs = [...auditLogs].sort((a, b) => {
    let comparison = 0;
    if (logSortField === 'text') {
      comparison = (a.text || '').localeCompare(b.text || '');
    } else if (logSortField === 'tag') {
      comparison = (a.tag || '').localeCompare(b.tag || '');
    } else if (logSortField === 'time') {
      comparison = a.id.localeCompare(b.id);
    }
    return logSortDirection === 'asc' ? comparison : -comparison;
  });

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
            <p className="text-[11px] text-purple-600 font-medium">Dynamic RBAC Portal</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 space-y-2">
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
              <Users size={18} /> User Accounts & Roles
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'users' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {users.length}
            </span>
          </button>

          <button 
            onClick={() => setCurrentView('roles')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'roles' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Layers size={18} /> Dynamic Roles Matrix
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${currentView === 'roles' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {roleDefinitions.length}
            </span>
          </button>

          <button 
            onClick={() => setCurrentView('logs')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'logs' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity size={18} /> Security Audit Logs
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Authority: <span className="text-purple-600 font-semibold">Super Admin</span></span>
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
              placeholder="Search user email, role, or capability..." 
              className="w-full bg-slate-50 text-sm text-slate-900 pl-9 pr-4 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => { fetchUsers(); fetchRolesCatalog(); showToast('Refreshed latest data', 'info'); }}
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Root Administrator</span>
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                SA
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* TOAST ALERT */}
        {toastMessage && (
          <div className={`mx-8 mt-4 p-3 rounded-lg text-sm font-medium flex items-center justify-between shadow-xs ${
            toastMessage.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800' :
            toastMessage.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
            'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}>
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-xs opacity-70 hover:opacity-100 ml-4 font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* AUTH ERROR / SESSION RESTORE BANNER */}
        {authError && (
          <div className="mx-8 mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Lock size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Super Admin Authentication Required</p>
                <p className="text-xs text-amber-700">{authError}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              Go to Login Page
            </button>
          </div>
        )}

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* VIEW 1: OVERVIEW */}
            {currentView === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dynamic Roles & Access Overview</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control role assignments, customize capability scopes, and manage user permissions in real time.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Total Registered Users</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{users.length}</h3>
                    <p className="text-[11px] text-purple-600 mt-2 font-medium">Fully managed accounts</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Host Accounts</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeHosts}</h3>
                    <p className="text-[11px] text-blue-600 mt-2 font-medium">Active meeting hosts</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Receptionists</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{activeReceptionists}</h3>
                    <p className="text-[11px] text-emerald-600 mt-2 font-medium">Front desk operators</p>
                  </div>

                  <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
                    <p className="text-xs text-slate-500 font-medium">Dynamic Role Presets</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{roleDefinitions.length}</h3>
                    <p className="text-[11px] text-purple-600 mt-2 font-medium">Configurable presets</p>
                  </div>
                </div>

                {/* Quick User List with Role Modification Action */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">Provisioned User Accounts & Roles</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                        <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                        <button
                          onClick={() => handleUserSort('email')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors ${userSortField === 'email' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Email / Name {userSortField === 'email' && (userSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                        </button>
                        <button
                          onClick={() => handleUserSort('role')}
                          className={`px-2 py-0.5 rounded font-medium transition-colors ${userSortField === 'role' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          Role {userSortField === 'role' && (userSortDirection === 'asc' ? '↑' : '↓')}
                        </button>
                      </div>
                      <button 
                        onClick={() => setCurrentView('users')}
                        className="text-xs text-purple-600 hover:underline font-semibold pl-2"
                      >
                        Manage All Roles & Permissions →
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handleUserSort('email')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>User Email / Name</span>
                            {userSortField === 'email' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleUserSort('role')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Assigned Role</span>
                            {userSortField === 'role' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleUserSort('permissions')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Active Permissions</span>
                            {userSortField === 'permissions' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleUserSort('status')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Status</span>
                            {userSortField === 'status' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedUsers.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{u.email}</td>
                          <td className="px-6 py-3.5">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              u.role === 'Super Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold' :
                              u.role === 'Admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              u.role === 'Reception' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              u.role === 'Host' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="text-xs font-mono text-slate-500">
                              {u.permissions?.length || 0} capabilities enabled
                            </span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className={`text-xs font-semibold ${u.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {u.is_active ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <button
                              onClick={() => handleOpenRoleModal(u)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-xs font-medium transition-colors"
                            >
                              Edit Role & Permissions
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 2: FULL USERS & ROLE MANAGEMENT */}
            {currentView === 'users' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">User Accounts, Roles & Permissions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Dynamically grant or take away roles, toggle specific capabilities, or suspend user access.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                      <button
                        onClick={() => handleUserSort('email')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          userSortField === 'email' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users size={12} />
                        Name / Email {userSortField === 'email' && (userSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                      <button
                        onClick={() => handleUserSort('role')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                          userSortField === 'role' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ShieldCheck size={12} />
                        Role {userSortField === 'role' && (userSortDirection === 'asc' ? '↑' : '↓')}
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowCreateModal(true)}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <UserPlus size={14} /> Add User Account
                    </button>
                  </div>
                </div>

                {/* Role Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `All Roles (${users.length})` },
                    { id: 'Super Admin', label: `Super Admin (${activeSuperAdmins})` },
                    { id: 'Admin', label: `Admin (${activeAdmins})` },
                    { id: 'Reception', label: `Reception (${activeReceptionists})` },
                    { id: 'Host', label: `Host (${activeHosts})` },
                    { id: 'Security', label: `Security (${activeSecurity})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedRoleFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedRoleFilter.toLowerCase() === tab.id.toLowerCase()
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handleUserSort('email')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>User Email / Name</span>
                            {userSortField === 'email' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleUserSort('role')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Role Tier</span>
                            {userSortField === 'role' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleUserSort('permissions')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Active Permissions & Capabilities</span>
                            {userSortField === 'permissions' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handleUserSort('status')} className="px-6 py-3 font-semibold text-center cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Status</span>
                            {userSortField === 'status' ? (userSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold text-right">Manage Roles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedUsers.length > 0 ? (
                        sortedUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/80">
                            <td className="px-6 py-3.5">
                              <div className="font-medium text-slate-900">{u.email}</div>
                              <div className="text-[11px] text-slate-400">User ID #{u.id}</div>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                u.role === 'Super Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold' :
                                u.role === 'Admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                u.role === 'Reception' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                u.role === 'Host' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="flex flex-wrap gap-1 max-w-md">
                                {u.permissions && u.permissions.length > 0 ? (
                                  u.permissions.slice(0, 3).map((p) => (
                                    <span key={p} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-mono">
                                      {p}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No operational permissions</span>
                                )}
                                {u.permissions && u.permissions.length > 3 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 font-semibold">
                                    +{u.permissions.length - 3} more
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-center">
                              <button
                                onClick={() => handleToggleUserActive(u)}
                                className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                                  u.is_active 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                                title="Click to toggle active/suspended status"
                              >
                                {u.is_active ? 'Active' : 'Suspended'}
                              </button>
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenRoleModal(u)}
                                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                                >
                                  <Sliders size={13} /> Edit Role & Perms
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                            No user accounts match your search query.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 3: DYNAMIC ROLES & CAPABILITIES MATRIX */}
            {currentView === 'roles' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Dynamic Roles & Permissions Matrix</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Explore standard presets, create custom dynamic roles, and view capability mappings.</p>
                  </div>
                  <button 
                    onClick={() => setShowNewRoleModal(true)}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Sparkles size={14} /> Create Custom Role Preset
                  </button>
                </div>

                {/* Role Definitions Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roleDefinitions.map((roleDef) => {
                    const isRoot = roleDef.role.toLowerCase() === 'super admin';
                    return (
                      <div key={roleDef.role} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-200 transition-all">
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">{roleDef.role}</h3>
                              {isRoot && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold flex items-center gap-1">
                                  <Lock size={10} /> Root
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full font-mono font-semibold">
                                {roleDef.default_permissions.length} perms
                              </span>
                              {!isRoot && (
                                <button
                                  onClick={() => handleDeleteRolePreset(roleDef.role)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors"
                                  title={`Delete role preset '${roleDef.role}'`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{roleDef.description}</p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">Granted Capabilities:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {roleDef.default_permissions.map((pKey) => {
                              const pObj = permissionCatalog.find(p => p.key === pKey);
                              return (
                                <span key={pKey} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium">
                                  {pObj ? pObj.label : pKey}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* System Capabilities Catalog Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">System Capability Catalog</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Granular actions that can be independently granted or revoked for any role.</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                      <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                      <button
                        onClick={() => handlePermSort('key')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${permSortField === 'key' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Key {permSortField === 'key' && (permSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                      <button
                        onClick={() => handlePermSort('category')}
                        className={`px-2 py-0.5 rounded font-medium transition-colors ${permSortField === 'category' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        Category {permSortField === 'category' && (permSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th onClick={() => handlePermSort('key')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Capability Key</span>
                            {permSortField === 'key' ? (permSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handlePermSort('label')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Label</span>
                            {permSortField === 'label' ? (permSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th onClick={() => handlePermSort('category')} className="px-6 py-3 font-semibold cursor-pointer select-none hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span>Category</span>
                            {permSortField === 'category' ? (permSortDirection === 'asc' ? <ArrowUp size={13} className="text-purple-600" /> : <ArrowDown size={13} className="text-purple-600" />) : <ArrowUpDown size={12} className="text-slate-400" />}
                          </div>
                        </th>
                        <th className="px-6 py-3 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedCatalog.map((perm) => (
                        <tr key={perm.key} className="hover:bg-slate-50/80">
                          <td className="px-6 py-3 font-mono text-xs text-purple-700 font-semibold">{perm.key}</td>
                          <td className="px-6 py-3 font-medium text-slate-900">{perm.label}</td>
                          <td className="px-6 py-3">
                            <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-medium">
                              {perm.category}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-500">{perm.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 4: SYSTEM AUDIT LOGS */}
            {currentView === 'logs' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">System Security & Audit Logs</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Immutable audit trail of authentication events and dynamic role permission modifications.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 text-xs shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 px-1.5">Sort:</span>
                    <button
                      onClick={() => handleLogSort('time')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                        logSortField === 'time' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Clock size={12} />
                      Time {logSortField === 'time' && (logSortDirection === 'asc' ? 'Oldest' : 'Newest')}
                    </button>
                    <button
                      onClick={() => handleLogSort('text')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                        logSortField === 'text' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Action {logSortField === 'text' && (logSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                    </button>
                    <button
                      onClick={() => handleLogSort('tag')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                        logSortField === 'tag' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tag {logSortField === 'tag' && (logSortDirection === 'asc' ? 'A-Z' : 'Z-A')}
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-xs">
                  {sortedAuditLogs.map((log) => (
                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-semibold">
                            {log.tag}
                          </span>
                          <p className="text-sm font-semibold text-slate-800">{log.text}</p>
                        </div>
                        <p className="text-xs text-slate-500">{log.detail}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-mono shrink-0 ml-4">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* MODAL 1: MANAGE ROLE & PERMISSIONS */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Manage Role & Permissions</h3>
                <p className="text-xs text-purple-600 font-medium">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Role Preset Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Assign Primary Role:
              </label>
              <select
                value={editRole}
                onChange={(e) => handleRolePresetSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-medium transition-all"
              >
                {roleDefinitions.map(r => (
                  <option key={r.role} value={r.role}>{r.role}</option>
                ))}
              </select>
            </div>

            {/* Granular Capabilities Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Granular Permissions & Capabilities:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGrantAll}
                    className="text-[11px] text-purple-600 hover:underline font-semibold"
                  >
                    Grant All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    className="text-[11px] text-slate-500 hover:underline font-semibold"
                  >
                    Revoke All
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {permissionCatalog.map((perm) => {
                  const isChecked = editPermissions.includes(perm.key);
                  return (
                    <label 
                      key={perm.key}
                      onClick={() => handleTogglePermission(perm.key)}
                      className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Controlled by parent label click
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 h-4 w-4 border-slate-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900">{perm.label}</span>
                          <span className="text-[10px] font-mono text-purple-600 px-1.5 py-0.2 bg-purple-50 rounded border border-purple-100">
                            {perm.key}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{perm.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveUserRoleAndPermissions}
                disabled={isSavingRole}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-xs"
              >
                {isSavingRole ? 'Saving...' : 'Apply Role & Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE USER ACCOUNT */}
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
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="user@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input 
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Initial Role *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                >
                  {roleDefinitions.map(r => (
                    <option key={r.role} value={r.role}>{r.role} — {r.description}</option>
                  ))}
                </select>
              </div>

              {createFormMessage && (
                <p className={`p-2.5 rounded-lg text-xs font-medium ${createFormMessage.includes('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {createFormMessage}
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
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isSubmittingCreate ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE CUSTOM DYNAMIC ROLE PRESET */}
      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Create Custom Dynamic Role Preset</h3>
              <button onClick={() => setShowNewRoleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Name *</label>
                <input 
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. VIP Host / Security Supervisor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Description</label>
                <input 
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Short summary of role scope"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Select Granted Capabilities:</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {permissionCatalog.map((perm) => (
                    <label 
                      key={perm.key}
                      onClick={() => setNewRolePerms(prev => prev.includes(perm.key) ? prev.filter(k => k !== perm.key) : [...prev, perm.key])}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer ${
                        newRolePerms.includes(perm.key) ? 'bg-purple-50 border-purple-200 font-semibold text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{perm.label}</span>
                      <span className="text-[10px] font-mono opacity-70">{perm.key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setShowNewRoleModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreatingRole}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isCreatingRole ? 'Creating...' : 'Register Dynamic Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
