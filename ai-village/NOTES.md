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
