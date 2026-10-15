import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile } from 'remotion';
import { RoundedBox } from '@react-three/drei';
import { FPS, SCENES, type SceneId, at } from './timeline';
import { Badge, C, F, GreenBackground, Pill, Pop, SceneShell, STATUS_H, WarmBackground, headline, sub, useT } from './ui';
import { FloatingTiles, Stage, px } from './three/Stage';
import { Abacus3D, Clock3D, Coin, Plastic, Slab, Star, Text3D, TileChar, useIn } from './three/objects';
import { Phone3D } from './three/Phone3D';
import { useTexture } from './three/assets';

/*
 * The 3D cut of the trainer Reels. Same voice, same timeline as Reels.tsx; every hero element
 * is a real object in the studio (three/Stage.tsx) and the phones are CSS-3D slabs with
 * thickness. Small type stays HTML so it reads crisply at Reels size.
 */

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

/** HTML on top of the canvas. */
function Html({ children }: { children: ReactNode }) {
  return <AbsoluteFill style={{ pointerEvents: 'none' }}>{children}</AbsoluteFill>;
}

function Top({ children, top = 250, gap = 22 }: { children: ReactNode; top?: number; gap?: number }) {
  return (
    <div style={{ position: 'absolute', top, left: 60, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>
      {children}
    </div>
  );
}

const Hl = ({ children, color = C.primary }: { children: ReactNode; color?: string }) => <span style={{ color }}>{children}</span>;

/** A 3D object arriving: springs up from below, unrolls from a tilt, grows from small. */
function Enter({
  delay = 0,
  children,
  from = [0, -3, 0],
  tilt = [0, 0, 0],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  damping = 12,
  stiffness = 110,
}: {
  delay?: number;
  children: ReactNode;
  from?: [number, number, number];
  tilt?: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  damping?: number;
  stiffness?: number;
}) {
  const p = useIn(delay, { damping, stiffness });
  const s = Math.max(0.02, p);
  return (
    <group position={position} rotation={rotation}>
      <group
        position={[from[0] * (1 - p), from[1] * (1 - p), from[2] * (1 - p)]}
        rotation={[tilt[0] * (1 - p), tilt[1] * (1 - p), tilt[2] * (1 - p)]}
        scale={[s, s, s]}
      >
        {children}
      </group>
    </group>
  );
}

const Z = 0;
const P = (x: number, y: number, z = Z): [number, number, number] => [...px(x, y), z];

// ───────────────────────── scenes ─────────────────────────

function Hook() {
  const t = useT();
  const sway = Math.sin(t * 0.9) * 0.14;
  return (
    <>
      <Stage floorY={-8.35}>
        <FloatingTiles />
        <Enter delay={0.15} tilt={[-0.9, 0, 0]} position={P(540, 480)}>
          <Text3D text="MENTAL" size={1.25} color={C.primary} maxWidth={9.4} />
        </Enter>
        <Enter delay={0.35} tilt={[-0.9, 0, 0]} position={P(540, 625)}>
          <Text3D text="ARIFMETIKA" size={1.25} color={C.primary} maxWidth={9.4} />
        </Enter>
        <Enter delay={0.75} tilt={[-0.9, 0, 0]} position={P(540, 775)}>
          <Text3D text="TRENERLARI," size={1.25} color={C.ink} maxWidth={9.4} />
        </Enter>
        <Enter delay={2.2} from={[0, 0, 6]} tilt={[0, 0, 0.5]} position={P(540, 1000)} rotation={[0, 0, -0.045]} damping={9}>
          <Slab w={8.6} h={1.5} d={0.6} color={C.accent} radius={0.4}>
            <Text3D text="ajoyib yangilik!" size={0.74} depth={0.22} color="#fff" position={[0, 0, 0.32]} maxWidth={7.8} />
          </Slab>
        </Enter>
        <Enter delay={0.45} from={[0, -6, 0]} tilt={[0.6, -0.8, 0]} position={P(540, 1470)} rotation={[0.14, sway, 0]} damping={14} stiffness={80}>
          <Abacus3D
            rodW={1.02}
            steps={[
              { t: 0, value: 0 },
              { t: 0.8, value: 7 },
              { t: 1.5, value: 27 },
              { t: 2.2, value: 527 },
              { t: 2.9, value: 2026 },
            ]}
          />
        </Enter>
      </Stage>
      <Html>
        <Top top={300}>
          <Pop>
            <Badge emoji="🎙️" label="DIQQAT, YANGILIK!" color={C.accent} />
          </Pop>
        </Top>
        <Top top={852}>
          <Pop delay={1.44}>
            <div style={{ ...sub, fontSize: 56 }}>sizlar uchun</div>
          </Pop>
        </Top>
      </Html>
    </>
  );
}

function Question() {
  const words = [
    { w: 'qiziqarli', t: 5.02, c: C.accent },
    { w: 'samarali', t: 5.8, c: C.primary },
    { w: 'zamonaviy', t: 6.42, c: C.info },
  ];
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
        {words.map((x, i) => (
          <Enter key={x.w} delay={at('question', x.t) - 0.1} from={[i % 2 ? 9 : -9, 0, 2]} tilt={[0, i % 2 ? 1.2 : -1.2, 0]} position={P(540, 780 + i * 190)} rotation={[0, 0, (i - 1) * 0.02]} damping={13}>
            <Slab w={8.8} h={1.5} d={0.6} color={x.c} radius={0.42}>
              <Text3D text={x.w} size={0.8} depth={0.22} color="#fff" position={[0, 0, 0.32]} maxWidth={7.6} />
            </Slab>
          </Enter>
        ))}
      </Stage>
      <Html>
        <Top top={540}>
          <Pop>
            <div style={{ ...headline, fontSize: 84 }}>Darslaringizni yanada</div>
          </Pop>
        </Top>
        <Top top={1300}>
          <Pop delay={at('question', 6.86)}>
            <div style={{ ...headline, fontSize: 72 }}>
              tashkil qilishni <Hl color={C.accent}>xohlaysizmi?</Hl>
            </div>
          </Pop>
        </Top>
      </Html>
    </>
  );
}

function LogoReveal() {
  const t = useT();
  const spin = useIn(0.2, { damping: 16, stiffness: 60 });
  return (
    <>
      <Stage shadow={false} textures={['logo-coin.png']}>
        <group position={P(540, 760)} rotation={[0.08, (1 - spin) * Math.PI * 3 + Math.sin(t * 0.8) * 0.3, 0]} scale={Math.max(0.02, spin)}>
          <Coin radius={2.9} />
        </group>
        <Enter delay={at('logo', 9.5)} from={[0, -2, 4]} tilt={[-0.8, 0, 0]} position={P(540, 1185)} damping={12}>
          <Text3D text="chaqqon-chaqqon.uz" size={0.74} color="#fff" maxWidth={9.4} depth={0.4} />
        </Enter>
      </Stage>
      <Html>
        <Top top={330}>
          <Pop>
            <div style={{ ...sub, color: '#d8f0dd', fontSize: 54 }}>Unda sizga</div>
          </Pop>
        </Top>
        <Top top={1330}>
          <Pop delay={at('logo', 11.3)}>
            <div style={{ ...sub, color: '#fff', fontSize: 58 }}>platformasini taqdim etamiz! 🚀</div>
          </Pop>
        </Top>
      </Html>
    </>
  );
}

function Platform() {
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
      </Stage>
      <Html>
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
        <Phone3D src="screens/teacher-students-full.png" top={660} delay={0.3} scrollTo={0.55} scrollDuration={5} rotY={-18} />
      </Html>
    </>
  );
}

