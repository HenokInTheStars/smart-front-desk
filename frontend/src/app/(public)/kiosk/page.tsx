'use client';
import { useState } from 'react';
import LandingScreen from '@/components/kiosk/LandingScreen';
import CheckinFlow from '@/components/kiosk/CheckinFlow';
import AIScreen from '@/components/kiosk/AIScreen';

export default function VisitorKiosk() {
  const [screen, setScreen] = useState<'landing' | 'checkin' | 'ai'>('landing');

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