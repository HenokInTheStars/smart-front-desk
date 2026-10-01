'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, ScanLine, Printer, AlertTriangle, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { generateBadgePDF } from '@/lib/badgeGenerator';
import HostFollowup from './HostFollowup';

interface ManualCheckInProps {
  currentUser: any;
}

export default function ManualCheckIn({ currentUser }: ManualCheckInProps) {
  // --- Check-in State ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    hostName: '',
    email: '',
    phone: ''
  });
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'followup'>('checkin');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // --- Camera State ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // --- Badges State ---
  const [recentBadges, setRecentBadges] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentBadges();
    return () => {
      // Cleanup camera on unmount
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
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
          .filter((a: any) => a.status === 'CHECKED_IN' || a.status === 'IN_MEETING')
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

  const startCamera = async () => {
    try {
      setCapturedPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setCapturedPhoto(dataUrl);
      
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const handleScanID = () => {
    setIsScanning(true);
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        name: prev.name || 'John Doe',
        company: prev.company || 'Acme Corp',
        email: prev.email || 'john.doe@example.com',
        phone: prev.phone || '555-010-9999'
      }));
      setIsScanning(false);
      alert("ID Scanned successfully! Details auto-filled.");
    }, 1500);
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;

      const [firstName, ...lastNames] = formData.name.split(' ');
      const payload = {
        firstName: firstName || '',
        lastName: lastNames.join(' '),
        purpose: formData.company,
        hostName: formData.hostName,
        email: formData.email || `walkin_${Date.now()}@temp.com`,
        phone: formData.phone,
        notes: capturedPhoto ? '[PHOTO_CAPTURED]' : ''
      };

      const res = await fetch('http://localhost:8000/visitors/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStep(3);
        fetchRecentBadges(); // refresh badges after a successful check-in
      } else {
        alert("Check-in failed. Please ensure the host name matches the directory.");
      }
    } catch (err) {
      console.error(err);
      alert("Error checking in.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Front Desk Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register walk-ins, print badges, and follow up with hosts.
          </p>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
         <button onClick={() => setActiveTab('checkin')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'checkin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Registration & Badges</button>
         <button onClick={() => setActiveTab('followup')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'followup' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Host Follow-up</button>
      </div>

      {activeTab === 'checkin' && (
        <div className="space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border p-6 rounded-3xl shadow-sm gap-4">
             <div>
               <h2 className="text-lg font-bold text-foreground tracking-tight">Walk-in Registration</h2>
               <p className="text-sm text-muted-foreground mt-1">Register a new visitor manually and print their badge.</p>
             </div>
             <button 
               onClick={() => { setShowRegistrationModal(true); setStep(1); }} 
               className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 whitespace-nowrap"
             >
               <UserPlus size={18} /> New Registration
             </button>
          </div>

          {/* Recent Badges Section */}
          <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Layers size={18} className="text-primary" /> Recent Print Jobs & Reprints
              </h3>
              <button onClick={fetchRecentBadges} className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <RefreshCw size={12} /> Refresh List
              </button>
            </div>
            
            <div className="p-0">
               {recentBadges.length === 0 ? (
                 <div className="p-12 text-center text-muted-foreground">
                   <Printer size={32} className="mx-auto mb-3 opacity-50" />
                   <p className="text-sm">No badges printed recently.</p>
                 </div>
               ) : (
                 <ul className="divide-y divide-border">
                  {recentBadges.map(badge => (
                    <li key={badge.id} className="p-5 hover:bg-muted/50 transition-colors flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{badge.visitor}</p>
                        <p className="text-xs text-muted-foreground mt-1">Host: <span className="font-medium text-foreground/80">{badge.host}</span> • {badge.time}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {badge.status === 'printed' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-md">
                            <CheckCircle2 size={12} /> Success
                          </span>
                        )}
                        {badge.status === 'failed' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1.5 rounded-md">
                            <AlertCircle size={12} /> Error
                          </span>
                        )}
                        {badge.status === 'printing' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-md animate-pulse">
                            <RefreshCw size={12} className="animate-spin" /> Printing...
                          </span>
                        )}
                        <button 
                          onClick={() => rePrint(badge.id)}
                          disabled={badge.status === 'printing'}
                          className="p-2.5 bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                          title="Re-Print Badge"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border shadow-xl rounded-3xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
             
             {/* Modal Header */}
             <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10 shrink-0">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                  <UserPlus size={20} className="text-primary" /> New Registration
                </h2>
                <button 
                  onClick={() => setShowRegistrationModal(false)} 
                  className="text-xs font-bold px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition-colors"
                >
                   Close
                </button>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   
                   {/* Left Side (Form Steps) */}
                   <div className="lg:col-span-2">
                     <div className="flex items-center gap-2 mb-8 border-b border-border/50 pb-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>1</div>
                        <div className={`h-1 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>2</div>
                        <div className={`h-1 w-12 rounded-full transition-colors ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>3</div>
                     </div>

                     {step === 1 && (
                       <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                         <h2 className="text-lg font-bold text-foreground">Visitor Information</h2>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-foreground/90 mb-1.5">Full Name</label>
                              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm" />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-foreground/90 mb-1.5">Email (Optional)</label>
                              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm" />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-foreground/90 mb-1.5">Phone (Optional)</label>
                              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm" />
                           </div>
                           <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-foreground/90 mb-1.5">Company / Purpose</label>
                              <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm" />
                           </div>
                           <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-foreground/90 mb-1.5">Host Searching For</label>
                              <input type="text" value={formData.hostName} onChange={e => setFormData({...formData, hostName: e.target.value})} placeholder="Search employee directory..." className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm" />
                           </div>
                         </div>
                         <div className="flex justify-end pt-6 border-t border-border/50">
                           <button onClick={() => setStep(2)} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-md">
                             Next: Verification
                           </button>
                         </div>
                       </div>
                     )}

                     {step === 2 && (
                       <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                         <h2 className="text-lg font-bold text-foreground">Identity Verification</h2>
                         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/10">
                            <ScanLine size={48} className="text-muted-foreground/50 mb-4" />
                            <p className="text-sm font-semibold text-muted-foreground mb-6">Scan physical ID or enter details manually</p>
                            <button onClick={handleScanID} disabled={isScanning} className="px-6 py-3 bg-card border border-border text-foreground/90 rounded-xl text-sm font-bold shadow-sm hover:bg-muted/50 transition-colors">
                              {isScanning ? 'Scanning...' : "Scan Driver's License"}
                            </button>
                         </div>
                         <div className="flex justify-between pt-6 border-t border-border/50">
                           <button onClick={() => setStep(1)} className="px-8 py-3 bg-muted text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-colors shadow-sm">
                             Back
                           </button>
                           <button onClick={handleCheckIn} disabled={isCheckingIn} className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-md">
                             {isCheckingIn ? 'Processing...' : 'Complete & Print Badge'}
                           </button>
                         </div>
                       </div>
                     )}

                     {step === 3 && (
                       <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-center py-12">
                         <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-6 border border-emerald-500/20 shadow-inner">
                            <Printer size={40} />
                         </div>
                         <h2 className="text-3xl font-black text-foreground">Check-In Complete</h2>
                         <p className="text-base text-muted-foreground max-w-sm mx-auto mt-2">
                           The host has been notified. The visitor badge is printing at the front desk printer.
                         </p>
                         <div className="flex justify-center gap-4 pt-10">
                            <button 
                              onClick={() => { 
                                setStep(1); 
                                setFormData({name: '', company: '', hostName: '', email: '', phone: ''}); 
                                setCapturedPhoto(null); 
                                setShowRegistrationModal(false);
                              }} 
                              className="px-8 py-3 bg-card border border-border text-foreground/90 rounded-xl font-bold text-sm hover:bg-muted/50 shadow-sm transition-colors"
                            >
                              Close
                            </button>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Right Side (Camera & Alerts) */}
                   <div className="space-y-6 bg-muted/10 p-6 rounded-2xl border border-border/50 h-fit">
                     <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                       <h3 className="font-bold text-amber-800 text-xs flex items-center gap-2 mb-1.5">
                         <AlertTriangle size={14} /> Security Notice
                       </h3>
                       <p className="text-[10px] text-amber-700/80 leading-relaxed">
                         Manual check-ins bypass the standard NDA signing flow on the kiosk. Ensure the visitor signs the physical logbook if required by policy.
                       </p>
                     </div>

                     <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
                       <h3 className="font-bold text-foreground text-xs mb-3 flex items-center gap-2">
                         <Camera size={14} className="text-muted-foreground" /> Web Camera
                       </h3>
                       <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden shadow-inner">
                          {capturedPhoto ? (
                            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <video ref={videoRef} className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`} autoPlay playsInline muted />
                              {!isCameraActive && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest relative z-10">Camera Off</p>}
                            </>
                          )}
                          <canvas ref={canvasRef} className="hidden" />
                       </div>
                       {!capturedPhoto ? (
                         <button 
                           onClick={isCameraActive ? capturePhoto : startCamera} 
                           className={`w-full mt-3 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isCameraActive ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-muted border border-border hover:bg-muted/80 text-foreground'}`}
                         >
                           {isCameraActive ? 'Snap Photo' : 'Start Camera'}
                         </button>
                       ) : (
                         <button 
                           onClick={() => { setCapturedPhoto(null); startCamera(); }} 
                           className="w-full mt-3 py-2.5 bg-card border border-border hover:bg-muted text-foreground rounded-lg text-xs font-bold transition-colors shadow-sm"
                         >
                           Retake Photo
                         </button>
                       )}
                     </div>
                   </div>

                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'followup' && (
        <HostFollowup currentUser={currentUser} />
      )}

    </div>
  );
}
