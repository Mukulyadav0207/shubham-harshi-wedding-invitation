"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import EventSchedule from "./EventSchedule";
import InvitationFooter from "./InvitationFooter";
import InvitationNav from "./InvitationNav";
import FlowingParticles from "./FlowingParticles";
import CelebrationConfetti from "./CelebrationConfetti";
import VenueSection from "./VenueSection";
import { venues } from "./venueData";
import {
  ClosingSection,
  FamilyLoveSection,
  // StoryMomentsSection,
} from "./InvitationClosingSections";
import { isMobileMotionViewport, MOBILE_MOTION_QUERY } from "@/lib/motion";
import { unlockAudioOnUserGesture, acquireApplauseAudio, acquirePopAudio } from "@/audio/criticalAudio";
import { masterTimeline, MasterPhase } from "@/animations/masterTimeline";
import { initScrollActivity } from "@/lib/scrollActivity";
import { getPageScrollBounceProgress } from "@/lib/ballBounce";
import { useBallBounce } from "@/hooks/useBallBounce";
import { WEDDING_HASHTAG } from "./weddingContent";
import GaneshaIntro from "../ganesha/GaneshaIntro";
import styles from "./InvitationHero.module.css";

export const INVITE_LOGO_ELEMENT_ID = "invite-logo";
export const INVITE_HERO_SECTION_ID = "home";
export const INVITATION_CARD_ELEMENT_ID = "invitation-card";

/** Align invite hero (logo + hashtag) with natural top padding — not flush to viewport. */
export function scrollToInviteHeroPresentation(
  behavior: ScrollBehavior = "smooth",
) {
  const hero = document.getElementById(INVITE_HERO_SECTION_ID);
  if (hero) {
    hero.scrollIntoView({ behavior, block: "start" });
    return;
  }
  document.getElementById(INVITE_LOGO_ELEMENT_ID)?.scrollIntoView({
    behavior,
    block: "start",
  });
}

export type InvitationAudioZone = "spiritual" | "invitation";

const WEDDING_DATE = new Date(2026, 10, 21, 0, 0, 0);
const WEDDING_DATE_DISPLAY = "21 Nov, 2026";
const WEDDING_DAY_NAME = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
}).format(WEDDING_DATE);
const revealThreshold = 0.3;
const COMPLETE_FADE_MS = 280;
const REVEAL_FOCUS_DELAY_MS = COMPLETE_FADE_MS + 320;
const REVEAL_SCROLL_HINT_DELAY_MS = REVEAL_FOCUS_DELAY_MS + 820;
const REVEAL_HINT_SCROLL_GRACE_MS = 480;
const AMBIENT_COLORS = ["#7c2948", "#b67965", "#d1a56a", "#f4e8d6", "#9db3cb"];

const getHeroLogoScrollProgress = () => {
  const distance = Math.min(window.innerHeight * 0.56, 580);
  return getPageScrollBounceProgress(distance);
};

type ScrollHintPhase = "hidden" | "hero" | "revealed";

function scrollToRevealMoment(
  visual: HTMLElement | null,
  countdown: HTMLElement | null,
) {
  if (!visual && !countdown) return;

  const visualRect = visual?.getBoundingClientRect();
  const countdownRect = countdown?.getBoundingClientRect();
  const top = visualRect?.top ?? countdownRect!.top;
  const bottom = countdownRect?.bottom ?? visualRect!.bottom;
  const focusCenter = (top + bottom) / 2;
  const targetY = window.scrollY + focusCenter - window.innerHeight * 0.44;

  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: "smooth",
  });
}

function playSoundEffect(audio: HTMLAudioElement | null, volume: number) {
  if (!audio) return;
  const targetVolume = Math.max(0, Math.min(volume, 1));
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0;
  void audio
    .play()
    .then(() => {
      const startedAt = performance.now();
      const fadeIn = (now: number) => {
        const progress = Math.max(0, Math.min((now - startedAt) / 140, 1));
        audio.volume = targetVolume * progress;
        if (progress < 1 && !audio.paused) {
          window.requestAnimationFrame(fadeIn);
        }
      };
      window.requestAnimationFrame(fadeIn);
    })
    .catch(() => undefined);
}

function playPopSound(audio: HTMLAudioElement | null) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  audio.volume = 1;
  void audio.play().catch(() => undefined);
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + seed * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function measureScratchProgress(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
) {
  const { width, height } = canvas;
  if (!width || !height) return 0;
  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 28));
  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  let transparent = 0;
  let total = 0;
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      // The card is visibly an arched door, not a rectangle. Ignore its
      // CSS-clipped top corners so users are never asked to scratch pixels
      // they cannot touch.
      const horizontal = x / width - 0.5;
      const vertical = y / height;
      const insideArch =
        vertical >= 0.22 ||
        (horizontal * horizontal) / 0.25 +
          ((vertical - 0.22) * (vertical - 0.22)) / 0.0484 <=
          1;
      if (!insideArch) continue;
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 48) transparent += 1;
      total += 1;
    }
  }
  return total ? transparent / total : 0;
}

