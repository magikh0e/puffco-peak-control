import { LoraxClient, requestOptions } from './lorax.js?v=17';
import { PuffcoDevice, LIMITS, LUMA, cToF, fToC } from './device.js?v=17';
import { renderLibrary, syncLibrary, keepProfile, profileSpec } from './library.js?v=17';
import { VERSION, showVersion } from './version.js?v=17';

const $ = (id) => document.getElementById(id);
const DEMO = new URLSearchParams(location.search).has('demo');
// The release version lives in version.js. BUILD follows the ?v= numbers on
// the imports and changes with every deploy, released or not.
const BUILD = '2026-11-16.17';
const ABOUT = `Peak Pro Control v${VERSION} (build ${BUILD})`;

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const state = {
  unit: store.get('peak.unit', 'F'),
  selected: 0,
  profiles: [],
  live: {},
  slow: {},
  dev: null,
  lorax: null,
  connected: false,
  pollTimer: null,
  slowAt: 0,
  log: [],
};

// ---------- units ----------
const isF = () => state.unit === 'F';
const tempOut = (c) => (c == null || !Number.isFinite(c) ? null : isF() ? cToF(c) : c);
const tempIn = (v) => (isF() ? fToC(v) : v);
const deltaOut = (c) => (c == null ? null : isF() ? c * 9 / 5 : c);
const deltaIn = (v) => (isF() ? v * 5 / 9 : v);
const unitLabel = () => (isF() ? '°F' : '°C');
const fmtTemp = (c) => { const v = tempOut(c); return v == null ? '--' : `${Math.round(v)}${unitLabel()}`; };
const fmtSecs = (s) => {
  if (s == null || !Number.isFinite(s)) return '--';
  s = Math.max(0, Math.round(s));
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`;
};

// ---------- operating state ----------
const STATE_TEXT = {
  InitMemory: 'Starting up', InitVersion: 'Starting up', InitBattery: 'Starting up',
  MasterOff: 'Off', Sleep: 'Asleep', Idle: 'Idle', TempSelect: 'Choosing a profile on the device',
  HeatCyclePreheat: 'Heating up', HeatCycleActive: 'Ready', HeatCycleFade: 'Cooling down',
  Version: 'Showing firmware version', BattLevel: 'Showing battery level',
  FactoryTest: 'Factory test', Bonding: 'Pairing',
};
const PHASE = { HeatCyclePreheat: 'preheat', HeatCycleActive: 'active', HeatCycleFade: 'fade' };

function stateName() {
  const s = state.live.state;
  return s == null ? null : state.dev?.enumLabel('operatingState', s) ?? `State ${s}`;
}
function phase() {
  if (!state.connected) return 'off';
  return PHASE[stateName()] ?? 'idle';
}
const isHeating = () => ['preheat', 'active'].includes(phase());

// ---------- color ----------
const toHex = ({ r, g, b }) => `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
const fromHex = (h) => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
const colorOf = (p) => (p?.color && p.color.kind === 'rgb' ? toHex(p.color) : null);

function applyGlow(hexColor) {
  const root = document.documentElement.style;
  if (!hexColor) { root.removeProperty('--glow'); root.removeProperty('--on-glow'); return; }
  const { r, g, b } = fromHex(hexColor);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  root.setProperty('--glow', hexColor);
  root.setProperty('--on-glow', lum > 0.62 ? '#1b1f22' : '#ffffff');
}

// ---------- toast / status ----------
let toastTimer;
function toast(msg, kind = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.dataset.kind = kind;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, kind === 'error' ? 6000 : 2600);
}
function setConn(kind, text) {
  const el = $('conn-status');
  el.dataset.state = kind;
  el.textContent = text;
}

async function act(fn, success) {
  try {
    await fn();
    if (success) toast(success);
  } catch (err) {
    console.error(err);
    toast(err.message || String(err), 'error');
    logLine('err', err.message || String(err));
  }
}

