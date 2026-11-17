// Simulated Peak Pro at the Web Bluetooth GATT level, for ?demo.
// It speaks real LORAX frames (including the SHA-256 unlock check), so the
// transport and device layers run unchanged against it.
import { UUID, OP } from './lorax.js?v=17';
import { FIELDS } from './fields.js?v=17';
import { encode, decode, MODE } from './device.js?v=17';

const F = FIELDS.pikachoid;
const KEY = Uint8Array.from(atob('ZMZFYlbyb1scoSc3pd1x+w=='), (c) => c.charCodeAt(0));
const ERR = { EPERM: 1, ENOENT: 2, EINVAL: 22 };
const byPath = Object.fromEntries(Object.entries(F).map(([k, f]) => [f.path, { name: k, ...f }]));

function initialValues() {
  const v = {
    deviceName: 'Peak Pro Demo', serialNumber: 'DEMO-0000-00001', gitHash: 'demo0000',
    modelCode: 21, hardwareRevision: 3, swOtaVersion: 61, apiVersion: (0 << 16) | 46,
    euid: Uint8Array.of(0x84, 0x2e, 0x14, 0x00, 0xbe, 0xef),
    userHeaterTemp: 31, userHeaterTempCommand: 0, heaterTemp: 31, operatingState: 5,
    stateElapsedTime: 0, stateTotalTime: 0, battSoc: 82.4, battChargeState: 4, battChargeSource: 3,
    battChargeEstTimeToFull: 0, battVolts: 3.98, battTemp: 27.5, batteryCapacity: 6264,
    selectedHeatCycle: 1, heaterType: 2, approxDabsRemaining: 41, dabsPerDay: 6.3,
    totalHeatCycles: 1874, totalHeatCycleTime: 1874 * 36, tripHeatCycles: 52, numHeatCycles: 4,
    stealthMode: 0, ledBrightness: Uint8Array.of(191, 191, 191, 191), readyModeCycle: -1,
    lanternTime: 0, lanternRemainingTime: 0, uptime: 86400 * 3,
    lanternColorApi2: { r: 90, g: 167, b: 255, lumaAnim: 1 },
  };
  const profiles = [
    ['Low', 243.3, 30, { r: 61, g: 139, b: 255 }],
    ['Medium', 265.6, 30, { r: 47, g: 191, b: 113 }],
    ['High', 285, 35, { r: 255, g: 159, b: 28 }],
    ['Peak', 310, 40, { r: 224, g: 69, b: 123 }],
  ];
  profiles.forEach(([name, t, s, c], i) => {
    Object.assign(v, {
      [`heatCycle${i}Name`]: name, [`heatCycle${i}Temp`]: t, [`heatCycle${i}Time`]: s,
      [`heatCycle${i}ColorApi2`]: { ...c, lumaAnim: 0 },
      [`heatCycle${i}BoostTempDelta`]: 5.5, [`heatCycle${i}BoostTimeDelta`]: 15,
      [`heatCycle${i}Intensity`]: 1,
    });
  });
  const store = new Map();
  for (const [k, val] of Object.entries(v)) if (F[k]) store.set(F[k].path, encode(F[k], val));
  return store;
}

const PROPS = {
  [UUID.version]: { read: true },
  [UUID.command]: { write: true, writeWithoutResponse: true },
  [UUID.reply]: { notify: true },
  [UUID.event]: { notify: true },
};

class MockChar extends EventTarget {
  constructor(uuid, server) {
    super();
    this.uuid = uuid;
    this.server = server;
    this.value = null;
    this.properties = { read: false, write: false, writeWithoutResponse: false, notify: false, indicate: false, ...PROPS[uuid] };
  }
  async startNotifications() { return this; }
  async readValue() {
    if (this.uuid === UUID.version) return new DataView(Uint8Array.of(0, 0).buffer);
    throw new DOMException('Not readable', 'NotSupportedError');
  }
  async writeValueWithoutResponse(data) {
    if (this.uuid !== UUID.command) throw new DOMException('Not writable', 'NotSupportedError');
    const frame = new Uint8Array(data.buffer ?? data, data.byteOffset ?? 0, data.byteLength).slice();
    setTimeout(() => this.server.handle(frame), 12 + Math.random() * 18);
  }
  notify(bytes) {
    if (!this.server.bonded) return; // ?demo=pairing: unencrypted link, device stays silent
    this.value = new DataView(bytes.buffer);
    this.dispatchEvent(new Event('characteristicvaluechanged'));
  }
}

