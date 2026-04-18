/* ===============================
   MASRY AI — Chat Logic & API
   =============================== */

document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send');
  const quickReplies = document.querySelectorAll('.qr-btn');
  
  // Voice & Image UI Elements
  const micBtn = document.getElementById('chat-mic');
  const voiceToggle = document.getElementById('voice-checkbox');
  const attachBtn = document.getElementById('chat-attach');
  const fileInput = document.getElementById('chat-file-input');
  const imgPreviewContainer = document.getElementById('image-preview-container');
  const imgPreview = document.getElementById('image-preview');
  const removeImgBtn = document.getElementById('remove-image');

  let currentImageBase64 = null;
  let currentImageMimeType = null;

  // --- 📷 Image Attachment Handling ---
  attachBtn.addEventListener('click', () => { fileInput.click(); });

  fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          currentImageBase64 = event.target.result;
          currentImageMimeType = file.type;
          imgPreview.src = currentImageBase64;
          imgPreviewContainer.style.display = 'flex';
          
          // Focus input after attaching
          chatInput.focus();
      };
      reader.readAsDataURL(file);
  });

  removeImgBtn.addEventListener('click', () => {
      currentImageBase64 = null;
      currentImageMimeType = null;
      imgPreviewContainer.style.display = 'none';
      imgPreview.src = '';
      fileInput.value = '';
  });

  // --- 🔊 Sound System (Web Audio API) ---
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  function playSound(type) {
      if(audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if(type === 'send') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'receive') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(400, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
      }
  }

  // --- 🗣️ Speech Synthesis (Text-to-Speech) ---
  function speakText(text) {
      if (!voiceToggle.checked) return; // لو المستخدم قفل الصوت
      
      // نوقف أي كلام شغال حالياً
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-EG'; // اللغة العربية - لهجة مصرية لو متاحة في النظام
      utterance.rate = 0.95; // سرعة هادية ومريحة
      utterance.pitch = 0.8; // طبقة صوت عميقة نسبياً بتليق بمصري
      
      window.speechSynthesis.speak(utterance);
  }

  // --- 🎙️ Speech Recognition (Speech-to-Text) ---
  let recognition = null;
  let isRecording = false;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG'; 
      recognition.continuous = false; // أفضل توافقية وتقليل أخطاء المتصفح
      recognition.interimResults = true;

      let baseText = '';

      recognition.onstart = function() {
          isRecording = true;
          micBtn.classList.add('recording');
          baseText = chatInput.value ? chatInput.value + ' ' : '';
          chatInput.placeholder = 'بدأت التسجيل...';
      };

      recognition.onresult = function(event) {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
              transcript += event.results[i][0].transcript;
          }
          chatInput.value = baseText + transcript;
          
          if (chatInput.value.trim().length > 0) {
              chatSendBtn.style.transform = 'scale(1.1)';
              chatSendBtn.style.boxShadow = '0 0 15px rgba(212,175,55,0.4)';
          }
      };

      recognition.onerror = function(event) {
          console.error("Speech error:", event.error);
          micBtn.classList.remove('recording');
          chatInput.placeholder = 'حدث خطأ في المايك...';
          isRecording = false;
      };

      recognition.onend = function() {
          isRecording = false;
          micBtn.classList.remove('recording');
          chatInput.placeholder = 'اكتب، اتكلم، أو ارفع صورة...';
      };
  } else {
      // إخفاء زر المايك لو المتصفح مش بيدعم
      micBtn.style.display = 'none';
  }

  // Microphone click handler
  micBtn.addEventListener('click', () => {
      if (!recognition) return alert('عفواً، متصفحك لا يدعم خاصية التسجيل الصوتي.');
      
      if (isRecording) {
          recognition.stop();
      } else {
          try {
            recognition.start();
          } catch(e) {}
      }
  });


  // --- Message UI rendering ---
  function addMessage(text, sender = 'user', imageBase64 = null) {
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

        setTimeout(() => {
            msgDiv.innerHTML = `
            <div class="msg-bubble">${text}</div>
            <div class="msg-time">مصري • دلوقتي</div>
            `;
            playSound('receive');
            speakText(text); // 🗣️ قراءة الرد بصوت
            scrollToBottom();
        }, 500); 
    }
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // --- API Connection ---
  async function handleSendText(text) {
    if (!text.trim() && !currentImageBase64) return;
    
    const qrContainer = document.getElementById('quick-replies');
    if(qrContainer && qrContainer.style.display !== 'none') {
        qrContainer.style.display = 'none';
        if(audioCtx.state === 'suspended') audioCtx.resume();
    }

    const payloadText = text;
    const payloadImage = currentImageBase64;
    const payloadMime = currentImageMimeType;

    addMessage(payloadText, 'user', payloadImage);
    
    chatInput.value = '';
    
    // Reset image
    if(currentImageBase64) {
        removeImgBtn.click();
    }
    
    chatInput.focus();

    const typingElement = document.createElement('div');
    typingElement.className = 'msg msg-masry temp-typing';
    typingElement.innerHTML = `<div class="typing-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    chatMessages.appendChild(typingElement);
    scrollToBottom();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: payloadText, image: payloadImage, mimeType: payloadMime })
        });
        const data = await response.json();
        chatMessages.removeChild(typingElement);
        addMessage(data.reply, 'masry');
    } catch(error) {
        chatMessages.removeChild(typingElement);
        addMessage("عذراً، فيه عطل في التواصل معايا دلوقتي. حاول تاني كمان شوية.", 'masry');
    }
  }

  // --- Event Listeners ---
  chatSendBtn.addEventListener('click', () => { handleSendText(chatInput.value); });
  
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendText(chatInput.value);
  });

  quickReplies.forEach(btn => {
    btn.addEventListener('click', () => {
      handleSendText(btn.getAttribute('data-q'));
    });
  });

  chatInput.addEventListener('input', () => {
      if (chatInput.value.trim().length > 0) {
          chatSendBtn.style.transform = 'scale(1.1)';
          chatSendBtn.style.boxShadow = '0 0 15px rgba(212,175,55,0.4)';
      } else {
          chatSendBtn.style.transform = 'scale(1)';
          chatSendBtn.style.boxShadow = 'none';
      }
  });
});