// ---------- connect ----------
async function connect() {
  $('connect-error').hidden = true;
  let device;
  try {
    setConn('busy', 'Choosing a device');
    if (DEMO) {
      const { requestMockDevice } = await import('./mock-device.js?v=17');
      const mode = new URLSearchParams(location.search).get('demo');
      device = await requestMockDevice({
        unpaired: mode === 'unpaired', needsBond: ['pairing', 'stuck', 'notpaired'].includes(mode),
        stuckFirst: mode === 'stuck', neverBond: mode === 'notpaired',
      });
    } else {
      device = await navigator.bluetooth.requestDevice(requestOptions());
    }
  } catch (err) {
    setConn('idle', 'Not connected');
    if (err.name !== 'NotFoundError') showConnectError(err);
    return;
  }

  const lorax = new LoraxClient();
  lorax.addEventListener('log', (e) => logLine(e.detail.dir, e.detail.text, e.detail.quiet));
  setConnecting(true);
  logLine('sys', ABOUT);
  lorax.addEventListener('disconnect', onDisconnect);
  lorax.addEventListener('stage', (e) => {
    setConn('busy', e.detail === 'Pairing' ? 'Pairing, accept any prompt from Chrome or Windows' : e.detail);
  });
  state.lorax = lorax;

  try {
    await lorax.connect(device);
    const dev = new PuffcoDevice(lorax);
    const info = await dev.detect();
    logLine('sys', `Device family ${info.family} (API series ${info.apiSeries}, version ${info.apiVersion ?? 'n/a'})`);
    state.dev = dev;
    state.connected = true;

    const name = (await dev.tryRead('deviceName')) || device.name || 'Peak Pro';
    $('device-title').textContent = name;
    $('s-name').value = name;
    setConn('on', DEMO ? 'Connected to demo device' : 'Connected');

    state.profiles = await dev.readProfiles();
    const hcs = await dev.tryRead('selectedHeatCycle');
    if (hcs >= 0 && hcs <= 3) state.selected = hcs;

    setConnecting(false);
    showConnectedUI(true);
    renderProfilePicker();
    renderProfileEditors();
    renderLib();
    await loadSettings();
    poll();
  } catch (err) {
    console.error(err);
    setConnecting(false);
    lorax.disconnect();
    if (err.name === 'AbortError' || lorax.cancelled) { setConn('idle', 'Not connected'); return; }
    showConnectError(err);
    setConn('error', 'Connection failed');
  }
}

// While connecting, the ring button cancels and the intro shows live progress.
function setConnecting(on) {
  state.connecting = on;
  const btn = $('btn-connect');
  btn.textContent = on ? 'Cancel' : DEMO ? 'Connect demo' : 'Connect';
  btn.classList.toggle('btn-quiet', on);
  btn.classList.toggle('btn-primary', !on);
  $('connect-progress').replaceChildren();
  $('connect-progress').hidden = !on;
}

function showProgress(entry) {
  const ol = $('connect-progress');
  const li = document.createElement('li');
  li.textContent = `${entry.t.toLocaleTimeString(undefined, { hour12: false })}  ${entry.text}`;
  ol.append(li);
  while (ol.childElementCount > 8) ol.firstElementChild.remove();
}

function showConnectError(err) {
  const msg = err.message || String(err);
  let title = msg;
  let steps = [];
  if (err.pairingHint || (err.name === 'NetworkError' && /connection attempt failed/i.test(msg))) {
    // Same error the official web app reports as WEB_BONDING_ERROR.
    title = 'The Peak Pro refused the connection. It needs to be in pairing mode to connect to a new computer.';
    steps = [
      'Close the Puffco app on your phone, or turn off Bluetooth on the phone.',
      'Hold the device button until the logo glows blue. It turns off and back on before the blue light appears.',
      'Press Connect and pick the device again while it is glowing blue.',
      'If Windows asks to pair the device, allow it.',
      'Still failing? Remove the Peak Pro under Windows Settings > Bluetooth & devices, then try again.',
    ];
  } else if (err.notPaired || /Pairing didn't complete|GetLimits timed out/i.test(msg)) {
    // Verified on a Peak Pro: it ignores commands until the link is encrypted,
    // which needs an OS-level pairing. See the README's pairing section.
    title = "This computer isn't paired with the Peak Pro, so it won't answer.";
    steps = [
      'Close this page and the Puffco app on your phone.',
      'Hold the device button until the logo glows blue (pairing mode).',
      'Pair it with this computer from your system’s Bluetooth settings. On Windows, see the README’s pairing section: Settings may not list it.',
      'If Windows reports a pairing already in progress, restart the computer and pair again.',
      'Once it is paired, come back here and press Connect.',
    ];
  } else if (err.dropped) {
    title = 'The Peak Pro dropped the connection during setup.';
    steps = [
      'Wait a few seconds and press Connect again.',
      'If it keeps dropping, put the device in pairing mode (hold the button until the logo glows blue) and connect again.',
      'Still stuck? Remove the Peak Pro under Windows Settings > Bluetooth & devices, then pair again.',
    ];
  } else if (/timed out/i.test(msg)) {
    title = "The Peak Pro connected but didn't answer.";
    steps = [
      'Remove the Peak Pro under Windows Settings > Bluetooth & devices if it is listed.',
      'Put the device in pairing mode (hold the button until the logo glows blue) and press Connect.',
      'Accept any pairing prompt from Chrome or Windows.',
      'Still stuck? Copy the technical details below and send them.',
    ];
  } else if (err.name === 'NetworkError' || /GATT/i.test(msg)) {
    steps = ['Make sure the device is awake and close by.', 'Close the Puffco app on your phone, then try again.'];
  } else if (err.name === 'SecurityError') {
    steps = ['Open the page from http://localhost or an https:// address.'];
  }
  $('connect-error-title').textContent = title;
  $('connect-error-steps').replaceChildren(...steps.map((s) => {
    const li = document.createElement('li'); li.textContent = s; return li;
  }));
  $('connect-error-steps').hidden = !steps.length;
  const details = [`${err.name || 'Error'}: ${msg}`, ABOUT, `${navigator.userAgent}`, '',
    ...state.log.slice(-25).map((e) => `${e.t.toLocaleTimeString(undefined, { hour12: false })} ${e.dir} ${e.text}`)];
  $('connect-error-log').textContent = details.join('\n');
  $('connect-error').hidden = false;
}

