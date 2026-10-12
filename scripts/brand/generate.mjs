// Generates Ayyur's brand assets (mascot, logo, app icons) as SVG sources and PNG exports.
// Run with: node scripts/brand/generate.mjs
// The SVG files it writes are the source of truth for shapes; edit the parts below, not the output.
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const assets = join(root, 'assets');

// Wordmark outlines: "Ayyur" in Rubik ExtraBold and ⴰⵢⵢⵓⵔ in Noto Sans Tifinagh, both at 200px.
const wordmark = JSON.parse(readFileSync(join(here, 'wordmark-paths.json'), 'utf8'));

const C = {
  night: '#090e1f',
  nightSurface: '#141b2e',
  nightRaised: '#202941',
  ink: '#f0f3fc',
  inkMuted: '#b5bed2',
  dayInk: '#131a2d',
  dayInkMuted: '#444d63',
  moon: '#fdce3e',
  moonShade: '#f2ab19',
  moonCrater: '#f8bb1a',
  cheek: '#ff8f4b',
  face: '#141b2e',
  frozen: '#bfe9fb',
  prayer: '#7fb3ff',
};

const CX = 256;
const CY = 256;
const R = 190;

// Eight-point star (khatam): two squares rotated 45 degrees, drawn as one outline.
function khatam(cx, cy, r, fill, rotate = 0) {
  const inner = (r * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8);
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i + (rotate * Math.PI) / 180 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
}

// Four-point sparkle with concave sides.
function sparkle(cx, cy, r, fill) {
  const k = r * 0.22;
  return `<path d="M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z" fill="${fill}"/>`;
}

const stroke = (d, w = 13, color = C.face) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

const eyeOpen = (x, y, rx = 15, ry = 21) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.face}"/>`;
// Arc eyes: "up" reads as a smile, "down" reads as closed in rest.
const eyeArc = (x, y, dir = 'up', w = 20) =>
  stroke(dir === 'up' ? `M${x - w} ${y + 8}Q${x} ${y - 20} ${x + w} ${y + 8}` : `M${x - w} ${y - 6}Q${x} ${y + 18} ${x + w} ${y - 6}`);

const EL = 204; // left eye x
const ER = 308; // right eye x
const EY = 250;

const cheeks = (opacity = 0.6) =>
  `<ellipse cx="158" cy="304" rx="24" ry="14" fill="${C.cheek}" opacity="${opacity}"/><ellipse cx="354" cy="304" rx="24" ry="14" fill="${C.cheek}" opacity="${opacity}"/>`;

const faces = {
  happy: () => eyeOpen(EL, EY) + eyeOpen(ER, EY) + stroke('M224 300Q256 334 288 300') + cheeks(),
  joyful: () =>
    eyeArc(EL, EY, 'up') +
    eyeArc(ER, EY, 'up') +
    `<path d="M214 296Q256 290 298 296Q296 346 256 346Q216 346 214 296Z" fill="${C.face}"/>` +
    `<path d="M232 330Q256 316 280 330Q270 346 256 346Q242 346 232 330Z" fill="${C.cheek}"/>` +
    cheeks(0.75),
  wink: () => eyeOpen(EL, EY) + eyeArc(ER, EY + 2, 'up') + stroke('M222 298Q258 338 292 296') + cheeks(),
  gentle: () => eyeOpen(EL, EY + 4, 14, 15) + eyeOpen(ER, EY + 4, 14, 15) + stroke('M234 306Q256 322 278 306') + cheeks(0.45),
  sleepy: () => eyeArc(EL, EY + 4, 'down') + eyeArc(ER, EY + 4, 'down') + `<ellipse cx="256" cy="312" rx="11" ry="13" fill="${C.face}"/>` + cheeks(0.45),
  thinking: () => eyeOpen(EL + 10, EY - 12, 14, 18) + eyeOpen(ER + 10, EY - 12, 14, 18) + stroke('M240 312L278 306') + cheeks(0.4),
  curious: () => eyeOpen(EL, EY - 2, 17, 24) + eyeOpen(ER, EY - 2, 17, 24) + `<ellipse cx="256" cy="314" rx="13" ry="15" fill="${C.face}"/>` + cheeks(0.5),
  caring: () =>
    eyeOpen(EL, EY + 6, 14, 17) +
    eyeOpen(ER, EY + 6, 14, 17) +
    stroke(`M${EL - 22} ${EY - 26}Q${EL} ${EY - 40} ${EL + 16} ${EY - 38}`, 10) +
    stroke(`M${ER + 22} ${EY - 26}Q${ER} ${EY - 40} ${ER - 16} ${EY - 38}`, 10) +
    stroke('M238 310Q256 320 274 310') +
    cheeks(0.4),
  protected: () => eyeArc(EL, EY + 2, 'down') + eyeArc(ER, EY + 2, 'down') + stroke('M230 302Q256 326 282 302') + cheeks(0.5),
};