const ANZAN_NUMBERS = ['anzan-1', 'anzan-4', 'anzan-6', 'anzan-9'];

function Tasavvur() {
  const t = useT();
  const period = 0.75;
  const local = Math.max(0, t - 0.6);
  const blank = local % period > 0.6;
  const name = t < 0.6 ? 'anzan-0' : blank ? 'anzan-3' : ANZAN_NUMBERS[Math.floor(local / period) % ANZAN_NUMBERS.length];
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
      </Stage>
      <Html>
        <Top>
          <Badge emoji="🧠" label="Tasavvur mashqlari" />
          <Pop delay={0.2}>
            <div style={{ ...headline, fontSize: 70 }}>
              Bolalarning <Hl>tasavvur qobiliyatini</Hl> rivojlantiring
            </div>
          </Pop>
        </Top>
        <Phone3D src={`screens/${name}.png`} top={720} delay={0.2} rotY={14} />
      </Html>
    </>
  );
}

function Flash() {
  const t = useT();
  const cycle = 2.2;
  const local = Math.max(0, t - 0.4) % cycle;
  const screen = local < 1.1 ? 'flash-1' : 'flash-3';
  const blink = local >= 1.0 && local < 1.15;
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
      </Stage>
      <Html>
        <Top>
          <Badge emoji="⚡" label="Flesh-kartalar" color={C.accent} />
          <Pop delay={0.2}>
            <div style={{ ...headline, fontSize: 70 }}>
              <Hl color={C.accent}>Tezkor hisoblash</Hl> ko‘nikmalari
            </div>
          </Pop>
        </Top>
        <Phone3D src={`screens/${t < 0.4 ? 'flash-0' : screen}.png`} top={720} delay={0.1} rotY={-14}>
          {blink && <AbsoluteFill style={{ background: 'rgba(255,255,255,0.85)' }} />}
        </Phone3D>
      </Html>
    </>
  );
}

