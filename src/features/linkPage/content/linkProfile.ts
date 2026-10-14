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
  /**
   * The page's one primary action, painted in the brand colour. At most one link carries it; the
   * rest stay quiet cards, so a page of links still has a single thing to do.
   */
  primary?: boolean;
  /** A small label above the row naming who it is for, where that is not obvious from the title. */
  eyebrow?: string;
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
  /**
   * A wide mark at the top, in place of the round avatar. It already carries her name, so the page
   * keeps its heading for screen readers and search engines and hides it on screen.
   */
  logo: { src: string; alt: string } | null;
  avatar: { src: string; alt: string } | null;
  /** Short trust chips — "7 yil tajriba", "120+ o'quvchi". Kept to three on screen. */
  badges: readonly string[];
  links: readonly ProfileLink[];
  gallery: readonly GalleryPhoto[];
  testimonials: readonly Testimonial[];
}

/**
 * What each kind of link is called. No icons: every row is marked by a soroban bead instead, which
 * is the page's own motif and renders the same on every phone — emoji do not.
 */
export const LINK_META: Record<LinkKind, { label: string }> = {
  telegram: { label: 'Telegram' },
  instagram: { label: 'Instagram' },
  youtube: { label: 'YouTube' },
  phone: { label: 'Telefon' },
  whatsapp: { label: 'WhatsApp' },
  map: { label: 'Manzil' },
  platform: { label: 'Chaqqon-chaqqon' },
};

/** Her own Telegram: where a parent's "trial lesson" tap lands. */
const TELEGRAM = 'https://t.me/Mohira_Ravshan_qizi';

/**
 * Mohira ustoz's page at /link.
 *
 * Two rows for two different visitors: a parent who came from her Instagram and wants a trial
 * lesson, and a fellow teacher who wants the platform her students work on. The parent's row is the
 * page's one primary action; the teacher's row stays quiet below it.
 *
 * To add to it: photos go in `public/link/`, then the gallery below. A link with an empty `href` is
 * dropped, so a half-filled row never reaches the page.
 */
export const PROFILE: LinkProfile = {
  name: 'Mohira ustoz',
  role: 'Mental arifmetika ustozi',
  city: null,
  logo: { src: '/link/logo.webp', alt: 'Mohira ustoz bilan Chaqqon-chaqqon' },
  avatar: null,
  badges: [],
  links: [
    {
      kind: 'telegram',
      title: 'Sinov darsiga yozilish',
      note: "Telegram orqali bevosita o'zimga yozing",
      href: TELEGRAM,
      primary: true,
    },
    {
      kind: 'platform',
      title: 'Mental arifmetika ustozimisiz?',
      note: "Chaqqon-chaqqon — o'quvchilaringiz uchun platforma",
      href: '/',
      eyebrow: 'Ustozlar uchun',
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
  return visibleLinks(profile).length > 0 || profile.gallery.length > 0 || profile.testimonials.length > 0;
}
