---
name: Dè PerPortal
description: A two-player Portal of Power for Cemu Skylanders, dressed as Dè Dusk over Skylands.
colors:
  gilt: "#f6c64f"
  gilt-hi: "#fff1b8"
  gilt-lo: "#9a6415"
  gilt-ledge: "#8a5410"
  gilt-ink: "#3b1d02"
  parchment: "#f7e6bd"
  cream-print: "#fff6da"
  night: "#070d33"
  lapis: "#0b1446"
  lapis-2: "#16206a"
  lapis-3: "#25318a"
  app-night: "#0c1238"
  app-lapis: "#1b2562"
  app-lapis-hi: "#2a3a8c"
  well: "#0a0f33"
  ink-ledge: "#05081c"
  text: "#eef1ff"
  muted: "#aab4e2"
  muted-print: "#b4bde6"
  element-magic: "#b76cf2"
  element-water: "#3fa9f5"
  element-tech: "#f5a524"
  element-fire: "#ff6a3d"
  element-earth: "#b88346"
  element-life: "#68d445"
  element-air: "#8fdcff"
  element-undead: "#a59ac8"
  element-light: "#ffe36b"
  element-dark: "#7b62d6"
  ok: "#5fd068"
  bad: "#ff6b5e"
  ember: "#ffb36b"
typography:
  display:
    fontFamily: "'Lilita One', Nunito, sans-serif"
    fontSize: "clamp(2.1rem, 3.4vw, 3.15rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "0.005em"
  headline:
    fontFamily: "'Lilita One', Nunito, sans-serif"
    fontSize: "clamp(2.1rem, 4.4vw, 3.6rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "0.005em"
  title:
    fontFamily: "'Lilita One', Nunito, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 400
    lineHeight: 1.04
  button:
    fontFamily: "'Lilita One', Nunito, sans-serif"
    fontSize: "1.08rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 800
    lineHeight: 1.4
  app-display:
    fontFamily: "'Lilita One', 'Trebuchet MS', sans-serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.4px"
  app-title:
    fontFamily: "'Lilita One', 'Trebuchet MS', sans-serif"
    fontSize: "18px"
    fontWeight: 400
  app-body:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  key: "6px"
  control: "10px"
  card: "14px"
  panel: "20px"
  box: "28px"
  pill: "99px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "22px"
  xl: "32px"
  2xl: "64px"
  section: "120px"
components:
  button-gilt:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.gilt-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.78em 1.35em"
  button-plain:
    backgroundColor: "{colors.well}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0.78em 1.35em"
  button-plain-hover:
    backgroundColor: "#141c55"
    textColor: "#ffffff"
  button-app:
    backgroundColor: "{colors.app-lapis-hi}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-app-primary:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.gilt-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 22px"
  tab:
    backgroundColor: "{colors.well}"
    textColor: "{colors.muted-print}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  tab-selected:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.gilt-ink}"
  input-app:
    backgroundColor: "{colors.app-night}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  kbd:
    backgroundColor: "{colors.gilt}"
    textColor: "{colors.gilt-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.key}"
    padding: "0.1em 0.45em"
  coin:
    backgroundColor: "{colors.app-night}"
    rounded: "{rounded.round}"
    size: "58px"
  card-app:
    backgroundColor: "{colors.app-lapis}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "16px"
  panel:
    backgroundColor: "{colors.lapis}"
    textColor: "{colors.text}"
    rounded: "{rounded.box}"
    padding: "34px 36px"
---

# Design System: Dè PerPortal

## Overview

**Creative North Star: "Dè Dusk over Skylands"**

Everything happens at dusk over a painted sky. Lapis panels sit on a drifting cloud field, every container wears a gilt foil rim, and the portal is the light source: whatever stands on it lights the surface in its element's colour. The world is a toy and a game menu at once. Things are chunky, tactile and pressable; buttons have a physical ledge under them and sink when pressed, coins pop, figures drop onto the portal with a flash.

