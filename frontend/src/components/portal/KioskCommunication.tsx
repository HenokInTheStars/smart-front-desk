'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Send, MessageSquare, Clock, User } from 'lucide-react';

interface KioskCommunicationProps {
  currentUser: any;
  isPanel?: boolean;
}

export default function KioskCommunication({ currentUser, isPanel = false }: KioskCommunicationProps) {
  const [message, setMessage] = useState('');
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  
  const [chatHistory, setChatHistory] = useState([
    { id: 1, sender: 'system', text: 'Select a visitor to start communication.', time: '' }
  ]);

  useEffect(() => {
    fetchActiveVisitors();
  }, []);

  const fetchActiveVisitors = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      
      const hostId = currentUser?.numeric_host_id;
      // Ideally we filter by hostId on the backend, but we can do it here if backend lacks it
      let url = 'http://localhost:8000/appointments';
      if (hostId) url += `?host_id=${hostId}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const raw = await res.json();
        const guests = (raw.data || [])
          .filter((a: any) => a.status === 'CHECKED_IN' || a.status === 'IN_MEETING')
          .map((a: any) => ({
            id: a.id,
            name: a.visitor?.full_name || 'Unknown',
            kiosk: 'Lobby Kiosk',
            checkIn: new Date(a.scheduled_time).getTime()
          }));
        setActiveVisitors(guests);
        if (guests.length > 0 && !selectedVisitor) {
           handleSelectVisitor(guests[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectVisitor = (visitor: any) => {
    setSelectedVisitor(visitor);
    setChatHistory([
      { id: Date.now(), sender: 'system', text: `${visitor.name} has checked in.`, time: new Date(visitor.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  };

  const quickReplies = [
    "I'll be right down.",
    "Running 5 minutes late.",
    "Please have a seat, I am wrapping up a meeting.",
    "Please see reception for a guest badge."
  ];

  const sendMessage = (text: string) => {
    if (!text.trim() || !selectedVisitor) return;
    const newMsg = {
      id: Date.now(),
      sender: 'host',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory([...chatHistory, newMsg]);
    setMessage('');
    
    // Simulate kiosk response
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'kiosk',
        text: "Guest acknowledged the message.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 2000);
  };

  return (
    <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col ${isPanel ? 'w-full h-full p-0' : 'max-w-5xl mx-auto h-[calc(100vh-120px)]'}`}>
      
      {!isPanel && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Kiosk Communication</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send real-time updates directly to the lobby kiosk screen for your waiting guests.
            </p>
          </div>
        </div>
      )}

      <div className={`flex-1 bg-card border border-border overflow-hidden flex flex-col ${isPanel ? 'border-none rounded-none' : 'rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] lg:flex-row'}`}>
        
        {/* Active Visitors List (Left Sidebar) */}
        <div className={`w-full border-b border-border bg-muted/30 flex flex-col ${isPanel ? 'shrink-0 h-48 overflow-y-auto' : 'lg:w-1/3 lg:border-b-0 lg:border-r'}`}>
           <div className="p-4 border-b border-border bg-card">
             <h3 className="font-bold text-foreground text-sm">Active Visitors</h3>
           </div>
           <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {activeVisitors.length === 0 ? (
                <p className="text-sm text-muted-foreground p-2 text-center">No active visitors.</p>
              ) : activeVisitors.map(visitor => (
                <div 
                  key={visitor.id} 
                  onClick={() => handleSelectVisitor(visitor)}
                  className={`border rounded-xl p-3 cursor-pointer transition-colors ${
                    selectedVisitor?.id === visitor.id 
                      ? 'bg-primary/10 border-primary/20' 
                      : 'bg-card border-border hover:bg-muted/50'
                  }`}
                >
                   <div className="flex items-center justify-between">
                     <p className={`font-bold text-sm ${selectedVisitor?.id === visitor.id ? 'text-indigo-900' : 'text-foreground'}`}>{visitor.name}</p>
                     <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                   </div>
                   <p className={`text-xs mt-1 ${selectedVisitor?.id === visitor.id ? 'text-primary' : 'text-muted-foreground'}`}>
                     Waiting at {visitor.kiosk}
                   </p>
                </div>
              ))}
           </div>
        </div>

        {/* Chat Area (Right Side) */}
        <div className={`w-full flex flex-col h-full bg-card relative ${isPanel ? 'flex-1' : 'lg:w-2/3'}`}>
          
          {/* Chat Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{selectedVisitor ? selectedVisitor.name : 'No visitor selected'}</h3>
                {selectedVisitor && <p className="text-xs text-muted-foreground flex items-center gap-1"><Monitor size={10} /> {selectedVisitor.kiosk} (Active)</p>}
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/30/50">
            {chatHistory.map((chat) => (
              <div key={chat.id} className={`flex flex-col ${chat.sender === 'host' ? 'items-end' : 'items-start'}`}>
                {chat.sender === 'system' && (
                  <div className="mx-auto bg-slate-100 text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                    {chat.text}
                  </div>
                )}
                
                {chat.sender !== 'system' && (
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                    chat.sender === 'host' 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-card border border-border text-foreground rounded-tl-sm'
                  }`}>
                    <p className="text-sm">{chat.text}</p>
                  </div>
                )}
                
                {chat.sender !== 'system' && (
                  <span className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                    <Clock size={10} /> {chat.time}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Quick Replies */}
          <div className="px-4 py-3 bg-card border-t border-border/50 flex gap-2 overflow-x-auto shrink-0 no-scrollbar">
            {quickReplies.map((reply, i) => (
              <button 
                key={i}
                onClick={() => sendMessage(reply)}
                className="whitespace-nowrap px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-foreground/90 rounded-full text-xs font-semibold transition-colors border border-border"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border shrink-0">
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
                placeholder="Type a custom message to display on the kiosk..."
                className="flex-1 px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              />
              <button 
                onClick={() => sendMessage(message)}
                disabled={!message.trim()}
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-center shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
