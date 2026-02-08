
import React from 'react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-rose-500 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-3 mb-4 text-rose-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold">Emergency Support</h2>
        </div>
        <p className="text-slate-600 mb-6 leading-relaxed">
          It sounds like you're going through a very difficult time. Please remember that you don't have to face this alone. Help is available right now.
        </p>
        
        <div className="space-y-4 mb-8">
          <a 
            href="tel:988" 
            className="flex items-center justify-between p-4 bg-rose-50 rounded-2xl border border-rose-200 hover:bg-rose-100 transition-colors group"
          >
            <div>
              <p className="font-bold text-rose-700">Crisis Text Line & Suicide Lifeline</p>
              <p className="text-xs text-rose-600">Call or Text 988 (USA)</p>
            </div>
            <div className="p-2 bg-rose-500 text-white rounded-full group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
              </svg>
            </div>
          </a>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <p className="font-bold text-blue-700">Global Helplines</p>
            <p className="text-xs text-blue-600">Find a helpline in your country at: <span className="underline">findahelpline.com</span></p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors"
        >
          Return to True Companion
        </button>
      </div>
    </div>
  );
};

export default EmergencyModal;
