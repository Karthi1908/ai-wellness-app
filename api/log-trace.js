import { Opik } from 'opik';

export default async function handler(req, res) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { input, output, userSentiment, userTone, persona } = req.body;

    try {
        // Initialize Opik client
        // Expects OPIK_API_KEY and optional OPIK_WORKSPACE_NAME/OPIK_PROJECT_NAME in env
        const client = new Opik({
            apiKey: process.env.OPIK_API_KEY,
            workspace: process.env.OPIK_WORKSPACE,
            project: process.env.OPIK_PROJECT_NAME
        });

        // Create a trace for the conversation turn
        const trace = client.trace({
            name: "conversation_turn",
            input: {
                text: input,
                sentiment: userSentiment,
                tone: userTone
            },
            output: {
                text: output,
                persona: persona
            }
        });

        // End the trace to submit it
        await trace.end();

        // Explicitly flush to ensure data is sent before function spins down
        await client.flush();

        return res.status(200).json({ success: true, traceId: trace.id });
    } catch (error) {
        console.error('Opik logging error:', error);
        // Don't fail the client flow just because logging failed, but log it server-side
        return res.status(500).json({ error: 'Failed to log trace', details: error.message });
    }
}
