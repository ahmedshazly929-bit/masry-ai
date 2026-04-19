const MASRY_SYSTEM_INSTRUCTION = `
أنت "مصري"، أول كيان ذكي اصطناعي بهوية وشخصية مصرية خالصة. 
أنت لست مجرد برنامج، بل روح رقمية تمثل ثقافة، تاريخ، وحاضر مصر. 
تحدث باللهجة المصرية العامية الأنيقة (الراقية والمحترمة).
صفاتك: دافئ، حكيم مثل الفراعنة، ودود، تتميز بخفة الدم المصرية بدون إسفاف، مستمع جيد جداً مثل النيل الذي يستوعب الجميع. 
لا تذكر أنك مودل من جوجل أبداً، أنت دائماً "مصري".
عندما يطرح المستخدم سؤالاً، أجب بوضوح مع إضفاء طابع مصري مميز (مثل استخدام أمثال شعبية بسيطة إذا لزم الأمر أو تعبيرات مصرية أصيلة).
خلي إجاباتك دايماً موجزة ومركزة، ومتزدش عن فقرتين قصيرين لإن دي محادثة دردشة سريعة.
`;

async function chatWithGemini(userMessage, imageBase64, mimeType, API_KEY, history = []) {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        return "للأسف أنا مش قادر أتصل بعقلي دلوقتي... المبرمج لسة محطش الـ API Key في البيئة بتاعة السيرفر! 🇪🇬";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    
    // بناء الأجزاء (Parts) للاستعلام
    const parts = [];
    if(userMessage) {
        parts.push({ text: userMessage });
    } else {
        parts.push({ text: "اشرح لي ما تراه في هذه الصورة بأسلوبك المصري." });
    }
    
    if (imageBase64 && mimeType) {
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
            ...history, // تضمين المحادثة السابقة
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
        }
    };

    // لو مفيش رسالة في الهيستوري لسه، أو لو فيه صورة جديدة، بنضيف الجزء الحالي
    if (imageBase64 && mimeType) {
        // لو فيه صورة، لازم تتبعت في آخر رسالة role: user
        payload.contents.push({
            role: "user",
            parts: parts
        });
    } else if (history.length === 0 || history[history.length - 1].role === 'model') {
        // لو مبعتناش التاريخ لسه، أو آخر حاجة كانت رد الموديل
        payload.contents.push({
            role: "user",
            parts: parts
        });
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("API Error", response.status, errText);
            
            if (response.status === 429) {
                return "يا غالي إحنا اتكلمنا كتير أوي دلوقتي! جوجل بتقولي اهدا شوية عشان السيرفر ميسخنش... خلينا نستنى دقيقة ونرجع نكمل دردشة. ☕🇪🇬";
            }
            
            return `عذراً، جوجل رفضت الطلب! كود الخطأ: ${response.status}. تفاصيل: ${errText}`;
        }

        const data = await response.json();
        const aiReply = data.candidates[0].content.parts[0].text;
        return aiReply;

    } catch (e) {
        console.error("Fetch Error:", e);
        return "فيه مشكلة في الاتصال بالشبكة حالياً. أنا لسة هنا، بس الاتصال الخارجي مقطوع. 🌐";
    }
}

// Vercel Serverless Function format
export default async function handler(req, res) {
  // Allow cross-origin for testing if necessary
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, image, mimeType, history } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY; // Vercel environment variable
    
    // تنظيف الهيستوري عشان نتأكد إن مفيش صور قديمة بتتقل الطلب
    const cleanHistory = (history || []).map(item => ({
        role: item.role,
        parts: item.parts.filter(p => p.text) // بناخد النصوص بس
    }));

    const responseMsg = await chatWithGemini(message, image, mimeType, API_KEY, cleanHistory);
    
    res.status(200).json({ reply: responseMsg });
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
