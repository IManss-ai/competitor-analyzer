'use client';

import { useEffect, useRef, useCallback } from 'react';

// Module-level constants (no closure issues)
const DOT_SPACING = 28;
const BASE_RADIUS = 1;
const OPACITY_MIN = 0.12;
const OPACITY_MAX = 0.32;
const INTERACTION_RADIUS = 130;
const OPACITY_BOOST = 0.58;
const RADIUS_BOOST = 2.8;

interface Dot {
  x: number;
  y: number;
  currentOpacity: number;
  opacitySpeed: number;
  currentRadius: number;
}

interface InteractiveDotCanvasProps {
  className?: string;
}

export function InteractiveDotCanvas({ className = '' }: InteractiveDotCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  const createDots = useCallback((w: number, h: number) => {
    const dots: Dot[] = [];
    const cols = Math.ceil(w / DOT_SPACING) + 1;
    const rows = Math.ceil(h / DOT_SPACING) + 1;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const opacity = Math.random() * (OPACITY_MAX - OPACITY_MIN) + OPACITY_MIN;
        dots.push({
          x: i * DOT_SPACING + DOT_SPACING / 2,
          y: j * DOT_SPACING + DOT_SPACING / 2,
          currentOpacity: opacity,
          opacitySpeed: (Math.random() * 0.003 + 0.001) * (Math.random() < 0.5 ? 1 : -1),
          currentRadius: BASE_RADIUS,
        });
      }
    }
    dotsRef.current = dots;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateSize = () => {
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : window.innerWidth;
      const h = parent ? parent.clientHeight : window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        createDots(w, h);
      }
    };

    updateSize();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const onMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    const animate = () => {
      const { width: w, height: h } = canvas;
      const { x: mx, y: my } = mouseRef.current;

      ctx.clearRect(0, 0, w, h);

      dotsRef.current.forEach((dot) => {
        // Gentle breathing opacity
        dot.currentOpacity += dot.opacitySpeed;
        if (dot.currentOpacity >= OPACITY_MAX || dot.currentOpacity <= OPACITY_MIN) {
          dot.opacitySpeed *= -1;
          dot.currentOpacity = Math.max(OPACITY_MIN, Math.min(dot.currentOpacity, OPACITY_MAX));
        }

        let boost = 0;
        if (mx !== null && my !== null) {
          const dx = dot.x - mx;
          const dy = dot.y - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < INTERACTION_RADIUS * INTERACTION_RADIUS) {
            const t = 1 - Math.sqrt(distSq) / INTERACTION_RADIUS;
            boost = t * t;
          }
        }

        const finalOpacity = Math.min(1, dot.currentOpacity + boost * OPACITY_BOOST);
        dot.currentRadius = BASE_RADIUS + boost * RADIUS_BOOST;

        ctx.beginPath();
        ctx.fillStyle = `rgba(56,189,248,${finalOpacity.toFixed(3)})`;
        ctx.arc(dot.x, dot.y, dot.currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', updateSize);

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', updateSize);
    };
  }, [createDots]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
}
