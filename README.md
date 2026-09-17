# SkyPortal

A portable Windows companion for the Cemu Skylanders portal. Choose figures for two players, save a default for each game, and switch characters with keyboard shortcuts.

## Download and setup

Download the Windows ZIP from [Releases](https://github.com/Il-Mazu/SkyPortal/releases), extract **all** its contents beside your Cemu executable, and run **SkyPortal.exe**. Node.js and developer tools are not required.

Put your figure dumps in an **NFC** folder beside SkyPortal. Subfolders are supported. Settings and optional artwork are stored in **skyportal-data**; keep that folder when updating.

Use the supported [Cemu Skylanders build](https://github.com/skylandersNFC/Cemu-Skylanders-Emulated-Portal). The controller checks the executable's SHA-256 before changing portal rows:

```text
65e22a4ec27915d60d71689c45a27eb7bf329d17bde6719b79ada561744ee280
```

The build currently requires Cemu's English interface. In Settings, enable the Cemu portal and optionally download the community artwork pack or select your own artwork folder.

## Controls

| Shortcut | Action |
| --- | --- |
| Alt + T | Load Thumpback for Player 1 |
| Alt + Shift + T | Add Thumpling as the sidekick |
| Alt + 0 | Load Player 1's default |
| Alt + Shift + 0 | Load Player 2's default |
| Alt + 1–9 / minus | Load Player 1's assigned element |
| Alt + Shift + 1–9 / minus | Load Player 2's assigned element |

Shortcuts work while a Skylanders game is running and Cemu has focus. The element order is Magic, Water, Tech, Fire, Earth, Life, Air, Undead, Light, Dark. Thumpling requires the Giants sidekick dump; the Trap Team playable mini is a separate edition.

Click a character to load it; use **Edit** to change an assignment. For Swap Force, choose a top and then a bottom from the portrait grid. The matching bottom appears first, and mixed combinations are supported. Both halves appear vertically stacked on the portal and in saved defaults.

Cemu opens the selected dump directly and saves progress to it. SkyPortal does not rewrite dump bytes. Keep backups of figures and game saves. Two rows are reserved per player, with a separate fifth row for the sidekick; in-game player ownership is determined by the game.

The Emulated USB Devices window closes after successful swaps. File dialogs may appear briefly during automation. Failed operations leave Cemu's dialog available for inspection.

## Build and test

Requires Node.js and an x64 Windows C compiler. In a Visual Studio x64 developer command prompt:

```sh
npm ci
build.cmd
npm test
npm run dist
```

On Linux, `bash build.sh` supports MinGW or the locally extracted Clang/MinGW toolchain. Its winegcc fallback is for Wine only. `npm run test:ui` runs the Electron interface tests with Playwright and needs a graphical session.

The Windows GitHub Actions workflow builds the controller, runs unit tests, and packages the portable ZIP. Version tags publish the ZIP and SHA-256 checksum in Releases.

Native controller smoke tests require the supported Cemu running without a game and with empty portal rows:

```sh
SKYPORTAL_BACKGROUND=1 bash tests/smoke.sh /path/to/Spyro.sky /path/to/Gill-Grunt.sky
```

Tests use temporary figure copies. Native Windows gameplay and fullscreen behavior should be checked separately from the automated Wine tests.

## Credits

Code is licensed under GPL-2.0-or-later; see LICENSE and resources/CATALOG-LICENSE.txt. Optional character cards come from the Emulanders community artwork pack. The supplied portal image and Skylanders artwork belong to their respective owners.
