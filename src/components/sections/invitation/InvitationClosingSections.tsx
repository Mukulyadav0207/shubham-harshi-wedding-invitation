"use client";

import emailjs from "@emailjs/browser";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { closingContent } from "./closingData";
import { familyIntro } from "./familyData";
import { useBallBounce } from "@/hooks/useBallBounce";
import { getElementViewportScrollProgress } from "@/lib/ballBounce";
import { useViewportReveal } from "@/hooks/useViewportReveal";
import styles from "./InvitationClosingSections.module.css";

export function StoryMomentsSection() {
  const sectionRef = useViewportReveal<HTMLElement>(styles.storyVisible);
  const photos = [
    {
      src: "/assets/images/gallery/img1.webp",
      width: 960,
      height: 1440,
      rotation: "-5deg",
      direction: styles.galleryPhotoLeft,
    },
    {
      src: "/assets/images/gallery/img2.webp",
      width: 960,
      height: 1440,
      rotation: "3deg",
      direction: styles.galleryPhotoRight,
    },
    {
      src: "/assets/images/gallery/img3.webp",
      width: 960,
      height: 1440,
      rotation: "-2deg",
      direction: styles.galleryPhotoLeft,
    },
    {
      src: "/assets/images/gallery/img4.webp",
      width: 960,
      height: 1280,
      rotation: "4deg",
      direction: styles.galleryPhotoRight,
    },
    {
      src: "/assets/images/gallery/img5.webp",
      width: 960,
      height: 1440,
      rotation: "-3deg",
      direction: styles.galleryPhotoLeft,
    },
    {
      src: "/assets/images/gallery/img6.webp",
      width: 960,
      height: 1344,
      rotation: "5deg",
      direction: styles.galleryPhotoRight,
    },
  ];

  return (
    <section
      id="gallery"
      ref={sectionRef}
      className={`${styles.section} ${styles.story}`}
      aria-labelledby="story-moments-title"
    >
      <div className={styles.galleryContent}>
        <header className={styles.galleryHeader}>
          <p className={styles.galleryEyebrow}>Our</p>
          <h2 id="story-moments-title">Memories</h2>
          <span className={styles.galleryDivider} aria-hidden="true">
            <i />♡<i />
          </span>
          <p className={styles.galleryNote}>
            A few of our favourite moments,
            <br />
            forever in our hearts.
          </p>
        </header>

        <div className={styles.galleryCollage}>
          <Image
            className={`${styles.galleryBotanical} ${styles.galleryLeavesLeft}`}
            src="/assets/images/gallery/leaves.webp"
            width={1024}
            height={1536}
            alt=""
            aria-hidden="true"
            loading="lazy"
            sizes="(max-width: 760px) 18vw, 120px"
          />
          {/* <Image
            className={`${styles.galleryBotanical} ${styles.galleryLeafRight}`}
            src="/assets/images/gallery/blue-leaf.webp"
            width={1024}
            height={1536}
            alt=""
            aria-hidden="true"
          /> */}
          <Image
            className={`${styles.galleryFlower} ${styles.galleryFlowerOne}`}
            src="/assets/images/gallery/blue-flower.webp"
            width={1312}
            height={1199}
            alt=""
            aria-hidden="true"
            loading="lazy"
            sizes="(max-width: 760px) 22vw, 140px"
          />
          {/* <Image
            className={`${styles.galleryFlower} ${styles.galleryFlowerTwo}`}
            src="/assets/images/gallery/white-flower.webp"
            width={1292}
            height={1217}
            alt=""
            aria-hidden="true"
          /> */}
          {/* <Image
            className={`${styles.galleryFlower} ${styles.galleryFlowerThree}`}
            src="/assets/images/gallery/baby-flowers.webp"
            width={1221}
            height={1288}
            alt=""
            aria-hidden="true"
          />
          <Image
            className={`${styles.galleryBotanical} ${styles.galleryGoldenLeaf}`}
            src="/assets/images/gallery/golden-leaf.webp"
            width={1536}
            height={1024}
            alt=""
            aria-hidden="true"
          /> */}
          <div className={styles.galleryPhotos}>
            {photos.map(({ src, width, height, rotation, direction }, index) => (
              <figure
                className={`${styles.galleryPhoto} ${direction}`}
                style={{ "--gallery-rotation": rotation } as CSSProperties}
                key={src}
              >
                <Image
                  src={src}
                  width={width}
                  height={height}
                  alt={`Mandeep and Ritika memory ${index + 1}`}
                  loading={index < 2 ? "eager" : "lazy"}
                  sizes="(max-width: 760px) 42vw, 180px"
                />
                {index === 0 || index === 2 || index === 4 ? (
                  <Image
                    className={styles.galleryTape}
                    src="/assets/images/gallery/tape.webp"
                    width={1672}
                    height={941}
                    alt=""
                    aria-hidden="true"
                  />
                ) : null}
                {index === 3 ? (
                  <div className={styles.galleryFloralStack} aria-hidden="true">
                    <Image
                      className={styles.galleryStackGoldenLeaf}
                      src="/assets/images/gallery/golden-leaf.webp"
                      width={1536}
                      height={1024}
                      alt=""
                      loading="lazy"
                      sizes="(max-width: 760px) 20vw, 110px"
                    />
                    <Image
                      className={styles.galleryStackWhiteFlower}
                      src="/assets/images/gallery/white-flower.webp"
                      width={1292}
                      height={1217}
                      alt=""
                      loading="lazy"
                      sizes="(max-width: 760px) 18vw, 100px"
                    />
                    <Image
                      className={styles.galleryStackBlueFlower}
                      src="/assets/images/gallery/blue-flower.webp"
                      width={1312}
                      height={1199}
                      alt=""
                      loading="lazy"
                      sizes="(max-width: 760px) 18vw, 100px"
                    />
                  </div>
                ) : null}
              </figure>
            ))}
          </div>
        </div>

        <footer className={styles.galleryFooter}>
          <span className={styles.galleryDivider} aria-hidden="true">
            <i />♡<i />
          </span>
          <p>Every picture holds a story, every story holds a memory.</p>
          <strong>More memories to come...</strong>
          <span className={styles.galleryHeart} aria-hidden="true">
            ♥
          </span>
        </footer>
      </div>
    </section>
  );
}