class MockServer {
  constructor(device) {
    this.device = device;
    this.connected = false;
    this.store = initialValues();
    this.chars = Object.fromEntries(['version', 'command', 'reply', 'event'].map((k) => [UUID[k], new MockChar(UUID[k], this)]));
    this.unlocked = false;
    this.seed = null;
  }

  get(name) { return decode(F[name], this.store.get(F[name].path)); }
  set(name, v) { this.store.set(F[name].path, encode(F[name], v)); }

  async connect() {
    this.bonded ??= !this.device.needsBond;
    this.connected = true;
    this.tick = setInterval(() => this.simulate(0.25), 250);
    return this;
  }
  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    clearInterval(this.tick);
    this.unlocked = false;
    this.device.dispatchEvent(new Event('gattserverdisconnected'));
  }

  async getPrimaryService(uuid) {
    const notFound = () => { throw new DOMException('No such characteristic', 'NotFoundError'); };
    if (uuid === UUID.service) {
      return { getCharacteristic: async (c) => this.chars[c] ?? notFound() };
    }
    if (uuid === UUID.ota) {
      return { getCharacteristic: async (c) => (c === UUID.otaAppVersion ? this.otaVersionChar() : notFound()) };
    }
    throw new DOMException('No service', 'NotFoundError');
  }

  // Encrypted characteristic: reads fail until the "OS" finishes pairing.
  otaVersionChar() {
    return {
      uuid: UUID.otaAppVersion,
      properties: { read: true },
      readValue: async () => {
        // ?demo=stuck: the first read never settles, like a pending OS pairing prompt.
        if (this.device.stuckFirst && !this.stuckDone) {
          this.stuckDone = true;
          return new Promise(() => {});
        }
        // ?demo=notpaired: what a real Peak Pro returns when Windows hasn't paired.
        if (this.device.neverBond) throw new DOMException('GATT Error: Insufficient Encryption.', 'NotSupportedError');
        if (!this.bonded) {
          this.bondReads = (this.bondReads ?? 0) + 1;
          if (this.bondReads < 3) throw new DOMException('GATT operation not authorized.', 'SecurityError');
          this.bonded = true;
        }
        return new DataView(Uint8Array.of(0x3d, 0, 0, 0).buffer);
      },
    };
  }

  reply(seq, status, data = new Uint8Array(0)) {
    const out = new Uint8Array(3 + data.length);
    out[0] = seq & 0xff; out[1] = seq >> 8; out[2] = status; out.set(data, 3);
    this.chars[UUID.reply].notify(out);
  }

  async handle(frame) {
    if (!this.connected) return;
    const seq = frame[0] | (frame[1] << 8);
    const op = frame[2];
    const body = frame.subarray(3);
    const td = new TextDecoder();
    switch (op) {
      case OP.GetLimits: return this.reply(seq, 0, Uint8Array.of(128, 0, 4, 0, 8, 0));
      case OP.GetAccessSeed:
        this.seed = crypto.getRandomValues(new Uint8Array(16));
        return this.reply(seq, 0, this.seed);
      case OP.UnlockAccess: {
        const buf = new Uint8Array(32); buf.set(KEY); buf.set(this.seed ?? new Uint8Array(16), 16);
        const want = new Uint8Array(await crypto.subtle.digest('SHA-256', buf)).subarray(0, 16);
        this.unlocked = want.every((b, i) => b === body[i]);
        return this.reply(seq, this.unlocked ? 0 : ERR.EPERM);
      }
      case OP.ReadShort: {
        if (!this.unlocked) return this.reply(seq, ERR.EPERM);
        const path = td.decode(body.subarray(4));
        const v = this.store.get(path);
        return v ? this.reply(seq, 0, v) : this.reply(seq, ERR.ENOENT);
      }
      case OP.WriteShort: {
        if (!this.unlocked) return this.reply(seq, ERR.EPERM);
        const rest = body.subarray(3);
        const nul = rest.indexOf(0);
        if (nul < 0) return this.reply(seq, ERR.EINVAL);
        const path = td.decode(rest.subarray(0, nul));
        const data = rest.slice(nul + 1);
        const f = byPath[path];
        if (!f || !f.rw.includes('w')) return this.reply(seq, f ? ERR.EPERM : ERR.ENOENT);
        this.onWrite(f.name, decode(f, data), data);
        return this.reply(seq, 0);
      }
      default: return this.reply(seq, ERR.EINVAL);
    }
  }

  onWrite(name, value, raw) {
    const F_ = F[name];
    switch (name) {
      case 'modeCmd': return this.mode(value);
      case 'tempOverride': return this.set('userHeaterTempCommand', this.get('userHeaterTempCommand') + value);
      case 'timeOverride': return this.set('stateTotalTime', this.get('stateTotalTime') + value);
      case 'lanternStart': if (!value) this.set('lanternRemainingTime', 0); return;
      case 'lanternTime': return this.set('lanternRemainingTime', value);
      default: this.store.set(F_.path, raw);
    }
  }

  mode(cmd) {
    const st = this.get('operatingState');
    if (cmd === MODE.heatCycleStart && st !== 7 && st !== 8) {
      const i = this.get('selectedHeatCycle');
      this.set('userHeaterTempCommand', this.get(`heatCycle${i}Temp`));
      this.enter(7, 14);
    } else if (cmd === MODE.heatCycleAbort && (st === 7 || st === 8)) {
      this.enter(9, 4);
    } else if (cmd === MODE.idle && st !== 7 && st !== 8) {
      if (st === 9) return;
      this.enter(5, 0);
    } else if (cmd === MODE.masterOff) {
      setTimeout(() => this.disconnect(), 300);
    }
  }

  enter(state, total) {
    this.set('operatingState', state);
    this.set('stateElapsedTime', 0);
    this.set('stateTotalTime', total);
  }

  simulate(dt) {
    const st = this.get('operatingState');
    const el = this.get('stateElapsedTime') + dt;
    const total = this.get('stateTotalTime');
    let temp = this.get('userHeaterTemp');
    const target = this.get('userHeaterTempCommand');
    if (st === 7) {
      const remaining = Math.max(0.25, total - el);
      temp += (target - temp) * Math.min(1, dt / remaining * 2.2);
      if (el >= total) { temp = target; this.enter(8, this.get(`heatCycle${this.get('selectedHeatCycle')}Time`)); }
      else this.set('stateElapsedTime', el);
    } else if (st === 8) {
      temp += (target - temp) * 0.3 + (Math.random() - 0.5) * 0.6;
      if (el >= total) { this.enter(9, 5); this.set('totalHeatCycles', this.get('totalHeatCycles') + 1); }
      else this.set('stateElapsedTime', el);
    } else {
      temp += (31 - temp) * dt * (st === 9 ? 0.12 : 0.06);
      if (st === 9) {
        if (el >= total) { this.enter(5, 0); this.set('userHeaterTempCommand', 0); }
        else this.set('stateElapsedTime', el);
      }
    }
    this.set('userHeaterTemp', temp);
    this.set('heaterTemp', temp);
    const lr = this.get('lanternRemainingTime');
    if (lr > 0) this.set('lanternRemainingTime', Math.max(0, lr - dt));
  }
}

class MockDevice extends EventTarget {
  constructor({ unpaired = false, needsBond = false, stuckFirst = false, neverBond = false } = {}) {
    super();
    this.neverBond = neverBond;
    this.needsBond = needsBond;
    this.stuckFirst = stuckFirst;
    this.id = 'demo';
    this.name = 'Peak Pro Demo';
    const server = new MockServer(this);
    this.gatt = {
      // ?demo=unpaired mimics a Peak Pro that is bonded elsewhere and not in pairing mode.
      connect: () => (unpaired
        ? Promise.reject(new DOMException('Connection Error: Connection attempt failed.', 'NetworkError'))
        : server.connect()),
      disconnect: () => server.disconnect(),
      get connected() { return server.connected; },
    };
  }
}

export async function requestMockDevice(opts) {
  return new MockDevice(opts);
}
