const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ====================================================================
// SECTION 1: API Routes (Chat & Reactions)
// ====================================================================

app.post('/send-message', async (req, res) => {
    const { username, content, topic } = req.body;
    if (!username || !content || !topic) {
        return res.status(400).json({ error: 'Missing username, content, or topic' });
    }
    try {
        await db.query('INSERT INTO messages (username, content, topic) VALUES ($1, $2, $3)', [username, content, topic]);
        res.sendStatus(200);
    } catch (err) {
        console.error('Error saving user message:', err);
        res.sendStatus(500);
    }
});

app.get('/messages', async (req, res) => {
    const topic = req.query.topic;
    if (!topic) {
        return res.status(400).json({ error: 'Missing topic' });
    }
    try {
        const result = await db.query('SELECT * FROM messages WHERE topic = $1 ORDER BY created_at ASC', [topic]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching all messages:', err);
        res.sendStatus(500);
    }
});
// GET all messages from a specific user
app.get('/api/messages/user/:username', async (req, res) => {
  try {
    // 1. Grab the username directly from the URL
    const requestedUser = req.params.username;
    
    // 2. Ask PostgreSQL to find only messages matching that username
    // The $1 is a security feature to prevent SQL Injection!
    const result = await db.query(
      'SELECT * FROM messages WHERE username = $1 ORDER BY created_at ASC',
      [requestedUser]
    );
    
    // 3. Send that specific list of messages back to the frontend
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching user messages:", err.message);
    res.status(500).send("Server Error");
  }
});

app.post('/react', async (req, res) => {
    const { message_id, username, reaction } = req.body;
    if (!message_id || !username || !reaction) {
        return res.status(400).json({ error: 'Missing data' });
    }
    try {
        const existing = await db.query('SELECT reaction FROM reactions WHERE message_id = $1 AND username = $2', [message_id, username]);
        if (existing.rows.length > 0 && existing.rows[0].reaction === reaction) {
            await db.query('DELETE FROM reactions WHERE message_id = $1 AND username = $2', [message_id, username]);
        } else {
            await db.query(`INSERT INTO reactions (message_id, username, reaction) VALUES ($1, $2, $3) ON CONFLICT (message_id, username) DO UPDATE SET reaction = $3`, [message_id, username, reaction]);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error("Error saving reaction:", err);
        res.sendStatus(500);
    }
});

app.get('/reactions', async (req, res) => {
    const topic = req.query.topic;
    if (!topic) return res.status(400).json({ error: 'Missing topic' });
    try {
        const result = await db.query(`
            SELECT message_id,
                   SUM(CASE WHEN reaction = 'like' THEN 1 ELSE 0 END) AS likes,
                   SUM(CASE WHEN reaction = 'dislike' THEN 1 ELSE 0 END) AS dislikes
            FROM reactions
            JOIN messages ON messages.id = reactions.message_id
            WHERE messages.topic = $1
            GROUP BY message_id
        `, [topic]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching reactions:", err);
        res.sendStatus(500);
    }
});

// ====================================================================
// SECTION 2: AI Content Moderation Route (JSON Mode)
// ====================================================================

app.post('/moderate-message', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { 
                        role: 'system', 
                        content: `You are an expert content moderator for an Israeli political debate platform. 
                        Your goal is to allow passionate, mature political discourse while strictly blocking toxicity.
                        
                        RULES FOR PASSING (isRespectful: true):
                        - Strongly disagreeing with another user's opinion.
                        - Criticizing politicians, laws, policies, or ideas.
                        - Using passionate, assertive, or argumentative language about civic duties.
                        
                        RULES FOR FAILING (isRespectful: false):
                        - Personal insults directed at the other user (e.g., "you are stupid", "shut up").
                        - Profanity, curse words, or derogatory slurs.
                        - Hate speech, violence, or threats.
                        
                        You MUST respond in strict JSON format. 
                        If the message passes the rules, return: {"isRespectful": true, "rewrittenMessages": []}
                        If the message fails the rules, return: {"isRespectful": false, "rewrittenMessages": ["polite Hebrew option 1", "polite Hebrew option 2", "polite Hebrew option 3"]}`
                    },
                    { 
                        role: 'user', 
                        content: message 
                    }
                ],
                temperature: 0.2,
                response_format: { type: "json_object" } // 🚀 This forces the AI to output pure JSON!
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Instantly parse the perfect JSON object from the AI
        const aiResponse = JSON.parse(response.data.choices[0].message.content);
        
        return res.json({ 
            isRespectful: aiResponse.isRespectful, 
            rewrittenMessages: aiResponse.rewrittenMessages || [] 
        });

    } catch (error) {
        console.error("Error during Groq moderation:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to communicate with Groq API' });
    }
});

// ====================================================================
// SECTION 3: Start Server
// ====================================================================
app.listen(PORT, () => {
    console.log(`✅ Chat server is running smoothly on port ${PORT}`);
});