function onDisconnect() {
  state.connected = false;
  clearTimeout(state.pollTimer);
  setConn('idle', 'Disconnected');
  showConnectedUI(false);
  renderLive();
}

function showConnectedUI(on) {
  $('intro').hidden = on;
  $('controls').hidden = !on;
  $('tabs').hidden = !on;
  $('btn-disconnect').hidden = !on;
  $('ring-idle-msg').hidden = on;
  $('ring-readout').hidden = !on;
  for (const t of document.querySelectorAll('[role="tab"]')) {
    $(t.getAttribute('aria-controls')).hidden = !on || t.getAttribute('aria-selected') !== 'true';
  }
  if (!on) applyGlow(null);
}

// ---------- polling ----------
async function poll() {
  clearTimeout(state.pollTimer);
  if (!state.connected) return;
  const dev = state.dev;
  const q = { quiet: true };
  const live = {};
  live.temp = await dev.tryRead('userHeaterTemp', q);
  live.target = await dev.tryRead('userHeaterTempCommand', q);
  live.state = await dev.tryRead('operatingState', q);
  live.elapsed = await dev.tryRead('stateElapsedTime', q);
  live.total = await dev.tryRead('stateTotalTime', q);
  live.soc = await dev.tryRead('battSoc', q);
  live.charge = await dev.tryRead('battChargeState', q);
  live.hcs = await dev.tryRead('selectedHeatCycle', q);
  if (Date.now() - state.slowAt > 20000) {
    state.slowAt = Date.now();
    state.slow.chamber = await dev.tryRead('heaterType', q);
  }
  if (!state.connected) return;
  state.live = live;
  renderLive();
  state.pollTimer = setTimeout(poll, ['preheat', 'active', 'fade'].includes(phase()) ? 600 : 2000);
}

// ---------- rendering ----------
function activeProfileIndex() {
  const h = state.live.hcs;
  return isHeating() && h >= 0 && h <= 3 ? h : state.selected;
}

