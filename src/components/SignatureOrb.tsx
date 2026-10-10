'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Lock, FileCheck } from 'lucide-react';

export function SignatureOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = 460);
    let height = (canvas.height = 460);

    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = rect.width * dpr;
      height = canvas.height = rect.height * dpr;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Particle nodes circulating in 3D orbital space
    const particles = [
      { orbit: 0, angle: 0, speed: 0.015, color: '#39A99A', size: 4.5, label: 'Rx' },
      { orbit: 0, angle: Math.PI, speed: 0.015, color: '#DDF2E8', size: 3.5, label: 'Lab' },
      { orbit: 1, angle: Math.PI * 0.4, speed: -0.018, color: '#FCD34D', size: 4, label: 'Allergy' },
      { orbit: 1, angle: Math.PI * 1.4, speed: -0.018, color: '#39A99A', size: 3, label: 'Doc' },
      { orbit: 2, angle: Math.PI * 0.8, speed: 0.012, color: '#A7F3D0', size: 3.5, label: 'Timeline' },
      { orbit: 2, angle: Math.PI * 1.8, speed: 0.012, color: '#39A99A', size: 4, label: 'Flag' },
    ];

    let t = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const render = () => {
      t += 0.015;

      // Smooth spring towards mouse position
      currentTiltX += (targetTiltX - currentTiltX) * 0.08;
      currentTiltY += (targetTiltY - currentTiltY) * 0.08;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.32;

      ctx.save();
      ctx.translate(cx + currentTiltX * 18, cy + currentTiltY * 18);

      // 1. Ambient outer glow
      const outerGlow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.7);
      outerGlow.addColorStop(0, 'rgba(57, 169, 154, 0.25)');
      outerGlow.addColorStop(0.5, 'rgba(221, 242, 232, 0.12)');
      outerGlow.addColorStop(1, 'rgba(247, 248, 243, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2);
      ctx.fill();

      // 2. Three 3D orbital rings (ellipses tilted in 3D)
      const rings = [
        { rx: radius * 1.35, ry: radius * 0.45, rot: 0.45 + currentTiltX * 0.2 },
        { rx: radius * 1.45, ry: radius * 0.4, rot: -0.65 - currentTiltY * 0.2 },
        { rx: radius * 1.25, ry: radius * 0.55, rot: 1.25 + currentTiltX * 0.15 },
      ];

      rings.forEach((ring, idx) => {
        ctx.save();
        ctx.rotate(ring.rot);

        ctx.strokeStyle = idx === 0 ? 'rgba(57, 169, 154, 0.35)' : 'rgba(20, 56, 47, 0.18)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      });

      // 3. Central Translucent Glass Sphere
      // Base back shadow
      const sphereGradient = ctx.createRadialGradient(
        -radius * 0.3 + currentTiltX * 10,
        -radius * 0.35 + currentTiltY * 10,
        radius * 0.1,
        0,
        0,
        radius
      );
      sphereGradient.addColorStop(0, 'rgba(221, 242, 232, 0.95)');
      sphereGradient.addColorStop(0.35, 'rgba(57, 169, 154, 0.7)');
      sphereGradient.addColorStop(0.7, 'rgba(20, 56, 47, 0.85)');
      sphereGradient.addColorStop(1, 'rgba(13, 40, 33, 0.98)');

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGradient;
      ctx.shadowColor = 'rgba(20, 56, 47, 0.35)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 12;
      ctx.fill();
      ctx.shadowColor = 'transparent';

      // 4. Glowing pulsating core inside the sphere
      const pulseScale = 0.88 + Math.sin(t * 1.8) * 0.12;
      const coreGradient = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        radius * 0.55 * pulseScale
      );
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      coreGradient.addColorStop(0.3, 'rgba(221, 242, 232, 0.85)');
      coreGradient.addColorStop(0.7, 'rgba(57, 169, 154, 0.45)');
      coreGradient.addColorStop(1, 'rgba(57, 169, 154, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.55 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // 5. Specular glass reflections & fresnel highlight
      const glassHighlight = ctx.createRadialGradient(
        -radius * 0.38 + currentTiltX * 8,
        -radius * 0.42 + currentTiltY * 8,
        2,
        -radius * 0.35,
        -radius * 0.4,
        radius * 0.65
      );
      glassHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      glassHighlight.addColorStop(0.4, 'rgba(255, 255, 255, 0.25)');
      glassHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.ellipse(
        -radius * 0.32 + currentTiltX * 8,
        -radius * 0.36 + currentTiltY * 8,
        radius * 0.5,
        radius * 0.32,
        Math.PI * 0.2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = glassHighlight;
      ctx.fill();

      // Thin rim light
      ctx.beginPath();
      ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(221, 242, 232, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 6. Orbiting particles and data nodes
      particles.forEach((p) => {
        p.angle += p.speed;
        const ring = rings[p.orbit];

        // 3D coordinates on the rotated ellipse
        const cosA = Math.cos(p.angle);
        const sinA = Math.sin(p.angle);
        const ex = cosA * ring.rx;
        const ey = sinA * ring.ry;

        // Apply rotation of the ring
        const cosR = Math.cos(ring.rot);
        const sinR = Math.sin(ring.rot);
        const px = ex * cosR - ey * sinR;
        const py = ex * sinR + ey * cosR;

        // Depth perspective (z determines opacity and size)
        const z = -sinA;
        const depthAlpha = z > 0 ? 0.95 : 0.45;
        const depthScale = z > 0 ? 1.2 : 0.85;

        // Node glow
        ctx.beginPath();
        ctx.arc(px, py, p.size * depthScale * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57, 169, 154, ${0.25 * depthAlpha})`;
        ctx.fill();

        // Node center
        ctx.beginPath();
        ctx.arc(px, py, p.size * depthScale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Connect particle to center if in front
        if (z > 0.3) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(px, py);
          ctx.strokeStyle = `rgba(57, 169, 154, ${0.15 * z})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      targetTiltX = Math.max(-1, Math.min(1, x));
      targetTiltY = Math.max(-1, Math.min(1, y));
      setMousePos({ x: targetTiltX, y: targetTiltY });
    };

    const handleMouseLeave = () => {
      targetTiltX = 0;
      targetTiltY = 0;
      setMousePos({ x: 0, y: 0 });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateSize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative flex items-center justify-center select-none"
    >
      {/* 3D Canvas Sphere */}
      <canvas
        ref={canvasRef}
        className="w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] max-w-full cursor-grab active:cursor-grabbing transition-transform duration-500 ease-out"
        style={{
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      />

      {/* Floating Glass Badges */}
      <div
        className="absolute -top-2 -left-4 sm:left-2 flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-105"
        style={{ transform: `translate(${mousePos.x * -6}px, ${mousePos.y * -6}px)` }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#ddf2e8] text-[#14382f]">
          <Lock className="h-3.5 w-3.5 text-[#2b8a7e]" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-bold text-[#14382f] uppercase tracking-wider">AES-256-GCM</p>
          <p className="text-[9px] text-[#6e7771]">Key in #fragment only</p>
        </div>
      </div>

      <div
        className="absolute bottom-4 -right-2 sm:right-4 flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-md transition-all duration-300 hover:scale-105"
        style={{ transform: `translate(${mousePos.x * 6}px, ${mousePos.y * 6}px)` }}
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#14382f] text-[#39A99A]">
          <FileCheck className="h-3.5 w-3.5 text-[#3eb4a4]" />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-bold text-[#14382f] uppercase tracking-wider">Provenance</p>
          <p className="text-[9px] text-[#6e7771]">Verbatim document citations</p>
        </div>
      </div>

      <div
        className="absolute -bottom-3 left-6 sm:left-12 flex items-center gap-1.5 rounded-full border border-[#2b8a7e]/30 bg-[#14382f] px-3 py-1 text-white shadow-md backdrop-blur-md text-[11px]"
      >
        <span className="h-2 w-2 rounded-full bg-[#39b5a4] animate-pulse" />
        <span className="font-semibold text-[#ddf2e8]">Zero-Knowledge Server</span>
      </div>
    </div>
  );
}
