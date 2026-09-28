'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Plane, Save, Info, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { getHostSchedule, updateHostSchedule } from '@/lib/api/schedules';
import { getAppointments } from '@/lib/api/appointments';
import AnimatedCheckbox from '@/components/AnimatedCheckbox';

interface ManageAvailabilityProps {
  currentUser: any;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ManageAvailability({ currentUser }: ManageAvailabilityProps) {
  const initialStatus = currentUser?.availability_status === 2 ? 'ooo' : currentUser?.availability_status === 3 ? 'in_meeting' : 'available';
  const [status, setStatus] = useState(initialStatus);
  const [oooStart, setOooStart] = useState('');
  const [oooEnd, setOooEnd] = useState('');
  
  const [shifts, setShifts] = useState(
    DAYS_OF_WEEK.map((day, idx) => ({
      day_of_week: idx,
      enabled: idx >= 0 && idx <= 4, // 0 to 4 is Monday to Friday
      start_time: '09:00',
      end_time: '17:00'
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.employee_id || !currentUser?.id) return;
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;
        
        const sched = await getHostSchedule(currentUser.employee_id, token);
        
        // Extract OOO dates if any
        if (sched.holidays && sched.holidays.length > 0) {
           // We'll just take the min and max dates as the start and end
           const dates = sched.holidays.map((h: any) => h.date).sort();
           setOooStart(dates[0]);
           setOooEnd(dates[dates.length - 1]);
        }

        const newShifts = DAYS_OF_WEEK.map((_, idx) => {
          const existing = sched.shifts.find((s: any) => s.day_of_week === idx);
          if (existing) {
            return { 
              day_of_week: idx, 
              enabled: true, 
              start_time: existing.start_time.substring(0, 5), 
              end_time: existing.end_time.substring(0, 5) 
            };
          }
          return { 
            day_of_week: idx, 
            enabled: idx >= 0 && idx <= 4, 
            start_time: '09:00', 
            end_time: '17:00' 
          };
        });
        setShifts(newShifts);

        // Load Appointments
        const apts = await getAppointments(token, currentUser.numeric_host_id);
        setAppointments(apts);
      } catch (err) {
        console.error('Failed to load schedule or appointments', err);
      }
    };
    loadData();
  }, [currentUser]);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    const token = sessionStorage.getItem('access_token');
    if (!token) return;

    let statusInt = 1;
    if (newStatus === 'ooo') statusInt = 2;
    if (newStatus === 'in_meeting') statusInt = 3;

