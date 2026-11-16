// LORAX transport for Puffco Peak Pro / Proxy over Web Bluetooth.
//
// Frame (write, COMMAND char, write-without-response):
//   seqId u16 LE | opcode u8 | payload
// Reply (REPLY char, notify):
//   seqId u16 LE | status u8 (0 = OK) | data
//
// Everything below was recovered from Puffco Connect 3.13.47
// (index.android.bundle, Hermes v96) and cross-checked against
// magikh0e/puffco-lorax-decode and austenstone/puffco-mcp.

export const UUID = {
  service: 'e276967f-ea8a-478a-a92e-d78f5dd15dd5',
  version: '05434bca-cc7f-4ef6-bbb3-b1c520b9800c',
  command: '60133d5c-5727-4f2c-9697-d842c5292a3c',
  reply:   '8dc5ec05-8f7d-45ad-99db-3fbde65dbd9c',
  event:   '43312cd1-7d34-46ce-a7d3-0a98fd9b4cb8',
  // Other Puffco services, requested so the chooser can match any model.
  legacy:  '06caf9c0-74d3-454f-9be9-e30cd999c17a', // Peak Pro on firmware older than "AB"
  info:    '420b9b40-457d-4abe-a3bf-71609d79581b', // "pup" service in the app
  ota:     '1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0', // Silicon Labs OTA service
  otaAppVersion: '0d77cc11-4ac1-49f2-bfa9-cd96ac7a92f8',
  pupAppVersion: '58b0a7aa-d89f-4bf2-961d-0d892d7439d8',
};

// The app's web transport (triggerBonding) reads one of these before any
// LORAX traffic. They need an encrypted link, so the read makes the OS pair
// and encrypt; LORAX frames sent on an unencrypted link get no reply.
const BOND_CHARS = [
  [UUID.ota, UUID.otaAppVersion, 'OTA app version'],
  [UUID.info, UUID.pupAppVersion, 'device app version'],
];

// Opcode enum as named in the app.
export const OP = {
  GetAccessSeed: 0x00, UnlockAccess: 0x01, GetLimits: 0x02, AckEvents: 0x03,
  ReadShort: 0x10, WriteShort: 0x11, StatShort: 0x12, Unlink: 0x13,
  FileOpen: 0x20, FileRead: 0x21, FileWrite: 0x22, FileWatch: 0x23,
  FileUnwatch: 0x24, FileStat: 0x25, FileClose: 0x26, PruneFileHandles: 0x27,
};
const OP_NAME = Object.fromEntries(Object.entries(OP).map(([k, v]) => [v, k]));

// LoraxOpenFlags. The app passes `truncate` on every WriteShort, which is the
// constant 0x04 seen in captures (it is a flag, not a byte position).
export const OPEN_FLAGS = { create: 1, exclude: 2, truncate: 4 };

// The app's handshake table: { flatA, flatX, lorax }. LORAX uses `lorax`.
const LORAX_KEY_B64 = 'ZMZFYlbyb1scoSc3pd1x+w==';

// Company ID and OUI name prefixes from the official web app's requestDevice().
const PUFFCO_COMPANY_ID = 3075;
const OUI_PREFIXES = ['000B57','003C84','040D84','048727','04CD15','04E3E5','086BD7','08B95F','08DDEB','0C2A6F','0C4314','0CAE5F','0CEFF6','142D41','14B457','187A3E','1C34F1','1CC089','286847','287681','28DBA7','2C1165','30FB10','3410F4','3425B4','38398F','385B44','385CFB','3C2EF5','403059','44E2F8','4C5BB3','4C97A1','50325F','540F57','583BC2','588E81','5C0272','5CC7C1','60A423','60B647','60EFAB','680AE2','6C5CB1','6CFD22','705464','70AC08','70C59C','7CC6B6','804B50','842712','842E14','847127','84B4DB','84BA20','84FD27','881A14','8C65A3','8C6FB9','8CF681','9035EA','90395E','90AB96','90FD9F','943469','94B216','94DEB8','94EC32','980C33','A46DD4','A49E69','B0C7DE','B43522','B43A31','B4E3F9','BC026E','BC33AC','C4D8C8','CC86EC','CCCCCC','D0CF5E','D44867','D87A3B','DC8E95','E0798D','E406BF','E8E07E','EC1BBD','ECF64C','F082C0','F4B3B1','F84477','FC4D6A','F0AD4E'];

