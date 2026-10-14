import { describe, expect, it } from 'vitest';
import { LINK_META, PROFILE, type LinkProfile, isExternal, isFilled, visibleLinks } from './linkProfile';

const base: LinkProfile = {
  name: 'Mohira ustoz',
  role: 'Mental arifmetika ustozi',
  city: null,
  logo: null,
  avatar: null,
  badges: [],
  links: [],
  gallery: [],
  testimonials: [],
};

describe('visibleLinks', () => {
  it('drops a row that has nowhere to go', () => {
    const profile = {
      ...base,
      links: [
        { kind: 'telegram', title: 'Kanal', href: 'https://t.me/example' },
        { kind: 'instagram', title: 'Instagram', href: '' },
        { kind: 'youtube', title: 'YouTube', href: '   ' },
      ],
    } satisfies LinkProfile;

    expect(visibleLinks(profile).map((link) => link.kind)).toEqual(['telegram']);
  });
});

describe('isExternal', () => {
  it('separates outside services from our own paths', () => {
    expect(isExternal('https://t.me/example')).toBe(true);
    expect(isExternal('tel:+998901234567')).toBe(true);
    expect(isExternal('mailto:a@b.uz')).toBe(true);
    expect(isExternal('/')).toBe(false);
    expect(isExternal('/login')).toBe(false);
  });
});

describe('isFilled', () => {
  it('is false while only the name is known', () => {
    expect(isFilled(base)).toBe(false);
  });

  it('is true as soon as there is anything to show', () => {
    expect(isFilled({ ...base, links: [{ kind: 'map', title: 'Manzil', href: 'https://yandex.uz' }] })).toBe(
      true,
    );
    expect(isFilled({ ...base, gallery: [{ src: '/link/a.webp', caption: 'Dars' }] })).toBe(true);
    expect(isFilled({ ...base, testimonials: [{ text: 'Zo‘r', author: 'Ota-ona' }] })).toBe(true);
  });
});

describe('PROFILE', () => {
  it('has an icon for every kind of link it uses', () => {
    for (const link of PROFILE.links) expect(LINK_META[link.kind]).toBeDefined();
  });

  it('keeps a way back into the platform', () => {
    expect(visibleLinks(PROFILE).some((link) => link.kind === 'platform')).toBe(true);
  });

  it('has exactly one primary action, and it is the parent-facing one', () => {
    const primary = visibleLinks(PROFILE).filter((link) => link.primary);
    expect(primary).toHaveLength(1);
    expect(primary[0].href).toBe('https://t.me/Mohira_Ravshan_qizi');
  });

  it('never shows the same address twice', () => {
    const hrefs = visibleLinks(PROFILE).map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
