'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, Camera, ScanLine, Printer, AlertTriangle, CheckCircle2, 
  AlertCircle, RefreshCw, Layers, User, Mail, Phone, Building, 
  Search, X, Check, ArrowRight, ArrowLeft, ShieldCheck, UserCheck, Sparkles
} from 'lucide-react';
import { generateBadgePDF } from '@/lib/badgeGenerator';
import HostFollowup from './HostFollowup';

interface ManualCheckInProps {
  currentUser: any;
}

interface EmployeeItem {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  phone?: string;
  availability_status?: number;
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function ManualCheckIn({ currentUser }: ManualCheckInProps) {
  // --- Check-in State ---
  const [step, setStep] = useState<1 | 2 | 'success'>(1);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    hostName: '',
    hostDepartment: '',
    hostId: '',
    email: '',
    phone: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'followup'>('checkin');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // --- Employees Directory State ---
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [hostSearchQuery, setHostSearchQuery] = useState('');
  const [isHostDropdownOpen, setIsHostDropdownOpen] = useState(false);
  const hostDropdownRef = useRef<HTMLDivElement>(null);

  // --- Camera State ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // --- Badges State ---
  const [recentBadges, setRecentBadges] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentBadges();
    fetchEmployees();

    return () => {
      // Cleanup camera stream on unmount
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Close host dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hostDropdownRef.current && !hostDropdownRef.current.contains(event.target as Node)) {
        setIsHostDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/employees`);
      if (res.ok) {
        const json = await res.json();
        setEmployees(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employee directory:', err);
    }
  };

  const fetchRecentBadges = async () => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${getBaseUrl()}/appointments?limit=10`, {
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
            status: 'printed',
            time: new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateStr: new Date(a.scheduled_time).toLocaleDateString() + ' ' + new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
        setRecentBadges(guests);
      }
    } catch (e) {
      console.error('Failed to fetch recent badges:', e);
    }
  };

