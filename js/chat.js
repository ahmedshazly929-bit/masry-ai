document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const micBtn = document.getElementById('mic-btn');
  const voiceToggle = document.getElementById('voice-toggle');
  const imageInput = document.getElementById('image-input');
  const imagePreview = document.getElementById('image-preview');

  let chatHistory = [];
  let currentImage = null;

  // --- 🔊 Sound Effects ---
  const sounds = {
    send: new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'),
    receive: new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3')
  };

  function playSound(type) {
    sounds[type].volume = 0.2;
    sounds[type].play().catch(() => {});
  }

  // --- 🎤 Text-to-Speech (With Robust Fallback) ---
  function speakText(text, callback) {
      if (!voiceToggle.checked) {
          if (callback) callback();
          return;
      }

      // 1. وقف أي صوت شغال
      if (window.currentAudio) {
          window.currentAudio.pause();
          window.currentAudio = null;
      }
      if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
      }

      // 2. تنظيف النص تماماً قبل النطق (ممنوع دخول أي وسوم للأذن)
      const cleanText = text.replace(/\[\[Category:.*?\]\]/gi, '').trim();
      if (!cleanText) {
          if (callback) callback();
          return;
      }

      const encodedText = encodeURIComponent(cleanText);
      const audioUrl = `/api/tts?text=${encodedText}`;
      
      const audio = new Audio(audioUrl);
      window.currentAudio = audio;

      // عند بدء التشغيل: شغل الأنيميشن
      audio.onplay = () => {
          const lastBubble = chatMessages.lastElementChild?.querySelector('.msg-bubble');
          if (lastBubble) {
              lastBubble.classList.add('speaking');
              if (!lastBubble.querySelector('.voice-waves')) {
                  const waves = document.createElement('div');
                  waves.className = 'voice-waves';
                  waves.innerHTML = '<span></span><span></span><span></span><span></span>';
                  lastBubble.prepend(waves);
              }
          }
      };

      audio.onended = () => {
          stopSpeakingAnimation();
          window.currentAudio = null;
          if (callback) callback();
      };

      // --- الفشل والتحويل للبديل (FALLBACK) ---
      audio.onerror = () => {
          console.warn("Backend TTS failed, falling back to browser...");
          fallbackToBrowserSpeech(cleanText, callback);
      };

      // محاولة التشغيل مع حماية الـ Autoplay
      audio.play().catch(err => {
          console.warn("Audio play blocked, falling back to browser...");
          fallbackToBrowserSpeech(cleanText, callback);
      });
  }

  function fallbackToBrowserSpeech(text, callback) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-EG'; // إجبار اللغة العربية (مصر)
      
      // اختيار أفضل صوت عربي متاح
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.includes('ar')) || voices[0];
      if (arabicVoice) utterance.voice = arabicVoice;

      utterance.rate = 1.1;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
          const lastBubble = chatMessages.lastElementChild?.querySelector('.msg-bubble');
          if (lastBubble) lastBubble.classList.add('speaking');
      };

      utterance.onend = () => {
          stopSpeakingAnimation();
          if (callback) callback();
      };

      window.speechSynthesis.speak(utterance);
  }

  function stopSpeakingAnimation() {
      const lastBubble = chatMessages.lastElementChild?.querySelector('.msg-bubble');
      if (lastBubble) {
          lastBubble.classList.remove('speaking');
          lastBubble.querySelector('.voice-waves')?.remove();
      }
  }

  // --- 🎤 Speech Recognition (Speech-to-Text) ---
  let recognition = null;
  let isRecording = false;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG'; 
      recognition.continuous = false; 
      recognition.interimResults = true;

      recognition.onstart = () => {
          isRecording = true;
          micBtn.classList.add('recording');
          chatInput.placeholder = 'أنا سامعك، اتكلم...';
          if (window.currentAudio) window.currentAudio.pause();
          if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      };

      let hasHeardSomething = false;
      recognition.onresult = (event) => {
          hasHeardSomething = true;
          const transcript = event.results[0][0].transcript;
          chatInput.value = transcript;
          if (event.results[0].isFinal) {
              setTimeout(() => { sendMessage(); }, 500);
          }
      };

      recognition.onerror = (event) => {
          console.error("Speech Recognition Error", event.error);
          if (event.error === 'not-allowed') {
              alert('المتصفح ممنوع من استخدام الميكروفون. برجاء إعطاء الصلاحية.');
          }
      };

      recognition.onend = () => {
          isRecording = false;
          micBtn.classList.remove('recording');
          chatInput.placeholder = 'اكتب أو اتكلم هنا...';
      };
  }

  micBtn.addEventListener('click', () => {
      if (!recognition) return alert('عفواً، متصفحك لا يدعم خاصية التسجيل الصوتي.');
      if (isRecording) {
          recognition.stop();
      } else {
          try { recognition.start(); } catch(e) {}
      }
  });

  // --- Message UI rendering ---
  function addMessage(text, sender = 'user', imageBase64 = null, category = 'General') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg msg-${sender}`;
    
    let imageHtml = imageBase64 ? `<img src="${imageBase64}" class="msg-image" />` : '';

    if(sender === 'user') {
        playSound('send');
        msgDiv.innerHTML = `
        <div class="msg-bubble">
           ${imageHtml}
           ${text ? `<div>${text}</div>` : ''}
        </div>
        <div class="msg-time">أنت • دلوقتي</div>
        `;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    } else {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-bubble';
        typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        msgDiv.appendChild(typingDiv);
        chatMessages.appendChild(msgDiv);
        scrollToBottom();

        setTimeout(async () => {
            // تنظيف النص تماماً (فشل السيرفر في التنضيف أو داتا قديمة)
            let cleanText = (text || '').replace(/\[\[Category:.*?\]\]/gi, '').trim();
            let finalCategory = category || 'General';

            if (typingDiv.parentNode) msgDiv.removeChild(typingDiv);
            
            msgDiv.innerHTML = `
            <div class="msg-bubble">${cleanText}</div>
            <div class="msg-time">مصري • دلوقتي ${finalCategory !== 'General' ? `<span style="font-size:0.75rem; color:var(--gold); opacity:0.7;">| ${finalCategory}</span>` : ''}</div>
            `;
            playSound('receive');
            
            chatHistory.push({ role: 'model', parts: [{ text: cleanText }] });
            if (window.masryBrain) window.masryBrain.save(cleanText, finalCategory);

            speakText(cleanText, () => {
                if (voiceToggle.checked && !isRecording) {
                    setTimeout(() => { try { recognition.start(); } catch(e){} }, 500);
                }
            });
            scrollToBottom();
        }, 500); 
    }
  }

  // --- Handlers ---
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && !currentImage) return;

    const payloadText = text;
    const payloadImage = currentImage;
    const mine = currentImage ? 'image/png' : null;

    chatInput.value = '';
    imagePreview.style.display = 'none';
    currentImage = null;

    addMessage(payloadText, 'user', payloadImage);

    // Typing effect
    const typingElement = document.createElement('div');
    typingElement.className = 'msg msg-masry';
    typingElement.innerHTML = '<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
    chatMessages.appendChild(typingElement);
    scrollToBottom();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: payloadText,
                image: payloadImage,
                mimeType: mine,
                history: chatHistory.slice(-10)
            })
        });

        const data = await response.json();
        if (typingElement.parentNode) chatMessages.removeChild(typingElement);
        
        if (data && data.reply) {
            chatHistory.push({ role: 'user', parts: [{ text: payloadText || "انظر للصورة" }] });
            addMessage(data.reply, 'masry', null, data.category);
        } else {
            runOfflineSearch(payloadText);
        }
    } catch(error) {
        if (typingElement.parentNode) chatMessages.removeChild(typingElement);
        runOfflineSearch(payloadText);
    }
  }

  function runOfflineSearch(query) {
      if (window.masryBrain) {
          window.masryBrain.search(query).then(result => {
              if (result) {
                  addMessage(result.text + " (من الذاكرة المحلية 🧠)", 'masry', null, result.category);
              } else {
                  addMessage("النت قاطع ومخبيش عليك مش فاكر حاجة عن الموضوع ده.. أول ما يرجع هقولك!", 'masry');
              }
          });
      }
  }

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Image handling
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        currentImage = e.target.result;
        imagePreview.src = currentImage;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
});
