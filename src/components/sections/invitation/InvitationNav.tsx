"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { invitationNavigationItems } from "./invitationNavigation";
import { WEDDING_HASHTAG } from "./weddingContent";
import styles from "./InvitationNav.module.css";

export default function InvitationNav() {
  const [activeId, setActiveId] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const sections = invitationNavigationItems
      .map(([id]) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return undefined;

    const ratios = new Map<string, number>();
    const pickActive = () => {
      let bestId = sections[0]?.id ?? "home";
      let bestRatio = -1;
      ratios.forEach((ratio, id) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      });
      setActiveId((current) => (current === bestId ? current : bestId));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target.id, entry.intersectionRatio);
        });
        pickActive();
      },
      {
        threshold: [0, 0.12, 0.28, 0.45, 0.62, 0.8, 1],
        rootMargin: "-18% 0px -58% 0px",
      },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const navigate = (id: string) => {
    setActiveId(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  return (
    <nav
      ref={navRef}
      className={styles.nav}
      aria-label="Wedding invitation navigation"
    >
      <span className={styles.desktopMark}>{WEDDING_HASHTAG}</span>
      <div className={styles.desktopNav}>
        {invitationNavigationItems.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={activeId === id ? styles.active : ""}
            onClick={() => navigate(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.mobileNav}>
        <span className={styles.mark}>{WEDDING_HASHTAG}</span>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      <div
        className={`${styles.mobilePanel} ${menuOpen ? styles.mobilePanelOpen : ""}`}
        aria-hidden={!menuOpen}
      >
        {invitationNavigationItems.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={activeId === id ? styles.active : ""}
            tabIndex={menuOpen ? 0 : -1}
            onClick={() => navigate(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
