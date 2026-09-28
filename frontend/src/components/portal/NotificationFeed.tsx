'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Clock, Info, CheckCircle2, User } from 'lucide-react';

interface NotificationFeedProps {
  currentUser: any;
}

export default function NotificationFeed({ currentUser }: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token || !currentUser?.numeric_host_id) return;

        // Fetch recent appointments for this host as "notifications"
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments?host_id=${currentUser.numeric_host_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const raw = await res.json();
          const apts = raw.data || [];
          
          // Map appointments to a notification format, sorted by most recent
          const mapped = apts.map((apt: any) => ({
            id: apt.id,
            title: apt.status === 'CHECKED_IN' ? 'Visitor Arrived' : 'New Appointment Scheduled',
            message: `${apt.visitor?.full_name} (${apt.visitor?.company || 'Guest'}) is here for a ${apt.purpose || 'meeting'}. Note: ${apt.notes || 'No extra notes'}`,
            time: new Date(apt.created_at || apt.scheduled_time),
            status: apt.status,
            isNew: apt.status === 'CHECKED_IN' // visually highlight checked-in as unread/urgent
          })).sort((a: any, b: any) => b.time.getTime() - a.time.getTime());

          setNotifications(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [currentUser]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Notification Feed</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay updated on visitor arrivals, schedule changes, and alerts.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
             <Bell size={14} />
             {notifications.filter(n => n.isNew).length} New Alerts
           </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        {isLoading ? (
           <div className="p-8 text-center text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
           <div className="p-12 text-center flex flex-col items-center">
             <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-4">
                <Bell size={24} />
             </div>
             <p className="text-foreground font-bold">You&apos;re all caught up!</p>
             <p className="text-sm text-muted-foreground mt-1">No recent notifications in your feed.</p>
           </div>
        ) : (
           <div className="divide-y divide-border/50">
             {notifications.map((notif, idx) => (
               <div key={notif.id || idx} className={`p-6 hover:bg-muted/30 transition-colors flex gap-4 ${notif.isNew ? 'bg-blue-50/30' : ''}`}>
                 <div className="shrink-0 mt-1">
                   {notif.status === 'CHECKED_IN' ? (
                     <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
                       <User size={18} />
                     </div>
                   ) : (
                     <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-border/50">
                       <Clock size={18} />
                     </div>
                   )}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-1">
                     <h3 className={`font-bold text-sm ${notif.isNew ? 'text-foreground' : 'text-foreground/80'}`}>
                       {notif.title}
                     </h3>
                     <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                       {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                   </div>
                   <p className="text-sm text-muted-foreground leading-relaxed">
                     {notif.message}
                   </p>
                 </div>
                 {notif.isNew && (
                   <div className="shrink-0 flex items-center">
                     <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                   </div>
                 )}
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}
