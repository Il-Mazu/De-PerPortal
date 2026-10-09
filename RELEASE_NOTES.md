# Dè PerPortal 2.2.0

- **New:** each figure's card in **Collection** says why a dump is broken: a wrong UID check byte, an ID block that fails its checksum, wrong access bits or keys, a save area that fails a checksum, two save areas that both claim to be the newest, or no readable save at all. **Setup** and the **Damaged saves** filter now include all of these.
- **New:** **Fix** repairs a figure the game calls a "broken toy". It keeps the newest save area that passes every checksum, rebuilds the other one from it and reseals the rest, so progress is kept. When no save can be read, it isn't offered.
- **New:** **Reset**, pressed twice, turns a figure back into a toy fresh from the box, with the same UID, ID and variant.
- **New:** **Create blank dump**, on the card of a figure you don't have, writes a new toy of it to `NFC/Created`.
- **Changed:** traps can be emptied again, with **Reset** on their card. It uses the new code, not the old clear that could make traps unreadable, and clears the trap's villain name.
- **Changed:** a trap that has never been written now shows as empty instead of unverified.

Fix and Reset back the dump up first and only work while the figure is off the portal. Every result is checked before it is written; if a check fails, the dump isn't changed.

## Validation

Unit tests create, break, fix and reset dumps for a figure of every game, Swap Force tops and bottoms, a Trap Master, a SuperChargers vehicle and trophy, and an Imaginators Sensei and Creation Crystal, and check each reason a toy can be broken. A captured Life trap passes every check and is byte-identical after decode, encrypt and decode; fixing it keeps its villain, and resetting it leaves an empty trap. The UI test breaks a trap, fixes it, resets it and creates a missing figure through the app. The checksums follow Dolphin and were checked against that trap, but fixed, reset and created dumps have not been tried in a game yet, on Windows or anywhere else.

---

# Dè PerPortal 2.1.1

- **Changed:** Gill Grunt now swims in the Dè FishBet banner.

## Validation

The UI test still switches to Dè FishBet, spins for Player 2, survives a reload and fits a narrow window; the banner was checked from screenshots on Linux. It has not been tried on Windows yet.

---

# Dè PerPortal 2.1.0

- **New:** patch notes. After an update, Dè PerPortal shows what changed the first time it starts. Read them again any time under **Settings** → **About** → **Patch notes**; older versions are folded underneath. With a controller, move up and down to scroll and press B to close.
- **New:** Dè PerPortal has a website at https://il-mazu.github.io/De-PerPortal/. It's built like a Skylanders starter pack. Try the portal in its window with a click, the number keys or by holding L3 + R3 on a controller, then scroll to turn the box over. **Website** in **Settings** opens it in your browser.

## Validation

A unit test checks that the notes turn into escaped HTML one version at a time and that the newest notes match the app's version. The website was checked in Chromium on desktop and phone sizes. The patch notes dialog has not been tried on Windows yet.

---

# Dè PerPortal 2.0.0

- **New:** automatic backups. Every figure is copied to `de-perportal-data/backups` before it goes on the portal, keeping the last 10 versions of each. Restore one from the figure's card in **Collection**; the file it replaces is backed up too.
- **New:** a warning when a figure leaves the portal after more than 3 minutes without its dump having changed. Cemu only writes progress when the game saves, so that progress may be lost. Figure cards show when each dump was last saved.
- **New:** each figure's level, gold, hero points and nickname, read from its own save, on the portal, the element cards and in the picker. The picker can sort by level, gold or recently played. Levels past 10 show as **10+**; Imaginators figures don't show stats yet.
- **New:** **Collection** replaces **Skylander list** in the toolbar. **Figures** lists every figure of the game, lit when it's in your library and an empty slot when it isn't, with search and filters for missing figures, figures below level 10 and damaged saves. **Progress** has totals, a meter per element and your most played Skylanders. **History** lists what went on the portal. **Setup** checks Cemu, your NFC folder, damaged saves, duplicate dumps and misplaced figures. **Poster** still opens Activision's poster.
- **New:** **Random** and **Alt + D** load a random Skylander; FishBet's Spin buttons now use the same pick.
- **New:** **Nuzlocke rules**: mark a Skylander as fallen and it can't be loaded or picked at random until you revive it.
- **New (beta):** the elemental gate helper for Spyro's Adventure, Giants, Swap Force and Trap Team. Choose your level and its gate elements light up; **Alt + G** loads the next one.
- **New:** the quick swap dial has a **Recent** ring: Random first, then the last Skylanders you played in this game.
- **New:** profile export and import, a Discord status, and an OBS overlay at `http://127.0.0.1:47831/`, all in Settings.
- **Fixed:** importing a profile ignored SuperChargers vehicle shortcuts; they're now restored, and a missing or wrong-type vehicle is reported instead of silently kept.

