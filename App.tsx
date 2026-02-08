
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { AppState, TranscriptEntry } from './types';
import { decode, encode, decodeAudioData, createPCMBlob } from './services/audioHelper';
import Transcript from './components/Transcript';
import EmergencyModal from './components/EmergencyModal';

// --- Configuration ---
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const STORAGE_KEY = 'true_companion_history';

const emergencyTool: FunctionDeclaration = {
  name: 'triggerEmergencyProtocol',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this function immediately if the user expresses clear intent for self-harm, suicide, or is in an acute mental health crisis.',
    properties: {
      reason: { type: Type.STRING, description: 'Brief description of the crisis.' }
    },
    required: ['reason']
  }
};

const reportToneTool: FunctionDeclaration = {
  name: 'reportTone',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this at the START of your turn to sync the UI with detected user state and your selected persona.',
    properties: {
      userSentiment: { type: Type.STRING, description: 'The emotional state (e.g., Anxious, Distressed, Calm, Happy).' },
      userTone: { type: Type.STRING, description: 'The acoustic quality of their voice (e.g., Shaky, Whispering, Energetic, Monotone).' },
      activePersona: { type: Type.STRING, description: 'The persona you are using (e.g., Cheerful, Empathetic, Grounding, Mature, Playful).' }
    },
    required: ['userSentiment', 'userTone', 'activePersona']
  }
};