function renderLive() {
  const ph = phase();
  $('ring-wrap').dataset.phase = ph;
  $('temp-unit').textContent = unitLabel();

  const t = tempOut(state.live.temp);
  $('temp-now').textContent = t == null ? '--' : Math.round(t);

  const name = stateName();
  let label = STATE_TEXT[name] ?? name ?? '';
  if (ph === 'preheat' && state.live.target != null) label = `Heating to ${fmtTemp(state.live.target)}`;
  $('phase-label').textContent = state.connected ? label : '';

  // ring progress = time through the current heat-cycle stage
  const { elapsed, total } = state.live;
  let frac = 0;
  if (['preheat', 'active'].includes(ph) && total > 0) frac = Math.min(1, Math.max(0, elapsed / total));
  if (ph === 'fade') frac = 1;
  const ring = $('ring-progress');
  ring.style.strokeDasharray = `${Math.round(frac * 1000)} 1000`;
  ring.style.opacity = frac > 0.002 ? '1' : '0';

  applyGlow(state.connected ? colorOf(state.profiles[activeProfileIndex()]) : null);

  // The device reports a 0 °C command while it isn't heating.
  $('v-target').textContent = state.live.target > 1 && ph !== 'idle' ? fmtTemp(state.live.target) : '--';
  $('v-time-label').textContent = ph === 'preheat' ? 'Preheat' : 'Time left';
  $('v-time').textContent = ['preheat', 'active'].includes(ph) && total > 0 ? fmtSecs(total - elapsed) : '--';

  const soc = state.live.soc;
  const charge = state.dev?.enumLabel('battChargeState', state.live.charge);
  const charging = charge === 'Bulk' || charge === 'Topup';
  $('v-battery').textContent = soc == null ? '--' : `${Math.round(soc)}%${charging ? ' charging' : ''}`;
  const chamber = state.dev?.enumLabel('heaterType', state.slow.chamber);
  $('v-chamber').textContent = chamber && chamber !== 'None' ? chamber : chamber === 'None' ? 'Not attached' : '--';

  const heating = isHeating();
  $('btn-start').hidden = heating;
  $('btn-stop').hidden = !heating;
  $('adjust-row').hidden = !heating;
  $('btn-add-temp').textContent = isF() ? `+${LIMITS.addTempF}°F` : `+${LIMITS.addTempC}°C`;
  $('btn-add-time').textContent = `+${LIMITS.addTimeSec} s`;
  const p = state.profiles[state.selected];
  $('btn-start').textContent = p?.name ? `Heat with ${p.name}` : 'Start heating';

  for (const b of document.querySelectorAll('.pdot')) {
    b.setAttribute('aria-checked', String(Number(b.dataset.index) === activeProfileIndex()));
    b.disabled = heating;
  }
  syncLibrary($('library'), canWriteProfiles(), writeBlockedReason());
}

function renderProfilePicker() {
  const wrap = $('profile-dots');
  wrap.setAttribute('role', 'radiogroup');
  wrap.replaceChildren(...state.profiles.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pdot';
    b.setAttribute('role', 'radio');
    b.dataset.index = i;
    const c = colorOf(p);
    if (c) b.style.setProperty('--c', c);
    const sw = document.createElement('span'); sw.className = 'swatch';
    const nm = document.createElement('span'); nm.className = 'pname'; nm.textContent = p.name || `Profile ${i + 1}`;
    const meta = document.createElement('span'); meta.className = 'pmeta';
    meta.textContent = `${fmtTemp(p.tempC)}, ${fmtSecs(p.timeSec)}`;
    b.append(sw, nm, meta);
    b.addEventListener('click', () => { state.selected = i; renderLive(); });
    return b;
  }));
  renderLive();
}

function numberField(id, label, value, { min, max, step = 1, unit }) {
  const f = document.createElement('div');
  f.className = 'field';
  f.innerHTML = `<label for="${id}"></label><div class="unit-input"><input id="${id}" type="number" inputmode="decimal"><span></span></div>`;
  f.querySelector('label').textContent = label;
  const input = f.querySelector('input');
  Object.assign(input, { min, max, step });
  input.value = value == null || !Number.isFinite(value) ? '' : Math.round(value);
  f.querySelector('span').textContent = unit;
  return f;
}

