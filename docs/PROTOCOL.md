# LORAX protocol notes (from Puffco Connect 3.13.47)

Source: `index.android.bundle` (Hermes bytecode v96) from the Android app
3.13.47, decompiled with hermes-dec. The app's field registry was evaluated to
JSON (not published here; `js/fields.js` holds the Peak Pro and Proxy subset the
app uses). It contains four tables:

| table | addressing | used by |
|---|---|---|
| `ota` | GATT char | OTA app version |
| `flat` | GATT char per field, `f9a98c15-c651-4f34-b656-d100bf58XX00`, XX = `offset` in hex | Peak Pro firmware older than `AB` |
| `loraxPikachoid` | LORAX path, values mostly `float32` | Peak Pro family (`apiSeries` 0) |
| `loraxToad` | LORAX path, values `int32` with a scale divisor | Proxy (`apiSeries` 1) |

Each entry has `path` (or `offset`), `dataType`, `attrs` {read, write}, optional
`encodings` (enum labels) and `minApi`/`maxApi` firmware gates. Device
codenames: `pikachu`, `raichu`, `peach` (Peak Pro variants), `toad` (Proxy).

## Verified on hardware

A Peak Pro on firmware build (`/p/sys/fw/gith`) `5652c02`, tested from
Windows 11 (bleak 3.1 and Chrome 157). Everything else in this file comes from
the app's source.

