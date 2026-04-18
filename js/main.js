/* ===============================
   MASRY AI — Main JS
   =============================== */

// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Scroll-reveal animation ──
const scrollObserver = new IntersectionObserver(
  entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay based on sibling index
        const siblings = entry.target.parentElement.querySelectorAll('[data-scroll]');
        let idx = 0;
        siblings.forEach((el, j) => { if (el === entry.target) idx = j; });
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 120);
        scrollObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('[data-scroll]').forEach(el => scrollObserver.observe(el));

// ── Animated counters ──
function animateCounter(el, target, duration = 2000) {
  const start = performance.now();
  const isLarge = target >= 1000;

  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 4); // ease-out-quart
    const current  = Math.floor(eased * target);
    el.textContent = current.toLocaleString('ar-EG');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('ar-EG');
  };

  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseInt(el.dataset.target, 10);
        animateCounter(el, target);
        counterObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.4 }
);

document.querySelectorAll('.stat-num[data-target]').forEach(el => counterObserver.observe(el));

// ── Typing effect for hero tagline ──
(function typingEffect() {
  const tagline = document.querySelector('.hero-tagline');
  if (!tagline) return;

  const lines = ['لست مجرد برنامج.', 'أنا ذاكرة. أنا ثقافة. أنا أنت.'];
  let lineIdx = 0, charIdx = 0, deleting = false;

  tagline.innerHTML = '';
  tagline.style.minHeight = '4rem';

  function type() {
    const currentLine = lines[lineIdx];

    if (!deleting) {
      charIdx++;
      tagline.innerHTML = `<span class="typed-line">${currentLine.slice(0, charIdx)}</span><span class="cursor">|</span>`;

      if (charIdx === currentLine.length) {
        if (lineIdx === lines.length - 1) return; // Keep last line
        setTimeout(() => { deleting = true; type(); }, 1800);
        return;
      }
    } else {
      charIdx--;
      tagline.innerHTML = `<span class="typed-line">${currentLine.slice(0, charIdx)}</span><span class="cursor">|</span>`;

      if (charIdx === 0) {
        deleting = false;
        lineIdx  = (lineIdx + 1) % lines.length;
      }
    }

    const speed = deleting ? 40 : 80;
    setTimeout(type, speed);
  }

  setTimeout(type, 1200);
})();

// ── Cursor blink style ──
const style = document.createElement('style');
style.textContent = `
  .cursor {
    display: inline-block;
    color: var(--gold);
    animation: blink 0.9s step-end infinite;
    margin-right: 2px;
  }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
  .typed-line { color: var(--text); font-family: 'Amiri', serif; }
`;
document.head.appendChild(style);

// ── Smooth active nav link highlight on scroll ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  },
  { threshold: 0.4 }
);

sections.forEach(s => sectionObserver.observe(s));

// ── Active nav style ──
const navStyle = document.createElement('style');
navStyle.textContent = `.nav-links a.active { color: var(--gold) !important; }`;
document.head.appendChild(navStyle);

// ── Glassmorphism card mouse-track glow ──
document.querySelectorAll('.glass-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const rect = card.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width)  * 100;
    const y    = ((e.clientY - rect.top)  / rect.height) * 100;
    card.style.setProperty('--mx', `${x}%`);
    card.style.setProperty('--my', `${y}%`);
    card.style.background = `
      radial-gradient(circle at ${x}% ${y}%,
        rgba(212,175,55,0.07) 0%,
        rgba(255,255,255,0.03) 50%,
        rgba(255,255,255,0.02) 100%)
    `;
  });

  card.addEventListener('mouseleave', () => {
    card.style.background = '';
  });
});

// ── System items stagger on hover parent ──
document.querySelectorAll('.system-item').forEach((item, i) => {
  item.style.transitionDelay = `${i * 0.05}s`;
});

// ── CTA button particle burst ──
const ctaBtn = document.querySelector('.btn-large');
if (ctaBtn) {
  ctaBtn.addEventListener('click', e => {
    e.preventDefault();
    createBurst(e.clientX, e.clientY);
    setTimeout(() => {
      alert('🌟 مصري — قريباً!\n\nالكيان الرقمي المصري في طريقه إليك.');
    }, 400);
  });
}

function createBurst(x, y) {
  const burstCanvas = document.createElement('canvas');
  burstCanvas.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh;
    pointer-events:none; z-index:9999;
  `;
  document.body.appendChild(burstCanvas);
  burstCanvas.width  = window.innerWidth;
  burstCanvas.height = window.innerHeight;
  const bCtx = burstCanvas.getContext('2d');

  const dots = Array.from({ length: 30 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 0.5) * 12,
    size: Math.random() * 5 + 2,
    alpha: 1,
    color: Math.random() > 0.5 ? '212,175,55' : '0,201,167'
  }));

  let frame = 0;
  function burst() {
    bCtx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);
    dots.forEach(d => {
      d.x     += d.vx;
      d.y     += d.vy;
      d.vx    *= 0.93;
      d.vy    *= 0.93;
      d.alpha -= 0.025;
      bCtx.beginPath();
      bCtx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
      bCtx.fillStyle = `rgba(${d.color},${Math.max(0, d.alpha)})`;
      bCtx.fill();
    });
    if (++frame < 50) requestAnimationFrame(burst);
    else burstCanvas.remove();
  }
  requestAnimationFrame(burst);
}

// ── Page load entrance ──
window.addEventListener('load', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.6s ease';
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });
});

console.log('%c مصري AI 🌟', 'color:#D4AF37; font-size:2rem; font-weight:bold;');
console.log('%c أول كيان رقمي بهوية مصرية أصيلة', 'color:#00C9A7; font-size:1rem;');
