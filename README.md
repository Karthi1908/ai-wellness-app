
# True Companion - AI Mental Wellness Agent

A sophisticated, voice-first AI companion designed for mental wellness support. It uses real-time audio streaming, sentiment analysis, and a multi-agent persona engine to provide empathetic and adaptive conversations.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 🌟 How It Works

True Companion creates a natural, low-latency voice conversation by connecting directly to Google's Gemini Multimodal Live API. It's not just a chatbot; it's a "feeling" companion that adapts its personality based on your emotional state.

### Core Features

1.  **🎙️ Real-Time Voice Interaction**:
    -   Connects via WebSockets to `gemini-2.5-flash-native-audio` for instant, interruption-friendly conversations.
    -   No text-to-speech lag; the model generates native audio.

2.  **🧠 Multi-Agent Persona Engine**:
    -   The system dynamically switches "Personas" based on your vocal tone and sentiment.
    -   **Examples**:
        -   If you sound *shaky* or *distressed* -> Switches to **DEEPLY_EMPATHETIC_LISTENER** (slower pace, warmer tone).
        -   If you sound *positive* -> Switches to **PLAYFUL_QUIRKY_FRIEND**.
        -   If you sound *unstable* -> Switches to **CALM_GROUNDING_STABILIZER**.

3.  **📊 Evaluation & Tracing (Comet Opik)**:
    -   Every conversation turn is logged to **Comet Opik** for quality assurance.
    -   Tracks inputs, model outputs, detected user sentiment, and the chosen persona.

4.  **🚨 Crisis Intevention Protocol**:
    -   Includes a "Human-in-the-Loop" (HITL) safety mechanism.
    -   If the AI detects intent of self-harm, it triggers the `triggerEmergencyProtocol` tool, immediately pausing the AI and showing a modal with local helpline numbers (e.g., 988).

### Architecture

```mermaid
graph TD
    User((User)) <-->|WebSockets (Audio)| Frontend[React + Vite App]
    Frontend <--> |Direct Connection| Gemini[Google Gemini Live API]
    Frontend --> |POST /api/log-trace| Vercel[Vercel Serverless Function]
    Vercel --> |Log Trace| Opik[Comet Opik Platform]
```

-   **Frontend**: React, logic in `App.tsx`. Handles audio streaming, microphone input, and playback.
-   **Backend**: Vercel Serverless Functions (`/api/log-trace.js`) handle secure communication with Comet Opik.
-   **AI Model**: Google Gemini 2.5 Flash (Multimodal Live).

---

## 🚀 Getting Started

### Prerequisites
-   **Node.js** (v18+)
-   **Google AI Studio Key** (for Gemini)
-   **Comet Opik Account** (for logging)

### 1. Installation
Clone the repo and install dependencies:
```bash
npm install
```

### 2. Configuration
Create a `.env.local` file in the root:
```env
GEMINI_API_KEY=your_google_key
OPIK_API_KEY=your_opik_key
OPIK_WORKSPACE=your_opik_workspace_name
```

### 3. Run Locally

**Option A: Frontend Only (No Opik Logging)**
Good for quick UI testing.
```bash
npm run dev
```
*Note: Logging to Opik will fail silently in the console.*

**Option B: Full App (Recommended)**
Simulates the production environment with serverless functions.
```bash
npm i -g vercel  # Install Vercel CLI if needed
vercel dev       # Run the app
```

### 4. Verification Script
Verify your Opik connection without running the full UI:
```bash
node scripts/test-opik.js
```

---

## 📦 Expected Outputs

-   **Console**: You should see logs indicating "Connected to Gemini" and "Trace logged successfully".
-   **UI**:
    -   The visualizer orb pulses when you speak.
    -   "Emotion", "Voice Tone", and "Persona" cards update in real-time as the AI analyzes you.
-   **Opik Dashboard**: corresponding traces will appear in your project, showing the conversation flow and sentiment tags.
