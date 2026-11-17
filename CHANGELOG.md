# Changelog

All notable changes to Peak Pro Control ([puffco.magikh0e.com](https://puffco.magikh0e.com/)).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the app uses
[Semantic Versioning](https://semver.org/): **major** for changes that break saved profiles or
how the app is used, **minor** for new features, **patch** for fixes and polish. The version
shown at the bottom of the app comes from `VERSION` in `js/app.js`.

## [Unreleased]

## [1.1.0] - 2026-11-16

### Added

- The version shows as a badge next to the device name at the top of the page, linking to this
  changelog.

## [1.0.0] - 2026-11-16

The first numbered release. Connecting, pairing, live state and every control below have been
confirmed on a real Peak Pro (firmware build `5652c02`) from Chrome on Windows 11.

### Added

- Connect to a Peak Pro over Web Bluetooth from Chrome or Edge, with step-by-step help when the
  connection or pairing fails, and a "Copy technical details" button for reports.
- Heat from the browser: pick one of the four profiles, start and stop a heat cycle, add
  temperature or time during a session, and watch the live temperature on the ring.
- **Profiles:** edit each profile's name, temperature, time, boost and light color, and save it
  to the device.
- **Library:** 12 profile templates and 4 sets of four, with temperatures from the Cape Cod
  Cannabis and Leafly dabbing guides; favorites; a builder that spreads four profiles between a
  low and a high temperature; and My profiles, saved in the browser with backup and restore.
  When a load replaces a profile on the device, the old one is kept in My profiles.
- **Device:** rename the device, set light brightness, stealth mode and ready mode, turn the
  mood light on or off in any color, and turn the device off.
- **Stats:** dab counts, battery and charging, heating time, and device details.
- **Protocol log:** every Bluetooth exchange, with copy and clear.
- °F or °C throughout, remembered in the browser.
- A dab temperature guide page: dab styles with their temperatures, and terpene boiling points.
- Demo mode (`?demo`) that runs the real app against a simulated Peak Pro, plus modes that
  reproduce pairing failures.
- A version number at the bottom of the page linking to this changelog. The "report a problem"
  link fills the version into the bug form.

[Unreleased]: https://github.com/magikh0e/puffco-peak-control/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/magikh0e/puffco-peak-control/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/magikh0e/puffco-peak-control/releases/tag/v1.0.0