function eraseScratchStroke(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number } | null,
  to: { x: number; y: number },
  brush = 20,
) {
  // The canvas context is already scaled to the device pixel ratio. Drawing
  // in CSS pixels keeps the erased mark directly under the user's finger.
  context.save();
  context.globalCompositeOperation = "destination-out";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = brush * 2;
  context.beginPath();
  if (from) {
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
  } else {
    context.moveTo(to.x, to.y);
  }
  context.stroke();
  context.beginPath();
  context.arc(to.x, to.y, brush, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

const SCRATCH_SCRIPT_FONT = '"Great Vibes", "Brush Script MT", cursive';
const SCRATCH_SERIF_FONT = '"Playfair Display", Georgia, "Times New Roman", serif';
const SCRATCH_INK = "#2a4258";
const SCRATCH_INK_SOFT = "#3d5f7a";
const SCRATCH_INK_MUTED = "#4a647c";

function drawHeartFlourish(
  context: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  span: number,
  color: string,
) {
  const heartSize = Math.max(7, span * 0.085);

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(0.55, span * 0.0055);
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(centerX - span * 0.46, y);
  context.bezierCurveTo(
    centerX - span * 0.32,
    y - span * 0.035,
    centerX - span * 0.18,
    y + span * 0.028,
    centerX - heartSize * 1.35,
    y,
  );
  context.stroke();

  context.beginPath();
  context.moveTo(centerX + span * 0.46, y);
  context.bezierCurveTo(
    centerX + span * 0.32,
    y - span * 0.035,
    centerX + span * 0.18,
    y + span * 0.028,
    centerX + heartSize * 1.35,
    y,
  );
  context.stroke();

  context.font = `400 ${heartSize * 1.7}px ${SCRATCH_SERIF_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("♡", centerX, y + heartSize * 0.04);
  context.restore();
}

function drawHeartDivider(
  context: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  span: number,
  color: string,
) {
  const lineWidth = span * 0.3;
  const heartSize = Math.max(5.5, span * 0.055);

  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(0.5, span * 0.0045);
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(centerX - lineWidth, y);
  context.lineTo(centerX - heartSize * 1.1, y);
  context.stroke();

  context.beginPath();
  context.moveTo(centerX + lineWidth, y);
  context.lineTo(centerX + heartSize * 1.1, y);
  context.stroke();

  context.fillStyle = color;
  context.font = `400 ${heartSize * 1.5}px ${SCRATCH_SERIF_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("♡", centerX, y + heartSize * 0.05);
  context.restore();
}

function drawRevealBrushStroke(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) {
  context.save();
  context.fillStyle = "rgba(232, 198, 210, 0.58)";
  context.beginPath();
  context.ellipse(centerX, centerY, width / 2, height / 2, -0.06, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(255, 244, 248, 0.22)";
  context.beginPath();
  context.ellipse(
    centerX - width * 0.08,
    centerY - height * 0.18,
    width * 0.28,
    height * 0.22,
    -0.2,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.restore();
}

async function drawScratchPrompt(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const centerX = width / 2;
  const span = width * 0.9;
  const introSize = Math.max(8.5, Math.min(width * 0.054, 11.5));
  const scriptSize = Math.max(34, Math.min(width * 0.24, 50));
  const capsSize = Math.max(9.5, Math.min(width * 0.062, 13.5));
  const hintSize = Math.max(7, Math.min(width * 0.05, 9.5));

  if (document.fonts) {
    await Promise.all([
      document.fonts.load(`italic 500 ${introSize}px ${SCRATCH_SERIF_FONT}`),
      document.fonts.load(`400 ${scriptSize}px ${SCRATCH_SCRIPT_FONT}`),
      document.fonts.load(`700 ${capsSize}px ${SCRATCH_SERIF_FONT}`),
      document.fonts.load(`500 ${hintSize}px ${SCRATCH_SERIF_FONT}`),
    ]);
  }

  const textShift = 3;
  const flourishY = height * 0.14 + textShift;
  const introY = height * 0.2 + textShift;
  const dividerY = height * 0.25 + textShift;
  const scratchY = height * 0.41 + textShift;
  const revealY = height * 0.53 + textShift;
  const hintY = height * 0.78 + textShift;

  context.save();
  context.shadowColor = "rgba(255, 250, 246, 0.82)";
  context.shadowBlur = 2;
  context.textAlign = "center";
  context.textBaseline = "middle";

  drawHeartFlourish(context, centerX, flourishY, span, SCRATCH_INK_MUTED);

  context.fillStyle = SCRATCH_INK_SOFT;
  context.font = `italic 500 ${introSize}px ${SCRATCH_SERIF_FONT}`;
  context.letterSpacing = "0.03em";
  context.fillText("A little surprise awaits...", centerX, introY);

  drawHeartDivider(context, centerX, dividerY, span, SCRATCH_INK_MUTED);

  context.fillStyle = SCRATCH_INK;
  context.font = `400 ${scriptSize}px ${SCRATCH_SCRIPT_FONT}`;
  context.letterSpacing = "0.02em";
  context.shadowBlur = 2.5;
  const scratchText = "Scratch";
  const scratchMetrics = context.measureText(scratchText);
  const scratchOffset =
    (scratchMetrics.actualBoundingBoxLeft - scratchMetrics.actualBoundingBoxRight) /
    2;
  context.fillText(scratchText, centerX + scratchOffset, scratchY);

  drawRevealBrushStroke(
    context,
    centerX,
    revealY,
    span * 0.54,
    Math.max(12, height * 0.056),
  );

  context.fillStyle = SCRATCH_INK;
  context.font = `700 ${capsSize}px ${SCRATCH_SERIF_FONT}`;
  context.letterSpacing = "0.22em";
  context.fillText("TO REVEAL", centerX, revealY);

  context.fillStyle = SCRATCH_INK_MUTED;
  context.font = `500 ${hintSize}px ${SCRATCH_SERIF_FONT}`;
  context.letterSpacing = "0.06em";
  context.shadowBlur = 1.5;
  context.fillText("✦  Gently scratch here  ✦", centerX, hintY);

  context.restore();
}

type Countdown = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  complete: boolean;
};

function getCountdown(): Countdown {
  const remaining = Math.max(0, WEDDING_DATE.getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    complete: remaining === 0,
  };
}

function subscribeMobileMotion(onStoreChange: () => void) {
  const media = window.matchMedia(MOBILE_MOTION_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

export default function InvitationHero({
  cinematic = false,
  muted = false,
  showSpiritual = true,
  onMantraStart,
  onAudioZoneChange,
  onSpiritualFinished,
}: {
  cinematic?: boolean;
  muted?: boolean;
  showSpiritual?: boolean;
  onMantraStart?: () => void;
  onAudioZoneChange?: (zone: InvitationAudioZone) => void;
  onSpiritualFinished?: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [scratching, setScratching] = useState(false);
  const [scrollHintPhase, setScrollHintPhase] = useState<ScrollHintPhase>(
    "hidden",
  );
  const invitationRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spiritualRef = useRef<HTMLDivElement>(null);
  const logoButtonRef = useRef<HTMLButtonElement>(null);
  const logoMotionRef = useRef<HTMLSpanElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const coatingReady = useRef(false);
  const scratchProgress = useRef(0);
  const strokesSinceMeasurement = useRef(0);
  const popAudioRef = useRef<HTMLAudioElement | null>(null);
  const applauseAudioRef = useRef<HTMLAudioElement | null>(null);
  const applausePlayed = useRef(false);
  const playedCelebrationShots = useRef(new Set<number>());
  const mutedRef = useRef(muted);
  const mobileMotion = useSyncExternalStore(
    subscribeMobileMotion,
    () => isMobileMotionViewport(),
    () => false,
  );

  const {
    playBounce: playLogoBounce,
    settled: logoScrollSettled,
    animating: logoAnimating,
  } = useBallBounce(logoMotionRef, {
    enabled: !cinematic,
    getScrollProgress: () => getHeroLogoScrollProgress(),
  });

  useEffect(() => {
    if (cinematic) return;
    initScrollActivity();
  }, [cinematic]);

  useEffect(() => {
    if (cinematic || !onAudioZoneChange) return undefined;
    if (!showSpiritual) {
      onAudioZoneChange("invitation");
      return undefined;
    }
    const spiritual = spiritualRef.current;
    const logo = logoButtonRef.current;
    if (!spiritual || !logo) return undefined;

    let spiritualRatio = 0;
    let logoRatio = 0;

    const publishZone = () => {
      if (logoRatio >= 0.22) {
        onAudioZoneChange("invitation");
        return;
      }
      if (spiritualRatio >= 0.08) {
        onAudioZoneChange("spiritual");
        return;
      }
      const spiritualBottom = spiritual.getBoundingClientRect().bottom;
      if (spiritualBottom < window.innerHeight * 0.12) {
        onAudioZoneChange("invitation");
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === spiritual) spiritualRatio = entry.intersectionRatio;
          if (entry.target === logo) logoRatio = entry.intersectionRatio;
        }
        publishZone();
      },
      { threshold: [0, 0.08, 0.2, 0.35, 0.55, 0.75, 1] },
    );

    observer.observe(spiritual);
    observer.observe(logo);
    publishZone();
    return () => observer.disconnect();
  }, [cinematic, onAudioZoneChange, showSpiritual]);

  useEffect(() => {
    if (cinematic || !revealed) return;
    masterTimeline.setPhase(MasterPhase.Confetti);
  }, [cinematic, revealed]);

  const handleConfettiShot = useCallback(
    (shot: 0 | 1) => {
      if (cinematic || mutedRef.current) return;
      if (!playedCelebrationShots.current.has(shot)) {
        playedCelebrationShots.current.add(shot);
        playPopSound(popAudioRef.current);
      }
      if (shot === 0 && !applausePlayed.current) {
        applausePlayed.current = true;
        playSoundEffect(applauseAudioRef.current, 0.44);
      }
    },
    [cinematic],
  );

  useEffect(() => {
    if (cinematic) return undefined;
    popAudioRef.current = acquirePopAudio();
    applauseAudioRef.current = acquireApplauseAudio();
    return () => {
      popAudioRef.current?.pause();
      applauseAudioRef.current?.pause();
      popAudioRef.current = null;
      applauseAudioRef.current = null;
    };
  }, [cinematic]);

  useEffect(() => {
    mutedRef.current = muted;
    if (!muted) return;
    popAudioRef.current?.pause();
    applauseAudioRef.current?.pause();
  }, [muted]);

  useEffect(() => {
    const invitation = invitationRef.current;
    if (
      !invitation ||
      window.innerWidth < 768 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    let pointerX = 0;
    let pointerY = 0;
    let tiltX = 0;
    let tiltY = 0;
    let frame = 0;

    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    const render = () => {
      frame = 0;
      const x = clamp(pointerX + tiltX * 0.45);
      const y = clamp(pointerY + tiltY * 0.45);
      const scrollDrift = Math.sin(window.scrollY * 0.008) * 4;
      invitation.style.setProperty("--parallax-near-x", `${x * 12}px`);
      invitation.style.setProperty(
        "--parallax-near-y",
        `${y * 8 + scrollDrift}px`,
      );
      invitation.style.setProperty("--parallax-far-x", `${x * 5}px`);
      invitation.style.setProperty(
        "--parallax-far-y",
        `${y * 4 + scrollDrift * 0.55}px`,
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };
    const updatePointer = (x: number, y: number) => {
      pointerX = (x / window.innerWidth - 0.5) * 2;
      pointerY = (y / window.innerHeight - 0.5) * 2;
      schedule();
    };
    const onPointerMove = (event: PointerEvent) =>
      updatePointer(event.clientX, event.clientY);
    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      tiltX = clamp((event.gamma ?? 0) / 32);
      tiltY = clamp((event.beta ?? 0) / 45);
      schedule();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("deviceorientation", onDeviceOrientation, {
      passive: true,
    });
    render();
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("deviceorientation", onDeviceOrientation);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const logoButton = logoButtonRef.current;
    if (
      !logoButton ||
      cinematic ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return undefined;
    const clamp = (value: number) => Math.max(-1, Math.min(1, value));
    const onOrientation = (event: DeviceOrientationEvent) => {
      logoButton.style.setProperty(
        "--logo-tilt-x",
        `${clamp((event.gamma ?? 0) / 30) * 12}px`,
      );
      logoButton.style.setProperty(
        "--logo-tilt-y",
        `${clamp((event.beta ?? 0) / 42) * 14}px`,
      );
    };
    window.addEventListener("deviceorientation", onOrientation, {
      passive: true,
    });
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [cinematic]);

  useEffect(() => {
    if (scrollHintPhase !== "hero" || revealed) return undefined;
    const hide = () => setScrollHintPhase("hidden");
    window.addEventListener("scroll", hide, { passive: true, once: true });
    return () => window.removeEventListener("scroll", hide);
  }, [scrollHintPhase, revealed]);

  useEffect(() => {
    if (scrollHintPhase !== "revealed") return undefined;
    const hide = () => setScrollHintPhase("hidden");
    const attachTimer = window.setTimeout(() => {
      window.addEventListener("scroll", hide, { passive: true, once: true });
    }, REVEAL_HINT_SCROLL_GRACE_MS);
    return () => {
      window.clearTimeout(attachTimer);
      window.removeEventListener("scroll", hide);
    };
  }, [scrollHintPhase]);

  useEffect(() => {
    if (!revealed || cinematic) return undefined;

    const focusTimer = window.setTimeout(() => {
      scrollToRevealMoment(visualRef.current, countdownRef.current);
    }, REVEAL_FOCUS_DELAY_MS);

    const hintTimer = window.setTimeout(() => {
      setScrollHintPhase("revealed");
    }, REVEAL_SCROLL_HINT_DELAY_MS);

    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(hintTimer);
    };
  }, [cinematic, revealed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return undefined;

    const drawSurface = async (force = false) => {
      if (coatingReady.current && !force) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width < 2 || bounds.height < 2) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const { width, height } = bounds;
      const pearl = context.createLinearGradient(0, 0, width, height * 0.92);
      pearl.addColorStop(0, "#fff8f6");
      pearl.addColorStop(0.28, "#fcefed");
      pearl.addColorStop(0.58, "#f8e6eb");
      pearl.addColorStop(0.82, "#f3dde5");
      pearl.addColorStop(1, "#efd6df");
      context.fillStyle = pearl;
      context.fillRect(0, 0, width, height);
      const sheen = context.createRadialGradient(
        width * 0.32,
        height * 0.1,
        0,
        width * 0.45,
        height * 0.34,
        width * 0.92,
      );
      sheen.addColorStop(0, "rgba(255, 255, 255, .5)");
      sheen.addColorStop(0.42, "rgba(255, 255, 255, .12)");
      sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = sheen;
      context.fillRect(0, 0, width, height);
      for (
        let index = 0, x = -height;
        x < width + height;
        index += 1, x += 2.15
      ) {
        const tone = seededRandom(index);
        context.strokeStyle = `rgba(${214 + Math.floor(tone * 12)}, ${176 + Math.floor(tone * 14)}, ${188 + Math.floor(tone * 12)}, ${0.05 + tone * 0.05})`;
        context.lineWidth = 0.34;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x + height, height);
        context.stroke();
      }
      for (
        let index = 0, x = -height;
        x < width + height;
        index += 1, x += 3.4
      ) {
        context.strokeStyle = `rgba(255, 255, 255, ${0.05 + seededRandom(index + 400) * 0.04})`;
        context.lineWidth = 0.24;
        context.beginPath();
        context.moveTo(x + 0.8, 0);
        context.lineTo(x + height - 0.8, height);
        context.stroke();
      }
      const sparkleCount = Math.floor((width * height) / 680);
      for (let index = 0; index < sparkleCount; index += 1) {
        const sx = seededRandom(index + 17) * width;
        const sy = seededRandom(index + 53) * height;
        const size = 0.35 + seededRandom(index + 91) * 1.1;
        const alpha = 0.14 + seededRandom(index + 127) * 0.24;
        context.fillStyle = `rgba(196, 168, 118, ${alpha})`;
        context.beginPath();
        context.arc(sx, sy, size, 0, Math.PI * 2);
        context.fill();
      }
      await drawScratchPrompt(context, width, height);
      coatingReady.current = true;
      scratchProgress.current = 0;
    };

    void drawSurface();
    const observer = new ResizeObserver(() => {
      if (!coatingReady.current) void drawSurface();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [revealed]);

  useEffect(() => {
    if (!completing || revealed) return undefined;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = `opacity ${COMPLETE_FADE_MS}ms ease-out`;
      canvas.style.opacity = "0";
    }
    const timer = window.setTimeout(() => {
      setRevealed(true);
    }, COMPLETE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [cinematic, completing, revealed]);

  const scratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || revealed || completing) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const brush =
      event.pointerType === "touch" || event.pointerType === "pen" ? 24 : 20;
    const bounds = canvas.getBoundingClientRect();
    const samples = event.nativeEvent.getCoalescedEvents?.() ?? [
      event.nativeEvent,
    ];
    samples.forEach((sample) => {
      const point = {
        x: sample.clientX - bounds.left,
        y: sample.clientY - bounds.top,
      };
      eraseScratchStroke(context, lastPoint.current, point, brush);
      lastPoint.current = point;
    });
    strokesSinceMeasurement.current += samples.length;
    if (strokesSinceMeasurement.current >= 4) {
      strokesSinceMeasurement.current = 0;
      const progress = measureScratchProgress(context, canvas);
      scratchProgress.current = progress;
      if (!completing && progress >= revealThreshold) setCompleting(true);
    }
  };

  const startScratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    unlockAudioOnUserGesture();
    setScratching(true);
    drawing.current = true;
    strokesSinceMeasurement.current = 0;
    lastPoint.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    scratch(event);
  };

  const endScratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    lastPoint.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (
      canvas &&
      context &&
      !completing &&
      measureScratchProgress(context, canvas) >= revealThreshold
    ) {
      setScrollHintPhase((phase) => (phase === "hero" ? "hidden" : phase));
      setCompleting(true);
    }
  };

  return (
    <main
      ref={invitationRef}
      className={`${styles.invitation} ${cinematic ? styles.cinematic : ""} ${!cinematic && revealed ? styles.withNav : ""}`}
      aria-hidden={cinematic || undefined}
    >
      {!cinematic && revealed && <InvitationNav />}
      <div className={styles.background} aria-hidden="true" />
      {!cinematic && (
        <>
          <FlowingParticles variant="viewport" className={styles.ambientCanvas} />
          {!mobileMotion && <WingedVesselParticle />}
          {!mobileMotion && <ButterflyParticle />}
        </>
      )}
      {!cinematic && showSpiritual && (
        <div ref={spiritualRef} className={styles.spiritualAnchor}>
          <GaneshaIntro
            layout="embedded"
            active
            muted={muted}
            onMantraStart={onMantraStart}
            onComplete={() => {
              onAudioZoneChange?.("invitation");
              scrollToInviteHeroPresentation("smooth");
              window.setTimeout(() => {
                onSpiritualFinished?.();
                requestAnimationFrame(() => {
                  scrollToInviteHeroPresentation("auto");
                  setScrollHintPhase("hero");
                });
              }, 880);
            }}
          />
        </div>
      )}
      {!cinematic && (
        <CelebrationConfetti
          active={revealed}
          onShotFired={handleConfettiShot}
          onSequenceComplete={() =>
            masterTimeline.setPhase(MasterPhase.InvitationEntrance)
          }
        />
      )}
      <section
        id="home"
        className={`${styles.hero} ${!cinematic ? styles.heroWithAnnouncement : ""}`}
        aria-label="Shubham and Harshi's wedding invitation"
      >
        {!cinematic && (
          <div className={styles.weddingAnnouncement}>
            <button
              id={INVITE_LOGO_ELEMENT_ID}
              ref={logoButtonRef}
              className={`${styles.logoButton} ${logoScrollSettled && !logoAnimating ? styles.logoSettled : ""}`}
              type="button"
              aria-label="Make the wedding emblem bounce"
              onClick={playLogoBounce}
            >
              <span ref={logoMotionRef} className={styles.logoMotion}>
                <Image
                  className={styles.logo}
                  src="/assets/images/bg/invite-logo.webp"
                  width={1536}
                  height={1024}
                  alt=""
                  priority
                  sizes="(max-width: 760px) 96px, 144px"
                />
              </span>
            </button>
            {/* <h1 className={styles.announcementNames}>
              <span>Shubham</span>
              <span className={styles.announcementAmp} aria-hidden="true">
                &amp;
              </span>
              <span>Harshi</span>
            </h1> */}
            {/* <div className={styles.announcementDivider} aria-hidden="true"><span />✦<span /></div> */}
            <div className={styles.announcementText}>
              <p className={styles.announcementHashtag}>{WEDDING_HASHTAG}</p>
              <p className={styles.announcementSubtitle}>
                We are getting married!
              </p>
            </div>
          </div>
        )}
        <div className={styles.copy}>
          <div className={styles.ornament} aria-hidden="true">
            <span />✦<span />
          </div>
          <p className={styles.intro}>
            We cordially invite you to witness the beginning of our forever and
            celebrate the wedding ceremony of
          </p>
          <h1 className={styles.name}>Shubham</h1>
          <p className={styles.with}>weds</p>
          <p className={styles.name}>Harshi</p>
        </div>
        <div ref={visualRef} className={styles.visual}>
          <figure className={styles.portrait}>
            <Image
              className={styles.couplePhoto}
              src="/assets/images/bg/mr-photo.webp"
              width={1023}
              height={1537}
              alt="Shubham and Harshi"
              priority
              sizes="(max-width: 760px) min(340px, 100vw), 420px"
            />
          </figure>
          <ScratchCard
            canvasRef={canvasRef}
            revealed={revealed}
            showHand={!scratching}
            onPointerDown={startScratch}
            onPointerMove={scratch}
            onPointerUp={endScratch}
          />
        </div>
        {revealed && <WeddingCountdown countdownRef={countdownRef} />}
      </section>
      {scrollHintPhase !== "hidden" && (
        <div
          key={scrollHintPhase}
          className={styles.scrollHint}
          role="status"
          aria-label={
            scrollHintPhase === "revealed"
              ? "Scrolling is now enabled. Scroll to explore the invitation."
              : "Scroll to explore the invitation."
          }
        >
          <small>Scroll</small>
          <span className={styles.scrollChevrons} aria-hidden="true">
            <span className={styles.scrollChevron} />
            <span className={styles.scrollChevron} />
          </span>
        </div>
      )}
      {revealed && <EventSchedule />}
      {revealed && <VenueSection venues={venues} />}
      {/* {revealed && <StoryMomentsSection />} */}
      {revealed && <FamilyLoveSection />}
      {revealed && <ClosingSection />}
      {revealed && <InvitationFooter />}
    </main>
  );
}

function ScratchCard({
  canvasRef,
  revealed,
  showHand,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  revealed: boolean;
  showHand: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}) {
  return (
    <div
      id={INVITATION_CARD_ELEMENT_ID}
      className={`${styles.scratchCard} ${revealed ? styles.revealed : ""}`}
    >
      <div className={styles.revealBackdrop} aria-hidden="true" />
      <Image
        className={styles.windowArtwork}
        src="/assets/images/bg/window.webp"
        width={1310}
        height={1201}
        alt=""
        aria-hidden="true"
        sizes="(max-width: 760px) 215px, 280px"
      />
      <div className={styles.revealContent}>
        <div className={styles.revealDetails}>
          <span className={styles.revealSave}>Save</span>
          <span className={styles.revealTheDate}>The Date</span>
          <span className={styles.revealDivider} aria-hidden="true">
            <i />
            ♡
            <i />
          </span>
          <strong className={styles.revealDate}>{WEDDING_DATE_DISPLAY}</strong>
          <em className={styles.revealDay}>{WEDDING_DAY_NAME}</em>
        </div>
      </div>
      {!revealed && (
        <canvas
          ref={canvasRef}
          className={styles.scratchCanvas}
          aria-label="Scratch to reveal the wedding date"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
      {!revealed && showHand && (
        <i className={styles.scratchHandIndicator} aria-hidden="true">
          ☝︎
        </i>
      )}
    </div>
  );
}

type AmbientKind = 0 | 1 | 2 | 3;

type AmbientParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  sway: number;
  swaySpeed: number;
  color: string;
  kind: AmbientKind;
  alpha: number;
};

function createAmbientParticle(
  width: number,
  height: number,
  index: number,
  spawnY?: number,
): AmbientParticle {
  const mobile = width < 700;
  return {
    x: Math.random() * width,
    y: spawnY ?? Math.random() * height,
    vx: -0.22 + Math.random() * 0.44,
    vy: 0.28 + Math.random() * 0.48,
    size: mobile ? 4.5 + Math.random() * 5.5 : 5.5 + Math.random() * 7,
    angle: Math.random() * Math.PI * 2,
    spin: -0.01 + Math.random() * 0.02,
    sway: Math.random() * Math.PI * 2,
    swaySpeed: 0.007 + Math.random() * 0.012,
    color: AMBIENT_COLORS[index % AMBIENT_COLORS.length],
    kind: (index % 4) as AmbientKind,
    alpha: 0.2 + Math.random() * 0.24,
  };
}

function drawAmbientShape(
  context: CanvasRenderingContext2D,
  kind: AmbientKind,
  size: number,
  color: string,
) {
  context.fillStyle = color;
  if (kind === 0) {
    context.beginPath();
    context.arc(0, 0, size * 0.46, 0, Math.PI * 2);
    context.fill();
    return;
  }
  if (kind === 1) {
    context.beginPath();
    for (let point = 0; point < 4; point += 1) {
      const angle = (Math.PI / 2) * point - Math.PI / 4;
      const radius = point % 2 === 0 ? size * 0.52 : size * 0.2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (point === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
    return;
  }
  if (kind === 2) {
    context.beginPath();
    context.arc(0, 0, size * 0.62, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(0, 0, size * 0.24, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.strokeStyle = color;
  context.lineWidth = Math.max(0.8, size * 0.14);
  context.beginPath();
  context.arc(0, 0, size * 0.42, 0, Math.PI * 2);
  context.stroke();
}

function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = isMobileMotionViewport();

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const maxParticles = mobile ? 72 : 128;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let particles: AmbientParticle[] = [];
    let frame = 0;
    let previous = performance.now();
    let paused = document.hidden;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = mobile ? 36 : 96;
      particles = Array.from({ length: count }, (_, index) =>
        createAmbientParticle(width, height, index),
      );
    };

    resize();
    window.addEventListener("resize", resize);

    const schedule = () => {
      if (
        paused ||
        reducedMotion ||
        !masterTimeline.shouldRunDecorativeCanvas()
      ) {
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        return;
      }
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused && !reducedMotion && masterTimeline.shouldRunDecorativeCanvas()) {
        previous = performance.now();
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const unsubscribePhase = masterTimeline.subscribe(() => schedule());

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("a, button, input, textarea, select, label")
      ) {
        return;
      }
      if (particles.length >= maxParticles) return;
      let closest: AmbientParticle | undefined;
      let closestDistance = Infinity;
      for (const particle of particles) {
        const distance = Math.hypot(
          event.clientX - particle.x,
          event.clientY - particle.y,
        );
        const hitRadius = Math.max(14, particle.size * 1.5);
        if (distance <= hitRadius && distance < closestDistance) {
          closest = particle;
          closestDistance = distance;
        }
      }
      if (!closest) return;

      const burstCount = mobile ? 3 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 2);
      const room = maxParticles - particles.length;
      const source = closest;
      particles.push(
        ...Array.from({ length: Math.min(burstCount, room) }, (_, index) => {
          const angle =
            (Math.PI * 2 * index) / burstCount + Math.random() * 0.35;
          const speed = 0.55 + Math.random() * 0.48;
          return {
            ...source,
            x: event.clientX,
            y: event.clientY,
            vx: source.vx + Math.cos(angle) * speed,
            vy: source.vy + Math.sin(angle) * speed,
            angle: source.angle + angle,
            spin: source.spin * (0.8 + Math.random() * 0.4),
            sway: source.sway + index,
          };
        }),
      );
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });

    const draw = (now: number) => {
      frame = 0;
      if (paused || !masterTimeline.shouldRunDecorativeCanvas()) return;
      const dt = Math.min(0.033, Math.max(0.001, (now - previous) / 1000));
      previous = now;
      const context = canvas.getContext("2d");
      if (!context) return;
      const intensity =
        masterTimeline.getDecorativeParticleMode() === "reduced" ? 0.5 : 1;
      context.clearRect(0, 0, width, height);
      particles.forEach((particle, index) => {
        particle.sway += particle.swaySpeed * dt * 60;
        particle.x += (particle.vx + Math.sin(particle.sway) * 0.14) * dt * 60;
        particle.y += particle.vy * dt * 60;
        particle.angle += particle.spin * dt * 60;
        if (particle.y > height + 16) {
          particles[index] = createAmbientParticle(
            width,
            height,
            index,
            -12 - Math.random() * height * 0.2,
          );
          return;
        }
        if (particle.x < -16) particle.x = width + 12;
        if (particle.x > width + 16) particle.x = -12;
        context.save();
        context.globalAlpha = particle.alpha * intensity;
        context.translate(particle.x, particle.y);
        context.rotate(particle.angle);
        drawAmbientShape(context, particle.kind, particle.size, particle.color);
        context.restore();
      });
      if (!reducedMotion) schedule();
    };

    if (reducedMotion) draw(performance.now());
    else schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      unsubscribePhase();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.ambientCanvas}
      aria-hidden="true"
    />
  );
}

function WingedVesselParticle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    let frame = 0;
    let wakeTimer: number | undefined;
    let paused = document.hidden;
    const started = performance.now();
    const cycleMs = 22000;
    const launchDelayMs = 5500;
    const travelMs = 7600;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const schedule = (delay = 0) => {
      if (paused) return;
      if (wakeTimer) window.clearTimeout(wakeTimer);
      if (delay > 0) {
        wakeTimer = window.setTimeout(() => {
          wakeTimer = undefined;
          frame = window.requestAnimationFrame(draw);
        }, delay);
        return;
      }
      frame = window.requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (now: number) => {
      frame = 0;
      if (paused || !masterTimeline.shouldRunDecorativeCanvas()) {
        schedule(120);
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      const cycleTime = (now - started) % cycleMs;
      const inPhase =
        cycleTime >= launchDelayMs && cycleTime < launchDelayMs + travelMs;
      if (!inPhase) {
        const waitUntilLaunch =
          cycleTime < launchDelayMs
            ? launchDelayMs - cycleTime
            : cycleMs - cycleTime + launchDelayMs;
        schedule(Math.min(waitUntilLaunch, 120));
        return;
      }
      context.clearRect(0, 0, width, height);
      const progress = (cycleTime - launchDelayMs) / travelMs;
      const scale = width < 700 ? 0.48 : 0.66;
      const vesselX = -100 * scale + progress * (width + 200 * scale);
      const vesselY = height * 0.4 + Math.sin(progress * Math.PI * 6) * 16;
      const wingLift = Math.sin(now / 130) * 12 * scale;
      const fade = Math.min(1, progress * 7, (1 - progress) * 7);
      context.save();
      context.globalAlpha = fade * 0.64;
      context.strokeStyle = "#547d9e";
      context.fillStyle = "#9db3cb";
      context.lineWidth = 1.6 * scale;

      context.beginPath();
      context.ellipse(
        vesselX,
        vesselY,
        32 * scale,
        10 * scale,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();

      context.beginPath();
      context.moveTo(vesselX - 20 * scale, vesselY - 2 * scale);
      context.quadraticCurveTo(
        vesselX - 57 * scale,
        vesselY - 27 * scale - wingLift,
        vesselX - 65 * scale,
        vesselY - 4 * scale,
      );
      context.quadraticCurveTo(
        vesselX - 40 * scale,
        vesselY + 2 * scale,
        vesselX - 20 * scale,
        vesselY + 4 * scale,
      );
      context.closePath();
      context.fill();
      context.stroke();

      context.beginPath();
      context.moveTo(vesselX + 20 * scale, vesselY - 2 * scale);
      context.quadraticCurveTo(
        vesselX + 57 * scale,
        vesselY - 27 * scale + wingLift,
        vesselX + 65 * scale,
        vesselY - 4 * scale,
      );
      context.quadraticCurveTo(
        vesselX + 40 * scale,
        vesselY + 2 * scale,
        vesselX + 20 * scale,
        vesselY + 4 * scale,
      );
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
      schedule();
    };

    resize();
    window.addEventListener("resize", resize);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      if (wakeTimer) window.clearTimeout(wakeTimer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.wingedVesselCanvas}
      aria-hidden="true"
    />
  );
}

function ButterflyParticle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    let frame = 0;
    let wakeTimer: number | undefined;
    let paused = document.hidden;
    const started = performance.now();
    const cycleMs = 18000;
    const launchDelayMs = 8500;
    const travelMs = 6800;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const schedule = (delay = 0) => {
      if (paused) return;
      if (wakeTimer) window.clearTimeout(wakeTimer);
      if (delay > 0) {
        wakeTimer = window.setTimeout(() => {
          wakeTimer = undefined;
          frame = window.requestAnimationFrame(draw);
        }, delay);
        return;
      }
      frame = window.requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const draw = (now: number) => {
      frame = 0;
      if (paused || !masterTimeline.shouldRunDecorativeCanvas()) {
        schedule(120);
        return;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      const cycleTime = (now - started) % cycleMs;
      const inPhase =
        cycleTime >= launchDelayMs && cycleTime < launchDelayMs + travelMs;
      if (!inPhase) {
        const waitUntilLaunch =
          cycleTime < launchDelayMs
            ? launchDelayMs - cycleTime
            : cycleMs - cycleTime + launchDelayMs;
        schedule(Math.min(waitUntilLaunch, 120));
        return;
      }
      context.clearRect(0, 0, width, height);
      const progress = (cycleTime - launchDelayMs) / travelMs;
      const scale = width < 700 ? 0.62 : 0.82;
      const wobble = Math.sin(progress * Math.PI * 7) * 54 * scale;
      const butterflyX = width + 34 - progress * (width + 68) + wobble;
      const butterflyY =
        height * (0.12 + progress * 0.72) +
        Math.sin(progress * Math.PI * 11) * 26 * scale;
      const wingBeat = Math.sin(now / 85) * 0.45;
      const fade = Math.min(1, progress * 8, (1 - progress) * 8);
      context.save();
      context.globalAlpha = fade * 0.7;
      context.translate(butterflyX, butterflyY);
      context.fillStyle = "#c77986";
      context.strokeStyle = "#8d5363";
      context.lineWidth = 1.1 * scale;

      context.beginPath();
      context.ellipse(
        -7 * scale,
        -3 * scale,
        10 * scale,
        (8 + wingBeat * 5) * scale,
        -0.55,
        0,
        Math.PI * 2,
      );
      context.ellipse(
        7 * scale,
        -3 * scale,
        10 * scale,
        (8 - wingBeat * 5) * scale,
        0.55,
        0,
        Math.PI * 2,
      );
      context.ellipse(
        -6 * scale,
        7 * scale,
        7 * scale,
        (5 - wingBeat * 3) * scale,
        0.25,
        0,
        Math.PI * 2,
      );
      context.ellipse(
        6 * scale,
        7 * scale,
        7 * scale,
        (5 + wingBeat * 3) * scale,
        -0.25,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();

      context.fillStyle = "#bd8651";
      context.beginPath();
      context.ellipse(
        0,
        2 * scale,
        2.2 * scale,
        10 * scale,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.restore();
      schedule();
    };

    resize();
    window.addEventListener("resize", resize);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      if (wakeTimer) window.clearTimeout(wakeTimer);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={styles.butterflyCanvas}
      aria-hidden="true"
    />
  );
}

function WeddingCountdown({
  countdownRef,
}: {
  countdownRef?: React.RefObject<HTMLElement | null>;
}) {
  const [countdown, setCountdown] = useState(getCountdown);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return <CountdownView countdown={countdown} countdownRef={countdownRef} />;
}

function CountdownView({
  countdown,
  countdownRef,
}: {
  countdown: Countdown;
  countdownRef?: React.RefObject<HTMLElement | null>;
}) {
  const items = [
    ["Days", countdown.days],
    ["Hours", countdown.hours],
    ["Minutes", countdown.minutes],
    ["Seconds", countdown.seconds],
  ];
  return (
    <section
      ref={countdownRef}
      className={styles.countdown}
      aria-label="Countdown to the wedding"
    >
      <p>
        {countdown.complete
          ? "Our forever begins today"
          : "Until our forever begins"}
      </p>
      <div>
        {items.map(([label, value]) => (
          <span key={label}>
            <strong>{value}</strong>
            <small>{label}</small>
          </span>
        ))}
      </div>
    </section>
  );
}