function Abakus() {
  const t = useT();
  const levels = ['Formulasiz', 'Kichik do‘st', 'Katta do‘st', 'Miks formula'];
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
        <Enter delay={0.3} from={[0, -4, 6]} tilt={[0.5, -1.2, 0]} position={P(540, 880)} rotation={[0.16, Math.sin(t * 0.7) * 0.32, 0]} damping={15} stiffness={70}>
          <Abacus3D
            rodW={1.0}
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
        </Enter>
        {levels.map((l, i) => {
          const last = i === levels.length - 1;
          return (
            <Enter key={l} delay={at('abakus', 32.4) + i * 0.32} from={[-10, 0, 0]} tilt={[0, -1, 0]} position={P(540, 1365 + i * 112, 1.5)} damping={14}>
              <Slab w={7.4} h={0.92} d={0.5} color={last ? C.primary : '#fff'} radius={0.3}>
                <Text3D text={`${i + 1}  ·  ${l}`} size={0.4} depth={0.12} color={last ? '#fff' : C.ink} position={[0, 0, 0.27]} maxWidth={6.6} bevel={0.015} />
              </Slab>
            </Enter>
          );
        })}
      </Stage>
      <Html>
        <Top top={240}>
          <Badge emoji="🧮" label="Abakus" color={C.abacus.frame} />
          <Pop delay={0.2}>
            <div style={{ ...headline, fontSize: 70 }}>
              Abakusda <Hl color={C.accent}>raqam terishni</Hl> o‘rgating
            </div>
          </Pop>
        </Top>
        <Top top={1262}>
          <Pop delay={at('abakus', 31.9)}>
            <div style={{ ...sub, fontSize: 40, color: C.ink }}>Mavzular — bosqichma-bosqich</div>
          </Pop>
        </Top>
      </Html>
    </>
  );
}

const SHEET = { w: 1308, h: 1858 };
const SHEET_PARTS = [
  { label: 'Ismingiz', t: 35.6, x: 50, y: 1766, w: 230, h: 36, scale: 3 },
  { label: 'O‘quv markazingiz', t: 36.4, x: 50, y: 72, w: 400, h: 42, scale: 2.1 },
  { label: 'Telefon raqamingiz', t: 37.84, x: 1108, y: 74, w: 150, h: 38, scale: 3.6 },
];

