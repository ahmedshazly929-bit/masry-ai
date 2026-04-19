const { EdgeTTS } = require('edge-tts-node');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  try {
    const tts = new EdgeTTS();
    // Shakir voice, Fast rate (+30%)
    const buffer = await tts.getAudioBuffer(text, 'ar-EG-ShakirNeural', '+30%');
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(buffer);
  } catch (error) {
    console.error('TTS Vercel Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
