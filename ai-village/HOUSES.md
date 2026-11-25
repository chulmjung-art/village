# My AI Village — House Designs

Each house's outside matches the job of the agent who lives there. All houses share the same
base: Joseon hanok construction (timber, white plaster, stone footing, tiled or thatched roofs)
in the hand-painted style from `STYLE_GUIDE.md`.

Each design has:
- **Look:** a silhouette you can spot from far away, plus yard details that tell the job.
- **Status:** a feature that can show the agent's real state, as the spec requires (only
  real events move or change things).

**Door rule (applies to every house):** every front door has a clear, walkable path. Yard
objects (jars, racks, carts, timber, instruments) go **beside or behind** the house, never
between the door and the path.

Research note: the historians' office (춘추관), court painters' bureau (도화서), taverns (주막),
onggi jars and hanok life were checked against sources. The observatory (관상감), interpreters'
office (사역원), forges, scholars' quarters and the six offices are from general knowledge of
the period.

---

## Jung City (Capital)

### 영의정 (Chief State Councillor) — grand residence hall in the palace
- **Look:** largest home after the King's; double-eaved tile roof, painted eaves (단청), red
  pillars; raised stone platform in front where the 사또 gather for morning court; report scrolls
  on a low table under the eaves; a small reading pavilion.
- **Status:** walkway lanterns lit while the daily briefing is being written.

### Shared specialists' guesthouse (later)
- **Look:** a long row building near the palace's west gate, with horses stabled for trips to
  the towns.

## Town government (관아) — one set per town

### 사또 (Magistrate) — the 동헌 (magistrate's office)
- **Look:** the town's biggest building; tiled roof on a raised platform, wide front porch where
  judgments are given, walled courtyard and gate, a banner pole, an official's chair on the porch.
- **Status:** the courtyard gate opens when a request arrives and the 사또 walks to the porch.

### 이방 (task queue) — clerks' office
- **Look:** next to the 관아; wall racks of tied paper bundles, a blank duty roster board, a bell.

### 호방 (numbers) — granary office
- **Look:** a storehouse raised on stone stilts, stacked rice sacks, a large abacus by the door,
  weighing scales.

### 예방 (communications) — post-relay house (역참 style)
- **Look:** horse stable and hitching post, message-scroll rack, flag pole, small signal drum.
- **Status:** a horse is saddled while a message is being sent.

### 병방 (security) — guardhouse by the town wall
- **Look:** spear and shield rack, watchtower ladder, torches; base of the night watch (포졸).
- **Status:** torches lit during overnight jobs.

### 형방 (rules and safety) — hall beside the jail (옥)
- **Look:** plain grey walls, wooden fence, rack of rule scrolls, a large seal-stamp table.
- **Status:** red cords tied across the door when an action is blocked pending approval.

### 공방 (infrastructure) — tool and supply depot
- **Look:** big open-fronted shed with tool racks, coiled ropes, timber stacks, spare roof tiles.
- **Status:** scaffolding goes up on whichever building has a broken tool.

## Scholars (학문)

### 선비 (research) — scholar's house with a 사랑채 (study quarters)
- **Look:** refined tiled house; open study facing a garden of pine, plum and bamboo; a small
  pavilion (정자) by a lotus pond; scrolls drying on a line; a book chest on the veranda.
- **Status:** study doors slide open with a lamp glowing while researching.

### 문장가 (writing) — writer's hall
- **Look:** long hall; sheets of mulberry paper (한지) drying on wooden frames; brush-washing
  basins, ink stones, a writing desk on the veranda.
- **Status:** fresh sheets appear on the drying racks as drafts are produced.

### 역관 (translation) — interpreters' house (inspired by the 사역원)
- **Look:** tiled house with foreign touches: travel trunks, envoy lanterns, a map screen, a
  small cart for diplomatic trips; gate facing the main road.
- **Status:** the cart is packed while a translation job is underway.

### 천문관 (analysis and forecasts) — small observatory (inspired by the 관상감)
- **Look:** tiled office beside a raised stone observation platform (관천대 style) with a bronze
  armillary sphere; a rain gauge on a stone pedestal (측우기) and a bowl-shaped sundial (앙부일구)
  in the yard — all real Joseon inventions.
- **Status:** the armillary sphere slowly turns while analysis is running.

## Craftsmen (장인)

### 대장장이 (coding) — blacksmith's forge (대장간)
- **Look:** open-sided thatched or rough-tiled workshop; stone furnace and chimney, anvil, water
  trough, bellows; tool racks, charcoal pile, grinding wheel.
- **Status:** chimney smoke and furnace glow while coding; cold when idle.

### 화원 (design) — painter's studio (inspired by the 도화서)
- **Look:** bright tiled studio; large folding landscape screens (no text), easels, bowls of
  colored pigment; a courtyard where a big painting dries flat.
- **Status:** a new painting appears on the drying frame when a design is finished.

### 목수 (automations) — carpenter's yard
- **Look:** workshop with timber piles, sawhorses, half-built roof frames showing interlocking
  wooden joints; a water wheel by a stream turning machinery (a nod to automation).
- **Status:** the water wheel turns while an automation runs.

## Records and oversight

### 사관 (work logs) — records house (inspired by the 춘추관)
- **Look:** tiled building with tall, ventilated storage rooms and lacquered document chests; a
  writing room; a bell or gong; a writing desk facing the town square.
- **Status:** the window lamp flickers each time a log entry is written.

### 암행어사 (secret QA) — a deliberately ordinary house
- **Look:** a plain thatched commoner's home that blends in. One hidden clue: a horse-shaped
  brass tablet (마패, the secret inspector's badge) on a hook inside the door.
- **Status:** reveals itself only when it flags a problem.

## Personal town

### Household helper — warm family home
- **Look:** homely thatched house; jar terrace (장독대) of onggi jars, kitchen with steam, a
  vegetable patch, laundry on a line, a blank calendar board, an errand basket.
- **Status:** kitchen steam while tasks are active; basket by the gate when out on errands.

---

## Making the art (nothing is spent without approval)
- Each house becomes its own close-up painting for the town view, using the style guide word
  for word.
- Per house: one low-resolution draft (about 0.25 credits), then a final version (priced
  before starting).
- Start with the roles actually hired first, not all of them.
