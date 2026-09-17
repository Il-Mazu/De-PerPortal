# Dè PerPortal 0.3.0

The portal manager has a new name, three default presets per player and game, and a shortcut overlay for Cemu.

- Renamed the app, executable, package, controller, documentation, and repository to Dè PerPortal (De-PerPortal for technical identifiers).
- Save and select three default presets per player and game. Keyboard shortcuts load the active preset.
- Show element shortcuts and Swap Force movement shortcuts in an overlay that follows Cemu. Reopen it with the Overlay button.
- Keep the visual top-and-bottom Swap Force picker, mixed pairs, fixed movement bases, and Thumpback/Thumpling shortcuts.
- Automatically copy existing skyportal-data settings and artwork into de-perportal-data while retaining the original backup.
- Refreshed the README with setup instructions and official Skylanders banner artwork with attribution.

## Download and update

Extract all files from **De-PerPortal-0.3.0-windows-x64.zip** beside the supported Cemu executable, then run **Dè PerPortal.exe**. Node.js is not required. Keep your NFC and data folders when upgrading; close the old app before starting the new one.

Requires the supported English Cemu Skylanders build documented in the README. Figure dumps, games, and optional community character artwork are not included.

## Validation

All 11 unit tests, including legacy-data migration, and the Electron interface tests passed. The Windows controller also compiled locally with Clang/MinGW. GitHub Actions builds and packages the Windows release and publishes its SHA-256 checksum.

Native Windows gameplay, live shortcut capture, and exclusive-fullscreen overlay behavior have not been verified in this Linux environment.
