// Heat-profile templates, and a library of profiles kept in this browser.
// Loading one writes it into one of the Peak Pro's four profile slots; the
// profile it replaces is kept in the library, so nothing is lost.
import { LIMITS, cToF, fToC } from './device.js?v=14';

export const SOURCES = [
  { name: 'Cape Cod Cannabis', url: 'https://capecodcannabis.com/the-ultimate-dabbing-temperature-guide/' },
  { name: 'Leafly', url: 'https://www.leafly.com/learn/consume/dabs/best-dabbing-temperatures' },
];

const rgb = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
export const toHex = (c) => (c ? `#${[c.r, c.g, c.b].map((x) => x.toString(16).padStart(2, '0')).join('')}` : null);

// Templates are written in °F, like both guides. {400-500} in a description is
// a temperature range shown in the reader's unit. Boost defaults to +10°F for 15 s.
function t(name, tempF, timeSec, color, desc, { boostF = 10, boostSec = 15 } = {}) {
  return { name, tempC: fToC(tempF), timeSec, color: rgb(color), boostTempC: boostF * 5 / 9, boostTimeSec: boostSec, desc };
}

const RANGES = [
  t('Flavor Low', 450, 45, '#3d8bff',
    "Leafly's low range, {400-500} (usually {400-450}): the most flavor and terpenes, the smoothest hit, smaller clouds. Low heat can leave a little oil behind, so the cycle runs longer."),
  t('Low & Smooth', 485, 40, '#22b8cf',
    'The top of the {400-500} low range in both guides. Still flavor-first, with less left behind than Flavor Low.'),
  t('Mid-range', 520, 35, '#2fbf71',
    'The {500-545} middle range both guides describe: a balance of flavor and vapor. Warmer, and a little harsher, than low temperatures.'),
  t('Standard', 555, 30, '#e3a400',
    "Leafly's {545-570} standard range, which it calls a good overall range for most dabs: the dab vaporizes fully without scorching the terpenes."),
  t('Hot', 585, 25, '#ff7a1a',
    'The {570-600} hot range: the biggest clouds and the quickest, strongest effects, but less flavor and a harsher hit.',
    { boostF: 5, boostSec: 10 }),
  t('Max Clouds', 620, 20, '#e0344b',
    "Past both guides' hot range, toward the Peak Pro's {644} limit. Leafly warns that too much heat tastes burnt, so use it sparingly.",
    { boostF: 5, boostSec: 10 }),
];

const CONCENTRATES = [
  t('Live Resin & Sauce', 500, 40, '#8e5cff',
    'Cape Cod Cannabis puts live resin and sauce in the low range ({400-500}) to keep their terpenes; Leafly lists live resin in its {545-570} standard range. This starts at the top of the low range. Step up if it leaves oil behind.'),
  t('Hash Rosin & Ice Wax', 515, 40, '#c9a227',
    "Leafly's mid range ({500-545}) for ice wax, hash rosin and other high-melt solventless hash. These can leave residue; a cotton swab and isopropyl alcohol clean it out."),
  t('Shatter, Wax & Budder', 535, 35, '#ff9f1c',
    "Cape Cod Cannabis's mid range ({500-545}) for shatter, wax and budder. Leafly puts shatter and crumble a little higher, at {545-570}."),
  t('Sugar & Crumble', 555, 30, '#d4b13c',
    "Leafly's standard range ({545-570}) for sugar resin, crumble, shatter and rosin."),
  t('Distillate', 575, 25, '#ff5d5d',
    "Cape Cod Cannabis's high range ({570-600}) for distillate.",
    { boostF: 5, boostSec: 10 }),
  t('Diamonds & THCa', 590, 25, '#e0457b',
    'Both guides go hot ({570-600}) for diamonds and crystalline THCa isolate; Leafly says the extra heat converts THCa to THC faster. Some people prefer isolate low, so try Flavor Low if this is too harsh.',
    { boostF: 5, boostSec: 10 }),
];