The app (`app/ui/style.css`, `app/ui/radial.css`) is the incumbent and densest expression: 14px Nunito, 10px-radius rimmed controls, element-coloured coins and cards. The public site (`site/`) prints the same world on toy-box card at couch-to-billboard scale: 17px body, 28px box corners, sunburst rays, a parchment rating box and barcode. Both share the rim, the gilt, the parchment, the element palette, the sigils and the two typefaces; those shared parts are the system. Box-specific props (ribbon, platform band, barcode, rating box, the turn-over on scroll) belong to the landing page, not to future surfaces.

Density is low and targets are big, because the product is read from a couch on a TV. Colour outside lapis and gilt comes only from the ten elements, the two players (who take their colour from their figure's element), and a small set of status hues.

**Key Characteristics:**
- Deep lapis ground under a slowly drifting painted cloud texture (screen-blended, 240s linear drift).
- Gilt foil rim (`--rim`, a 165deg gilt-hi / gilt / gilt-lo / gilt-hi gradient) as the border of every significant container.
- Gilt marks what you can press; parchment carries small print and labels.
- Element colours and sigils are the only other hues, always tied to an element.
- Lilita One for everything printed big, Nunito for everything read.
- Physical, springy motion with overshoot; reduced motion is honoured everywhere.

## Colors

A night-blue world lit by gold leaf, with ten saturated element colours as the only accents.

### Primary
- **Gilt** (gilt): the one accent. Primary buttons, selected tabs, the platform band and ribbon, the hold ring, focus outlines, the includes-strip icons, step numerals. Always appears as a vertical foil gradient (roughly #ffe48a to gilt to #d9962a) on fills.
- **Gilt Highlight** (gilt-hi) and **Gilt Shadow** (gilt-lo): the bright and dark stops of the foil rim; gilt-hi also draws inner keylines on coins, toasts and selected states.
- **Gilt Ledge** (gilt-ledge): the solid ledge under gilt buttons and keycaps.
- **Gilt Ink** (gilt-ink): text on any gilt fill.

### Secondary
- **Parchment** (parchment): labels, small print on the box (includes strip), callouts on screenshots, the rating box, the app's toast slip and section labels.
- **Cream Print** (cream-print): large display lettering on the site, set on lapis with an ink ledge.

### Tertiary
- **The ten elements** (element-magic, element-water, element-tech, element-fire, element-earth, element-life, element-air, element-undead, element-light, element-dark), always in that order (sigil sprite order). Used for coin and sigil tints, portal ring and aura light, owned-slot glows, player tags. A player's colour is their figure's element. Never use an element colour decoratively without an element meaning behind it.

### Neutral
- **Night** (night) and **Lapis** (lapis, lapis-2, lapis-3): the site's ground and box card, stepping lighter toward the top-centre light.
- **App Night / App Lapis / App Lapis High** (app-night, app-lapis, app-lapis-hi): the app's slightly brighter ground and panel stops; app-night with app-lapis-hi is also the inside of every coin, on both surfaces.
- **Well** (well): the translucent dark inset used at 60 to 80% opacity for tab tracks, player switches, timeline cards, history rows and code wells.
- **Ink Ledge** (ink-ledge): the hard ledge under lapis buttons and under display lettering.
- **Text** (text) for body copy; **Muted** (muted in the app, muted-print on the site) for secondary copy.
- **Status**: ok and bad in the app's setup checks; ember for the site's warning panel, beta and untested chips.

### Named Rules
**The Gilt Primary Rule.** Among controls, a gilt foil fill marks only the primary action or the current selection; every other control stays lapis or well. Outside controls, foil fills appear only as packaging trim (platform band, ribbon, feature medallions), never as a background for reading text.

**The Elements Only Rule.** The only hues besides lapis, gilt and parchment are the ten element colours, and each one appears because an element is present.

## Typography

**Display Font:** Lilita One (with Nunito, or Trebuchet MS in the app)
**Body Font:** Nunito (variable 200 to 1000, with system-ui)

**Character:** A chunky, rounded toy-box display face over a soft, friendly rounded sans. Both are bundled locally; neither is a system face.

### Hierarchy
- **Display** (400, clamp(2.1rem, 3.4vw, 3.15rem), 1.04): the box-front headline beside the logo.
- **Headline** (400, clamp(2.1rem, 4.4vw, 3.6rem), 1.04): section headings on the back panel, max 20ch, balanced.
- **Title** (400, 1.45rem): step and card titles; feature heads at 1.15 to 1.3rem.
- **Button** (Lilita One 400, 1.08rem, 1): buttons, tabs, player switches, toasts, callouts, tags. Big CTA at 1.35rem.
- **Body** (Nunito 500, 17px, 1.6; 16px under 640px): reading text, 34 to 62ch.
- **Label** (Nunito 800, about 0.78 to 0.95rem): includes strip, stat terms, chips, keycaps.
- **App scale**: app-display 34px, h2 24px, app-title 18px, app-body 14px/1.45. Labels 11 to 12px at 800.

### Named Rules
**The Printed Big Rule.** Anything meant to be read from across the room is Lilita One at weight 400; Nunito never sets a heading.

**The Lettering Ledge Rule.** Display lettering sits on a hard ink ledge: on the site cream-print with `text-shadow: 0 3px 0` ink-ledge; in the app gilt foil lettering (gilt-hi to gilt to #d98d1d clipped to the text) with `drop-shadow(0 2px 0 #3b1d02)`.

## Layout

The site is a 1280px-max box, then one continuous back panel (`min(1280px, 100% - 32px)`) holding all sections, with a 1200px inner wrap. Two-column splits run 5fr/7fr or similar with 36 to 64px gaps and collapse to one column under 1000px. Sections breathe at 120px top padding (88px under 640px) and are separated by a dashed gilt hairline at 20% opacity, not by new cards. Fixed 64px nav fades from night into transparent.

The app is a 1280px main column with 32px gutters (24px under 1100px, 16px under 760px); sections are separated by a centred gilt gradient hairline. Grids of coins and cards are 10 across for elements (5 under 1100px), 8 for perks.

Spacing rhythm, observed: 4, 8, 12, 22, 32, 64px, with 120px between site sections.

## Elevation & Depth

Depth is layered and physical. Surfaces carry large, soft, dark ambient shadows (night-blue black, never grey), insets darken edges like printed card, and pressable things stand on a hard ledge that collapses when pressed. Light comes from the portal: element-coloured glows bloom from coins, figures and the portal ring.

### Shadow Vocabulary
- **Box drop** (`box-shadow: 0 30px 70px #000a, 0 8px 18px #0008`): the box and back panel.
- **Card inset** (`inset 0 0 0 6px #0a0f3355, inset 0 0 60px #0007`): the darkened edge of printed card inside the rim.
- **Gilt ledge** (`0 4px 0 #8a5410, 0 10px 22px #0008`): gilt buttons; rises to 6px on hover, collapses to 1px on press.
- **Lapis ledge** (`0 3px 0 #05081c`): app buttons and coins; collapses to 1px on press.
- **Element glow** (`0 0 18px` to `0 0 22px` in the element colour): hovered or selected coins, owned slots, gate cards.
- **Keyline** (`inset 0 0 0 1.5px` gilt at 35 to 60% opacity): wells, tracks, coins and quiet cards.

### Named Rules
**The Ledge Rule.** A hard 0-blur downward ledge appears only under things you press (buttons, keycaps, coins, round arrows), under small gilt medallions, and under display lettering; on pressables it must shrink on `:active`. It is never a sideways offset and never sits under a card or panel.

## Shapes

Soft and toy-like. Site radius rule: box 28px (22px on mobile), panels, windows, screenshots and cards 20px, controls pill, coins round. The app is tighter: controls and inputs 10px, cards 14 to 16px, dialogs 20px, pills for chips and tags. Keycaps 6px. Containers take the gilt rim as a 1.5px (app) or 3px (site box and panels) border via `padding-box` / `border-box` backgrounds. Coins are circles with a gilt keyline and a sigil masked from the shared sprite.

## Components

### Buttons
Chunky, glossy and pressable.
- **Shape:** pill on the site, 10px in the app.
- **Gilt (primary):** vertical foil gradient, gilt-ink text in Lilita One, inner highlight `inset 0 1px 0 #fff8`, gilt ledge. Hover lifts 2px; active sinks 3px.
- **Plain (secondary, site):** well at 70% with a muted 1.5px keyline; hover lightens to #141c55 and the keyline turns gilt.
- **App default:** lapis gradient (#34479e to #1d2866) inside the rim, 700 Nunito, lapis ledge; hover brightens 1.18 and lifts 1px. App primary is the gilt foil in Lilita One with a #5e3406 ledge.
- **Round:** 52px gilt circles for carousel arrows; the hold button is a 152px gilt disc with a conic progress ring.

### Chips
- **Tabs:** pill, well at 60% with a faint keyline, muted text; hover keyline gilt; selected is the gilt foil with a 3px ledge.
- **Beta / untested:** small 800-weight pill, ember text (#ffd9a8) on a translucent ember fill with an ember keyline. Required wherever a feature is beta or untested.
- **Player tag:** pill in Lilita One, filled with the element colour mixed 55% into well, white keyline.

### Cards / Containers
- **Corner Style:** 20px (site), 14 to 16px (app).
- **Background:** lapis gradients inside the gilt rim; quiet cards use the well with a 1.5px keyline instead.
- **Shadow Strategy:** box drop for major surfaces, keyline for quiet ones (see Elevation).
- **Internal Padding:** 16 to 22px.

### Inputs / Fields
- **Style:** app only. Dark lapis gradient (#0e1440 to #18215a) inside the rim, 10px radius, inner shadow `inset 0 2px 6px #0008`.
- **Focus:** 3px gilt-hi outline offset 3px; in controller mode an additional gilt glow.

### Navigation
- **Site:** fixed 64px bar on a night-to-transparent gradient; brand in Lilita One; links are muted 700 Nunito pills that light white on a 7% white fill on hover. Links collapse to the GitHub icon under 860px.
- **App:** sticky top bar with a rim-gradient bottom border and blur.

### Keycap
Gilt keycap (#fff3c4 to #e9b84a) with #3b2604 text in 800 Nunito and a 2px #7a4c0e ledge. Used for every keyboard and controller shortcut on every surface.

### Element Coin (signature)
A circle filled with a radial from the element colour mixed 35% into app-lapis-hi down to app-night, a gilt keyline, a lapis ledge, and the element sigil tinted white-to-element. Hover or selection scales it (1.18 to 1.28) with a spring and adds a gilt-hi keyline and an element glow. Used in the quick swap dial, on the site's portal dial, in the element strip and in the collection headers.

### Portal Light (signature)
The portal ring and auras take the current element colour (ring tinted via a mask with `mix-blend-mode: color`, blurred aura under it); a figure arriving triggers a short scale-and-brighten flash.

## Do's and Don'ts

### Do:
- **Do** put the gilt rim on every major container, as a border via `padding-box` / `border-box` backgrounds.
- **Do** give the gilt foil fill only to the primary action or current selection among controls, with a ledge that collapses on press.
- **Do** tie every element colour to an element, in the canonical order Magic, Water, Tech, Fire, Earth, Life, Air, Undead, Light, Dark, with its sigil from the shared sprite.
- **Do** set anything read from across the room in Lilita One 400, and body in Nunito 500.
- **Do** use spring overshoot (`cubic-bezier(.3,1.5,.5,1)` or similar) for things that pop, drop or scale, and `cubic-bezier(.16,1,.3,1)` for rises and slides; disable motion under `prefers-reduced-motion`.
- **Do** show every shortcut as a gilt keycap, and label beta and untested features with the ember chip.

### Don't:
- **Don't** introduce hues outside lapis, gilt, parchment, the ten elements and the status colours.
- **Don't** use a flat grey or pure-black ground; the ground is always lapis to night.
- **Don't** use a hard offset shadow sideways or under a card or panel; the ledge belongs to pressables, medallions and lettering.
- **Don't** set headings in Nunito or in a system face.
- **Don't** add small uppercase kickers or eyebrows above headings; no surface in the world uses them.
