'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Users, CheckCircle, Search, Megaphone } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EvacuationRosterProps {
  currentUser: any;
}

export default function EvacuationRoster({ currentUser }: EvacuationRosterProps) {
  const [isAlertActive, setIsAlertActive] = useState(false);

  const [buildingRoster, setBuildingRoster] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRoster = async () => {
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) return;

        const res = await fetch(`http://localhost:8000/dashboard/evacuation-roster`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const raw = await res.json();
          const roster = (raw.data || []).map((item: any, idx: number) => ({
            id: item.visitor_id || idx,
            name: item.visitor_name || 'Unknown',
            role: 'Visitor', // all pulled from appointments are visitors
            host: item.host_name || 'Unknown',
            location: item.status === 'IN_MEETING' ? 'Meeting Rooms' : 'Lobby',
            bookedAt: item.booked_at ? new Date(item.booked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown',
            enteredRoomAt: item.entered_host_room_at ? new Date(item.entered_host_room_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          }));
          setBuildingRoster(roster);
        }
        
        // Fetch emergency status
        const statusRes = await fetch(`http://localhost:8000/dashboard/emergency/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setIsAlertActive(statusData.data.emergency_active);
        }
      } catch (err) {
        console.error('Failed to fetch evacuation roster:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoster();
  }, []);

  const handleToggleEmergency = async () => {
    try {
      const res = await fetch(`http://localhost:8000/dashboard/emergency/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsAlertActive(data.data.emergency_active);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text('EMERGENCY EVACUATION ROSTER', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);
    doc.text(`Total Building Occupancy: ${buildingRoster.length}`, 14, 38);

    const tableColumn = ["Name & Host", "Role", "Timeline & Location"];
    const tableRows: any[] = [];

    buildingRoster.forEach(person => {
      const nameData = person.role === 'Visitor' ? `${person.name}\n(Host: ${person.host})` : person.name;
      const timelineData = `${person.location}\nBooked: ${person.bookedAt}${person.enteredRoomAt ? `\nEntered: ${person.enteredRoomAt}` : ''}`;
      
      const personData = [
        nameData,
        person.role,
        timelineData
      ];
      tableRows.push(personData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 52,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [220, 38, 38] },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 80 }
      }
    });

    doc.save(`Evacuation_Roster_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Evacuation Roster</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Emergency master list of everyone currently in the building.
          </p>
        </div>
        <div className="flex gap-3">
           <button 
            onClick={handleExportPDF}
            className="px-4 py-2 bg-card border border-border text-foreground/90 hover:bg-muted/30 rounded-xl text-sm font-semibold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2"
          >
            <Download size={16} /> Export PDF
          </button>
          <button 
            onClick={handleToggleEmergency}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2 ${
              isAlertActive 
                ? 'bg-slate-900 text-white hover:bg-slate-800' 
                : 'bg-destructive text-white hover:bg-rose-700 shadow-rose-500/30'
            }`}
          >
            <Megaphone size={16} /> 
            {isAlertActive ? 'Cancel Emergency Mode' : 'Trigger Emergency Mode'}
          </button>
        </div>
      </div>

      {isAlertActive && (
        <div className="bg-destructive/10 border-2 border-rose-500 p-6 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-500/20 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-destructive animate-pulse border-2 border-destructive/20">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-destructive uppercase tracking-wide">Emergency Evacuation Active</h2>
              <p className="text-destructive font-medium">Please use this roster to verify all personnel are accounted for at the assembly point.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30/50">
           <div className="flex items-center gap-2 text-foreground/90 font-bold">
             <Users size={18} className="text-primary" />
             Building Occupancy: {buildingRoster.length}
           </div>
           <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
            <input type="text" placeholder="Search roster..." className="pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary outline-none w-64" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-black tracking-wider">
              <tr>
                <th className="px-6 py-4">Name & Host</th>
                <th className="px-6 py-4">Role / Type</th>
                <th className="px-6 py-4">Timeline & Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div></td>
                </tr>
              ) : buildingRoster.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground font-medium">Building is currently empty.</td>
                </tr>
              ) : (
                buildingRoster.map(person => {
                  return (
                    <tr key={person.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-6 py-4">
                        <p className="font-bold text-foreground">{person.name}</p>
                        {person.role === 'Visitor' && <p className="text-xs text-muted-foreground font-semibold mt-1">Host: {person.host}</p>}
                      </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        person.role === 'Visitor' ? 'bg-amber-100 text-amber-700' : 
                        person.role === 'Employee' ? 'bg-blue-100 text-blue-700' : 
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {person.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex flex-col gap-1">
                        <p className="text-slate-900">{person.location}</p>
                        <p className="text-xs text-slate-500">Booked at: {person.bookedAt}</p>
                        {person.enteredRoomAt && (
                          <p className="text-xs text-blue-600 font-bold">Entered Host Room: {person.enteredRoomAt}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
