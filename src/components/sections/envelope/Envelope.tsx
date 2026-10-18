"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  createEnvelopeAnimation,
  type EnvelopeAnimationRefs,
} from "@/animations/envelope/envelope";
import {
  createEnvelopeLightSequence,
  type EnvelopeLightRefs,
} from "@/animations/envelope/envelopeLight";
import { createCardRevealAnimation } from "@/animations/card/cardReveal";
import { createCardTransitionAnimation } from "@/animations/card/cardTransition";
import { createMobileOpeningSequence } from "@/animations/opening/openingSequenceMobile";
import { masterTimeline, MasterPhase } from "@/animations/masterTimeline";
import {
  createWeddingMusic,
  getInvitationTrackSrc,
  lockInvitationTrackForVisit,
  type WeddingMusicController,
} from "@/audio/weddingMusic";
import {
  warmCriticalAudio,
  whenShankReady,
  unlockAudioOnUserGesture,
  resumeAudioContextOnUserGesture,
  setMantraMuted,
  setMantraPlaybackVolume,
  stopMantraPlayback,
  stopShankPlayback,
} from "@/audio/criticalAudio";
import FoldedCard from "./FoldedCard";
import InvitationHero, {
  scrollToInviteHeroPresentation,
  type InvitationAudioZone,
} from "../invitation/InvitationHero";
import { configureGsapPlatform, prefersLinearWebKitMotion } from "@/lib/gsapPlatform";
import { isMobileMotionViewport, MOBILE_MOTION_QUERY } from "@/lib/motion";
import styles from "./Envelope.module.css";
import { vivahTrace } from "@/lib/vivahTrace";

const assetRoot = "/assets/images/envlope";
const envelopeStartupAssets = [
  "/assets/images/bg/bg.webp",
  `${assetRoot}/envlope-backside.webp`,
  `${assetRoot}/half-envelope.webp`,
  `${assetRoot}/top-flap.webp`,
  `${assetRoot}/ribbon-seal.webp`,
  "/assets/images/folded-card/folded-card.webp",
] as const;

function buildAmbientParticles(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `ambient-particle-${index}`,
    style: {
      "--particle-x": `${(index * 37 + 17) % 101}%`,
      "--particle-y": `${(index * 61 + 29) % 101}%`,
      "--particle-size": `${index % 11 === 0 ? 6 : index % 4 === 0 ? 4 : 2}px`,
      "--particle-duration": `${9 + (index % 7) * 1.35}s`,
      "--particle-delay": `${-(index % 16)}s`,
    } as CSSProperties,
  }));
}

const desktopAmbientParticles = buildAmbientParticles(70);
const mobileAmbientParticles = buildAmbientParticles(22);
const floralLightPathClasses = [
  "floralLightCenter",
  "floralLightLeft",
  "floralLightRight",
  "floralLightLowerLeft",
  "floralLightLowerRight",
  "floralLightUpper",
] as const;
const glintClasses = [
  "lightGlintOne",
  "lightGlintTwo",
  "lightGlintThree",
  "lightGlintFour",
  "lightGlintFive",
  "lightGlintSix",
  "lightGlintSeven",
  "lightGlintEight",
] as const;

const SLOW_LOAD_THRESHOLD_MS = 2500;
const WEAK_NETWORK_HINT_DELAY_MS = 2000;
const MIN_LOADER_VISIBLE_MS = 450;

type PreloadResult = {
  source: string;
  ok: boolean;
  reason: string;
  ms: number;
};

function getNetworkProfile() {
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  const effectiveType = connection?.effectiveType ?? "unknown";
  const saveData = connection?.saveData ?? false;
  const slowConnection = ["slow-2g", "2g", "3g"].includes(effectiveType);
  return { effectiveType, saveData, slowConnection };
}

function preloadEnvelopeAsset(source: string) {
  return new Promise<PreloadResult>((resolve) => {
    const startedAt = performance.now();
    const image = new window.Image();
    let settled = false;
    let timeoutId: number | undefined;
    const finish = (reason: string, ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      resolve({
        source,
        ok,
        reason,
        ms: Math.round(performance.now() - startedAt),
      });
    };
    const decodeThenFinish = (reason: string) => {
      const ok = image.naturalWidth > 0;
      if (typeof image.decode !== "function") {
        finish(reason, ok);
        return;
      }
      void image.decode().then(
        () => finish(reason, ok),
        () => finish(`${reason}-decode-fail`, false),
      );
    };
    image.addEventListener("load", () => decodeThenFinish("load"), { once: true });
    image.addEventListener("error", () => finish("error", false), { once: true });
    timeoutId = window.setTimeout(() => finish("timeout", false), 12000);
    image.src = source;
    if (image.complete) decodeThenFinish("already-complete");
  });
}

