# My AI Village — Project Notes

A running record of every decision we make, so nothing gets lost between sessions.

## Ground rules (set by the director)

1. The user is the director and gives instructions in plain words. Claude builds.
2. The project is a web page. Everything lives in the `ai-village` folder.
3. Only the user's subscriptions are used. No API keys and no pay-per-use services.
   Before building anything that runs on its own, Claude double-checks this and confirms it.
4. Before spending Higgsfield credits on a batch, Claude asks and gives a rough credit estimate.
5. Claude keeps this notes file updated with every decision.
6. When a piece is finished, Claude shows it before moving on.
7. Before creating, overwriting or deleting files, running anything on the user's computer,
   or spending anything, Claude says in plain words what it will do and waits for a yes.
8. Claude does not build anything on its own initiative. Ideas are proposed first and the
   director approves or rejects them.
9. Nothing is committed or pushed to GitHub until the director says so.
10. Claude acts as a villager; the user is the Chief Human Officer.

## Decisions

### 2026-11-19 — Where things live and how they sync
- **Code:** built on Claude's cloud machine inside the `village` GitHub repo
  (`chulmjung-art/village`), in the `ai-village` folder. Pushed to GitHub only when the
  director says it's done.
- **Playing it:** each page is opened as a private claude.ai page (an Artifact) tied to the
  director's Claude account, so every device sees the same thing.
- **Saving:** the village's live state (villagers, tasks, progress) is saved in the cloud
  through the claude.ai page's built-in storage, not in each browser. Close it on one device,
  open it on another, and continue with no change.
- **AI villagers:** real AI work runs through the claude.ai page's built-in "ask Claude"
  feature, which uses the director's Claude subscription. No API key.
  - Each villager can be set to a different model (Opus, Sonnet, Haiku) to manage usage.
  - To verify: confirm with one small test, with the director's OK, that this counts
    against the normal Claude plan and needs no key.
- **Rejected for now:** running villagers through Claude Code on the director's computer
  (`claude -p`). It needs that computer switched on, only works from there, and Anthropic's
  billing for it is in flux.
- **Cloud environment:** a personal Claude Code environment named `village` is set up for
  the `chulmjung-art/village` repo.

### 2026-11-19 — Visual style
- **Style:** 16-bit top-down RPG. The design and art are original, not copied from any
  existing game.
- Alternatives considered and set aside: isometric 2.5D, 3D third-person, 3D first-person,
  and a 3D hybrid. Top-down was chosen because it shows the most villagers at once, which
  is the point of the village, and because it runs smoothly on every device.

### 2026-11-19 — First build (not started; waiting for the director's go-ahead)
- An **empty town** with no villagers yet: houses, paths, trees, a town square and a
  town hall.
- **Every house can be entered** and has its own interior.
- Later, each AI agent will live and work in their own house.

### 2026-11-19 — Art style guide
- Saved in `STYLE_GUIDE.md`. Its paragraph is pasted **word for word into every art prompt**
  so all art matches.
- Director's style: 16-bit SNES pixel art, warm colors, top-down three-quarter view, light
  from the upper left, dark outlines, no text anywhere.

### 2026-11-19 — Theme: Joseon Korea (Gyeongbokgung)
- The town is set in Joseon-dynasty Korea, modeled on Gyeongbokgung palace.
- **Directors live inside the palace** in its residence halls. **Workers live outside** in a
  hanok village. People come and go through the palace gates, as in real Joseon times.
- Not all of the real palace's ~100 buildings are used. Empty halls and pavilions are kept
  for future use.
- Periods considered and set aside: medieval Europe, ancient Rome, Wild West, Victorian.

### 2026-11-19 — Town map (chosen)
- **Final map:** Higgsfield job `cf70b996-41d3-4b17-9fb8-328181961413`, 3840 × 2160 (4K),
  highest quality, hand-painted style.
- **Built from:** layout job `84dac44c-c18c-4ab4-803c-5ad908b13d61` (version 1) and style
  draft `d722b27d-f21a-499e-8c29-49bfb633700c` (draft 3).
- **Layout:**
  - Palace in the north. The main south gate uses the gatehouse design the director liked.
    Side gates on the west, east and north walls, each with a road outside.
  - Paths connect every hall, both pond pavilions (the west lake pavilion and the north
    hexagonal pavilion) and every house.
  - Worker village of 10 hanok houses along a main street in the south. Each house has a
    yard and a path, and there is a village square with a well-fountain and a zelkova tree.
  - Rich ground texture everywhere.
  - Thick Korean forest around the whole map, with trails to clearings for future houses.
- **Camera:** a scrolling view around the player's character, plus a pull-up full map.
  (A game mechanic; the art and design stay original.)
- **The map can change later:** small edits, repainting one area, upscaling for more
  resolution, or outpainting to add land. Recommended: build the game map in pieces
  (this image as the base, plus extra sections and close-up art per area), so it can grow
  and stays sharp when zoomed in. Plan to be shown before building.

### 2026-11-19 — Art style changed to hand-painted 2D
- Changed from 16-bit pixel art to **lush hand-painted 2D** (modern indie RPG look), chosen
  from 5 modern-style drafts.
- `STYLE_GUIDE.md` now holds the new paragraph. The old 16-bit paragraph is kept there,
  marked retired.

### 2026-11-19 — Master plan: the Joseon Province spec
- `SPEC.md` (provided by the director) is now the **master plan**. Where it conflicts with
  earlier notes, the spec wins unless a decision below says otherwise.
- Key ideas: a capital (한양) with the palace in the center, towns (고을) around it, one town
  per company or area of life, each with its own separate memory. Every animation reflects
  real agent state or a real event; no random wandering.
- **Adjustments to the spec agreed with the director:**
  - **Walking avatar:** the director keeps a character they walk around with (not built yet).
    In the world the director is the King (임금).
  - **Art style:** the hand-painted 2D style guide applies to all art.
