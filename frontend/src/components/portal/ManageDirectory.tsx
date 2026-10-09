'use client';

import React, { useState, useEffect } from 'react';
import { TablePagination } from '../ui/TablePagination';
import { Users, Search, RefreshCw, Plus, Edit2, Trash2 } from 'lucide-react';

interface ManageDirectoryProps {
  currentUser: any;
}

export default function ManageDirectory({ currentUser }: ManageDirectoryProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch('http://localhost:8000/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const mapped = (raw.data || []).map((e: any) => ({
          id: e.id,
          name: e.full_name,
          title: e.department.includes('(') ? e.department.split('(')[1].replace(')', '') : 'Employee',
          dept: e.department.includes('(') ? e.department.split('(')[0].trim() : e.department,
          email: `${e.full_name.split(' ')[0].toLowerCase()}@matrix.local` // Mock email since backend doesn't return one
        }));
        setEmployees(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Staff & Host Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage employee profiles that appear on the kiosk for guest selection.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchEmployees} className="px-4 py-2 bg-card border border-border text-foreground/90 hover:bg-muted/30 rounded-xl text-sm font-semibold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Sync AD/LDAP
          </button>
          <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2">
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2 text-foreground/90 font-bold">
             <Users size={18} className="text-primary" />
             Active Directory ({employees.length})
           </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input 
              type="text" 
              placeholder="Search directory..." 
              className="pl-9 pr-4 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary outline-none w-64"
            />
          </div>
        </div>
        
        {(() => {
          const paginated = employees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
          return (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map(emp => (
                <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-muted-foreground">
                      {emp.dept}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {emp.title}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 text-muted-foreground/70 hover:text-primary hover:bg-primary/10 rounded-lg"><Edit2 size={16} /></button>
                      <button className="p-1.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination totalItems={employees.length} pageSize={pageSize} setPageSize={setPageSize} currentPage={currentPage} setCurrentPage={setCurrentPage} />
          </div>
          );
        })()}
      </div>
    </div>
  );
}
