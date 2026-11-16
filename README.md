# Peak Pro Control

A browser app for controlling your own Puffco Peak Pro over Bluetooth: start
and stop heat cycles, add temperature or time mid-session, watch the live
temperature, edit the four heat profiles, load ready-made profile templates,
and change lights, stealth mode, ready mode and the device name. It has no
build step and no dependencies.

## Demo

https://github.com/user-attachments/assets/8b361ceb-9b36-45df-933a-c7a38f72fa06

*A 47-second walkthrough.*

## Library: templates and saved profiles

The Peak Pro holds four heat profiles. The Library tab keeps more than that in
your browser and loads any of them into one of the four slots:

- **Templates**: 12 ready-made profiles and 4 sets of four, with temperatures
  from the dabbing guides by
  [Cape Cod Cannabis](https://capecodcannabis.com/the-ultimate-dabbing-temperature-guide/)
  and [Leafly](https://www.leafly.com/learn/consume/dabs/best-dabbing-temperatures):
  - **Temperature ranges:** low (flavor), mid, standard, hot.
  - **By concentrate:** live resin and sauce, hash rosin, shatter and wax,
    sugar, distillate, diamonds and THCa.
  - **Sets of four:** each fills all four slots at once.

  Where the two guides disagree, the description says so. Star a template to
  add it to Favorites.
- **Build your own set of four:** pick a lowest and highest temperature and it
  spreads four profiles evenly between them.
- **My profiles**: a list of profiles saved in this browser. Copy one from the
  Profiles tab, or save a template. When a load replaces a profile on the
  device, the old one is kept here automatically, unless it matches a template.
  **Back up** downloads the list as a JSON file, and **Restore** adds one back.

Loading is disabled while the device heats. My profiles are saved only in this
browser (`localStorage`), so back them up before clearing site data or moving
to another computer.

## Run it

Web Bluetooth only works in Chrome or Edge, from `localhost` or HTTPS. Any
static host works. To run it locally:

```bash
python serve.py
```

`serve.py` is Python's built-in static server with caching turned off, so a
normal reload always picks up changes. Open http://localhost:8765, close the
Puffco app on your phone (the device takes one connection at a time), and
press Connect.

### Pair the device with your computer first

The Peak Pro only answers over an encrypted link, so your computer has to be
paired with it at the operating-system level. Without a pairing, Chrome
connects but every command times out ("GetLimits timed out").

- Put the Peak Pro in pairing mode: hold the button until the logo glows blue
  (it turns off and back on first). Without pairing mode, a device that isn't
  paired with your computer refuses the connection, and Chrome reports
  "Connection attempt failed".
- Pair it from your system's Bluetooth settings.
- **Windows:** in testing, neither Chrome nor Windows Settings could pair it
  (Settings didn't list the device). What worked was Windows' custom pairing
  API with the PIN-less confirm-only method
  (`DeviceInformationCustomPairing.PairAsync(DevicePairingKinds.ConfirmOnly)`,
  accepting the request). [puffco-lorax-decode](https://github.com/magikh0e/puffco-lorax-decode)
  documents this. If Windows keeps answering `OPERATION_ALREADY_IN_PROGRESS`, a
  stuck earlier attempt is blocking it: restart the computer and pair again.
- Once paired, Connect works without pairing mode. Pairing a computer may mean
  your phone's Puffco app has to pair again.

To try the interface without a device, open http://localhost:8765/?demo. It
runs the real protocol code against a simulated Peak Pro. Other modes reproduce
real-world failures: `?demo=unpaired` (connection refused), `?demo=notpaired`
(no pairing, so the encrypted read fails), `?demo=pairing` (pairing completes
after a few tries) and `?demo=stuck` (a read that never answers).

## Files

- `js/lorax.js`: LORAX transport: framing, auth handshake, ReadShort/WriteShort, request queue.
- `js/device.js`: value codecs and the app's command sequences (start, stop, boost, lantern, profiles).
- `js/fields.js`: path/type table generated from the official app's field registry.
- `js/app.js`: the interface.
- `js/library.js`: profile templates, My profiles (saved in the browser), backup and restore.
- `js/mock-device.js`: simulated device for `?demo`.
- `docs/PROTOCOL.md`: protocol notes recovered from Puffco Connect 3.13.47.
- `serve.py`: local static server with caching disabled.

## Status

Connects to a real Peak Pro (firmware build `5652c02`) from Chrome on
Windows 11 once the computer is paired. Verified on the device: pairing, the
LORAX unlock, starting and stopping a heat cycle, +temperature and +time
during a session, the mood light, live temperature, and reads of profiles,
colors, brightness and device info. The remaining write actions (editing
profiles, loading templates, brightness, stealth, ready mode, power off) follow
the official app's code but haven't each been confirmed on hardware yet.

Peak Pros on firmware older than `AB` use a different Bluetooth layout and
aren't supported. The app says so if it finds one.

Protocol groundwork:
[magikh0e/puffco-lorax-decode](https://github.com/magikh0e/puffco-lorax-decode),
[austenstone/puffco-mcp](https://github.com/austenstone/puffco-mcp),
[Fr0st3h's write-up](https://github.com/Fr0st3h/Puffco-Reverse-Engineering-Writeup).
Not affiliated with Puffco. Use it only with devices you own.

## License

GPL-3.0. See [LICENSE](LICENSE).
