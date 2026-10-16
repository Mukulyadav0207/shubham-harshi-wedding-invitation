'use client';

import Image from 'next/image';
import { Clock3, MapPin, Shirt } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useViewportReveal } from '@/hooks/useViewportReveal';
import styles from './EventSchedule.module.css';

export type WeddingEvent = {
  title: string;
  date: string;
  times: readonly string[];
  venue: string;
  location: string;
  image: string;
  nightImage?: string;
  alternateImage?: string;
  alternateSwapDelayMs?: number;
  dressCode?: string;
};

export const events: readonly WeddingEvent[] = [
  {
    title: 'Lagan Sagai',
    date: '24 November 2026',
    times: ['Tilak — 3:00 PM', 'Dinner — 6:00 PM'],
    venue: 'Bastiram Palace',
    location: 'Sector 87, Kankrola, Gurugram',
    image: '/assets/images/events/lagan.webp',
  },
  {
    title: 'Haldi',
    date: '25 November 2026',
    times: ['12:00 PM onwards'],
    venue: 'The Divine Wedding Farm',
    location: 'Sector 91, Gurugram, Haryana 122505',
    dressCode: 'Dress code: Fuchsia pink',
    image: '/assets/images/events/haldi1.webp',
    alternateImage: '/assets/images/events/haldi2.webp',
    alternateSwapDelayMs: 3500,
  },
  {
    title: 'Mehndi',
    date: '25 November 2026',
    times: ['6:00 PM onwards'],
    venue: 'The Divine Wedding Farm',
    location: 'Sector 91, Gurugram, Haryana 122505',
    image: '/assets/images/events/mehndi.webp',
  },
  {
    title: 'Sangeet',
    date: '25 November 2026',
    times: ['7:00 PM onwards'],
    venue: 'The Divine Wedding Farm',
    location: 'Sector 91, Gurugram, Haryana 122505',
    image: '/assets/images/events/sangeet.webp',
  },
  {
    title: 'Ghurchadi',
    date: '26 November 2026',
    times: ['2:00 PM'],
    venue: 'DLF Garden City',
    location: 'Sector-92, Gurugram',
    image: '/assets/images/events/ghurchadi.webp',
  },
  {
    title: 'Barat Chadhat',
    date: '26 November 2026',
    times: ['7:00 PM'],
    venue: 'Raj Resort',
    location: 'NH58 Meerut',
    image: '/assets/images/events/barat.webp',
    nightImage: '/assets/images/events/barat-night.webp',
    alternateSwapDelayMs: 3500,
  },
] as const;

type EventScheduleProps = {
  events?: readonly WeddingEvent[];
};

const DEFAULT_IMAGE_SWAP_DELAY_MS = 2000;

/** Reusable responsive timeline for the wedding celebrations. */
export default function EventSchedule({ events: schedule = events }: EventScheduleProps) {
  const headerRef = useViewportReveal<HTMLElement>(styles.headerRevealed, {
    threshold: 0.15,
    rootMargin: '0px 0px -8% 0px',
  });

  return (
    <section id="events" className={styles.section} aria-labelledby="events-schedule-title">
      <header ref={headerRef} className={styles.header}>
        <p>Celebrate with us</p>
        <h2 id="events-schedule-title">Events Schedule</h2>
      </header>
      <ol className={styles.timeline}>
        {schedule.map((event, index) => <EventCard key={event.title} event={event} index={index} />)}
      </ol>
    </section>
  );
}

function EventCard({ event, index }: { event: WeddingEvent; index: number }) {
  const cardRef = useRef<HTMLLIElement>(null);
  const [swapActive, setSwapActive] = useState(false);
  const swapImage = event.alternateImage ?? event.nightImage;
  const swapDelayMs = event.alternateSwapDelayMs ?? DEFAULT_IMAGE_SWAP_DELAY_MS;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealCard = () => {
      card.classList.add(styles.cardRevealed);
    };

    if (reducedMotion) {
      const revealTimer = window.setTimeout(revealCard, 0);
      return () => window.clearTimeout(revealTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        revealCard();
        observer.unobserve(card);
      },
      { threshold: 0.2, rootMargin: "0px 0px -48px 0px" },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!swapImage) return undefined;
    const card = cardRef.current;
    if (!card) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let swapTimer: number | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (reducedMotion) {
            setSwapActive(true);
            return;
          }
          swapTimer = window.setTimeout(() => setSwapActive(true), swapDelayMs);
          return;
        }

        if (swapTimer) window.clearTimeout(swapTimer);
        swapTimer = undefined;
        setSwapActive(false);
      },
      { threshold: 0.35, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(card);
    return () => {
      if (swapTimer) window.clearTimeout(swapTimer);
      observer.disconnect();
    };
  }, [swapDelayMs, swapImage]);

  return (
    <li
      ref={cardRef}
      className={styles.timelineItem}
      style={{ '--event-delay': `${index * 55}ms` } as CSSProperties}
    >
      <article className={styles.card}>
        <div className={`${styles.imageWrap} ${swapActive ? styles.nightActive : ''}`}>
          <Image
            className={`${styles.image} ${styles.imageDay}`}
            src={event.image}
            alt={`${event.title} celebration`}
            fill
            sizes="(max-width: 760px) calc(100vw - 72px), 390px"
          />
          {swapImage ? (
            <Image
              className={`${styles.image} ${styles.imageNight}`}
              src={swapImage}
              alt=""
              fill
              sizes="(max-width: 760px) calc(100vw - 72px), 390px"
              aria-hidden="true"
            />
          ) : null}
        </div>
        <div className={styles.details}>
          <p className={styles.date}>{event.date}</p>
          <h3>{event.title}</h3>
          <div className={styles.meta}>
            <p><Clock3 aria-hidden="true" /> <span>{event.times.map((time) => <span key={time} className={styles.time}>{time}</span>)}</span></p>
            {event.dressCode ? (
              <p><Shirt aria-hidden="true" /> <span>{event.dressCode}</span></p>
            ) : null}
            <p><MapPin aria-hidden="true" /> <span><strong>{event.venue}</strong>{event.location}</span></p>
          </div>
        </div>
      </article>
    </li>
  );
}