const byName = (list, n) => list.find((x) => x.name === n);
const SETS = [
  { name: 'Guide Ladder',
    desc: 'One profile from each of the guides’ ranges, coolest in profile 1.',
    members: ['Flavor Low', 'Mid-range', 'Standard', 'Hot'].map((n) => byName(RANGES, n)) },
  { name: 'Flavor First',
    desc: 'Four steps through the {400-500} low range, for live resin, sauce and other terpene-rich concentrates. Start with profile 1 and step up if a dab leaves oil behind.',
    members: [
      t('Flavor 1', 430, 50, '#7cb7ff', ''), t('Flavor 2', 455, 45, '#3d8bff', ''),
      t('Flavor 3', 480, 45, '#22b8cf', ''), t('Flavor 4', 500, 40, '#2fbf71', ''),
    ] },
  { name: 'Cloud Chaser',
    desc: 'Four hot steps from {545} to {620} for bigger clouds. Flavor drops and the hit gets harsher as it climbs.',
    members: [
      t('Clouds 1', 545, 30, '#e3a400', ''), t('Clouds 2', 570, 25, '#ff9f1c', '', { boostF: 5, boostSec: 10 }),
      t('Clouds 3', 595, 25, '#ff5d1a', '', { boostF: 5, boostSec: 10 }), t('Clouds 4', 620, 20, '#e0344b', '', { boostF: 5, boostSec: 10 }),
    ] },
  { name: 'Concentrate Set',
    desc: 'Four of the by-concentrate profiles, one per slot, so the right heat for each is a button press away.',
    members: ['Live Resin & Sauce', 'Hash Rosin & Ice Wax', 'Shatter, Wax & Budder', 'Diamonds & THCa'].map((n) => byName(CONCENTRATES, n)) },
];

const GROUPS = [
  { k: 'ranges', label: 'Temperature ranges', items: RANGES },
  { k: 'concentrates', label: 'By concentrate', items: CONCENTRATES },
  { k: 'sets', label: 'Sets of four', items: SETS, set: true },
];
const FILTERS = [
  { k: 'all', label: 'All' }, { k: 'fav', label: '★ Favorites' },
  { k: 'ranges', label: 'Ranges' }, { k: 'concentrates', label: 'Concentrates' }, { k: 'sets', label: 'Sets of four' },
];
const ALL_SPECS = [...RANGES, ...CONCENTRATES, ...SETS.flatMap((s) => s.members)];
const ALL_NAMES = new Set([...RANGES, ...CONCENTRATES, ...SETS].map((x) => x.name));

// ---------- storage ----------
const KEY = { lib: 'peak.library', favs: 'peak.tpl-favs', filter: 'peak.tpl-filter', builder: 'peak.builder' };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const readJSON = (k, d) => { try { return JSON.parse(store.get(k)) ?? d; } catch { return d; } };

const TMIN_C = fToC(LIMITS.tempMinF);
const TMAX_C = fToC(LIMITS.tempMaxF);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// A profile as the library stores it, with every value checked against the
// limits the official app enforces. null if it has no temperature or time.
export function sanitizeSpec(o) {
  if (!o || typeof o !== 'object') return null;
  const tempC = num(o.tempC);
  const timeSec = num(o.timeSec);
  if (tempC == null || timeSec == null) return null;
  const c = o.color;
  const color = c && [c.r, c.g, c.b].every((x) => Number.isInteger(x) && x >= 0 && x <= 255) ? { r: c.r, g: c.g, b: c.b } : null;
  const bt = num(o.boostTempC);
  const bs = num(o.boostTimeSec);
  return {
    name: String(o.name ?? '').trim().slice(0, LIMITS.profileNameMax) || 'Profile',
    tempC: clamp(tempC, TMIN_C, TMAX_C),
    timeSec: Math.round(clamp(timeSec, LIMITS.durationMin, LIMITS.durationMax)),
    color,
    boostTempC: bt == null ? null : clamp(bt, LIMITS.boostTempMinF * 5 / 9, LIMITS.boostTempMaxC),
    boostTimeSec: bs == null ? null : Math.round(clamp(bs, LIMITS.boostDurationMin, LIMITS.boostDurationMax)),
  };
}

// The library's view of a profile read from the device.
export function profileSpec(p) {
  if (!p) return null;
  return sanitizeSpec({ ...p, color: p.color?.kind === 'rgb' ? p.color : null });
}

const specKey = (s) => [s.name, Math.round(cToF(s.tempC)), s.timeSec, toHex(s.color) ?? '-',
  s.boostTempC == null ? '-' : Math.round(s.boostTempC * 9 / 5), s.boostTimeSec ?? '-'].join('|');
