
export interface TranscriptEntry {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  sentiment?: string; // Emotional content (e.g., "Anxious")
  userTone?: string;   // Acoustic quality (e.g., "Trembling voice", "Whispering")
  tone?: string;        // Model persona (e.g., "Playful")
}

export enum AppState {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  CRISIS = 'CRISIS'
}
