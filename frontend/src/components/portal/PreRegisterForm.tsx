'use client';

import React, { useState } from 'react';
import { Calendar, User, Building, Clock, Mail, Send, CheckCircle2, X } from 'lucide-react';

interface PreRegisterFormProps {
  currentUser: any;
  onClose?: () => void;
}

export default function PreRegisterForm({ currentUser, onClose }: PreRegisterFormProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    date: '',
    time: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      const [firstName, ...lastNames] = formData.name.split(' ');
      const scheduledTimeStr = `${formData.date}T${formData.time}:00Z`;

      const payload = {
        firstName,
        lastName: lastNames.join(' '),
        email: formData.email,
        purpose: formData.company,
        host_id: currentUser?.numeric_host_id,
        scheduled_time: scheduledTimeStr
      };

      const res = await fetch('http://localhost:8000/visitors/schedule-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          if (onClose) onClose();
        }, 2000);
        setFormData({ name: '', email: '', company: '', date: '', time: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative overflow-hidden w-full max-w-3xl mx-auto">
      {/* Success Overlay */}
      {isSubmitted && (
         <div className="absolute inset-0 bg-card/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
           <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20 animate-bounce">
             <CheckCircle2 size={32} />
           </div>
           <h2 className="text-xl font-bold text-foreground">Guest Registered!</h2>
           <p className="text-sm text-muted-foreground mt-1">Email invitation sent successfully.</p>
         </div>
      )}

      <div className="p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Pre-Register Guest</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule an anticipated visitor. They will receive an email invitation with their appointment details.
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <X size={24} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Guest Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border/50">Guest Details</h3>
              
              <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input required type="text" placeholder="John Doe" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input required type="email" placeholder="john@company.com" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1">Company Name</label>
                <div className="relative">
                  <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input type="text" placeholder="Acme Corp" 
                    value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 pb-2 border-b border-border/50">Visit Details</h3>
               
               <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1">Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input required type="date" 
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all text-foreground/90" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground/90 mb-1">Time</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <input required type="time" 
                      value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}
                      className="w-full pl-9 pr-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all text-foreground/90" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/90 mb-1">Duration</label>
                  <select className="w-full px-3 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all text-foreground/90">
                    <option>30 Mins</option>
                    <option>1 Hour</option>
                    <option>2 Hours</option>
                    <option>All Day</option>
                  </select>
                </div>
              </div>

               <div>
                <label className="block text-xs font-bold text-foreground/90 mb-1">Purpose of Visit</label>
                <input required type="text" placeholder="e.g. Interview, Meeting" className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all" />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/50 flex justify-end">
            <button type="submit" className="px-6 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
              <Send size={16} /> Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
