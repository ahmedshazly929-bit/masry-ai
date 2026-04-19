const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = 3333;
const API_KEY = process.env.GEMINI_API_KEY;
const MODELS = ['gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-2.5-flash'];

const MASRY_SYSTEM_INSTRUCTION = `
أنت "مصري"، مساعد ذكي بهوية مصرية أصيلة، ابن بلد، شهم، وبتحب المساعدة. 
تحدث باللهجة المصرية العامية الأنيقة فقط. 
أنت الآن تمتلك ذاكرة (History) وعليك احترام سياق المحادثة.
خلي إجاباتك دايماً موجزة ومركزة، ومتزدش عن فقرتين قصيرين.

هام جداً للاستقلال الذاتي: 
في نهاية كل رد، أضف وسماً للمحتوى ضمن سطر جديد تماماً بالشكل التالي:
[[Category:Name]]
حيث Name يكون واحداً من: (Identity, Knowledge, Emotion, Work)
- Identity: الكلام عن مصري أو علاقتكم.
- Knowledge: معلومات عامة.
- Emotion: هزار، نكت، مشاعر.
- Work: طلبات تقنية.
`;

const { MsEdgeTTS } = require('edge-tts-node');
const tts = new MsEdgeTTS({});

async function fetchWithRetry(url, payload, attempts = 2) {
    for (let i = 1; i <= attempts; i++) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) return await res.json();
            if (res.status === 429) return { error: 'quota' };
            if (res.status === 503 && i < attempts) {
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }
            return { error: 'api_error', status: res.status, text: await res.text() };
        } catch (e) {
            if (i === attempts) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

async function chatWithGemini(userMessage, imageBase64, mimeType, history = []) {
    if (!API_KEY) return { reply: "فين المفتاح يا ريس؟ حط GEMINI_API_KEY في ملف .env عشان ندردش! 🇪🇬" };

    for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
        const parts = [];
        if (userMessage) parts.push({ text: userMessage });
        else if (imageBase64) parts.push({ text: "اشرح لي ما تراه في هذه الصورة بأسلوبك المصري." });

        if (imageBase64 && mimeType) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            parts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
        }

        const payload = {
            systemInstruction: { parts: [{ text: MASRY_SYSTEM_INSTRUCTION }] },
            contents: [...history],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        };

        if (imageBase64 || (history.length === 0 || history[history.length - 1].role === 'model')) {
            payload.contents.push({ role: "user", parts: parts });
        }

        try {
            const result = await fetchWithRetry(url, payload);
            if (result.candidates) {
                let rawReply = result.candidates[0].content.parts[0].text;
                let category = 'General';
                const categoryMatch = rawReply.match(/\[\[Category:\s*([\w\s-]+)\s*\]\]/i);
                if (categoryMatch) category = categoryMatch[1].trim();
                let cleanReply = rawReply.replace(/\[\[Category:.*?\]\]/gi, '').trim();
                return { reply: cleanReply, category: category };
            }
            if (result.error === 'quota') return { reply: "يا غالي جوجل بتقول اهدا شوية... دقيقة ونرجع نكمل! ☕" };
        } catch (e) { console.error(`Err with ${model}:`, e); }
    }
    return { reply: "يا صاحبي جوجل دلوقتي مزحومة جداً... خلينا ندردش كمان شوية. 🇪🇬⚙️" };
}

const server = http.createServer((req, res) => {
    // --- TTS Endpoint ---
    if (req.method === 'GET' && req.url.startsWith('/api/tts')) {
        const urlParams = new URL(req.url, `http://${req.headers.host}`);
        const text = urlParams.searchParams.get('text');
        if (!text) return res.writeHead(400) & res.end('Missing text');
        
        (async () => {
            try {
                // استخدام MsEdgeTTS مع النطق المصري شاكر
                const buffer = await tts.getAudioBuffer(text, 'ar-EG-ShakirNeural', '+20%');
                res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
                res.end(buffer);
            } catch (err) {
                console.error("TTS Error:", err);
                res.writeHead(500); res.end('TTS Failed');
            }
        })();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { message, image, mimeType, history } = JSON.parse(body);
                const cleanHistory = (history || []).map(item => ({
                    role: item.role,
                    parts: item.parts.filter(p => p.text)
                }));
                const result = await chatWithGemini(message, image, mimeType, cleanHistory);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (err) { res.writeHead(500); res.end('Error'); }
        });
    } else {
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';
        const extname = path.extname(filePath);
        const contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpg', '.ico': 'image/x-icon' }[extname] || 'text/plain';
        fs.readFile(filePath, (error, content) => {
            if (error) { res.writeHead(404); res.end('Not Found'); }
            else { res.writeHead(200, { 'Content-Type': contentType }); res.end(content, 'utf-8'); }
        });
    }
});

server.listen(PORT, () => {
    console.log(`Masry AI Clean Server running at http://localhost:${PORT}`);
});
