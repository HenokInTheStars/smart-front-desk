'use client';

import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { generateBadgePDF } from '@/lib/badgeGenerator';

interface BadgeManagementProps {
  currentUser: any;
}

export default function BadgeManagement({ currentUser }: BadgeManagementProps) {
  const [recentBadges, setRecentBadges] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentBadges();
  }, []);

  const fetchRecentBadges = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch('http://localhost:8000/appointments?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const guests = (raw.data || [])
          .filter((a: any) => a.status === 'CHECKED_IN')
          .map((a: any) => ({
            id: a.id,
            visitor: a.visitor?.full_name || 'Unknown',
            host: a.host?.full_name || 'Unknown',
            status: 'printed', // default for already checked in
            time: new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateStr: new Date(a.scheduled_time).toLocaleDateString() + ' ' + new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
        setRecentBadges(guests);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const rePrint = (id: string) => {
    setRecentBadges(prev => 
      prev.map(badge => badge.id === id ? { ...badge, status: 'printing' } : badge)
    );

    const badgeData = recentBadges.find(b => b.id === id);
    if (badgeData) {
      const doc = generateBadgePDF(badgeData.visitor, badgeData.host, badgeData.dateStr || new Date().toLocaleString());
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }

    setTimeout(() => {
      setRecentBadges(prev => 
        prev.map(badge => badge.id === id ? { ...badge, status: 'printed' } : badge)
      );
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Badge Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Re-print visitor badges manually.
          </p>
        </div>
      </div>

      <div className="w-full">
        {/* Recent Badges & Reprints */}
        <div className="w-full">
          <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-muted/30/50">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Layers size={16} className="text-primary" /> Recent Print Jobs
              </h3>
            </div>
            
            <div className="p-0">
               <ul className="divide-y divide-slate-100">
                {recentBadges.map(badge => (
                  <li key={badge.id} className="p-5 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{badge.visitor}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Host: {badge.host} • {badge.time}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {badge.status === 'printed' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
                          <CheckCircle2 size={12} /> Success
                        </span>
                      )}
                      {badge.status === 'failed' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 border border-destructive/20 px-2 py-1 rounded-md">
                          <AlertCircle size={12} /> Jammed
                        </span>
                      )}
                      {badge.status === 'printing' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md animate-pulse">
                          <RefreshCw size={12} className="animate-spin" /> Printing...
                        </span>
                      )}
                      <button 
                        onClick={() => rePrint(badge.id)}
                        disabled={badge.status === 'printing'}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-muted-foreground rounded-lg transition-colors disabled:opacity-50"
                        title="Re-Print Badge"
                      >
                        <Printer size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