export function requestOptions() {
  return {
    filters: [
      { services: [UUID.service] },
      { services: [UUID.legacy] },
      { manufacturerData: [{ companyIdentifier: PUFFCO_COMPANY_ID }] },
      { services: [UUID.info] },
      { namePrefix: 'Peak' },
      { namePrefix: 'PEAK' },
      { namePrefix: 'Puffco' },
      { namePrefix: 'PUFFCO' },
      { namePrefix: 'Proxy' },
      ...OUI_PREFIXES.map((p) => ({ namePrefix: p })),
    ],
    optionalServices: [UUID.service, UUID.legacy, UUID.info, UUID.ota],
    optionalManufacturerData: [PUFFCO_COMPANY_ID],
  };
}

export const hex = (bytes) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer ?? bytes),
    (b) => b.toString(16).padStart(2, '0')).join(' ');

export class LoraxError extends Error {
  constructor(code, label) {
    super(`${label} failed (device status ${code})`);
    this.code = code;
  }
}

// Web Bluetooth calls can stall forever on Windows (for example while an OS
// pairing prompt is pending), so every step that waits on the radio gets a limit.
let abortSignal = new Promise(() => {}); // replaced per connection attempt

function withTimeout(promise, ms, what) {
  let timer;
  const t = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const e = new Error(`${what} got no answer within ${ms / 1000} s`);
      e.name = 'TimeoutError';
      reject(e);
    }, ms);
  });
  return Promise.race([promise, t, abortSignal]).finally(() => clearTimeout(timer));
}

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function authToken(seed) {
  const key = b64ToBytes(LORAX_KEY_B64);
  const buf = new Uint8Array(32);
  buf.set(key, 0);
  buf.set(seed.subarray(0, 16), 16);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  return digest.subarray(0, 16);
}

const enc = new TextEncoder();

export class LoraxClient extends EventTarget {
  constructor({ timeoutMs = 4000 } = {}) {
    super();
    this.timeoutMs = timeoutMs;
    this.device = null;
    this.chars = {};
    this.seq = 0;
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.maxPayload = 128;
    this.connected = false;
  }

  log(dir, text, quiet = false) {
    this.dispatchEvent(new CustomEvent('log', { detail: { dir, text, quiet, t: Date.now() } }));
  }

