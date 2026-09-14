import { useState, useEffect } from 'react';
import HostUnavailableModal from './HostUnavailableModal';
import { checkinVisitor, scheduleSlot } from '@/lib/api/visitors';
import { evaluateHostAvailability } from '@/lib/api/schedules';

interface CheckinFlowProps {
    setScreen: (screen: 'landing' | 'checkin' | 'ai') => void;
}

export default function CheckinFlow({ setScreen }: CheckinFlowProps) {
    const [formStep, setFormStep] = useState(1);
    const [formError, setFormError] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);

    const [assignedHostInfo, setAssignedHostInfo] = useState<{ host: string; department: string } | null>(null);
    const [hostAvailabilityStatus, setHostAvailabilityStatus] = useState<number>(1);
    const [hostUnavailableData, setHostUnavailableData] = useState<any | null>(null);
    const [scheduledBookingInfo, setScheduledBookingInfo] = useState<{ host: string; scheduledTime: string; visitorName: string } | null>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        purpose: '',
        notes: '',
        hostName: ''
    });

    // Auto return to landing screen after successful check-in or appointment booking
    useEffect(() => {
        if (formStep === 3 || scheduledBookingInfo) {
            const timer = setTimeout(() => {
                setScreen('landing');
            }, 7000);
            return () => clearTimeout(timer);
        }
    }, [formStep, scheduledBookingInfo, setScreen]);

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

            setFormError('');
            setIsEvaluating(true);

            try {
                const now = new Date();
                const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);

                const evalData = await evaluateHostAvailability({
                    purpose: formData.purpose,
                    notes: formData.notes,
                    hostName: formData.hostName || undefined,
                    target_time: localIso
                });

                if (!evalData.is_available) {
                    setHostUnavailableData(evalData);
                    setIsEvaluating(false);
                    return;
                }

                await executeCheckin(evalData.host_name, evalData.host_department);
            } catch (err) {
                console.error('Error evaluating availability:', err);
                await executeCheckin();
            } finally {
                setIsEvaluating(false);
            }
        }
    };

    const executeCheckin = async (explicitHost?: string, explicitDept?: string) => {
        try {
            const data = await checkinVisitor({
                ...formData,
                hostName: explicitHost || formData.hostName
            });
            setAssignedHostInfo({
                host: explicitHost || data.assigned_host || 'General Reception',
                department: explicitDept || data.assigned_department || 'Host Team'
            });
            setHostAvailabilityStatus(data.host_availability_status || 1);
            setHostUnavailableData(null);
            setFormStep(3);
        } catch (err) {
            setFormError('Failed to complete check-in. Please try again.');
        }
    };

    const handleBookSuggestedSlot = async () => {
        if (!hostUnavailableData || !hostUnavailableData.nearest_slot) return;
        setIsScheduling(true);
        setFormError('');

        try {
            const data = await scheduleSlot({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                purpose: formData.purpose,
                notes: formData.notes,
                host_id: hostUnavailableData.numeric_host_id,
                host_name: hostUnavailableData.host_name,
                scheduled_time: hostUnavailableData.nearest_slot.iso_timestamp
            });

            setScheduledBookingInfo({
                host: data.host_name,
                scheduledTime: hostUnavailableData.nearest_slot.full_formatted,
                visitorName: data.visitor_name
            });
            setHostUnavailableData(null);
        } catch (err) {
            setFormError('Network error while scheduling slot.');
        } finally {
            setIsScheduling(false);
        }
    };

    const handleProceedAnyway = async () => {
        if (!hostUnavailableData) return;
        const hostName = hostUnavailableData.host_name;
        const dept = hostUnavailableData.host_department;
        setHostUnavailableData(null);
        await executeCheckin(hostName, dept);
    };

    const handleBack = () => {
        setFormError('');
        setHostUnavailableData(null);
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
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${isCompleted || isActive ? 'bg-[#0058be] text-white scale-110 shadow-md shadow-blue-500/20' : 'bg-[#e0e7ff] text-[#4f46e5]'
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
        <div className="relative h-full w-full flex flex-col items-center justify-center p-6 bg-[#f4f7fa] animate-fade">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col border border-gray-100 overflow-hidden h-[720px] animate-slide-up relative">

                {/* Top Stepper Header */}
                <div className="pt-7 pb-10 px-8 border-b border-gray-100 shrink-0 bg-white">
                    <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-[#111827]">Visitor Check-In</h2>
                    <div className="flex items-center justify-center max-w-sm mx-auto w-full">
                        <StepIndicator num={1} label="Details" />
                        <StepIndicator num={2} label="Purpose" />
                        <StepIndicator num={3} label="Done" />
                    </div>
                </div>

                <div className="flex-grow px-8 md:px-12 py-8 text-[#111827] overflow-y-auto relative bg-white">

                    {/* Step 1: Details */}
                    {formStep === 1 && !scheduledBookingInfo && (
                        <form key="step1" id="step-form" onSubmit={handleNext} className="animate-slide-up absolute inset-0 px-8 md:px-12 py-8 bg-white">
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold mb-1.5 text-slate-900">Let's get your details</h3>
                                <p className="text-gray-500 text-sm md:text-base">Please enter your information exactly as it appears on your ID.</p>
                            </div>
                            <div className="space-y-5 max-w-xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">First Name *</label>
                                        <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none transition-all text-base" placeholder="Abebe" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Last Name *</label>
                                        <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none transition-all text-base" placeholder="Bikila" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] outline-none transition-all text-base" placeholder="abebebikila@gmail.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] outline-none transition-all text-base" placeholder="+251912345678" />
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Step 2: Purpose & Notes (with real-time host shift check) */}
                    {formStep === 2 && !hostUnavailableData && !scheduledBookingInfo && (
                        <form key="step2" id="step-form" onSubmit={handleNext} className="animate-slide-up absolute inset-0 px-8 md:px-12 py-8 bg-white">
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold mb-1.5 text-slate-900">What brings you here?</h3>
                                <p className="text-gray-500 text-sm md:text-base">Select your visit purpose and provide meeting or inquiry details.</p>
                            </div>
                            <div className="max-w-xl mx-auto space-y-5">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'Meeting', label: 'Meeting', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                                        { id: 'Interview', label: 'Interview', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                                        { id: 'Delivery', label: 'Delivery', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg> },
                                        { id: 'Other', label: 'Other', icon: <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
                                    ].map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, purpose: item.id })}
                                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-300 gap-2 ${formData.purpose === item.id ? 'border-[#0058be] bg-[#eff4ff] text-[#0058be] scale-105 shadow-md font-semibold' : 'border-gray-200 text-gray-600 hover:border-[#0058be]'
                                                }`}
                                        >
                                            {item.icon}
                                            <span className="text-xs font-semibold">{item.label}</span>
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0058be] focus:ring-1 focus:ring-[#0058be] outline-none transition-all resize-none text-sm md:text-base leading-relaxed"
                                        placeholder="Describe who you're meeting with, purpose of visit, or specific topic..."
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        Our AI instantly checks the host's shift schedule and real-time availability.
                                    </p>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* --- HOST UNAVAILABLE & NEAREST TIME SUGGESTION MODAL VIEW --- */}
                    {hostUnavailableData && !scheduledBookingInfo && (
                        <HostUnavailableModal 
                            hostUnavailableData={hostUnavailableData}
                            setHostUnavailableData={setHostUnavailableData}
                            handleProceedAnyway={handleProceedAnyway}
                            handleBookSuggestedSlot={handleBookSuggestedSlot}
                            isScheduling={isScheduling}
                        />
                    )}

                    {/* --- CONFIRMATION 1: APPOINTMENT SCHEDULED FOR SUGGESTED SLOT --- */}
                    {scheduledBookingInfo && (
                        <div className="flex flex-col items-center justify-center h-full animate-slide-up text-center pb-8">
                            <div className="w-20 h-20 bg-blue-100 text-[#0058be] rounded-full flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-1 text-[#111827]">Appointment Pre-Registered!</h2>
                            <p className="text-gray-500 text-sm mb-4">Your visit has been placed directly on the host's calendar.</p>

                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 my-2 max-w-md w-full text-left shadow-sm">
                                <div className="flex justify-between items-start mb-3 pb-3 border-b border-blue-100">
                                    <div>
                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Status</p>
                                        <p className="text-base font-bold text-slate-900 mt-0.5">
                                            {hostAvailabilityStatus === 2 || hostAvailabilityStatus === 4 
                                                ? "You will be notified." 
                                                : "The person you have to meet will notify you to enter."}
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-300">
                                        Confirmed
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Scheduled Date & Time</p>
                                    <p className="text-sm font-bold text-slate-900 mt-0.5">{scheduledBookingInfo.scheduledTime}</p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 mt-4">
                                Please arrive 5 minutes prior to your scheduled time. Returning to home screen shortly...
                            </p>
                        </div>
                    )}

                    {/* --- CONFIRMATION 2: INSTANT CHECK-IN SUCCESS --- */}
                    {formStep === 3 && !scheduledBookingInfo && (
                        <div key="step3" className="flex flex-col items-center justify-center h-full animate-slide-up text-center pb-8">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-5 shadow-md shadow-emerald-500/20">
                                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-[#111827]">You're Checked In!</h2>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 my-4 max-w-sm w-full text-center shadow-sm">
                                <p className="text-base font-bold text-slate-900">
                                    {hostAvailabilityStatus === 2 || hostAvailabilityStatus === 4 
                                        ? "You will be notified." 
                                        : "The person you have to meet will notify you to enter."}
                                </p>
                            </div>

                            <p className="text-xs text-slate-400 mt-2">
                                Please take a seat in the lobby. Returning to home screen shortly...
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom Navigation Toolbar */}
                {formStep < 3 && !hostUnavailableData && !scheduledBookingInfo && (
                    <div className="border-t border-gray-100 bg-white px-8 md:px-10 py-5 shrink-0">
                        {formError && (
                            <div className="text-red-600 bg-red-50 p-3 rounded-lg font-semibold mb-3 flex items-center justify-center gap-2 text-xs md:text-sm border border-red-200 animate-slide-up">
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
                                disabled={isEvaluating}
                                className="bg-[#0058be] hover:bg-[#004294] text-white font-semibold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-all hover:scale-105 shadow-md disabled:opacity-70"
                            >
                                {isEvaluating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Checking Availability...
                                    </>
                                ) : (
                                    <>
                                        {formStep === 2 ? 'Complete Check-In' : 'Continue'}
                                        {formStep === 2 ? (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7"></path></svg>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
