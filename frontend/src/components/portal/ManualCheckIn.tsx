'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, Camera, ScanLine, Printer, AlertTriangle } from 'lucide-react';

interface ManualCheckInProps {
  currentUser: any;
}

export default function ManualCheckIn({ currentUser }: ManualCheckInProps) {
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup camera on unmount
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Manual Check-In</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bypass the self-service kiosk to register a walk-in visitor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Form Area */}
        <div className="md:col-span-2 bg-card border border-border p-8 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
           
           <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-primary text-white' : 'bg-slate-100 text-muted-foreground/70'}`}>1</div>
                <div className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-100'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-primary text-white' : 'bg-slate-100 text-muted-foreground/70'}`}>2</div>
                <div className={`h-1 w-8 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-slate-100'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-primary text-white' : 'bg-slate-100 text-muted-foreground/70'}`}>3</div>
             </div>
           </div>

           {step === 1 && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-lg font-bold text-foreground">Visitor Information</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground/90 mb-1">Full Name</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-foreground/90 mb-1">Email (Optional)</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-foreground/90 mb-1">Phone (Optional)</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground/90 mb-1">Company / Purpose</label>
                    <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-foreground/90 mb-1">Host Searching For</label>
                    <input type="text" value={formData.hostName} onChange={e => setFormData({...formData, hostName: e.target.value})} placeholder="Search employee directory..." className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" />
                 </div>
               </div>
               <div className="flex justify-end pt-4">
                 <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                   Next: Verification
                 </button>
               </div>
             </div>
           )}

           {step === 2 && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-lg font-bold text-foreground">Identity Verification</h2>
               <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-2xl bg-muted/30">
                  <ScanLine size={48} className="text-muted-foreground/70 mb-4" />
                  <p className="text-sm font-semibold text-muted-foreground mb-4">Scan physical ID or enter details manually</p>
                  <button onClick={handleScanID} disabled={isScanning} className="px-4 py-2 bg-card border border-slate-300 text-foreground/90 rounded-lg text-sm font-bold shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-muted/30">
                    {isScanning ? 'Scanning...' : "Scan Driver's License"}
                  </button>
               </div>
               <div className="flex justify-between pt-4">
                 <button onClick={() => setStep(1)} className="px-6 py-2.5 bg-slate-100 text-muted-foreground rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                   Back
                 </button>
                 <button onClick={handleCheckIn} disabled={isCheckingIn} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                   {isCheckingIn ? 'Processing...' : 'Complete & Print Badge'}
                 </button>
               </div>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-center py-8">
               <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4 border border-indigo-100">
                  <Printer size={32} />
               </div>
               <h2 className="text-2xl font-black text-foreground">Check-In Complete</h2>
               <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                 The host has been notified. The visitor badge is printing at the front desk printer.
               </p>
               <div className="flex justify-center gap-4 pt-8">
                  <button onClick={() => { setStep(1); setFormData({name: '', company: '', hostName: '', email: '', phone: ''}); setCapturedPhoto(null); }} className="px-6 py-2.5 bg-card border border-border text-foreground/90 rounded-xl font-bold text-sm hover:bg-muted/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors">
                    Start Over
                  </button>
                  <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors">
                    Re-Print Badge
                  </button>
               </div>
             </div>
           )}
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> Security Notice
            </h3>
            <p className="text-xs text-amber-700">
              Manual check-ins bypass the standard NDA signing flow on the kiosk. Ensure the visitor signs the physical logbook if required by policy.
            </p>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <Camera size={16} className="text-muted-foreground/70" /> Web Camera
            </h3>
            <div className="aspect-video bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
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
                className={`w-full mt-3 py-2 rounded-lg text-xs font-bold transition-colors ${isCameraActive ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 hover:bg-slate-200 text-foreground/90'}`}
              >
                {isCameraActive ? 'Snap Photo' : 'Start Camera'}
              </button>
            ) : (
              <button 
                onClick={() => { setCapturedPhoto(null); startCamera(); }} 
                className="w-full mt-3 py-2 bg-slate-100 hover:bg-slate-200 text-foreground/90 rounded-lg text-xs font-bold transition-colors"
              >
                Retake Photo
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