- **GATT layout.** Services `1801`, `1800`, Silabs OTA `1d14d6ee…` (control
  `f7bf3564` write, app version `0d77cc11` read) and LORAX `e276967f…`. LORAX
  characteristics: version `05434bca` read → `01 00`; command `60133d5c`
  write-without-response only (write-with-response → ATT "Write Not
  Permitted"); reply `8dc5ec05` notify; event `43312cd1` notify. The Peak Pro
  has **no** "pup" service `420b9b40…`; that's Proxy-only.
- **Encryption is mandatory.** Without a pairing, reading `0d77cc11` fails with
  ATT error 0x0F "Insufficient Encryption", and every LORAX frame (GetLimits,
  GetAccessSeed, in any order) gets no reply at all.
- **Windows pairing.** Chrome never paired it, and Windows Settings didn't list
  it. `DeviceInformationCustomPairing.PairAsync(ConfirmOnly)` with auto-accept
  worked: it offered `CONFIRM_ONLY` and returned `PAIRED`. After failed attempts,
  Windows kept answering `OPERATION_ALREADY_IN_PROGRESS` instantly (even with no
  connection open), and Windows' basic pairing returned `FAILED`. Toggling
  Bluetooth didn't clear it; a reboot did.
- **Once paired**, the OTA read returns `27 00 00 00`. bleak reported an MTU of
  23 right after connecting and 247 a second later, so long replies (like the
  19-byte serial) arrive in one notification.
- **GetLimits** reply `00 | f1 00 | 24 00 | 08 00`: max payload 241, max files
  36, max commands 8.
- **Unlock.** GetAccessSeed returns 16 bytes; token =
  `SHA-256(lorax key ++ seed)[0:16]` with key `ZMZFYlbyb1scoSc3pd1x+w==` → status 0.
- **ReadShort** `offset u16 | size u16 | path` respects `size` (asking for 17
  bytes of the 19-byte serial returns 17). Values seen:
  - `/p/app/htr/temp` float32 `93 37 d2 41` = 26.3 °C
  - `/u/app/hc/1/temp` float32 `1d c7 84 43` = 265.6 °C (510 °F)
  - `/u/app/hc/0/name` `"Low"`, no terminator
  - `/u/app/hc/0/colr` `00 00 ff 00 00 00 00 00` (rgbtApi2, kind RGB, blue)
  - `/u/app/ui/lbrt` `ff ff ff ff`
  - `/u/sys/name` empty (never set)
- **Start heat cycle works.** WriteShort (flags `0x04` truncate) of
  `/p/app/hcs` = profile index as int8, then `/p/app/mc` = `07` as uint8: the
  device preheats, and `/p/app/htr/temp` climbs as polled.
- **Stop works.** `/p/app/mc` = `08` (heat cycle abort), then `/p/app/mc` =
  `02` (idle): heating stops.
- **Overrides work during a heat cycle.** `/p/app/tmpo` = increment in °C as
  float32 (the app's +10°F is written as 5.556) raises the target, and
  `/p/app/timo` = seconds as float32 (10.0) extends the time left.
- **Mood light works.** `/p/app/ltrn/colr` = rgbtApi2 `r g b 00 01 00 00 00`
  (RGB, lumaAnim 1 = steady), then `/p/app/ltrn/cmd` = `01` (uint8), then
  `/p/app/ltrn/time` = 7200.0 (float32 seconds): the light comes on in the
  chosen color. `/p/app/ltrn/cmd` = `00` turns it off.
- **Also confirmed through the web app:** profile edits, stealth, ready mode,
  brightness writes and power off.
- **Not yet characterized:** the event channel. The web app subscribes to it,
  but hasn't been checked for what the device sends there.

## Connecting and bonding

- The device only accepts a connection from a new central while in pairing
  mode (hold the button until the logo glows blue). The app's web build maps
  Chrome's `NetworkError: Connection attempt failed.` to `WEB_BONDING_ERROR`
  and shows those instructions.
- The link must be bonded and encrypted before LORAX answers. Write-without-
  response frames on an unencrypted link are ignored silently (seen on a Peak
  Pro: GetLimits never got a reply). On Android the app calls `createBond`. On
  the web it calls `triggerBonding(timeout = 30000, interval = 500)`, which
  repeatedly reads an encrypted characteristic until the OS has paired:
  `silabsOtaAppVersionChar` `0d77cc11-4ac1-49f2-bfa9-cd96ac7a92f8` in service
  `1d14d6ee-fd63-4fa1-bfa4-8f47b42119f0`, else `pupAppVersionChar`
  `58b0a7aa-d89f-4bf2-961d-0d892d7439d8` in service `420b9b40-…`.
- App startup order after that: read `loraxVersionChar` (must be 2 bytes, u16
  ≤ 255; a Peak Pro returned `01 00`), subscribe to reply, then event, then unlock.
- "pup" service characteristics in order: trigger `c830ee3e`, app version
  `58b0a7aa`, app hash `4daad5ae`, device info `2dab0217`, serial `a5fa5a5d`,
  general command `c364cf1d`, general command response `baeb965b`, bootloader
  version `0d7ec9f3`, bootloader hash `5c03d675`. Silabs OTA: control
  `f7bf3564`, data `984227f3`, app version `0d77cc11`, loader version `4cc07bcf`.

## Opcodes (full enum from the app)

| op | name | | op | name |
|---|---|---|---|---|
| 0x00 | GetAccessSeed | | 0x20 | FileOpen |
| 0x01 | UnlockAccess | | 0x21 | FileRead |
| 0x02 | GetLimits | | 0x22 | FileWrite |
| 0x03 | AckEvents | | 0x23 | FileWatch |
| 0x10 | ReadShort | | 0x24 | FileUnwatch |
| 0x11 | WriteShort | | 0x25 | FileStat |
| 0x12 | StatShort | | 0x26 | FileClose |
| 0x13 | Unlink | | 0x27 | PruneFileHandles |

## Payloads

- `ReadShort`: `offset u16 LE | maxLen u16 LE | path` (no terminator).
- `WriteShort`: `offset u16 LE | flags u8 | path | 0x00 | data`.
  `flags` is a `LoraxOpenFlags` bitmask: `create=1, exclude=2, truncate=4`.
  The app always writes with `offset=0, flags=truncate`, which is the `0x04`
  seen on every write in captures. It is not a byte position.
- If a WriteShort fails with `EMSGSIZE`, the app falls back to `StatShort`,
  then `FileOpen` + chunked `FileWrite` (0x22) sized by `maxWriteLength`. That
  path is only needed for values bigger than one frame (scratchpads, LED arrays).
- `GetLimits` reply: `maxPayload u16 | maxFiles u16 | maxCommands u16`.
- Auth handshake keys in the app: `{ flatA: 8469038, flatX: 'FUrZc0WilhUBteT2JlCc+A==', lorax: 'ZMZFYlbyb1scoSc3pd1x+w==' }`.
  The token is `SHA-256(key ++ seed[0:16])[0:16]` for both `flatX` and `lorax`.

## Device family detection

After unlocking, the app reads `apiVersion` (`/p/sys/fw/api`, uint32):
`apiSeries = v >> 16`, `apiVersion = v & 0xffff`. If that path returns ENOENT
it reads `swOtaVersion` (`/p/sys/fw/ver`) and assumes the Peak Pro series.
Series 0 uses the `loraxPikachoid` encodings, series 1 the `loraxToad` ones.
This is why `/p/bat/soc` reads as float32 on a Peak Pro but as int32/100 on a Proxy.

## Control sequences (as the app does them)

| action | writes |
|---|---|
| start heat cycle (`startDabbing`) | `/p/app/hcs` = profile index (int8), then `/p/app/mc` = 7 |
| stop (`stopDabbing`) | `/p/app/mc` = 8 (abort), then `/p/app/mc` = 2 (idle) |
| add temperature | `/p/app/tmpo` = increment in °C (float32). The app adds +10°F or +5°C. |
| add time | `/p/app/timo` = increment in seconds (float32). The app adds +10 s. |
| power off (`writeMasterOff`) | `/p/app/ltrn/cmd` = 0, then `/p/app/mc` = 0 |
| lantern on | `/p/app/ltrn/cmd` = 1, then `/p/app/ltrn/time` = 7200 |
| lantern off | `/p/app/ltrn/cmd` = 0 |
| brightness | `/u/app/ui/lbrt` = `[v, v, v, v]` (uint8 x4, 38.25..255) |
| stealth | `/u/app/ui/stlm` = 0/1 (uint8) |
| ready mode | `/u/app/rdym/hc` = profile index, -1 disables |

`/p/app/mc` is uint8 on LORAX (float32 on the legacy layout). Mode values:
MasterOff 0, Sleep 1, Idle 2, TempSelectBegin 3, TempSelectStep 4,
ShowBattLevel 5, ShowVersion 6, HeatCycleStart 7, HeatCycleAbort 8,
HeatCycleBoost 9, FactoryTest 10, Bonding 11. The app never sends 9 over
Bluetooth; its boost buttons use the override writes above.

The current and target temperatures the app shows are `/p/app/htr/temp` and
`/p/app/htr/tcmd` (`userHeaterTemp`, `userHeaterTempCommand`). `/p/htr/temp` is
the raw heater reading.

## Value types

- `rgbtApi2` (8 bytes). Byte 3 selects the kind: 0 = RGB, 1 = animation table, 255 = none.
  RGB: `r, g, b, 0, lumaAnim, 0, 0, 0`. Table: `luma, speed, lumaAnim, 1, pllNum, pllDenom, (offsetIdx<<4)|colorIdx, colorLen`.
  LumaAnimation: PRESERVE 0, STEADY 1, BREATHING 5, RISING 6, CIRCLING 7, CIRCLING_SLOW 21.
  Peach firmware `AE` and newer replaces Api2 colors with an LED3 `raw` format (not decoded here).
- `string`: UTF-8 with no terminator. Max lengths: device name 29, profile name 31.
- Enums: `operatingState` 0..13 (InitMemory … Bonding; Toad has no HeatCycleFade),
  `battChargeState` Bulk/Topup/Full/TempStop/Done, `battChargeSource` USB/Generic Qi/Power Dock/None,
  `heaterType` None/Classic/XL/3D/Toad, `selectedHeatCycle` -1 = temporary ("Temp") cycle, 0..3.

## UI limits from the app's constants

Temperature 400–644°F, duration 15–120 s, boost +1–36°F (+1–20°C) and
1–60 s, defaults +10°F/+5°C and 15 s, brightness 38.25–255 (Toad: 0.15–1.0).

## Not covered yet

- The event channel (`43312cd1`). The app drives it through `FileWatch` (0x23)
  and acknowledges with `AckEvents` (0x03); this webapp polls with ReadShort instead.
- Error code numbers. The app names EPERM, ENOENT, EBADF, EEXIST, EINVAL, ENFILE,
  EFBIG, EPIPE, EPROTO, ENOSYS, ETIMEDOUT, EMSGSIZE, ENOTCONN, ENOTSUP, but their
  numeric values come from a lookup array that wasn't resolved.
- See "Verified on hardware" above for what a real Peak Pro has confirmed.
  Everything else comes from static analysis of the app.