export default function Envelope() {
  const [state, setState] = useState<
    "closed" | "opening" | "transitioning" | "invitation"
  >("closed");
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [weakNetworkHint, setWeakNetworkHint] = useState(false);
  const sceneRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLImageElement>(null);
  const floralPathRefs = useRef<HTMLSpanElement[]>([]);
  const glintRefs = useRef<HTMLSpanElement[]>([]);
  const envelopeVeilRef = useRef<HTMLSpanElement>(null);
  const innerLightRef = useRef<HTMLSpanElement>(null);
  const openingLightRef = useRef<HTMLSpanElement>(null);
  const topFlapShadowRef = useRef<HTMLSpanElement>(null);
  const cardTransitionLightRef = useRef<HTMLSpanElement>(null);
  const playOpenRef = useRef<(() => void) | null>(null);
  const playCardRevealRef = useRef<(() => void) | null>(null);
  const playCardTransitionRef = useRef<(() => void) | null>(null);
  const playMobileFlyoutRef = useRef<(() => void) | null>(null);
  const cancelMobileOpeningRef = useRef<(() => void) | null>(null);
  const weddingMusicRef = useRef<WeddingMusicController | null>(null);
  const musicEnabledRef = useRef(true);
  const openingRef = useRef(false);
  const invitationTimerRef = useRef<number | null>(null);
  const audioZoneRef = useRef<InvitationAudioZone>("spiritual");
  const bollywoodStartedRef = useRef(false);
  const invitationActiveRef = useRef(false);
  const enterMainInvitationRef = useRef<() => void>(() => undefined);
  const [showSpiritualSkip, setShowSpiritualSkip] = useState(true);
  const [spiritualSectionRemoved, setSpiritualSectionRemoved] = useState(false);
  const [useMobileDust, setUseMobileDust] = useState(false);

  useEffect(() => {
    configureGsapPlatform();
    setUseMobileDust(window.matchMedia(MOBILE_MOTION_QUERY).matches);
  }, []);

  const ambientParticles = useMobileDust
    ? mobileAmbientParticles
    : desktopAmbientParticles;

  useEffect(() => {
    if (typeof document === "undefined" || !document.body) return;
    document.body.dataset.vivahStage = state;
    vivahTrace("stage", { state });
  }, [state]);

  useEffect(() => {
    warmCriticalAudio();
    let active = true;
    const preloadStartedAt = performance.now();
    const network = getNetworkProfile();
    if (network.slowConnection || network.saveData) {
      setWeakNetworkHint(true);
    }

    const hintTimer = window.setTimeout(() => {
      if (active) setWeakNetworkHint(true);
    }, WEAK_NETWORK_HINT_DELAY_MS);

    void Promise.all([
      ...envelopeStartupAssets.map(preloadEnvelopeAsset),
      whenShankReady(),
    ]).then((results) => {
      const imageResults = results.filter(
        (result): result is PreloadResult =>
          typeof result === "object" && result !== null && "source" in result,
      );
      const failedCount = imageResults.filter((result) => !result.ok).length;
      const totalMs = Math.round(performance.now() - preloadStartedAt);
      const slowLoad = totalMs >= SLOW_LOAD_THRESHOLD_MS;
      const shouldHint =
        failedCount > 0 ||
        slowLoad ||
        network.slowConnection ||
        network.saveData;

      const reveal = () => {
        const elapsed = performance.now() - preloadStartedAt;
        const waitMs = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);
        window.setTimeout(() => {
          if (!active) return;
          if (shouldHint) setWeakNetworkHint(true);
          setAssetsReady(true);
          vivahTrace("assets-ready", { count: envelopeStartupAssets.length });
        }, waitMs);
      };

      reveal();
    });

    return () => {
      active = false;
      window.clearTimeout(hintTimer);
    };
  }, []);

  const syncInvitationTrack = () => {
    const trackId = lockInvitationTrackForVisit();
    weddingMusicRef.current?.setInvitationSource(getInvitationTrackSrc(trackId), {
      trackId,
    });
  };

  const enterMainInvitation = useCallback(() => {
    vivahTrace("animation", { step: "main-invitation-start" });
    masterTimeline.setPhase(MasterPhase.GaneshaReveal);
    setState("invitation");
    setShowSpiritualSkip(true);
    bollywoodStartedRef.current = false;
    audioZoneRef.current = "spiritual";
    resumeAudioContextOnUserGesture();
    setMantraMuted(!musicEnabledRef.current);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);

  enterMainInvitationRef.current = enterMainInvitation;

  useEffect(() => {
    invitationActiveRef.current = state === "invitation";
  }, [state]);

  const startBollywoodMusic = useCallback(() => {
    if (bollywoodStartedRef.current) return;
    bollywoodStartedRef.current = true;
    const music = weddingMusicRef.current;
    if (!music) return;
    masterTimeline.setPhase(MasterPhase.InvitationEntrance);
    music.setTrack("invitation");
    music.startInvitationTrackRotation();
    music.setMuted(!musicEnabledRef.current);
    void music.play().then((didPlay) => {
      if (didPlay) music.fadeIn(1200);
    });
  }, []);

  const handleInvitationAudioZone = useCallback(
    (zone: InvitationAudioZone) => {
      if (!invitationActiveRef.current) return;
      if (audioZoneRef.current === zone) return;
      audioZoneRef.current = zone;

      if (zone === "spiritual") {
        weddingMusicRef.current?.fadeOut(450);
        resumeAudioContextOnUserGesture();
        setMantraMuted(!musicEnabledRef.current);
        masterTimeline.setPhase(MasterPhase.MantraIntro);
        return;
      }

      setShowSpiritualSkip(false);
      stopShankPlayback();
      stopMantraPlayback();
      startBollywoodMusic();
    },
    [startBollywoodMusic],
  );

  const removeSpiritualSection = useCallback(() => {
    setSpiritualSectionRemoved(true);
    setShowSpiritualSkip(false);
  }, []);

  const skipToInviteLogo = () => {
    if (state !== "invitation") return;
    handleInvitationAudioZone("invitation");
    removeSpiritualSection();
    requestAnimationFrame(() => {
      scrollToInviteHeroPresentation("smooth");
    });
  };

  useEffect(() => {
    if (state !== "invitation") return undefined;
    return () => weddingMusicRef.current?.stopInvitationTrackRotation();
  }, [state]);

  useEffect(
    () => () => {
      if (invitationTimerRef.current)
        window.clearTimeout(invitationTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!assetsReady) return undefined;
    if (
      !sceneRef.current ||
      !stageRef.current ||
      !flapRef.current ||
      !cardRef.current ||
      !sealRef.current ||
      !envelopeVeilRef.current ||
      !innerLightRef.current ||
      !openingLightRef.current ||
      !topFlapShadowRef.current ||
      !cardTransitionLightRef.current
    )
      return undefined;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const linearWebKit = prefersLinearWebKitMotion();
    const weddingMusic = createWeddingMusic();
    weddingMusicRef.current = weddingMusic;
    weddingMusic.preload();
    let mobileOpening: ReturnType<typeof createMobileOpeningSequence> | null =
      null;
    let envelopeAnimation: ReturnType<typeof createEnvelopeAnimation> | null =
      null;
    let lightSequence: ReturnType<typeof createEnvelopeLightSequence> | null =
      null;
    let cardReveal: ReturnType<typeof createCardRevealAnimation> | null = null;
    let cardTransition: ReturnType<typeof createCardTransitionAnimation> | null =
      null;

    if (linearWebKit) {
      mobileOpening = createMobileOpeningSequence(
        {
          flap: flapRef.current,
          innerLight: innerLightRef.current,
          openingLight: openingLightRef.current,
          topFlapShadow: topFlapShadowRef.current,
          stage: stageRef.current,
          card: cardRef.current,
          envelopeVeil: envelopeVeilRef.current,
          light: cardTransitionLightRef.current,
        },
        {
          onTransitioning: () => setState("transitioning"),
          onGanesha: () => {
            enterMainInvitationRef.current();
          },
        },
      );
      playMobileFlyoutRef.current = mobileOpening.play;
      cancelMobileOpeningRef.current = mobileOpening.cancel;
      playOpenRef.current = () => mobileOpening?.play();
    } else {
      cardTransition = createCardTransitionAnimation(
        {
          scene: sceneRef.current,
          stage: stageRef.current,
          card: cardRef.current,
          light: cardTransitionLightRef.current,
        },
        {
          reducedMotion,
          onComplete: () => {
            enterMainInvitationRef.current();
          },
        },
      );
      cardReveal = createCardRevealAnimation(
        {
          scene: sceneRef.current,
          card: cardRef.current,
          envelopeVeil: envelopeVeilRef.current,
        },
        {
          reducedMotion,
          onComplete: () => {
            vivahTrace("animation", { step: "card-transition-start" });
            masterTimeline.setPhase(MasterPhase.CardToGanesha);
            playCardTransitionRef.current?.();
          },
        },
      );
      const animationRefs: EnvelopeAnimationRefs = {
        scene: sceneRef.current,
        flap: flapRef.current,
        innerLight: innerLightRef.current,
        openingLight: openingLightRef.current,
        topFlapShadow: topFlapShadowRef.current,
      };
      envelopeAnimation = createEnvelopeAnimation(animationRefs, {
        reducedMotion,
        onComplete: () => {
          vivahTrace("animation", { step: "card-reveal-start" });
          masterTimeline.setPhase(MasterPhase.CardEmergence);
          setState("transitioning");
          playCardRevealRef.current?.();
        },
      });
      const lightRefs: EnvelopeLightRefs = {
        scene: sceneRef.current,
        seal: sealRef.current,
        floralPaths: floralPathRefs.current,
        glints: glintRefs.current,
      };
      lightSequence = createEnvelopeLightSequence(lightRefs, {
        reducedMotion,
        onComplete: () => undefined,
      });
      playCardRevealRef.current = cardReveal.play;
      playCardTransitionRef.current = cardTransition.play;
      playOpenRef.current = () => {
        masterTimeline.setPhase(MasterPhase.EnvelopeOpening);
        envelopeAnimation?.play();
        lightSequence?.play();
      };
    }

    return () => {
      playOpenRef.current = null;
      playCardRevealRef.current = null;
      playCardTransitionRef.current = null;
      playMobileFlyoutRef.current = null;
      cancelMobileOpeningRef.current = null;
      weddingMusicRef.current = null;
      weddingMusic.destroy();
      envelopeAnimation?.revert();
      lightSequence?.revert();
      cardReveal?.revert();
      cardTransition?.revert();
      mobileOpening?.cancel();
    };
  }, [assetsReady]);

  const openInvitation = () => {
    if (
      !assetsReady ||
      openingRef.current ||
      state !== "closed" ||
      !playOpenRef.current
    )
      return;
    openingRef.current = true;
    vivahTrace("envelope-tap", { action: "open" });
    masterTimeline.beginOpeningSequence();
    masterTimeline.setPhase(MasterPhase.EnvelopeOpening);
    unlockAudioOnUserGesture();
    syncInvitationTrack();
    weddingMusicRef.current?.unlockForUserGesture();
    void weddingMusicRef.current?.playOpeningCue();
    setState("opening");
    playOpenRef.current();
  };

  const handleEnvelopeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openInvitation();
  };

  const toggleMusic = () => {
    const nextMuted = !isMusicMuted;
    musicEnabledRef.current = !nextMuted;
    setIsMusicMuted(nextMuted);

    unlockAudioOnUserGesture();

    if (state === "invitation") {
      if (audioZoneRef.current === "spiritual") {
        resumeAudioContextOnUserGesture();
        setMantraMuted(nextMuted);
        if (nextMuted) stopShankPlayback();
        weddingMusicRef.current?.setMuted(true);
        weddingMusicRef.current?.pause();
        return;
      }
      setMantraPlaybackVolume(0);
      weddingMusicRef.current?.setMuted(nextMuted);
      if (!nextMuted) {
        void weddingMusicRef.current?.play().then((didPlay) => {
          if (didPlay) weddingMusicRef.current?.fadeIn(700);
        });
      }
      return;
    }

    setMantraMuted(nextMuted);
    weddingMusicRef.current?.setMuted(nextMuted);
    if (nextMuted) {
      stopShankPlayback();
      weddingMusicRef.current?.pause();
    }
  };

  if (state === "invitation")
    return (
      <>
        <InvitationHero
          muted={isMusicMuted}
          showSpiritual={!spiritualSectionRemoved}
          onMantraStart={() => weddingMusicRef.current?.fadeOut(1100)}
          onAudioZoneChange={handleInvitationAudioZone}
          onSpiritualFinished={removeSpiritualSection}
        />

        {showSpiritualSkip && (
          <button
            className={styles.skipControl}
            type="button"
            onClick={skipToInviteLogo}
          >
            Skip <span aria-hidden="true">→</span>
          </button>
        )}

        <button
          className={styles.musicControl}
          type="button"
          aria-label={
            isMusicMuted ? "Unmute wedding music" : "Mute wedding music"
          }
          aria-pressed={isMusicMuted}
          onClick={toggleMusic}
        >
          {isMusicMuted ? (
            <VolumeX aria-hidden="true" />
          ) : (
            <Volume2 aria-hidden="true" />
          )}
        </button>
      </>
    );

  return (
    <main
      ref={sceneRef}
      className={`${styles.scene} ${assetsReady ? "" : styles.sceneLoading}`}
      data-phase={state}
    >
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.ambientDust} aria-hidden="true">
        {ambientParticles.map(({ id, style }) => (
          <span key={id} style={style} />
        ))}
      </div>
      <div className={styles.envelopeFloat}>
        <div
          ref={stageRef}
          className={styles.stage}
          data-state={state}
          role="button"
          tabIndex={state === "closed" ? 0 : -1}
          aria-label="Open wedding invitation"
          onClick={openInvitation}
          onKeyDown={handleEnvelopeKeyDown}
        >
          <Image
            className={styles.envelopeBackside}
            src={`${assetRoot}/envlope-backside.webp`}
            width={1536}
            height={1024}
            alt=""
            priority
          />
          <span
            ref={innerLightRef}
            className={styles.innerLight}
            aria-hidden="true"
          />
          <span
            ref={openingLightRef}
            className={styles.envelopeOpeningLight}
            aria-hidden="true"
          />
          <div className={styles.envelopeLightLayer} aria-hidden="true">
            {floralLightPathClasses.map((className, index) => (
              <span
                key={className}
                ref={(element) => {
                  if (element) floralPathRefs.current[index] = element;
                }}
                className={`${styles.floralLightPath} ${styles[className]}`}
              />
            ))}
            {glintClasses.map((className, index) => (
              <span
                key={className}
                ref={(element) => {
                  if (element) glintRefs.current[index] = element;
                }}
                className={`${styles.lightGlint} ${styles[className]}`}
              />
            ))}
          </div>
          <FoldedCard cardRef={cardRef} />
          <Image
            className={styles.halfEnvelope}
            src={`${assetRoot}/half-envelope.webp`}
            width={1536}
            height={1024}
            alt=""
            priority
          />
          <div ref={flapRef} className={styles.topFlapGroup}>
            <span
              ref={topFlapShadowRef}
              className={styles.topFlapShadow}
              aria-hidden="true"
            />
            <Image
              className={styles.topFlap}
              src={`${assetRoot}/top-flap.webp`}
              width={1536}
              height={1024}
              alt=""
              priority
            />
          </div>
          <Image
            ref={sealRef}
            className={styles.ribbonSeal}
            src={`${assetRoot}/ribbon-seal.webp`}
            width={1536}
            height={1024}
            alt=""
            priority
          />
          <span
            ref={envelopeVeilRef}
            className={styles.envelopeVeil}
            aria-hidden="true"
          />
        </div>
      </div>
      <span
        ref={cardTransitionLightRef}
        className={styles.cardTransitionLight}
        aria-hidden="true"
      />
      {!assetsReady && (
        <div className={styles.envelopeLoader} role="status" aria-live="polite">
          <span className={styles.envelopeLoaderRing} aria-hidden="true" />
          <span className={styles.envelopeLoaderText}>Preparing your invitation</span>
          {weakNetworkHint && (
            <p className={styles.networkToast}>
              Weak network — please wait while we load your invitation
            </p>
          )}
        </div>
      )}
      {state !== "closed" && (
        <button
          className={styles.musicControl}
          type="button"
          aria-label={
            isMusicMuted ? "Unmute wedding music" : "Mute wedding music"
          }
          aria-pressed={isMusicMuted}
          onClick={toggleMusic}
        >
          {isMusicMuted ? (
            <VolumeX aria-hidden="true" />
          ) : (
            <Volume2 aria-hidden="true" />
          )}
        </button>
      )}
      {assetsReady && state === "closed" && (
        <button
          className={styles.openHint}
          type="button"
          onClick={openInvitation}
          aria-label="Tap to open wedding invitation"
        >
          Tap to open
        </button>
      )}
    </main>
  );
}