const TEMPLATE_KEYS = new Set(ALL_SPECS.map((s) => specKey(sanitizeSpec(s))));

let saved = readJSON(KEY.lib, []).map((o) => {
  const s = sanitizeSpec(o);
  return s && { ...s, id: typeof o.id === 'string' ? o.id : newId(), savedAt: num(o.savedAt) ?? Date.now(), kept: o.kept === true };
}).filter(Boolean);
let favs = new Set(readJSON(KEY.favs, []).filter((n) => ALL_NAMES.has(n)));

function newId() { return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`; }
const persist = () => store.set(KEY.lib, JSON.stringify(saved));
const persistFavs = () => store.set(KEY.favs, JSON.stringify([...favs]));

// Adds a profile to the library. auto = kept because a load replaced it; those
// are skipped when they match a template, which can always be loaded again.
// Returns 'added', 'duplicate', 'template' or null (nothing to keep).
export function keepProfile(spec, { auto = false, savedAt, kept = auto } = {}) {
  const s = sanitizeSpec(spec);
  if (!s) return null;
  const key = specKey(s);
  if (saved.some((x) => specKey(x) === key)) return 'duplicate';
  if (auto && TEMPLATE_KEYS.has(key)) return 'template';
  saved.unshift({ ...s, id: newId(), savedAt: num(savedAt) ?? Date.now(), kept: kept === true });
  persist();
  return 'added';
}

export function backupText() {
  return JSON.stringify({
    format: 'peak-pro-control/profiles', version: 1, exported: new Date().toISOString(),
    profiles: saved.map(({ id, ...s }) => s), favorites: [...favs],
  }, null, 2);
}

export function restoreText(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("That file isn't a profile backup (it isn't JSON)."); }
  const list = Array.isArray(data) ? data : data?.profiles;
  if (!Array.isArray(list)) throw new Error("That file isn't a Peak Pro Control profile backup.");
  let added = 0;
  let skipped = 0;
  // Oldest first, so the restored list keeps its order (newest on top).
  for (const o of [...list].reverse()) {
    if (keepProfile(o, { savedAt: o?.savedAt, kept: o?.kept }) === 'added') added++; else skipped++;
  }
  for (const n of data?.favorites ?? []) if (ALL_NAMES.has(n)) favs.add(n);
  persistFavs();
  return { added, skipped };
}

// ---------- UI state ----------
const ui = {
  filter: FILTERS.some((f) => f.k === store.get(KEY.filter)) ? store.get(KEY.filter) : 'all',
  builder: { lowC: fToC(450), highC: fToC(585), time: 35, ...readJSON(KEY.builder, {}) },
  builderOpen: false,
};

function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('--')) n.style.setProperty(k, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') n.className = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c);
  return n;
}

// "{400-500}" -> "400–500°F" (or °C), "{644}" -> "644°F".
function fmtDesc(text, ctx) {
  const one = (f) => Math.round(ctx.unit === 'F' ? f : fToC(f));
  return text.replace(/\{(\d+)(?:-(\d+))?\}/g, (_, a, b) =>
    (b ? `${one(+a)}–${one(+b)}` : `${one(+a)}`) + `°${ctx.unit}`);
}

function meta(ctx, s) {
  const parts = [ctx.fmtTemp(s.tempC), `${s.timeSec} s`];
  if (s.boostTempC != null && s.boostTimeSec != null) {
    const d = Math.round(ctx.unit === 'F' ? s.boostTempC * 9 / 5 : s.boostTempC);
    parts.push(`boost +${d}°${ctx.unit}, ${s.boostTimeSec} s`);
  }
  return parts.join(' · ');
}

function favButton(ctx, name) {
  const on = favs.has(name);
  return el('button', {
    type: 'button', class: `fav${on ? ' on' : ''}`, 'aria-pressed': String(on),
    'aria-label': `Favorite ${name}`, title: on ? 'Remove from favorites' : 'Add to favorites',
    onClick: () => { if (on) favs.delete(name); else favs.add(name); persistFavs(); ctx.refresh(); },
  }, on ? '★' : '☆');
}

function slotButtons(ctx, label, onPick) {
  return el('div', { class: 'slots', role: 'group', 'aria-label': `Load ${label} into a profile` },
    ctx.profiles.map((p, i) => {
      const what = `profile ${i + 1}${p.name ? `, ${p.name}` : ''}`;
      return el('button', {
        type: 'button', class: 'slot', 'data-write': true, disabled: !ctx.canWrite,
        '--c': p.color?.kind === 'rgb' ? toHex(p.color) : null,
        title: `Replace ${what}`, 'aria-label': `Load into ${what}`, onClick: () => onPick(i),
      }, String(i + 1));
    }));
}

function row(ctx, s, { head, desc, note, actions, swatch }) {
  return el('div', { class: 'tpl', '--c': toHex(s?.color) },
    swatch ?? el('span', { class: 'tpl-swatch', 'aria-hidden': 'true' }),
    el('div', { class: 'tpl-text' },
      el('p', { class: 'tpl-head' }, head),
      desc && el('p', { class: 'tpl-desc' }, desc),
      note && el('p', { class: 'tpl-note' }, note)),
    el('div', { class: 'tpl-actions' }, actions));
}

function templateRow(ctx, s) {
  return row(ctx, s, {
    head: [favButton(ctx, s.name), el('strong', null, s.name), el('span', { class: 'tpl-meta' }, meta(ctx, s))],
    desc: fmtDesc(s.desc, ctx),
    actions: [
      el('span', { class: 'slots-label' }, 'Load into'),
      slotButtons(ctx, s.name, (i) => ctx.load(i, s)),
      el('button', { type: 'button', class: 'btn-quiet btn-small', title: 'Keep a copy in My profiles',
        onClick: () => saveOne(ctx, s) }, '+ Save'),
    ],
  });
}

function setRow(ctx, set) {
  const temps = set.members.map((m) => Math.round(ctx.tempOut(m.tempC))).join(' · ') + `°${ctx.unit}`;
  return row(ctx, null, {
    swatch: el('span', { class: 'set-swatches', 'aria-hidden': 'true' },
      set.members.map((m) => el('span', { '--c': toHex(m.color) }))),
    head: [favButton(ctx, set.name), el('strong', null, set.name), el('span', { class: 'tpl-meta' }, temps)],
    desc: fmtDesc(set.desc, ctx),
    note: set.members.map((m, i) => `${i + 1} ${m.name} (${m.timeSec} s)`).join(', '),
    actions: [
      el('button', { type: 'button', class: 'btn-quiet btn-small', 'data-write': true, disabled: !ctx.canWrite,
        onClick: () => loadSetConfirm(ctx, `"${set.name}"`, set.members) }, 'Load all four'),
      el('button', { type: 'button', class: 'btn-quiet btn-small', title: 'Keep copies of all four in My profiles',
        onClick: () => saveMany(ctx, set.members) }, '+ Save all'),
    ],
  });
}

function savedRow(ctx, s) {
  const when = new Date(s.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return row(ctx, s, {
    head: [el('strong', null, s.name), el('span', { class: 'tpl-meta' }, meta(ctx, s))],
    note: s.kept ? `Kept automatically when it was replaced, ${when}` : `Saved ${when}`,
    actions: [
      el('span', { class: 'slots-label' }, 'Load into'),
      slotButtons(ctx, s.name, (i) => ctx.load(i, s)),
      el('button', { type: 'button', class: 'btn-quiet btn-small', 'aria-label': `Delete ${s.name}`,
        onClick: () => {
          if (!confirm(`Delete "${s.name}" from My profiles? This can't be undone.`)) return;
          saved = saved.filter((x) => x.id !== s.id); persist(); ctx.refresh();
        } }, 'Delete'),
    ],
  });
}