// Shapes drawn around the moon, outside its rotation.
const extras = {
  joyful: () => khatam(432, 92, 34, C.ink, 0) + sparkle(74, 132, 26, C.moon) + sparkle(452, 396, 18, C.ink) + khatam(64, 410, 18, C.moon, 0),
  wink: () => sparkle(430, 116, 28, C.ink),
  sleepy: () =>
    stroke('M398 96H436L398 138H436', 11, C.inkMuted) + stroke('M452 40H476L452 66H476', 8, C.inkMuted),
  thinking: () =>
    `<circle cx="416" cy="102" r="12" fill="${C.inkMuted}"/><circle cx="446" cy="68" r="16" fill="${C.inkMuted}"/><circle cx="486" cy="30" r="20" fill="${C.inkMuted}"/>`,
  curious: () => sparkle(86, 108, 22, C.ink),
  protected: () => khatam(413, 99, 30, C.frozen, 22.5),
};

// A ring behind the moon marks a streak that is frozen rather than completed.
const underlays = {
  protected: () => `<circle cx="${CX}" cy="${CY}" r="222" fill="none" stroke="${C.frozen}" stroke-width="12" stroke-dasharray="2 30" stroke-linecap="round"/>`,
};

// The face sits slightly low and small on the disc.
const FACE = 'translate(20.5 36.5) scale(0.92)';
const face = (emotion) => `<g transform="${FACE}">${faces[emotion]()}</g>`;

const tilts = { happy: -6, joyful: -10, wink: 8, gentle: 0, sleepy: 10, thinking: -4, curious: 12, caring: 4, protected: 0 };

let clipSeq = 0;
function moonBody({ cx = CX, cy = CY, r = R, craters = true } = {}) {
  const id = `moon-${clipSeq++}`;
  const s = r / R;
  const at = (x, y) => `cx="${(cx + (x - CX) * s).toFixed(1)}" cy="${(cy + (y - CY) * s).toFixed(1)}"`;
  return (
    `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.moonShade}"/>` +
    `<g clip-path="url(#${id})">` +
    `<circle ${at(232, 234)} r="${r}" fill="${C.moon}"/>` +
    (craters
      ? `<ellipse ${at(150, 142)} rx="${30 * s}" ry="${26 * s}" fill="${C.moonCrater}"/>` +
        `<ellipse ${at(338, 122)} rx="${18 * s}" ry="${16 * s}" fill="${C.moonCrater}"/>` +
        `<ellipse ${at(108, 232)} rx="${13 * s}" ry="${15 * s}" fill="${C.moonCrater}"/>` +
        `<ellipse ${at(300, 396)} rx="${22 * s}" ry="${16 * s}" fill="${C.moonCrater}"/>`
      : '') +
    `</g>`
  );
}

function mascot(emotion) {
  const tilt = tilts[emotion] ?? 0;
  return (
    (underlays[emotion]?.() ?? '') +
    `<g transform="rotate(${tilt} ${CX} ${CY})">${moonBody()}${face(emotion)}</g>` +
    (extras[emotion]?.() ?? '')
  );
}

const svg = (w, h, body, viewBox = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>\n`;

// Places 512-unit artwork centred at (x, y) and scaled to `size`.
const place = (body, x, y, size) => `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${size / 512})">${body}</g>`;

