const { MsEdgeTTS, OUTPUT_FORMAT } = require('edge-tts-node');
// سنحتفظ بالمكتبة في الأعلى احتياطاً، لكننا سنستخدم طريقة الـ Fetch الأكثر استقراراً

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  try {
    // استخدام محرك Google Translate TTS كحل عالي الاستقرار ومجاني للهجة العربية
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Google TTS Failed");
    
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('TTS Fallback Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
