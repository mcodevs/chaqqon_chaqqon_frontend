import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCount } from '@/shared/format';
import { ImageLightbox } from '@/shared/ui/ImageLightbox';
import { visibleFacts } from '@/features/landing/content/landingFacts';
import { usePublicStats } from '@/shared/services/queries';
import styles from './LinkPage.module.css';
import {
  LINK_META,
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
 * A narrow single column meant for a phone held in one hand: who she is, one action, her links,
 * her photos, and the platform's own numbers as proof.
 *
 * It has no navigation and no DashboardLayout: a visitor arriving from Instagram is a guest, and
 * the page's only way into the app is the "Chaqqon-chaqqon" link itself.
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

        {profile.cta && (
          <a className={styles.cta} href={profile.cta.href} {...outside(profile.cta.href)}>
            {profile.cta.label}
          </a>
        )}

        {links.length > 0 && (
          <nav className={styles.links} aria-label="Havolalar">
            {links.map((link) => (
              <LinkRow key={`${link.kind}:${link.href}`} link={link} />
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

function Head({ profile }: { profile: LinkProfile }) {
  return (
    <header className={styles.head}>
      {profile.avatar ? (
        <img className={styles.avatar} src={profile.avatar.src} alt={profile.avatar.alt} />
      ) : (
        /* No photo yet: her initial stands in, so the head never collapses. */
        <span className={styles.avatarFallback} aria-hidden="true">
          {profile.name.slice(0, 1)}
        </span>
      )}
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
    </header>
  );
}

function LinkRow({ link }: { link: ProfileLink }) {
  const meta = LINK_META[link.kind];
  const body = (
    <>
      <span className={styles.rowIcon} aria-hidden="true">
        {meta.icon}
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

  // Our own pages go through the router, so the app is not reloaded for them.
  return isExternal(link.href) ? (
    <a className={styles.row} href={link.href} data-kind={link.kind} {...outside(link.href)}>
      {body}
    </a>
  ) : (
    <Link className={styles.row} to={link.href} data-kind={link.kind}>
      {body}
    </Link>
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
