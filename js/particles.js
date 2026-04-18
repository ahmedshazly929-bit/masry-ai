/* ===============================
   MASRY AI — Particle System
   =============================== */

const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let W, H, mouse = { x: null, y: null };

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => { resize(); init(); });
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

class Particle {
  constructor() { this.reset(); }

  reset() {
    this.x    = Math.random() * W;
    this.y    = Math.random() * H;
    this.size = Math.random() * 2.5 + 0.3;
    this.vx   = (Math.random() - 0.5) * 0.4;
    this.vy   = (Math.random() - 0.5) * 0.4 - 0.15;
    this.life = Math.random();
    this.maxLife = 0.6 + Math.random() * 0.4;

    // Gold or Cyan
    const type = Math.random();
    if (type < 0.6) {
      this.color = `rgba(212,175,55,`;
    } else if (type < 0.85) {
      this.color = `rgba(0,201,167,`;
    } else {
      this.color = `rgba(240,208,96,`;
    }

    this.twinkleSpeed = 0.008 + Math.random() * 0.015;
    this.twinkleDir   = Math.random() > 0.5 ? 1 : -1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life += this.twinkleSpeed * this.twinkleDir;

    if (this.life >= this.maxLife || this.life <= 0) this.twinkleDir *= -1;

    // Mouse repulsion
    if (mouse.x !== null) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / 120;
        this.vx += (dx / dist) * force * 0.3;
        this.vy += (dy / dist) * force * 0.3;
      }
    }

    // Damping
    this.vx *= 0.98;
    this.vy *= 0.98;

    if (this.x < -10) this.x = W + 10;
    if (this.x > W + 10) this.x = -10;
    if (this.y < -10) this.y = H + 10;
    if (this.y > H + 10) this.y = -10;
  }

  draw() {
    const alpha = Math.max(0, Math.min(1, this.life));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color + alpha + ')';
    ctx.fill();

    // Glow
    if (this.size > 1.5) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = this.color + (alpha * 0.08) + ')';
      ctx.fill();
    }
  }
}

// Hieroglyphic floating symbols
class HieroSymbol {
  constructor() { this.reset(); }

  reset() {
    this.x      = Math.random() * W;
    this.y      = H + 50;
    this.char   = ['𓂀','𓆣','𓇯','𓊹','𓋹','𓌀','𓍯','𓇋','𓁹','𓂋','𓅓','𓆑'][Math.floor(Math.random()*12)];
    this.size   = 12 + Math.random() * 20;
    this.speed  = 0.3 + Math.random() * 0.5;
    this.alpha  = 0.04 + Math.random() * 0.08;
    this.drift  = (Math.random() - 0.5) * 0.4;
  }

  update() {
    this.y  -= this.speed;
    this.x  += this.drift;
    if (this.y < -60) this.reset();
  }

  draw() {
    ctx.save();
    ctx.font = `${this.size}px serif`;
    ctx.fillStyle = `rgba(212,175,55,${this.alpha})`;
    ctx.fillText(this.char, this.x, this.y);
    ctx.restore();
  }
}

// Connecting lines between nearby particles
function drawConnections() {
  const maxDist = 100;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.08;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

let hieroSymbols = [];

function init() {
  const count = Math.min(Math.floor((W * H) / 12000), 120);
  particles = Array.from({ length: count }, () => new Particle());
  hieroSymbols = Array.from({ length: 15 }, () => new HieroSymbol());
}

function animate() {
  ctx.clearRect(0, 0, W, H);

  // Subtle radial gradient overlay
  const grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H)*0.7);
  grad.addColorStop(0,   'rgba(10,20,40,0)');
  grad.addColorStop(1,   'rgba(5,11,21,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  drawConnections();
  particles.forEach(p => { p.update(); p.draw(); });
  hieroSymbols.forEach(h => { h.update(); h.draw(); });

  requestAnimationFrame(animate);
}

resize();
init();
animate();