    try {
      await fetch(`http://localhost:8000/auth/me/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability_status: statusInt })
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token || !currentUser?.employee_id) return;

      const holidays = [];
      if (oooStart && oooEnd) {
         let current = new Date(oooStart);
         const end = new Date(oooEnd);
         while (current <= end) {
            holidays.push({
               date: current.toISOString().split('T')[0],
               reason: "Out of Office"
            });
            current.setDate(current.getDate() + 1);
         }
      }

      const payload = {
        shifts: shifts.filter(s => s.enabled).map(s => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time
        })),
        holidays: holidays
      };

      await updateHostSchedule(currentUser.employee_id, payload, token);
      alert('Schedule & OOO saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0 = Mon
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = getDaysInMonth(currentMonth);
  const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduled_time);
      return aptDate.getDate() === date.getDate() && 
             aptDate.getMonth() === date.getMonth() && 
             aptDate.getFullYear() === date.getFullYear();
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-12">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Schedule & Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control your real-time status and view upcoming appointments.
          </p>
        </div>
      </div>

      {/* Real-time Status */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Real-Time Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <button 
             onClick={() => handleStatusChange('available')}
             className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
               status === 'available' ? 'border-emerald-500 bg-emerald-500/10' : 'border-border/50 bg-card hover:bg-muted/30'
             }`}
           >
             <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status === 'available' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-muted-foreground/70'}`}>
                <Clock size={24} />
             </div>
             <div className="text-center">
               <p className={`font-bold ${status === 'available' ? 'text-emerald-900' : 'text-foreground/90'}`}>Available</p>
               <p className="text-xs text-muted-foreground mt-1">Standard notifications</p>
             </div>
           </button>

           <button 
             onClick={() => handleStatusChange('in_meeting')}
             className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
               status === 'in_meeting' ? 'border-amber-500 bg-amber-50' : 'border-border/50 bg-card hover:bg-muted/30'
             }`}
           >
             <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status === 'in_meeting' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-100 text-muted-foreground/70'}`}>
                <CalendarIcon size={24} />
             </div>
             <div className="text-center">
               <p className={`font-bold ${status === 'in_meeting' ? 'text-amber-900' : 'text-foreground/90'}`}>Available but not for guests</p>
               <p className="text-[10px] text-muted-foreground mt-1">Silent notifications only</p>
             </div>
           </button>

           <button 
             onClick={() => handleStatusChange('ooo')}
             className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
               status === 'ooo' ? 'border-rose-500 bg-destructive/10' : 'border-border/50 bg-card hover:bg-muted/30'
             }`}
           >
             <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status === 'ooo' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-100 text-muted-foreground/70'}`}>
                <Plane size={24} />
             </div>
             <div className="text-center">
               <p className={`font-bold ${status === 'ooo' ? 'text-rose-900' : 'text-foreground/90'}`}>Not Available</p>
               <p className="text-xs text-muted-foreground mt-1">Guests routed to reception</p>
             </div>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Working Hours */}
        <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] h-fit">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Weekly Working Hours</h2>
          
          <div className="space-y-3">
            {shifts.map((shift, idx) => (
              <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${shift.enabled ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                <div className="flex items-center gap-3 w-1/3">
                  <AnimatedCheckbox 
                    checked={shift.enabled}
                    onChange={(checked) => {
                      const newShifts = [...shifts];
                      newShifts[idx].enabled = checked;
                      setShifts(newShifts);
                    }}
                  />
                  <span className={`text-sm font-bold ${shift.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {DAYS_OF_WEEK[idx].substring(0, 3)}
                  </span>
                </div>
                
                <div className={`flex items-center gap-2 flex-1 justify-end transition-opacity ${shift.enabled ? 'opacity-100' : 'opacity-40'}`}>
                  <input 
                    type="time" 
                    disabled={!shift.enabled}
                    value={shift.start_time}
                    onChange={(e) => {
                      const newShifts = [...shifts];
                      newShifts[idx].start_time = e.target.value;
                      setShifts(newShifts);
                    }}
                    className="px-2 py-1 text-xs bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:bg-muted font-mono"
                  />
                  <span className="text-muted-foreground text-[10px] font-bold">to</span>
                  <input 
                    type="time" 
                    disabled={!shift.enabled}
                    value={shift.end_time}
                    onChange={(e) => {
                      const newShifts = [...shifts];
                      newShifts[idx].end_time = e.target.value;
                      setShifts(newShifts);
                    }}
                    className="px-2 py-1 text-xs bg-card border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary disabled:bg-muted font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t border-border/50">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>

        {/* Appointment Calendar */}
        <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
             <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Appointments</h2>
             <div className="flex items-center gap-3">
               <button onClick={prevMonth} className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={18}/></button>
               <span className="text-sm font-bold text-foreground w-28 text-center">
                 {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
               </span>
               <button onClick={nextMonth} className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={18}/></button>
             </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 flex-1">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="h-14 md:h-16 rounded-xl bg-transparent" />;
              
              const dayApts = getAppointmentsForDate(date);
              
              const now = new Date();
              const isToday = now.toDateString() === date.toDateString();
              
              // Remove time part to accurately compare dates
              const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              const isPast = dateMidnight < todayMidnight;
              
              const hasApts = dayApts.length > 0;

              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`relative flex flex-col p-1 h-14 md:h-16 rounded-xl border transition-all overflow-hidden group cursor-pointer ${
                    isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' :
                    isToday ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-card'
                  } ${
                    isPast && !isToday && !isSelected ? 'opacity-40 bg-muted/30' : 'hover:bg-muted/30'
                  }`}
                >
                  <span className={`text-xs font-bold ml-1 mt-0.5 ${isToday ? 'text-primary' : 'text-foreground/70'}`}>
                    {date.getDate()}
                  </span>
                  
                  {hasApts && (
                    <div className="mt-auto mb-1 mx-1 flex flex-col gap-0.5">
                      {dayApts.slice(0, 2).map((apt, i) => (
                        <div key={i} className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold px-1 py-0.5 rounded truncate" title={apt.visitor?.full_name}>
                          {new Date(apt.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      ))}
                      {dayApts.length > 2 && (
                        <div className="text-[9px] text-muted-foreground text-center font-bold">
                          +{dayApts.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
             <h3 className="text-xs font-bold text-foreground/80 mb-3">
               {selectedDate ? `Appointments on ${selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'Upcoming this week'}
             </h3>
             <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
               {appointments
                  .filter(a => {
                    if (selectedDate) {
                      const aptDate = new Date(a.scheduled_time);
                      return aptDate.toDateString() === selectedDate.toDateString();
                    } else {
                      return new Date(a.scheduled_time) >= new Date() && new Date(a.scheduled_time) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    }
                  })
                  .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
                  .slice(0, 4)
                  .map(apt => (
                 <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                   <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                     <User size={14} />
                   </div>
                   <div className="min-w-0 flex-1">
                     <p className="text-xs font-bold text-foreground truncate">{apt.visitor?.full_name || 'Guest'}</p>
                     <p className="text-[10px] text-muted-foreground truncate">{apt.purpose || 'Meeting'}</p>
                   </div>
                   <div className="text-right shrink-0">
                     <p className="text-[10px] font-bold text-foreground">
                       {new Date(apt.scheduled_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                     </p>
                     <p className="text-[10px] text-muted-foreground">
                       {new Date(apt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </p>
                   </div>
                 </div>
               ))}
               {appointments.filter(a => selectedDate ? new Date(a.scheduled_time).toDateString() === selectedDate.toDateString() : new Date(a.scheduled_time) >= new Date() && new Date(a.scheduled_time) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length === 0 && (
                 <div className="text-center py-4 text-xs text-muted-foreground italic">
                   {selectedDate ? 'No appointments on this date.' : 'No upcoming appointments this week.'}
                 </div>
               )}
              </div>
           </div>

           {/* OOO Setup Widget */}
           <div className="bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col h-fit mt-6">
             <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Out of Office Schedule</h2>
             <div className="flex flex-col xl:flex-row items-center gap-4 mt-2">
               <div className="w-full">
                 <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Date</label>
                 <input 
                   type="date" 
                   value={oooStart}
                   onChange={(e) => setOooStart(e.target.value)}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                 />
               </div>
               <span className="text-muted-foreground hidden xl:block mt-6">to</span>
               <div className="w-full">
                 <label className="block text-xs font-semibold text-muted-foreground mb-1.5">End Date</label>
                 <input 
                   type="date" 
                   value={oooEnd}
                   onChange={(e) => setOooEnd(e.target.value)}
                   className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] transition-all"
                 />
               </div>
             </div>
             {(oooStart || oooEnd) && (
               <div className="mt-4 text-[11px] text-rose-500 font-medium flex items-center gap-2 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                 <Info size={14} className="shrink-0" /> Guests will be routed automatically to reception on these dates. Remember to click "Save Schedule".
               </div>
             )}
           </div>

        </div>
      </div>
    </div>
  );
}
