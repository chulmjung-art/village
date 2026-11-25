# AI Village — Art Assets

All art was made with Higgsfield (GPT Image 2.6) using the style guide in `../STYLE_GUIDE.md`.
Files are WebP: full resolution, much smaller than PNG. The Higgsfield job ID for every image
is in `../NOTES.md`.

## maps/ — full-map overviews (the base ground for each town)
| File | What | Size |
|---|---|---|
| `capital-personal-map.webp` | Palace (capital, Jung City) on top; Personal town ring below | 3312 × 2480 |
| `mojoco-map.webp` | Mojoco walled town, with the south-wall strip and spaced east side | 3840 × 2160 |

## houses/ — building exteriors (placed on the town ground as pieces)
| File | Who lives/works there |
|---|---|
| `capital-yeonguijeong.webp` | 영의정 (Chief State Councillor), inside the palace |
| `mojoco-satto.webp` | Mojoco 사또 (magistrate), the town government office |
| `mojoco-hyeongbang.webp` | Mojoco 형방 (rules and approvals), beside the jail |
| `mojoco-forge.webp` | Mojoco 대장장이 (coding), the forge |
| `mojoco-seonbi.webp` | Mojoco 선비 (research), the scholar's house |
| `mojoco-munjangga.webp` | Mojoco 문장가 (writing), the writer's hall |
| `mojoco-sagwan.webp` | Mojoco 사관 (work logs), the records house |
| `personal-steward.webp` | Personal town 사또 (steward) |
| `personal-helper.webp` | Personal town household helper |
| `personal-seonbi.webp` | Personal town 선비 (research) |
| `personal-munjangga.webp` | Personal town 문장가 (letter writer) |
| `personal-sagwan.webp` | Personal town 사관 (work logs) |
| `personal-hyeongbang.webp` | Personal town 형방 (rules and approvals) |

## interiors/ — the inside of each building (2048 × 2048)
Rule: a standing person is 1/12 of the image height; thin back wall at the top; one door
centered at the bottom; no people; one desk and seat for the owner.

| File | Room |
|---|---|
| `capital-throne-hall.webp` | Throne hall (근정전): the King's throne; officials stand in rows |
| `capital-kings-office.webp` | King's office (사정전): daily briefings and decisions |
| `capital-library.webp` | Jibokjae library: shared, non-confidential information |
| `capital-yeonguijeong.webp` | 영의정's study |
| `mojoco-satto.webp` | Mojoco magistrate's hall |
| `mojoco-hyeongbang.webp` | Mojoco rules office |
| `mojoco-forge.webp` | Mojoco forge workshop |
| `mojoco-seonbi.webp` | Mojoco scholar's study |
| `mojoco-munjangga.webp` | Mojoco writer's hall |
| `mojoco-sagwan.webp` | Mojoco records room |
| `personal-steward.webp` | Personal steward's office |
| `personal-helper.webp` | Personal household helper's kitchen and planning room |
| `personal-seonbi.webp` | Personal scholar's study |
| `personal-munjangga.webp` | Personal letter writer's room |
| `personal-sagwan.webp` | Personal records room |
| `personal-hyeongbang.webp` | Personal rules office |

## props/ — small placeable props, each on a transparent background
Cut from the two sheets in `props/sheets/`. On the sheets every prop is drawn at a similar
size, so the game scales each prop to its real size when placing it.

**Village life and street:** `stone-lantern`, `paper-lantern-post`, `bench`,
`pyeongsang-platform`, `onggi-jars`, `straw-lidded-jar`, `barrel`, `crate`, `basket`, `well`,
`water-trough`, `hand-cart`, `jige-carrier`, `millstone`, `firewood`, `haystack`,
`jangseung-guardian`, `sotdae-bird-pole`, `drying-peppers`, `laundry-line`

**Nature and garden:** `azalea-bush`, `forsythia-bush`, `boxwood-bush`, `chrysanthemum-bed`,
`balsam-bed`, `peony-bed`, `persimmon-tree`, `plum-tree`, `red-pine`, `bamboo`, `lotus-basin`,
`stone-pagoda`, `garden-rocks`, `brushwood-fence`, `stepping-stones`, `beehive`, `willow`,
`mossy-stone`, `wildflower-grass`, `bonsai`

## characters/ — walking sheets, transparent background
Each sheet is a grid of 3 columns x 4 rows of 400x400 frames. Rows: toward the camera, right, left, away.
Columns: left foot, standing, right foot. Feet sit on y = 390 in every frame. See the character rule in STYLE_GUIDE.md.
- king.webp: the director as the King (the Chief Human Officer). Red dragon robe, ikseongwan crown, glasses.
- kim-mosim.webp: 김모심, the 상선 (chief of staff), K-drama look: green robe, wingless black cap, gold belt.
- kim-mosim-myeongpae.webp: 김모심 walking while holding the red 명패 summons tablet (for when they're calling someone).
- satto-bak-jeongdo.webp: 사또 박정도, Mojoco's director. Deep indigo robe, double-crane 흉배, winged 사모, short beard.

## New world (2026-11-25): assets/new-world/
- Final overview, region and walkable maps for the new seamless world (not wired into the game yet). See the NOTES.md HANDOFF section.
