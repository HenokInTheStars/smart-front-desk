interface AIScreenProps {
  setScreen: (screen: 'landing' | 'checkin' | 'ai') => void;
}

export default function AIScreen({ setScreen }: AIScreenProps) {
  return (
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
  );
}