function renderProfileEditors() {
  const list = $('profile-list');
  const tMin = isF() ? LIMITS.tempMinF : Math.round(fToC(LIMITS.tempMinF));
  const tMax = isF() ? LIMITS.tempMaxF : Math.round(fToC(LIMITS.tempMaxF));
  const bMin = isF() ? LIMITS.boostTempMinF : LIMITS.boostTempMinC;
  const bMax = isF() ? LIMITS.boostTempMaxF : LIMITS.boostTempMaxC;

  list.replaceChildren(...state.profiles.map((p, i) => {
    const card = document.createElement('form');
    card.className = 'pcard';
    card.noValidate = true;
    const c = colorOf(p);
    if (c) card.style.setProperty('--c', c);

    const h = document.createElement('h3'); h.textContent = `Profile ${i + 1}`;

    const nameF = document.createElement('div'); nameF.className = 'field';
    nameF.innerHTML = `<label for="p${i}-name">Name</label><input id="p${i}-name" type="text" maxlength="${LIMITS.profileNameMax}" autocomplete="off">`;
    nameF.querySelector('input').value = p.name ?? '';

    const row1 = document.createElement('div'); row1.className = 'field-row';
    row1.append(
      numberField(`p${i}-temp`, 'Temperature', tempOut(p.tempC), { min: tMin, max: tMax, unit: unitLabel() }),
      numberField(`p${i}-time`, 'Duration', p.timeSec, { min: LIMITS.durationMin, max: LIMITS.durationMax, unit: 's' }),
    );
    const row2 = document.createElement('div'); row2.className = 'field-row';
    row2.append(
      numberField(`p${i}-btemp`, 'Boost adds', deltaOut(p.boostTempC), { min: bMin, max: bMax, unit: unitLabel() }),
      numberField(`p${i}-btime`, 'Boost time', p.boostTimeSec, { min: LIMITS.boostDurationMin, max: LIMITS.boostDurationMax, unit: 's' }),
    );

    const colorF = document.createElement('div'); colorF.className = 'field';
    const colorSupported = p.color && ['rgb', 'table', 'none'].includes(p.color.kind);
    colorF.innerHTML = `<label for="p${i}-color">Light color</label><input id="p${i}-color" type="color">`;
    const ci = colorF.querySelector('input');
    ci.value = c ?? '#ffffff';
    // Save writes the color only if it was changed here. Animated lights and
    // profiles without a color have no hex value, so the field starts on white,
    // and comparing against the profile would replace the animation every save.
    ci.dataset.initial = ci.value;
    if (!colorSupported) { ci.disabled = true; colorF.querySelector('label').textContent = 'Light color (not supported on this firmware)'; }
    if (p.color?.kind === 'table') colorF.querySelector('label').textContent = 'Light color (currently an animation)';

    const save = document.createElement('div'); save.className = 'save-row';
    save.innerHTML = '<span class="saved" aria-live="polite"></span><button type="button" class="btn-quiet btn-small">Copy to My profiles</button><button type="submit" class="btn-quiet">Save</button>';
    save.querySelector('button[type="button"]').addEventListener('click', () => {
      const r = keepProfile(profileSpec(state.profiles[i]));
      toast(r === 'added' ? 'Copied to My profiles (Library tab)' : r === 'duplicate' ? 'Already in My profiles' : 'Nothing to copy');
      renderLib();
    });

    card.append(h, nameF, row1, row2, colorF, save);
    card.addEventListener('submit', (e) => { e.preventDefault(); saveProfile(i, card); });
    return card;
  }));
}

function readNum(card, id, min, max, label) {
  const el = card.querySelector(`#${id}`);
  if (el.value === '') return undefined;
  const v = Number(el.value);
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${label} must be between ${min} and ${max}`);
  return v;
}

async function saveProfile(i, card) {
  const p = state.profiles[i];
  const status = card.querySelector('.saved');
  await act(async () => {
    const patch = {};
    const name = card.querySelector(`#p${i}-name`).value.trim();
    if (name && name !== p.name) patch.name = name.slice(0, LIMITS.profileNameMax);

    const tMin = isF() ? LIMITS.tempMinF : Math.round(fToC(LIMITS.tempMinF));
    const tMax = isF() ? LIMITS.tempMaxF : Math.round(fToC(LIMITS.tempMaxF));
    const t = readNum(card, `p${i}-temp`, tMin, tMax, 'Temperature');
    if (t !== undefined && Math.round(t) !== Math.round(tempOut(p.tempC))) patch.tempC = tempIn(t);

    const d = readNum(card, `p${i}-time`, LIMITS.durationMin, LIMITS.durationMax, 'Duration');
    if (d !== undefined && Math.round(d) !== Math.round(p.timeSec)) patch.timeSec = d;

    const bMin = isF() ? LIMITS.boostTempMinF : LIMITS.boostTempMinC;
    const bMax = isF() ? LIMITS.boostTempMaxF : LIMITS.boostTempMaxC;
    const bt = readNum(card, `p${i}-btemp`, bMin, bMax, 'Boost temperature');
    if (bt !== undefined && Math.round(bt) !== Math.round(deltaOut(p.boostTempC))) patch.boostTempC = deltaIn(bt);

    const bd = readNum(card, `p${i}-btime`, LIMITS.boostDurationMin, LIMITS.boostDurationMax, 'Boost time');
    if (bd !== undefined && Math.round(bd) !== Math.round(p.boostTimeSec)) patch.boostTimeSec = bd;

    const ci = card.querySelector(`#p${i}-color`);
    if (!ci.disabled && ci.value.toLowerCase() !== ci.dataset.initial.toLowerCase()) {
      patch.color = { ...fromHex(ci.value), lumaAnim: p.color?.kind === 'rgb' ? p.color.lumaAnim : LUMA.preserve };
    }

    if (!Object.keys(patch).length) { status.textContent = 'No changes'; return; }
    status.textContent = 'Saving';
    await state.dev.writeProfile(i, patch);
    state.profiles[i] = await state.dev.readProfile(i);
    renderProfilePicker();
    renderProfileEditors();
    renderLib();
    toast(`Saved ${state.profiles[i].name || `profile ${i + 1}`}`);
  });
  if (status.isConnected && status.textContent === 'Saving') status.textContent = '';
}

