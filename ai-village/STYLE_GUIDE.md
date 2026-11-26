# My AI Village — Art Style Guide

Paste the paragraph below, word for word, into every art prompt so all art matches.

---

Lush hand-painted 2D game art of an original, cozy Joseon-era Korean village, in the style of a modern indie RPG, drawn in a top-down three-quarter view where you see both the tops and the front faces of objects. Soft, visible brush texture with painterly, detailed foliage and rich layered greens, and no visible pixels, photorealism or 3D rendering. Use a warm, sunny palette of honey yellows, terracotta reds, soft leafy greens and warm earthy browns, with gentle watercolor-like light. Light always comes from the upper left, so highlights sit on the top-left edges and soft shadows fall toward the lower right. Buildings and objects have clean, dark hand-drawn linework (deep brown, not pure black) so every shape reads clearly. Every building's front door has a clear, open path leading to it; nothing — no tree, rock, fence, jar, cart or other object — stands in front of or blocks any door or the path to it. There is no text anywhere: no letters, numbers, writing on signs, logos, watermarks or interface elements.

---

## Characters

For character art (walking sheets, portraits), paste this paragraph word for word instead of the village paragraph.
The village paragraph made the image model paint a village scene instead of the character (one failed final, 2026-11-20).

---

Lush hand-painted 2D game character art for a cozy Joseon-era Korean village RPG, in the style of a modern indie RPG. Soft, visible brush texture, with no visible pixels, photorealism or 3D rendering. Use a warm, sunny palette of honey yellows, terracotta reds, soft leafy greens and warm earthy browns, with gentle watercolor-like light. Light always comes from the upper left, so highlights sit on the top-left edges and soft shadows fall toward the lower right. Characters have clean, dark hand-drawn linework (deep brown, not pure black) so every shape reads clearly. There is no text anywhere: no letters, numbers, writing, logos, watermarks or interface elements.

---

### Rule for every new character (director's rule, 2026-11-20)

- Every character uses the same walking sheet: 4 rows x 3 columns, all frames the same size, on a plain background.
  Row 1 walks toward the camera, row 2 walks right, row 3 walks left, row 4 walks away. In each row: left foot forward, standing, right foot forward.
  Big obvious strides, arms swinging. The same person, outfit and size in all 12 frames.
- Cute toy proportions, painted 2D: a big round head about a third of the height, a chunky body, big hands and boots.
- **After the first character (the King), never make a character from words alone.** Always give Higgsfield an existing
  character sheet as the reference, and ask it to redraw it as a DIFFERENT person in the same style, the same proportions
  and the same grid. Words only describe what changes (face, clothes, hat, props). That way the whole cast matches.
- Dress each character for their role using COURT_DRESS.md.

### Dress rule update (director, 2026-11-26; overrides the rank rule below where they differ)
- **Court officials** (삼정승, 육조 판서, 도승지, 대사헌, 대사간): red 관복 (홍포, since all are 3rd rank or higher) with a 흉배 and a 사모, like the sea of red officials in court dramas. Civil officials have crane badges (a pair of cranes for high rank).
- **House heads (행수)** are nobility (양반): they wear a 갓 (black horsehair hat) with a 도포 (scholar's coat). No 사모.
- **Workers** are commoners: plain commoner clothes (저고리 and 바지 in undyed or muted cloth) and NO hat. Their role shows through props only.

### Rank rule: telling ranks apart (director's rule, 2026-11-20; applies to every sheet, existing and future)
- **Leads** (영의정, 상선, every 사또, every 행수): official dress, a 관복 with a 흉배 (embroidered chest badge) and a 사모 (official hat). A 행수 may wear a simpler version (no 흉배, or a smaller one), since they rank below the 사또.
- **Workers** (육방, scholars, craftsmen, palace household, 사관): plain clerk or commoner dress, with no 흉배 and no 사모. Their role reads through clothing and props: the 선비 with a 갓 and books, the 대장장이 with an apron and hammer, the 화원 with a brush, and so on.
- **Everyone wears a 호패** (wooden ID tag) on their belt, colour-coded by home: one colour for Jung City (the palace), a different colour for each town. Shared specialists keep the Jung City colour even when visiting a town.
- **The 암행어사** stays in plain commoner dress with no visible 호패 until he reveals himself.

## Retired (do not use)

The original 16-bit pixel-art guide, replaced on 2026-11-19 when the director chose a
hand-painted look. Kept here only as a record.

> 16-bit SNES-era pixel art of an original, cozy village, drawn in a top-down three-quarter view where you see both the tops and the front faces of objects. Use a warm, sunny palette of honey yellows, terracotta reds, soft leafy greens and warm earthy browns, with a limited number of colors per object and no gradients, blur or painterly texture. Light always comes from the upper left, so highlights sit on the top-left edges and soft shadows fall toward the lower right. Every shape has crisp, dark one-pixel outlines (deep brown or deep purple, not pure black), chunky readable forms, and clean hard-edged pixels on a consistent grid. There is no text anywhere: no letters, numbers, writing on signs, logos, watermarks or interface elements.
