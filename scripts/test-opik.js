import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/log-trace.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load Environment Variables from .env.local
console.log("Loading environment variables from .env.local...");
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} else {
    console.warn("Warning: .env.local not found. Test might fail if keys are missing.");
}

// 2. Mock Request and Response
const req = {
    method: 'POST',
    body: {
        input: "Hello, I'm feeling a bit anxious today.",
        output: "I hear you. It's okay to feel anxious. I'm here for you.",
        userSentiment: "Anxious",
        userTone: "Shaky",
        persona: "CALM_GROUNDING_STABILIZER"
    }
};

const res = {
    setHeader: (key, value) => {
        // console.log(`[Header] ${key}: ${value}`);
    },
    status: (code) => {
        console.log(`[Status] ${code}`);
        return res;
    },
    json: (data) => {
        console.log(`[JSON Response]`, JSON.stringify(data, null, 2));
        return res;
    },
    end: () => {
        console.log("[End]");
    }
};

// 3. Run the Handler
console.log("\n--- Starting Opik Integration Test ---");
console.log("Simulating conversation turn logging...");
try {
    await handler(req, res);
    console.log("\n--- Test Completed Successfully ---");
} catch (error) {
    console.error("\n--- Test Failed ---");
    console.error(error);
}