- **Map change (approved):** on the current 4K map, the **palace is the capital (한양)**, where
  the King (the director) and the 영의정 are. The **village outside the palace's south gate
  becomes the Personal town** (the director's own personal people). **Mojoco** is a new town
  on its own map piece, connected to the capital by a road. Future towns attach the same way.
- Mojoco town drafts (5, low-res) made 2026-11-19 with the spec's buildings: town gate and
  notice board, 관아, 규장각, 주막, 신문고, 봉수대, 옥, scholar's study, writing hall,
  forge, records office, houses, forest clearings, road to the capital.
- **Recommended answers to the spec's open questions (not yet confirmed):** Phaser 3 web game
  engine inside the claude.ai page; events and config stored in the page's cloud save with
  live updates; scheduled tasks for work done while the page is closed; agents start
  read-and-draft only, with 형방 permission rules in place before any real actions.

### 2026-11-19 — Mojoco town map (locked)
- **Final map:** Higgsfield job `ee0a9a3f-fcf9-44c0-bb19-e048fe9d00fd`, 3840 × 2160 (4K),
  highest quality, painted to match the capital's style.
- **Built from:** combination draft `4de8c864-16fc-430b-8dba-06e218079113`, which took the
  layout of draft 1 (`aa2171cc-…`), the notice board of draft 3 (`143bc732-…`) and the open
  room to grow of draft 5 (`1e7dfd9e-…`).
- **Layout:** compact walled town, gate on the south side with the notice board (방) beside it,
  관아 at the north end of a straight main street, 봉수대 on a hill in the north-east corner,
  plus 규장각, 주막, 신문고, 옥, scholar's study, writing hall, forge, records office and
  houses. Open land and empty plots surround the walls before the forest.

### 2026-11-19 — World structure: separate maps, not one huge map
- **No single giant map.** Reasons: you could miss events off-screen, there would be long
  walks between towns, it loads slowly on phones, and it is hard to grow.
- **Province view (the "full map"):** zoomed out, with 한양 in the center and each town as a
  cluster on a road. Shows busy towns, lit beacons and riders carrying messages.
- **Town view:** click a town (or travel its road) to enter its full painted map, where the
  avatar walks around and visits buildings and agents.
- **Travel:** a quick transition along the road instead of walking across empty land.
- **Countryside between towns:** built from a small set of reusable painted pieces (grass,
  forest, hills, road), made once in our style. The game does not paint new art by itself:
  each new town still needs its own map image (approved and priced first). Special
  landmarks between towns can be painted separately if wanted.

### 2026-11-19 — Rule: clear path to every front door
- **Every front door must have a clear, walkable path. Nothing may sit in front of a door.**
  If a tree or any object blocks a door or its path, it is removed. People must be able to
  walk in and out of every house.
- Enforced in four places:
  1. **Art prompts:** the sentence is now part of the style guide paragraph, used word for word.
  2. **House designs:** yard objects go beside or behind a house, never between the door and
     the path (see `HOUSES.md`).
  3. **Existing maps** (capital and Mojoco, painted before this rule): blocked doors get fixed
     either by repainting that spot (priced first) or by covering the obstacle with a path or
     grass patch in the game.
  4. **The game:** characters walk only on marked paths, and the game flags any door without one.

### 2026-11-19 — House designs
- Each house's outside matches its owner's job, in the same Joseon hand-painted style.
  Designs are recorded in `HOUSES.md`.

### 2026-11-19 — Shared capital library: 집옥재 (Jibokjae)
- The capital gets a **shared library for non-confidential information**, in Jibokjae (the
  real royal library of Gyeongbokgung, in the north of the palace near the hexagonal pond
  pavilion). The exact hall on our map is marked when the playable map is built.
- **Rule:** only items **marked shareable** by a town's 사또 (or 형방) go into the library.
  Everything else stays in that town's own archive (규장각). Any town's scholars may read
  the library. This loosens the spec's isolation rule only for approved, non-confidential items.

### 2026-11-19 — Town hall: the throne hall (근정전)
- The main town hall is the palace throne hall, as in real Joseon.
- The King (the director) sits on the throne on a raised dais, with the sun, moon and five
  peaks screen (일월오봉도) behind.
- Officials stand in rank rows at the stone rank markers (품계석): **civil officials** (영의정,
  scholars, writers) on the **east**, **military and security officials** (병방, guards) on the
  **west**. During morning court (조회), each town's 사또 takes a place in the rows to report.

### 2026-11-19 — Starter roster and house build order
- **Capital:** 영의정 (shared specialists later).
- **Mojoco:** 사또, 형방, 대장장이, 선비, 문장가, 사관.
- **Personal:** 사또, household helper, 선비, 문장가, 사관.
- Each town has its own separate workers, even when roles overlap.
- Build order (the director left it to Claude): capital first, then Mojoco, then Personal.
  12 starter house drafts approved at about 0.25 credits each.

### Higgsfield spending log
- 2026-11-19: 40.25 credits spent on town maps (5 periods, 5 Korea layouts, 5 spread-out
  layouts, 1 revision, 5 gate swaps, 5 style drafts, 1 final 4K map). Balance: 59.5.
- Note: other charges on the account (Nano Banana / Nano Banana Pro) came from something
  else using Higgsfield at the same time, not from this project.
- 2026-11-19: 16.5 credits on the Mojoco town (5 drafts 1.25, combination draft 0.25,
  final 4K 15). **Total on maps so far: 56.75. Balance: 43.**
- 2026-11-19: 3 credits on 12 starter house drafts (low-res, 0.25 each). **Total spent: 59.75.
  Balance: 40.**
- 2026-11-19: 17.25 credits on 12 final houses (option B: 3 showpieces at 2K High, 9 at 2K
  Medium). **Total spent on this project: 77. Balance: 20.75.** (Two more "Nano Banana" charges
  of 1 credit each happened at the same time; they came from something else on the account.)
- 2026-11-19: 3 credits on 12 interior room drafts (low-res). **Total: 80. Balance: 17.75.**
- 2026-11-19: 1.75 credits on 7 drafts: throne hall interior at 1/12, 1/16 and 1/20 scale,
  Jibokjae library interior, King's office (사정전) interior, Personal town 형방 exterior and
  interior. **Total: 81.75. Balance: 16.**
- **Throne hall:** the director chose the first version (1/12 scale, draft
  `198dbdf7-d0fd-4978-876e-940054a19275`); it can be made grander later as needed.
- **Approved drafts:** King's office `0f470d01-9683-48a4-9607-91140f5c1101`, Personal 형방
  exterior `869123ea-ccca-4853-993b-62a1846f40ff` and interior
  `0f23c777-9fdc-4985-bccb-01ec1abe06d0`.
- **Library:** redrafted with many more bookshelves, like a real library
  (`c6f04a65-3298-4e8c-9639-96a4df2ed95e`, 0.25 credits). **Total: 82. Balance: 15.75.**
- 2026-11-19: the director topped up 200 credits (balance 215.75).
- 2026-11-19: 17 finals made (throne hall at 2K High, the rest at 2K Medium) for 18.75 credits,
  plus 2 credits for two orphaned duplicates from a submission that timed out. **Total spent:
  102.75. Balance: 195.** Lesson: after a timeout, wait and check before resubmitting.
- 2026-11-19: the director asked to redo both maps with the updated buildings, in the same
  crisp style as the rooms. 1 credit on 4 low-res map drafts (2 capital/Personal, 2 Mojoco).
  **Total: 103.75. Balance: 194.** Final 4K Max of each pick: about 15 credits each.
- Director picked capital draft 2 (town ring around a square; bottom was cut off) and Mojoco
  draft 4 (more room between buildings).
- 2026-11-19: 15.25 credits: a taller 4:3 capital draft to fix the cut-off bottom
  (`2b4761d5-7bcb-431d-a9a4-a53e05660cd3`) and the **final 4K Max Mojoco map**
  (`3378688f-4665-44ca-95c8-94240cbcb898`, replaces `ee0a9a3f-…`). **Total: 119. Balance: 178.75.**
- 2026-11-19: 15 credits on the **final 4K Max capital + Personal town map**, 4:3, 3312 × 2480
  (`9a55c82c-e91d-465c-961d-57cb45dad439`, replaces `cf70b996-…`). **Total: 134. Balance: 163.75.**

- 2026-11-19: 0.75 credits on 3 drafts: prop sheet 1, village life and street
  (`f3af330a-4514-41dc-9317-e6e1f5cb21f1`); prop sheet 2, nature and garden
  (`1fbd7262-fc21-4440-9b5b-658a0eabc0df`); both on transparent backgrounds. Mojoco map fix
  adding a clear walkable strip between the bottom houses and the south wall, so people
  walking there aren't hidden behind the wall (`fb7644d7-a2a6-411b-a8e0-bc5a2e8f1132`).
  **Total: 134.75. Balance: 163.**
- 2026-11-19: 23.5 credits on finals: prop sheet 1 (4K High, 4.25), prop sheet 2 (4K High,
  4.25), fixed Mojoco map (4K Max, 15), all charged around 20:11 UTC. The submission timed
  out, so their job IDs were never returned and the history tool doesn't list them. They are
  the three newest GPT Image 2.6 images in the director's Higgsfield library. Their IDs must
  be recovered before the game build. **Not resubmitted** (no duplicates this time).
  **Total: 158.25. Balance: about 139.5.**
- **Props plan:** placeable pieces, put around towns when the playable map is built, keeping
  paths and doors clear. Finals recommended at 4K High (about 4.25 per sheet).

### CURRENT FINAL MAPS (use these)
| Map | Higgsfield job | Size |
|---|---|---|
| Capital (palace) + Personal town | `9a55c82c-e91d-465c-961d-57cb45dad439` | 3312 × 2480 (4:3) |
| Mojoco town | `8cbfcc7b-6032-4612-8faa-9f799395f81f` | 3840 × 2160 (16:9) |

- 2026-11-19: Mojoco map updated twice. (1) A clear walkable strip along the inside of the
  south wall (that 4K version's ID was lost in a timeout). (2) The crowded east-side buildings
  spread apart with gaps between them. 15.25 credits (draft
  `a13f1ec9-1b9c-47bc-9bf6-10f6d38f2040` + 4K Max final `8cbfcc7b-…`, which includes both
  fixes and is the current Mojoco map). **Total: 173.5. Balance: 124.25.**
- **Working rule from the director:** always wait for each result to come back before moving
  on; send 4K jobs one at a time with few reference images, so submissions never time out.
- **Final prop sheets (recovered from the director's links):** both 2880 × 2880, true
  transparent background, 20 props each in a 5 × 4 grid.
  - Sheet 1, village life and street: `9f687ffc-ed85-41db-b1c3-fbae0de23783`
  - Sheet 2, nature and garden: `347c2b0b-851c-41c8-aa12-b5a9e4380cac`
  - Note: props are drawn at similar sizes on the sheet (a tree is as tall as a jar). The
    game scales each one to its real size when placing it.
- 2026-11-19: **all art downloaded into `ai-village/assets/`** (approved by the director):
  2 maps, 13 house exteriors, 16 interiors, 2 prop sheets and 40 individual props cut out on
  transparent backgrounds. Full resolution WebP, about 33 MB total. Every file is described in
  `assets/LIST.md`. All 40 props were visually checked after cutting.
- 2026-11-19: **Mojoco prop placement approved** ("perfect"). 32 props placed: lanterns and
  benches along the main street, guardian posts and a bird pole outside the gate, jars and
  barrels in the tavern yard, firewood and millstone by the forge, drying peppers by the jail,
  flower beds and bushes by houses, and a well, haystack, beehive, cart, laundry line and trees
  outside the walls. Paths, doors and the south-wall strip are kept clear. Saved as
  `towns/mojoco-props.json` (the town stores where each piece goes, so it can grow).
  Props are drawn at real-life scale next to buildings. No credits spent.
- 2026-11-19: **Capital + Personal town prop placement approved** ("perfect"). A lighter layer
  of 23 props, since this map already had many painted in: bonsai on the throne courtyard
  corners, a stone pagoda in the east palace garden, lanterns at the palace south gate, benches
  and lanterns around the Personal town square, guardian posts and a bird pole at the southern
  entrance, and farm and garden props on the open grass. Saved as `towns/capital-props.json`.
  No credits spent.
- 2026-11-19: **Day and night cycle: yes, on the real clock.**
  - The village follows the director's actual local time: day when it's day there, night at
    night, with dusk and dawn in between.
  - Done as a **lighting layer** in the game (a night tint plus warm glows at lanterns,
    windows, the forge fire and the beacon), not painted night versions, so it costs no
    credits and works automatically as the town grows.
  - **No sleeping.** Characters only move for real events; idle agents wait in the tavern.
    The night watch (포졸) patrols with torches only while scheduled overnight jobs run.
  - Built after the first playable page works.
  - **Night light balance (approved, night mockup v2):** lit like a real Joseon town, not too
    dark and not too bright. Light comes from stone lanterns and paper lanterns at the gates,
    the magistrate's inner gate, the tavern door, the main and cross streets and house
    doorways, plus the forge fire, the beacon and window light, under a moonlit sky. The jail
    corner, back lanes, wall strips and outer fields stay dark. 12 extra lanterns were added
    to `towns/mojoco-props.json` (now 44 props).
  - Optional later: a sheet of Joseon light props not yet drawn (청사초롱 silk lanterns under
    eaves, 정료대 courtyard fire stands, torch stands). About 0.25 for a draft, 4.25 for the
    final.
- 2026-11-19: **First living version of the village, published as a private claude.ai page:**
  https://claude.ai/artifact/BSMNUN7oGPwMNrheUeXNpM
  - Files: `index.html` (page), `js/village.js` (engine), `towns/*-effects.json` (effect positions).
  - Effects drawn by code on top of the art (sharp at any zoom): smoke from the real chimneys
    (Mojoco forge; Personal town household helper; capital beacon), fire only at real
    fireplaces (forge furnace, helper's clay oven, the capital beacon painted lit), sparkles
    and ripples on the real ponds (no fountain exists on the maps), the painted banners
    swaying, lanterns glowing, lit window screens flickering, a few leaves and petals drifting.
  - Lighting follows the viewer's real clock (with Day/Night override buttons). Very quiet
    ambient sound (soft wind and the odd bird), off until the viewer turns it on.
  - Mojoco's beacon is left unlit (spec: lit only on a real error).
  - **Director's rule (2026-11-19): don't self-test the village in a browser; the director tests
    everything.**
- 2026-11-19: the environment's network now allows Higgsfield's image server
  (`d8j0ntlcm91z4.cloudfront.net`), approved by the director, so art can be downloaded and
  Claude can view and check images directly.
- **Palace vs. town (confirmed):** inside the palace walls are the throne hall, King's office,
  Jibokjae library and the 영의정 residence (plus future capital shared specialists). All six
  Personal town houses, including the steward (the Personal town's 사또), are outside the
  south gate.

### Final interior images (2048 × 2048) and the Personal 형방 exterior
| Room | Higgsfield job |
|---|---|
| Capital — throne hall (High) | `03b327c6-02a8-4959-83e3-1099423b8017` |
| Capital — Jibokjae library | `7b737221-44c7-4ff8-a1cf-2782152c1110` |
| Capital — King's office (사정전) | `d9a079e4-103a-47b5-aeda-f1616110ea60` |
| Capital — 영의정 study | `b9e449e9-e818-4bc0-b076-7e8c8c6ddb64` |
| Mojoco — 사또 hall | `afda4b07-a882-4d2a-a1d8-ab91fbaf4d7a` |
| Mojoco — 형방 office | `20c96269-b9f1-4c65-a271-3756eec4d071` |
| Mojoco — forge | `2bf8efec-25b8-479e-aba7-2634fdf0150f` |
| Mojoco — scholar's study | `41cf75dc-e284-4648-bffa-0e3d58f9fb7f` |
| Mojoco — writer's hall | `20aa3633-ce94-4c6b-8685-25886f1a46a1` |
| Mojoco — records room | `72ed0b17-d98a-4704-a360-c6efc978fe5a` |
| Personal — steward's office | `05eced17-b7ef-45ea-9893-9c1bd28b87d6` |
| Personal — household helper | `311d3565-01cc-44c7-a4d8-194f31c98143` |
| Personal — scholar's study | `a417d3bb-b9ad-4e8d-9abc-8a913925baec` |
| Personal — letter writer | `82e637d4-03b7-44d9-ba3f-86b5bcdc18f9` |
| Personal — records room | `92677545-b47a-4502-bcba-66a677c203c4` |
| Personal — 형방 office (interior) | `7b2eff31-fcd4-4a2f-bcbc-3461fc6543d2` |
| Personal — 형방 house (exterior) | `a0779df1-7a71-40e7-bfb1-b9ecbe6ef00c` |

### Interior rules (director, 2026-11-19)
- One image per house. A standing person is 1/12 of the image height; furniture drawn that
  small with open floor between pieces.
- The room fills the image: thin back-wall strip at the top, one door centered in a thin wall
  at the bottom.
- Expensive "hundred-thousand-dollar fit-out" look (Joseon luxury: maru and ondol floors,
  lacquer with mother-of-pearl inlay, brass, silk cushions, painted screens, porcelain).
- No people. Each room obviously belongs to its job, with one desk and seat for the owner:
  low desk and floor cushion (historically accurate), except official's chairs for the
  영의정 and both 사또 (option A).

### Final house images (2048 × 2048)
| House | Higgsfield job |
|---|---|
| Capital — 영의정 residence (High) | `ecd90179-633d-4db9-9cb9-e9c059c57515` |
| Mojoco — 사또 office (High) | `cb1d9c24-f1da-41d7-96bf-a5e4348abe84` |
| Mojoco — 형방 hall | `737bb10d-c3fc-45d1-ac2c-1672a05221e9` |
| Mojoco — 대장장이 forge | `e581cd82-e603-4cba-b333-588f15cd3cd1` |
| Mojoco — 선비 house | `76cf02b6-2033-4898-8864-6e02652ef03b` |
| Mojoco — 문장가 hall | `5c28e49c-4721-4a1e-a3f5-6aa9bedbc33f` |
| Mojoco — 사관 records house | `2bcd5041-02ea-4ccb-886c-869bef165b4b` |
| Personal — 사또 steward's house (High) | `df5487e9-3e11-4906-87c4-04224fc0584c` |
| Personal — household helper home | `6a0c781d-39f4-4cee-9df4-c22cb52ef22f` |
| Personal — 선비 cottage | `3f4bff82-9964-4adf-857e-40b8ad4fd015` |
| Personal — 문장가 cottage | `cf074430-d9ed-4ad0-aa97-88fa37deffeb` |
| Personal — 사관 records cottage | `136c521d-77a6-46fa-aed3-929cdf7a236a` |

## Open questions
- How the game map is split into pieces and close-up area art (to be planned and shown first).
- Downloading the map into the project needs Higgsfield's image server allowed in this
  environment's network settings (ask before proposing).

## Tree action (version 3 of the village page)
- Request: "much more real. I want some tree action too".
- Prop trees, willows, bushes, flower beds, drying peppers, haystacks and the laundry line now bend from their base in the wind. Solid things (jars, lanterns, wells) don't move. The willow bends most.
- The wind has a steady breeze plus slow gusts that roll across the town from one side to the other. Blowing leaves speed up in gusts too.
- Petals (blossom trees) and little five-point leaves (maple trees) fall from the painted trees at their real spots. They drift with the wind and fade before they reach the ground. Positions are in each town's effects file under "trees".
- I found the painted trees by colour, then checked them by eye. I removed false finds: Mojoco's drum, a hall pillar and a gate pillar, and the capital's brick chimney. Then I added blossom trees the colour search missed (9 in Mojoco, 7 in the capital). Totals: Mojoco 33, capital 20.
- Not tested by Claude, per the director's rule. The director tests.

## Fix: "I don't see trees swaying and I don't hear sound" (version 4)
- Likely cause of no motion: the page froze every animation when the device's "Reduce motion" setting was on. The director wants motion everywhere, so that setting is now ignored.
- Before, only the few placed prop trees swayed (too gently to see), and the trees painted into the map couldn't move. Now each painted tree gets a soft-edged copy of its crown laid over the map, rocked by the wind. Prop sway is about 2.5x stronger.
- Sound was far too quiet and too low-pitched for laptop and phone speakers. Wind is about 5x louder and brighter, birds about 4x louder, and the first bird comes within about 2 seconds. Sound still only starts when the "Sound off" button is tapped, because browsers block sound until you tap.

## Fixes after the director's test (version 5)
- The trees moved far too much, and part of the scene around them moved too. Now only leaf-coloured pixels (pink blossom, red/orange maple) are copied and moved, so roofs, grass and paths around a tree stay still. I checked the leaf masks against the map. Painted crowns move about a third as much as before, and placed props about 40% as much.
- The wind sound is removed. Only the odd bird remains.
- Lamps and window screens now glow up and down slowly, like a candle behind paper. Each slow wave takes several seconds instead of several flickers a second. The oven, forge and beacon fires keep their quick flicker, because real flames do.

## Chief Human Officer character (the King): walking sheet drafts
- Request: a character of the director from their photo, in the village style, as a walking character sheet: 4 rows (toward, right, left, away) x 3 frames (left foot, standing, right foot), big stride, plain background.
- Director approved: the Joseon king's red dragon robe (gonryongpo) with gold dragon emblems, the winged royal hat (ikseongwan), and his glasses always on.
- The photo was uploaded to Higgsfield through the upload box, media d05822f8-23f2-46d5-b070-6679982e2be4. This cloud session's network blocks Higgsfield's upload server.
- 3 low-res drafts (gpt_image_2_6, low 1K, 3:4), 0.75 credits in total:
  - A 4d6d6b95-4792-49e5-91dd-68b75daf47e2 (natural adult proportions)
  - B 56ede1cd-496d-49ba-80c4-f106e64d8f92 (cute, bigger head)
  - C a2c8915c-32f9-4f08-af4b-07381aaff5b1 (in between, slightly from above)
- Problems in all 3 drafts: the background came out dark and glowing instead of plain cream, the face looks young, and the back-view row barely shows a stride.
- Draft D 69b9da6b-33ec-4a08-9a7c-7ff62b7bd023 (0.25 credits): a detailed face description, "adult, not a child", and a pure white background. It still came out childlike, with a dark glowing background. Low-quality drafts seem to ignore those instructions when asked for a whole 12-frame sheet at once.
- Proposed next step: first make one accurate full-body portrait of him in the robe (2K medium, about 1 credit), then use that portrait as the reference for the walking sheet.
- New references from the director: 4 photos. Photo 1: a1d7d1a1-095b-4fe2-98e4-8eec1515f83e, he's the one in green. Photos 2 to 4: c1f78095-0a90-4a03-8fff-2501a29aed77, 631f0847-f995-47c7-b884-b10ce000ad4d and 4ce12d66-4687-48c5-9a80-6af850309339, he's the one in blue. He wants his mouth closed.
- Step 1 portrait b30b2b3b-08b6-4e1a-b517-11c573af315a (2K medium, about 1 credit): an adult likeness with mouth closed, glasses, red dragon robe and winged hat. The model also added, unasked, a second panel of him standing in a village scene below the portrait. Waiting for the director's verdict on the likeness.
- The director chose the cute game style with a bigger head (like draft B), with his real face and mouth closed.
- Test sheet 7b5813a0-d46b-4b85-9ec8-75b0d9642de3 (low 1K, about 0.25 credits), using portrait b30b2b3b plus the photos as references. It has an adult face, mouth closed, glasses, and cute proportions. The background came out dark and glowing again, which seems to be how low-quality drafts behave. For the final, ask for a transparent background so he can be cut out cleanly. The back row's stride is visible but small.
- The director said the hat isn't the right crown and asked for deep research ("truly learn and study Joseon"). I wrote COURT_DRESS.md, a reference for who wears what across the royal family, officials, palace staff, guards and townsfolk, mapped to our village roles, with sources.
- Finding: our King drafts drew wide SIDE wings, which is the officials' samo. The King's everyday crown, the ikseongwan, has two small wings standing UP at the back. The red five-clawed robe is correct for a Joseon king. Yellow is only for the emperor after 1897. The bead-string myeonryugwan is only for grand rites.
- Hat test 8a60ffb9-fbbd-434c-99f8-3b1647acec46 (low 1K, about 0.25 credits): the ikseongwan is now right, tall and black with two rounded lobes standing up at the back and no side wings. The robe has a gold dragon on the chest, back and shoulders, and a jade belt. Mouth closed, glasses on.
  Remaining issues for the final: the figures are small in their frames, the background is still dark and glowing, the model again added an unwanted village scene below the sheet (probably because the style paragraph describes a village), and the back view barely strides.
- The director asked for a cuter character, showing 3D toy figure examples. We agreed on option 1: cute toy proportions (big head, chunky body, big hands and boots) painted in the village's 2D style, so characters still follow the style guide's "no 3D rendering".
- Cute test 2bbed996-b284-42c5-a7b7-c6675d23c5f1 (low 1K, about 0.25 credits): cute big-head proportions, the correct ikseongwan, dragon robe, glasses, mouth closed, figures filling their frames, and no extra village scene this time. The background is still dark and glowing in low-quality drafts. The back view's stride is still small.
- FINAL FAILED: e0f57568-059f-45c8-a162-fcd15e0fe6fc (2K high, about 2.75 credits). It drew only a village scene with no character at all. At high quality the model followed the style paragraph, which describes a village, instead of the character sheet instructions. Lesson: the village style paragraph doesn't suit character art. Proposed fix (needs the director's approval because it changes the word-for-word style rule): a separate character style paragraph with the same painted look, palette, light and linework, but no village or door wording.
- The director said: "just make the character sheet like I asked." I retried using a character style paragraph (same look, no village or door wording) instead of the village one. Adding it to STYLE_GUIDE.md is waiting on the director's yes.
- FINAL KING WALKING SHEET: b5d0c493-4f3e-4120-8320-58f53b6f8079 (2K high, 1744x2336, about 2.75 credits). The 4x3 grid is correct: toward, right, left, away. It has cute big-head proportions, the correct ikseongwan with upright lobes, the red dragon robe with gold dragons on the chest, shoulders and back, a jade belt, glasses, mouth closed, middle-part bangs, and clear strides including the back view. The background is dark with a glow behind each figure, not white, so it needs cutting out before going in the game.
- Character spending so far: about 8.25 credits (drafts 0.75 + 0.25, portrait 1, three tests 0.75, failed final 2.75, final 2.75).
- Side-view hair fix: the director wanted the bangs to curtain forward in profile, not swept back. I redid only the right-facing walk, 3 frames: ed125a2b-8f26-40f3-99bb-971a8156f125 (2K medium, about 1 credit). The bangs now hang forward over the forehead to the glasses. I mirrored those frames for the left-facing row and composited both rows into the final sheet by code, as a preview in the scratchpad (chief/final3_preview.png). Nothing has been added to the project assets yet.
  Note: in the new side frames, the two stepping frames look very similar, so the side walk may read as a shuffle. The background band behind the side rows is darker than the rest, but that disappears once the frames are cut out.
- Character spending so far: about 9.25 credits.
- APPROVED by the director: the King's sheet (front and back rows from b5d0c493, side rows from ed125a2b mirrored). The character style paragraph is saved in STYLE_GUIDE.md under "Characters".
- DIRECTOR'S RULE (saved in STYLE_GUIDE.md): every new character after the King is made by giving Higgsfield an existing character sheet as the reference and asking it to redraw it as a DIFFERENT person in the same style, the same proportions and the same grid. Never make a character from words alone, so the cast's proportions match.
- The King's sheet is saved in the project: assets/characters/king.webp (1200x1600 WebP with a transparent background, 300 KB). It's a grid of 3 columns x 4 rows of 400x400 frames. Row 1 walks toward the camera, row 2 right, row 3 left, row 4 away. Columns: left foot, standing, right foot. Every figure is scaled to the same height with its feet on the same line (y = 390 in each frame).
  Cut out free on this machine with rembg (isnet-anime model). No credits were spent. Script: scratchpad scripts/cut_king.py.

## Walking King (version 6 of the village page)
- Request: walk around as my character with the arrow keys or WASD, hold Shift to run, the camera follows, drag the character anywhere with the mouse, the same size facing any direction, no doors to open: walking into a doorway goes straight inside using that house's room art, and walking out of the room's bottom doorway comes back out right in front of that house.
- Built in js/village.js. The doorways for each town are in towns/mojoco-houses.json and towns/capital-houses.json (door = where the doorway meets the ground, plus its width), along with the player's size and starting spot.
  - Mojoco (6): magistrate's hall, scholar's house, records house, writer's hall, rules office beside the jail, forge.
  - Capital (4): throne hall, King's office (the west hall behind the throne hall), Jibokjae library (the east hall), and the 영의정's residence (the house west of the lake).
  - Personal town (6): steward (top centre), household helper (thatched house with the oven), scholar (thatched house with the lotus pond, lower right), letter writer (top left), records (the two-storey archive, far west), rules office (bottom centre, with the gong and banner).
  - The capital halls and Personal houses were matched to owners by me from the painted buildings and house designs. The director can reassign any of them; it's a one-line change in the houses file.
  - Not enterable (no room art yet): the taverns, the jail, the open pavilions, and the empty fenced house at the far east of the Personal town.
- Walk speed is 2.6 body heights per second, running 5.2. The walk cycles through the sheet's columns (left foot, standing, right foot, standing). Your King is sorted in front of or behind props by depth and has a soft shadow. Inside a room, the back wall stops you, and you're 1/12 of the room's height, matching the interior art rule.
- Going in needs you to walk up into the doorway. Dropping your King on a doorway doesn't send you in. Dragging the map stops the camera following until you walk again.
- Not tested by Claude, per the director's rule.
- Fix (version 7): the King was far too small inside houses. The room art is drawn at a bigger scale than the 1/12 rule (a floor cushion is nearly as wide as a person is tall). The King is now 1/4.5 of the room's height inside, checked against the furniture in three rooms. The back wall now stops you about a third of the way down the room.
- Obstacles (walls, buildings, trees blocking the King): started, then the director said to hold off and do it later. Notes for later: automatic detection by colour and texture doesn't work on this painted art (grass is as textured as trees), so obstacles will need hand-drawn shapes for buildings and walls, plus circles for trees.
- Inside houses the camera now starts more zoomed out (the screen shows about 6 King-heights instead of 4), at the director's request (version 8).
- Depth inside rooms (version 10): the King now shrinks smoothly toward the back wall, to 74% of full size, and is full size at the doorway. Walking speed scales with size. Outside is unchanged. Each house can also have a "room_scale" (default 1) for rooms drawn at a different scale, such as the 1/16 throne hall.
- Throne hall swap: the director asked to swap in the 1/16 hall, low-res draft 5ef23393-48dd-4f17-bd3f-fb1bb777550d (1024 px). Waiting on the choice: use the draft free (soft), or make a 2K high final from it (about 2.75 credits). Either way it gets room_scale 0.75 (12/16).
- THRONE HALL SWAPPED to the 1/16 design: 2K high final 9de12363-26e2-4798-8e50-e8e0be1ee143 (about 2.75 credits), made from draft 5ef23393. It's now assets/interiors/capital-throne-hall.webp. The old 1/12 hall is kept as capital-throne-hall-1-12.webp.
  In the houses file the throne hall has room_scale 0.55 (the King is drawn smaller to match the bigger hall) and room_top 0.16 (you can walk up to the throne dais). Checked by placing the King against the rank stones and throne.

## 김모심, the 상선 (chief of staff, the King's right hand)
- Director's request: add the chief of staff / 상선, named 김모심. Dressed appropriately, with a walking sheet plus a second sheet holding something for "calling people". They live in the town hall (the throne hall). Their job: the director's right hand. They follow the King everywhere, take orders and pass them to the right person, and later help find new people to hire. They run on Opus 5.5. For now it's just the director and 김모심, nobody else.
- Approved: the 명패 (myeongpae), the red lacquered summons tablet the Joseon court sent to call officials. Plain, with no writing. Also approved: two sheets, about 6 credits with tests.
- Dress: a black round-collared official robe (흑단령), the samo hat with flat side wings, double-crane badges on the chest and back (senior rank, since the 상선 was junior 2nd rank), a gold-plaque rank belt, black boots. Beardless, kind face, no glasses.
- Test 1 (walking): 70fb2b58-005b-4ca8-b0e1-64227fa9d42b (low 1K, about 0.25 credits), redrawn from the King's sheet b5d0c493 per the character rule. Good: the right outfit and hat, matching proportions, and a plain white background. The 2K final is waiting on the director's go-ahead after seeing the test.
- The AI part (taking orders, hiring, on Opus 5.5) isn't built yet. Before it runs, I must check and confirm it uses only the director's subscription.
- The director chose a green robe "for fun", the K-drama convention, not historical. Green final e31df936-4a93-4643-b4b2-4ecab3d5fd9c (2K high, about 2.75 credits). It was cut out to assets/characters/kim-mosim.webp, but it still has the winged samo.
- Tablet test: f94fc2da-90c5-42d5-94e1-f63810b00c5f (low 1K, about 0.25 credits). The 명패 reads well in every view, but it also has the winged hat.
- The director said the hat isn't what a chief eunuch wears. Research: historically, eunuchs wore the winged samo with a rank badge, as drawn. K-dramas use a wingless samo (a rounded black cap with nothing at the sides) and a green robe without a badge. To match the chosen K-drama green, the plan is the wingless cap, and both sheets need redoing. Waiting on the director: keep the crane badge or not, and the go-ahead for the walking sheet (about 2.75 credits).
- Cutting fix: scripts/cut_sheet.py now finds the real gaps between figures instead of splitting the sheet into equal rows (equal rows clipped hats that crossed the grid lines).
- K-DRAMA 김모심 APPROVED ("make it like the kdramas"): walking sheet a31785e5-8093-4328-9112-3f34f7b64153 (2K high, about 2.75 credits). Green robe, a wingless rounded black cap, no badge, a gold rank belt, beardless kind face. Cut out to assets/characters/kim-mosim.webp (same 400 px frame layout as the King). The earlier winged-hat sheets (70fb2b58 test, e31df936 green final, f94fc2da tablet test) are not used.
- In the village (version 12): 김모심 follows the King everywhere, a step behind and off to the side like an attendant, walking or running to keep up, and facing the same way when stopped. They go in and out of houses with the King, are drawn in depth order with the King and props, and use the same depth sizing inside rooms. Their home is the throne hall (for when they're not following; the King is always present for now).
- Next: sheet 2, 김모심 holding the 명패 tablet, made from the K-drama sheet (about 2.75 credits for the final). Waiting on the go-ahead.
- Character spending: King about 9.25 credits plus 김모심 about 9 (tests 0.5, unused green final 2.75, K-drama final 2.75, tablet test 0.25, and so on).
- 명패 SHEET: 20d4393c-c5e4-44ec-a4ec-c8509db2028e (2K high, about 2.75 credits), made from the K-drama sheet. The red lacquered tablet with a gold rim and tassel is plain (no writing) and visible in all 12 frames. Cut out to assets/characters/kim-mosim-myeongpae.webp. Not shown in the game yet: it's for when 김모심 is calling someone, once the AI part exists.
- Cutting fixes: the remover punched holes in the red tablet. scripts/cut_sheet.py now puts back red-lacquer pixels touching the figure, and keeps the original colours.
- Running-legs fix (version 13): 김모심's legs moved super fast because his walk cycle ticked on time, not on distance, so tiny catch-up steps still churned his legs. Now his legs move with the ground actually covered, at the same rate as the King's. He also only starts walking once he's a little behind and stops once close, so there's no jittery start and stop.
- Character spending: 김모심 about 11.75 credits in total (including the unused winged-hat green sheet). The King about 9.25.

## Team structure (saved 2026-11-20)
- The director gave the full team structure: the hierarchy, town rules, worker roles, town-life signals, pun names and models. Saved word for word in TEAM.md. Where it differs from earlier notes or SPEC.md, TEAM.md wins.
- Filled so far: 임금 (the director) and 상선 김모심. Everything else is defined but empty.
- Two differences from earlier this session, flagged to the director and not yet changed:
  1. Earlier, 김모심 was called "chief of staff". TEAM.md makes the 영의정 (이균) the chief of staff and the 상선 the personal attendant.
  2. Earlier, the director said 김모심 runs on Opus 5.5. TEAM.md says the 상선 runs on Sonnet 5.5.

## 사또 for nine towns (proposed 2026-11-20, waiting on the director's answers)
- Request: one 사또 per area (YouTube, inbox and email, money, research, products, family, trading, AI news, outreach). Found new towns around 한양 with pun names. Each 사또 lives in their own 관아 and mostly stays in the 관아 yard or inside, leaving only for real events (조회, 상소, 신문고). Each gets their own robe colour and 흉배, varied looks, and a character sheet made from an existing sheet.
- Draft roster (town / 사또 / robe / 흉배):
  비춤골 박정도 plum, peacock · 편지원 윤답장 sky blue, wild geese · 전주(錢州) 금알뜰 navy, golden toad on coins · 궁리촌 허탐구 charcoal, owl on books · 솜씨골 조빚음 ochre, celadon vase · 울타리골 정다운 rose pink, mandarin ducks · 시세포 강배짱 vermilion, leaping carp · 기별골 선앞섬 slate grey, armillary sphere · 마중골 반가움 teal, two magpies.
- Open questions: is 박정도 on YouTube right; is the Personal town the family town; what area is Mojoco; option A (a small 관아 piece per town, about 2.75 each) or B (a full map, about 15 each); a province map; shared or new 관아 rooms. Estimate with my recommendations: about 50 credits. Still open: 김모심's role and model.
- DIRECTOR'S ANSWERS (2026-11-20):
  1. 박정도 is Mojoco's 사또. The YouTube 사또 gets a new name: 사또 노볼만 (볼만하다, worth watching).
  2. There is no separate Personal town. 한양 is the capital AND the director's personal home: 임금, 영의정 이균, 상선 김모심 and the personal staff live there. The "Personal town" merges into 한양. Personal areas become 한양 districts (방), each with its own 관아 and its own 규장각 (isolation still applies): family, money, inbox and email. Project areas get their own towns around 한양: YouTube, products, trading, AI news, outreach, research. Mojoco is the town for all Mojoco work.
  3. Option A, a small 관아 piece for each new town. Yes to a province map with 한양 in the centre and the towns around it, connected by roads.
  4. Reuse Mojoco's 관아 rooms for now.
  5. 김모심 is the personal attendant (상선) on Sonnet 5.5. The chief of staff is 영의정 이균 on Opus 5.5 with Fable 5.2 as advisor.
- Final placement:
  - 한양 districts: 울타리방 (family, 사또 정다운), 금전방 (money, 사또 금알뜰), 서신방 (inbox and email, 사또 윤답장). Their 관아 are existing buildings in the old Personal-town ring: the steward's house, the rules office and the letter writer's house.
  - Towns: 비춤골 (YouTube, 노볼만), 솜씨골 (products, 조빚음), 시세포 (trading, 강배짱), 기별골 (AI news, 선앞섬), 마중골 (outreach, 반가움), 궁리촌 (research, 허탐구), plus Mojoco (박정도).
- DIRECTOR'S ANSWERS (2026-11-20):
  1. 박정도 is MOJOCO's 사또, not YouTube's. The YouTube 사또 gets a new name: 사또 명장면 (장면, a scene; 명장면, a great scene).
  2. There is NO separate Personal town. 한양 is the capital AND the director's personal home: the 임금, 영의정 이균, 상선 김모심 and personal staff live there. The "Personal town" is merged into 한양.
     - Personal areas are DISTRICTS of 한양, each with its own 관아: family (정다운), money (금알뜰), inbox and email (윤답장). Town isolation still applies: each district 사또 keeps their own 규장각.
     - Project areas get their own towns around 한양: YouTube (비춤골, 명장면), products (솜씨골, 조빚음), trading (시세포, 강배짱), AI news (기별골, 선앞섬), outreach (마중골, 반가움), research (궁리촌, 허탐구).
  3. Option A: a small 관아 piece for each of the 6 new towns (about 2.75 each). Plus a province map with 한양 in the centre and the towns around it, connected by roads.
  4. Reuse Mojoco's 관아 room inside each new town's 관아 for now.
  5. 김모심 is the personal attendant (상선) on Opus 5.5. The chief of staff is 영의정 이균 on Opus 5.5.
- 한양 district 관아, using the old Personal-town houses and their existing rooms: family 정다운 in the old steward house (top centre); money 금알뜰 in the old rules-office house (bottom centre, with the gong); inbox 윤답장 in the old letter-writer house (top left). The household helper's house, the scholar's house and the two-storey archive stay as personal-staff buildings, empty for now.
- Higgsfield balance before starting: 103.5 credits. Plan: 9 사또 sheets at 2K high (about 24.75 credits, straight to finals, made from existing sheets), 6 관아 pieces (about 16.5), a province map at 2K (about 2.75). About 44 in total.
- The director stopped the 사또 sheet work ("cancel that") to give a corrected prompt. Three sheet jobs had already been sent before the stop, probably charged at about 8.25 credits: ed8856e0-280a-44ac-a04d-365f69f4ac40 (YouTube, plum, peacock), 2697c31e-3838-47bd-98df-b9bcc69b305c (inbox, sky blue, geese), 6c371a99-c47c-4a11-ba0f-cfd14f408b1f (money, navy, toad on coins). Not used unless the director says so.
- Also done before the stop: capital-houses.json renamed for the 한양 districts, and the tab renamed "한양 · Capital" (not published yet).
- TEAM.md updated (director approved): header says 김모심 is on Opus 5.5; an Updates section adds no Personal town (merged into 한양), 김모심 on Opus 5.5, and 박정도 as Mojoco's 사또.
- The director narrowed it: create the 사또 for each town, which for now is just Mojoco. That's 사또 박정도, named per the notes. Profile is in TEAM.md "Who's filled": steady and principled, straightens anything crooked, middle-aged with a solid build and short beard, in a deep indigo robe with a double-crane 흉배 and the winged 사모.
- Sheet: d61a1613-710a-442c-a087-c7718a048f16 (2K high, about 2.75 credits), made from the King and 김모심 sheets. Cut out to assets/characters/satto-bak-jeongdo.webp.
- In the village (version 14): towns/mojoco-people.json lists who lives where. 박정도 lives in Mojoco's 관아 (the magistrate's hall). He strolls between spots in the hall's courtyard, and every 40 to 90 seconds walks through the doorway to spend time inside the hall, near the dais and the rows of cushions, then comes back out. He turns to face the King when the King comes near.
  Name tags: "사또 박정도" and "상선 김모심" now show above them (title and name always together), at a steady size on screen.
  He doesn't leave yet: the real events (조회 at the palace, 상소, 신문고) aren't wired up, so he stays home.
- Also published in this version: the "한양 · Capital" tab name, and the 한양 district names in capital-houses.json.
- The three earlier 사또 sheets (ed8856e0 YouTube, 2697c31e inbox, 6c371a99 money) are kept for possible reuse later, as the director said.

## Agents get folders (2026-11-20)
- Request: every character is a real agent, with their own folder, short instructions (who they are, their job, who they report to, who reports to them), and their own notes file for memory.
- Made agents/README.md, agents/satto-bak-jeongdo/ and agents/sangseon-kim-mosim/, each with INSTRUCTIONS.md, NOTES.md and profile.json. Built from TEAM.md.
- Choices to check with the director: (1) while the 영의정 is unfilled, 사또 report straight to the 임금; (2) orders can reach a 사또 through 상선 김모심; (3) 김모심 routes town work to the 사또 rather than doing it.
- Nothing runs on its own yet. Before any agent does, I must confirm it uses only the director's subscriptions.
- Director's rule: we will NEVER use Fable. Removed the Fable 5.2 advisor from 박정도's instructions and profile, and added it to the TEAM.md Updates section. The 영의정 and 사또 run on Opus 5.5 with no advisor.

## OFFICIAL TEAM STRUCTURE (2026-11-20, replaces all earlier versions)
- The director gave the complete team structure. Saved word for word as TEAM.md, replacing the earlier TEAM.md (old copy in the scratchpad as TEAM.previous.md). SPEC.md now opens with a banner saying TEAM.md wins wherever they disagree. (The director called it "AI_VILLAGE_SPEC.md"; in this repo it's SPEC.md.)
- Key changes: a town is a whole project or company (Mojoco is the only town); houses are workstreams inside a town (workplaces, not homes) with an optional 행수 lead; the 상선 is the gatekeeper and heads the palace household (내관 윤편지, 내관 곽곳간, 상궁 정살림); the palace has its own 사관 (오남김) and its own 규장각; shared specialists live in 한양; the 암행어사 reports to the 임금; Mojoco has 이방 김차례, 예방 이소식 and 사관 문적음; models are Opus 5.5 or Sonnet 5.5 with escalation; never Fable.
- This replaces earlier ideas: the 9 사또 / towns plan and the 한양 districts (family, money, inbox) are dropped. Those areas are now palace household roles (inbox 윤편지, finances 곽곳간, family 정살림), or future houses inside future towns. The three unused 사또 sheets (ed8856e0, 2697c31e, 6c371a99) could become future characters.
- Not yet updated to match: the agents/ folders for 김모심 and 박정도 (their instructions still follow the older structure), and capital-houses.json (still names the old districts). Waiting on the director.
- Director's update: characters may move around as they like (the 사또 strolling their yard, everyone else around their workplace or town), since the 임금 can always call them. Added to the TEAM.md Updates section.
- Agent folders now exist for all 18 agents on the official roster (generator: scratchpad scripts/make_agents.py). 김모심's and 박정도's were rewritten to the official structure, keeping their notes logs.
- House lists updated. 한양: 편전 (영의정), 침전 (상선), two household offices (윤편지, 곽곳간), household kitchen (정살림), palace archive (사관 오남김), Jibokjae library (선비, 문장가, 역관, 천문관), specialists' workshop (대장장이, 화원, 목수). Mojoco: 관아 (사또), 육방 office (이방), 예방 office, records house (사관).
- Not done yet: putting the new agents in the village. That needs character sheets: 16 new characters at about 2.75 credits each, or fewer if the 3 unused 사또 sheets are reused. Balance about 92.5.
- The director said "commit": all work so far is committed and pushed to the ai-village branch.
