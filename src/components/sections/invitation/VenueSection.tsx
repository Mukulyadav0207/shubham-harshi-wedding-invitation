"use client";

import Image from "next/image";
import { Calendar, Clock3, ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { useViewportReveal } from "@/hooks/useViewportReveal";
import styles from "./VenueSection.module.css";
import type { Venue } from "./venueData";

type VenueSectionProps = {
  venues: readonly Venue[];
};

/** Landscape venue card with details framed on the right panel beside the arch photo. */
export default function VenueSection({
  venues: destinations,
}: VenueSectionProps) {
  const venueRefs = useRef<HTMLElement[]>([]);
  const sectionRef = useViewportReveal<HTMLElement>(styles.revealed);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.isVisible);
          observer.unobserve(entry.target);
        }),
      { threshold: 0.16 },
    );
    venueRefs.current.forEach((venue) => observer.observe(venue));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="venue"
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="venue-section-title"
    >
      <header className={styles.header}>
        <p>THE BEGINNING OF OUR ALWAYS</p>
        <h2 id="venue-section-title">Somewhere Between Destiny & Us</h2>
        <p>One little story, two hearts, and a forever to unfold</p>

        <span aria-hidden="true">✦</span>
      </header>
      <div className={styles.journey}>
        {destinations.map((venue, index) => (
          <article
            key={venue.id}
            ref={(element) => {
              if (element) venueRefs.current[index] = element;
            }}
            className={styles.venue}
          >
            <div className={styles.venueCardFrame}>
              <Image
                className={styles.venueCardArt}
                src={venue.image}
                alt={`${venue.label} venue artwork`}
                fill
                priority={index === 0}
                sizes="(max-width: 760px) 94vw, 920px"
              />
              <div className={styles.venueDetailsPanel}>
                <header className={styles.venueTitle}>
                  <span className={styles.venueLabel}>{venue.label}</span>
                </header>
                <div className={styles.venueDivider} aria-hidden="true">
                  <i />
                  <b>◆</b>
                  <i />
                </div>
                <ul className={styles.venueMeta}>
                  <li>
                    <span className={styles.metaIcon} aria-hidden="true">
                      <Calendar />
                    </span>
                    <span className={styles.metaText}>{venue.date}</span>
                  </li>
                  <li>
                    <span className={styles.metaIcon} aria-hidden="true">
                      <Clock3 />
                    </span>
                    <span className={styles.metaText}>{venue.time}</span>
                  </li>
                  <li>
                    <span className={styles.metaIcon} aria-hidden="true">
                      <MapPin />
                    </span>
                    <span className={styles.metaText}>
                      <strong>{venue.name}</strong>
                      <span className={styles.metaAddress}>
                        {venue.address}
                      </span>
                    </span>
                  </li>
                </ul>
                <a
                  className={styles.directions}
                  href={venue.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Get directions to ${venue.name}`}
                >
                  Get Directions <ExternalLink aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className={styles.mapEmbed}>
              <iframe
                title={`Map showing ${venue.name}`}
                src={venue.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
