'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, Clock, User, CheckCircle2, AlertTriangle, 
  Calendar, ChevronRight, ArrowRight, Check, Sparkles, Filter 
} from 'lucide-react';

interface NotificationFeedProps {
  currentUser: any;
  isPanel?: boolean;
  onSelectAppointment?: (appointment: any) => void;
}

export default function NotificationFeed({ 
  currentUser, 
  isPanel = false,
  onSelectAppointment 
}: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'lobby' | 'scheduled'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const getStorageKey = (userId?: string) => `sfd_notifs_last_read_${userId || 'anonymous'}`;
  const getReadIdsKey = (userId?: string) => `sfd_read_notif_ids_${userId || 'anonymous'}`;

  const getReadIds = (): Set<string> => {
    try {
      if (typeof window === 'undefined') return new Set();
      const raw = localStorage.getItem(getReadIdsKey(currentUser?.id));
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markIdAsRead = (id: string) => {
    try {
      if (typeof window !== 'undefined') {
        const readSet = getReadIds();
        readSet.add(id);
        localStorage.setItem(getReadIdsKey(currentUser?.id), JSON.stringify(Array.from(readSet)));
      }
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isNew: false } : n));
  };

  const markAllRead = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(getStorageKey(currentUser?.id), Date.now().toString());
        const allIds = notifications.map(n => n.id);
        localStorage.setItem(getReadIdsKey(currentUser?.id), JSON.stringify(allIds));
      }
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isNew: false })));
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;

        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/appointments?limit=100`;
        const hasGlobalView = currentUser?.permissions?.includes('7_global_lobby_view') || 
          ['SUPER_ADMIN', 'ADMIN', 'RECEPTION', 'SECURITY'].includes(currentUser?.role);

        // Host personalization: if not global lobby viewer, scope to this host
        if (!hasGlobalView && currentUser?.numeric_host_id) {
          url += `&host_id=${currentUser.numeric_host_id}`;
        }

        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const raw = await res.json();
          const apts = raw.data || [];
          
          let lastRead = 0;
          try {
            const stored = localStorage.getItem(getStorageKey(currentUser?.id));
            if (stored) lastRead = parseInt(stored, 10);
          } catch {}
          const readIds = getReadIds();

          // Client-side host isolation for strict personalization
          const isHost = !hasGlobalView;
          const hostScopedApts = isHost
            ? apts.filter((a: any) => 
                (currentUser?.numeric_host_id && a.host_id === currentUser.numeric_host_id) ||
                (currentUser?.full_name && a.host?.full_name?.toLowerCase() === currentUser.full_name?.toLowerCase()) ||
                (currentUser?.employee_id && a.host?.employee_id === currentUser.employee_id)
              )
            : apts;

          // Map appointments to personalized, status-aware notification models
          const mapped = hostScopedApts.map((apt: any) => {
            const time = new Date(apt.created_at || apt.checked_in_at || apt.scheduled_time);
            const visitorName = apt.visitor?.full_name || 'Visitor';
            const company = apt.visitor?.company ? ` (${apt.visitor.company})` : '';
            const hostName = apt.host?.full_name || 'Staff Host';
            const isMyVisitor = isHost || (
              currentUser?.full_name && apt.host?.full_name?.toLowerCase() === currentUser.full_name?.toLowerCase()
            );

            const isDelivery = (apt.notes && apt.notes.toLowerCase().includes('delivery')) ||
              (apt.visitor?.company && apt.visitor.company.toLowerCase().includes('delivery')) ||
              (apt.purpose && apt.purpose.toLowerCase().includes('delivery'));

            let type: 'arrival' | 'reassigned' | 'in_meeting' | 'completed' | 'scheduled' | 'cancelled' = 'scheduled';
            let title = '';
            let message = '';
            let badge = '';
            let badgeColor = '';
            let iconType: 'arrival' | 'alert' | 'clock' | 'check' = 'clock';

            switch (apt.status) {
              case 'CHECKED_IN':
                type = 'arrival';
                iconType = isDelivery ? 'clock' : 'arrival';
                badge = isDelivery ? 'Package at Front Desk' : 'Waiting in Lobby';
                badgeColor = isDelivery ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (isDelivery) {
                  if (isMyVisitor) {
                    title = `Package delivered for you (${visitorName})`;
                    message = `A package dropped off by ${visitorName}${company} has arrived and is waiting for your pickup at the Front Desk.`;
                  } else {
                    title = `Package delivered for ${hostName}`;
                    message = `A package dropped off by ${visitorName}${company} for ${hostName} is waiting at the Front Desk.`;
                  }
                } else {
                  if (isMyVisitor) {
                    title = `Your guest ${visitorName} has arrived`;
                    message = `${visitorName}${company} has checked in at reception. They are currently waiting in the lobby for you.`;
                  } else {
                    title = `${visitorName} arrived for ${hostName}`;
                    message = `${visitorName}${company} checked in for ${hostName}. Waiting in the lobby.`;
                  }
                }
                break;
              case 'NEEDS_REASSIGNMENT':
                type = 'reassigned';
                iconType = 'alert';
                badge = 'Action Required';
                badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                if (isMyVisitor) {
                  title = `Guest Reassigned to You: ${visitorName}`;
                  message = `${visitorName} was rerouted to your schedule because their initial host was unavailable.`;
                } else {
                  title = `Reassignment Needed: ${visitorName}`;
                  message = `Guest ${visitorName} needs to be assigned to an active host.`;
                }
                break;

              case 'IN_MEETING':
                type = 'in_meeting';
                iconType = 'check';
                badge = 'In Progress';
                badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                if (isMyVisitor) {
                  title = `Meeting Active with ${visitorName}`;
                  message = `You admitted ${visitorName}. Consultation session is in progress.`;
                } else {
                  title = `${visitorName} & ${hostName} in Meeting`;
                  message = `${visitorName} was admitted into their consultation.`;
                }
                break;

              case 'COMPLETED':
                type = 'completed';
                iconType = 'check';
                badge = isDelivery ? 'Package Picked Up' : 'Concluded';
                badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (isDelivery) {
                  title = isMyVisitor ? `Package Picked Up` : `Package Collected (${hostName})`;
                  message = `Delivery from ${visitorName}${company} was picked up from reception.`;
                } else if (isMyVisitor) {
                  title = `Visit Concluded: ${visitorName}`;
                  message = `${visitorName} completed their visit with you and checked out of reception.`;
                } else {
                  title = `${visitorName} Checked Out`;
                  message = `Visit concluded with ${hostName}.`;
                }
                break;
              case 'NO_SHOW':
              case 'CANCELLED':
                type = 'cancelled';
                iconType = 'alert';
                badge = apt.status === 'NO_SHOW' ? 'No-Show' : 'Cancelled';
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                if (isMyVisitor) {
                  title = `Appointment ${apt.status === 'NO_SHOW' ? 'Missed' : 'Cancelled'}: ${visitorName}`;
                  message = `${visitorName} did not check in for your scheduled meeting.`;
                } else {
                  title = `Booking ${apt.status === 'NO_SHOW' ? 'Missed' : 'Cancelled'}: ${visitorName}`;
                  message = `Appointment with ${hostName} was ${apt.status.toLowerCase()}.`;
                }
                break;

              case 'SCHEDULED':
              default:
                type = 'scheduled';
                iconType = 'clock';
                badge = 'Upcoming';
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                const dateStr = apt.scheduled_time 
                  ? new Date(apt.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'Upcoming';
                if (isMyVisitor) {
                  title = `Upcoming Visit with ${visitorName}`;
                  message = `${visitorName}${company} has a booked appointment on ${dateStr}.`;
                } else {
                  title = `Booking: ${visitorName} & ${hostName}`;
                  message = `${visitorName} scheduled to meet ${hostName} on ${dateStr}.`;
                }
                break;
            }

            const isNew = !readIds.has(apt.id) && 
              ['CHECKED_IN', 'EXPECTED', 'NEEDS_REASSIGNMENT'].includes(apt.status) && 
              time.getTime() > lastRead;

            return {
              id: apt.id,
              appointment: apt,
              type,
              iconType,
              title,
              message,
              badge,
              badgeColor,
              time,
              status: apt.status,
              visitorName,
              hostName,
              isMyVisitor,
              isNew
            };
          }).sort((a: any, b: any) => b.time.getTime() - a.time.getTime());

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

  const handleNotificationClick = (notif: any) => {
    markIdAsRead(notif.id);
    if (onSelectAppointment) {
      onSelectAppointment(notif.appointment);
    }
  };

  const filtered = notifications.filter(n => {
    if (filterTab === 'lobby') return n.status === 'CHECKED_IN';
    if (filterTab === 'scheduled') return n.status === 'SCHEDULED' || n.status === 'EXPECTED';
    return true;
  });

  const newCount = notifications.filter(n => n.isNew).length;

  return (
    <div className={`space-y-5 animate-in fade-in duration-300 ${isPanel ? 'w-full p-4' : 'max-w-4xl mx-auto pb-12'}`}>
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`${isPanel ? 'text-lg' : 'text-2xl'} font-bold text-foreground tracking-tight`}>
              {isPanel ? 'Arrival Alerts' : 'Notification Feed'}
            </h1>
            {newCount > 0 && (
              <span className="bg-destructive/10 text-destructive border border-destructive/20 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {newCount} New
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentUser?.role === 'HOST' 
              ? `Personalized arrivals and meeting updates for ${currentUser?.full_name || 'your queue'}.`
              : 'Real-time visitor check-ins, reassignments, and office schedule events.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-semibold hover:underline transition-colors"
            >
              <Check size={13} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'all' 
              ? 'bg-primary text-primary-foreground shadow-xs' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterTab('lobby')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'lobby' 
              ? 'bg-emerald-600 text-white shadow-xs' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          Waiting in Lobby ({notifications.filter(n => n.status === 'CHECKED_IN').length})
        </button>
        <button
          onClick={() => setFilterTab('scheduled')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterTab === 'scheduled' 
              ? 'bg-blue-600 text-white shadow-xs' 
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          Scheduled ({notifications.filter(n => n.status === 'SCHEDULED' || n.status === 'EXPECTED').length})
        </button>
      </div>

      {/* Notification List Container */}
      <div className={`bg-card border border-border shadow-xs overflow-hidden ${isPanel ? 'rounded-2xl' : 'rounded-3xl'}`}>
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Fetching notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center text-muted-foreground mb-3">
              <Bell size={22} className="opacity-40" />
            </div>
            <p className="text-foreground font-bold text-sm">No notifications found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {filterTab === 'lobby' 
                ? 'No visitors are currently waiting in the reception lobby.'
                : 'You are all caught up! When a visitor checks in or books an appointment, alerts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(notif); }}
                className={`p-4 sm:p-5 transition-all cursor-pointer flex items-start gap-4 hover:bg-muted/40 focus:outline-hidden focus:bg-muted/50 group ${
                  notif.isNew ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                }`}
              >
                {/* Status Avatar */}
                <div className="shrink-0 mt-0.5">
                  {notif.iconType === 'arrival' ? (
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs relative">
                      <User size={18} />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 border-2 border-white animate-ping" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -top-1 -right-1 border-2 border-white" />
                    </div>
                  ) : notif.iconType === 'alert' ? (
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 shadow-xs">
                      <AlertTriangle size={18} />
                    </div>
                  ) : notif.iconType === 'check' ? (
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-200 shadow-xs">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-border shadow-xs">
                      <Clock size={18} />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold text-sm tracking-tight ${notif.isNew ? 'text-foreground' : 'text-foreground/90'}`}>
                        {notif.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${notif.badgeColor}`}>
                        {notif.badge}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notif.message}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary flex items-center gap-1 group-hover:underline">
                      <span>Click to view & take action</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>

                    <span className="text-[10px] text-muted-foreground/80">
                      {notif.time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Right Arrow indicator */}
                <div className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors pt-2">
                  <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
