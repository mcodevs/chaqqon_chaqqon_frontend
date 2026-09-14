import { DigitCharacter } from './DigitCharacter';

/** Digit mascot picked deterministically from a name, so a person always gets the same one. */
export function NameAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return <DigitCharacter digit={(name.codePointAt(0) ?? 0) % 10} size={size} />;
}