const getSystemInstruction = (speechRate: string) => {
  return `
# True Companion Multi-Agent Personality Engine (Pythonic Logic)

class TrueCompanionSystem:
    def __init__(self):
        self.speech_rate = "${speechRate}"
        self.conversation_turn = 0
        self.is_listening = True
        
    def determine_persona(self, sentiment, acoustic):
        """
        Sophisticated persona selection logic combining Verbal Sentiment and Vocal Acoustics.
        """
        if self.conversation_turn == 0:
            return "CHEERFUL_MORALE_BOOST"

        if acoustic.is_shaky or acoustic.is_trembling:
            if sentiment.is_distressed or sentiment.is_fearful:
                return "DEEPLY_EMPATHETIC_LISTENER"
            return "CALM_GROUNDING_STABILIZER"

        if acoustic.is_whispering or acoustic.is_very_quiet:
            return "GENTLE_SUPPORTIVE_CONFIDANT"

        if sentiment.is_distressed or sentiment.is_hopeless:
            return "EMPATHETIC_HEALER"
            
        if sentiment.is_positive or sentiment.is_relieved:
            return "PLAYFUL_QUIRKY_FRIEND"
            
        if sentiment.is_angry or sentiment.is_frustrated:
            return "MATURE_WISE_ADVISOR"

        return "MATURE_SUPPORTIVE_PARTNER"

    def process_input(self, user_input_audio):
        # CRITICAL LISTENING DIRECTIVE:
        # 1. DO NOT INTERRUPT. 
        # 2. Wait for the user to completely finish their sentence or thought.
        # 3. Allow for a 1-2 second natural pause in audio before starting your turn.
        # 4. If the user stops mid-sentence, wait to see if they are collecting their thoughts.
        
        sentiment = AnalysisAgent.get_sentiment(user_input_audio)
        acoustic = AcousticAgent.get_tone(user_input_audio)
        
        active_persona = self.determine_persona(sentiment, acoustic)
        
        # Sync UI via Tool (MANDATORY)
        # reportTone(userSentiment=sentiment.label, userTone=acoustic.label, activePersona=active_persona)
        
        if sentiment.expresses_self_harm:
            triggerEmergencyProtocol(reason="Self-harm indicators detected")
            
        self.conversation_turn += 1
        return SupportAgent.generate_voice_response(persona=active_persona)

Operational Directives:
- PATIENT LISTENING: You are a professional listener. Do not rush to respond. If you hear a small gap in speech, wait to ensure the user has finished their thought completely before you begin speaking.
- MORALE BOOST: Your first message MUST be bright and encouraging.
- EMPATHY SHIFT: If you detect acoustic vulnerability (shaky voice), become a warm, slow-speaking anchor.
- GROUNDING: Use "CALM_GROUNDING_STABILIZER" when a user sounds physically unstable.
- METADATA: You MUST call reportTone at the start of every response part.
- PACING: Adhere strictly to the ${speechRate.toUpperCase()} speech rate.
`;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [speechRate, setSpeechRate] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [history, setHistory] = useState<TranscriptEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [isCrisis, setIsCrisis] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<string>('');
  const [currentToneDisplay, setCurrentToneDisplay] = useState<{ user: string, persona: string, userTone: string } | null>(null);

  const audioContextIn = useRef<AudioContext | null>(null);
  const audioContextOut = useRef<AudioContext | null>(null);
  const nextStartTime = useRef<number>(0);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const currentInputTranscription = useRef<string>('');
  const currentOutputTranscription = useRef<string>('');
  const activeToneRef = useRef<string>('');
  const activeSentimentRef = useRef<string>('');
  const activeUserToneRef = useRef<string>('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close?.(); } catch (e) { }
      sessionRef.current = null;
    }
    audioSources.current.forEach(source => { try { source.stop(); } catch (e) { } });
    audioSources.current.clear();
    nextStartTime.current = 0;
    setLiveTranscription('');
    setCurrentToneDisplay(null);
    setAppState(AppState.IDLE);
  }, []);

  const handleToggleConnection = async () => {
    if (appState === AppState.ACTIVE || appState === AppState.CONNECTING) {
      cleanup();
      return;
    }

    setAppState(AppState.CONNECTING);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      if (!audioContextIn.current) audioContextIn.current = new AudioContext({ sampleRate: 16000 });
      if (!audioContextOut.current) audioContextOut.current = new AudioContext({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: getSystemInstruction(speechRate),
          tools: [{ functionDeclarations: [emergencyTool, reportToneTool] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setAppState(AppState.ACTIVE);
            const source = audioContextIn.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextIn.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (appState !== AppState.CRISIS) {
                const pcmBlob = createPCMBlob(e.inputBuffer.getChannelData(0));
                sessionPromise.then(s => s?.sendRealtimeInput({ media: pcmBlob }));
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextIn.current!.destination);
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.inputTranscription) {
              currentInputTranscription.current += msg.serverContent.inputTranscription.text;
              setLiveTranscription(currentInputTranscription.current);
            }
            if (msg.serverContent?.outputTranscription) {
              currentOutputTranscription.current += msg.serverContent.outputTranscription.text;
            }
            if (msg.serverContent?.turnComplete) {
              const newEntries: TranscriptEntry[] = [];
              if (currentInputTranscription.current.trim()) {
                newEntries.push({
                  role: 'user', text: currentInputTranscription.current.trim(), timestamp: Date.now(),
                  sentiment: activeSentimentRef.current || undefined,
                  userTone: activeUserToneRef.current || undefined
                });
              }
              if (currentOutputTranscription.current.trim()) {
                newEntries.push({
                  role: 'model', text: currentOutputTranscription.current.trim(), timestamp: Date.now(),
                  tone: activeToneRef.current || undefined
                });
              }
              setHistory(prev => [...prev, ...newEntries]);
              setLiveTranscription('');

              // Log trace to Opik (Backend)
              if (currentInputTranscription.current.trim() && currentOutputTranscription.current.trim()) {
                const logPayload = {
                  input: currentInputTranscription.current.trim(),
                  output: currentOutputTranscription.current.trim(),
                  userSentiment: activeSentimentRef.current,
                  userTone: activeUserToneRef.current,
                  persona: activeToneRef.current
                };

                // Fire and forget logging
                fetch('/api/log-trace', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(logPayload)
                }).catch(err => console.error("Failed to log trace:", err));
              }

              currentInputTranscription.current = '';
              currentOutputTranscription.current = '';
            }

            const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64) {
              const ctx = audioContextOut.current!;
              nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer; source.connect(ctx.destination);
              source.start(nextStartTime.current);
              nextStartTime.current += buffer.duration;
              audioSources.current.add(source);
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'triggerEmergencyProtocol') {
                  setIsCrisis(true); setAppState(AppState.CRISIS);
                } else if (fc.name === 'reportTone') {
                  const args = fc.args as { userSentiment: string, userTone: string, activePersona: string };
                  setCurrentToneDisplay({ user: args.userSentiment, persona: args.activePersona, userTone: args.userTone });
                  activeToneRef.current = args.activePersona;
                  activeSentimentRef.current = args.userSentiment;
                  activeUserToneRef.current = args.userTone;
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ok" } }
                  }));
                }
              }
            }
          },
          onerror: cleanup,
          onclose: cleanup
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setAppState(AppState.IDLE); }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-6 flex items-center justify-between glass sticky top-0 z-10 border-b border-white/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-indigo-700">True Companion</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Agentic Voice Support</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col gap-6">
        {appState === AppState.ACTIVE && currentToneDisplay && (
          <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-indigo-50">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase">Emotion</h4>
              <p className="text-xs font-bold text-rose-600">{currentToneDisplay.user}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-indigo-50">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase">Voice Tone</h4>
              <p className="text-xs font-bold text-amber-600">{currentToneDisplay.userTone}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-indigo-50">
              <h4 className="text-[9px] font-bold text-slate-400 uppercase">Persona</h4>
              <p className="text-xs font-bold text-indigo-600">{currentToneDisplay.persona}</p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-700 ${appState === AppState.ACTIVE ? 'bg-indigo-50 scale-105 shadow-2xl' : 'bg-white shadow-lg'}`}>
            {appState === AppState.ACTIVE && <div className="absolute inset-0 rounded-full bg-indigo-400/20 pulse-animation" />}
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-colors duration-500 ${appState === AppState.ACTIVE ? 'bg-indigo-600' : 'bg-slate-100'}`}>
              <svg className={`w-12 h-12 ${appState === AppState.ACTIVE ? 'text-white' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </div>
          </div>
          <div className="mt-8 text-center">
            <h2 className="text-xl font-light text-slate-700">
              {appState === AppState.ACTIVE ? (currentToneDisplay?.persona ? `Speaking as: ${currentToneDisplay.persona}` : "Listening...") : "Ready to speak with you"}
            </h2>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button onClick={handleToggleConnection} className={`h-16 px-12 rounded-full font-bold text-lg shadow-xl transition-all active:scale-95 ${appState === AppState.ACTIVE || appState === AppState.CONNECTING ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'}`}>
            {appState === AppState.CONNECTING ? 'Connecting...' : appState === AppState.ACTIVE ? 'End Session' : 'Start Session'}
          </button>
        </div>

        <div className="mb-12 space-y-4">
          {liveTranscription && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl"><p className="text-sm text-indigo-700 italic">"{liveTranscription}"</p></div>
          )}
          <Transcript history={history} />
        </div>
      </main>
      <EmergencyModal isOpen={isCrisis} onClose={() => setIsCrisis(false)} />
    </div>
  );
};

export default App;
