// High-level Puffco device API on top of the LORAX transport.
// Command sequences mirror the official app (Puffco Connect 3.13.47).
import { FIELDS } from './fields.js?v=10';

export const MODE = {
  masterOff: 0, sleep: 1, idle: 2, tempSelectBegin: 3, tempSelectStop: 4,
  showBatteryLevel: 5, showVersion: 6, heatCycleStart: 7, heatCycleAbort: 8,
  heatCycleBoost: 9, factoryTest: 10, bonding: 11,
};

// LumaAnimation values written in byte 4 of an RGB color. 0 keeps the
// animation the device already has, which is what the app sends by default.
export const LUMA = { preserve: 0, steady: 1, breathing: 5, rising: 6, circling: 7, circlingSlow: 21 };

// Limits the app enforces in its UI.
export const LIMITS = {
  tempMinF: 400, tempMaxF: 644,
  durationMin: 15, durationMax: 120,
  boostTempMinF: 1, boostTempMaxF: 36, boostTempMinC: 1, boostTempMaxC: 20,
  boostDurationMin: 1, boostDurationMax: 60,
  brightnessMin: 38.25, brightnessMax: 255,
  profileNameMax: 31, deviceNameMax: 29,
  addTempF: 10, addTempC: 5, addTimeSec: 10,
  lanternSeconds: 7200,
};

const te = new TextEncoder();
const td = new TextDecoder();

function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }

export function decode(field, bytes) {
  const dv = view(bytes);
  const need = (n) => { if (bytes.length < n) throw new Error(`${field.path}: expected ${n} bytes, got ${bytes.length}`); };
  switch (field.type) {
    case 'float32': need(4); return dv.getFloat32(0, true);
    case 'int32': need(4); return field.div ? dv.getInt32(0, true) / field.div : dv.getInt32(0, true);
    case 'uint32': need(4); return dv.getUint32(0, true);
    case 'uint8': need(1); return dv.getUint8(0);
    case 'int8': need(1); return dv.getInt8(0);
    case 'string': return td.decode(bytes).replace(/\0+$/, '');
    case 'rgbtApi2': return decodeColor(bytes);
    default: return bytes.slice();
  }
}

export function encode(field, value) {
  switch (field.type) {
    case 'float32': { const b = new Uint8Array(4); view(b).setFloat32(0, value, true); return b; }
    case 'int32': { const b = new Uint8Array(4); view(b).setInt32(0, Math.round(field.div ? value * field.div : value), true); return b; }
    case 'uint32': { const b = new Uint8Array(4); view(b).setUint32(0, value >>> 0, true); return b; }
    case 'uint8': return Uint8Array.of(value & 0xff);
    case 'int8': { const b = new Uint8Array(1); view(b).setInt8(0, value); return b; }
    case 'string': return te.encode(value);
    case 'rgbtApi2': return encodeColor(value);
    default: return new Uint8Array(value);
  }
}

// RgbtColor (8 bytes). Byte 3 is the kind: 0 = RGB, 1 = animation table, 255 = none.
// RGB layout: r, g, b, 0, lumaAnim, 0, 0, 0
export function decodeColor(bytes) {
  if (bytes.length !== 8) return { kind: 'unsupported', raw: bytes.slice() };
  const kind = { 0: 'rgb', 1: 'table', 255: 'none' }[bytes[3]] ?? 'unknown';
  return { kind, r: bytes[0], g: bytes[1], b: bytes[2], lumaAnim: bytes[4], raw: bytes.slice() };
}

export function encodeColor({ r, g, b, lumaAnim = LUMA.preserve }) {
  return Uint8Array.of(r & 255, g & 255, b & 255, 0, lumaAnim & 255, 0, 0, 0);
}

export const cToF = (c) => c * 9 / 5 + 32;
export const fToC = (f) => (f - 32) * 5 / 9;

