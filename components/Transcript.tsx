
import React, { useEffect, useRef } from 'react';
import { TranscriptEntry } from '../types';

interface TranscriptProps {
  history: TranscriptEntry[];
}

const Transcript: React.FC<TranscriptProps> = ({ history }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [history]);

  return (
    <div className="flex flex-col gap-6 overflow-y-auto max-h-[450px] p-6 bg-white/40 rounded-3xl border border-white shadow-inner scroll-smooth">
      {history.length === 0 && (
        <p className="text-slate-400 text-center italic py-10">Your conversation analysis will appear here...</p>
      )}
      
      {history.map((entry, index) => (
        <div 
          key={index} 
          className={`flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-500 ${
            entry.role === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          <div 
            className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
              entry.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
            }`}
          >
            {entry.text}
          </div>
          
          <div className={`flex flex-wrap gap-2 mt-2 px-1 ${entry.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <span className="text-[9px] text-slate-400 font-medium">
               {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </span>
             
             {entry.role === 'user' && entry.sentiment && (
               <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-tight">
                 Mood: {entry.sentiment}
               </span>
             )}
             
             {entry.role === 'user' && entry.userTone && (
               <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tight">
                 Tone: {entry.userTone}
               </span>
             )}
             
             {entry.role === 'model' && entry.tone && (
               <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-tight">
                 Persona: {entry.tone}
               </span>
             )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} className="h-0 w-0" />
    </div>
  );
};

export default Transcript;
