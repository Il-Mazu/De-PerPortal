# Official Skylanders artwork

These PNGs reproduce artwork from Activision's official manuals. Artwork remains © Activision Publishing, Inc.; it is not covered by this repository's code license.

- Elements: page 12 of the SuperChargers manual, rendered to PNG at 1000 pixels high. The UI uses only the ten elemental symbols, via `sigils.png`.
  https://support.activision.com/servlet/servlet.FileDownload?file=00PU000000OqoF2MAJ&retURL=%2Fapex%2Flicense
- Perks: the original embedded movement-icon strip extracted from PDF page 9 (printed page 7) of the Swap Force PS4 manual.
  https://s.activision.com/228754/skylanders/swapforce/ps4/en/SSF_PS4_Manual_Online_FINAL_HiRes.pdf

No icons were redrawn or generated. Perk order in the source strip: Dig, Bounce, Teleport, Sneak, Rocket, Speed, Climb, Spin.

The source images above are not bundled. Derived sprites used by the app (cut from them, not redrawn):

- `sigils.png`: the ten element symbols from the elements page, converted to a white alpha mask so the UI can tint each one with its element color. Order: Magic, Water, Tech, Fire, Earth, Life, Air, Undead, Light, Dark.
- `perk-badges.png`: the eight gold perk badges from the perk strip with the page background removed, in the app's perk order: Rocket, Spin (Tornado), Bounce (Spring), Speed, Dig, Teleport (Portals), Sneak, Climb.