  const printBadgeNow = (visitorName: string, hostName: string) => {
    const dateStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const doc = generateBadgePDF(visitorName, hostName, dateStr);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
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
      alert("Could not access camera. Please check permissions or verify camera device.");
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
        company: prev.company || 'Acme Corp - Client Meeting',
        email: prev.email || 'john.doe@example.com',
        phone: prev.phone || '555-010-9999'
      }));
      setValidationErrors({});
      setIsScanning(false);
    }, 1200);
  };

  // --- Step 1 Form Validation ---
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Full name is required (minimum 2 characters)';
    }

    if (!formData.company.trim()) {
      errors.company = 'Company / Visit Purpose is required';
    }

    if (!formData.hostName.trim()) {
      errors.hostName = 'Please select a host from the employee directory';
    }

    if (!formData.phone.trim() || formData.phone.trim().length < 6) {
      errors.phone = 'Phone number is required (minimum 6 digits)';
    }

    if (formData.email.trim() && !formData.email.includes('@')) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToVerification = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSelectHost = (emp: EmployeeItem) => {
    setFormData(prev => ({
      ...prev,
      hostName: emp.full_name,
      hostDepartment: emp.department,
      hostId: emp.id
    }));
    setHostSearchQuery('');
    setIsHostDropdownOpen(false);
    setValidationErrors(prev => {
      const updated = { ...prev };
      delete updated.hostName;
      return updated;
    });
  };

  const handleClearSelectedHost = () => {
    setFormData(prev => ({
      ...prev,
      hostName: '',
      hostDepartment: '',
      hostId: ''
    }));
  };

  const filteredEmployees = employees.filter(emp => {
    const q = hostSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return emp.full_name.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q);
  });

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        alert("Session expired. Please sign in again.");
        return;
      }

      const [firstName, ...lastNames] = formData.name.trim().split(' ');
      const payload = {
        firstName: firstName || 'Guest',
        lastName: lastNames.join(' ') || 'Visitor',
        purpose: formData.company,
        hostName: formData.hostName,
        email: formData.email.trim() || `walkin_${Date.now()}@temp.matrix`,
        phone: formData.phone.trim() || undefined,
        notes: capturedPhoto ? '[PHOTO_CAPTURED]' : ''
      };

      const res = await fetch(`${getBaseUrl()}/visitors/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Automatically print badge upon completion
        printBadgeNow(formData.name, formData.hostName);
        setStep('success');
        fetchRecentBadges();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.detail || "Check-in failed. Please ensure the host matches an active employee.");
      }
    } catch (err) {
      console.error('Check-in network error:', err);
      alert("Error connecting to backend check-in service.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const resetRegistrationForm = () => {
    setStep(1);
    setFormData({
      name: '',
      company: '',
      hostName: '',
      hostDepartment: '',
      hostId: '',
      email: '',
      phone: ''
    });
    setCapturedPhoto(null);
    setValidationErrors({});
    setHostSearchQuery('');
    setIsHostDropdownOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Front Desk Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register walk-in guests, print thermal visitor badges, and monitor arrivals.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
         <button 
           onClick={() => setActiveTab('checkin')} 
           className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'checkin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
         >
           Registration & Badges
         </button>
         <button 
           onClick={() => setActiveTab('followup')} 
           className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'followup' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
         >
           Host Follow-up
         </button>
      </div>

      {activeTab === 'checkin' && (
        <div className="space-y-6">
          
          {/* Quick Action Card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border p-6 rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] gap-4">
             <div>
               <h2 className="text-lg font-bold text-foreground tracking-tight">Walk-in Visitor Registration</h2>
               <p className="text-sm text-muted-foreground mt-1">Register a new visitor manually, capture their photo, and generate their badge.</p>
             </div>
             <button 
               onClick={() => { resetRegistrationForm(); setShowRegistrationModal(true); }} 
               className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2 whitespace-nowrap"
             >
               <UserPlus size={18} /> New Registration
             </button>
          </div>

          {/* Recent Badges Section */}
          <div className="bg-card border border-border rounded-3xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="font-bold text-foreground">
                Recent Print Jobs & Reprints
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
                          className="p-2.5 bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
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
          <div className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
             
             {/* Modal Header */}
             <div className="flex justify-between items-center p-6 border-b border-border bg-muted/10 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {step === 'success' ? 'Registration Complete' : 'New Visitor Registration'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {step === 1 && 'Step 1 of 2: Enter Visitor Information'}
                    {step === 2 && 'Step 2 of 2: Review and Identity Verification'}
                    {step === 'success' && 'Visitor badge ready & host notified'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowRegistrationModal(false)} 
                  className="text-xs font-bold px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-foreground transition-colors"
                >
                   Close
                </button>
             </div>

             {/* Modal Body */}
             <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                
                {/* Stepper (Only visible during input steps 1 & 2) */}
                {step !== 'success' && (
                  <div className="flex items-center justify-center gap-4 mb-8 pb-6 border-b border-border/50 max-w-md mx-auto">
                    {/* Step 1 Indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        step === 1 
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm' 
                          : 'bg-emerald-500 text-white'
                      }`}>
                        {step > 1 ? <Check size={14} /> : '1'}
                      </div>
                      <span className={`text-xs font-bold ${step === 1 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Visitor Info
                      </span>
                    </div>

                    <div className={`h-0.5 w-16 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />

                    {/* Step 2 Indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        step === 2 
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-sm' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        2
                      </div>
                      <span className={`text-xs font-bold ${step === 2 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        Verification
                      </span>
                    </div>
                  </div>
                )}

                {/* ================= STEP 1: VISITOR INFORMATION ================= */}
                {step === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                    
                    {/* Left Form */}
                    <div className="lg:col-span-2 space-y-5">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Visitor Information
                        </h3>
                        <span className="text-[11px] text-muted-foreground">
                          * Required fields
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Full Name */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-foreground/90 mb-1">
                            Full Name <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                            <input 
                              type="text" 
                              placeholder="e.g. Abebe Bikila" 
                              value={formData.name} 
                              onChange={e => {
                                setFormData({...formData, name: e.target.value});
                                if (validationErrors.name) {
                                  setValidationErrors(prev => { const upd = {...prev}; delete upd.name; return upd; });
                                }
                              }} 
                              className={`w-full pl-9 pr-3 py-2.5 bg-muted/30 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all ${
                                validationErrors.name ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'
                              }`} 
                            />
                          </div>
                          {validationErrors.name && (
                            <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.name}
                            </p>
                          )}
                        </div>

                        {/* Company / Purpose */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-foreground/90 mb-1">
                            Company / Visit Purpose <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                            <input 
                              type="text" 
                              placeholder="e.g. Ethio Telecom - Partnership Meeting" 
                              value={formData.company} 
                              onChange={e => {
                                setFormData({...formData, company: e.target.value});
                                if (validationErrors.company) {
                                  setValidationErrors(prev => { const upd = {...prev}; delete upd.company; return upd; });
                                }
                              }} 
                              className={`w-full pl-9 pr-3 py-2.5 bg-muted/30 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all ${
                                validationErrors.company ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'
                              }`} 
                            />
                          </div>
                          {validationErrors.company && (
                            <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.company}
                            </p>
                          )}
                        </div>

                        {/* Host Searching For (With Live Employee Directory Dropdown) */}
                        <div className="md:col-span-2 relative" ref={hostDropdownRef}>
                          <label className="block text-xs font-bold text-foreground/90 mb-1">
                            Host Searching For <span className="text-destructive">*</span>
                          </label>

                          {formData.hostName ? (
                            /* Selected Host Pill */
                            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                  {formData.hostName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-foreground">{formData.hostName}</p>
                                  <p className="text-[10px] text-muted-foreground">{formData.hostDepartment || 'Staff Host'}</p>
                                </div>
                              </div>
                              <button 
                                type="button" 
                                onClick={handleClearSelectedHost}
                                className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-muted transition-colors"
                              >
                                <X size={14} /> Change Host
                              </button>
                            </div>
                          ) : (
                            /* Host Search Input & Autocomplete */
                            <div className="relative">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                              <input 
                                type="text" 
                                placeholder="Type to search staff directory (e.g. Kirubel, Mulugeta)..." 
                                value={hostSearchQuery} 
                                onFocus={() => setIsHostDropdownOpen(true)}
                                onChange={e => {
                                  setHostSearchQuery(e.target.value);
                                  setIsHostDropdownOpen(true);
                                }} 
                                className={`w-full pl-9 pr-8 py-2.5 bg-muted/30 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all ${
                                  validationErrors.hostName ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'
                                }`} 
                              />
                              {hostSearchQuery && (
                                <button 
                                  type="button" 
                                  onClick={() => setHostSearchQuery('')}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                                >
                                  <X size={14} />
                                </button>
                              )}

                              {/* Dropdown Menu */}
                              {isHostDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border border-border shadow-xl rounded-2xl max-h-56 overflow-y-auto z-50 divide-y divide-border/50 animate-in fade-in-50 zoom-in-95 duration-150">
                                  {filteredEmployees.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                      No staff members found matching "{hostSearchQuery}".
                                    </div>
                                  ) : (
                                    filteredEmployees.map(emp => (
                                      <button 
                                        key={emp.id} 
                                        type="button"
                                        onClick={() => handleSelectHost(emp)}
                                        className="w-full text-left p-3 hover:bg-muted/60 transition-colors flex items-center justify-between group"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            {emp.full_name.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                              {emp.full_name}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                              {emp.department}
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${
                                            emp.availability_status === 1 ? 'bg-emerald-500' : 'bg-amber-500'
                                          }`} title={emp.availability_status === 1 ? 'Available' : 'Busy/In meeting'} />
                                          <span className="text-[10px] text-muted-foreground">
                                            {emp.availability_status === 1 ? 'Available' : 'In Meeting'}
                                          </span>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {validationErrors.hostName && (
                            <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.hostName}
                            </p>
                          )}
                        </div>

                        {/* Email (Optional) */}
                        <div>
                          <label className="block text-xs font-bold text-foreground/90 mb-1">
                            Email <span className="text-muted-foreground text-[10px] font-normal">(Optional)</span>
                          </label>
                          <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                            <input 
                              type="email" 
                              placeholder="john@example.com" 
                              value={formData.email} 
                              onChange={e => {
                                setFormData({...formData, email: e.target.value});
                                if (validationErrors.email) {
                                  setValidationErrors(prev => { const upd = {...prev}; delete upd.email; return upd; });
                                }
                              }} 
                              className={`w-full pl-9 pr-3 py-2.5 bg-muted/30 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all ${
                                validationErrors.email ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'
                              }`} 
                            />
                          </div>
                          {validationErrors.email && (
                            <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.email}
                            </p>
                          )}
                        </div>

                        {/* Phone (Required) */}
                        <div>
                          <label className="block text-xs font-bold text-foreground/90 mb-1">
                            Phone <span className="text-destructive">*</span>
                          </label>
                          <div className="relative">
                            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                            <input 
                              type="tel" 
                              placeholder="+251 911 223344" 
                              value={formData.phone} 
                              onChange={e => {
                                setFormData({...formData, phone: e.target.value});
                                if (validationErrors.phone) {
                                  setValidationErrors(prev => { const upd = {...prev}; delete upd.phone; return upd; });
                                }
                              }} 
                              className={`w-full pl-9 pr-3 py-2.5 bg-muted/30 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:bg-card outline-none transition-all ${
                                validationErrors.phone ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'
                              }`} 
                            />
                          </div>
                          {validationErrors.phone && (
                            <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {validationErrors.phone}
                            </p>
                          )}
                        </div>

                      </div>

                      {/* Step 1 Actions */}
                      <div className="flex items-center justify-between pt-6 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          {!formData.name || !formData.company || !formData.hostName || !formData.phone ? (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                              <AlertTriangle size={13} /> Complete name, purpose, host, and phone to continue
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                              <CheckCircle2 size={13} /> All required details provided
                            </span>
                          )}
                        </span>

                        <button 
                          type="button"
                          onClick={handleProceedToVerification} 
                          disabled={!formData.name.trim() || !formData.company.trim() || !formData.hostName.trim() || !formData.phone.trim()}
                          className="px-7 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center gap-2"
                        >
                          Next: Verification <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Camera & Security Notice */}
                    <div className="space-y-5 bg-muted/10 p-5 rounded-2xl border border-border/50 h-fit">
                      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
                        <h4 className="font-bold text-amber-800 dark:text-amber-400 text-xs flex items-center gap-1.5 mb-1.5">
                          <AlertTriangle size={14} /> Security Notice
                        </h4>
                        <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                          Manual check-ins bypass the standard NDA signing flow on the self-service kiosk. Ensure the visitor signs the physical front desk logbook if required by corporate policy.
                        </p>
                      </div>

                      {/* Camera Box */}
                      <div className="bg-card border border-border p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
                            <Camera size={14} className="text-primary" /> Visitor Photo
                          </h4>
                          {capturedPhoto && (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Captured
                            </span>
                          )}
                        </div>

                        <div className="aspect-video bg-slate-950 rounded-lg flex items-center justify-center relative overflow-hidden shadow-inner border border-border">
                           {capturedPhoto ? (
                             <img src={capturedPhoto} alt="Captured visitor" className="w-full h-full object-cover" />
                           ) : (
                             <>
                               <video ref={videoRef} className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`} autoPlay playsInline muted />
                               {!isCameraActive && (
                                 <div className="text-center p-4">
                                   <Camera size={24} className="mx-auto text-muted-foreground/40 mb-1" />
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Camera Off</p>
                                 </div>
                               )}
                             </>
                           )}
                           <canvas ref={canvasRef} className="hidden" />
                        </div>

                        {!capturedPhoto ? (
                          <button 
                            type="button"
                            onClick={isCameraActive ? capturePhoto : startCamera} 
                            className={`w-full mt-3 py-2.5 rounded-lg text-xs font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                              isCameraActive 
                                ? 'bg-primary text-primary-foreground hover:opacity-90' 
                                : 'bg-muted border border-border hover:bg-muted/80 text-foreground'
                            }`}
                          >
                            {isCameraActive ? 'Snap Photo' : 'Start Camera'}
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => { setCapturedPhoto(null); startCamera(); }} 
                            className="w-full mt-3 py-2.5 bg-card border border-border hover:bg-muted text-foreground rounded-lg text-xs font-bold transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                          >
                            Retake Photo
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* ================= STEP 2: REVIEW & VERIFICATION ================= */}
                {step === 2 && (
                  <div className="space-y-6 max-w-2xl mx-auto animate-in slide-in-from-right-4 duration-300">
                    
                    {/* Registration Review Summary */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <h3 className="text-sm font-bold text-foreground">
                          Review Visitor Summary
                        </h3>
                        <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                          Ready for Check-In
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground text-[11px]">Visitor Name</p>
                          <p className="font-bold text-foreground text-sm mt-0.5">{formData.name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px]">Assigned Host</p>
                          <p className="font-bold text-foreground text-sm mt-0.5">{formData.hostName}</p>
                          <p className="text-[10px] text-muted-foreground">{formData.hostDepartment}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px]">Purpose / Company</p>
                          <p className="font-medium text-foreground mt-0.5">{formData.company}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[11px]">Contact Info</p>
                          <p className="font-medium text-foreground mt-0.5">
                            {formData.phone || formData.email || 'No direct contact given'}
                          </p>
                        </div>
                      </div>

                      {capturedPhoto && (
                        <div className="pt-3 border-t border-border/50 flex items-center gap-3">
                          <img src={capturedPhoto} alt="Visitor" className="w-12 h-12 rounded-lg object-cover border border-border" />
                          <div>
                            <p className="text-xs font-bold text-foreground">Visitor Photo Verified</p>
                            <p className="text-[10px] text-muted-foreground">Will be logged with visitor arrival record</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ID Verification Box */}
                    <div className="border border-dashed border-border rounded-2xl p-6 text-center bg-muted/10 space-y-3">
                      <ScanLine size={36} className="mx-auto text-primary/70" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Physical ID Scan & Verification (Optional)</h4>
                        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto mt-1">
                          Scan the visitor's government ID or driver's license for security verification.
                        </p>
                      </div>
                      <button 
                        type="button"
                        onClick={handleScanID} 
                        disabled={isScanning} 
                        className="px-5 py-2.5 bg-card border border-border hover:bg-muted text-foreground rounded-xl text-xs font-bold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] inline-flex items-center gap-2"
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> Scanning ID...
                          </>
                        ) : (
                          <>
                            <ScanLine size={14} /> Scan Driver's License
                          </>
                        )}
                      </button>
                    </div>

                    {/* Step 2 Actions */}
                    <div className="flex items-center justify-between pt-6 border-t border-border/50">
                      <button 
                        type="button"
                        onClick={() => setStep(1)} 
                        disabled={isCheckingIn}
                        className="px-6 py-2.5 bg-muted text-muted-foreground hover:text-foreground rounded-xl font-bold text-xs hover:bg-muted/80 transition-colors flex items-center gap-2"
                      >
                        <ArrowLeft size={14} /> Back to Details
                      </button>

                      <button 
                        type="button"
                        onClick={handleCheckIn} 
                        disabled={isCheckingIn} 
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-md flex items-center gap-2"
                      >
                        {isCheckingIn ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" /> Completing Check-In...
                          </>
                        ) : (
                          <>
                            <Printer size={16} /> Complete & Print Badge
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                )}

                {/* ================= SUCCESS SCREEN: CHECK-IN COMPLETE ================= */}
                {step === 'success' && (
                  <div className="space-y-6 text-center py-6 max-w-md mx-auto animate-in zoom-in-95 duration-300">
                    
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto border border-emerald-500/20 shadow-inner">
                      <CheckCircle2 size={44} />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Check-In Successful
                      </span>
                      <h2 className="text-2xl font-black text-foreground mt-3">Visitor Badge Generated</h2>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        <strong className="text-foreground">{formData.name}</strong> is checked in to see <strong className="text-foreground">{formData.hostName}</strong>. The host has been alerted.
                      </p>
                    </div>

                    {/* Summary Badge Card */}
                    <div className="bg-card border border-border p-4 rounded-2xl text-left text-xs space-y-2 shadow-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="font-bold text-foreground">Badge Details</span>
                        <span className="text-[10px] text-muted-foreground">Thermal 100x62mm</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Visitor:</span>
                        <span className="font-semibold text-foreground">{formData.name}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Host:</span>
                        <span className="font-semibold text-foreground">{formData.hostName}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[11px]">
                        <span>Purpose:</span>
                        <span className="font-semibold text-foreground">{formData.company}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                      <button 
                        type="button"
                        onClick={() => printBadgeNow(formData.name, formData.hostName)}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Printer size={16} /> Print Badge Again
                      </button>

                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={resetRegistrationForm}
                          className="flex-1 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <UserPlus size={14} /> Register Another
                        </button>

                        <button 
                          type="button"
                          onClick={() => { resetRegistrationForm(); setShowRegistrationModal(false); }}
                          className="flex-1 py-2.5 bg-card border border-border text-foreground hover:bg-muted rounded-xl font-bold text-xs transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>

                  </div>
                )}

             </div>
          </div>
        </div>
      )}

      {/* Host Follow-up Tab */}
      {activeTab === 'followup' && (
        <HostFollowup currentUser={currentUser} />
      )}

    </div>
  );
}