async function emit(dir, name, source, pngSizes = []) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.svg`), source);
  for (const size of pngSizes) {
    const suffix = pngSizes.length > 1 ? `@${size}` : '';
    await sharp(Buffer.from(source), { density: 300 }).resize({ width: size }).png().toFile(join(dir, `${name}${suffix}.png`));
  }
}

async function png(file, source, width, { flatten } = {}) {
  let img = sharp(Buffer.from(source), { density: 300 }).resize({ width });
  if (flatten) img = img.flatten({ background: flatten });
  await img.png().toFile(file);
}

// Mascot ------------------------------------------------------------------
const mascotDir = join(assets, 'brand', 'mascot');
for (const emotion of Object.keys(faces)) {
  await emit(mascotDir, `ayyur-${emotion}`, svg(512, 512, mascot(emotion)), [512]);
}

// Moon phases: the streak symbol. Phase 0 is new, 4 is full. --------------
const phaseDir = join(assets, 'brand', 'phases');
function phase(step) {
  const base = `<circle cx="256" cy="256" r="200" fill="${C.nightRaised}"/>`;
  if (step === 0) return base;
  if (step === 4) return base + `<circle cx="256" cy="256" r="200" fill="${C.moon}"/>`;
  // Waxing moon: the right limb is lit, and an elliptical terminator closes the shape.
  const terminator = { 1: 'A120 200 0 0 0 256 56', 2: 'L256 56', 3: 'A120 200 0 0 1 256 56' }[step];
  return base + `<path d="M256 56A200 200 0 0 1 256 456${terminator}Z" fill="${C.moon}"/>`;
}
const phaseNames = ['new', 'crescent', 'half', 'gibbous', 'full'];
for (let i = 0; i < phaseNames.length; i++) {
  await emit(phaseDir, `phase-${i}-${phaseNames[i]}`, svg(512, 512, phase(i)), [256]);
}

// Motifs ------------------------------------------------------------------
const motifDir = join(assets, 'brand', 'motifs');
await emit(motifDir, 'khatam-star', svg(512, 512, khatam(256, 256, 236, C.moon)), [256]);
await emit(motifDir, 'sparkle', svg(512, 512, sparkle(256, 256, 236, C.ink)), [256]);
// Amazigh weave: a diamond lattice with a small diamond at each crossing, tileable at 96px.
const weave = (color) =>
  `<path d="M48 4L92 48L48 92L4 48Z" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>` +
  `<path d="M48 30L66 48L48 66L30 48Z" fill="${color}"/>` +
  [
    [0, 0],
    [96, 0],
    [0, 96],
    [96, 96],
  ]
    .map(([x, y]) => `<path d="M${x} ${y - 10}L${x + 10} ${y}L${x} ${y + 10}L${x - 10} ${y}Z" fill="${color}"/>`)
    .join('');
await emit(motifDir, 'amazigh-weave-tile', svg(96, 96, weave(C.nightRaised)), [192]);

// Logo --------------------------------------------------------------------
const logoDir = join(assets, 'brand', 'logo');
const mark = `<g transform="rotate(-6 ${CX} ${CY})">${moonBody()}${face('happy')}</g>`;
await emit(logoDir, 'ayyur-mark', svg(512, 512, mark), [512]);

const L = wordmark.latin;
const T = wordmark.tifinagh;
const latinW = L.x2 - L.x1;
const tifW = T.x2 - T.x1;

function wordmarkGroup(x, baseline, latinColor, tifColor) {
  // Tifinagh sits under the Latin name at 34% size, thickened to hold next to ExtraBold.
  const ts = 0.34;
  const tx = x + (latinW - tifW * ts) / 2 - T.x1 * ts;
  return (
    `<path transform="translate(${x - L.x1} ${baseline})" d="${L.d}" fill="${latinColor}"/>` +
    `<path transform="translate(${tx} ${baseline + 112}) scale(${ts})" d="${T.d}" fill="${tifColor}" stroke="${tifColor}" stroke-width="9" stroke-linejoin="round"/>`
  );
}

for (const [variant, latinColor, tifColor] of [
  ['on-dark', C.ink, C.moon],
  ['on-light', C.dayInk, C.dayInkMuted],
]) {
  await emit(logoDir, `ayyur-wordmark-${variant}`, svg(latinW + 40, 320, wordmarkGroup(20, 170, latinColor, tifColor)), [1024]);
  const lockup = place(mark, 150, 160, 280) + wordmarkGroup(320, 174, latinColor, tifColor);
  await emit(logoDir, `ayyur-lockup-${variant}`, svg(320 + latinW + 30, 320, lockup), [1400]);
}

// App icon, adaptive icon, splash, favicon --------------------------------
const iconScene = (moonSize) =>
  `<circle cx="512" cy="512" r="${moonSize * 0.68}" fill="${C.nightSurface}"/>` +
  `<circle cx="512" cy="512" r="${moonSize * 0.56}" fill="${C.nightRaised}"/>` +
  place(mark, 512, 512, moonSize * (512 / (2 * R)));

const appIcon = svg(
  1024,
  1024,
  `<rect width="1024" height="1024" fill="${C.night}"/>` + iconScene(600) + khatam(838, 190, 46, C.ink) + sparkle(176, 300, 34, C.moon) + sparkle(852, 800, 24, C.ink),
);
await emit(join(assets, 'brand', 'icon'), 'app-icon', appIcon);
await png(join(assets, 'icon.png'), appIcon, 1024, { flatten: C.night });

// Android masks the foreground to roughly the centre 61%, so the moon stays inside it.
const adaptiveFg = svg(1024, 1024, iconScene(430));
await emit(join(assets, 'brand', 'icon'), 'android-foreground', adaptiveFg);
await png(join(assets, 'android-icon-foreground.png'), adaptiveFg, 1024);

const s = 430 / (2 * R);
const mono = svg(
  1024,
  1024,
  `<mask id="mono"><rect width="1024" height="1024" fill="#000"/><circle cx="512" cy="512" r="215" fill="#fff"/>` +
    `<g transform="translate(${512 - 256 * s} ${512 - 256 * s}) scale(${s}) rotate(-6 256 256) ${FACE}">` +
    `<ellipse cx="${EL}" cy="${EY}" rx="17" ry="23" fill="#000"/><ellipse cx="${ER}" cy="${EY}" rx="17" ry="23" fill="#000"/>` +
    `<path d="M224 300Q256 334 288 300" fill="none" stroke="#000" stroke-width="16" stroke-linecap="round"/></g></mask>` +
    `<rect width="1024" height="1024" fill="#fff" mask="url(#mono)"/>`,
);
await emit(join(assets, 'brand', 'icon'), 'android-monochrome', mono);
await png(join(assets, 'android-icon-monochrome.png'), mono, 1024);

const splash = svg(1024, 1024, place(mark, 512, 512, 900));
await png(join(assets, 'splash-icon.png'), splash, 1024);

const favicon = svg(512, 512, place(mark, 256, 256, 640));
await png(join(assets, 'favicon.png'), favicon, 96);

console.log('Brand assets written to assets/ and assets/brand/.');