// ---------- library (templates and My profiles) ----------
function canWriteProfiles() { return state.connected && !isHeating() && !state.libBusy; }
function writeBlockedReason() {
  if (!state.connected) return 'Connect to load profiles onto the device.';
  if (isHeating()) return 'Stop heating to load profiles onto the device.';
  if (state.libBusy) return 'Writing to the device…';
  return null;
}

function renderLib() {
  if (!state.connected) return;
  renderLibrary($('library'), {
    profiles: state.profiles,
    canWrite: canWriteProfiles(),
    why: writeBlockedReason(),
    unit: state.unit,
    fmtTemp, tempOut, tempIn, toast,
    load: (i, spec) => writeSlots([[i, spec]]),
    loadSet: (specs) => writeSlots(specs.map((s, i) => [i, s])),
    refresh: renderLib,
  });
}

// Writes library profiles into device slots. Each profile it replaces is kept
// in My profiles first, unless it's already there or matches a template.
async function writeSlots(pairs) {
  if (!canWriteProfiles()) { toast(writeBlockedReason() ?? 'Not ready', 'error'); return; }
  state.libBusy = true;
  renderLib();
  let kept = 0;
  let done = 0;
  try {
    // Keep the replaced ones in reverse, so profile 1 ends up first in the list.
    for (const [i] of [...pairs].reverse()) if (keepProfile(profileSpec(state.profiles[i]), { auto: true }) === 'added') kept++;
    for (const [i, spec] of pairs) {
      const old = state.profiles[i];
      const patch = {
        name: spec.name.slice(0, LIMITS.profileNameMax), tempC: spec.tempC, timeSec: spec.timeSec,
        boostTempC: spec.boostTempC, boostTimeSec: spec.boostTimeSec,
      };
      if (spec.color && old?.color && ['rgb', 'table', 'none'].includes(old.color.kind)) {
        patch.color = { ...spec.color, lumaAnim: old.color.kind === 'rgb' ? old.color.lumaAnim : LUMA.preserve };
      }
      await state.dev.writeProfile(i, patch);
      state.profiles[i] = await state.dev.readProfile(i);
      done++;
    }
    if (pairs.length === 1) state.selected = pairs[0][0];
    const what = pairs.length === 1 ? `"${pairs[0][1].name}" into profile ${pairs[0][0] + 1}` : 'all four profiles';
    toast(`Loaded ${what}${kept ? `. ${kept === 1 ? 'The profile it replaced is' : `The ${kept} profiles it replaced are`} in My profiles` : ''}`);
  } catch (err) {
    console.error(err);
    logLine('err', err.message || String(err));
    toast(`${done ? `Loaded ${done} of ${pairs.length}, then: ` : ''}${err.message || err}`, 'error');
  } finally {
    state.libBusy = false;
    renderProfilePicker();
    renderProfileEditors();
    renderLib();
  }
}

// ---------- settings ----------
async function loadSettings() {
  const dev = state.dev;
  const br = await dev.tryRead('ledBrightness');
  if (br && br.length) {
    const pct = Math.round((br[0] / 255) * 100);
    $('s-brightness').value = pct;
    $('s-brightness-out').textContent = `${pct}%`;
  }
  $('s-brightness').disabled = !dev.has('ledBrightness');

  const st = await dev.tryRead('stealthMode');
  $('s-stealth').checked = st === 1;

  const rm = await dev.tryRead('readyModeCycle');
  $('s-ready').value = rm != null && rm >= 0 && rm <= 3 ? String(Math.round(rm)) : '-1';
  $('s-ready').disabled = !dev.has('readyModeCycle');

  const lc = await dev.tryRead('lanternColorApi2');
  if (lc?.kind === 'rgb') $('s-lantern-color').value = toHex(lc);
  $('s-lantern-color').disabled = !dev.has('lanternColorApi2');
  const rem = await dev.tryRead('lanternRemainingTime');
  $('s-lantern-status').textContent = rem > 0 ? `On, ${Math.round(rem / 60)} min left` : 'Off';
}

