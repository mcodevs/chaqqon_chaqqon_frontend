import { useEffect } from 'react';
import styles from './ImageLightbox.module.css';

interface ImageLightboxProps {
  src: string;
  /** Shown under the photo and used as the image's alt text. */
  caption?: string;
  onClose: () => void;
}

/** A photo at full size over the page: tap anywhere, press Escape, or use the button to close. */
export function ImageLightbox({ src, caption, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Yopish">
        ✕
      </button>
      <figure className={styles.figure}>
        <img
          className={styles.image}
          src={src}
          alt={caption ?? 'Profil rasmi'}
          // The photo itself is not a close target, so a mis-tap on it does not dismiss the view.
          onClick={(event) => event.stopPropagation()}
        />
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>
    </div>
  );
}
