'use client';
import { useState, useEffect } from 'react';

export default function VisitorKiosk() {
    const [screen, setScreen] = useState<'landing' | 'checkin' | 'ai'>('landing');
    const [formStep, setFormStep] = useState(1);
    const [slide, setSlide] = useState(0);
    const [formError, setFormError] = useState('');
    const [assignedHostInfo, setAssignedHostInfo] = useState<{ host: string; department: string } | null>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        purpose: '',
        notes: '',
        hostName: ''
    });

    const backgrounds = [
        "url('/matrix 1.png')",
        "url('/matrix 2.png')",
        "url('/matrix 3.png')"
    ];

    const copies = [
        "Welcome to Matrix Technologies",
        "Seamlessly Connect with Our Team",
        "Your Modern Receptionist Experience"
    ];

    useEffect(() => {
        if (screen !== 'landing') return;
        const interval = setInterval(() => {
            setSlide((prev) => (prev + 1) % backgrounds.length);
        }, 6000);
        return () => clearInterval(interval);
    }, [screen, backgrounds.length]);

    useEffect(() => {
        if (screen === 'checkin' && formStep === 3) {
            const timer = setTimeout(() => {
                setScreen('landing');
                setFormStep(1);
                setFormData({ firstName: '', lastName: '', email: '', phone: '', purpose: '', notes: '', hostName: '' });
                setAssignedHostInfo(null);
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [screen, formStep]);

    const handleNext = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (formStep === 1) {
            if (!formData.firstName.trim() || !formData.lastName.trim()) {
                setFormError('Please enter both your first and last name.');
                return;
            }
            setFormError('');
            setFormStep(2);
            return;
        }

        if (formStep === 2) {
            if (!formData.purpose) {
                setFormError('Please select a purpose for your visit.');
                return;
            }
            if (!formData.notes.trim()) {
                setFormError('Additional notes are required. Please provide more details regarding your visit.');
                return;
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/visitors/checkin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (!response.ok) {
                    setFormError('Failed to complete check-in. Please try again.');
                    return;
                }
                const data = await response.json();
                if (data.assigned_host) {
                    setAssignedHostInfo({
                        host: data.assigned_host,
                        department: data.assigned_department || 'Host Team'
                    });
                }
            } catch (err) {
                setFormError('Network error. Please try again.');
                return;
            }

            setFormError('');
            setFormStep(3);
        }
    };

    const handleBack = () => {
        setFormError('');
        if (formStep === 1) {
            setScreen('landing');
        } else {
            setFormStep((prev) => Math.max(prev - 1, 1));
        }
    };

    const StepIndicator = ({ num, label }: { num: number, label: string }) => {
        const isCompleted = formStep > num;
        const isActive = formStep === num;
        return (
            <div className="flex items-center">
                <div className="flex flex-col items-center relative z-10">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${isCompleted || isActive ? 'bg-[#0058be] text-white scale-110' : 'bg-[#e0e7ff] text-[#4f46e5]'
                        }`}>
                        {isCompleted ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        ) : num}
                    </div>
                    <span className={`absolute top-11 text-xs font-bold w-16 text-center transition-colors duration-300 ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
                </div>
                {num < 3 && (
                    <div className={`w-16 md:w-28 h-[2px] -mt-5 mx-2 transition-colors duration-500 ${formStep > num ? 'bg-[#0058be]' : 'bg-gray-200'
                        }`}></div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen w-screen overflow-hidden font-sans selection:bg-[#2170e4] selection:text-white bg-[#f4f7f9]">

            {/* Custom Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}} />

            {/* --- LANDING SCREEN --- */}
            {screen === 'landing' && (
                <div className="relative h-full w-full animate-fade">
                    {backgrounds.map((bg, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out z-0 ${slide === index ? 'opacity-100' : 'opacity-0'
                                }`}
                            style={{ backgroundImage: bg }}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>

                    <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center w-full px-6 md:px-12 py-6">
                        <img src="/Matrix One Logo.svg" alt="Company Logo" className="h-8 w-auto object-contain" />
                    </header>

                    <main className="relative z-20 h-full flex flex-col items-center justify-end pb-32 md:pb-48 px-6 md:px-12">
                        <div className="relative w-full max-w-4xl text-center mb-16 h-[100px] md:h-[80px]">
                            {copies.map((copy, index) => (
                                <h1 key={index} className={`absolute w-full text-4xl md:text-5xl font-bold text-white drop-shadow-md transition-all duration-[1000ms] ${slide === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                                    }`}>
                                    {copy}
                                </h1>
                            ))}
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 w-full max-w-3xl">
                            <button
                                onClick={() => setScreen('checkin')}
                                className="flex-1 min-h-[80px] bg-[#0058be] text-white rounded-xl text-xl font-semibold shadow-lg hover:bg-[#2170e4] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 border-t border-white/20"
                            >
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Check In
                            </button>

                            <button
                                onClick={() => setScreen('ai')}
                                className="flex-1 min-h-[80px] bg-white text-[#0b1c30] rounded-xl text-xl font-semibold shadow-lg hover:bg-[#eff4ff] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 border border-[#c6c6cd]"
                            >
                                <img src="/robot.svg" alt="Robot AI Icon" className="w-7 h-7 object-contain" />
                                Ask the AI
                            </button>
                        </div>
                    </main>
                </div>
            )}

            {/* --- MULTI-STEP CHECK-IN FLOW --- */}
            {screen === 'checkin' && (
                <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-[#f4f7fa] animate-fade">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col border border-gray-100 overflow-hidden h-[700px] animate-slide-up">

                        <div className="pt-8 pb-12 px-8 border-b border-gray-100 shrink-0">
                            <h2 className="text-3xl font-bold text-center mb-8 text-[#111827]">Visitor Check-In</h2>
                            <div className="flex items-center justify-center max-w-sm mx-auto w-full">
                                <StepIndicator num={1} label="Details" />
                                <StepIndicator num={2} label="Purpose" />
                                <StepIndicator num={3} label="Done" />
                            </div>
                        </div>

                        <div className="flex-grow px-12 py-10 text-[#111827] overflow-y-auto relative">

                            {/* Step 1: Details */}
                            {formStep === 1 && (
                                <form key="step1" id="step-form" onSubmit={handleNext} className="animate-slide-up absolute inset-0 px-12 py-10 bg-white">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold mb-2">Let's get your details</h3>
                                        <p className="text-gray-500 text-base">Please enter your information exactly as it appears on your ID.</p>
                                    </div>
                                    <div className="space-y-6 max-w-xl mx-auto">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1.5">First Name *</label>
                                                <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none transition-all" placeholder="Abebe" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Last Name *</label>
                                                <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none transition-all" placeholder="Bikila" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] outline-none transition-all" placeholder="abebebikila@gmail.com" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number</label>
                                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] outline-none transition-all" placeholder="+251912345678" />
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Step 2: Purpose & Mandatory Notes */}
                            {formStep === 2 && (
                                <form key="step2" id="step-form" onSubmit={handleNext} className="animate-slide-up absolute inset-0 px-12 py-10 bg-white">
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold mb-2">What brings you here?</h3>
                                        <p className="text-gray-500 text-base">Select the reason for your visit and provide details.</p>
                                    </div>
                                    <div className="max-w-xl mx-auto space-y-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {[
                                                { id: 'Meeting', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                                                { id: 'Interview', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                                                { id: 'Delivery', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> },
                                                { id: 'Other', icon: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
                                            ].map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, purpose: item.id })}
                                                    className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all duration-300 gap-3 ${formData.purpose === item.id ? 'border-[#0058be] bg-[#eff4ff] text-[#0058be] scale-105 shadow-md' : 'border-gray-200 text-gray-600 hover:border-[#0058be]'
                                                        }`}
                                                >
                                                    {item.icon}
                                                    <span className="font-semibold text-sm">{item.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                                Additional Notes <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                required
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none transition-all resize-none"
                                                placeholder="Please describe who you're meeting, reason for visit, or topic..."
                                            />
                                        </div>
                                    </div>
                                </form>
                            )}

                            {/* Step 3: Done with AI Assigned Host */}
                            {formStep === 3 && (
                                <div key="step3" className="flex flex-col items-center justify-center h-full animate-slide-up text-center pb-8">
                                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5 shadow-md shadow-emerald-500/20">
                                        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2 text-[#111827]">You're Checked In!</h2>
                                    
                                    {assignedHostInfo ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-4 max-w-sm w-full text-left">
                                            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">AI Host Routing</p>
                                            <p className="text-base font-bold text-slate-900 mt-0.5">{assignedHostInfo.host}</p>
                                            <p className="text-xs text-slate-600">{assignedHostInfo.department}</p>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm max-w-md my-2">
                                            Your check-in has been logged and reception has been notified.
                                        </p>
                                    )}

                                    <p className="text-xs text-slate-400 mt-2">
                                        Please take a seat in the lobby. Returning to home screen shortly...
                                    </p>
                                </div>
                            )}
                        </div>

                        {formStep < 3 && (
                            <div className="border-t border-gray-100 bg-white px-10 py-6 shrink-0">
                                {formError && (
                                    <div className="text-red-600 bg-red-50 p-3 rounded-lg font-semibold mb-4 flex items-center justify-center gap-2 text-sm border border-red-200 animate-slide-up">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {formError}
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                                    >
                                        {formStep === 1 ? 'Cancel' : 'Back'}
                                    </button>
                                    <button
                                        type="submit"
                                        form="step-form"
                                        className="bg-[#0058be] hover:bg-[#004294] text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-all hover:scale-105 shadow-md"
                                    >
                                        {formStep === 2 ? 'Complete Check-In' : 'Continue'}
                                        {formStep === 2 ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"></path></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- AI ASSISTANT SCREEN --- */}
            {screen === 'ai' && (
                <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-[#f4f7fa] animate-fade">
                    <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl w-full max-w-2xl text-center border border-gray-100 animate-slide-up">
                        <div className="w-20 h-20 bg-[#0058be] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 animate-pulse">
                            <img src="/robot.svg" alt="Robot AI Icon" className="w-10 h-10 object-contain invert brightness-0" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4 text-[#0b1c30]">How can I help you today?</h2>
                        <p className="text-lg text-gray-500 mb-8">
                            I can help you locate meeting rooms or answer general questions about the building.
                        </p>
                        <div className="bg-gray-50 rounded-xl p-6 h-48 border border-gray-200 mb-8 flex items-center justify-center text-gray-400">
                            [ AI Voice / Text Response Area ]
                        </div>
                        <button
                            onClick={() => setScreen('landing')}
                            className="w-full py-4 text-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            End Conversation
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}