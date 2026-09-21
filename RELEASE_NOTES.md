# Dè PerPortal 0.5.7

- Replaced the destructive trap clear with **Reset trap detections**, which clears PerPortal's villain names and ignores the current decoded contents until a trap changes. It never edits the NFC dump.
- When a trap's detected villain changes after reset, it reappears in the detected list and can be named.
- Removed the unverified raw trap-save rewrite code.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.6

- Disabled trap clearing after reports that it made traps unreadable. It remains disabled until the save format can be changed safely.
- Made **Restore latest trap backup** clickable while Cemu is detected; restored files are backed up before replacement, and Cemu should be restarted to reload them.
- The 0.5.5 clear fix was not safe for all trap dumps. Use this release's restore action to recover backups made before clearing.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.5

- Corrected **Clear all traps** to erase only the six villain-record slots in each redundant save, preserving the trap data needed for the game to recognize the toy.
- Added **Restore latest trap backup** in Settings. Close Cemu, install this update, then use it to recover the original trap files backed up by the 0.5.4 clear. The 0.5.4 release was withdrawn.
- Hardened **Alt+Ctrl+0** trap lock-in detection, including the numeric keypad.
- Named captures stay available through **Alt+Up/Down** and remain hidden from the detected list.

## Validation

The Windows portal controller builds locally. The Windows release workflow runs the full unit suite and packages the release. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.4

- Reset each trap save's history counter along with all villain-history data when clearing traps.
- Retains the 0.5.3 fixes: full villain-history clearing in both redundant saves and hiding named captures from the detected list while keeping them available through **Alt+Up/Down**.

## Validation

The Windows release workflow runs the complete build and test suite. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.3

- Fixed **Clear all traps** to erase the entire villain history from both redundant trap saves, not just the currently selected villain. Original dumps are backed up before clearing.
- Named captures now leave the detected villain section and remain available through **Alt+Up/Down**. Captures whose contents change reappear so they can be named again.

## Validation

The existing trap and interface checks were updated for full history clearing and hiding named captures. The GitHub release workflow runs the complete Windows build and test suite. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.3

- Fixed **Clear all traps** to erase the entire villain history from both redundant trap saves, not just the currently selected villain. Original dumps are backed up before clearing.
- Named captures now leave the detected villain section and remain available through **Alt+Up/Down**. Captures whose contents change reappear so they can be named again.

## Validation

The existing trap and interface checks were updated for full history clearing and hiding named captures. The GitHub release workflow runs the complete Windows build and test suite. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.2

- Added **Clear all traps** in Settings. It unloads the active trap, backs up each recognized dump, clears the current villain from both redundant save areas, removes its saved name, and rescans. Unrecognized or changed dumps are skipped.
- Added Trap Team element shortcuts: **Alt+Q/W/E/R/Y/U/I/O/P/L** selects Magic, Water, Tech, Fire, Earth, Life, Air, Undead, Light, or Dark traps, preferring empty traps.
- **Alt+Up/Down** now previews named captured villains without changing the portal. **Alt+Ctrl+0** loads the selected trap. Overlay notifications identify the selection.
- Removed shortcut and perk reminders from the overlay; it now displays element icons only.

## Validation

All 25 unit/regression tests and the Electron interface suite pass. The Windows portal controller builds locally. The clear action was tested against a captured encrypted trap fixture and verifies both redundant save checksums. Live Trap Team gameplay has not been tested.

---

# Dè PerPortal 0.5.1

- Existing Trap Team element slots now migrate to matching Trap Masters while preserving valid Trap Master choices and favorite presets.
- Empty and unnamed, unverified traps are grouped under **Other traps** instead of prompting for a villain name. Players can still open that group and manually name an unverified trap.
- Trap cycling notifications show the selected trap's position, name, and element, and remain visible for 4.5 seconds after Cemu regains focus.

## Validation

22 unit/regression tests and the Electron interface suite pass. Coverage includes saved profile migration, manual trap names, trap cycling, accessory checks, and overlay placement and notifications.

GitHub Actions builds the Windows package and publishes its SHA-256 checksum. Live Windows gameplay has not been tested for this patch.

---

# Dè PerPortal 0.5.0

- Added a Trap Team roster that detects whether a trap is occupied and lets players save a manual villain name per trap file. Names persist in app settings, and changed detectable occupants prompt players to update the name.
- Added **Alt + Up / Down** to cycle through library traps in roster order and load the selected trap into the shared trap row. The shortcut appears in the overlay.
- Fixed the shortcut overlay returning to its old position after game and figure updates, and added the Trap Team shortcut hint.
- Retained all six game profiles, accessory choices, portal artwork, lighting, reduced-motion behavior, and existing shortcut controls.

## Validation

21 unit/regression tests and the Electron interface suite pass. Coverage includes manual-name persistence, trap shortcut routing and validation, accessory row isolation, duplicate UIDs, failed loads, overlay positioning, picker filtering, all six game profiles, reduced motion and compact layouts. GUI activation tests use a mocked native controller; no live game is altered.

GitHub Actions builds the Windows package and publishes its SHA-256 checksum. Native Windows gameplay, live shortcut capture, in-game accessory effects and dragging over fullscreen Cemu have not been tested in this Linux environment. The roster reports occupancy rather than automatically identifying villains; users enter names and update them after changing trap contents.

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