function Loupe({ x, y, w, h, scale }: { x: number; y: number; w: number; h: number; scale: number }) {
  return (
    <div style={{ width: w * scale, height: h * scale, overflow: 'hidden', position: 'relative', background: '#fff' }}>
      <Img src={staticFile('screens/worksheet-sheet.png')} style={{ position: 'absolute', width: SHEET.w * scale, left: -x * scale, top: -y * scale }} />
    </div>
  );
}

/** The printed sheet as a real sheet of paper: a thin white slab carrying the capture. */
function Paper({ w }: { w: number }) {
  const tex = useTexture('screens/worksheet-sheet.png');
  const h = (w * SHEET.h) / SHEET.w;
  return (
    <group>
      <mesh position={[0, 0, -0.06]} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.1]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Yozma() {
  const t = useT();
  const calloutsOut = interpolate(t, [at('yozma', 40.5), at('yozma', 40.9)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <Stage shadow={false} textures={['screens/worksheet-sheet.png']}>
        <FloatingTiles />
        <Enter delay={0.15} from={[0, -8, 4]} tilt={[0.9, 0, 0.25]} position={P(540, 1250)} rotation={[-0.08, Math.sin(t * 0.6) * 0.12, -0.02]} damping={16} stiffness={70}>
          <Paper w={7.6} />
        </Enter>
        <Enter delay={at('yozma', 40.9)} from={[0, 0, 7]} tilt={[0, 0, 0.4]} position={P(540, 1180, 3)} rotation={[0, 0, -0.04]} damping={9}>
          <Slab w={6.2} h={1.4} d={0.6} color={C.accent} radius={0.4}>
            <Text3D text="Chop eting!" size={0.7} depth={0.22} color="#fff" position={[0, 0, 0.32]} maxWidth={5.4} />
          </Slab>
        </Enter>
      </Stage>
      <Html>
        <Top top={240}>
          <Badge emoji="📝" label="Yozma vazifalar" />
          <Pop delay={0.2}>
            <div style={{ ...headline, fontSize: 66 }}>
              O‘z nomingiz bilan <Hl>tayyor varaqlar</Hl>
            </div>
          </Pop>
        </Top>
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
      </Html>
    </>
  );
}

function UyVazifa() {
  const t = useT();
  const groups = [
    { g: 'A', c: '#5fb36b', x: 125, y: 900 },
    { g: 'B', c: C.info, x: 955, y: 1040 },
    { g: 'C', c: C.accent, x: 125, y: 1210 },
    { g: 'D', c: '#9b6fd6', x: 955, y: 1350 },
  ];
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
        {groups.map(({ g, c, x, y }, i) => (
          <Enter key={g} delay={at('uyVazifa', 45.9) + i * 0.2} from={[0, 0, 8]} tilt={[1.2, 1.2, 0]} position={P(x, y, 2)} rotation={[0.1 + Math.sin(t * 1.1 + i) * 0.1, -0.3 + Math.sin(t * 0.8 + i) * 0.25, 0]} damping={10}>
            <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.32} smoothness={6} castShadow>
              <Plastic color={c} clearcoat={1} roughness={0.3} />
            </RoundedBox>
            <Text3D text={g} size={0.8} depth={0.12} color="#fff" position={[0, 0, 0.75]} bevel={0.02} />
          </Enter>
        ))}
      </Stage>
      <Html>
        <Top top={230}>
          <Badge emoji="🏠" label="Interaktiv uy vazifalari" color={C.info} />
          <Pop delay={at('uyVazifa', 44.4)}>
            <div style={{ ...headline, fontSize: 64 }}>
              Har bir bolaga — <Hl>yoshi va darajasiga</Hl> qarab
            </div>
          </Pop>
        </Top>
        <Phone3D src="screens/homework.png" top={770} width={580} delay={0.2} rotY={-10} driftY={4} />
        <div style={{ position: 'absolute', top: 1430, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <Pop delay={at('uyVazifa', 48.3)}>
            <Pill size={54} emoji="💪" radius={30} shadow={`0 14px 0 ${C.primaryDark}, 0 24px 40px rgba(60,40,10,0.18)`}>
              Bilimini mustahkamlang
            </Pill>
          </Pop>
        </div>
      </Html>
    </>
  );
}

const LB_ROW = { top: 357, pitch: 183, height: 160, left: 92, right: 1080 - 987 };

function Reyting() {
  const t = useT();
  const k = 620 / 1080;
  const row = Math.min(2, Math.floor(Math.max(0, t - 1.2) / 0.6));
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
      </Stage>
      <Html>
        <Top top={230}>
          <Badge emoji="🏆" label="Reyting" color={C.gold} />
          <Pop delay={0.2}>
            <div style={{ ...headline, fontSize: 66 }}>
              Har bir o‘quvchining <Hl>natijasini</Hl> kuzating
            </div>
          </Pop>
        </Top>
        <Phone3D src="screens/leaderboard.png" top={690} delay={0.1} rotY={12}>
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
        </Phone3D>
      </Html>
    </>
  );
}

function Qismi() {
  const shots = ['teacher-students', 'stats', 'student-abacus', 'leaderboard', 'homework', 'flash-1'];
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
      </Stage>
      <Html>
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
        {shots.map((s, i) => {
          const col = i % 3;
          const rowI = Math.floor(i / 3);
          return (
            <Phone3D
              key={s}
              src={`screens/${s}.png`}
              width={290}
              left={60 + col * 335}
              top={700 + rowI * 600 + (col === 1 ? 40 : 0)}
              delay={0.25 + i * 0.16}
              rotY={[-18, 0, 18][col]}
              rotX={6}
              driftY={3}
            />
          );
        })}
      </Html>
    </>
  );
}