const FAMILY_LIGHTS_DELAY_MS = 2000;

const getMonogramScrollProgress = (element: HTMLElement) =>
  getElementViewportScrollProgress(element, 0.98, 0.28);

const familyMonogramBounceConfig = {
  peak: 54,
  bounceCount: 5.4,
  damping: 4.1,
};

export function FamilyLoveSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const monogramRingRef = useRef<HTMLSpanElement>(null);
  const [lightsOn, setLightsOn] = useState(false);
  const [visible, setVisible] = useState(false);

  const { playBounce: playMonogramBounce } = useBallBounce(monogramRingRef, {
    getScrollProgress: getMonogramScrollProgress,
    config: familyMonogramBounceConfig,
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const revealObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        revealObserver.unobserve(section);
      },
      { threshold: 0.18, rootMargin: "0px 0px -48px 0px" },
    );
    revealObserver.observe(section);

    return () => revealObserver.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    let timerId: number | undefined;
    const lightsObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (timerId) window.clearTimeout(timerId);
          timerId = undefined;
          setLightsOn(false);
          return;
        }

        if (timerId) window.clearTimeout(timerId);
        timerId = window.setTimeout(() => {
          setLightsOn(true);
          timerId = undefined;
        }, FAMILY_LIGHTS_DELAY_MS);
      },
      { threshold: 0.15 },
    );

    lightsObserver.observe(section);
    return () => {
      lightsObserver.disconnect();
      if (timerId) window.clearTimeout(timerId);
    };
  }, []);

  const toggleLights = () => setLightsOn((on) => !on);

  const { groom, bride, monogram, footer } = familyIntro;

  return (
    <section
      id="families"
      ref={sectionRef}
      className={`${styles.section} ${styles.family} ${lightsOn ? styles.familyLightsOn : ""} ${visible ? styles.familyVisible : ""}`}
      aria-labelledby="family-intro-title"
      onClick={toggleLights}
    >
      <div className={styles.familyIntro}>
        <header className={styles.familyHeader}>
          <p className={styles.familyTagline}>{familyIntro.tagline}</p>
          <span className={styles.familyFlourish} aria-hidden="true">
            <i />
            <b>✦</b>
            <i />
          </span>
          <h2 id="family-intro-title" className={styles.familyTitle}>
            {familyIntro.title}
          </h2>
          <p className={styles.familyScriptHeading}>
            {familyIntro.scriptTitle}
          </p>
        </header>

        <div className={styles.familyColumns}>
          <article
            className={`${styles.familyBlock} ${styles.familyBlockGroom}`}
          >
            <p className={styles.familyName}>{groom.name}</p>
            <p className={styles.familyGrandparentsLabel}>
              {groom.grandparentsLabel}
            </p>
            <p className={styles.familyParents}>{groom.grandparents}</p>
            <p className={styles.familyRelation}>{groom.parentsLabel}</p>
            <p className={styles.familyParents}>{groom.parents}</p>
            <span className={styles.familySeparator} aria-hidden="true" />
            <p className={styles.familySiblingLabel}>{groom.siblingLabel}</p>
            <p className={styles.familySiblings}>{groom.siblings}</p>
          </article>

          <div
            className={styles.familyMonogram}
            onClick={(event) => {
              event.stopPropagation();
              playMonogramBounce();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              playMonogramBounce();
            }}
            role="button"
            tabIndex={0}
            aria-label="Bounce the monogram"
          >
            <span ref={monogramRingRef} className={styles.familyMonogramRing}>
              <span className={styles.familyMonogramBotanical} />
              <span className={styles.familyMonogramInitials}>
                {monogram.left}
                <span className={styles.familyMonogramHeart}>♥</span>
                {monogram.right}
              </span>
            </span>
          </div>

          <article
            className={`${styles.familyBlock} ${styles.familyBlockBride}`}
          >
            <p className={styles.familyName}>{bride.name}</p>
            <p className={styles.familyGrandparentsLabel}>
              {bride.grandparentsLabel}
            </p>
            <p className={styles.familyParents}>{bride.grandparents}</p>
            <p className={styles.familyRelation}>{bride.parentsLabel}</p>
            <p className={styles.familyParents}>{bride.parents}</p>
            <span className={styles.familySeparator} aria-hidden="true" />
            <p className={styles.familySiblingLabel}>{bride.siblingLabel}</p>
            <p className={styles.familySiblings}>{bride.siblings}</p>
          </article>
        </div>

        <footer className={styles.familyFooter}>
          <p className={styles.familyQuote}>
            {footer.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <span className={styles.familyFlourish} aria-hidden="true">
            <i />
            <b>✦</b>
            <i />
          </span>
          <p className={styles.familyScriptFooter}>{footer.script}</p>
        </footer>
      </div>
    </section>
  );
}