## Validation

Unit tests cover reading level, gold, hero points and nicknames from encrypted saves and telling new, played and damaged saves apart; backup rotation and restore; the history; the unsaved warning; random with Nuzlocke; profile import including vehicle shortcuts; the Discord status; the OBS server and the dial's Recent ring. The UI test opens Collection and checks its filters, the poster and Setup, and every theme was checked from screenshots of each Collection tab on Linux. The full unit and UI suites now also pass natively on Windows, and Alt + D and Alt + G were tried live there against a real Cemu session. The save offsets were checked against a generated save, not a played figure; the Discord status has not been tried on Windows yet.

---

# Dè PerPortal 1.3.0

- **New:** themes. The **Theme** button opens a small carousel with a preview of each look; the one you pick is remembered the next time you start the app. **Dè Dusk over Skylands** stays the default.
- **New:** a theme for every Skylanders game: **Dè Book of Eon** (Spyro's Adventure), **Dè Arkeyan Forge** (Giants), **Dè Woodburrow** (Swap Force), **Dè Cloudcracker Prison** (Trap Team), **Dè Rift Garage** (SuperChargers) and **Dè Mind Magic** (Imaginators). Pick **Match the game** and the look changes with the game you choose.
- **New:** the **Dè perThumpback** theme, all about the Water Giant: the Phantom Tide's deck planks and rope, a fishing net over whale-blue sea, a "Hail to the Whale!" banner with his portrait, bio and ship's log of his stats, and buttons to load Thumpback or Thumpling.
- **New:** the **Dè Cell to Singularity** theme, after the idle evolution game: deep space over a sleeping Earth, element shortcuts as glowing Tree of Life nodes, and Entropy and Ideas counters that climb on their own until the simulation reaches the singularity and starts over.
- **New:** the **Dè PerMCdonald** theme, a fast-food order kiosk: red bar, yellow buttons, white menu tiles, element shortcuts as numbered combos and a Now serving board showing the order numbers (the figure IDs) of the Skylanders on your portal. Sometimes it asks if you want fries with that. The ice cream machine is broken.
- **New:** the **Dè perDoomScroll** theme, your portal as a vertical feed: each player is a reel with likes, comments and a caption, element shortcuts are a profile grid with view counts, the page snaps from section to section, and a screen time counter keeps climbing. Every few minutes it suggests a break; taking one gets you "Just one more reel."
- **New:** the **Dè FishBet** theme, a parody of a deep-sea betting site: its own logo, glossy blue casino styling, a scrolling list of made-up wins, and bonus pop-ups and menus that do nothing at all. The only real buttons it adds are **Spin · Player 1** and **Spin · Player 2**, which load a random Skylander from your library (Swap Force figures get a random bottom too).
- **New:** the quick swap dial (hold **L3 + R3**) shows each player's default in its centre. Press **Y / △** to put it back on the portal, the same as **Alt + 0**.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. The UI test checks that Match the game follows the game, switches to Dè FishBet, spins a random Skylander for Player 2, checks the theme survives a reload and that the page still fits a narrow window; every theme was also checked from screenshots on Linux. A unit test checks that the dial's default maps to Alt + 0 for each player. The themes and the dial's default have not been tried on Windows yet.

---

# Dè PerPortal 1.2.0

- **Changed:** automatic updates no longer run a PowerShell script, which antivirus software can flag as suspicious. The downloaded version now installs itself: it waits for the old app to close, copies its files over it and starts again. The result is written to `de-perportal-data\update.log`.
- **Note:** 1.1.5 installs this release with its old updater; updates after 1.2.0 use the new way. 1.1.4 and older can't update automatically: download **De-PerPortal-1.2.0-windows-x64.zip** and extract it over your install once.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Waiting for the old app and copying the new files is covered by a unit test, and the install step was run end to end with Electron on Linux; a full update on Windows has not been tested yet.

---

# Dè PerPortal 1.1.5

- **Fixed:** an automatic update could download and unpack the new version, close with "Restarting…", and never come back, so the next start downloaded the same update again. The step that copies the new files and restarts the app now runs as a script file instead of a hidden encoded PowerShell command, which antivirus software tends to block, and writes what it did to `de-perportal-data\update.log`.
- **Note:** 1.1.4 and older can't install this fix automatically. Download **De-PerPortal-1.1.5-windows-x64.zip** and extract it over your install once; later updates will install automatically.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. The new restart step has not yet been tested on Windows; if an update still fails, `de-perportal-data\update.log` shows why.

---

# Dè PerPortal 1.1.4

- **Fixed:** holding **L3 + R3** did nothing on controllers the system can't map to the standard layout, such as the virtual Xbox pad Parsec creates for a remote player. Those controllers number their buttons differently, and the stick clicks are now read from the right buttons.
- **Changed:** the header, splash screen, README and app icon use the corrected Dè PerPortal logo.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. The button layout for unmapped controllers is covered by a unit test; L3 + R3 through Parsec has not been tested on Windows yet.

---

# Dè PerPortal 1.1.3

- **Fixed:** holding **L3 + R3** for 5 seconds did not bring up the Dè PerPortal window while Cemu was fullscreen. Windows refuses focus to an app that did not receive the last input, and a controller press does not count. The portal helper now hands the window real focus, and the window stays on top of Cemu until you return to the game.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Taking focus from another window was tested under Wine; fullscreen Cemu on Windows has not been tested yet.

---

# Dè PerPortal 1.1.2

- **Fixed:** automatic updates failed with **Update skipped: ENOENT … chmod …\app.asar**. Electron treats `app.asar` as a folder, so writing the new copy failed. The updater now writes the new files with plain file access.
- **Note:** 1.1.1 and older can't install this fix automatically. Download **De-PerPortal-1.1.2-windows-x64.zip** and extract it over your install once; later updates will install automatically.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. The failure and the fix were reproduced with Electron by extracting a package containing `app.asar`. A full update on Windows has not yet been tested.

---

# Dè PerPortal 1.1.1

- **Fixed:** Dè PerPortal could show **Unsupported Cemu** and keep **Launch Cemu** disabled after Cemu closed. Any window whose title started with "Cemu" (such as an Explorer folder or a browser tab) was treated as Cemu. Only a running program whose executable name starts with "Cemu" counts now, and a second Cemu no longer marks the first one unsupported until it restarts.
- **Fixed:** the splash screen's loading ring stood still when Windows animation effects are turned off. It now pulses in place instead.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Cemu detection was tested under Wine with look-alike windows. This is the first release that 1.1.0 installs through the automatic updater.

---

# Dè PerPortal 1.1.0

- **New:** automatic updates. At startup Dè PerPortal checks GitHub for a newer release, downloads it, verifies its SHA-256 checksum, installs it over the app files and restarts. NFC dumps and de-perportal-data are never touched. Offline or on any error, the app starts as usual.
- **New:** a splash screen with the new Dè PerPortal logo while the update check runs; the portal ring under the logo fills as an update downloads.
- **New:** the official Dè PerPortal logo in the window header, the README, and as the app and window icon.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. The splash screen and version checks were tested locally; the first real self-update will happen when a release newer than 1.1.0 is published.

---

# Dè PerPortal 1.0.0

The first stable release: two-player portal control for Cemu, playable end to end with a controller.

- **New:** **Skylander list** in the toolbar shows Activision's poster of every Skylander in the current game. Click (or press **A / ✕**) to zoom in on a spot and again to zoom out; drag, scroll or use the stick to look around while zoomed.
- **Fixed:** the game kept responding to the controller while the quick swap dial was open. Cemu is now frozen while the dial is open, and resumes once every button and stick is released after a choice, so the game never sees the confirming press. If Dè PerPortal closes unexpectedly, Cemu resumes on its own (at the latest after one minute).
- **Fixed:** there was no visible way to leave the GUI with a controller. **B / ○** now returns to Cemu when no dialog is open (it still closes dialogs first), and a new **Back to game** button in the toolbar shows which controller button to press. **View / Create** and the 5-second **L3 + R3** hold still work.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. 0.7.0's controller features were confirmed on Windows. The new features were tested with simulated gamepads, and freezing Cemu was tested under Wine; it has not yet been tried on Windows with a live game.

---

# Dè PerPortal 0.7.0

- **Fixed:** switching to a different trap (or any accessory) when one is already active now always clears the portal row first before loading the new figure, matching the behaviour of player-figure swaps. Previously the load could be silently ignored in some cases, leaving the old trap in place.
- **New:** SuperChargers vehicle shortcuts. **Alt+Q / W / E** loads your Sky / Land / Sea vehicle into the shared vehicle slot. Pick which vehicle each shortcut uses in the new **Vehicle shortcuts** section of the GUI; unassigned shortcuts use the first vehicle of that type in your library. The overlay shows the three vehicle shortcuts beside the elements and highlights the active type. **Remove** in the section header clears the vehicle currently on the portal, whatever its type.
- **New:** controller quick swap. Hold **L3 + R3** for 2 seconds in game to open a radial menu over Cemu. Point either stick (or use the d-pad) at an element and press **A / ✕** to load that player's element Skylander. **LB/RB (L1/R1)** switch between Player 1, Player 2 and the game's own tab: perk bases in Swap Force (**A / ✕** for Player 1, **X / □** for Player 2), named villains and element traps in Trap Team, and Sky/Land/Sea vehicles in SuperChargers. **B / ○** closes the menu. Button labels follow the controller that opened it (PlayStation or Xbox).
- **New:** hold **L3 + R3** for 5 seconds to bring up the Dè PerPortal window. The whole window works with a controller: stick or d-pad moves between controls, **A / ✕** selects, **B / ○** closes dialogs, **LB/RB** switch player tabs, and **View / Create** (or another 5-second hold) returns to Cemu.
- **New:** the villain carousel selection (Alt+↑ / Alt+↓) is now saved per game profile to `settings.json` and restored when the app or Cemu restarts. Resetting trap detections clears the saved position.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Controller input was tested with simulated gamepads only; live Windows play with Xbox and PlayStation controllers and live Trap Team gameplay have not been tested.

---

# Dè PerPortal 0.6.0

- The shortcut overlay now shows a compact key hint beside each element icon: the element number in all games, and **number/letter** in Trap Team, where the number loads that element's Trap Master and the letter selects a trap.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Live gameplay has not been tested.

---

# Dè PerPortal 0.5.8

- Changed the Trap Team villain lock shortcut to **Alt+Space**.
- Element shortcuts now skip named traps, reserving them for the **Alt+Up/Down** carousel. They select a different unassigned trap of the same element or report when no trap is available.

## Validation

The Windows release workflow runs the build, full unit suite, and packaging. Live Trap Team gameplay has not been tested.

---

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