function Vaqt() {
  const t = useT();
  const strike = interpolate(t, [1.2, 1.7], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
        <Enter delay={0.3} from={[0, -5, 3]} tilt={[0.8, 0, 0]} position={P(540, 1230)} rotation={[0.12, Math.sin(t * 0.7) * 0.3, 0]} damping={14} stiffness={80}>
          <Clock3D radius={2.3} t={t} />
        </Enter>
        <Enter delay={at('vaqt', 61.0)} from={[0, 0, 7]} tilt={[0, 0, 0.4]} position={P(540, 700, 2)} rotation={[0, 0, -0.03]} damping={9}>
          <Slab w={6.8} h={1.5} d={0.6} color={C.primary} radius={0.42}>
            <Text3D text="shart emas!" size={0.78} depth={0.22} color="#fff" position={[0, 0, 0.32]} maxWidth={6} />
          </Slab>
        </Enter>
      </Stage>
      <Html>
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
        </Top>
      </Html>
    </>
  );
}

function Imkoniyat() {
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
      </Stage>
      <Html>
        <Top top={250}>
          <Pop>
            <div style={{ ...headline, fontSize: 76 }}>
              <Hl>Ko‘plab imkoniyatlar</Hl> sizni kutmoqda!
            </div>
          </Pop>
        </Top>
        <Phone3D src="screens/stats-full.png" top={640} delay={0.15} scrollTo={0.45} scrollDuration={2.6} rotY={-16} />
      </Html>
    </>
  );
}

