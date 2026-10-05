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
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto w-full">
      
      {/* Header and Small Status Pills */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Schedule & Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control your real-time status and view upcoming appointments.
          </p>
        </div>
        
        {/* Small Status Pills */}
        <div className="flex items-center gap-1.5 bg-card border border-border p-1.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 overflow-x-auto max-w-full">
           <button 
             onClick={() => handleStatusChange('available')}
             className={`px-4 py-2 rounded-full text-[11px] font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
               status === 'available' ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]' : 'text-muted-foreground hover:bg-muted'
             }`}
           >
              <Clock size={14} /> Available
           </button>
           <button 
             onClick={() => handleStatusChange('in_meeting')}
             className={`px-4 py-2 rounded-full text-[11px] font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
               status === 'in_meeting' ? 'bg-amber-500 text-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]' : 'text-muted-foreground hover:bg-muted'
             }`}
           >
              <CalendarIcon size={14} /> Available (No Guests)
           </button>
           <button 
             onClick={() => handleStatusChange('ooo')}
             className={`px-4 py-2 rounded-full text-[11px] font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
               status === 'ooo' ? 'bg-rose-500 text-white shadow-[0_4px_12px_rgba(0,0,0,0.03)]' : 'text-muted-foreground hover:bg-muted'
             }`}
           >
              <Plane size={14} /> Not Available
           </button>
        </div>
      </div>

      {/* Main Split Content - Non Scrollable Wrapper */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        
        {/* Left Column (Working Hours & OOO) */}
        <div className="w-full lg:w-[420px] flex flex-col gap-6 overflow-y-auto pr-2 pb-4 shrink-0">
          
          {/* Weekly Working Hours */}
          <div className="bg-card border border-border p-5 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Weekly Working Hours</h2>
            
            <div className="space-y-2">
              {shifts.map((shift, idx) => (
                <div key={idx} className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${shift.enabled ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'}`}>
                  <div className="flex items-center gap-3 w-1/3">
                    <AnimatedCheckbox 
                      checked={shift.enabled}
                      onChange={(checked) => {
                        const newShifts = [...shifts];
                        newShifts[idx].enabled = checked;
                        setShifts(newShifts);
                      }}
                    />
                    <span className={`text-xs font-bold ${shift.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {DAYS_OF_WEEK[idx].substring(0, 3)}
                    </span>
                  </div>
                  
                  <div className={`flex items-center gap-1.5 flex-1 justify-end transition-opacity ${shift.enabled ? 'opacity-100' : 'opacity-40'}`}>
                    <input 
                      type="time" 
                      disabled={!shift.enabled}
                      value={shift.start_time}
                      onChange={(e) => {
                        const newShifts = [...shifts];
                        newShifts[idx].start_time = e.target.value;
                        setShifts(newShifts);
                      }}
                      className="px-1.5 py-1 text-[10px] bg-card border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:bg-muted font-mono w-[65px]"
                    />
                    <span className="text-muted-foreground text-[9px] font-bold">to</span>
                    <input 
                      type="time" 
                      disabled={!shift.enabled}
                      value={shift.end_time}
                      onChange={(e) => {
                        const newShifts = [...shifts];
                        newShifts[idx].end_time = e.target.value;
                        setShifts(newShifts);
                      }}
                      className="px-1.5 py-1 text-[10px] bg-card border border-border rounded-md outline-none focus:ring-2 focus:ring-primary disabled:bg-muted font-mono w-[65px]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={14} /> {isSaving ? 'Saving...' : 'Save Schedule'}
              </button>
            </div>
          </div>



        </div>

        {/* Right Column (Giant Calendar) */}
        <div className="flex-1 bg-card border border-border rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden min-h-[500px]">
          {/* Calendar & OOO Header */}
          <div className="flex flex-col border-b border-border/50 shrink-0">
             
             {/* OOO Setup Strip */}
             <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-muted/10 gap-4">
               <div className="flex items-center gap-2">
                 <Plane size={16} className="text-muted-foreground" />
                 <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Out of Office Setup</h2>
               </div>
               
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">Start</label>
                   <input 
                     type="date" 
                     value={oooStart}
                     onChange={(e) => setOooStart(e.target.value)}
                     className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-[130px]"
                   />
                 </div>
                 <div className="flex items-center gap-2">
                   <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">End</label>
                   <input 
                     type="date" 
                     value={oooEnd}
                     onChange={(e) => setOooEnd(e.target.value)}
                     className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-[130px]"
                   />
                 </div>
               </div>
             </div>

             {(oooStart || oooEnd) && (
               <div className="mx-4 mb-4 text-[10px] text-destructive font-bold flex items-center justify-center gap-2 bg-destructive/10 p-2 rounded-md border border-destructive/20 leading-tight">
                 <Info size={14} className="shrink-0" /> Guests will be routed automatically to reception on these dates. Remember to save schedule.
               </div>
             )}

             {/* Month Navigation */}
             <div className="flex items-center justify-between p-3 bg-muted/30 border-t border-border/50">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Appointments</h2>
                <div className="flex items-center gap-3 bg-card border border-border rounded-full px-2 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <button onClick={prevMonth} className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronLeft size={16}/></button>
                  <span className="text-xs font-bold text-foreground w-28 text-center uppercase tracking-widest">
                    {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
                  </span>
                  <button onClick={nextMonth} className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"><ChevronRight size={16}/></button>
                </div>
             </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-border bg-card shrink-0">
            {weekDayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid (Takes all remaining space and divides it equally) */}
          <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-border gap-px overflow-hidden">
            {calendarDays.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="bg-muted/10 h-full" />;
              
              const dayApts = getAppointmentsForDate(date);
              const now = new Date();
              const isToday = now.toDateString() === date.toDateString();
              
              const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              const isPast = dateMidnight < todayMidnight;
              
              const isSelected = selectedDate?.toDateString() === date.toDateString();

              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`relative flex flex-col p-1.5 sm:p-2 bg-card h-full transition-colors cursor-pointer overflow-y-auto ${
                    isSelected ? 'ring-inset ring-2 ring-primary bg-primary/5' : 
                    isToday ? 'bg-primary/5' : 'hover:bg-muted/30'
                  } ${isPast && !isToday && !isSelected ? 'opacity-50' : ''}`}
                >
                  <span className={`text-xs font-bold mb-1 ${isToday ? 'text-primary bg-primary/10 w-6 h-6 flex items-center justify-center rounded-full' : 'text-foreground/70'}`}>
                    {date.getDate()}
                  </span>
                  
                  <div className="flex flex-col gap-1 mt-1">
                    {dayApts.map((apt, i) => (
                      <div key={i} className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-1 rounded-md flex flex-col shadow-[0_1px_2px_rgba(0,0,0,0.02)]" title={apt.visitor?.full_name}>
                        <span className="truncate leading-tight">{apt.visitor?.full_name || 'Guest'}</span>
                        <span className="opacity-70 text-[8px]">{new Date(apt.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
