"use client";

import { ArrowUp } from "lucide-react";
import { closingContent } from "./closingData";
import { WEDDING_HASHTAG } from "./weddingContent";
import styles from "./InvitationFooter.module.css";

export default function InvitationFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className={styles.footer} aria-label="Wedding invitation footer">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <p className={styles.hashtag}>{WEDDING_HASHTAG}</p>
          <p className={styles.names}>Mandeep &amp; Ritika</p>
          <p className={styles.date}>26 November 2026</p>
        </div>

        <div className={styles.signOff}>
          <p className={styles.gratitude}>{closingContent.signOff}</p>
          <p className={styles.family}>{closingContent.family}</p>
        </div>

        <button
          type="button"
          className={styles.topButton}
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <ArrowUp aria-hidden="true" />
          <span>Top</span>
        </button>
      </div>
    </footer>
  );
}
