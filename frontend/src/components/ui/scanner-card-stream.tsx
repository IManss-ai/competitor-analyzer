// src/components/ui/scanner-card-stream.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';

// Competitor-intelligence themed images (Unsplash — reliable URLs)
const COMPETITOR_CARD_IMAGES = [
  // Dark BI analytics dashboard — pricing & conversion data
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop&q=80",
  // Multi-screen market research setup
  "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=800&h=500&fit=crop&q=80",
  // Strategic data analysis — charts on laptop
  "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=500&fit=crop&q=80",
  // SaaS growth metrics dashboard
  "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=800&h=500&fit=crop&q=80",
  // Competitor mapping / market positioning screen
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop&q=80",
];

const ASCII_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";

const generateCode = (width: number, height: number): string => {
  let text = '';
  for (let i = 0; i < width * height; i++) {
    text += ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
  }
  let out = '';
  for (let i = 0; i < height; i++) {
    out += text.substring(i * width, (i + 1) * width) + '\n';
  }
  return out;
};

type ScannerCardStreamProps = {
  showControls?: boolean;
  showSpeed?: boolean;
  initialSpeed?: number;
  direction?: -1 | 1;
  cardImages?: string[];
  repeat?: number;
  cardGap?: number;
  friction?: number;
  scanEffect?: 'clip' | 'scramble';
  height?: number;
};

