'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Clock, Search, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface CheckoutControlProps {
  currentUser: any;
}

export default function CheckoutControl({ currentUser }: CheckoutControlProps) {
  const [activeGuests, setActiveGuests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchActiveGuests();
  }, []);

  const fetchActiveGuests = async () => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch('http://localhost:8000/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const guests = (raw.data || [])
          .filter((a: any) => a.status === 'CHECKED_IN' || a.status === 'IN_MEETING')
          .map((a: any) => ({
            id: a.id,
            name: a.visitor?.full_name || 'Unknown',
            host: a.host?.full_name || 'Unknown',
            checkIn: new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expectedOut: new Date(new Date(a.scheduled_time).getTime() + 60*60*1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // mock +1hr
            status: (Date.now() > new Date(a.scheduled_time).getTime() + 2*60*60*1000) ? 'overstayed' : 'active'
          }));
        setActiveGuests(guests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const forceCheckout = async (id: string) => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`http://localhost:8000/appointments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        setActiveGuests(prev => prev.filter(g => g.id !== id));
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Checkout Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ensure guests are properly checked out of the system upon departure.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Stats Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card p-5 rounded-2xl border border-border shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Still in Building</p>
            <h3 className="text-4xl font-black text-foreground">{activeGuests.length}</h3>
          </div>
          
          <div className="bg-destructive/10 border border-destructive/20 p-5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={16} className="text-destructive" />
              <p className="text-sm font-semibold text-destructive">Overstayed Visas</p>
            </div>
            <h3 className="text-4xl font-black text-rose-900">
              {activeGuests.filter(g => g.status === 'overstayed').length}
            </h3>
            <p className="text-xs text-destructive mt-2 font-medium">Guests past expected checkout time.</p>
          </div>
        </div>

        {/* Main List */}
        <div className="lg:col-span-3 bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30/50">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <LogOut size={16} className="text-muted-foreground" /> Active Visitors
            </h3>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input type="text" placeholder="Search visitor..." className="pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-slate-500 outline-none w-48 transition-all" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th className="px-6 py-3">Visitor</th>
                  <th className="px-6 py-3">Check-In</th>
                  <th className="px-6 py-3">Expected Out</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div></td>
                  </tr>
                ) : activeGuests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground/70">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                      <p className="text-sm font-bold text-muted-foreground">Building is clear.</p>
                      <p className="text-xs">No active visitors remaining.</p>
                    </td>
                  </tr>
                ) : activeGuests.map(guest => (
                  <tr key={guest.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{guest.name}</p>
                      <p className="text-xs text-muted-foreground">Host: {guest.host}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">
                      {guest.checkIn}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                        guest.status === 'overstayed' 
                          ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' 
                          : 'bg-slate-100 text-foreground/90 border-border'
                      }`}>
                        <Clock size={12} /> {guest.expectedOut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => forceCheckout(guest.id)}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                      >
                        Force Checkout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
