import { useState, useEffect } from 'react';

interface LandingScreenProps {
  setScreen: (screen: 'landing' | 'checkin' | 'ai') => void;
}

export default function LandingScreen({ setScreen }: LandingScreenProps) {
  const [slide, setSlide] = useState(0);

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
    const interval = setInterval(() => {
      setSlide((prev) => (prev + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);

  return (
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
  );
}
