const express = require('express');
const router = express.Router();
// Dynamic import for fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

/**
 * POST /api/chat
 * Proxy endpoint for Google Gemini via Generative Language API
 * Expects { messages: Array<{ role, content }> }
 */
router.post('/', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Missing GEMINI_API_KEY in environment.' });
        }

        const { messages } = req.body;
        // Build prompt text from all user messages
        const promptText = messages
            .filter(m => m.role === 'user')
            .map(m => m.content)
            .join('\n');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: promptText
                    }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API error:', response.status, data);
            return res.status(response.status).json({ error: data.error || data });
        }

        // Extract text from response
        let output = '';
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            output = data.candidates[0].content.parts.map(part => part.text).join('');
        }

        res.json({ message: output, raw: data });
    } catch (error) {
        console.error('Gemini proxy error:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router; 