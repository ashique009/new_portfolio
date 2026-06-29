// app.js - Portfolio V2 Interactive Engine

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Register global visibility flags
  let isHeroInView = true;
  let isGalaxyInView = true;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.target.id === 'hero') {
        isHeroInView = entry.isIntersecting;
      } else if (entry.target.id === 'galaxy-section') {
        isGalaxyInView = entry.isIntersecting;
      }
    });
  }, { threshold: 0.05 });

  const heroEl = document.getElementById('hero');
  const galaxyEl = document.getElementById('galaxy-section');
  if (heroEl) observer.observe(heroEl);
  if (galaxyEl) observer.observe(galaxyEl);

  initLoadingScreen();
  initLenis(prefersReducedMotion);
  initSmokeBackground(prefersReducedMotion, () => isHeroInView || isGalaxyInView);
  initGSAPAnimations();
  initCustomCursor(prefersReducedMotion);
  initMagneticButtons(prefersReducedMotion);
  initGalaxyNavigation(() => isGalaxyInView);
  init3DTiltCards(prefersReducedMotion);
  initScrollProgress();
});

/* =========================================================================
   1. Premium Loader Screen Sequence
   ========================================================================= */
function initLoadingScreen() {
  const loader = document.getElementById('loader-screen');
  const progressBar = document.getElementById('loader-progress-bar');
  const percentageLabel = document.getElementById('loader-percentage');
  const svgCircle = document.querySelector('.loader-circle-svg circle');
  const loaderCharA = document.getElementById('loader-char-a');
  const loaderTitle = document.getElementById('loader-title');

  if (!loader) return;

  // Set initial scroll locks
  document.body.classList.add('loading');

  // Populate title characters for stagger animation
  const nameStr = "ASHIQUE";
  loaderTitle.innerHTML = nameStr.split("").map(char => `<span>${char}</span>`).join("");

  // Counter logic
  let counter = { value: 0 };
  const countDuration = 2.4; // 2.4 seconds loading sequence

  // Draw circle perimeter: radius is 45 -> perimeter = 2 * PI * r = 282.7
  const perimeter = 282.7;
  svgCircle.style.strokeDasharray = perimeter;
  svgCircle.style.strokeDashoffset = perimeter;

  const tl = gsap.timeline({
    onComplete: () => {
      // Fade out loading screen
      gsap.to(loader, {
        opacity: 0,
        yPercent: -100,
        duration: 1.2,
        ease: "power4.inOut",
        onComplete: () => {
          loader.style.display = 'none';
          document.body.classList.remove('loading');
          
          // Trigger Hero Entrance Animations
          triggerHeroAnimations();
        }
      });
    }
  });

  // Animate percent count and progress bar width
  tl.to(counter, {
    value: 100,
    duration: countDuration,
    ease: "power2.out",
    onUpdate: () => {
      const pct = Math.floor(counter.value);
      percentageLabel.textContent = `${pct}%`;
      progressBar.style.width = `${pct}%`;
      
      // Animate SVG circle draw
      const offset = perimeter - (pct / 100) * perimeter;
      svgCircle.style.strokeDashoffset = offset;
    }
  });

  // Reveal logo char A in center
  tl.to(loaderCharA, {
    opacity: 1,
    scale: 1.15,
    duration: 0.8,
    ease: "back.out(1.5)"
  }, 0.5);

  // Stagger reveal name
  tl.to("#loader-title span", {
    opacity: 1,
    y: 0,
    stagger: 0.08,
    duration: 0.6,
    ease: "power3.out"
  }, 0.8);
}

/* =========================================================================
   2. Lenis Smooth Scroll Initialization
   ========================================================================= */
