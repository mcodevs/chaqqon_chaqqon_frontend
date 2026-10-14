import { type CSSProperties, useState } from 'react';
import { Link } from 'react-router-dom';
import motion from '@/features/landing/motion/motion.module.css';
import { visibleFacts } from '@/features/landing/content/landingFacts';
import { RodDivider } from '@/features/landing/art/BrandMark';
import { formatCount } from '@/shared/format';
import { usePublicStats } from '@/shared/services/queries';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import styles from './LinkPage.module.css';
import {
  PROFILE,
  type GalleryPhoto,
  type LinkProfile,
  type ProfileLink,
  isExternal,
  isFilled,
  visibleLinks,
} from './content/linkProfile';

/**
 * /link — the teacher's bio-link page, the address she puts in an Instagram or Telegram profile.
 * A narrow single column meant for a phone held in one hand, and two rows for two different
 * visitors: a parent who wants a trial lesson, and a fellow teacher who wants the platform.
 *
 * It has no navigation and no DashboardLayout: a visitor arriving from Instagram is a guest, and
 * the page's only way into the app is the teacher's row itself.
 *
 * Motion — "one reckoning". Everything that moves on arrival is explained by one cause: the rod
 * draws, the avatar settles onto the bar, and each row's bead is pushed up its rod against the bar,
 * one bead pitch per row, landing flat with no bounce. Beads never fade in; they arrive opaque
 * along a rod, which is what makes them read as a mechanism rather than as a page animating. The
 * text never waits for any of it. It is pure CSS, every keyframe is `from`-only, and the whole
 * sequence is over by ~700ms — so the page at rest is exactly the page a reduced-motion visitor
 * gets on the first frame.
 */
export function LinkPage() {
  return <Profile profile={PROFILE} />;
}

function Profile({ profile }: { profile: LinkProfile }) {
  const links = visibleLinks(profile);

  return (
    <div className={styles.page}>
      <main className={styles.column}>
        <Head profile={profile} />

        {links.length > 0 && (
          <nav className={styles.links} aria-label="Havolalar">
            {links.map((link, index) => (
              <LinkRow key={`${link.kind}:${link.href}`} link={link} index={index} />
            ))}
          </nav>
        )}

        {profile.gallery.length > 0 && <Gallery photos={profile.gallery} />}

        {profile.testimonials.length > 0 && (
          <section className={styles.quotes} aria-label="Sharhlar">
            {profile.testimonials.map((quote) => (
              <figure key={quote.author} className={styles.quote}>
                <blockquote className={styles.quoteText}>{quote.text}</blockquote>
                <figcaption className={styles.quoteAuthor}>{quote.author}</figcaption>
              </figure>
            ))}
          </section>
        )}

        <Proof />

        {!isFilled(profile) && (
          <p className={styles.empty}>
            Bu sahifa hali to'ldirilmagan: havolalar va rasmlar qo'shilgandan keyin ko'rinadi.
          </p>
        )}
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.madeWith}>
          Chaqqon-chaqqon'da yaratilgan
        </Link>
      </footer>
    </div>
  );
}

/** Opening attributes for an address that leaves the site; nothing extra for our own paths. */
function outside(href: string) {
  return isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/**
 * The head: a rod drawn down to the avatar, which settles onto the reckoning bar under the name.
 * The name and the role are never animated — they are what the visitor came to read, and on a
 * phone they are the largest thing on the first frame.
 */
function Head({ profile }: { profile: LinkProfile }) {
  return (
    <header className={styles.head}>
      <span className={styles.rodStub} aria-hidden="true" />
      <span className={styles.avatarDrop}>
        {profile.avatar ? (
          <img className={styles.avatar} src={profile.avatar.src} alt={profile.avatar.alt} />
        ) : (
          /* No photo yet: her initial stands in, so the head never collapses. */
          <span className={styles.avatarFallback} aria-hidden="true">
            {profile.name.slice(0, 1)}
          </span>
        )}
      </span>
      <h1 className={styles.name}>{profile.name}</h1>
      <p className={styles.role}>
        {profile.role}
        {profile.city && <span className={styles.city}> · {profile.city}</span>}
      </p>
      {profile.badges.length > 0 && (
        <ul className={styles.badges}>
          {profile.badges.map((badge) => (
            <li key={badge} className={styles.badge}>
              {badge}
            </li>
          ))}
        </ul>
      )}
      <RodDivider className={styles.bar} />
    </header>
  );
}

/**
 * One row: a bead on its own rod, the words, and an arrow. `index` is the row's place in the
 * column, which is both its delay and the number of bead pitches it travels — the stagger is
 * spatial as well as temporal, the way a hand sets one bead after another.
 */
function LinkRow({ link, index }: { link: ProfileLink; index: number }) {
  const body = (
    <>
      <span className={styles.mark} aria-hidden="true">
        <span className={styles.markRod} />
        <span className={styles.beadTravel}>
          <span className={styles.bead} />
        </span>
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{link.title}</span>
        {link.note && <span className={styles.rowNote}>{link.note}</span>}
      </span>
      <span className={styles.rowChevron} aria-hidden="true">
        →
      </span>
    </>
  );

  // The halo breathes three times around the primary row once the beads have settled, then is gone
  // for good: an invitation at the end of the gesture, not an alarm competing with it.
  const className = [styles.row, link.primary && motion.ringPulse].filter(Boolean).join(' ');
  const style = { '--i': index, '--lp-delay': '780ms' } as CSSProperties;

  return (
    <div className={styles.rowBox} style={style}>
      {link.eyebrow && <p className={styles.eyebrow}>{link.eyebrow}</p>}
      {/* Our own pages go through the router, so the app is not reloaded for them. */}
      {isExternal(link.href) ? (
        <a
          className={className}
          href={link.href}
          data-kind={link.kind}
          data-primary={link.primary || undefined}
          {...outside(link.href)}
        >
          {body}
        </a>
      ) : (
        <Link
          className={className}
          to={link.href}
          data-kind={link.kind}
          data-primary={link.primary || undefined}
        >
          {body}
        </Link>
      )}
    </div>
  );
}

function Gallery({ photos }: { photos: readonly GalleryPhoto[] }) {
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  return (
    <section className={styles.gallery} aria-label="Rasmlar">
      <ul className={styles.grid}>
        {photos.map((photo) => (
          <li key={photo.src}>
            <button
              type="button"
              className={styles.thumbButton}
              onClick={() => setOpen(photo)}
              aria-label={`${photo.caption} — kattalashtirish`}
            >
              <img className={styles.thumb} src={photo.src} alt={photo.caption} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      {open && <ImageLightbox src={open.src} caption={open.caption} onClose={() => setOpen(null)} />}
    </section>
  );
}

/**
 * The platform's live counts, the same ones the landing shows and under the same thresholds: a
 * number too small to reassure is not shown at all, so this strip is often empty.
 */
function Proof() {
  const facts = visibleFacts(usePublicStats());
  if (facts.length === 0) return null;

  return (
    <ul className={styles.facts}>
      {facts.map((fact) => (
        <li key={fact.id} className={styles.fact}>
          <span className={styles.factValue}>{formatCount(fact.value)}</span>
          <span className={styles.factLabel}>{fact.label}</span>
        </li>
      ))}
    </ul>
  );
}