  async connect(device) {
    this.device = device;
    if (!this._onGattDisconnect) {
      this._onGattDisconnect = () => this.#onDisconnect();
      device.addEventListener('gattserverdisconnected', this._onGattDisconnect);
    }
    this.cancelled = false;
    abortSignal = new Promise((_, reject) => { this._abort = reject; });
    abortSignal.catch(() => {});
    this.log('sys', `Connecting to ${device.name || device.id}`);

    // If the device was just paired (it was in pairing mode), Windows may
    // finish bonding after we subscribe, and the subscription never delivers.
    // A fresh connection on the now-bonded link fixes that, so retry once.
    for (let attempt = 1; ; attempt++) {
      this.stage('Connecting');
      const server = await this.#gattConnect(device);
      try {
        this.stage('Pairing');
        await this.#triggerBonding(server);
        this.stage('Unlocking');
        await this.#setup(server);
        this.connected = true;
        await this.#handshake();
        return;
      } catch (err) {
        const retryable = /timed out/.test(err.message) || err.transient;
        if (attempt >= 2 || !retryable) throw err;
        this.log('sys', `${err.message}. Reconnecting once.`);
        this.#silentDisconnect();
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  stage(text) {
    this.dispatchEvent(new CustomEvent('stage', { detail: text }));
  }

  // Based on the app's web triggerBonding(timeout = 30000, interval = 500).
  // The app stops at the first readable characteristic; this reads every one
  // that exists, because the OTA one may be readable without encryption.
  async #triggerBonding(server, timeoutMs = 30000, intervalMs = 500) {
    let passed = 0;
    for (const [svcUuid, charUuid, label] of BOND_CHARS) {
      let char;
      try {
        const svc = await withTimeout(server.getPrimaryService(svcUuid), 10000, `Finding the ${label} service`);
        char = await withTimeout(svc.getCharacteristic(charUuid), 10000, `Finding the ${label} characteristic`);
      } catch (err) {
        this.#checkCancelled();
        if (!this.device.gatt.connected) throw this.#dropped(err);
        if (err.name === 'TimeoutError') throw this.#dropped(err);
        this.log('sys', `No ${label} characteristic (${err.name}); trying the next pairing check`);
        continue; // not on this model, try the next one
      }
      this.log('sys', `Pairing check: reading ${label}`);
      const start = performance.now();
      const deadline = start + timeoutMs;
      for (let n = 1; ; n++) {
        this.#checkCancelled();
        this.stage(`Pairing (${Math.max(0, Math.ceil((deadline - performance.now()) / 1000))} s left)`);
        try {
          const v = await withTimeout(char.readValue(), 6000, `Reading ${label}`);
          this.log('sys', `Pairing check passed: read ${label} (${hex(new Uint8Array(v.buffer, v.byteOffset, v.byteLength))})${n > 1 ? ` after ${n} tries, ${Math.round((performance.now() - start) / 1000)} s` : ''}`);
          passed++;
          break;
        } catch (err) {
          this.#checkCancelled();
          this.log('sys', `Pairing check try ${n}: ${err.name}: ${err.message}`, n > 3);
          if (!this.device.gatt.connected) throw this.#dropped(err);
          // The Peak Pro answers this read with ATT "Insufficient Encryption"
          // until Windows has paired with it, and Windows doesn't pair on its own.
          if (/encrypt|authenticat|not paired|insufficient/i.test(err.message) && n >= 3) {
            const e = new Error(`Windows isn't paired with the device (${err.name}: ${err.message})`);
            e.notPaired = true;
            throw e;
          }
          if (performance.now() >= deadline) {
            throw new Error(`Pairing didn't complete within ${timeoutMs / 1000} s (${err.name}: ${err.message})`);
          }
          await new Promise((r) => setTimeout(r, intervalMs));
        }
      }
    }
    if (!passed) this.log('sys', 'No pairing check characteristic found; continuing without it');
  }

  cancel() {
    this.cancelled = true;
    this.log('sys', 'Cancelled');
    const e = new Error('Connection cancelled');
    e.name = 'AbortError';
    this._abort?.(e);
    try { this.device?.gatt.disconnect(); } catch {}
  }

  #checkCancelled() {
    if (this.cancelled) {
      const e = new Error('Connection cancelled');
      e.name = 'AbortError';
      throw e;
    }
  }

  #dropped(err) {
    const e = new Error(`The device dropped the connection (${err.name}: ${err.message})`);
    e.transient = true;
    e.dropped = true;
    return e;
  }

