import Image from 'next/image';
import type { RefObject } from 'react';
import styles from './Envelope.module.css';

type FoldedCardProps = {
  cardRef: RefObject<HTMLDivElement | null>;
};

export default function FoldedCard({ cardRef }: FoldedCardProps) {
  return (
    <div ref={cardRef} className={styles.foldedCard} aria-hidden="true">
      <Image
        className={styles.cardArtwork}
        src="/assets/images/folded-card/folded-card.webp"
        fill
        sizes="25vw"
        alt=""
        priority
      />
    </div>
  );
}