const ScannerCardStream = ({
  showControls = false,
  showSpeed = false,
  initialSpeed = 120,
  direction = -1,
  cardImages = COMPETITOR_CARD_IMAGES,
  repeat = 6,
  cardGap = 48,
  friction = 0.95,
  scanEffect = 'scramble',
  height = 280,
}: ScannerCardStreamProps) => {
  const [speed, setSpeed] = useState(initialSpeed);
  const [isPaused, setIsPaused] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const cards = useMemo(() => {
    const totalCards = cardImages.length * repeat;
    return Array.from({ length: totalCards }, (_, i) => ({
      id: i,
      image: cardImages[i % cardImages.length],
      ascii: generateCode(Math.floor(400 / 6.5), Math.floor(250 / 13)),
    }));
  }, [cardImages, repeat]);

  const cardLineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalAscii = useRef(new Map<number, string>());

  const cardStreamState = useRef({
    position: 0,
    velocity: initialSpeed,
    direction: direction,
    isDragging: false,
    lastMouseX: 0,
    lastTime: 0,
    cardLineWidth: (400 + cardGap) * cardImages.length * repeat,
    friction: friction,
    minVelocity: 20,
  });

  const scannerState = useRef({ isScanning: false });

  const toggleAnimation = useCallback(() => setIsPaused((p) => !p), []);
  const resetPosition = useCallback(() => {
    cardStreamState.current.position = containerRef.current?.offsetWidth ?? 0;
    cardStreamState.current.velocity = initialSpeed;
    cardStreamState.current.direction = direction;
    setIsPaused(false);
  }, [initialSpeed, direction]);
  const changeDirection = useCallback(() => {
    cardStreamState.current.direction *= -1;
  }, []);

  useEffect(() => {
    cardStreamState.current.lastTime = performance.now();
    const cardLine = cardLineRef.current;
    const container = containerRef.current;
    const particleCanvas = particleCanvasRef.current;
    const scannerCanvas = scannerCanvasRef.current;
    if (!cardLine || !container || !particleCanvas || !scannerCanvas) return;

    // Respect prefers-reduced-motion: a JS rAF loop can't be stopped by the
    // global CSS reduced-motion rule, so gate it here and render one static frame.
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    cards.forEach((card) => originalAscii.current.set(card.id, card.ascii));
    let animationFrameId: number;

    const cW = container.offsetWidth;
    const cH = height;

    // ── Three.js particle layer ──────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-cW / 2, cW / 2, cH / 2, -cH / 2, 1, 1000);
    camera.position.z = 100;
    const renderer = new THREE.WebGLRenderer({ canvas: particleCanvas, alpha: true, antialias: true });
    renderer.setSize(cW, cH);
    renderer.setClearColor(0x000000, 0);

    const particleCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);

    const texCanvas = document.createElement('canvas');
    texCanvas.width = 100;
    texCanvas.height = 100;
    const texCtx = texCanvas.getContext('2d')!;
    const half = 50;
    const grad = texCtx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.025, '#fff');
    grad.addColorStop(0.1, 'hsl(199,89%,30%)');
    grad.addColorStop(0.25, 'hsl(199,89%,8%)');
    grad.addColorStop(1, 'transparent');
    texCtx.fillStyle = grad;
    texCtx.arc(half, half, half, 0, Math.PI * 2);
    texCtx.fill();
    const texture = new THREE.CanvasTexture(texCanvas);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * cW * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * cH;
      velocities[i] = Math.random() * 60 + 30;
      alphas[i] = (Math.random() * 8 + 2) / 10;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: { pointTexture: { value: texture } },
      vertexShader: `attribute float alpha; varying float vAlpha; void main() { vAlpha = alpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 15.0; gl_Position = projectionMatrix * mvPosition; }`,
      fragmentShader: `uniform sampler2D pointTexture; varying float vAlpha; void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha) * texture2D(pointTexture, gl_PointCoord); }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── 2D scanner canvas ────────────────────────────────────────────────
    const ctx = scannerCanvas.getContext('2d')!;
    scannerCanvas.width = cW;
    scannerCanvas.height = cH;

    type SParticle = { x: number; y: number; vx: number; vy: number; radius: number; alpha: number; life: number; decay: number };
    const scannerParticles: SParticle[] = [];
    const baseMax = 600;
    let curMax = baseMax;
    const scanMax = 2000;

    const mkP = (): SParticle => ({
      x: cW / 2 + (Math.random() - 0.5) * 3,
      y: Math.random() * cH,
      vx: Math.random() * 0.8 + 0.2,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 0.6 + 0.4,
      alpha: Math.random() * 0.4 + 0.6,
      life: 1.0,
      decay: Math.random() * 0.02 + 0.005,
    });
    for (let i = 0; i < baseMax; i++) scannerParticles.push(mkP());

    // ── Scramble effect ──────────────────────────────────────────────────
    const runScramble = (el: HTMLElement, cardId: number) => {
      if (el.dataset.scrambling === 'true') return;
      el.dataset.scrambling = 'true';
      const orig = originalAscii.current.get(cardId) ?? '';
      let n = 0;
      const iv = setInterval(() => {
        el.textContent = generateCode(Math.floor(400 / 6.5), Math.floor(250 / 13));
        if (++n >= 10) { clearInterval(iv); el.textContent = orig; delete el.dataset.scrambling; }
      }, 30);
    };

    // ── Card scan detection ──────────────────────────────────────────────
    const updateCardEffects = () => {
      const scanX = cW / 2;
      const sw = 8;
      const sl = scanX - sw / 2;
      const sr = scanX + sw / 2;
      let any = false;

      cardLine.querySelectorAll<HTMLElement>('.card-wrapper').forEach((wrapper, idx) => {
        const rect = wrapper.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const rl = rect.left - cRect.left;
        const rr = rect.right - cRect.left;
        const normal = wrapper.querySelector<HTMLElement>('.card-normal')!;
        const ascii = wrapper.querySelector<HTMLElement>('.card-ascii')!;
        const asciiPre = ascii.querySelector<HTMLElement>('pre')!;

        if (rl < sr && rr > sl) {
          any = true;
          if (scanEffect === 'scramble' && !prefersReducedMotion && wrapper.dataset.scanned !== 'true') runScramble(asciiPre, idx);
          wrapper.dataset.scanned = 'true';
          const iL = Math.max(sl - rl, 0);
          const iR = Math.min(sr - rl, rect.width);
          normal.style.setProperty('--clip-right', `${(iL / rect.width) * 100}%`);
          ascii.style.setProperty('--clip-left', `${(iR / rect.width) * 100}%`);
        } else {
          delete wrapper.dataset.scanned;
          if (rr < sl) {
            normal.style.setProperty('--clip-right', '100%');
            ascii.style.setProperty('--clip-left', '100%');
          } else {
            normal.style.setProperty('--clip-right', '0%');
            ascii.style.setProperty('--clip-left', '0%');
          }
        }
      });

      setIsScanning(any);
      scannerState.current.isScanning = any;
    };

    // ── Input handlers ───────────────────────────────────────────────────
    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      cardStreamState.current.isDragging = true;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      cardStreamState.current.lastMouseX = x;
      cardStreamState.current.velocity = 0;
      cardLine.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!cardStreamState.current.isDragging) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const d = x - cardStreamState.current.lastMouseX;
      cardStreamState.current.position += d;
      cardStreamState.current.velocity = Math.abs(d) / 0.016;
      if (Math.abs(d) > 0) cardStreamState.current.direction = d > 0 ? 1 : -1;
      cardStreamState.current.lastMouseX = x;
    };

    const handleMouseUp = () => {
      cardStreamState.current.isDragging = false;
      cardLine.style.cursor = 'grab';
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      cardStreamState.current.position -= d * 0.5;
      cardStreamState.current.velocity = Math.min(Math.abs(d) * 0.5, 400);
      cardStreamState.current.direction = d > 0 ? -1 : 1;
    };

    cardLine.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    cardLine.addEventListener('touchstart', handleMouseDown, { passive: true });
    window.addEventListener('touchmove', handleMouseMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);
    cardLine.addEventListener('wheel', handleWheel, { passive: false });

    // ── Animation loop ───────────────────────────────────────────────────
    const animate = (now: number) => {
      const dt = Math.min((now - cardStreamState.current.lastTime) / 1000, 0.05);
      cardStreamState.current.lastTime = now;

      if (!isPaused && !cardStreamState.current.isDragging) {
        if (cardStreamState.current.velocity > cardStreamState.current.minVelocity) {
          cardStreamState.current.velocity *= cardStreamState.current.friction;
        }
        cardStreamState.current.position +=
          cardStreamState.current.velocity * cardStreamState.current.direction * dt;
        setSpeed(Math.round(cardStreamState.current.velocity));
      }

      const { position, cardLineWidth } = cardStreamState.current;
      const cw = container.offsetWidth;
      if (position < -cardLineWidth) cardStreamState.current.position = cw;
      else if (position > cw) cardStreamState.current.position = -cardLineWidth;
      cardLine.style.transform = `translateX(${cardStreamState.current.position}px)`;

      updateCardEffects();

      // Particles
      const t = now * 0.001;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i] * 0.016;
        if (positions[i * 3] > cW / 2 + 100) positions[i * 3] = -cW / 2 - 100;
        positions[i * 3 + 1] += Math.sin(t + i * 0.1) * 0.5;
        alphas[i] = Math.max(0.1, Math.min(1, alphas[i] + (Math.random() - 0.5) * 0.05));
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
      renderer.render(scene, camera);

      // Scanner particles
      ctx.clearRect(0, 0, cW, cH);
      const target = scannerState.current.isScanning ? scanMax : baseMax;
      curMax += (target - curMax) * 0.05;
      while (scannerParticles.length < Math.floor(curMax)) scannerParticles.push(mkP());
      while (scannerParticles.length > Math.ceil(curMax)) scannerParticles.pop();
      scannerParticles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0 || p.x > cW) Object.assign(p, mkP());
        ctx.globalAlpha = p.alpha * p.life;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!prefersReducedMotion) animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      cardLine.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cardLine.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      cardLine.removeEventListener('wheel', handleWheel);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [isPaused, cards, cardGap, friction, scanEffect, height]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: `${height}px` }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes glitch {
          0%, 16%, 50%, 100% { opacity: 1; }
          15%, 99% { opacity: 0.9; }
          49% { opacity: 0.8; }
        }
        .animate-glitch { animation: glitch 0.1s infinite linear alternate-reverse; }
        @keyframes scanPulse {
          0% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        .animate-scan-pulse { animation: scanPulse 1.5s infinite alternate ease-in-out; }
      `}} />

      {showSpeed && (
        <div className="absolute top-3 right-4 z-30">
          <span className="text-xs font-mono text-white/40 bg-black/40 px-3 py-1 rounded-full">
            {speed} px/s
          </span>
        </div>
      )}

      {showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30">
          <button onClick={toggleAnimation} className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all">
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={resetPosition} className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all">
            Reset
          </button>
          <button onClick={changeDirection} className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all">
            Reverse
          </button>
        </div>
      )}

      {/* Particles background */}
      <canvas
        ref={particleCanvasRef}
        className="absolute top-0 left-0 w-full pointer-events-none z-0"
        style={{ height: `${height}px` }}
      />
      {/* Scanner particles */}
      <canvas
        ref={scannerCanvasRef}
        className="absolute top-0 left-0 w-full pointer-events-none z-10"
        style={{ height: `${height}px` }}
      />

      {/* Sky-blue branded scanner line */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-0.5 pointer-events-none z-20 transition-opacity duration-300 animate-scan-pulse ${
          isScanning ? 'opacity-100' : 'opacity-25'
        }`}
        style={{
          height: `${height}px`,
          background: 'linear-gradient(to bottom, transparent 0%, #38bdf8 20%, #0ea5e9 50%, #38bdf8 80%, transparent 100%)',
          borderRadius: '9999px',
          boxShadow: '0 0 8px #38bdf8, 0 0 20px #0ea5e9, 0 0 40px #0284c7, 0 0 60px #01579b',
        }}
      />

      {/* Card stream */}
      <div className="absolute inset-0 flex items-center overflow-hidden">
        <div
          ref={cardLineRef}
          className="flex items-center whitespace-nowrap cursor-grab select-none will-change-transform"
          style={{ gap: `${cardGap}px` }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="card-wrapper relative shrink-0 rounded-xl"
              style={{ width: '400px', height: `${height}px` }}
            >
              {/* Normal image layer */}
              <div
                className="card-normal absolute inset-0 rounded-xl overflow-hidden z-[2]"
                style={{ clipPath: 'inset(0 0 0 var(--clip-right, 0%))' }}
              >
                <img
                  src={card.image}
                  alt="Competitor intelligence scan"
                  className="w-full h-full object-cover brightness-[0.65] contrast-110 saturate-[0.55]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/30 rounded-xl" />
              </div>
 
              {/* ASCII scan layer */}
              <div
                className="card-ascii absolute inset-0 rounded-xl overflow-hidden z-[1] bg-[var(--surface-base)]"
                style={{ clipPath: 'inset(0 calc(100% - var(--clip-left, 0%)) 0 0)' }}
              >
                <pre
                  className="ascii-content absolute inset-0 text-sky-300/50 font-mono text-[11px] leading-[13px] overflow-hidden whitespace-pre m-0 p-2 animate-glitch"
                  style={{
                    maskImage:
                      'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.2) 100%)',
                  }}
                >
                  {card.ascii}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { ScannerCardStream };