  #silentDisconnect() {
    this.suppressDisconnect = true;
    this.connected = false;
    try { this.device.gatt.disconnect(); } catch {}
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(new Error('Reconnecting')); }
    this.pending.clear();
    setTimeout(() => { this.suppressDisconnect = false; }, 500);
  }

  async #setup(server) {
    let svc;
    try {
      svc = await withTimeout(server.getPrimaryService(UUID.service), 10000, 'Finding the LORAX service');
    } catch (err) {
      this.#checkCancelled();
      this.log('err', `Looking up the LORAX service failed: ${err.name}: ${err.message}`);
      if (!this.device.gatt.connected || err.name !== 'NotFoundError') throw this.#dropped(err);
      let legacy = false;
      try { await server.getPrimaryService(UUID.legacy); legacy = true; } catch {}
      try {
        const list = await server.getPrimaryServices();
        this.log('sys', `Services visible: ${list.map((s) => s.uuid).join(', ') || 'none'}`);
      } catch {}
      this.device.gatt.disconnect();
      throw new Error(legacy
        ? 'This Peak Pro is on older firmware that uses the legacy Bluetooth layout. Update it with the Puffco app, then connect again.'
        : 'This device does not expose the Puffco control service.');
    }

    const props = (c) => Object.entries({
      read: c.properties.read, write: c.properties.write, writeNoResp: c.properties.writeWithoutResponse,
      notify: c.properties.notify, indicate: c.properties.indicate,
    }).filter(([, v]) => v).map(([k]) => k).join(',');

    // Same order as the app: read the version, subscribe reply then event.
    try {
      const version = await svc.getCharacteristic(UUID.version);
      const v = await withTimeout(version.readValue(), 6000, 'Reading the version characteristic');
      const bytes = new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
      this.protocolVersion = v.byteLength >= 2 ? v.getUint16(0, true) : v.getUint8(0);
      this.log('sys', `Version characteristic: ${hex(bytes)} (LORAX v${this.protocolVersion})`);
    } catch (err) {
      this.log('err', `Reading the version characteristic failed: ${err.name}: ${err.message}`);
    }

    const command = await svc.getCharacteristic(UUID.command);
    const reply = await svc.getCharacteristic(UUID.reply);
    this.chars = { command, reply };
    this.log('sys', `command [${props(command)}], reply [${props(reply)}]`);

    // Replies normally arrive on the reply characteristic; also accept them on
    // the event characteristic, like magikh0e's puffco_client.py does.
    this.#listen(reply, 'reply');
    await withTimeout(reply.startNotifications(), 10000, 'Subscribing to replies');
    this.log('sys', 'Subscribed to replies');

    try {
      const event = await svc.getCharacteristic(UUID.event);
      this.log('sys', `event [${props(event)}]`);
      this.#listen(event, 'event');
      await withTimeout(event.startNotifications(), 10000, 'Subscribing to events');
      this.chars.event = event;
    } catch (err) {
      this.log('err', `Event channel unavailable: ${err.name}: ${err.message}`);
    }
  }

  #listen(char, source) {
    this._listeners ??= new Map();
    const old = this._listeners.get(char);
    if (old) char.removeEventListener('characteristicvaluechanged', old);
    const fn = (e) => this.#onReply(e.target.value, source);
    char.addEventListener('characteristicvaluechanged', fn);
    this._listeners.set(char, fn);
  }

  // Windows often fails the first GATT connect to a device it just scanned.
  // A Peak Pro that isn't bonded to this computer fails every attempt until it
  // is put in pairing mode; the official web app treats that error as
  // WEB_BONDING_ERROR.
  async #gattConnect(device, attempts = 2) {
    for (let i = 1; ; i++) {
      this.#checkCancelled();
      try {
        const server = await withTimeout(device.gatt.connect(), 20000, 'Connecting');
        this.log('sys', 'Bluetooth link open');
        return server;
      } catch (err) {
        this.#checkCancelled();
        this.log('err', `Connect attempt ${i} failed: ${err.name}: ${err.message}`);
        if (err.name === 'TimeoutError') { try { device.gatt.disconnect(); } catch {} }
        if (i >= attempts || err.name !== 'NetworkError') {
          if (err.name === 'NetworkError') err.pairingHint = true;
          throw err;
        }
        await new Promise((r) => setTimeout(r, 700));
      }
    }
  }

  async #handshake() {
    const limits = await this.transact(OP.GetLimits, null, 'GetLimits');
    if (limits.byteLength >= 2) {
      const dv = new DataView(limits.buffer, limits.byteOffset, limits.byteLength);
      this.maxPayload = dv.getUint16(0, true);
      this.limits = {
        maxPayload: this.maxPayload,
        maxFiles: limits.byteLength >= 4 ? dv.getUint16(2, true) : undefined,
        maxCommands: limits.byteLength >= 6 ? dv.getUint16(4, true) : undefined,
      };
    }
    const seed = await this.transact(OP.GetAccessSeed, null, 'GetAccessSeed');
    if (seed.byteLength < 16) throw new Error(`Access seed was ${seed.byteLength} bytes, expected 16`);
    await this.transact(OP.UnlockAccess, await authToken(seed), 'UnlockAccess');
    this.log('sys', `Unlocked (max payload ${this.maxPayload} bytes)`);
  }

  disconnect() {
    if (this.device?.gatt.connected) this.device.gatt.disconnect();
  }

  #onDisconnect() {
    if (this.suppressDisconnect) return;
    this.connected = false;
    for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(new Error('Device disconnected')); }
    this.pending.clear();
    this.log('sys', 'Disconnected');
    this.dispatchEvent(new Event('disconnect'));
  }

  #onReply(dv, source = 'reply') {
    const bytes = new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength).slice();
    const tag = source === 'reply' ? 'rx' : 'evt';
    if (bytes.length < 3) { this.log(tag, hex(bytes)); return; }
    const seq = bytes[0] | (bytes[1] << 8);
    const status = bytes[2];
    const p = this.pending.get(seq);
    this.log(tag, `${hex(bytes)}${p ? `  ${p.label}` : ''}`, p?.quiet);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(seq);
    if (status !== 0) p.reject(new LoraxError(status, p.label));
    else p.resolve(bytes.subarray(3));
  }

  // One transaction in flight at a time: Web Bluetooth rejects overlapping GATT
  // operations, and the device processes commands in order anyway.
  transact(opcode, payload, label = OP_NAME[opcode], quiet = false) {
    const run = () => this.#send(opcode, payload, label, quiet);
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => {});
    return next;
  }

  async #send(opcode, payload, label, quiet) {
    if (!this.connected) throw new Error('Not connected');
    this.seq = (this.seq + 1) & 0xffff;
    const seq = this.seq;
    const body = payload ? new Uint8Array(payload) : new Uint8Array(0);
    const frame = new Uint8Array(3 + body.length);
    frame[0] = seq & 0xff; frame[1] = seq >> 8; frame[2] = opcode;
    frame.set(body, 3);

    const result = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq);
        reject(new Error(`${label} timed out`));
      }, this.timeoutMs);
      this.pending.set(seq, { resolve, reject, timer, label, quiet });
    });
    this.log('tx', `${hex(frame)}  ${label}`, quiet);
    try {
      const cmd = this.chars.command;
      // The app writes without response; fall back if the device only allows a normal write.
      if (cmd.properties.writeWithoutResponse || !cmd.properties.write) await cmd.writeValueWithoutResponse(frame);
      else await cmd.writeValueWithResponse(frame);
    } catch (err) {
      const p = this.pending.get(seq);
      if (p) { clearTimeout(p.timer); this.pending.delete(seq); }
      throw err;
    }
    return result;
  }

  // ReadShort: offset u16 | maxLen u16 | path
  readShort(path, { offset = 0, size = this.maxPayload, quiet = false } = {}) {
    const p = enc.encode(path);
    const payload = new Uint8Array(4 + p.length);
    payload[0] = offset & 0xff; payload[1] = offset >> 8;
    payload[2] = size & 0xff; payload[3] = size >> 8;
    payload.set(p, 4);
    return this.transact(OP.ReadShort, payload, `read ${path}`, quiet);
  }

  // WriteShort: offset u16 | flags u8 | path | 0x00 | data
  writeShort(path, data, { offset = 0, flags = OPEN_FLAGS.truncate } = {}) {
    const p = enc.encode(path);
    const d = new Uint8Array(data);
    const payload = new Uint8Array(3 + p.length + 1 + d.length);
    payload[0] = offset & 0xff; payload[1] = offset >> 8; payload[2] = flags;
    payload.set(p, 3);
    payload[3 + p.length] = 0;
    payload.set(d, 4 + p.length);
    return this.transact(OP.WriteShort, payload, `write ${path}`);
  }
}