function saveOne(ctx, s) {
  const r = keepProfile(s);
  ctx.toast(r === 'added' ? `Saved "${s.name}" to My profiles` : `"${s.name}" is already in My profiles`);
  ctx.refresh();
}
function saveMany(ctx, list) {
  // Reversed, so profile 1 ends up first in the list.
  const n = [...list].reverse().filter((s) => keepProfile(s) === 'added').length;
  ctx.toast(n ? `Saved ${n} profile${n === 1 ? '' : 's'} to My profiles` : 'Already in My profiles');
  ctx.refresh();
}
// what: shown in the question, e.g. '"Guide Ladder"'.
function loadSetConfirm(ctx, what, members) {
  if (!confirm(`Replace all four profiles on the device with ${what}?\n\nAny of the current four that aren't templates are kept in My profiles, so you can load them back.`)) return;
  ctx.loadSet(members);
}

// ---------- build your own set ----------
const STEP_COLORS = ['#3d8bff', '#2fbf71', '#ff9f1c', '#e0344b'].map(rgb);

function builderResult(ctx) {
  const { lowC, highC, time } = ui.builder;
  const lo = Math.round(ctx.tempOut(lowC));
  const hi = Math.round(ctx.tempOut(highC));
  const min = Math.round(ctx.tempOut(TMIN_C));
  const max = Math.round(ctx.tempOut(TMAX_C));
  const u = `°${ctx.unit}`;
  if (![lo, hi].every((v) => Number.isFinite(v) && v >= min && v <= max)) return { error: `Temperatures must be ${min}–${max}${u}.` };
  if (hi - lo < 3) return { error: 'Make the highest temperature at least 3° above the lowest.' };
  if (!(time >= LIMITS.durationMin && time <= LIMITS.durationMax)) return { error: `Duration must be ${LIMITS.durationMin}–${LIMITS.durationMax} s.` };
  const specs = [0, 1, 2, 3].map((k) => {
    const shown = Math.round(lo + (hi - lo) * k / 3);
    return sanitizeSpec({
      name: `Step ${k + 1}`, tempC: ctx.tempIn(shown), timeSec: Math.round(time),
      color: STEP_COLORS[k], boostTempC: 10 * 5 / 9, boostTimeSec: 15,
    });
  });
  return { specs, text: `${specs.map((s) => Math.round(ctx.tempOut(s.tempC))).join(' → ')}${u}, ${Math.round(time)} s each` };
}

