"use client";

import { useEffect, useRef } from "react";
import { isMobileMotionViewport } from "@/lib/motion";
import { masterTimeline, MasterPhase } from "@/animations/masterTimeline";

const colors = ["#7c2948", "#b67965", "#d1a56a", "#f4e8d6", "#9db3cb", "#c9a86c", "#e8c9a0"];

type ParticleKind = "bubble" | "leaf" | "petal" | "mote" | "star" | "ring";

type DustParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  sway: number;
  swaySpeed: number;
  color: string;
  alpha: number;
  kind: ParticleKind;
  rotation: number;
  spin: number;
  burst?: boolean;
  bornAt?: number;
};

function particleBaseSize(width: number, mobile: boolean) {
  const desktop = Math.min(13.5, Math.max(5.2, width / 132));
  return mobile ? Math.min(18.5, Math.max(8, width / 86)) : desktop;
}

function pickKind(index: number): ParticleKind {
  const kinds: ParticleKind[] = [
    "bubble",
    "leaf",
    "petal",
    "mote",
    "star",
    "ring",
    "bubble",
    "leaf",
  ];
  return kinds[index % kinds.length];
}

function createDust(
  width: number,
  height: number,
  index: number,
  mobile: boolean,
  y?: number,
): DustParticle {
  const base = particleBaseSize(width, mobile);
  const kind = pickKind(index);
  const sizeScale =
    kind === "bubble" || kind === "ring"
      ? 1.28 + Math.random() * 0.68
      : kind === "star"
        ? 1.02 + Math.random() * 0.6
        : 0.9 + Math.random() * 0.78;

  return {
    x: Math.random() * width,
    y: y ?? Math.random() * height,
    vx: -0.1 + Math.random() * 0.2,
    vy: 0.18 + Math.random() * 0.28,
    size: base * sizeScale,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.005 + Math.random() * 0.009,
    color: colors[index % colors.length],
    alpha: mobile ? 0.42 + Math.random() * 0.36 : 0.22 + Math.random() * 0.28,
    kind,
    rotation: Math.random() * Math.PI * 2,
    spin: -0.025 + Math.random() * 0.05,
  };
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: DustParticle,
  intensity: number,
  mobile = false,
) {
  const boost = mobile ? 1.28 : 1;
  const alpha = Math.min(1, particle.alpha * intensity * boost);
  context.save();
  context.translate(particle.x, particle.y);
  context.rotate(particle.rotation);
  context.globalAlpha = alpha;

  switch (particle.kind) {
    case "bubble": {
      const radius = particle.size * 0.52;
      const glow = context.createRadialGradient(
        -radius * 0.25,
        -radius * 0.3,
        0,
        0,
        0,
        radius,
      );
      glow.addColorStop(0, "rgba(255, 255, 255, 0.72)");
      glow.addColorStop(0.35, `${particle.color}${mobile ? "cc" : "66"}`);
      glow.addColorStop(1, `${particle.color}${mobile ? "22" : "00"}`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(255, 255, 255, ${(mobile ? 0.42 : 0.28) * alpha})`;
      context.lineWidth = Math.max(mobile ? 0.75 : 0.45, radius * (mobile ? 0.12 : 0.08));
      context.stroke();
      break;
    }
    case "leaf": {
      context.fillStyle = mobile ? `${particle.color}ee` : particle.color;
      context.beginPath();
      context.moveTo(0, -particle.size * 0.55);
      context.bezierCurveTo(
        particle.size * 0.42,
        -particle.size * 0.2,
        particle.size * 0.34,
        particle.size * 0.48,
        0,
        particle.size * 0.52,
      );
      context.bezierCurveTo(
        -particle.size * 0.34,
        particle.size * 0.48,
        -particle.size * 0.42,
        -particle.size * 0.2,
        0,
        -particle.size * 0.55,
      );
      context.fill();
      context.strokeStyle = `rgba(255, 255, 255, ${(mobile ? 0.32 : 0.18) * alpha})`;
      context.lineWidth = mobile ? 0.65 : 0.45;
      context.stroke();
      break;
    }
    case "petal": {
      context.fillStyle = `${particle.color}${mobile ? "ee" : "cc"}`;
      context.beginPath();
      context.ellipse(0, 0, particle.size * 0.22, particle.size * 0.46, 0, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.ellipse(
        particle.size * 0.18,
        particle.size * 0.08,
        particle.size * 0.16,
        particle.size * 0.34,
        0.55,
        0,
        Math.PI * 2,
      );
      context.fill();
      break;
    }
    case "star": {
      const outer = particle.size * 0.42;
      const inner = outer * 0.42;
      context.fillStyle = `${particle.color}${mobile ? "ff" : "dd"}`;
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
      break;
    }
    case "ring": {
      const radius = particle.size * 0.46;
      context.strokeStyle = `${particle.color}${mobile ? "ee" : "bb"}`;
      context.lineWidth = Math.max(mobile ? 0.85 : 0.5, radius * (mobile ? 0.18 : 0.14));
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(255, 255, 255, ${0.22 * alpha})`;
      context.lineWidth = Math.max(0.35, radius * 0.08);
      context.beginPath();
      context.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
      context.stroke();
      break;
    }
    default: {
      const radius = particle.size * 0.34;
      const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      glow.addColorStop(0, `${particle.color}${mobile ? "ff" : "dd"}`);
      glow.addColorStop(1, `${particle.color}${mobile ? "33" : "00"}`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      break;
    }
  }

  context.restore();
}

type FlowingParticlesProps = {
  /** Full-viewport fixed layer for the main invitation (mobile). */
  variant?: "section" | "viewport";
  className?: string;
};

/**
 * Falling dust across the invitation — fixed viewport canvas; ambient particles
 * respawn at the top when they exit; tap bursts are removed once off-screen.
 */
export default function FlowingParticles({
  variant = "section",
  className = "flowing-particles",
}: FlowingParticlesProps) {
  const rootRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = rootRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const isViewport = variant === "viewport";
    const mobile = isMobileMotionViewport();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const particleCount = isViewport
      ? mobile
        ? Math.min(98, Math.round(window.innerWidth / 13))
        : Math.min(84, Math.round(window.innerWidth / 18))
      : mobile
        ? 64
        : 52;

    let width = 0;
    let height = 0;
    let particles: DustParticle[] = [];
    let frame = 0;
    let previous = performance.now();
    let paused = document.hidden;
    let visible = true;
    let context: CanvasRenderingContext2D | null = null;
    const burstReserve = mobile ? 48 : 40;
    const softCap = particleCount + burstReserve;
    const maxParticles = particleCount + burstReserve + (mobile ? 36 : 28);
    let lastBurstPrune = performance.now();

    const removeOldestBurst = () => {
      let oldestIndex = -1;
      let oldestAt = Infinity;
      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];
        if (!particle.burst) continue;
        const bornAt = particle.bornAt ?? 0;
        if (bornAt < oldestAt) {
          oldestAt = bornAt;
          oldestIndex = index;
        }
      }
      if (oldestIndex < 0) return false;
      particles.splice(oldestIndex, 1);
      return true;
    };

    const removeNearestParticle = (tapX: number, tapY: number, keepMinimum: number) => {
      if (particles.length <= keepMinimum) return false;
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      for (let index = 0; index < particles.length; index += 1) {
        const distance = Math.hypot(tapX - particles[index].x, tapY - particles[index].y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
      if (nearestIndex < 0) return false;
      particles.splice(nearestIndex, 1);
      return true;
    };

    const trimToTarget = (
      targetLength: number,
      tapX?: number,
      tapY?: number,
    ) => {
      while (particles.length > targetLength) {
        if (removeOldestBurst()) continue;
        if (
          tapX !== undefined &&
          tapY !== undefined &&
          removeNearestParticle(tapX, tapY, particleCount)
        ) {
          continue;
        }
        if (particles.length > particleCount) {
          particles.pop();
          continue;
        }
        break;
      }
    };

    const pruneBurstParticles = (count: number) => {
      for (let removed = 0; removed < count; removed += 1) {
        if (!removeOldestBurst()) break;
      }
    };

    const makeBurstSource = (
      tapX: number,
      tapY: number,
      seed?: DustParticle,
    ): DustParticle => {
      if (seed) return seed;
      return createDust(width, height, particles.length, mobile, tapY);
    };

    const resize = () => {
      if (isViewport) {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        const bounds = canvas.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
      }
      if (!width || !height) return;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context = canvas.getContext("2d", { alpha: true });
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({ length: particleCount }, (_, index) =>
        createDust(width, height, index, mobile),
      );
    };

    const isInvitationActive = () =>
      masterTimeline.getPhase() >= MasterPhase.InvitationEntrance;

    const scrollIntensity = () => {
      const mode = masterTimeline.getDecorativeParticleMode();
      if (mode === "reduced") return mobile ? 0.9 : 0.65;
      return 1;
    };

    const shouldAnimate = () => {
      if (paused || !visible) return false;
      return isInvitationActive();
    };

    const schedule = () => {
      if (!shouldAnimate()) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      paused = document.hidden;
      schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const unsubscribePhase = masterTimeline.subscribe(() => schedule());

    let observer: IntersectionObserver | undefined;
    if (!isViewport) {
      observer = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          schedule();
        },
        { threshold: 0, rootMargin: "64px 0px" },
      );
      observer.observe(canvas);
    }

    const resizeObserver = isViewport ? null : new ResizeObserver(resize);
    if (!isViewport) resizeObserver?.observe(canvas);
    if (isViewport) window.addEventListener("resize", resize);
    resize();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("a, button, input, textarea, select, label")
      ) {
        return;
      }
      if (!isInvitationActive()) return;

      let tapX = event.clientX;
      let tapY = event.clientY;
      if (!isViewport) {
        const bounds = canvas.getBoundingClientRect();
        tapX = event.clientX - bounds.left;
        tapY = event.clientY - bounds.top;
      }

      let closest: DustParticle | undefined;
      let closestDistance = Infinity;
      for (const particle of particles) {
        const distance = Math.hypot(tapX - particle.x, tapY - particle.y);
        const hitRadius = Math.max(22, particle.size * 2.6);
        if (distance <= hitRadius && distance < closestDistance) {
          closest = particle;
          closestDistance = distance;
        }
      }

      const burstCount = 10 + Math.floor(Math.random() * 10);
      trimToTarget(Math.max(particleCount, maxParticles - burstCount), tapX, tapY);

      const source = makeBurstSource(tapX, tapY, closest);
      source.x = closest?.x ?? tapX;
      source.y = closest?.y ?? tapY;
      const bornAt = performance.now();

      for (let index = 0; index < burstCount; index += 1) {
        const angle =
          (Math.PI * 2 * index) / burstCount + Math.random() * 0.45;
        const speed = 0.35 + Math.random() * 0.55;
        particles.push({
          x: source.x + (Math.random() - 0.5) * 8,
          y: source.y + (Math.random() - 0.5) * 8,
          vx: source.vx + Math.cos(angle) * speed,
          vy: source.vy + Math.sin(angle) * speed * 0.55,
          size: source.size * (0.82 + Math.random() * 0.38),
          sway: source.sway + index * 0.3,
          swaySpeed: source.swaySpeed * (0.8 + Math.random() * 0.45),
          color: source.color,
          alpha: source.alpha,
          kind: source.kind,
          rotation: source.rotation + index * 0.25,
          spin: source.spin,
          burst: true,
          bornAt,
        });
      }
      schedule();
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });

    const draw = (now: number) => {
      frame = 0;
      if (!shouldAnimate() || !context) return;

      const dt = Math.min(0.05, Math.max(0.001, (now - previous) / 1000));
      previous = now;
      const intensity = scrollIntensity();

      if (now - lastBurstPrune > 1600 && particles.length > softCap) {
        pruneBurstParticles(Math.min(8, particles.length - softCap));
        lastBurstPrune = now;
      }

      context.clearRect(0, 0, width, height);
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.sway += particle.swaySpeed * dt * 60;
        particle.rotation += particle.spin * dt * 60;
        particle.x += (particle.vx + Math.sin(particle.sway) * 0.14) * dt * 60;
        particle.y += particle.vy * dt * 60;

        const margin = particle.size;
        const offScreen =
          particle.y > height + margin ||
          particle.y < -margin ||
          particle.x < -margin ||
          particle.x > width + margin;

        if (offScreen) {
          if (particle.burst) {
            particles.splice(index, 1);
          } else {
            particles[index] = createDust(width, height, index, mobile, -particle.size);
          }
          continue;
        }

        drawParticle(context, particle, intensity, mobile);
      }
      context.globalAlpha = 1;
      schedule();
    };

    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribePhase();
      observer?.disconnect();
      resizeObserver?.disconnect();
      if (isViewport) window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [variant]);

  return (
    <canvas
      ref={rootRef}
      className={className}
      aria-hidden="true"
    />
  );
}
