interface NearestSlot {
    date: string;
    time: string;
    display_day: string;
    display_time: string;
    full_formatted: string;
    shift_range: string;
    iso_timestamp: string;
}

interface HostEvaluationResult {
    is_available: boolean;
    host_name: string;
    host_department: string;
    host_job_title: string;
    employee_id: string;
    numeric_host_id: number;
    reason: string | null;
    nearest_slot: NearestSlot | null;
    current_shift_status: string | null;
}

interface HostUnavailableModalProps {
    hostUnavailableData: HostEvaluationResult;
    setHostUnavailableData: (data: HostEvaluationResult | null) => void;
    handleProceedAnyway: () => void;
    handleBookSuggestedSlot: () => void;
    isScheduling: boolean;
}

export default function HostUnavailableModal({
    hostUnavailableData,
    setHostUnavailableData,
    handleProceedAnyway,
    handleBookSuggestedSlot,
    isScheduling
}: HostUnavailableModalProps) {
    return (
        <div className="animate-slide-up absolute inset-0 px-6 md:px-10 py-6 bg-white flex flex-col justify-between overflow-y-auto">
            <div>
                {/* Status Header */}
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 text-amber-900">
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-amber-950">Host Currently Off-Shift / Unavailable</h4>
                        <p className="text-xs text-amber-800">
                            {hostUnavailableData.reason || 'The matched host is currently outside working shift hours or out of the office.'}
                        </p>
                    </div>
                </div>

                {/* Matched Host Card Removed */}

                {/* Nearest Available Time Suggestion Highlight */}
                {hostUnavailableData.nearest_slot ? (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 mb-4 shadow-sm animate-pulse-glow">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                                    Nearest Available Shift
                                </p>
                            </div>
                            <span className="text-[11px] font-bold text-blue-600 bg-white px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                                Working Hours: {hostUnavailableData.nearest_slot.shift_range}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 my-2">
                            <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-sm">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-900">
                                    {hostUnavailableData.nearest_slot.full_formatted}
                                </h2>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    You can pre-book this slot right now or check-in to leave a message.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-xs text-gray-500 mb-4">
                        No immediate shifts configured for this host over the next 14 days.
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
                <button
                    type="button"
                    onClick={() => setHostUnavailableData(null)}
                    className="w-full md:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    Modify Notes / Back
                </button>

                <div className="flex gap-2.5 w-full md:w-auto justify-end">
                    <button
                        type="button"
                        onClick={handleProceedAnyway}
                        className="flex-1 md:flex-initial px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                    >
                        Check In Anyway (Lobby Wait)
                    </button>

                    {hostUnavailableData.nearest_slot && (
                        <button
                            type="button"
                            disabled={isScheduling}
                            onClick={handleBookSuggestedSlot}
                            className="flex-1 md:flex-initial px-5 py-2.5 text-xs font-bold text-white bg-[#0058be] hover:bg-[#004294] rounded-lg shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                        >
                            {isScheduling ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Booking Slot...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    Book Nearest Slot
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