export function ClosingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) {
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.unobserve(section);
      },
      { threshold: 0.2, rootMargin: "0px 0px -48px 0px" },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="blessings"
      ref={sectionRef}
      className={`${styles.section} ${styles.closing} ${visible ? styles.closingVisible : ""}`}
      aria-labelledby="closing-title"
    >
      <div className={styles.closingContent}>
        <h2 id="closing-title" className={styles.thankYouTitle}>
          {closingContent.title}
        </h2>
        <p className={styles.thankYouSubtitle}>{closingContent.subtitle}</p>
        <p className={styles.thankYouPresent}>{closingContent.present}</p>
        <p className={styles.thankYouMessage}>
          {closingContent.message.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
        <WishesForm />
      </div>
    </section>
  );
}

function WishesForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error" | "config"
  >("idle");
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});
  const timeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    if (publicKey) {
      emailjs.init({ publicKey });
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const values = new FormData(form);
    const name = String(values.get("name") ?? "").trim();
    const message = String(values.get("message") ?? "").trim();
    const nextErrors = {
      ...(name ? {} : { name: "Please share your name." }),
      ...(message ? {} : { message: "Please write a wish for the couple." }),
    };
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
    if (!serviceId || !templateId || !publicKey) {
      setStatus("config");
      return;
    }
    setErrors({});
    setStatus("sending");
    if (timeRef.current) {
      timeRef.current.value = new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date());
    }
    try {
      await emailjs.sendForm(serviceId, templateId, form, { publicKey });
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      ref={formRef}
      className={styles.wishesForm}
      onSubmit={submit}
      noValidate
    >
      <input ref={timeRef} type="hidden" name="time" defaultValue="" />
      <header>
        <p>Send Your Wishes</p>
        <span aria-hidden="true">✦</span>
      </header>
      <label>
        <span>Your Name</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Enter your name"
          maxLength={80}
          aria-invalid={Boolean(errors.name)}
          onChange={() =>
            setErrors((current) => ({ ...current, name: undefined }))
          }
        />
        {errors.name && (
          <small className={styles.formError}>{errors.name}</small>
        )}
      </label>
      <label>
        <span>Send Some Wishes</span>
        <textarea
          name="message"
          placeholder="Write a beautiful wish for the couple..."
          maxLength={300}
          aria-invalid={Boolean(errors.message)}
          onChange={() =>
            setErrors((current) => ({ ...current, message: undefined }))
          }
        />
        {errors.message && (
          <small className={styles.formError}>{errors.message}</small>
        )}
      </label>
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send Wishes ♡"}
      </button>
      {status === "success" && (
        <p className={styles.formSuccess}>
          Your wishes have been received ♡
          <span>Thank you for blessing our new beginning.</span>
        </p>
      )}
      {status === "config" && (
        <p className={styles.formError} role="alert">
          Wishes are not configured yet. Add EmailJS keys to{" "}
          <code>.env.local</code> and restart the dev server.
        </p>
      )}
      {status === "error" && (
        <p className={styles.formError} role="alert">
          We could not send your wishes right now. Please try again shortly.
          {process.env.NODE_ENV === "development" &&
          typeof window !== "undefined" ? (
            <span>
              {" "}
              Open the browser console for the EmailJS error details.
            </span>
          ) : null}
        </p>
      )}
    </form>
  );
}
