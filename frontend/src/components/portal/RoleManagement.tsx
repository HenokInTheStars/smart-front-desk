'use client';

import React, { useState, useEffect } from 'react';
import { TablePagination } from '../ui/TablePagination';
import { Plus, Edit2, Trash2, CheckCircle2, Shield, UserX, AlertTriangle, ShieldAlert, X, UserPlus, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import AnimatedCheckbox from '../AnimatedCheckbox';

interface RoleManagementProps {
  currentUser: any;
}

import { ALL_PERMISSIONS } from '../../lib/permissions';
import {
  formatEthiopianPhoneInput,
  normalizeEthiopianPhone,
  isValidEthiopianPhone,
  ETHIOPIAN_PHONE_ERROR
} from '@/lib/phone';

const ROLES = ["SUPER_ADMIN", "ADMIN", "RECEPTION", "HOST", "OTHER"];

export default function RoleManagement({ currentUser }: RoleManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('HOST');
  const [customRoleName, setCustomRoleName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [hasDescription, setHasDescription] = useState(false);
  const [description, setDescription] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u => {
        const email = (u.email || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const customRole = (u.custom_role_name || '').toLowerCase();
        const status = u.is_active ? 'active' : 'suspended';
        const desc = (u.description || '').toLowerCase();
        return email.includes(q) || role.includes(q) || customRole.includes(q) || status.includes(q) || desc.includes(q);
      }));
    }
  }, [searchQuery, users]);

  const togglePermission = (id: string) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setRoleName('HOST');
    setCustomRoleName('');
    setIsActive(true);
    setSelectedPermissions([]);
    setHasDescription(false);
    setDescription('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setErrorMsg('');
  };

  const openCreate = () => {
    resetForm();
    setEditingUser(null);
    setIsCreatingUser(true);
  };

  const openEdit = (user: any) => {
    resetForm();
    setIsCreatingUser(false);
    setEditingUser(user);
    setEmail(user.email);
    setRoleName(user.role);
    setCustomRoleName(user.custom_role_name || '');
    setIsActive(user.is_active);
    setSelectedPermissions(user.permissions || []);
    if (user.description) {
      setHasDescription(true);
      setDescription(user.description);
    }
  };

  const closeForm = () => {
    setIsCreatingUser(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !roleName) {
      setErrorMsg('Email Address and System Role are required.');
      return;
    }
    if (!editingUser && !password.trim()) {
      setErrorMsg('Temporary Password is required for creating a new account.');
      return;
    }
    if (!editingUser && password.trim().length < 6) {
      setErrorMsg('Temporary Password must be at least 6 characters long.');
      return;
    }
    if (roleName === 'OTHER' && !customRoleName.trim()) {
      setErrorMsg('Custom role name is required when OTHER role is selected.');
      return;
    }
    if (roleName === 'HOST' && (!firstName.trim() || !lastName.trim())) {
      setErrorMsg('First Name and Last Name are required for Host accounts.');
      return;
    }

    if (phone.trim() && !isValidEthiopianPhone(phone)) {
      setErrorMsg(ETHIOPIAN_PHONE_ERROR);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        setErrorMsg('Authentication token not found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users${editingUser ? `/${editingUser.id}/role` : ''}`;

      const payload = editingUser ? {
        role: roleName,
        custom_role_name: roleName === 'OTHER' ? customRoleName.trim() : null,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : null,
        description: hasDescription ? description.trim() : null,
        is_active: isActive
      } : {
        email: cleanEmail,
        password: password.trim(),
        role: roleName,
        custom_role_name: roleName === 'OTHER' ? customRoleName.trim() : null,
        description: hasDescription ? description.trim() : null,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() ? normalizeEthiopianPhone(phone) : null
      };

      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = {};
      }

      if (res.ok) {
        closeForm();
        fetchUsers();
        setToastMsg(editingUser ? `Updated role for ${cleanEmail}` : `Account created for ${cleanEmail}`);
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        if (res.status === 401) {
          setErrorMsg('Your session has expired. Please refresh the page or log in again.');
        } else if (res.status === 403) {
          setErrorMsg('Permission denied: You do not have permissions to manage roles (6_manage_roles).');
        } else {
          let msg = 'Failed to save user.';
          if (typeof data.detail === 'string') {
            msg = data.detail;
          } else if (Array.isArray(data.detail)) {
            msg = data.detail.map((err: any) => err.msg || (err.loc ? `${err.loc.join('.')}: ${err.msg}` : JSON.stringify(err))).join('; ');
          } else if (data.detail && typeof data.detail === 'object') {
            msg = JSON.stringify(data.detail);
          } else if (data.message) {
            msg = data.message;
          }
          setErrorMsg(msg);
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error connecting to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      const token = sessionStorage.getItem('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.detail || 'Failed to delete user');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">User & Role Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage standard employee accounts and assign customized granular permissions.
          </p>
        </div>
        <button
          onClick={isCreatingUser || editingUser ? closeForm : openCreate}
          className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2"
        >
          {isCreatingUser || editingUser ? <X size={16} /> : <UserPlus size={16} />}
          {isCreatingUser || editingUser ? 'Cancel' : 'Create New User'}
        </button>
      </div>

      {(isCreatingUser || editingUser) && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.03)] animate-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {editingUser ? 'Edit User Permissions' : 'New Account Setup'}
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm font-semibold rounded-lg border border-rose-100">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!!editingUser}
                  placeholder="worker@example.com"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none disabled:bg-slate-100 disabled:text-muted-foreground"
                />
                {editingUser && <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed here.</p>}
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-foreground/90 mb-1.5">Temporary Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1.5">System Role</label>
                <select
                  value={roleName}
                  onChange={e => setRoleName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-card"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Base role standard permissions apply if no granular overrides are checked.</p>
              </div>

              {roleName === 'HOST' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-foreground/90 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-foreground/90 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-foreground/90">Phone Number</label>
                      {/* <span className="text-[10px] text-muted-foreground font-medium">e.g. +251 9XXXXXXXX / 09XXXXXXXX</span> */}
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => {
                        const formatted = formatEthiopianPhoneInput(e.target.value);
                        setPhone(formatted);
                        if (errorMsg) setErrorMsg('');
                      }}
                      placeholder="+251 91 123 4567"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {roleName === 'OTHER' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-xs font-bold text-foreground/90 mb-1.5">Custom Role Title</label>
                  <input
                    type="text"
                    value={customRoleName}
                    onChange={e => setCustomRoleName(e.target.value)}
                    placeholder="e.g. Security Guard"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-border/50">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={hasDescription} onChange={e => setHasDescription(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                  <span className="text-xs font-bold text-foreground">Add AI Recommendation Description</span>
                </label>
                {hasDescription && (
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="e.g. Talk to John for technical IT support and server access issues."
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none mt-1 h-20 resize-none"
                  />
                )}
                <p className="text-[10px] text-muted-foreground mt-1">If enabled, the Kiosk AI will use this description to recommend this person to guests.</p>
              </div>

              {editingUser && (
                <div className="pt-2 border-t border-border/50">
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span className="text-sm font-bold text-foreground">Account Active</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground ml-6">Uncheck to suspend the account.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col h-full">
              <label className="block text-xs font-bold text-foreground/90 mb-2">Granular Permissions Overrides ({selectedPermissions.length})</label>
              <div className="flex-1 overflow-y-auto border border-border rounded-xl p-2 bg-muted/30 space-y-1 min-h-[250px] max-h-[350px]">
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm.id} className="flex items-start gap-3 p-2 hover:bg-card rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border">
                    <AnimatedCheckbox
                      className="mt-0.5 shrink-0"
                      checked={selectedPermissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{perm.label}</p>
                      <p className="text-[10px] text-muted-foreground">{perm.category} • {perm.id}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom inline error alert directly visible to user */}
          {errorMsg && (
            <div className="mt-4 p-3.5 bg-destructive/10 text-destructive text-xs sm:text-sm font-semibold rounded-xl border border-destructive/20 flex items-center gap-2.5 animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 text-destructive" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={closeForm}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex items-center gap-2"
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? (editingUser ? 'Saving Changes...' : 'Creating Account...') : (editingUser ? 'Save Changes' : 'Create Account')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search users by email or role..."
              className="pl-9 pr-8 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary outline-none w-72"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="text-xs font-semibold text-muted-foreground">
            {filteredUsers.length} Users Found
          </div>
        </div>
        {(() => {
          const paginated = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                  <tr>
                    <th className="px-6 py-3">User Account</th>
                    <th className="px-6 py-3">System Role</th>
                    <th className="px-6 py-3">Permissions</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map(user => (
                    <tr key={user.id} className="hover:bg-muted/30/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">{user.is_active ? 'Active' : 'Suspended'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${user.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            user.role === 'ADMIN' ? 'bg-primary/10 text-blue-700 border-blue-200' :
                              user.role === 'RECEPTION' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-100 text-foreground/90 border-border'
                          }`}>
                          {user.role === 'OTHER' && user.custom_role_name ? user.custom_role_name : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-muted-foreground flex items-center justify-center text-[10px] font-bold border border-border" title="Permissions Count">
                            {user.permissions?.length || 0}
                          </span>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {user.permissions?.length > 0 ? 'Custom overrides' : 'Default defaults'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(user)} className="p-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <p className="text-muted-foreground text-sm font-medium">
                          {searchQuery.trim() ? `No users found matching "${searchQuery.trim()}".` : 'No users found.'}
                        </p>
                      </td>
                    </tr>
                  )}
                  {isLoading && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">Loading users...</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <TablePagination totalItems={filteredUsers.length} pageSize={pageSize} setPageSize={setPageSize} currentPage={currentPage} setCurrentPage={setCurrentPage} />
            </div>
          );
        })()}
      </div>

      {/* Action Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-full px-6 py-3 flex items-center gap-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="font-semibold text-sm">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
