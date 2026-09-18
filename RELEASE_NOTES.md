# Dè PerPortal 0.4.0

- Fixed the dragged shortcut overlay jumping back during figure changes. Position now survives focus changes and notifications, including near screen edges and on a second monitor.
- Added GUI selection, activation, replacement and removal for magic items, adventure and battle pieces, traps, vehicles, racing trophies and Imaginite chests. Game-specific descriptions explain changed behavior in later titles.
- Added the missing Imaginators adventure/chest catalog entries and playable Creation Crystal selection.
- Simplified the portal and accessory panels, moved item explanations to hover text, and added the Skylanders header logo.
- Added game-matched portal artwork and restrained element lighting for both active players, with reduced-motion support.
- Clarified that SuperChargers story co-op shares one vehicle between the driver and gunner.
- Serialized portal actions during validation to prevent overlapping GUI requests.

## Validation

17 unit/regression tests and the Electron interface suite pass. Coverage includes accessory row isolation, compatibility, changed dumps, duplicate UIDs, failed loads, concurrent requests, picker filtering, all six portal profiles, reduced motion and compact layouts. GUI activation tests use a mocked native controller; no live game is altered.

Native Windows gameplay, in-game accessory effects and dragging over fullscreen Cemu still require testing on Windows. Research and artwork sources are recorded in `docs/FIGURE-SUPPORT.md` and `app/ui/portals/SOURCES.md`. This is a local development build, not a published release.

---

# Dè PerPortal 0.3.1

- Drag the shortcut reminder overlay to move it. Its position is retained during the current session and kept within the display when its size changes.
- Use **Alt + Left / Right** to select Player 1's previous or next assigned default preset, or **Alt + Shift + Left / Right** for Player 2. Cycling skips empty slots and wraps around.
- A brief notification shows the player, preset number, and character on the same overlay layer above Cemu, including when the shortcut reminder is dismissed.
- Preset selection remains separate from loading: press **Alt + 0** (Player 1) or **Alt + Shift + 0** (Player 2) to load the selected default.

## Download and update

Extract all files from **De-PerPortal-0.3.1-windows-x64.zip** beside the supported Cemu executable, then run **Dè PerPortal.exe**. Close the old app before updating and keep your NFC and data folders. Node.js is not required.

## Validation

All 12 unit tests and the Electron interface tests passed. The Windows controller compiled locally with Clang/MinGW. GitHub Actions builds the Windows package and publishes its SHA-256 checksum.

Native Windows gameplay, live shortcut capture, dragging over Cemu, and exclusive-fullscreen behavior have not been verified in this Linux environment.
