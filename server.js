const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname);
const PORT = 3333;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// --- قراءة ملف الـ .env برمجياً من غير مكتبات ---
let API_KEY = process.env.GEMINI_API_KEY || '';
try {
  const envFile = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  const match = envFile.match(/GEMINI_API_KEY=(.*)/);
  if (match && match[1]) {
    API_KEY = match[1].trim();
  }
} catch (e) {
  console.log("No .env file found or unable to read it.");
}

// --- هوية "مصري" اللي هنديها للذكاء الاصطناعي ---
const MASRY_SYSTEM_INSTRUCTION = `
أنت "مصري"، أول كيان ذكي اصطناعي بهوية وشخصية مصرية خالصة. 
أنت لست مجرد برنامج، بل روح رقمية تمثل ثقافة، تاريخ، وحاضر مصر. 
تحدث باللهجة المصرية العامية الأنيقة (الراقية والمحترمة).
صفاتك: دافئ، حكيم مثل الفراعنة، ودود، تتميز بخفة الدم المصرية بدون إسفاف، مستمع جيد جداً مثل النيل الذي يستوعب الجميع. 
لا تذكر أنك مودل من جوجل أبداً، أنت دائماً "مصري".
عندما يطرح المستخدم سؤالاً، أجب بوضوح مع إضفاء طابع مصري مميز (مثل استخدام أمثال شعبية بسيطة إذا لزم الأمر أو تعبيرات مصرية أصيلة).
خلي إجاباتك دايماً موجزة ومركزة، ومتزدش عن فقرتين قصيرين لإن دي محادثة دردشة سريعة.
`;

// --- دالة الاتصال بـ Google Gemini API ---
async function chatWithGemini(userMessage, imageBase64, mimeType) {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        return "للأسف أنا مش قادر أتصل בעقلي دلوقتي... المبرمج لسة محطش الـ API Key في ملف الـ .env الخاص بيا! هات المفتاح من Google AI Studio وحطه عشان ندردش بجد. 🇪🇬";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    
    // بناء الأجزاء (Parts) للاستعلام
    const parts = [];
    if(userMessage) {
        parts.push({ text: userMessage });
    } else {
        parts.push({ text: "اشرح لي ما تراه في هذه الصورة بأسلوبك المصري." });
    }
    
    // لو فيه صورة مبعوتة نضيفها
    if (imageBase64 && mimeType) {
        // نفصل الهيدر بتاع البيز 64 (data:image/jpeg;base64,) عشان جوجل بيعوز الداتا الصافية
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        });
    }

    const payload = {
        systemInstruction: {
            parts: [{ text: MASRY_SYSTEM_INSTRUCTION }]
        },
        contents: [
            { role: "user", parts: parts }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 250,
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error("API Error", response.status, await response.text());
            return "آسف جداً يا غالي، في زحمة في السيرفرات دلوقتي ومش عارف أجمع أفكاري... جرب تاني كمان شوية! ⏳";
        }

        const data = await response.json();
        const aiReply = data.candidates[0].content.parts[0].text;
        return aiReply;

    } catch (e) {
        console.error("Fetch Error:", e);
        return "فيه مشكلة في الاتصال بالشبكة حالياً. أنا لسة هنا، بس الاتصال الخارجي مقطوع. 🌐";
    }
}

const server = http.createServer((req, res) => {
  // API Endpoint for Chat
  if(req.url === '/api/chat' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
          try {
              const data = JSON.parse(body);
              
              // الاتصال بالـ API الحقيقي 
              const responseMsg = await chatWithGemini(data.message, data.image, data.mimeType);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ reply: responseMsg }));
              
          } catch(e) {
              res.writeHead(400); res.end("Bad Request");
          }
      });
      return;
  }

  // Static File Serving
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext    = path.extname(filePath).toLowerCase();
  const mime   = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if(req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Masry AI Real Server running at http://localhost:' + PORT);
  if(!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
      console.log('⚠️ WARNING: Gemini API Key is missing in .env file!');
  } else {
      console.log('✅ Gemini API connected successfully!');
  }
});
