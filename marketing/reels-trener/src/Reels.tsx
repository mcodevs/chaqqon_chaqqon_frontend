import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { FPS, SCENES, type SceneId, at } from './timeline';
import {
  Abacus,
  Badge,
  C,
  F,
  GreenBackground,
  IconRow,
  Logo,
  Phone,
  Pill,
  Pop,
  STATUS_H,
  SceneShell,
  WarmBackground,
  boxed,
  headline,
  sub,
  useIn,
  useT,
} from './ui';

function Scene({ id, children, green }: { id: SceneId; children: ReactNode; green?: boolean }) {
  const [from, to] = SCENES[id];
  return (
    <Sequence from={Math.round(from * FPS)} durationInFrames={Math.round((to - from) * FPS)} name={id}>
      <SceneShell duration={to - from} bg={green ? <GreenBackground /> : undefined}>
        {children}
      </SceneShell>
    </Sequence>
  );
}

/** Headline block in the top third, clear of the Reels UI. */
function Top({ children, top = 250, gap = 22 }: { children: ReactNode; top?: number; gap?: number }) {
  return (
    <div style={{ position: 'absolute', top, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>
      {children}
    </div>
  );
}

const Hl = ({ children, color = C.primary }: { children: ReactNode; color?: string }) => <span style={{ color }}>{children}</span>;

const lift = (color: string) => `0 14px 0 ${color}, 0 24px 40px rgba(60,40,10,0.18)`;

// ───────────────────────── scenes ─────────────────────────

function Hook() {
  const t = useT();
  const shake = t > at('hook', 2.24) && t < at('hook', 2.6) ? Math.sin(t * 90) * 4 : 0;
  return (
    <>
      <Top top={300}>
        <Pop>
          <Badge emoji="🎙️" label="DIQQAT, YANGILIK!" color={C.accent} />
        </Pop>
        <Pop delay={0.15}>
          <div style={{ ...headline, fontSize: 112, color: C.primary }}>MENTAL ARIFMETIKA</div>
        </Pop>
        <Pop delay={0.75}>
          <div style={{ ...headline, fontSize: 112 }}>TRENERLARI,</div>
        </Pop>
        <Pop delay={1.44}>
          <div style={{ ...sub, fontSize: 56, marginTop: 20 }}>sizlar uchun</div>
        </Pop>
        <Pop delay={2.2}>
          <div style={{ transform: `rotate(-2deg) translateX(${shake}px)` }}>
            <Pill size={88} bg={C.accent} emojiRight="🧮" radius={34} shadow={lift('#c96c10')}>
              ajoyib yangilik!
            </Pill>
          </div>
        </Pop>
      </Top>
      <div style={{ position: 'absolute', top: 1230, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Pop delay={0.4} from={200}>
          <Abacus
            rodW={104}
            steps={[
              { t: 0, value: 0 },
              { t: 0.8, value: 7 },
              { t: 1.5, value: 27 },
              { t: 2.2, value: 527 },
              { t: 2.9, value: 2026 },
            ]}
          />
        </Pop>
      </div>
    </>
  );
}

function Question() {
  // Nothing sits below the text here, so the block is centred rather than pinned to the top.
  const words = [
    { w: 'qiziqarli', t: 5.02, emoji: '🎉', c: C.accent, tint: C.accentSoft },
    { w: 'samarali', t: 5.8, emoji: '🎯', c: C.primary, tint: C.primarySoft },
    { w: 'zamonaviy', t: 6.42, emoji: '🚀', c: C.info, tint: C.infoSoft },
  ];
  return (
    <Top top={560} gap={26}>
      <Pop>
        <div style={{ ...headline, fontSize: 84 }}>Darslaringizni yanada</div>
      </Pop>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16, width: '100%' }}>
        {words.map(({ w, t, emoji, c, tint }) => (
          <Pop key={w} delay={at('question', t) - 0.1} from={60}>
            <IconRow emoji={emoji} tint={tint} color={c} size={64} right={<span style={{ fontSize: 58, color: C.primary, lineHeight: 1 }}>✓</span>}>
              {w}
            </IconRow>
          </Pop>
        ))}
      </div>
      <Pop delay={at('question', 6.86)}>
        <div style={{ ...headline, fontSize: 72, marginTop: 24 }}>
          tashkil qilishni <Hl color={C.accent}>xohlaysizmi?</Hl>
        </div>
      </Pop>
    </Top>
  );
}

function LogoReveal() {
  const t = useT();
  const domain = 'chaqqon-chaqqon.uz';
  const typed = Math.round(interpolate(t, [at('logo', 9.5), at('logo', 10.6)], [0, domain.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300 }}>
      <Pop>
        <div style={{ ...sub, color: '#d8f0dd', fontSize: 54 }}>Unda sizga</div>
      </Pop>
      <div style={{ marginTop: 50 }}>
        <Logo size={560} delay={0.25} />
      </div>
      <div style={{ marginTop: 70, ...headline, fontSize: 92, color: '#fff', minHeight: 110 }}>
        {domain.slice(0, typed)}
        <span style={{ opacity: t >= at('logo', 9.4) && typed < domain.length && Math.floor(t * 4) % 2 === 0 ? 1 : 0 }}>|</span>
      </div>
      <Pop delay={at('logo', 11.3)}>
        <div style={{ ...sub, color: '#fff', fontSize: 58, marginTop: 30 }}>platformasini taqdim etamiz! 🚀</div>
      </Pop>
    </AbsoluteFill>
  );
}

function Platform() {
  return (
    <>
      <Top top={230}>
        <Pop>
          <div style={{ ...headline, fontSize: 70 }}>
            <Hl>Mental arifmetika trenerlari</Hl> uchun ishlab chiqilgan
          </div>
        </Pop>
        <Pop delay={at('platform', 15.7)}>
          <div style={{ ...sub, fontSize: 46 }}>dars jarayonini yengillashtiradigan qulay platforma</div>
        </Pop>
      </Top>
      <Phone src="screens/teacher-students-full.png" top={640} delay={0.3} scrollTo={0.55} scrollDuration={5} />
    </>
  );
}

const ANZAN_NUMBERS = ['anzan-1', 'anzan-4', 'anzan-6', 'anzan-9'];
const ANZAN_BLANK = 'anzan-3';

function Tasavvur() {
  const t = useT();
  // A number holds 0.6 s, then a 0.15 s blank — the drill's own rhythm.
  const period = 0.75;
  const local = Math.max(0, t - 0.6);
  const step = Math.floor(local / period);
  const blank = local % period > 0.6;
  const name = t < 0.6 ? 'anzan-0' : blank ? ANZAN_BLANK : ANZAN_NUMBERS[step % ANZAN_NUMBERS.length];
  return (
    <>
      <Top>
        <Badge emoji="🧠" label="Tasavvur mashqlari" />
        <Pop delay={0.2}>
          <div style={{ ...headline, fontSize: 70 }}>
            Bolalarning <Hl>tasavvur qobiliyatini</Hl> rivojlantiring
          </div>
        </Pop>
      </Top>
      <Phone src={`screens/${name}.png`} top={720} delay={0.2} />
    </>
  );
}

function Flash() {
  const t = useT();
  // The flash card's own loop: the card shows, blinks away, then the app asks what was on it.
  const cycle = 2.2;
  const local = Math.max(0, t - 0.4) % cycle;
  const screen = local < 1.1 ? 'flash-1' : 'flash-3';
  const blink = local >= 1.0 && local < 1.15;
  return (
    <>
      <Top>
        <Badge emoji="⚡" label="Flesh-kartalar" color={C.accent} />
        <Pop delay={0.2}>
          <div style={{ ...headline, fontSize: 70 }}>
            <Hl color={C.accent}>Tezkor hisoblash</Hl> ko‘nikmalari
          </div>
        </Pop>
      </Top>
      <Phone src={`screens/${t < 0.4 ? 'flash-0' : screen}.png`} top={720} delay={0.1}>
        {blink && <AbsoluteFill style={{ background: 'rgba(255,255,255,0.85)' }} />}
      </Phone>
    </>
  );
}

function Abakus() {
  const levels = ['Formulasiz', 'Kichik do‘st', 'Katta do‘st', 'Miks formula'];
  const t = useT();
  return (
    <>
      <Top top={240}>
        <Badge emoji="🧮" label="Abakus" color={C.abacus.frame} />
        <Pop delay={0.2}>
          <div style={{ ...headline, fontSize: 70 }}>
            Abakusda <Hl color={C.accent}>raqam terishni</Hl> o‘rgating
          </div>
        </Pop>
      </Top>
      <div style={{ position: 'absolute', top: 590, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Pop delay={0.3} from={120}>
          <Abacus
            rodW={104}
            steps={[
              { t: 0, value: 0 },
              { t: 0.9, value: 3 },
              { t: 1.5, value: 8 },
              { t: 2.1, value: 26 },
              { t: 2.7, value: 159 },
              { t: 3.4, value: 1234 },
              { t: 4.2, value: 2026 },
            ]}
          />
        </Pop>
      </div>
      {/* A stepper: one column, a rail joining the numbers, the last step lit. */}
      <div style={{ position: 'absolute', top: 1270, left: 120, right: 120 }}>
        <Pop delay={at('abakus', 31.9)}>
          <div style={{ ...sub, fontSize: 40, color: C.ink, marginBottom: 20 }}>Mavzular — bosqichma-bosqich</div>
        </Pop>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'absolute', left: 52, top: 30, bottom: 30, width: 6, background: C.border, borderRadius: 3 }} />
          {levels.map((l, i) => {
            const on = t > at('abakus', 32.4) + i * 0.32;
            const last = i === levels.length - 1;
            return (
              <Pop key={l} delay={at('abakus', 32.4) + i * 0.32} from={24}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
                  <span
                    style={{
                      width: 110,
                      display: 'flex',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 999,
                        background: last ? C.primary : C.card,
                        color: last ? '#fff' : C.primary,
                        border: `5px solid ${on ? C.primary : C.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: F.display,
                        fontWeight: 800,
                        fontSize: 32,
                      }}
                    >
                      <span style={boxed}>{i + 1}</span>
                    </span>
                  </span>
                  <div
                    style={{
                      flex: 1,
                      background: last ? C.primary : C.card,
                      color: last ? '#fff' : C.ink,
                      borderRadius: 24,
                      padding: '18px 30px',
                      boxShadow: '0 10px 26px rgba(60,40,10,0.1)',
                      fontFamily: F.display,
                      fontWeight: 800,
                      fontSize: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={boxed}>{l}</span>
                    {last && <span style={{ fontSize: 38, lineHeight: 1 }}>⭐</span>}
                  </div>
                </div>
              </Pop>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** worksheet-sheet.png is 1308×1858; these are regions of it in image pixels. */
const SHEET = { w: 1308, h: 1858 };
const SHEET_PARTS = [
  { label: 'Ismingiz', t: 35.6, x: 50, y: 1766, w: 230, h: 36, scale: 3 },
  { label: 'O‘quv markazingiz', t: 36.4, x: 50, y: 72, w: 400, h: 42, scale: 2.1 },
  { label: 'Telefon raqamingiz', t: 37.84, x: 1108, y: 74, w: 150, h: 38, scale: 3.6 },
];

/** A loupe: one region of the sheet blown up into its own card. */
function Loupe({ x, y, w, h, scale }: { x: number; y: number; w: number; h: number; scale: number }) {
  return (
    <div style={{ width: w * scale, height: h * scale, overflow: 'hidden', position: 'relative', background: '#fff' }}>
      <Img src={staticFile('screens/worksheet-sheet.png')} style={{ position: 'absolute', width: SHEET.w * scale, left: -x * scale, top: -y * scale }} />
    </div>
  );
}

function Yozma() {
  const t = useT();
  const enter = useIn(0.15, { damping: 18, stiffness: 80 });
  const sheetTop = 700;
  const sheetW = 780;
  const k = sheetW / SHEET.w;
  const calloutsOut = interpolate(t, [at('yozma', 40.5), at('yozma', 40.9)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <Top top={240}>
        <Badge emoji="📝" label="Yozma vazifalar" />
        <Pop delay={0.2}>
          <div style={{ ...headline, fontSize: 66 }}>
            O‘z nomingiz bilan <Hl>tayyor varaqlar</Hl>
          </div>
        </Pop>
      </Top>
      <div
        style={{
          position: 'absolute',
          top: sheetTop,
          left: (1080 - sheetW) / 2,
          width: sheetW,
          height: SHEET.h * k,
          transform: `translateY(${(1 - enter) * 700}px) rotate(${(1 - enter) * 8 - 1}deg)`,
        }}
      >
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 14, boxShadow: '0 30px 80px rgba(60,40,10,0.25)', background: '#fff', position: 'relative' }}>
          <Img src={staticFile('screens/worksheet-sheet.png')} style={{ width: '100%' }} />
          {SHEET_PARTS.map((r) => (
            <div
              key={r.label}
              style={{
                position: 'absolute',
                left: (r.x - 10) * k,
                top: (r.y - 10) * k,
                width: (r.w + 20) * k,
                height: (r.h + 20) * k,
                borderRadius: 10,
                border: `5px solid ${C.accent}`,
                opacity: (t > at('yozma', r.t) ? 1 : 0) * calloutsOut,
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 930, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, opacity: calloutsOut }}>
        {SHEET_PARTS.map((r) => (
          <Pop key={r.label} delay={at('yozma', r.t)} from={40}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Pill size={34} padX={26} radius={0} shadow="none" style={{ borderRadius: '20px 20px 0 0', gap: 10 }} emoji="✓">
                {r.label}
              </Pill>
              <div style={{ borderRadius: 24, overflow: 'hidden', border: `6px solid ${C.primary}`, boxShadow: '0 18px 44px rgba(60,40,10,0.3)', padding: '10px 18px', background: '#fff' }}>
                <Loupe {...r} />
              </div>
            </div>
          </Pop>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 1180, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Pop delay={at('yozma', 40.9)}>
          <Pill size={68} bg={C.accent} emoji="🖨️" radius={34} shadow={lift('#c96c10')}>
            Chop eting!
          </Pill>
        </Pop>
      </div>
    </>
  );
}

function UyVazifa() {
  const groups = [
    { g: 'A', c: '#5fb36b' },
    { g: 'B', c: C.info },
    { g: 'C', c: C.accent },
    { g: 'D', c: '#9b6fd6' },
  ];
  return (
    <>
      <Top top={230}>
        <Badge emoji="🏠" label="Interaktiv uy vazifalari" color={C.info} />
        <Pop delay={at('uyVazifa', 44.4)}>
          <div style={{ ...headline, fontSize: 64 }}>
            Har bir bolaga — <Hl>yoshi va darajasiga</Hl> qarab
          </div>
        </Pop>
      </Top>
      <Phone src="screens/homework.png" top={760} width={600} delay={0.2} />
      {groups.map(({ g, c }, i) => (
        <div key={g} style={{ position: 'absolute', top: 820 + i * 170, left: i % 2 ? 860 : 40 }}>
          <Pop delay={at('uyVazifa', 45.9) + i * 0.2} from={30}>
            <div
              style={{
                width: 170,
                height: 130,
                borderRadius: 36,
                background: c,
                color: '#fff',
                fontFamily: F.display,
                fontWeight: 800,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 12px 30px rgba(0,0,0,0.18), inset 0 -8px 0 rgba(0,0,0,0.15)',
              }}
            >
              <span style={{ ...boxed, fontSize: 52 }}>{g}</span>
              <span style={{ fontSize: 24, fontFamily: F.body, lineHeight: 1 }}>toifa</span>
            </div>
          </Pop>
        </div>
      ))}
      <div style={{ position: 'absolute', top: 1420, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Pop delay={at('uyVazifa', 48.3)}>
          <Pill size={54} emoji="💪" radius={30} shadow={lift(C.primaryDark)}>
            Bilimini mustahkamlang
          </Pill>
        </Pop>
      </div>
    </>
  );
}

/** Row cards in leaderboard.png, measured in capture pixels and scaled to the phone. */
const LB_ROW = { top: 357, pitch: 183, height: 160, left: 92, right: 1080 - 987 };

function Reyting() {
  const t = useT();
  const k = 640 / 1080;
  const row = Math.min(2, Math.floor(Math.max(0, t - 1.2) / 0.6));
  return (
    <>
      <Top top={230}>
        <Badge emoji="🏆" label="Reyting" color={C.gold} />
        <Pop delay={0.2}>
          <div style={{ ...headline, fontSize: 66 }}>
            Har bir o‘quvchining <Hl>natijasini</Hl> kuzating
          </div>
        </Pop>
      </Top>
      <Phone src="screens/leaderboard.png" top={680} delay={0.1}>
        {/* a highlight sweeping down the top three rows */}
        <div
          style={{
            position: 'absolute',
            left: LB_ROW.left * k - 6,
            right: LB_ROW.right * k - 6,
            height: LB_ROW.height * k + 12,
            top: STATUS_H + (LB_ROW.top + row * LB_ROW.pitch) * k - 6,
            borderRadius: 26,
            border: `6px solid ${C.gold}`,
            boxShadow: '0 0 0 4px rgba(224,163,43,0.25)',
            opacity: t > 1.2 ? 1 : 0,
          }}
        />
      </Phone>
    </>
  );
}

function Qismi() {
  const shots = ['teacher-students', 'stats', 'student-abacus', 'leaderboard', 'homework', 'flash-1'];
  return (
    <>
      <Top top={250}>
        <Pop>
          <div style={{ ...headline, fontSize: 76 }}>Va bular —</div>
        </Pop>
        <Pop delay={at('qismi', 54.4)}>
          <div style={{ ...headline, fontSize: 76 }}>
            imkoniyatlarning <Hl color={C.accent}>bir qismi, xolos!</Hl>
          </div>
        </Pop>
      </Top>
      <div style={{ position: 'absolute', top: 720, left: 60, right: 60, display: 'flex', flexWrap: 'wrap', gap: 30, justifyContent: 'center' }}>
        {shots.map((s, i) => (
          <Pop key={s} delay={0.3 + i * 0.18} from={80}>
            <div
              style={{
                width: 290,
                height: 560,
                borderRadius: 44,
                overflow: 'hidden',
                border: '8px solid #1a1a1d',
                boxShadow: '0 20px 40px rgba(60,40,10,0.22)',
                transform: `rotate(${(i % 3) * 3 - 3}deg)`,
                background: C.page,
              }}
            >
              <Img src={staticFile(`screens/${s}.png`)} style={{ width: '100%', marginTop: 26 }} />
            </div>
          </Pop>
        ))}
      </div>
    </>
  );
}

function Vaqt() {
  const t = useT();
  const strike = interpolate(t, [1.2, 1.7], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hand = t * 360;
  return (
    <>
      <Top top={300}>
        <Pop>
          <div style={{ ...headline, fontSize: 72 }}>Dars materiallarini tayyorlashga</div>
        </Pop>
        <Pop delay={at('vaqt', 59.7)}>
          <div style={{ ...headline, fontSize: 72 }}>
            <span style={{ position: 'relative', color: C.danger }}>
              ortiqcha vaqt
              <span style={{ position: 'absolute', left: 0, top: '52%', height: 12, width: `${strike}%`, background: C.ink, borderRadius: 6 }} />
            </span>{' '}
            sarflash
          </div>
        </Pop>
        <Pop delay={at('vaqt', 61.0)}>
          <div style={{ marginTop: 10 }}>
            <Pill size={80} emojiRight="✅" radius={32} shadow={lift(C.primaryDark)}>
              shart emas!
            </Pill>
          </div>
        </Pop>
      </Top>
      <div style={{ position: 'absolute', top: 960, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Pop delay={0.3} from={100}>
          <svg width="460" height="460" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="#fff" stroke={C.accent} strokeWidth="12" />
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x="97" y="20" width="6" height="16" rx="3" fill={C.inkSoft} transform={`rotate(${i * 30} 100 100)`} />
            ))}
            <rect x="96" y="45" width="8" height="58" rx="4" fill={C.ink} transform={`rotate(${hand / 12} 100 100)`} />
            <rect x="97" y="30" width="6" height="73" rx="3" fill={C.accent} transform={`rotate(${hand} 100 100)`} />
            <circle cx="100" cy="100" r="9" fill={C.ink} />
          </svg>
        </Pop>
      </div>
    </>
  );
}

function Imkoniyat() {
  return (
    <>
      <Top top={250}>
        <Pop>
          <div style={{ ...headline, fontSize: 76 }}>
            <Hl>Ko‘plab imkoniyatlar</Hl> sizni kutmoqda!
          </div>
        </Pop>
      </Top>
      <Phone src="screens/stats-full.png" top={620} delay={0.15} scrollTo={0.45} scrollDuration={2.6} />
    </>
  );
}

/** The app's smiling number tile, as a little character. */
function TileFace({ size, color, squash = 1 }: { size: number; color: string; squash?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `scaleY(${squash}) scaleX(${2 - squash})`, transformOrigin: '50% 100%', overflow: 'visible' }}>
      <defs>
        <radialGradient id="tileShine" cx="30%" cy="25%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="28" fill={color} />
      <rect x="4" y="4" width="92" height="92" rx="28" fill="url(#tileShine)" />
      <rect x="4" y="80" width="92" height="16" rx="8" fill="rgba(0,0,0,0.14)" />
      <circle cx="36" cy="44" r="6" fill="#27231b" />
      <circle cx="64" cy="44" r="6" fill="#27231b" />
      <path d="M36 62 q14 14 28 0" stroke="#27231b" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * "Yangi bosqich": four steps rise one after another and the tile hops up them, landing on
 * the top one under a trophy. Drawn straight on the page, no chart furniture.
 */
function Stairs({ start }: { start: number }) {
  const t = useT();
  const stepW = 200;
  const left = (1080 - stepW * 4) / 2;
  const base = 1660;
  const heights = [130, 250, 370, 490];
  const colors = ['#cfe9d5', '#a7d7b2', '#6dbb80', C.primary];
  const rise = heights.map((_, i) => useIn(start + i * 0.16, { damping: 14, stiffness: 110 }));
  // hops: tile is on step j until hop j starts, then flies to step j+1 in 0.34 s
  const hops = [start + 0.75, start + 1.15, start + 1.55, start + 1.95];
  const tile = 128;
  const cx = (i: number) => left + stepW * i + stepW / 2;
  const topY = (i: number) => base - heights[i];
  let x = cx(0);
  let y = topY(0);
  let squash = 1;
  let onTop = false;
  for (let j = 0; j < 3; j++) {
    if (t >= hops[j]) {
      const p = Math.min(1, (t - hops[j]) / 0.34);
      x = cx(j) + (cx(j + 1) - cx(j)) * p;
      y = topY(j) + (topY(j + 1) - topY(j)) * p - Math.sin(Math.PI * p) * 150;
      if (p >= 1 && t < hops[j] + 0.5) squash = 1 - 0.18 * Math.sin(((t - hops[j] - 0.34) / 0.16) * Math.PI);
      if (t < hops[j] + 0.34 && p < 0.3) squash = 1 + 0.12 * Math.sin((p / 0.3) * Math.PI);
    }
  }
  onTop = t >= hops[2] + 0.34;
  const landed = useIn(hops[2] + 0.34, { damping: 9, stiffness: 140 });
  const bob = onTop ? Math.sin((t - hops[2]) * 6) * 6 : 0;
  return (
    <>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: left + stepW * i,
            top: base - h * rise[i],
            width: stepW,
            height: h * rise[i],
            background: colors[i],
            borderRadius: '26px 26px 0 0',
            boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 22,
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 34,
            color: i === 3 ? '#fff' : C.primaryDark,
            opacity: rise[i],
          }}
        >
          <span style={{ opacity: t > hops[Math.min(i, 2)] + (i ? 0.34 : -0.75) ? 0.9 : 0.35, ...boxed }}>{i + 1}</span>
        </div>
      ))}
      <div style={{ position: 'absolute', left: left - 20, right: left - 20, top: base, height: 8, borderRadius: 4, background: C.border }} />
      <div style={{ position: 'absolute', left: x - tile / 2, top: y - tile + bob, width: tile, height: tile, opacity: rise[0] }}>
        <TileFace size={tile} color="#5fb36b" squash={squash} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: cx(3) - 60,
          top: topY(3) - tile - 130 + (1 - landed) * 40,
          fontSize: 100,
          lineHeight: 1,
          opacity: landed,
          transform: `scale(${0.6 + 0.4 * landed}) rotate(${Math.sin((t - hops[2]) * 5) * 6}deg)`,
          transformOrigin: '50% 100%',
        }}
      >
        🏆
      </div>
      {onTop &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const r = 90 + 60 * landed;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: cx(3) - 10 + Math.cos(a) * r,
                top: topY(3) - tile / 2 - 10 + Math.sin(a) * r * 0.8,
                width: 20,
                height: 20,
                borderRadius: 6,
                background: [C.accent, C.gold, '#5fb36b', C.info, '#e46a6a', '#9b6fd6'][i],
                opacity: Math.max(0, 1.2 - landed),
                transform: `rotate(${i * 50 + t * 200}deg)`,
              }}
            />
          );
        })}
    </>
  );
}

function Tayyor() {
  return (
    <>
      <Top top={300}>
        <Pop>
          <div style={{ ...headline, fontSize: 96, color: C.primary }}>Aziz trenerlar!</div>
        </Pop>
        <Pop delay={at('tayyor', 66.3)}>
          <div style={{ ...headline, fontSize: 68 }}>
            Darslaringizni <Hl color={C.accent}>yangi bosqichga</Hl> olib chiqishga
          </div>
        </Pop>
        <Pop delay={at('tayyor', 67.9)}>
          <div style={{ ...headline, fontSize: 92 }}>tayyormisiz? 🔥</div>
        </Pop>
      </Top>
      <Stairs start={at('tayyor', 66.3)} />
    </>
  );
}

/** Poster typography on the green stage: no cards, just the two promises, big. */
function Slogan() {
  const line = (who: string, what: string, color: string, delay: number) => (
    <Pop delay={delay} from={50}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: '#cfe9d5', letterSpacing: 1 }}>{who}</span>
        <span style={{ ...headline, fontSize: 112, color, letterSpacing: -2, textShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>{what}</span>
      </div>
    </Pop>
  );
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 240 }}>
      <Logo size={380} />
      <Pop delay={0.25}>
        <div style={{ ...headline, fontSize: 76, color: '#fff', marginTop: 44 }}>chaqqon-chaqqon.uz</div>
      </Pop>
      <div style={{ marginTop: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
        {line('Trenerlar uchun', 'qulaylik', '#fff', at('slogan', 70.84))}
        <Pop delay={at('slogan', 72.3)}>
          <div style={{ width: 160, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.35)' }} />
        </Pop>
        {line('Bolalar uchun', 'rivojlanish!', '#ffd166', at('slogan', 72.64))}
      </div>
    </AbsoluteFill>
  );
}

/** Three sticker pills, each in its own colour, dropped on slightly off the axis. */
function Final() {
  const lines = [
    { t: 74.18, emoji: '🧠', text: 'Chaqqonroq fikrlang', bg: C.primary, lift: C.primaryDark, rot: -2.5 },
    { t: 76.24, emoji: '⚡', text: 'Tezroq hisoblang', bg: C.accent, lift: '#c96c10', rot: 2 },
    { t: 77.48, emoji: '🏆', text: 'Yuqori natijalarga erishing!', bg: C.info, lift: '#1f5795', rot: -1.5 },
  ];
  return (
    <>
      <Top top={520}>
        <Pop>
          <div style={{ ...sub, fontSize: 52, color: C.inkSoft }}>Biz bilan</div>
        </Pop>
      </Top>
      <div style={{ position: 'absolute', top: 660, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 46 }}>
        {lines.map((l) => (
          <Pop key={l.text} delay={at('final', l.t)} from={90}>
            <div style={{ transform: `rotate(${l.rot}deg)` }}>
              <Pill size={58} bg={l.bg} emoji={l.emoji} radius={30} padX={44} shadow={lift(l.lift)}>
                {l.text}
              </Pill>
            </div>
          </Pop>
        ))}
      </div>
    </>
  );
}

function EndCard() {
  const pulse = 1 + Math.sin(useCurrentFrame() / 7) * 0.025;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 120 }}>
      <Logo size={640} />
      <Pop delay={0.35}>
        <div style={{ marginTop: 90, transform: `scale(${pulse})` }}>
          <Pill size={80} bg="#fff" color={C.primary} emoji="📞" radius={999} padX={54} shadow="0 20px 50px rgba(0,0,0,0.3)">
            +998 99 304 11 55
          </Pill>
        </div>
      </Pop>
    </AbsoluteFill>
  );
}

// ───────────────────────── composition ─────────────────────────

export function Reels() {
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <WarmBackground />
      <Scene id="hook">
        <Hook />
      </Scene>
      <Scene id="question">
        <Question />
      </Scene>
      <Scene id="logo" green>
        <LogoReveal />
      </Scene>
      <Scene id="platform">
        <Platform />
      </Scene>
      <Scene id="tasavvur">
        <Tasavvur />
      </Scene>
      <Scene id="flash">
        <Flash />
      </Scene>
      <Scene id="abakus">
        <Abakus />
      </Scene>
      <Scene id="yozma">
        <Yozma />
      </Scene>
      <Scene id="uyVazifa">
        <UyVazifa />
      </Scene>
      <Scene id="reyting">
        <Reyting />
      </Scene>
      <Scene id="qismi">
        <Qismi />
      </Scene>
      <Scene id="vaqt">
        <Vaqt />
      </Scene>
      <Scene id="imkoniyat">
        <Imkoniyat />
      </Scene>
      <Scene id="tayyor">
        <Tayyor />
      </Scene>
      <Scene id="slogan" green>
        <Slogan />
      </Scene>
      <Scene id="final">
        <Final />
      </Scene>
      <Scene id="end" green>
        <EndCard />
      </Scene>
      {/* Voice for previewing in the studio; the final mix (with ducked music) is done by scripts/mix.sh. */}
      <Audio src={staticFile('voice.m4a')} />
    </AbsoluteFill>
  );
}