let lenis;
function initLenis(prefersReducedMotion) {
  if (prefersReducedMotion) return;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.05,
    touchMultiplier: 1.8,
    infinite: false,
  });

  function raf(time) {
    if (lenis) lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  lenis.on('scroll', ScrollTrigger.update);
  
  gsap.ticker.add((time) => {
    if (lenis) lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Scroll triggers
  document.querySelectorAll('[data-scroll-to]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute('data-scroll-to');
      
      // If target is contact-section (which may be display: none), trigger contact planet zoom reveal
      if (targetId === 'contact-section') {
        const contactPlanet = document.getElementById('planet-contact');
        if (contactPlanet) {
          contactPlanet.click();
          return;
        }
      }
      
      let targetEl = document.getElementById(targetId) || document.querySelector('.' + targetId);
      if (targetEl) {
        if (lenis) {
          lenis.scrollTo(targetEl, {
            offset: -60,
            duration: 1.6
          });
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

/* =========================================================================
   3. Canvas Particle & Mouse Trail Background (Drifting Nebula)
   ========================================================================= */
let spawnTrailParticle = () => {}; // Stub to expose to mouse handler
function initSmokeBackground(prefersReducedMotion, checkVisibility) {
  const canvas = document.getElementById('smoke-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  // Parallax offsets for fly-in camera visual depth
  let cameraOffset = { x: 0, y: 0, targetX: 0, targetY: 0 };

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    if (prefersReducedMotion) {
      renderStaticStars();
    }
  });

  // Share offset change function globally
  window.updateBackgroundParallax = (x, y) => {
    cameraOffset.targetX = x;
    cameraOffset.targetY = y;
  };

  // If prefers reduced motion, draw static environment and stop looping
  if (prefersReducedMotion) {
    renderStaticStars();
    return;
  }

  function renderStaticStars() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    ctx.shadowBlur = 0;
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.arc(rx, ry, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212, 175, 55, ${Math.random() * 0.3 + 0.15})`;
      ctx.fill();
    }
  }

  // OPTIMIZATION: Pre-render complex radial gradients on off-screen canvases
  const nebulaCache = document.createElement('canvas');
  nebulaCache.width = 400;
  nebulaCache.height = 400;
  const nCacheCtx = nebulaCache.getContext('2d');
  const nGrad = nCacheCtx.createRadialGradient(200, 200, 0, 200, 200, 200);
  nGrad.addColorStop(0, 'rgba(212, 175, 55, 1)');
  nGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.25)');
  nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  nCacheCtx.fillStyle = nGrad;
  nCacheCtx.beginPath();
  nCacheCtx.arc(200, 200, 200, 0, Math.PI * 2);
  nCacheCtx.fill();

  const particleCache = document.createElement('canvas');
  particleCache.width = 32;
  particleCache.height = 32;
  const pCacheCtx = particleCache.getContext('2d');
  const pGrad = pCacheCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  pGrad.addColorStop(0, 'rgba(212, 175, 55, 1)');
  pGrad.addColorStop(0.25, 'rgba(212, 175, 55, 0.65)');
  pGrad.addColorStop(0.6, 'rgba(212, 175, 55, 0.15)');
  pGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
  pCacheCtx.fillStyle = pGrad;
  pCacheCtx.beginPath();
  pCacheCtx.arc(16, 16, 16, 0, Math.PI * 2);
  pCacheCtx.fill();

  // Particles Array
  const particles = [];
  const particleCount = Math.min(120, Math.floor(width / 12));

  class Particle {
    constructor(isTrail = false, startX = 0, startY = 0) {
      this.isTrail = isTrail;
      if (isTrail) {
        this.x = startX;
        this.y = startY;
        this.size = Math.random() * 2.5 + 1.2;
        this.speedX = Math.random() * 1.2 - 0.6;
        this.speedY = Math.random() * 1.2 - 0.6;
        this.opacity = 0.95;
        this.maxOpacity = 0.95;
        this.lifeTime = Math.random() * 35 + 25; // Dies quickly
      } else {
        this.reset();
        this.y = Math.random() * height;
      }
      this.age = 0;
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height + Math.random() * 50;
      this.size = Math.random() * 2 + 0.6;
      this.speedX = Math.random() * 0.3 - 0.15;
      this.speedY = -(Math.random() * 0.5 + 0.25);
      this.opacity = 0;
      this.maxOpacity = Math.random() * 0.35 + 0.1;
      this.fadeInSpeed = 0.005 + Math.random() * 0.005;
      this.fadeOutSpeed = 0.002 + Math.random() * 0.002;
      this.lifeTime = Math.random() * 220 + 200;
      this.age = 0;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.age++;

      if (this.isTrail) {
        this.opacity = this.maxOpacity * (1 - this.age / this.lifeTime);
      } else {
        if (this.opacity < this.maxOpacity && this.age < 50) {
          this.opacity += this.fadeInSpeed;
        }
        if (this.age > this.lifeTime - 50 || this.y < 100) {
          this.opacity -= this.fadeOutSpeed;
        }
        if (this.opacity <= 0 || this.y < 0 || this.x < 0 || this.x > width) {
          this.reset();
        }
      }
    }

    draw() {
      if (this.opacity <= 0) return;
      
      const px = this.x + cameraOffset.x * (this.size * 0.08);
      const py = this.y + cameraOffset.y * (this.size * 0.08);

      ctx.globalAlpha = this.opacity;
      const sizeMultiplier = this.isTrail ? 4 : 2;
      const drawSize = this.size * sizeMultiplier;
      
      // OPTIMIZATION: draw off-screen cached circle image instead of calculating shadowBlur
      ctx.drawImage(
        particleCache,
        px - drawSize / 2,
        py - drawSize / 2,
        drawSize,
        drawSize
      );
      ctx.globalAlpha = 1.0;
    }
  }

  // Nebula Cloud Nodes
  class NebulaNode {
    constructor() {
      this.reset();
      this.opacity = Math.random() * 0.04 + 0.015;
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.radius = Math.random() * 200 + 200;
      this.vx = Math.random() * 0.12 - 0.06;
      this.vy = Math.random() * 0.12 - 0.06;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.x < -this.radius || this.x > width + this.radius ||
          this.y < -this.radius || this.y > height + this.radius) {
        this.reset();
      }
    }

    draw() {
      const px = this.x + cameraOffset.x * 0.02;
      const py = this.y + cameraOffset.y * 0.02;

      ctx.globalAlpha = this.opacity;
      // OPTIMIZATION: draw offscreen pre-rendered gradient cloud
      ctx.drawImage(
        nebulaCache, 
        px - this.radius, 
        py - this.radius, 
        this.radius * 2, 
        this.radius * 2
      );
      ctx.globalAlpha = 1.0;
    }
  }

  // Cinematic Shooting Stars
  class ShootingStar {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * (height * 0.4);
      this.len = Math.random() * 80 + 50;
      this.speed = Math.random() * 8 + 5;
      this.angle = Math.PI / 6 + Math.random() * (Math.PI / 12);
      this.opacity = 0;
      this.maxOpacity = Math.random() * 0.45 + 0.25;
      this.lifeTime = Math.random() * 60 + 35;
      this.age = 0;
    }

    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.age++;

      if (this.age < 15) {
        this.opacity += 0.04;
      } else if (this.age > this.lifeTime - 15) {
        this.opacity -= 0.04;
      }

      if (this.x > width || this.y > height || this.opacity <= 0) {
        this.reset();
      }
    }

    draw() {
      if (this.opacity <= 0) return;
      ctx.beginPath();
      const grad = ctx.createLinearGradient(
        this.x, this.y,
        this.x - Math.cos(this.angle) * this.len,
        this.y - Math.sin(this.angle) * this.len
      );
      grad.addColorStop(0, `rgba(212, 175, 55, ${this.opacity})`);
      grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x - Math.cos(this.angle) * this.len,
        this.y - Math.sin(this.angle) * this.len
      );
      ctx.stroke();
    }
  }

  // Fill initial systems
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(false));
  }
  const nebulae = Array.from({ length: 4 }, () => new NebulaNode());
  const shootingStars = Array.from({ length: 2 }, () => new ShootingStar());

  // Expose trail spawner
  spawnTrailParticle = (sx, sy) => {
    particles.push(new Particle(true, sx, sy));
    if (particles.length > 250) {
      const idx = particles.findIndex(p => p.isTrail);
      if (idx !== -1) particles.splice(idx, 1);
    }
  };

  // Rendering Loop
  function loop() {
    // OPTIMIZATION: Pause drawing if neither Hero nor Galaxy sections are visible in viewport
    if (checkVisibility()) {
      ctx.clearRect(0, 0, width, height);

      cameraOffset.x += (cameraOffset.targetX - cameraOffset.x) * 0.05;
      cameraOffset.y += (cameraOffset.targetY - cameraOffset.y) * 0.05;

      nebulae.forEach(node => {
        node.update();
        node.draw();
      });

      shootingStars.forEach(star => {
        star.update();
        star.draw();
      });

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        
        if (p.isTrail && p.age >= p.lifeTime) {
          particles.splice(i, 1);
        }
      }
    }

    requestAnimationFrame(loop);
  }
  loop();
}

/* =========================================================================
   4. Custom Cursor Tracker, Trail Spawner & Click Ripples
   ========================================================================= */
function initCustomCursor(prefersReducedMotion) {
  const dot = document.getElementById('custom-cursor-dot');
  const ring = document.getElementById('custom-cursor-ring');
  if (!dot || !ring) return;

  if (prefersReducedMotion) {
    dot.style.display = 'none';
    ring.style.display = 'none';
    document.body.style.cursor = 'default';
    return;
  }

  let mouseX = -100, mouseY = -100;
  let dotX = -100, dotY = -100;
  let ringX = -100, ringY = -100;
  let lastSpawnX = 0, lastSpawnY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    const dist = Math.hypot(mouseX - lastSpawnX, mouseY - lastSpawnY);
    if (dist > 8) {
      spawnTrailParticle(mouseX, mouseY);
      lastSpawnX = mouseX;
      lastSpawnY = mouseY;
    }
  }, { passive: true });

  // OPTIMIZATION: Lerp cursor dots on frame update to avoid generating GSAP instances on mousemove
  function updateCursorFrame() {
    dotX += (mouseX - dotX) * 0.85;
    dotY += (mouseY - dotY) * 0.85;

    ringX += (mouseX - ringX) * 0.16;
    ringY += (mouseY - ringY) * 0.16;

    // Use 3D translations to trigger hardware compositing layers
    dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

    requestAnimationFrame(updateCursorFrame);
  }
  requestAnimationFrame(updateCursorFrame);

  // Expand ring on hovering clickables
  const hoverSelector = 'a, button, .planet, .nav-btn, [role="button"], .close-section-btn';
  document.body.addEventListener('mouseenter', (e) => {
    if (e.target.closest(hoverSelector)) {
      ring.classList.add('cursor-hover');
    }
  }, true);

  document.body.addEventListener('mouseleave', (e) => {
    if (e.target.closest(hoverSelector)) {
      ring.classList.remove('cursor-hover');
    }
  }, true);

  // Click ripples and golden sparks
  window.addEventListener('mousedown', (e) => {
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    document.body.appendChild(ripple);

    gsap.set(ripple, {
      x: e.clientX,
      y: e.clientY,
      width: 10,
      height: 10,
      opacity: 0.8,
      borderColor: '#D4AF37'
    });

    gsap.to(ripple, {
      width: 60,
      height: 60,
      opacity: 0,
      duration: 0.5,
      ease: "power2.out",
      onComplete: () => ripple.remove()
    });

    const sparkCount = 8;
    const sparkColors = ['#D4AF37', '#F3E5AB', '#FFFFFF'];
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement('div');
      spark.className = 'cursor-spark';
      document.body.appendChild(spark);
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 70 + 40;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      
      gsap.set(spark, {
        x: e.clientX,
        y: e.clientY,
        backgroundColor: sparkColors[Math.floor(Math.random() * sparkColors.length)]
      });
      
      gsap.to(spark, {
        x: e.clientX + vx,
        y: e.clientY + vy,
        opacity: 0,
        scale: 0.15,
        duration: 0.6 + Math.random() * 0.4,
        ease: "power3.out",
        onComplete: () => spark.remove()
      });
    }
  });
}

/* =========================================================================
   5. GSAP Entrance Revelations
   ========================================================================= */
function initGSAPAnimations() {
  gsap.registerPlugin(ScrollTrigger);

  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });
}

// Global hook to check if Hero is in viewport
let isHeroInViewport = true;

function triggerHeroAnimations() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

  // Floating profile frame animation hook
  let floatY = 0, floatRot = 0;
  const floatObj = { y: 0, rot: 0 };
  gsap.to(floatObj, {
    y: -14,
    rot: 2,
    duration: 4.5,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    onUpdate: () => {
      floatY = floatObj.y;
      floatRot = floatObj.rot;
    }
  });

  // Spotlight mouse track lerped in requestAnimationFrame to avoid hover glitches
  const frame = document.getElementById('profile-frame');
  const hero = document.getElementById('hero');
  if (hero && frame) {
    let targetMX = 0, targetMY = 0;
    let currentMX = 0, currentMY = 0;

    hero.addEventListener('mousemove', (e) => {
      targetMX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      targetMY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    }, { passive: true });
    
    hero.addEventListener('mouseleave', () => {
      targetMX = 0;
      targetMY = 0;
    });

    // Create observer for Hero
    const heroObserver = new IntersectionObserver((entries) => {
      isHeroInViewport = entries[0].isIntersecting;
    }, { threshold: 0.05 });
    heroObserver.observe(hero);

    function updateHeroFrame() {
      // OPTIMIZATION: Only update transforms if Hero is actually visible in the viewport
      if (isHeroInViewport) {
        currentMX += (targetMX - currentMX) * 0.1;
        currentMY += (targetMY - currentMY) * 0.1;
        
        frame.style.transform = `translate3d(${-currentMX * 20}px, ${-currentMY * 20 + floatY}px, 0) rotateY(${-currentMX * 12}deg) rotateX(${currentMY * 12}deg) rotate(${floatRot}deg)`;
      }
      requestAnimationFrame(updateHeroFrame);
    }
    requestAnimationFrame(updateHeroFrame);
  }

  // Type title letters
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) {
    const text = heroTitle.textContent.trim();
    heroTitle.innerHTML = text.split("").map(c => `<span>${c}</span>`).join("");
    
    tl.fromTo("#hero-title span", 
      { opacity: 0, y: 35, skewY: 5, filter: "blur(12px)" },
      { opacity: 1, y: 0, skewY: 0, filter: "blur(0px)", stagger: 0.08, duration: 1.2, ease: "power3.out" },
      0.2
    );
  }

  // Shutter mask slide-out reveal
  tl.to(".mask-sheen", {
    xPercent: 101,
    duration: 1.5,
    ease: "power3.inOut"
  }, 0.9);

  // Timeline reveals
  tl.fromTo(".navbar", { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2 }, 0.4)
    .fromTo("#hero-intro", { opacity: 0, y: 15, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1 }, 0.5)
    .from(".gold-line", { width: 0, duration: 1 }, 0.5)
    .fromTo("#hero-tagline", { opacity: 0, y: 25, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2 }, 0.9)
    .fromTo("#hero-actions .magnetic-btn", { opacity: 0, y: 20, filter: "blur(4px)" }, { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.15, duration: 1 }, 1.1)
    .from(".profile-halo", { scale: 0.6, opacity: 0, duration: 1.8 }, 0.7)
    .fromTo(".profile-frame", { scale: 0.9, opacity: 0, filter: "blur(10px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.4 }, 0.9)
    .from(".scroll-indicator", { y: 15, opacity: 0, duration: 1 }, 1.6);

  initTypingSubtitleLoop();
}

/* =========================================================================
   6. Subtitle Double typing Loop
   ========================================================================= */
function initTypingSubtitleLoop() {
  const subtitleEl = document.getElementById('hero-subtitle');
  if (!subtitleEl) return;

  const subtitles = ["Software Engineering Student", "Python Backend Developer"];
  let wordIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let delay = 100;

  function typeCycle() {
    if (!isHeroInViewport) {
      // Pause typing cycle if hero is offscreen to save computations
      setTimeout(typeCycle, 500);
      return;
    }

    const currentWord = subtitles[wordIdx];
    
    if (isDeleting) {
      subtitleEl.textContent = currentWord.substring(0, charIdx - 1);
      charIdx--;
      delay = 50;
    } else {
      subtitleEl.textContent = currentWord.substring(0, charIdx + 1);
      charIdx++;
      delay = 100;
    }

    if (!isDeleting && charIdx === currentWord.length) {
      isDeleting = true;
      delay = 2000;
    } else if (isDeleting && charIdx === 0) {
      isDeleting = false;
      wordIdx = (wordIdx + 1) % subtitles.length;
      delay = 400;
    }

    setTimeout(typeCycle, delay);
  }

  typeCycle();
}

/* =========================================================================
   7. Scroll Progress tracker
   ========================================================================= */
function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return;
    const pct = (window.scrollY / maxScroll) * 100;
    progressBar.style.width = `${pct}%`;
  }, { passive: true });
}

/* =========================================================================
   8. Interactive Keplerian Orbit Galaxy & Zoom camera triggers
   ========================================================================= */
function initGalaxyNavigation(checkVisibility) {
  const wrapper = document.getElementById('galaxy-wrapper');
  const parallaxContainer = document.getElementById('galaxy-parallax-container');
  const galaxySection = document.getElementById('galaxy-section');
  if (!wrapper) return;

  const planets = document.querySelectorAll('.planet');
  const orbits = document.querySelectorAll('.orbit-line');
  
  const baseRadii = [85, 130, 175, 220, 265, 310, 355];
  let radii = [...baseRadii];

  const planetData = [];
  planets.forEach((el, index) => {
    planetData.push({
      el: el,
      orbitIndex: index,
      radius: radii[index],
      currentAngle: index * (2 * Math.PI / planets.length),
      isHovered: false,
      speedMultiplier: 120 / radii[index]
    });
  });

  let cx = wrapper.clientWidth / 2;
  let cy = wrapper.clientHeight / 2;

  let dragAngle = 0;
  let targetDragAngle = 0;
  let dragVelocity = 0;
  let isDragging = false;
  let lastMouseAngle = 0;
  
  let isZoomed = false;

  // Parallax coordinates update on move
  let targetParallaxX = 0, targetParallaxY = 0;
  let parallaxX = 0, parallaxY = 0;

  function handleResize() {
    cx = wrapper.clientWidth / 2;
    cy = wrapper.clientHeight / 2;
    const scaleFactor = wrapper.clientWidth / 780;
    
    planetData.forEach((p, idx) => {
      p.radius = baseRadii[idx] * scaleFactor;
    });

    orbits.forEach((line, idx) => {
      const size = baseRadii[idx] * 2 * scaleFactor;
      line.style.width = `${size}px`;
      line.style.height = `${size}px`;
    });
    
    if (parallaxContainer) {
      gsap.set(parallaxContainer, { x: 0, y: 0 });
    }
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // Orbit loop updates
  function updatePhysics() {
    // OPTIMIZATION: Pause all math recalculations and coordinates updates if galaxy is off-screen
    if (checkVisibility()) {
      if (!isZoomed) {
        if (!isDragging) {
          dragVelocity *= 0.95;
          targetDragAngle += dragVelocity;
        } else {
          const diff = targetDragAngle - dragAngle;
          dragVelocity = diff * 0.25;
        }
        
        dragAngle += (targetDragAngle - dragAngle) * 0.15;
        
        planetData.forEach(p => {
          const speed = p.isHovered ? 0 : 1;
          const delta = 0.0016 * p.speedMultiplier * speed;
          p.currentAngle += delta;
        });

        // Lerp mouse parallax offset inside the main animation tick rather than on mousemove listener
        if (isZoomed) {
          targetParallaxX = 0;
          targetParallaxY = 0;
        }
        parallaxX += (targetParallaxX - parallaxX) * 0.1;
        parallaxY += (targetParallaxY - parallaxY) * 0.1;
        if (parallaxContainer) {
          parallaxContainer.style.transform = `translate3d(${parallaxX}px, ${parallaxY}px, 0)`;
        }
      }

      planetData.forEach(p => {
        const angle = p.currentAngle + dragAngle;
        const x = cx + p.radius * Math.cos(angle);
        const y = cy + p.radius * Math.sin(angle);
        
        const planetWidth = p.el.offsetWidth || 52;
        const planetHeight = p.el.offsetHeight || 52;
        
        p.el.style.left = `${x - planetWidth / 2}px`;
        p.el.style.top = `${y - planetHeight / 2}px`;
      });
    }

    requestAnimationFrame(updatePhysics);
  }
  updatePhysics();

  // Mouse & Touch drag logic
  function getMouseAngle(clientX, clientY) {
    const rect = wrapper.getBoundingClientRect();
    const rx = rect.left + rect.width / 2;
    const ry = rect.top + rect.height / 2;
    return Math.atan2(clientY - ry, clientX - rx);
  }

  function startDrag(clientX, clientY) {
    if (isZoomed) return;
    isDragging = true;
    dragVelocity = 0;
    lastMouseAngle = getMouseAngle(clientX, clientY);
  }

  function moveDrag(clientX, clientY) {
    if (!isDragging) return;
    const currentAngle = getMouseAngle(clientX, clientY);
    let diff = currentAngle - lastMouseAngle;

    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    targetDragAngle += diff;
    lastMouseAngle = currentAngle;
  }

  function endDrag() {
    isDragging = false;
  }

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.planet') || isZoomed) return;
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    moveDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', endDrag);

  // Touch support
  wrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('.planet') || isZoomed) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  window.addEventListener('touchend', endDrag);

  // OPTIMIZATION: Throttled mouse parallax targeting
  if (galaxySection && parallaxContainer) {
    galaxySection.addEventListener('mousemove', (e) => {
      if (isZoomed) return;
      const rect = galaxySection.getBoundingClientRect();
      targetParallaxX = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 20;
      targetParallaxY = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * 20;
    }, { passive: true });
    
    galaxySection.addEventListener('mouseleave', () => {
      if (isZoomed) return;
      targetParallaxX = 0;
      targetParallaxY = 0;
    });
  }

  // Active hover properties
  planetData.forEach((p, idx) => {
    p.el.addEventListener('mouseenter', () => {
      p.isHovered = true;
      orbits[idx].classList.add('active');
    });
    p.el.addEventListener('mouseleave', () => {
      p.isHovered = false;
      orbits[idx].classList.remove('active');
    });
  });

  // Planet clicks & Camera fly-in zoom sequence
  let currentActiveSection = null;

  planetData.forEach(p => {
    p.el.addEventListener('click', () => {
      const sectionId = p.el.getAttribute('data-section');
      const targetSection = document.getElementById(sectionId);
      if (!targetSection) return;

      isZoomed = true;
      
      // Reset galaxy mouse parallax immediately
      targetParallaxX = 0;
      targetParallaxY = 0;
      if (parallaxContainer) {
        gsap.to(parallaxContainer, { x: 0, y: 0, duration: 0.6, ease: "power2.out" });
      }

      // Update selections
      planets.forEach(el => el.classList.remove('selected'));
      p.el.classList.add('selected');

      orbits.forEach(line => line.classList.remove('active'));
      orbits[p.orbitIndex].classList.add('active');

      const angle = p.currentAngle + dragAngle;
      const currentX = p.radius * Math.cos(angle);
      const currentY = p.radius * Math.sin(angle);

      // Camera fly-in zoom wrapper translation
      gsap.to(wrapper, {
        x: -currentX * 2.2,
        y: -currentY * 2.2,
        scale: 2.2,
        opacity: 0.15,
        duration: 1.6,
        ease: "power3.inOut"
      });

      // Shift background stars
      window.updateBackgroundParallax(currentX * 1.5, currentY * 1.5);

      // Transition detailed section below
      const runReveal = () => {
        if (currentActiveSection) {
          currentActiveSection.style.display = 'none';
        }
        
        targetSection.style.display = 'block';
        currentActiveSection = targetSection;

        // Scroll to details
        lenis.scrollTo('#details-container', {
          offset: -30,
          duration: 1.5,
          immediate: false
        });

        // GSAP reveal timeline (fade + blur + slide)
        gsap.killTweensOf(targetSection);
        gsap.fromTo(targetSection,
          { opacity: 0, y: 50, filter: "blur(10px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power3.out" }
        );

        // Heading stagger letter typing
        const titleEl = targetSection.querySelector('.section-title');
        if (titleEl) {
          const contentStr = titleEl.textContent.trim();
          titleEl.innerHTML = contentStr.split("").map(c => `<span>${c}</span>`).join("");
          gsap.fromTo(titleEl.querySelectorAll('span'),
            { opacity: 0, y: 20, filter: "blur(6px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.05, duration: 0.8, ease: "power2.out" }
          );
        }

        // Section custom inner grids reveal stagger
        gsap.fromTo(targetSection.querySelectorAll('.info-item, .skill-card, .project-card, .timeline-item, .edu-card, .achievement-card, .contact-btn'),
          { opacity: 0, y: 35, filter: "blur(8px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.06, duration: 0.8, ease: "power2.out" }
        );

        // Stats numbers count-up animation
        targetSection.querySelectorAll('[data-counter]').forEach(el => {
          const targetVal = parseInt(el.getAttribute('data-counter'), 10);
          const counterObj = { value: 0 };
          gsap.to(counterObj, {
            value: targetVal,
            duration: 2.0,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = Math.floor(counterObj.value) + "+";
            }
          });
        });
      };

      if (currentActiveSection && currentActiveSection !== targetSection) {
        gsap.to(currentActiveSection, {
          opacity: 0,
          y: -30,
          duration: 0.4,
          onComplete: runReveal
        });
      } else {
        runReveal();
      }
    });
  });

  // Bind "Return to Universe" close buttons
  document.querySelectorAll('.close-section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!isZoomed) return;

      isZoomed = false;

      // Scroll user back to galaxy container immediately
      lenis.scrollTo('#galaxy-section', {
        offset: -40,
        duration: 1.4
      });

      // Camera fly-out zoom reset (runs concurrently!)
      gsap.to(wrapper, {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 1.4,
        ease: "power3.inOut"
      });

      // Reset background stars shift
      window.updateBackgroundParallax(0, 0);

      // Animate and hide detailed section immediately
      if (currentActiveSection) {
        gsap.to(currentActiveSection, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          ease: "power3.inOut",
          onComplete: () => {
            currentActiveSection.style.display = 'none';
            currentActiveSection = null;
            planets.forEach(el => el.classList.remove('selected'));
            orbits.forEach(line => line.classList.remove('active'));
          }
        });
      }
    });
  });
}

/* =========================================================================
   9. Projects 3D Card Tilt Effect V2
   ========================================================================= */
function init3DTiltCards(prefersReducedMotion) {
  if (prefersReducedMotion) return;

  const cards = document.querySelectorAll('[data-tilt]');
  
  cards.forEach(card => {
    let rAFId = null;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let isHovered = false;

    card.addEventListener('mouseenter', () => {
      isHovered = true;
      card.style.willChange = 'transform';
      tick();
    });

    // OPTIMIZATION: Passive listener only saves target positions, actual tilt lerped in tick()
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      targetX = ((y / rect.height) - 0.5) * 16;
      targetY = (0.5 - (x / rect.width)) * 16;
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      isHovered = false;
      card.style.willChange = 'auto';
      if (rAFId) cancelAnimationFrame(rAFId);
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        scale: 1,
        duration: 0.6,
        ease: "power2.out"
      });
    });

    function tick() {
      if (!isHovered) return;
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      card.style.transform = `perspective(1000px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale3d(1.03, 1.03, 1)`;
      rAFId = requestAnimationFrame(tick);
    }
  });
}

/* =========================================================================
   10. Magnetic Hover Engine for Buttons V2
   ========================================================================= */
function initMagneticButtons(prefersReducedMotion) {
  if (prefersReducedMotion) return;

  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    let rAFId = null;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let isHovered = false;

    btn.addEventListener('mouseenter', () => {
      isHovered = true;
      btn.style.willChange = 'transform';
      tick();
    });

    // OPTIMIZATION: Passive listener only registers targets, movements lerped on tick
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      targetX = (e.clientX - (rect.left + rect.width / 2)) * 0.38;
      targetY = (e.clientY - (rect.top + rect.height / 2)) * 0.38;
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      isHovered = false;
      btn.style.willChange = 'auto';
      if (rAFId) cancelAnimationFrame(rAFId);
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1.05, 0.3)"
      });
    });

    function tick() {
      if (!isHovered) return;
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;
      btn.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      rAFId = requestAnimationFrame(tick);
    }
  });
}
