SkyPortal 0.2.0

- Alt+T loads Thumpback for Player 1; Alt+Shift+T adds Thumpling's sidekick edition.
- Swap Force selection now uses a top-then-bottom portrait picker, with matching bottoms listed first.
- Swap Force cards are displayed upright and stacked vertically, including saved defaults.
- Simplified interface, clearer labels, and a PNG Portal of Power.
- The Emulated USB Devices window closes after successful swaps.

Download the Windows ZIP and extract all its contents beside Cemu. Keep your NFC and skyportal-data folders when updating. Start SkyPortal.exe; no Node.js or compiler is needed.

Requires the supported English Cemu Skylanders build. Character dumps, games, and the optional artwork pack are not included.

Validation: seven unit tests, Electron UI tests, and full Cemu swap tests under Wine passed, including mixed halves, Thumpling, and device-window dismissal. The native shortcut capture test could not be validated reliably because Cemu lost foreground focus under Wine/Xwayland. Shortcut action mappings passed unit tests; live keyboard capture, native Windows gameplay, and fullscreen behavior need a Windows check.