export class PuffcoDevice {
  constructor(lorax) {
    this.lorax = lorax;
    this.family = 'pikachoid';
    this.fields = FIELDS.pikachoid;
  }

  // The app reads /p/sys/fw/api after unlocking: high 16 bits are the API
  // series (0 = Peak Pro family, 1 = Proxy), low 16 bits the API version.
  // Firmware without that path is treated as Peak Pro.
  async detect() {
    try {
      const raw = await this.lorax.readShort(FIELDS.pikachoid.apiVersion.path);
      const v = view(raw).getUint32(0, true);
      this.apiSeries = v >>> 16;
      this.apiVersion = v & 0xffff;
    } catch {
      this.apiSeries = 0;
      this.apiVersion = null;
    }
    this.family = this.apiSeries === 1 ? 'toad' : 'pikachoid';
    this.fields = FIELDS[this.family];
    return { family: this.family, apiSeries: this.apiSeries, apiVersion: this.apiVersion };
  }

  has(name) { return name in this.fields; }

  field(name) {
    const f = this.fields[name];
    if (!f) throw new Error(`${name} is not available on this device`);
    return f;
  }

  async read(name, opts = {}) {
    const f = this.field(name);
    return decode(f, await this.lorax.readShort(f.path, opts));
  }

  async tryRead(name, opts = {}) {
    if (!this.has(name)) return null;
    try { return await this.read(name, opts); } catch { return null; }
  }

  async write(name, value) {
    const f = this.field(name);
    await this.lorax.writeShort(f.path, encode(f, value));
  }

  enumLabel(name, value) {
    return this.fields[name]?.enum?.[String(value)] ?? null;
  }

  // ---- heat cycle (same sequence as the app's startDabbing / stopDabbing) ----
  async startHeatCycle(profileIndex) {
    await this.write('selectedHeatCycle', profileIndex);
    await this.write('modeCmd', MODE.heatCycleStart);
  }

  async stopHeatCycle() {
    await this.write('modeCmd', MODE.heatCycleAbort);
    await this.write('modeCmd', MODE.idle);
  }

  // The app writes the increment itself, in °C, to tempOverride.
  addTemperatureC(deltaC) { return this.write('tempOverride', deltaC); }
  addTimeSeconds(sec) { return this.write('timeOverride', sec); }

  // ---- lantern / power ----
  async lanternOn() {
    await this.write('lanternStart', 1);
    await this.write('lanternTime', LIMITS.lanternSeconds);
  }
  lanternOff() { return this.write('lanternStart', 0); }

  async powerOff() {
    await this.write('lanternStart', 0);
    await this.write('modeCmd', MODE.masterOff);
  }

  setBrightness(v) {
    const b = Math.round(Math.min(LIMITS.brightnessMax, Math.max(LIMITS.brightnessMin, v)));
    return this.write('ledBrightness', Uint8Array.of(b, b, b, b));
  }

  // ---- profiles ----
  async readProfile(i) {
    const p = { index: i };
    p.name = await this.tryRead(`heatCycle${i}Name`);
    p.tempC = await this.tryRead(`heatCycle${i}Temp`);
    p.timeSec = await this.tryRead(`heatCycle${i}Time`);
    p.color = await this.tryRead(`heatCycle${i}ColorApi2`);
    p.boostTempC = await this.tryRead(`heatCycle${i}BoostTempDelta`);
    p.boostTimeSec = await this.tryRead(`heatCycle${i}BoostTimeDelta`);
    return p;
  }

  async readProfiles() {
    const out = [];
    for (let i = 0; i < 4; i++) out.push(await this.readProfile(i));
    return out;
  }

  async writeProfile(i, patch) {
    const map = {
      name: 'Name', tempC: 'Temp', timeSec: 'Time', color: 'ColorApi2',
      boostTempC: 'BoostTempDelta', boostTimeSec: 'BoostTimeDelta',
    };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || !map[k]) continue;
      await this.write(`heatCycle${i}${map[k]}`, v);
    }
  }
}