/** Four steps rise; the tile hops up them and a star lands on top. All in world units. */
function Stairs3D({ start }: { start: number }) {
  const t = useT();
  const stepW = 2.0;
  const depth = 2.4;
  const heights = [1.3, 2.5, 3.7, 4.9];
  const colors = ['#cfe9d5', '#a7d7b2', '#6dbb80', C.primary];
  const baseY = -7.0;
  const x0 = -stepW * 1.5;
  const rise = heights.map((_, i) => useIn(start + i * 0.16, { damping: 14, stiffness: 110 }));
  const hops = [start + 0.75, start + 1.15, start + 1.55];
  const cx = (i: number) => x0 + stepW * i;
  const topY = (i: number) => baseY + heights[i];
  let x = cx(0);
  let y = topY(0);
  let squash = 1;
  for (let j = 0; j < 3; j++) {
    if (t >= hops[j]) {
      const p = Math.min(1, (t - hops[j]) / 0.34);
      x = cx(j) + (cx(j + 1) - cx(j)) * p;
      y = topY(j) + (topY(j + 1) - topY(j)) * p + Math.sin(Math.PI * p) * 1.6;
      if (p >= 1 && t < hops[j] + 0.5) squash = 1 - 0.18 * Math.sin(((t - hops[j] - 0.34) / 0.16) * Math.PI);
      if (t < hops[j] + 0.34 && p < 0.3) squash = 1 + 0.12 * Math.sin((p / 0.3) * Math.PI);
    }
  }
  const onTop = t >= hops[2] + 0.34;
  const landed = useIn(hops[2] + 0.34, { damping: 9, stiffness: 140 });
  const bob = onTop ? Math.sin((t - hops[2]) * 6) * 0.06 : 0;
  const tile = 1.3;
  return (
    <group>
      {heights.map((h, i) => (
        <group key={i} position={[cx(i), baseY + (h * rise[i]) / 2, 0]} scale={[1, Math.max(0.02, rise[i]), 1]}>
          <RoundedBox args={[stepW - 0.12, h, depth]} radius={0.18} smoothness={5} castShadow receiveShadow>
            <Plastic color={colors[i]} clearcoat={0.6} roughness={0.45} />
          </RoundedBox>
        </group>
      ))}
      <group position={[x, y + tile / 2 + bob, 0.2]}>
        <TileChar size={tile} color="#5fb36b" squash={squash} rotation={[0, Math.sin(t * 2) * 0.08, 0]} />
      </group>
      <group position={[cx(3), topY(3) + tile + 1.0 + (1 - landed) * 0.6, 0.2]} rotation={[0, Math.sin((t - hops[2]) * 1.4) * 0.6, 0]} scale={Math.max(0.02, landed)}>
        <Star size={0.9} />
      </group>
      {onTop &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          const r = 1.2 + 1.0 * landed;
          return (
            <mesh key={i} position={[cx(3) + Math.cos(a) * r, topY(3) + tile / 2 + Math.sin(a) * r * 0.8 + 0.6, 1.2]} rotation={[t * 3 + i, t * 2, 0]} scale={Math.max(0.02, 1.2 - landed)}>
              <boxGeometry args={[0.22, 0.22, 0.22]} />
              <meshStandardMaterial color={[C.accent, C.gold, '#5fb36b', C.info, '#e46a6a', '#9b6fd6'][i]} />
            </mesh>
          );
        })}
    </group>
  );
}

function Tayyor() {
  const t = useT();
  return (
    <>
      <Stage floorY={-7}>
        <FloatingTiles />
        <group rotation={[0.12, Math.sin(t * 0.5) * 0.18 - 0.1, 0]}>
          <Stairs3D start={at('tayyor', 66.3)} />
        </group>
      </Stage>
      <Html>
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
      </Html>
    </>
  );
}