async function loadStats() {
  const dev = state.dev;
  const r = (k) => dev.tryRead(k);
  const rows = [];
  const add = (label, value, big = false) => { if (value != null && value !== '') rows.push([label, value, big]); };
  const n = (v, d = 0) => (v == null || !Number.isFinite(v) ? null : v.toLocaleString(undefined, { maximumFractionDigits: d }));

  add('Total dabs', n(await r('totalHeatCycles')), true);
  add('Dabs per day', n(await r('dabsPerDay'), 1), true);
  add('Dabs left on this charge', n(await r('approxDabsRemaining')), true);
  add('Trip counter', n(await r('tripHeatCycles')));
  const tt = await r('totalHeatCycleTime');
  add('Total heating time', tt == null ? null : `${n(tt / 3600, 1)} h`);
  const soc = await r('battSoc');
  add('Battery', soc == null ? null : `${n(soc, 1)}%`);
  const v = await r('battVolts');
  add('Battery voltage', v == null ? null : `${n(v, 2)} V`);
  const bt = await r('battTemp');
  add('Battery temperature', bt == null ? null : fmtTemp(bt));
  const CHARGE_TEXT = { Bulk: 'Charging', Topup: 'Topping up', Full: 'Full', TempStop: 'Paused, battery too warm or cold', 'Done/Disconnected': 'Not charging' };
  const cs = dev.enumLabel('battChargeState', await r('battChargeState'));
  add('Charging', CHARGE_TEXT[cs] ?? cs);
  const src = dev.enumLabel('battChargeSource', await r('battChargeSource'));
  add('Charger', src === 'None' ? 'Not plugged in' : src);
  const etf = await r('battChargeEstTimeToFull');
  add('Time to full', etf > 0 ? `${Math.round(etf / 60)} min` : null);
  add('Chamber', dev.enumLabel('heaterType', await r('heaterType')));
  add('Serial number', await r('serialNumber'));
  add('Firmware build', await r('gitHash'));
  add('Model code', await r('modelCode'));
  add('Hardware revision', await r('hardwareRevision'));
  add('API', dev.apiVersion != null ? `series ${dev.apiSeries}, version ${dev.apiVersion}` : `series ${dev.apiSeries}`);
  const mac = await r('euid');
  add('Bluetooth address', mac?.length ? Array.from(mac.slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join(':') : null);
  const up = await r('uptime');
  add('Uptime', up == null ? null : `${n(up / 3600, 1)} h`);

  $('stats').replaceChildren(...rows.map(([label, value, big]) => {
    const d = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = String(value);
    if (big) dd.className = 'big';
    d.append(dt, dd);
    return d;
  }));
}

// ---------- log ----------
function logLine(dir, text, quiet = false) {
  const entry = { dir, text, quiet, t: new Date() };
  state.log.push(entry);
  if (state.log.length > 800) state.log.shift();
  if (state.connecting) showProgress(entry);
  if (quiet && !$('log-poll').checked) return;
  appendLog(entry);
}
function appendLog(e) {
  const ol = $('log');
  const li = document.createElement('li');
  li.dataset.dir = e.dir;
  const time = e.t.toLocaleTimeString(undefined, { hour12: false });
  const d = document.createElement('span'); d.className = 'dir'; d.textContent = e.dir;
  li.append(`${time} `, d, e.text);
  const stick = ol.scrollTop + ol.clientHeight >= ol.scrollHeight - 8;
  ol.append(li);
  while (ol.childElementCount > 800) ol.firstElementChild.remove();
  if (stick) ol.scrollTop = ol.scrollHeight;
}
function rerenderLog() {
  $('log').replaceChildren();
  for (const e of state.log) if (!e.quiet || $('log-poll').checked) appendLog(e);
}

// ---------- wiring ----------
function setUnit(u) {
  state.unit = u;
  store.set('peak.unit', u);
  for (const b of document.querySelectorAll('.unit-toggle button')) b.setAttribute('aria-pressed', String(b.dataset.unit === u));
  if (state.connected) { renderProfilePicker(); renderProfileEditors(); renderLib(); }
  renderLive();
}

function selectTab(tab) {
  for (const t of document.querySelectorAll('[role="tab"]')) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute('aria-controls')).hidden = !on;
  }
  if (tab.id === 'tab-library') renderLib();
  if (tab.id === 'tab-stats') act(loadStats);
  if (tab.id === 'tab-device') act(loadSettings);
}

