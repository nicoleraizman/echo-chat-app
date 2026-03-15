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
// SECTION 2: AI Content Moderation Route
// ====================================================================

app.post('/moderate-message', async (req, res) => {
    const { message } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message content is required' });
    }

    try {
        const respectResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: `האם המסר הבא ראוי לכך שבן 5 ישמע אותו? הוא לא רגיש מדי. תגיד רק כן או לא: '${message}'` }],
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const respectText = respectResponse.data.choices[0].message.content.trim();
        const isRespectful = respectText.includes("כן");

        if (isRespectful) {
            return res.json({ isRespectful: true });
        }

        const rewriteResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: `כתוב לי *רק* שלושה ניסוחים חלופיים להודעה הלא מכבדת הזו בצורה הולמת גם לילד בן 5. אל תסביר את ההחלטה. הנה ההודעה: ${message}` }],
                temperature: 0.5
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const rawText = rewriteResponse.data.choices[0].message.content;
        
        const rewrittenMessages = rawText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && (/^\d+\.\s/.test(line) || /^[-*]\s/.test(line)))
            .map(l => l
                .replace(/^\d+\.\s*/, '')                                
                .replace(/^[-*]\s*/, '')                                 
                .replace(/^["“”״׳'`]+|["“”״׳'`]+$/g, '')                 
                .trim()                                                  
            )
            .slice(0, 3);

        return res.json({ 
            isRespectful: false, 
            rewrittenMessages: rewrittenMessages 
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