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

async function chatWithGemini(userMessage, imageBase64, mimeType, API_KEY, history = []) {
    if (!API_KEY) return { reply: "للأسف الـ API Key مش موجود! 🇪🇬" };

    for (const modelName of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        
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

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    let rawReply = data.candidates[0].content.parts[0].text;
                    
                    let category = 'General';
                    const categoryMatch = rawReply.match(/\[\[Category:\s*([\w\s-]+)\s*\]\]/i);
                    if (categoryMatch) category = categoryMatch[1].trim();
                    
                    let cleanReply = rawReply.replace(/\[\[Category:.*?\]\]/gi, '').trim();
                    return { reply: cleanReply, category: category };
                }

                if (response.status === 429) return { reply: "يا غالي جوجل بتقول اهدا شوية... دقيقة ونرجع نكمل! ☕", category: 'System' };
                if (response.status === 503) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
            } catch (err) { console.error(`Fetch err ${modelName}:`, err); }
        }
    }
    return { reply: "يا صاحبي جوجل دلوقتي مزحومة جداً... خلينا ندردش كمان شوية. 🇪🇬⚙️", category: 'System' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, image, mimeType, history } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
    const cleanHistory = (history || []).map(item => ({
        role: item.role,
        parts: item.parts.filter(p => p.text)
    }));

    const result = await chatWithGemini(message, image, mimeType, API_KEY, cleanHistory);
    res.status(200).json(result);
  } catch(error) {
    res.status(500).json({ reply: "تحصل في أحسن العائلات! السيرفر حصله تشنج بسيط، جرب تبعت الرسالة تاني. 🇪🇬", category: 'Error' });
  }
}