function renderBuilder(ctx) {
  const b = ui.builder;
  const preview = el('p', { class: 'builder-preview', 'aria-live': 'polite' });
  const loadBtn = el('button', { type: 'button', class: 'btn-quiet btn-small', 'data-write': true,
    onClick: () => { const r = builderResult(ctx); if (r.specs) loadSetConfirm(ctx, `these four steps (${r.text})`, r.specs); } }, 'Load all four');
  const saveBtn = el('button', { type: 'button', class: 'btn-quiet btn-small',
    onClick: () => { const r = builderResult(ctx); if (r.specs) saveMany(ctx, r.specs); } }, '+ Save all');
  const refresh = () => {
    const r = builderResult(ctx);
    preview.textContent = r.error ?? r.text;
    preview.classList.toggle('warn', !!r.error);
    loadBtn.disabled = !!r.error || !ctx.canWrite;
    loadBtn.toggleAttribute('data-invalid', !!r.error);
    saveBtn.disabled = !!r.error;
    store.set(KEY.builder, JSON.stringify(b));
  };
  const field = (id, label, value, unit, onValue, attrs) => {
    const input = el('input', { id, type: 'number', inputmode: 'numeric', step: '1', ...attrs });
    input.value = value;
    input.addEventListener('input', () => { if (input.value !== '') onValue(Number(input.value)); refresh(); });
    return el('div', { class: 'field' }, el('label', { for: id }, label),
      el('div', { class: 'unit-input' }, input, el('span', null, unit)));
  };
  const u = `°${ctx.unit}`;
  const box = el('details', { class: 'builder' },
    el('summary', null, 'Build your own set of four'),
    el('p', { class: 'tpl-desc' }, 'Pick the lowest and highest temperature. It spreads four profiles evenly between them, coolest in profile 1.'),
    el('div', { class: 'builder-fields' },
      field('b-low', 'Lowest', Math.round(ctx.tempOut(b.lowC)), u, (v) => { b.lowC = ctx.tempIn(v); }),
      field('b-high', 'Highest', Math.round(ctx.tempOut(b.highC)), u, (v) => { b.highC = ctx.tempIn(v); }),
      field('b-time', 'Duration', b.time, 's', (v) => { b.time = v; },
        { min: LIMITS.durationMin, max: LIMITS.durationMax })),
    preview,
    el('div', { class: 'builder-btns' }, loadBtn, saveBtn));
  box.open = ui.builderOpen;
  box.addEventListener('toggle', () => { ui.builderOpen = box.open; });
  refresh();
  return box;
}

