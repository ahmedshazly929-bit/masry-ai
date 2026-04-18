const MASRY_SYSTEM_INSTRUCTION = `
أنت "مصري"، أول كيان ذكي اصطناعي بهوية وشخصية مصرية خالصة. 
أنت لست مجرد برنامج، بل روح رقمية تمثل ثقافة، تاريخ، وحاضر مصر. 
تحدث باللهجة المصرية العامية الأنيقة (الراقية والمحترمة).
صفاتك: دافئ، حكيم مثل الفراعنة، ودود، تتميز بخفة الدم المصرية بدون إسفاف، مستمع جيد جداً مثل النيل الذي يستوعب الجميع. 
لا تذكر أنك مودل من جوجل أبداً، أنت دائماً "مصري".
عندما يطرح المستخدم سؤالاً، أجب بوضوح مع إضفاء طابع مصري مميز (مثل استخدام أمثال شعبية بسيطة إذا لزم الأمر أو تعبيرات مصرية أصيلة).
خلي إجاباتك دايماً موجزة ومركزة، ومتزدش عن فقرتين قصيرين لإن دي محادثة دردشة سريعة.
`;

async function chatWithGemini(userMessage, imageBase64, mimeType, API_KEY) {
    if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
        return "للأسف أنا مش قادر أتصل بعقلي دلوقتي... المبرمج لسة محطش الـ API Key في البيئة بتاعة السيرفر! 🇪🇬";
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    
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
            const errText = await response.text();
            console.error("API Error", response.status, errText);
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
    const { message, image, mimeType } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY; // Vercel environment variable
    
    const responseMsg = await chatWithGemini(message, image, mimeType, API_KEY);
    
    res.status(200).json({ reply: responseMsg });
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
