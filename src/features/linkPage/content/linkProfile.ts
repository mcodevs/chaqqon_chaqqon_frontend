/*
 * A teacher's bio-link page: the one page she puts in an Instagram or Telegram profile, in place of
 * taplink.cc. Stage A, so there is exactly one profile and it lives here as data, not as markup —
 * the page reads this shape and nothing else, so moving it into the database later (a page per
 * teacher, /u/<login>) means replacing this file's constant with a query, not rewriting the page.
 *
 * Everything the owner has not given yet is left out rather than invented: an empty field simply
 * does not render, and `isFilled` tells the page whether there is anything to show at all.
 */

/** The kinds of link a teacher hands out; the kind alone decides the icon and the colour. */
export type LinkKind = 'telegram' | 'instagram' | 'youtube' | 'phone' | 'whatsapp' | 'map' | 'platform';

export interface ProfileLink {
  kind: LinkKind;
  title: string;
  /** The quiet second line: what is behind the link, not a repeat of its name. */
  note?: string;
  /** An absolute address for an outside service, or a path for our own pages. */
  href: string;
}

export interface GalleryPhoto {
  /** Under /public, so it is served as-is: '/link/dars-1.webp'. */
  src: string;
  caption: string;
}

export interface Testimonial {
  text: string;
  author: string;
}

export interface LinkProfile {
  name: string;
  /** One line under the name: what she teaches. */
  role: string;
  city: string | null;
  avatar: { src: string; alt: string } | null;
  /** Short trust chips — "7 yil tajriba", "120+ o'quvchi". Kept to three on screen. */
  badges: readonly string[];
  /** The page's single primary action. Null while the owner has not said where it should lead. */
  cta: { label: string; href: string } | null;
  links: readonly ProfileLink[];
  gallery: readonly GalleryPhoto[];
  testimonials: readonly Testimonial[];
}

/** The icon and the accessible name of each kind of link. */
export const LINK_META: Record<LinkKind, { icon: string; label: string }> = {
  telegram: { icon: '✈️', label: 'Telegram' },
  instagram: { icon: '📷', label: 'Instagram' },
  youtube: { icon: '▶️', label: 'YouTube' },
  phone: { icon: '📞', label: 'Telefon' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
  map: { icon: '📍', label: 'Manzil' },
  platform: { icon: '🎯', label: 'Chaqqon-chaqqon' },
};

/**
 * Mohira ustoz's page at /link.
 *
 * To fill it in: add the photos to `public/link/`, then write the links below. A link with an empty
 * `href` is dropped, so half-filled rows never reach the page.
 */
export const PROFILE: LinkProfile = {
  name: 'Mohira ustoz',
  role: 'Mental arifmetika ustozi',
  city: null,
  avatar: null,
  badges: [],
  cta: null,
  links: [
    {
      kind: 'platform',
      title: "Chaqqon-chaqqon'ni sinab ko'rish",
      note: "O'quvchilarim shu platformada mashq qiladi",
      href: '/',
    },
  ],
  gallery: [],
  testimonials: [],
};

/** A link is shown only once it has somewhere to go. */
export function visibleLinks(profile: LinkProfile): ProfileLink[] {
  return profile.links.filter((link) => link.href.trim() !== '');
}

/** True for a link that leaves the site, and so needs target/rel of its own. */
export function isExternal(href: string): boolean {
  return /^(https?:|tel:|mailto:)/.test(href);
}

/**
 * Whether the page has anything beyond the name. Until the owner fills it in, the page says so
 * plainly instead of showing an empty frame.
 */
export function isFilled(profile: LinkProfile): boolean {
  return (
    visibleLinks(profile).length > 0 ||
    profile.gallery.length > 0 ||
    profile.testimonials.length > 0 ||
    profile.cta !== null
  );
}
