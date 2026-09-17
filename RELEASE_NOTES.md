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
