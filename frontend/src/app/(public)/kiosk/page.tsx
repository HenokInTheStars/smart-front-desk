'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import LandingScreen from '@/components/kiosk/LandingScreen';
import CheckinFlow from '@/components/kiosk/CheckinFlow';
import AIScreen from '@/components/kiosk/AIScreen';

export default function VisitorKiosk() {
  const [screen, setScreen] = useState<'landing' | 'checkin' | 'ai'>('landing');
  const [isEmergency, setIsEmergency] = useState(false);

  useEffect(() => {
    // 1. Initial status fetch
    fetch('http://localhost:8000/dashboard/emergency/status')
      .then(res => res.json())
      .then(data => setIsEmergency(data.data?.emergency_active || false))
      .catch(console.error);

    // 2. Listen to SSE for real-time updates
    const es = new EventSource('http://localhost:8000/live/updates');

    es.addEventListener('emergency', (event: any) => {
      try {
        const data = JSON.parse(event.data);
        setIsEmergency(data.active);
        // Force screen to landing if emergency drops so they don't resume old state
        if (data.active) {
          setScreen('landing');
        }
      } catch (e) {
        console.error("SSE parse error", e);
      }
    });

    return () => es.close();
  }, []);

  if (isEmergency) {
    return (
      <div className="h-screen w-screen bg-rose-600 text-white flex flex-col items-center justify-center p-8 overflow-hidden font-sans">
        <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <AlertTriangle size={64} className="text-white" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight text-center uppercase">Emergency</h1>
        <p className="text-xl md:text-3xl font-semibold text-center max-w-4xl leading-relaxed opacity-90">
          The building is currently in emergency evacuation mode.
          <br /><br />
          Do not enter. Please proceed to the nearest assembly point immediately.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden font-sans selection:bg-[#2170e4] selection:text-white bg-[#f4f7f9]">
      {/* Custom Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(0, 88, 190, 0.2); }
          50% { box-shadow: 0 0 25px rgba(0, 88, 190, 0.45); }
        }
        .animate-slide-up {
          animation: slideUpFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade {
          animation: fadeIn 0.6s ease-out forwards;
        }
        .animate-pulse-glow {
          animation: pulseGlow 2.5s infinite ease-in-out;
        }
      `}} />

      {screen === 'landing' && <LandingScreen setScreen={setScreen} />}
      {screen === 'checkin' && <CheckinFlow setScreen={setScreen} />}
      {screen === 'ai' && <AIScreen setScreen={setScreen} />}
    </div>
  );
}