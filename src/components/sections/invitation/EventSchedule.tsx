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
    title: 'Bus Departure',
    date: '19 November 2026',
    times: ['3:00 PM'],
    venue: '',
    location: 'Sarai, Baghpat (UP)',
    image: '/assets/images/events/sarai-bus.webp',
  },
  {
    title: 'Haldi',
    date: '20 November 2026',
    times: ['11:00 AM onwards'],
    venue: 'The Crown Palace',
    location: 'Makronia Rd, Sagar, MP 470002',
    // dressCode: 'Dress code: Fuchsia pink',
    image: '/assets/images/events/haldi1.webp',
    alternateImage: '/assets/images/events/haldi2.webp',
    alternateSwapDelayMs: 3500,
  },
  {
    title: 'Sagai & Sangeet Night',
    date: '20 November 2026',
    times: ['6:00 PM onwards'],
    venue: 'The Crown Palace',
    location: 'Makronia Rd, Sagar, MP 470002',
     image: '/assets/images/events/sangeet.webp',
  },
  {
    title: 'Ghurchadi Tika',
    date: '21 November 2026',
    times: ['9:00 AM'],
    venue: 'The Crown Palace',
    location: 'Makronia Rd, Sagar, MP 470002',
    image: '/assets/images/events/tika.webp',
  },
  {
    title: 'Pheras',
    date: '21 November 2026',
    times: ['11:00 AM'],
    venue: 'The Crown Palace',
    location: 'Makronia Rd, Sagar, MP 470002',
    image: '/assets/images/events/pheras.webp',
  },
  {
    title: 'Barat & Reception',
    date: '21 November 2026',
    times: ['5:00 PM'],
    venue: 'The Crown Palace',
    location: 'Makronia Rd, Sagar, MP 470002',
    image: '/assets/images/events/reception.webp',
  },
  {
    title: 'Bus Departure',
    date: '21 November 2026',
    times: ['11:00 PM'],
    venue: '',
    location: 'Sagar, MP 470002',
    image: '/assets/images/events/sagar-bus.webp',
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
        {schedule.map((event, index) => (
          <EventCard
            key={`${event.title}-${event.date}-${event.times[0]}`}
            event={event}
            index={index}
          />
        ))}
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
