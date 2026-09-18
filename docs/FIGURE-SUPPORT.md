# Accessory support and research

Scope: the six home-console games, running their Wii U versions in Cemu. Checked September 18, 2026. These rules describe the games; automated tests validate routing and filtering, not the games' execution of every reward.

| Figure family | Offered in | Behavior |
| --- | --- | --- |
| Magic items | Their debut and later games | Combat, healing or treasure effects through Trap Team; Academy treasures in SuperChargers; gold rewards in Imaginators |
| Adventure pieces | Their debut and later games | Levels in their original game; SSA levels also unlock in Giants. Later titles change the effect rather than importing the old level. |
| Battle pieces | Their debut and later games | Original arenas stay tied to their supported game; later titles provide item/treasure/reward behavior |
| Traps | Trap Team onward | Stored villains in Trap Team; vehicle elemental attacks and stored-villain Skystones in SuperChargers; racing effects in Imaginators |
| Vehicles | SuperChargers, Imaginators | Campaign and racing in SuperChargers; racing only in Imaginators |
| Racing trophies | SuperChargers, Imaginators | Extra racing content; Imaginators already includes the normal race tracks |
| Creation Crystals | Imaginators | Playable Imaginators, selected through a player picker rather than an accessory slot |
| Imaginators adventure pieces and chests | Imaginators | Adventure unlocks or creation parts, respectively |

Descriptions deliberately avoid promising repeatable gold, exact timers, or resetting exhausted rewards. Saves and figure contents determine those outcomes. The UFO Hat is a promotional unlock. Blue chests provide creation parts; the associated Sensei unlocks Cursed Tiki Temple or Lost Imaginite Mines, not the chest itself. Nintendo vehicles are appropriate here because the target is Wii U.

## Behavior sources

- [Activision: SuperChargers FAQ, question 12](https://support.activision.com/no/skylanders-superchargers/articles/skylanders-superchargers-faq): two characters and one shared vehicle in local story co-op.

- [Activision: SuperChargers character and magic-item FAQ](https://support.activision.com/no/skylanders-superchargers/articles/skylanders-superchargers-characters-magic-item-issues-faq): Academy treasures, stored-villain Skystones, trophies, and removing/replacing treasures after changing characters.
- [Activision: Imaginators FAQ](https://support.activision.com/skylanders-imaginators/articles/skylanders-imaginators-faq): Creation Crystals, returning vehicles, and trap functionality in racing.
- [Activision: Imaginators racing FAQ](https://support.activision.com/no/skylanders-imaginators/articles/skylanders-imaginators-racing-faq): all normal tracks included, toy-gated special racing modes, vehicles and traps.
- [Skylanders Character List: magic items](https://skylanderscharacterlist.com/getting-started/magic-items/): individual item effects and original adventure/battle unlocks.
- [Skylanders Wiki: magic items](https://skylanders.fandom.com/wiki/Magic_Item): later-game rewards and Imaginite chests.
- [Skylanders Wiki: trophies](https://skylanders.fandom.com/wiki/Trophies): racing unlocks.

## Catalog and implementation

The existing catalog derives from the [Dolphin figure catalog](https://github.com/dolphin-emu/dolphin/blob/master/Source/Core/Core/IOS/USB/Emulated/Skylanders/Skylander.cpp). Seven missing Imaginators header pairs were checked against the [skylandersNFC collection](<https://github.com/skylandersNFC/Skylanders-Ultimate-NFC-Pack/tree/main/Dumps/6.%20Imaginators/4)%20Magic%20Items>). Only names and header identifiers were added; no dumps or figure save data are shipped.

| ID | Variant (decimal) | Figure |
| --- | --- | --- |
| 310 | 20480 | Gryphon Park Observatory |
| 311 | 20480 | Enchanted Elven Forest |
| 235 | 20481 / 20482 / 20483 | Bronze / Silver / Gold Imaginite Mystery Chest |
| 235 | 20503 / 20505 | Blue chest: Cursed Tiki Temple / Lost Imaginite Mines |

Rows 1–2 and 3–4 remain reserved for the two players, and row 5 for the sidekick. Accessories use dedicated rows: item/adventure/chest 6, trap 7, vehicle 8, trophy 9. The supported controller exposes 16 rows. Each accessory slot holds one figure; vehicles share one slot across land, sea and sky. Local SuperChargers story co-op uses one vehicle for both players (driver and gunner). Racing selects vehicles separately in-game; change the portal vehicle when prompted. The GUI explains compatible behavior using backend metadata, and the backend validates category, game, current dump header and duplicate UIDs before loading. No accessory hotkeys were added.

Portal artwork is cosmetic and does not change Cemu's emulated portal hardware. See [portal artwork sources](../app/ui/portals/SOURCES.md).