function Slogan() {
  const t = useT();
  return (
    <>
      <Stage shadow={false} textures={['logo-coin.png']}>
        <Enter delay={0} from={[0, 3, 0]} tilt={[0, 2, 0]} position={P(540, 430)} rotation={[0.06, Math.sin(t * 0.8) * 0.3, 0]} damping={14} stiffness={70}>
          <Coin radius={1.9} />
        </Enter>
        <Enter delay={0.25} from={[0, -1, 3]} position={P(540, 740)} damping={12}>
          <Text3D text="chaqqon-chaqqon.uz" size={0.58} color="#fff" maxWidth={8.6} depth={0.3} />
        </Enter>
        <Enter delay={at('slogan', 70.84)} from={[0, -2, 5]} tilt={[-0.9, 0, 0]} position={P(540, 1040)} damping={11}>
          <Text3D text="qulaylik" size={1.3} color="#fff" maxWidth={9.2} depth={0.5} />
        </Enter>
        <Enter delay={at('slogan', 72.64)} from={[0, -2, 5]} tilt={[-0.9, 0, 0]} position={P(540, 1400)} damping={11}>
          <Text3D text="rivojlanish!" size={1.3} color="#ffd166" maxWidth={9.2} depth={0.5} />
        </Enter>
      </Stage>
      <Html>
        <Top top={880}>
          <Pop delay={at('slogan', 70.84) - 0.1}>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: '#cfe9d5', letterSpacing: 1 }}>Trenerlar uchun</div>
          </Pop>
        </Top>
        <Top top={1180}>
          <Pop delay={at('slogan', 72.3)}>
            <div style={{ width: 160, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.35)' }} />
          </Pop>
        </Top>
        <Top top={1240}>
          <Pop delay={at('slogan', 72.64) - 0.1}>
            <div style={{ fontFamily: F.body, fontWeight: 800, fontSize: 44, color: '#cfe9d5', letterSpacing: 1 }}>Bolalar uchun</div>
          </Pop>
        </Top>
      </Html>
    </>
  );
}

function Final() {
  const lines = [
    { t: 74.18, text: 'Chaqqonroq fikrlang', bg: C.primary, w: 8.4, rot: -0.04 },
    { t: 76.24, text: 'Tezroq hisoblang', bg: C.accent, w: 7.4, rot: 0.035 },
    { t: 77.48, text: 'Yuqori natijalarga erishing!', bg: C.info, w: 9.6, rot: -0.025 },
  ];
  return (
    <>
      <Stage shadow={false}>
        <FloatingTiles />
        {lines.map((l, i) => (
          <Enter key={l.text} delay={at('final', l.t)} from={[0, 5, 6]} tilt={[-1.1, 0, 0.3]} position={P(540, 780 + i * 205, i * 0.3)} rotation={[0, 0, l.rot]} damping={11}>
            <Slab w={l.w} h={1.5} d={0.6} color={l.bg} radius={0.42}>
              <Text3D text={l.text} size={0.66} depth={0.2} color="#fff" position={[0, 0, 0.32]} maxWidth={l.w - 0.9} />
            </Slab>
          </Enter>
        ))}
      </Stage>
      <Html>
        <Top top={560}>
          <Pop>
            <div style={{ ...sub, fontSize: 52, color: C.inkSoft }}>Biz bilan</div>
          </Pop>
        </Top>
      </Html>
    </>
  );
}

function EndCard() {
  const t = useT();
  return (
    <Stage shadow={false} textures={['logo-coin.png']}>
      <Enter delay={0} from={[0, 2, -4]} tilt={[0, 2.5, 0]} position={P(540, 790)} rotation={[0.1, Math.sin(t * 0.7) * 0.35, 0]} damping={14} stiffness={60}>
        <Coin radius={3.2} />
      </Enter>
      <Enter delay={0.35} from={[0, -2, 5]} tilt={[-0.9, 0, 0]} position={P(540, 1340)} damping={11}>
        <Slab w={8.8} h={1.6} d={0.6} color="#fff" radius={0.8}>
          <Text3D text="+998 99 304 11 55" size={0.76} depth={0.22} color={C.primary} position={[0, 0, 0.32]} maxWidth={7.8} />
        </Slab>
      </Enter>
    </Stage>
  );
}

// ───────────────────────── composition ─────────────────────────

export function Reels3D() {
  return (
    <AbsoluteFill style={{ background: C.page }}>
      <WarmBackground tiles={0} />
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
      <Audio src={staticFile('voice.m4a')} />
    </AbsoluteFill>
  );
}
