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
    if (!searchQuery) {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(users.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.custom_role_name && u.custom_role_name.toLowerCase().includes(searchQuery.toLowerCase()))
      ));
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
    if (!email || !roleName) {
      setErrorMsg('Email and Role are required.');
      return;
    }
    if (roleName === 'OTHER' && !customRoleName.trim()) {
      setErrorMsg('Custom role name is required when OTHER is selected.');
      return;
    }
    
    try {
      const token = sessionStorage.getItem('access_token');
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/users${editingUser ? `/${editingUser.id}/role` : ''}`;
      
      const payload = editingUser ? {
        role: roleName,
        custom_role_name: roleName === 'OTHER' ? customRoleName : null,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : null,
        description: hasDescription ? description : null,
        is_active: isActive
      } : {
        email,
        password,
        role: roleName,
        custom_role_name: roleName === 'OTHER' ? customRoleName : null,
        description: hasDescription ? description : null,
        permissions: selectedPermissions.length > 0 ? selectedPermissions : null,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null
      };

      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        closeForm();
        fetchUsers();
      } else {
        setErrorMsg(data.detail || 'Failed to save user');
      }
    } catch (e: any) {
      setErrorMsg(e.message);
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
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield size={18} className="text-primary" /> 
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
                    <label className="block text-xs font-bold text-foreground/90 mb-1.5">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="+1 (555) 123-4567" 
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" 
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

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border/50">
            <button onClick={closeForm} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-bold transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
              {editingUser ? 'Save Changes' : 'Create Account'}
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
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users by email or role..." 
              className="pl-9 pr-4 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary outline-none w-72"
            />
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
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold border ${
                      user.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
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
                       <p className="text-muted-foreground text-sm font-medium">No users found matching your search.</p>
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
    </div>
  );
}