// ---------- render ----------
let fileInput;

export function renderLibrary(root, ctx) {
  const scroll = window.scrollY;
  const out = [];

  out.push(el('p', { class: 'lib-why warn', hidden: ctx.canWrite || !ctx.why }, ctx.why ?? ''));

  // My profiles
  if (!fileInput) {
    fileInput = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0];
      fileInput.value = '';
      if (!f) return;
      try {
        const { added, skipped } = restoreText(await f.text());
        fileInput.ctx.toast(`Restored ${added} profile${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already saved or invalid` : ''}`);
      } catch (err) { fileInput.ctx.toast(err.message, 'error'); }
      fileInput.ctx.refresh();
    });
  }
  fileInput.ctx = ctx;
  out.push(el('div', { class: 'lib-head' },
    el('h2', null, 'My profiles'),
    el('div', { class: 'lib-tools' },
      el('button', { type: 'button', class: 'btn-quiet btn-small', disabled: !saved.length,
        title: 'Download My profiles and your favorites as a file', onClick: () => download(ctx) }, 'Back up'),
      el('button', { type: 'button', class: 'btn-quiet btn-small',
        title: 'Add profiles from a backup file', onClick: () => fileInput.click() }, 'Restore'),
      fileInput)));
  out.push(saved.length
    ? el('div', { class: 'tpl-list' }, saved.map((s) => savedRow(ctx, s)))
    : el('p', { class: 'panel-note' }, 'Nothing saved yet. Use Copy to My profiles on the Profiles tab, or + Save on a template below. When you load a template, the profile it replaces is kept here.'));

  // Templates
  out.push(el('div', { class: 'lib-head' }, el('h2', null, 'Templates')));
  out.push(el('p', { class: 'panel-note' },
    'Starting points from the dabbing temperature guides by ',
    el('a', { href: SOURCES[0].url, target: '_blank', rel: 'noopener' }, SOURCES[0].name), ' and ',
    el('a', { href: SOURCES[1].url, target: '_blank', rel: 'noopener' }, SOURCES[1].name),
    '. The guides don’t always agree, and concentrates and chambers differ, so adjust to taste. For what each range does, see the ',
    el('a', { href: 'temps.html' }, 'dab temperature guide'),
    '. Load into writes the template to that profile on the device; the profile it replaces is kept in My profiles.'));

  const visible = (g, x) => ui.filter === 'all' || ui.filter === g.k || (ui.filter === 'fav' && favs.has(x.name));
  const count = (k) => GROUPS.reduce((n, g) => n + g.items.filter((x) => k === 'all' || k === g.k || (k === 'fav' && favs.has(x.name))).length, 0);
  out.push(el('div', { class: 'chips', role: 'group', 'aria-label': 'Filter templates' },
    FILTERS.map((f) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(ui.filter === f.k),
      onClick: () => { ui.filter = f.k; store.set(KEY.filter, f.k); ctx.refresh(); },
    }, `${f.label} (${count(f.k)})`))));

  out.push(renderBuilder(ctx));

  if (ui.filter === 'fav' && !favs.size) {
    out.push(el('p', { class: 'panel-note' }, 'No favorites yet. Tap ☆ next to a template under All to add it here.'));
  }
  for (const g of GROUPS) {
    const items = g.items.filter((x) => visible(g, x));
    if (!items.length) continue;
    out.push(el('h3', { class: 'tpl-group' }, g.label));
    out.push(el('div', { class: 'tpl-list' }, items.map((x) => (g.set ? setRow(ctx, x) : templateRow(ctx, x)))));
  }

  root.replaceChildren(...out);
  window.scrollTo({ top: scroll });
}

// Enable or disable everything that writes to the device, without a re-render.
export function syncLibrary(root, canWrite, why) {
  for (const b of root.querySelectorAll('[data-write]')) b.disabled = !canWrite || b.hasAttribute('data-invalid');
  const w = root.querySelector('.lib-why');
  if (w) { w.textContent = why ?? ''; w.hidden = canWrite || !why; }
}

function download(ctx) {
  const blob = new Blob([backupText()], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `peak-pro-profiles-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  ctx.toast('Backup downloaded');
}
