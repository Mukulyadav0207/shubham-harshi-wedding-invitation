"use client";

import { useEffect, useRef } from "react";
import { isMobileMotionViewport } from "@/lib/motion";
import styles from "./InvitationHero.module.css";

const CELEBRATION_COLORS = [
  "#ffffff",
  "#f5f8fc",
  "#dceef8",
  "#b8daf0",
  "#9db3cb",
  "#7c2948",
  "#d1a56a",
  "#f4e8d6",
  "#b67965",
] as const;

/** Delay before round 1 begins (after scratch reveal). */
const SEQUENCE_DELAY_MS = 320;
/** Pause between round 1 and round 2 (both sides fire together each round). */
const ROUND_GAP_MS = 3000;

type ConfettiKind = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type ConfettiSide = "left" | "right";
type ConfettiRound = 0 | 1;

type ConfettiParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  gravity: number;
  size: number;
  color: string;
  kind: ConfettiKind;
  alive: boolean;
};

function drawConfettiPiece(
  context: CanvasRenderingContext2D,
  kind: ConfettiKind,
  size: number,
  color: string,
  mobile: boolean,
) {
  const stripWidth = mobile ? size * 0.62 : size * 0.8;
  const ribbonWidth = mobile ? size * 0.18 : size * 0.2;

  context.fillStyle = color;
  if (kind === 1) {
    context.strokeStyle = color;
    context.lineWidth = Math.max(0.8, size * 0.22);
    context.beginPath();
    context.arc(0, 0, size * 0.78, 0.2, Math.PI * 1.48);
    context.stroke();
    return;
  }
  if (kind === 2) {
    const square = size * 0.76;
    context.fillRect(-square * 0.5, -square * 0.5, square, square);
    return;
  }
  if (kind === 3) {
    const w = mobile ? size * 0.56 : size * 0.62;
    context.beginPath();
    context.ellipse(0, 0, w, size * 0.34, 0, 0, Math.PI * 2);
    context.fill();
    return;
  }
  if (kind === 4) {
    const outer = size * 0.44;
    const inner = outer * 0.4;
    context.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    return;
  }
  if (kind === 5) {
    context.fillRect(-ribbonWidth * 0.5, -size * 0.82, ribbonWidth, size * 1.64);
    return;
  }
  if (kind === 6) {
    context.strokeStyle = color;
    context.lineWidth = Math.max(0.7, size * 0.16);
    context.beginPath();
    context.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    context.stroke();
    return;
  }
  context.fillRect(-stripWidth * 0.5, -size * 0.72, stripWidth, size * 1.44);
}

function pickConfettiKind(index: number): ConfettiKind {
  const kinds: ConfettiKind[] = [0, 0, 1, 2, 3, 4, 5, 6, 0, 3, 5, 2];
  return kinds[index % kinds.length];
}

function createCannonParticles(
  particles: ConfettiParticle[],
  width: number,
  height: number,
  side: ConfettiSide,
  mobile: boolean,
  round: ConfettiRound,
) {
  const count = mobile
    ? 58 + Math.floor(Math.random() * 28)
    : 145 + Math.floor(Math.random() * 55);
  const cannonX = side === "left" ? width * 0.06 : width * 0.94;
  const cannonY = height * 0.76;
  const sideSeed = side === "left" ? 0 : 1;

  for (let index = 0; index < count; index += 1) {
    const spread = (Math.random() - 0.5) * 0.28;
    const lateral = side === "left" ? 0.32 + spread : -(0.32 + spread);
    const upward = -(1.12 + Math.random() * 0.38);
    const direction = Math.hypot(lateral, upward) || 1;
    const speed = (mobile ? 480 : 580) + Math.random() * (mobile ? 300 : 400);
    const large = index % 11 === 0;

    particles.push({
      x: cannonX + (Math.random() - 0.5) * 16,
      y: cannonY + (Math.random() - 0.5) * 8,
      vx: (lateral / direction) * speed,
      vy: (upward / direction) * speed,
      rotation: Math.random() * Math.PI * 2,
      spin: -6 + Math.random() * 12,
      gravity: 620 + Math.random() * 150,
      size: mobile
        ? 5.8 + Math.random() * (large ? 10 : 7.6)
        : 4.8 + Math.random() * (large ? 9.2 : 6.8),
      color:
        CELEBRATION_COLORS[
          (index + sideSeed * 4 + round * 3) % CELEBRATION_COLORS.length
        ],
      kind: pickConfettiKind(index + sideSeed * 7 + round * 5),
      alive: true,
    });
  }
}

type CelebrationConfettiProps = {
  active: boolean;
  /** Called once per round when both cannons burst (pop + applause on round 0). */
  onShotFired: (round: ConfettiRound) => void;
  onSequenceComplete?: () => void;
};

/** Two dual-cannon rounds: left + right together, second round after 3s. */
export default function CelebrationConfetti({
  active,
  onShotFired,
  onSequenceComplete,
}: CelebrationConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onShotFiredRef = useRef(onShotFired);
  const onSequenceCompleteRef = useRef(onSequenceComplete);

  useEffect(() => {
    onShotFiredRef.current = onShotFired;
  }, [onShotFired]);

  useEffect(() => {
    onSequenceCompleteRef.current = onSequenceComplete;
  }, [onSequenceComplete]);

  useEffect(() => {
    if (!active) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return undefined;

    const mobile = isMobileMotionViewport();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 2 : 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const particles: ConfettiParticle[] = [];
    const sequenceStart = performance.now();
    const round0At = sequenceStart + SEQUENCE_DELAY_MS;
    const round1At = round0At + ROUND_GAP_MS;
    let round0Fired = false;
    let round1Fired = false;
    let frame = 0;
    let previous = sequenceStart;
    let running = true;

    const fireConfettiShot = (round: ConfettiRound) => {
      createCannonParticles(particles, width, height, "left", mobile, round);
      createCannonParticles(particles, width, height, "right", mobile, round);
      onShotFiredRef.current(round);
    };

    const step = (now: number) => {
      if (!running) return;

      const dt = Math.min(0.033, Math.max(0.001, (now - previous) / 1000));
      previous = now;

      if (!round0Fired && now >= round0At) {
        fireConfettiShot(0);
        round0Fired = true;
      }
      if (!round1Fired && now >= round1At) {
        fireConfettiShot(1);
        round1Fired = true;
      }

      context.clearRect(0, 0, width, height);
      let aliveCount = 0;

      for (const particle of particles) {
        if (!particle.alive) continue;

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += particle.gravity * dt;
        particle.rotation += particle.spin * dt;
        particle.vx *= 1 - 0.12 * dt;

        if (particle.y > height + particle.size * 3) {
          particle.alive = false;
          continue;
        }

        aliveCount += 1;
        context.save();
        context.globalAlpha = mobile ? 1 : 0.95;
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        drawConfettiPiece(context, particle.kind, particle.size, particle.color, mobile);
        context.restore();
      }

      if (aliveCount > 0 || !round1Fired) {
        frame = window.requestAnimationFrame(step);
        return;
      }

      running = false;
      context.clearRect(0, 0, width, height);
      canvas.width = 0;
      canvas.height = 0;
      onSequenceCompleteRef.current?.();
    };

    frame = window.requestAnimationFrame(step);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      particles.length = 0;
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.celebrationCanvasFront}
      aria-hidden="true"
      hidden={!active}
    />
  );
}