function init() {
  showVersion();

  if (!DEMO && !navigator.bluetooth) {
    $('bt-unsupported').hidden = false;
    $('btn-connect').disabled = true;
  }
  if (DEMO) $('btn-connect').textContent = 'Connect demo';
  // The start screen offers the demo; in the demo it offers the way back.
  $('demo-offer').hidden = DEMO;
  $('demo-on').hidden = !DEMO;

  $('btn-connect').addEventListener('click', () => (state.connecting ? state.lorax?.cancel() : connect()));
  $('btn-disconnect').addEventListener('click', () => state.lorax?.disconnect());
  for (const b of document.querySelectorAll('.unit-toggle button')) b.addEventListener('click', () => setUnit(b.dataset.unit));

  $('btn-start').addEventListener('click', () => act(async () => {
    await state.dev.startHeatCycle(state.selected);
    poll();
  }));
  $('btn-stop').addEventListener('click', () => act(async () => {
    await state.dev.stopHeatCycle();
    poll();
  }, 'Heating stopped'));
  $('btn-add-temp').addEventListener('click', () => act(async () => {
    await state.dev.addTemperatureC(isF() ? LIMITS.addTempF * 5 / 9 : LIMITS.addTempC);
    poll();
  }, isF() ? `Added ${LIMITS.addTempF}°F` : `Added ${LIMITS.addTempC}°C`));
  $('btn-add-time').addEventListener('click', () => act(async () => {
    await state.dev.addTimeSeconds(LIMITS.addTimeSec);
    poll();
  }, `Added ${LIMITS.addTimeSec} seconds`));

  // tabs with arrow-key support
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((t, i) => {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  // settings
  $('s-name-save').addEventListener('click', () => act(async () => {
    const v = $('s-name').value.trim().slice(0, LIMITS.deviceNameMax);
    if (!v) throw new Error('Enter a name first');
    await state.dev.write('deviceName', v);
    $('device-title').textContent = v;
  }, 'Device renamed'));

  $('s-brightness').addEventListener('input', (e) => { $('s-brightness-out').textContent = `${e.target.value}%`; });
  $('s-brightness').addEventListener('change', (e) => act(
    () => state.dev.setBrightness((Number(e.target.value) / 100) * 255), 'Brightness set'));

  $('s-stealth').addEventListener('change', (e) => act(
    () => state.dev.write('stealthMode', e.target.checked ? 1 : 0),
    e.target.checked ? 'Stealth mode on' : 'Stealth mode off'));

  $('s-ready').addEventListener('change', (e) => act(
    () => state.dev.write('readyModeCycle', Number(e.target.value)),
    Number(e.target.value) < 0 ? 'Ready mode off' : `Ready mode uses profile ${Number(e.target.value) + 1}`));

  $('s-lantern-on').addEventListener('click', () => act(async () => {
    if (state.dev.has('lanternColorApi2') && !$('s-lantern-color').disabled) {
      await state.dev.write('lanternColorApi2', { ...fromHex($('s-lantern-color').value), lumaAnim: LUMA.steady });
    }
    await state.dev.lanternOn();
    $('s-lantern-status').textContent = `On, ${LIMITS.lanternSeconds / 60} min left`;
  }, 'Mood light on'));
  $('s-lantern-off').addEventListener('click', () => act(async () => {
    await state.dev.lanternOff();
    $('s-lantern-status').textContent = 'Off';
  }, 'Mood light off'));

  $('s-power-off').addEventListener('click', () => {
    if (!confirm('Turn off the device? You will need to press its button to wake it.')) return;
    act(() => state.dev.powerOff(), 'Device turned off');
  });

  $('btn-refresh-stats').addEventListener('click', () => act(loadStats));
  $('btn-copy-details').addEventListener('click', () => act(
    () => navigator.clipboard.writeText($('connect-error-log').textContent), 'Technical details copied'));

  // log
  $('log-poll').addEventListener('change', rerenderLog);
  $('btn-clear-log').addEventListener('click', () => { state.log = []; rerenderLog(); });
  $('btn-copy-log').addEventListener('click', () => act(async () => {
    const text = state.log.map((e) => `${e.t.toISOString()} ${e.dir.padEnd(3)} ${e.text}`).join('\n');
    await navigator.clipboard.writeText(text);
  }, 'Log copied'));

  setUnit(state.unit);
}

init();
