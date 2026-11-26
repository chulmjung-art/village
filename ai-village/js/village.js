/* My AI Village: town viewer with living effects drawn by code.
   The painted map is the base; props come from towns/*-props.json; animated effects come from
   towns/*-effects.json. Every effect is drawn in map coordinates each frame, so it stays sharp
   at any zoom. Lighting follows the viewer's real clock (with a manual override). */
(() => {
  "use strict";

  const TOWNS = {
    world: { map: "assets/world/world-map.webp", props: "towns/world-props.json", fx: "towns/world-effects.json", houses: "towns/world-houses.json", people: "towns/world-people.json", walk: "towns/world-walk.json", roofs: "towns/world-roofs.json" },
    // edits = where this map's grid paint is saved; a new name for the palace-district map so the old map's paint doesn't land on it
    capital: { edits: "capital-island", map: "assets/maps/capital-island-map.webp", props: "towns/capital-props.json", fx: "towns/capital-effects.json", houses: "towns/capital-houses.json", people: "towns/capital-people.json", walk: "towns/capital-walk.json", roofs: "towns/capital-roofs.json" },
  };

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d");
  const lm = document.createElement("canvas"); // light map for night shading
  const lctx = lm.getContext("2d");
  const loadingEl = document.getElementById("loading");
  const clockEl = document.getElementById("clock");

  let W = 0, H = 0, dpr = 1;
  const cam = { x: 0, y: 0, s: 1, min: 0.1, max: 2.5 };
  let town = null;
  let lightMode = "auto";
  // The director wants the town moving on every device, so the "reduce motion" setting no longer freezes it.
  const reduceMotion = false;

  // ---------- loading ----------
  const imgCache = new Map();
  function loadImg(src) {
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej(new Error("Could not load " + src));
        i.src = src;
      }));
    }
    return imgCache.get(src);
  }
  const getJSON = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
  const rand = (a, b) => a + Math.random() * (b - a);
  // effects keep a minimum on-screen size, so they stay visible when zoomed out
  const vis = () => Math.max(1, 0.75 / cam.s);

  // how much each kind of prop bends in the wind (0 = solid things that never move)
  function swayFor(name) {
    if (/willow/.test(name)) return 0.06;
    if (/tree/.test(name)) return 0.035;
    if (/laundry/.test(name)) return 0.035;
    if (/bush|bed|peppers|haystack/.test(name)) return 0.02;
    if (/bonsai/.test(name)) return 0.008;
    return 0;
  }
  // wind strength over time and across the map: a steady breeze plus slow gusts that roll across town
  function windAt(t, x) {
    const gust = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.21 - x * 0.0009)) ** 3 * 2.2;
    return gust * (0.6 * Math.sin(t * 1.3 + x * 0.003) + 0.4 * Math.sin(t * 2.7 + x * 0.007) + 0.35);
  }

  let arriveAt = null;   // where to put the 임금 when the next town loads (set when leaving a town for the world map)
  async function loadTown(key) {
    loadingEl.hidden = false;
    loadingEl.textContent = "Loading the town…";
    try {
      const t = TOWNS[key];
      const [img, props, fx, houses, kingImg, aideImg] = await Promise.all([loadImg(t.map), getJSON(t.props), getJSON(t.fx), getJSON(t.houses), loadImg(KING_SHEET), loadImg(AIDE_SHEET)]);
      const placed = await Promise.all(props.props.map(async (p) => {
        const im = await loadImg("assets/props/" + p.prop + ".webp");
        return { ...p, img: im, h: p.height, w: (im.width * p.height) / im.height, sway: swayFor(p.prop), ph: rand(0, 6.28) };
      }));
      placed.sort((a, b) => a.y - b.y);

      const lamps = [];
      for (const p of placed) {
        if (p.prop === "paper-lantern-post") lamps.push({ x: p.x - p.w / 2 + p.w * 0.28, y: p.y - p.h * 0.58, r: p.h * 1.5, ph: rand(0, 6) });
        if (p.prop === "stone-lantern") lamps.push({ x: p.x, y: p.y - p.h * 0.52, r: p.h * 1.5, ph: rand(0, 6) });
      }
      for (const l of fx.extra_lights || []) lamps.push({ x: l.x, y: l.y, r: 120, ph: rand(0, 6) });
      for (const w of fx.windows) w.ph = rand(0, 6);

      const water = (fx.water || []).map((z) => makeWater(z));
      // butterflies live around flower beds and flowering bushes
      const flowers = placed.filter((p) => /bed|azalea|forsythia/.test(p.prop));
      const butterflies = flowers.flatMap((p) => Array.from({ length: 2 }, () => ({
        hx: p.x + rand(-p.w * 0.4, p.w * 0.4), hy: p.y - p.h * 0.6, ph: rand(0, 6.28), sp: rand(0.5, 1.1),
        c: ["#fff4c2", "#f7b0c9", "#f5d36b", "#ffffff"][(Math.random() * 4) | 0],
      })));
      const clouds = Array.from({ length: 5 }, () => ({
        x: rand(-img.width * 0.3, img.width), y: rand(0, img.height), r: rand(380, 820), sp: rand(10, 18),
      }));
      town = { key, img, w: img.width, h: img.height, props: placed, fx, lamps, water, butterflies, clouds,
               smoke: (fx.smoke || []).map((s) => ({ ...s, parts: [], acc: 0 })), leaves: [], falls: [], birds: [], birdNext: rand(2, 6),
               people: [], houses: houses.houses, P: houses.player_height, nav: null, roofs: [] };
      town.canopies = (fx.trees || []).map((tr) => makeCanopy(img, tr)).filter(Boolean);
      town.houses = houses.houses; town.P = houses.player_height; town.spawn = houses.spawn;
      // walls and roofs: where people can walk, and the roofs/trees they walk behind
      try {
        const [walk, roofs] = await Promise.all([getJSON(t.walk), getJSON(t.roofs)]);
        town.nav = makeNav(walk, placed);
        buildRoofs(await loadImg(roofs.image));
        loadEdits().catch((e) => console.warn(e));   // saved grid edits are laid on top as soon as they arrive
      } catch (e) { console.warn("No walk map for", key, e); town.nav = null; town.roofs = []; }
      town.people = [];
      if (t.people) loadPeople(t.people).then((ppl) => { if (town && town.key === key) { town.people = ppl; placeHires(); } });
      inside = null;
      { const at = arriveAt && arriveAt.town === key ? arriveAt : houses.spawn; arriveAt = null;
        const sp = nearestFree(at.x, at.y); placePlayer(kingImg, sp.x, sp.y, 0); }
      aide.img = aideImg; placeAide();
      fitCamera();
      cam.s = Math.min(cam.max, Math.max(cam.min, key === "world" ? 1.7 : 1.1)); follow = true; centerOnPlayer(1);
      loadingEl.hidden = true;
    } catch (e) {
      loadingEl.textContent = "This town didn't load. Check your connection and reload the page.";
      console.error(e);
    }
  }

  // ---------- camera ----------
  const world = () => (inside ? inside : town);
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    lm.width = canvas.width; lm.height = canvas.height;
    if (town) { const w = world(); cam.min = Math.min(W / w.w, H / w.h); cam.s = Math.max(cam.s, cam.min); clampCam(); }
  }
  function fitCamera() {
    const w = world();
    cam.min = Math.min(W / w.w, H / w.h);
    cam.s = cam.min;
    cam.x = 0; cam.y = 0; clampCam();
  }
  function clampCam() {
    const w = world(), vw = W / cam.s, vh = H / cam.s;
    cam.x = vw >= w.w ? (w.w - vw) / 2 : Math.min(Math.max(cam.x, 0), w.w - vw);
    cam.y = vh >= w.h ? (w.h - vh) / 2 : Math.min(Math.max(cam.y, 0), w.h - vh);
  }
  function zoomAt(sx, sy, factor) {
    const wx = cam.x + sx / cam.s, wy = cam.y + sy / cam.s;
    cam.s = Math.min(cam.max, Math.max(cam.min, cam.s * factor));
    cam.x = wx - sx / cam.s; cam.y = wy - sy / cam.s;
    clampCam();
  }

  // ---------- input: drag to pan, wheel or pinch to zoom ----------
  const pointers = new Map();
  let pinchDist = 0;
  const toWorld = (e) => { const r = canvas.getBoundingClientRect(); return { x: cam.x + (e.clientX - r.left) / cam.s, y: cam.y + (e.clientY - r.top) / cam.s }; };
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    if (editor.on && !inside && town && e.button === 0 && pointers.size === 0 && !keys.has("pan")) {
      const w = toWorld(e), G = editor.size, gx = Math.floor(w.x / G), gy = Math.floor(w.y / G);
      if (editor.shape === "outline") { editor.stroke = { id: e.pointerId, t: editor.tool, g: G, cells: new Set(), pts: [[w.x, w.y]], outline: true }; return; }
      editor.stroke = { id: e.pointerId, t: editor.tool, g: G, cells: new Set([gx + "," + gy]) };
      paintSquare(editor.tool, gx, gy, G); return;
    }
    if (town && pointers.size === 0 && hitPlayer(toWorld(e))) {
      const w = toWorld(e);
      grab = { id: e.pointerId, dx: player.x - w.x, dy: player.y - w.y };
      canvas.style.cursor = "grabbing";
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  canvas.addEventListener("pointermove", (e) => {
    if (editor.on && town) editor.hover = toWorld(e);
    if (editor.stroke && editor.stroke.outline && e.pointerId === editor.stroke.id) {   // drawing an outline: just record it
      const w = toWorld(e), st = editor.stroke, last = st.pts[st.pts.length - 1];
      if (Math.hypot(w.x - last[0], w.y - last[1]) > Math.max(2, st.g / 4)) st.pts.push([w.x, w.y]);
      return;
    }
    if (editor.stroke && e.pointerId === editor.stroke.id) {
      const w = toWorld(e), st = editor.stroke, key = Math.floor(w.x / st.g) + "," + Math.floor(w.y / st.g);
      if (!st.cells.has(key)) { st.cells.add(key); paintSquare(st.t, Math.floor(w.x / st.g), Math.floor(w.y / st.g), st.g); }
      return;
    }
    if (grab && e.pointerId === grab.id) {
      const w = toWorld(e), ww = world();
      player.x = Math.min(Math.max(w.x + grab.dx, 10), ww.w - 10);
      player.y = Math.min(Math.max(w.y + grab.dy, player.h * 0.6), ww.h - 4);
      if (inside) player.h = roomHeightAt(player.y);
      player.armed = false; // dropping on a doorway doesn't send you in; walk into it instead
      return;
    }
    if (!town) return;
    if (!pointers.has(e.pointerId)) { canvas.style.cursor = hitPlayer(toWorld(e)) ? "grab" : ""; return; }
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      follow = false; // looking around; the camera picks you up again when you walk
      cam.x -= (e.clientX - prev.x) / cam.s; cam.y -= (e.clientY - prev.y) / cam.s; clampCam();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = canvas.getBoundingClientRect();
      if (pinchDist) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinchDist);
      pinchDist = d;
    }
  });
  const endPointer = (e) => {
    if (editor.stroke && e.pointerId === editor.stroke.id) {
      if (editor.stroke.outline) fillOutline(editor.stroke);
      if (editor.stroke.cells.size) saveStroke(editor.stroke);
      editor.stroke = null; return;
    }
    if (grab && e.pointerId === grab.id) {
      grab = null; canvas.style.cursor = editor.on ? "crosshair" : "";
      if (!inside && town && town.nav && !footFree(player.x, player.y, player.h * 0.14)) { const p0 = nearestFree(player.x, player.y); player.x = p0.x; player.y = p0.y; }
      return;
    }
    pointers.delete(e.pointerId); if (pointers.size < 2) pinchDist = 0;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (e) => {
    if (!town) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  document.getElementById("zoom-in").addEventListener("click", () => town && zoomAt(W / 2, H / 2, 1.4));
  document.getElementById("zoom-out").addEventListener("click", () => town && zoomAt(W / 2, H / 2, 1 / 1.4));

  // ---------- the King: walk with arrow keys or WASD, Shift to run, drag to drop anywhere ----------
  // Sheet: 3 columns (left foot, standing, right foot) x 4 rows (toward, right, left, away), 400 px frames,
  // every figure scaled to the same height with feet on y = 390, so the King stays one size facing any way.
  const KING_SHEET = "assets/characters/king.webp";
  const FRAME = 400, FEET = 390, FIG = 373; // frame size, feet line, figure height inside a frame
  const ROOM = 2048;                          // interiors are 2048 x 2048
  const ROOM_H = ROOM / 4.5;                  // the King's height inside at the doorway, matched to the furniture in the room art
  const ROOM_TOP = ROOM * 0.33;               // the back wall stops you here
  const ROOM_FAR = 0.74;                      // further into the room you look smaller: 74% of full size at the back wall
  const roomTop = () => ((inside && inside.house.room_top) || 0.33) * ROOM; // where the back of the floor ends, per room
  // the King's height at a given depth in the room (y), shrinking toward the back wall
  const roomHeightAt = (y) => {
    const top = roomTop();
    const k = Math.min(1, Math.max(0, (y - top) / (ROOM - top)));
    return ((inside && inside.house.room_scale) || 1) * ROOM_H * (ROOM_FAR + (1 - ROOM_FAR) * k);
  };
  const ROW = { down: 0, right: 1, left: 2, up: 3 };
  const STEP = [0, 1, 2, 1];                  // walk cycle through the columns
  const player = { img: null, x: 0, y: 0, h: 66, dir: "down", phase: 0, moving: false, armed: true };
  let inside = null;   // { house, img, w, h } while inside a house
  let follow = true;   // camera follows the King
  let grab = null;     // pointer currently holding the King
  let fade = 0, fadeTo = null; // short fade when going in or out of a house
  const keys = new Set();

  // 김모심, the 상선 (chief of staff): follows the King everywhere, a step behind
  const AIDE_SHEET = "assets/characters/kim-mosim.webp";
  const aide = { img: null, x: 0, y: 0, h: 66, dir: "down", phase: 0, moving: false, label: "상선 김모심", home: "hanyang" };
  const BEHIND = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }; // where "behind" is for each facing
  function placeAide() {
    const b = BEHIND[player.dir];
    aide.h = player.h * 0.97;
    aide.x = player.x + b[0] * player.h * 0.75 + (b[0] ? 0 : player.h * 0.45);
    aide.y = player.y + b[1] * player.h * 0.35 + (b[1] ? 0 : 2);
    aide.y = Math.min(aide.y, world().h - 4);
    aide.dir = player.dir; aide.phase = 0; aide.moving = false; aide.walking = false; aide.lx = undefined;
  }
  // ---------- the ground: where people can walk (painted by the director) ----------
  function makeNav(data, props) {
    const C = data.cell, gw = data.w, gh = data.h, g = new Uint8Array(gw * gh);
    data.rows.forEach((row, y) => { for (let x = 0; x < gw; x++) g[y * gw + x] = row.charCodeAt(x) === 49 ? 1 : 0; });
    // props no longer block on their own: the director decides with the grid editor
    for (const p of (data.propsBlock ? props : [])) {
      const rx = /tree|willow/.test(p.prop) ? p.w * 0.12 : p.w * 0.36, ry = Math.max(C, p.h * 0.1);
      for (let y = Math.floor((p.y - ry * 1.6) / C); y <= Math.floor(p.y / C); y++)
        for (let x = Math.floor((p.x - rx) / C); x <= Math.floor((p.x + rx) / C); x++)
          if (x >= 0 && y >= 0 && x < gw && y < gh) g[y * gw + x] = 0;
    }
    // the walk grid is kept in 4 px squares (so the editor can paint tiny squares); routes are planned on an 8 px copy
    const k = Math.max(1, Math.round(C / 4)), fw = gw * k, fh = gh * k, fg = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) fg[y * fw + x] = g[((y / k) | 0) * gw + ((x / k) | 0)];
    const n = { C: C / k, gw: fw, gh: fh, g: fg, k, safe: null, coarse: null, navDirty: true };
    rebuildNav(n);
    return n;
  }
  // a slightly narrower copy (a step away from walls) and the coarse route grid, rebuilt after edits
  function rebuildNav(n) {
    const { gw, gh, g, k } = n;
    let safe = new Uint8Array(g);
    for (let it = 0; it < k; it++) {
      const prev = safe.slice();
      for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
        const i = y * gw + x;
        if (prev[i] && !(prev[i - 1] && prev[i + 1] && prev[i - gw] && prev[i + gw])) safe[i] = 0;
      }
    }
    n.safe = safe;
    const cw = Math.ceil(gw / k), ch = Math.ceil(gh / k), cg = new Uint8Array(cw * ch), cs = new Uint8Array(cw * ch);
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      let any = 0, all = 1;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const x = cx * k + dx, y = cy * k + dy; if (x >= gw || y >= gh) continue;
        const i = y * gw + x; if (g[i]) any = 1; if (!safe[i]) all = 0;
      }
      cg[cy * cw + cx] = any; cs[cy * cw + cx] = any && all ? 1 : 0;
    }
    n.coarse = { C: n.C * k, gw: cw, gh: ch, g: cg, safe: cs };
    n.navDirty = false;
  }
  const navAt = (x, y, grid, N) => {
    const n = N || (town && town.nav); if (!n) return true;
    const cx = Math.floor(x / n.C), cy = Math.floor(y / n.C);
    return cx >= 0 && cy >= 0 && cx < n.gw && cy < n.gh && (grid || n.g)[cy * n.gw + cx] === 1;
  };
  const footFree = (x, y, r) => navAt(x, y) && navAt(x - r, y) && navAt(x + r, y) && navAt(x, y - r * 0.6);
  function nearestFree(x, y, grid, N) {
    const n = N || town.nav; if (!n) return { x, y };
    if (!N && n.navDirty) rebuildNav(n);
    const G = grid || n.g, cx0 = Math.floor(x / n.C), cy0 = Math.floor(y / n.C), maxR = Math.ceil(480 / n.C);
    for (let r = 0; r < maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const cx = cx0 + dx, cy = cy0 + dy;
      if (cx >= 0 && cy >= 0 && cx < n.gw && cy < n.gh && G[cy * n.gw + cx]) return { x: (cx + 0.5) * n.C, y: (cy + 0.5) * n.C };
    }
    return { x, y };
  }
  function lineFree(x0, y0, x1, y1, grid, N) {
    const n = N || town.nav, d = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(d / (n.C * 0.5));
    for (let i = 1; i <= steps; i++) { const k = i / steps; if (!navAt(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, grid, n)) return false; }
    return true;
  }
  // A* over the walk grid, then straightened, so routes follow the paths around walls and buildings
  function findPath(sx, sy, tx, ty, raw) {
    const nav = town.nav; if (!nav) return [{ x: tx, y: ty }];
    if (nav.navDirty) rebuildNav(nav);
    const n = nav.coarse || nav;                       // routes are planned on the coarse copy
    const G = raw ? n.g : n.safe, W = n.gw, H = n.gh;
    const s0 = nearestFree(sx, sy, G, n), t0 = nearestFree(tx, ty, G, n);
    const s = Math.floor(s0.y / n.C) * W + Math.floor(s0.x / n.C), t = Math.floor(t0.y / n.C) * W + Math.floor(t0.x / n.C);
    const gs = new Float32Array(W * H).fill(Infinity), came = new Int32Array(W * H).fill(-1), shut = new Uint8Array(W * H);
    const heap = [], hf = []; const tx0 = t % W, ty0 = (t / W) | 0;
    const push = (i, f) => { heap.push(i); hf.push(f); let k = heap.length - 1;
      while (k > 0) { const pk = (k - 1) >> 1; if (hf[pk] <= hf[k]) break; [heap[pk], heap[k]] = [heap[k], heap[pk]]; [hf[pk], hf[k]] = [hf[k], hf[pk]]; k = pk; } };
    const pop = () => { const top = heap[0]; const li = heap.pop(), lf = hf.pop();
      if (heap.length) { heap[0] = li; hf[0] = lf; let k = 0;
        for (;;) { const a = 2 * k + 1, b = a + 1; let m = k;
          if (a < heap.length && hf[a] < hf[m]) m = a; if (b < heap.length && hf[b] < hf[m]) m = b;
          if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; [hf[m], hf[k]] = [hf[k], hf[m]]; k = m; } }
      return top; };
    const hcost = (i) => { const dx = Math.abs(i % W - tx0), dy = Math.abs(((i / W) | 0) - ty0); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    gs[s] = 0; push(s, hcost(s)); let found = false, guard = 0;
    while (heap.length && guard++ < 90000) {
      const i = pop(); if (shut[i]) continue; shut[i] = 1; if (i === t) { found = true; break; }
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx;
        if (!G[j] || shut[j]) continue;
        if (dx && dy && (!G[y * W + nx] || !G[ny * W + x])) continue; // no cutting corners
        const ng = gs[i] + (dx && dy ? 1.414 : 1);
        if (ng < gs[j]) { gs[j] = ng; came[j] = i; push(j, ng + hcost(j)); }
      }
    }
    if (!found) return raw ? null : findPath(sx, sy, tx, ty, true);   // narrow paths: try again hugging the edges
    const pts = []; for (let i = t; i !== -1; i = came[i]) pts.push({ x: (i % W + 0.5) * n.C, y: (((i / W) | 0) + 0.5) * n.C });
    pts.reverse();
    const out = []; let a = { x: sx, y: sy };
    for (let k = 1; k < pts.length; k++) if (!lineFree(a.x, a.y, pts[k].x, pts[k].y, G, n)) { out.push(pts[k - 1]); a = pts[k - 1]; }
    out.push(footFree(tx, ty, 2) ? { x: tx, y: ty } : t0);
    return out;
  }

  // ---------- residents: everyone who lives or works in a building ----------
  // Rules (the director's): working -> walk home, go in, sit at your desk. Not working -> hang out in your yard,
  // stroll, visit people. When the King comes near, stop and look at him. Workers roam the whole town; meeting
  // someone they haven't talked to today, both stop, ask what the other is working on, and take notes.
  // Everyone keeps to the paths, walks around each other, never through walls, never teleports, never stands on
  // furniture, fences or each other.
  const working = new Set();              // agent ids currently working (set by the agents once they run)
  const LEADS = /^(사또|영의정|상선|행수)$/;
  const today = () => new Date().toLocaleDateString("sv");
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
                  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const ROOM_DOOR = { x: ROOM / 2, y: ROOM - 60 };
  const roomH = (y) => ROOM_H * (ROOM_FAR + (1 - ROOM_FAR) * Math.min(1, Math.max(0, (y - ROOM * 0.33) / (ROOM * 0.67))));

  async function loadPeople(url) {
    const data = await getJSON(url);
    const seatsUsed = town.seatsUsed = {};
    town.townName = data.town;
    const list = await Promise.all(data.people.map((d) => makeResident(d, data.town, seatsUsed)));
    return list.filter(Boolean);
  }
  async function makeResident(d, townName, seatsUsed) {
      let img;
      try { img = await loadImg(d.sheet); } catch (e) { console.warn("No sheet yet for", d.title, d.name); return null; }
      const kneelSrc = d.kneel || "assets/characters/kneel/" + d.sheet.split("/").pop();
      const kneelImg = await loadImg(kneelSrc).catch(() => null);
      const house = d.house && town.houses.find((h) => h.id === d.house);
      let yard;
      if (d.roam) yard = d.roam;
      else {
        const P = town.P, door = house.door, base = door.stairs_bottom || door.y;
        yard = [[-1.3, 0.7], [1.3, 0.8], [0, 1.2], [-0.7, 1.5], [0.8, 1.4]].map(([a, b]) => nearestFree(door.x + a * P, base + b * P, town.nav && town.nav.safe));
      }
      let seat = null;
      if (house && house.seats) { const k = seatsUsed[house.id] = (seatsUsed[house.id] || 0); seat = house.seats[k % house.seats.length]; seatsUsed[house.id]++; }
      const st = yard[(Math.random() * yard.length) | 0];
      return { ...d, img, kneelImg, houseObj: house, seat, yard, x: st.x, y: st.y, h: town.P * 1.02, dir: "down", phase: 0, moving: false,
               space: "out", mode: "idle", plan: null, path: null, wait: rand(1, 5), seated: false,
               worker: !LEADS.test(d.title) && !d.disguise, talkT: 0, noteT: 0, blockT: 0,
               label: d.disguise || d.title + " " + d.name, // the 암행어사 shows only a disguise until he flags something
               home: d.disguise ? null : (d.home || townName), ghost: !!d.ghost };
  }
  const sameSpace = (a, b) => (a.space || "out") === (b.space || "out") && (a.space !== "in" || (a.visitHouse || a.house) === (b.visitHouse || b.house));
  const playerSpace = () => (inside ? { space: "in", house: inside.house.id } : { space: "out" });
  function others(a) {
    const ps = playerSpace(), list = [];
    if (sameSpace(a, ps)) list.push(player);
    if (sameSpace(a, ps) && aide.img) list.push(aide);
    for (const r of town.people) if (r !== a && !r.inMeeting && !r.hidden && sameSpace(a, r)) list.push(r);
    return list;
  }
  // walk one step toward the next waypoint, around other people; true when the plan's goal is reached
  function stepAlong(a, dt, speed) {
    if (!a.path || !a.path.length) return true;
    const wp = a.path[0], dx = wp.x - a.x, dy = wp.y - a.y, d = Math.hypot(dx, dy);
    if (d < 4) { a.path.shift(); return !a.path.length; }
    const st = Math.min(d, speed * dt); let ux = dx / d, uy = dy / d;
    const P = a.h, near = others(a);
    const clear = (vx, vy) => {
      const nx = a.x + vx * st, ny = a.y + vy * st;
      if (a.space !== "in" && !footFree(nx, ny, P * 0.12)) return false;
      for (const o of near) { const od = Math.hypot(o.x - nx, o.y - ny); if (od < P * 0.45 && od < Math.hypot(o.x - a.x, o.y - a.y)) return false; }
      return true;
    };
    let moved = false;
    for (const ang of [0, 0.6, -0.6, 1.2, -1.2]) {          // straight on, or step around whoever is in the way
      const c = Math.cos(ang), s2 = Math.sin(ang), vx = ux * c - uy * s2, vy = ux * s2 + uy * c;
      if (clear(vx, vy)) { a.x += vx * st; a.y += vy * st; ux = vx; uy = vy; moved = true; break; }
    }
    if (!moved) {
      const last = a.path[a.path.length - 1];
      if (a.path.length === 1 && Math.hypot(last.x - a.x, last.y - a.y) < a.h * 0.8 && a.plan && !a.plan.then && a.plan.kind !== "seat" && a.plan.kind !== "leave") {
        a.path = []; a.moving = false; return true;      // someone is already standing there: stop close by instead
      }
      a.blockT += dt; a.moving = false; a.phase = 0;
      if (a.blockT > 1.6) { a.blockT = 0; if (a.plan && a.space !== "in") a.path = findPath(a.x, a.y, a.plan.x, a.plan.y) || []; }
      return false; }
    a.blockT = 0; a.moving = true;
    a.dir = Math.abs(ux) > Math.abs(uy) ? (ux > 0 ? "right" : "left") : (uy > 0 ? "down" : "up");
    return false;
  }
  function goTo(r, x, y, kind, then) {
    r.plan = { x, y, kind, then }; r.seated = false;
    r.path = r.space === "in" ? [{ x, y }] : (findPath(r.x, r.y, x, y) || []);
  }
  function roomRoute(r, toSeat) {   // inside: the door, the room's waypoints, the seat (or the reverse)
    const pts = [...((r.houseObj && r.houseObj.route) || []).map(([x, y]) => ({ x, y })), r.seat ? { x: r.seat[0], y: r.seat[1] } : { x: ROOM / 2, y: ROOM * 0.6 }];
    if (!toSeat) { pts.reverse(); pts.shift(); pts.push({ ...ROOM_DOOR }); }
    return pts;
  }
  function chooseIdle(r) {
    const roll = Math.random(), P = town.P;
    if (r.roam || (r.worker && roll < 0.3)) {          // workers wander the whole town
      for (let k = 0; k < 20; k++) {
        const x = rand(P, town.w - P), y = rand(P, town.h - P);
        if (navAt(x, y, town.nav && town.nav.safe)) return goTo(r, x, y, "stroll");
      }
    }
    if (roll < (r.worker ? 0.55 : 0.35)) {               // visit someone's yard
      const hosts = town.people.filter((o) => o !== r && o.yard && !o.roam);
      if (hosts.length) { const h = hosts[(Math.random() * hosts.length) | 0]; const sp = h.yard[(Math.random() * h.yard.length) | 0]; return goTo(r, sp.x + rand(-20, 20), sp.y + rand(-10, 10), "visit"); }
    }
    const sp = r.yard[(Math.random() * r.yard.length) | 0];   // hang out in your own yard
    goTo(r, sp.x + rand(-15, 15), sp.y + rand(-10, 10), "yard");
  }
  function updateResident(r, dt) {
    if (court.active && !r.inMeeting && court.people.some((c) => c.id === r.id)) r.inMeeting = true;
    if (r.inMeeting) { r.visible = false; return; }
    if (r.emergeT > 0) { r.emergeT -= dt; r.visible = false; r.hidden = true; return; }   // still walking out of the throne hall
    r.hidden = false;
    const house = r.houseObj, ps = playerSpace();
    const here = sameSpace(r, ps);
    r.h = r.space === "in" ? (here && inside ? roomHeightAt(r.y) : roomH(r.y)) : town.P * 1.02;   // indoors: the same size as the 임금 at that depth
    // bowing: everyone near the 임금 bows (eased in and out); the pose is drawn in drawSprite
    const nearK = here && !r.seated && !r.candidate && Math.hypot(player.x - r.x, (player.y - r.y) * 1.3) < player.h * 2.1 && !(player.seated && court.active);
    r.bow = (r.bow || 0) + ((nearK && !r.dodge ? 1 : 0) - (r.bow || 0)) * Math.min(1, dt * 5);
    r.visible = here && !(r.candidate && court.active);
    if (r.candidate) {        // waiting in the town hall for the 임금's interview
      const dx = player.x - r.x, dy = player.y - r.y;
      if (here && Math.hypot(dx, dy) < player.h * 3) r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      r.moving = false; return;
    }
    if (r.talkT > 0) { r.talkT -= dt; r.moving = false; r.phase = 0; if (r.talkT <= 0) r.noteT = 2.2; return; }
    if (r.noteT > 0) r.noteT -= dt;
    if (r.summoned) { summonStep(r, dt); return; }
    if (r.visitor) { visitorLeave(r, dt); return; }
    if (r.visitHouse && r.space === "in") {           // was visiting someone else's house: walk out of it first
      if (!r.plan || r.plan.kind !== "outvisit") { r.plan = { kind: "outvisit", x: ROOM_DOOR.x, y: ROOM_DOOR.y }; r.path = [{ ...ROOM_DOOR }]; }
      if (stepAlong(r, dt, r.h * 1.9)) exitHouse(r);
      return;
    }
    const wantWork = (working.has(r.id) || isNightNow()) && !!house;   // at night everyone goes home
    // about to be walked into: step aside out of the 임금's path (then bow)
    if (here && !r.seated) {
      if (r.dodge) {
        const dx = r.dodge.x - r.x, dy = r.dodge.y - r.y, d = Math.hypot(dx, dy);
        r.dodgeT -= dt;
        if (d < 2 || r.dodgeT <= 0) r.dodge = null;
        else {
          const st = Math.min(d, r.h * 3.2 * dt), nx = r.x + dx / d * st, ny = r.y + dy / d * st;
          if (r.space === "in" || footFree(nx, ny, r.h * 0.12)) { r.x = nx; r.y = ny; } else r.dodge = null;
          r.moving = true; return;
        }
      } else if (player.moving) {
        const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.dir] || [0, 0];
        const rx = r.x - player.x, ry = r.y - player.y, along = rx * v[0] + ry * v[1], lat = rx * -v[1] + ry * v[0];
        if (along > 0 && along < player.h * 1.7 && Math.abs(lat) < player.h * 0.55) {
          const side = lat >= 0 ? 1 : -1, push = player.h * 0.95 - Math.abs(lat);
          let tx = r.x + -v[1] * side * push, ty = r.y + v[0] * side * push;
          if (r.space !== "in" && !footFree(tx, ty, r.h * 0.12)) { tx = r.x + v[1] * side * (player.h * 0.95 + Math.abs(lat)); ty = r.y - v[0] * side * (player.h * 0.95 + Math.abs(lat)); }
          if (r.space === "in" || footFree(tx, ty, r.h * 0.12)) { r.dodge = { x: tx, y: ty }; r.dodgeT = 0.8; r.plan = null; r.path = null; return; }
        }
      }
    }
    // stop and look at the King when he comes near (not while seated at work), and bow
    if (here && !r.seated && Math.hypot(player.x - r.x, player.y - r.y) < player.h * (r.space === "in" ? 1.6 : 2.0)) {
      const dx = player.x - r.x, dy = player.y - r.y;
      r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      r.moving = false; r.phase = 0; return;
    }
    // villagers who bump into someone they work with stop and talk, but only when there's a real reason
    // (they work together, or an order touches them). The words come from the free model on the director's Mac.
    if (r.space === "out" && !r.seated && !r.disguise && !r.visitor && villagerTalk.ready()) {
      const key = "village.talks." + today(), talked = store.get(key, {});
      for (const o of town.people) {
        if (o === r || o.disguise || o.visitor || o.summoned || o.space !== "out" || o.inMeeting || o.hidden || o.talkT > 0 || o.seated) continue;
        if (Math.hypot(o.x - r.x, o.y - r.y) > town.P * 0.9) continue;
        const pair = [r.id, o.id].sort().join("|"); if (talked[pair]) continue;
        talked[pair] = 1; store.set(key, talked);
        if (!villagerTalk.start(r, o)) continue;              // nothing real to talk about: they just pass by
        r.talkT = o.talkT = 6;
        r.dir = o.x > r.x ? "right" : "left"; o.dir = r.x > o.x ? "right" : "left"; r.moving = o.moving = false;
        return;
      }
    }
    // go to work: walk home, through the door, to the desk
    if (wantWork && r.mode !== "work") {
      r.mode = "work";
      if (r.space === "out") goTo(r, house.door.x, house.door.y, "enter", () => { r.space = "in"; r.x = ROOM_DOOR.x; r.y = ROOM_DOOR.y; r.dir = "up"; r.plan = { kind: "seat" }; r.path = roomRoute(r, true); });
      else { r.plan = { kind: "seat" }; r.path = roomRoute(r, true); }
    }
    // stop working: get up, walk out through the door
    if (!wantWork && r.mode === "work") {
      r.mode = "idle"; r.seated = false;
      if (r.space === "in") { r.plan = { kind: "leave" }; r.path = roomRoute(r, false); }
    }
    if (r.seated) { r.moving = false; return; }
    if (r.plan) {
      const done = stepAlong(r, dt, r.h * 1.7);
      if (done) {
        const pl = r.plan; r.plan = null; r.moving = false; r.phase = 0;
        if (pl.then) pl.then();
        else if (pl.kind === "seat") { r.seated = true; }
        else if (pl.kind === "leave") { r.space = "out"; const b = house.door.stairs_bottom || house.door.y; const p0 = nearestFree(house.door.x, b + town.P * 0.4); r.x = p0.x; r.y = p0.y; r.dir = "down"; r.wait = rand(0.5, 2); }
        else r.wait = rand(4, 12);
      }
      return;
    }
    r.moving = false; r.phase = 0;
    if (r.mode === "idle" && r.space === "in") { r.plan = { kind: "leave" }; r.path = roomRoute(r, false); return; }
    r.wait -= dt;
    if (r.wait <= 0 && r.mode === "idle") chooseIdle(r);
  }
  // ---------- called over: someone stops what they're doing and walks to the 임금 ----------
  function houseOfR(r) { return r.visitHouse ? town.houses.find((h) => h.id === r.visitHouse) : r.houseObj; }
  function exitHouse(r) {     // step out of whatever house they're in, onto its doorstep
    const h = houseOfR(r); r.space = "out"; r.visitHouse = null; r.plan = null; r.path = null; r.seated = false;
    if (h) { const b = h.door.stairs_bottom || h.door.y; const p0 = nearestFree(h.door.x, b + town.P * 0.4); r.x = p0.x; r.y = p0.y; }
    r.dir = "down"; r.wait = rand(0.5, 2);
  }
  function summonStep(r, dt) {
    const ps = playerSpace();
    r.seated = false; r.mode = "idle"; working.delete(r.id);
    if (r.space === "in" && !sameSpace(r, ps)) {               // inside another building: come out first
      if (!r.plan || r.plan.kind !== "sumout") { r.plan = { kind: "sumout", x: ROOM_DOOR.x, y: ROOM_DOOR.y }; r.path = [{ ...ROOM_DOOR }]; }
      if (stepAlong(r, dt, r.h * 2)) exitHouse(r);
      return;
    }
    if (r.space === "out" && inside) {                          // the 임금 is indoors: go to that door and step in
      const h = inside.house;
      if (!r.plan || r.plan.kind !== "sumdoor" || r.plan.house !== h.id) { r.plan = { kind: "sumdoor", house: h.id, x: h.door.x, y: h.door.y }; r.path = findPath(r.x, r.y, h.door.x, h.door.y) || [{ x: h.door.x, y: h.door.y }]; }
      if (stepAlong(r, dt, r.h * 2)) { r.space = "in"; r.visitHouse = h.id === r.house ? null : h.id; r.x = ROOM_DOOR.x; r.y = ROOM_DOOR.y; r.dir = "up"; r.plan = null; r.path = null; }
      return;
    }
    if (!sameSpace(r, ps)) return;
    const d = Math.hypot(player.x - r.x, (player.y - r.y) * 1.3);
    if (d < player.h * (r.arrived ? 2.6 : 1.05)) {               // here: face the 임금 and wait
      const dx = player.x - r.x, dy = player.y - r.y;
      r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      r.plan = null; r.path = null; r.moving = false; r.phase = 0;
      if (!r.arrived) { r.arrived = true; if (r.onArrive) { const f = r.onArrive; r.onArrive = null; f(); } }
      return;
    }
    r.arrived = false;
    const side = r.x < player.x ? -1 : 1, tx = player.x + side * player.h * 0.75, ty = player.y + 3;
    r.sumT = (r.sumT || 0) - dt;
    if (r.sumT <= 0 || !r.path || !r.path.length) {
      r.plan = { kind: "sumgo", x: tx, y: ty };
      r.path = r.space === "in" ? [{ x: tx, y: Math.max(ty, roomTop() + 10) }] : (findPath(r.x, r.y, tx, ty) || [{ x: tx, y: ty }]);
      r.sumT = 0.8;
    }
    stepAlong(r, dt, r.h * 2.2);
  }
  function visitorLeave(r, dt) {   // a visitor from another town walks back out the way they came, then is gone
    if (r.space === "in") { if (!r.plan || r.plan.kind !== "outvisit") { r.plan = { kind: "outvisit", x: ROOM_DOOR.x, y: ROOM_DOOR.y }; r.path = [{ ...ROOM_DOOR }]; } if (stepAlong(r, dt, r.h * 1.9)) exitHouse(r); return; }
    const sp = town.spawn || { x: r.x, y: r.y };
    if (!r.plan || r.plan.kind !== "gohome") { r.plan = { kind: "gohome", x: sp.x, y: sp.y }; r.path = findPath(r.x, r.y, sp.x, sp.y) || [{ x: sp.x, y: sp.y }]; }
    if (stepAlong(r, dt, r.h * 1.9) || Math.hypot(r.x - sp.x, r.y - sp.y) < town.P * 0.5) town.people = town.people.filter((o) => o !== r);
  }
  // someone from another town comes in by the town's entrance
  async function makeVisitor(id) {
    const p = await profileOf(id); if (!p || !p.sheet) return null;
    const img = await loadImg(p.sheet).catch(() => null); if (!img) return null;
    const kneelImg = await loadImg("assets/characters/kneel/" + p.sheet.split("/").pop()).catch(() => null);
    const sp = nearestFree((town.spawn || player).x, (town.spawn || player).y);
    const r = { id, title: p.title, name: p.name, img, kneelImg, houseObj: null, house: null, seat: null, yard: [sp], x: sp.x, y: sp.y, h: town.P * 1.02,
      dir: "down", phase: 0, moving: false, space: "out", mode: "idle", plan: null, path: null, wait: 1, seated: false, worker: false,
      talkT: 0, noteT: 0, blockT: 0, label: p.display, home: p.townId === "mojoco" ? "mojoco" : "hanyang", visitor: true };
    town.people.push(r); return r;
  }
  const residentOf = (id) => town && town.people.find((r) => (PROFILE_ALIAS[r.id] || r.id) === id);
  // call someone over; resolves to a short status line
  async function summon(id, onArrive) {
    if (!town) return "There's no town loaded.";
    if (id === "sangseon-kim-mosim") return "상선 김모심 is already at your side.";
    if (court.active) return "Not during a court meeting.";
    let r = residentOf(id);
    if (!r) r = await makeVisitor(id);
    if (!r) return "They can't come right now.";
    r.summoned = true; r.arrived = false; r.sumT = 0; r.talkT = 0; r.plan = null; r.path = null; r.onArrive = onArrive || null;
    return null;
  }
  function sendBackToWork(id) {
    const r = residentOf(id); if (!r) return null;
    r.summoned = false; r.arrived = false; r.onArrive = null; r.plan = null; r.path = null; r.mode = "idle";
    if (r.visitor) return r.label + " heads back home.";
    if (!r.houseObj) { r.wait = 0; return r.label + " goes back to what they were doing."; }
    setWorking(r.id, true);
    return r.label + " goes back inside to work.";
  }

  function drawBubble(a) {
    // talking: a little speech bubble; afterwards a note being written
    if (!(a.talkT > 0 || a.noteT > 0) || !a.visible) return;
    const s = 1 / cam.s, x = a.x + a.h * 0.22, y = a.y - a.h * 1.12;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (a.talkT > 0) {
      ctx.fillStyle = "#fffaf0"; ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-14, -22, 30, 18, 7) : ctx.rect(-14, -22, 30, 18); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(-8, 4); ctx.lineTo(2, -4); ctx.fill();
      ctx.fillStyle = "#5a3a22"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-6 + i * 7, -13, 2, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = "#f6ecd2"; ctx.strokeStyle = "#5a3a22"; ctx.lineWidth = 1.2;
      ctx.fillRect(-8, -24, 16, 20); ctx.strokeRect(-8, -24, 16, 20);
      ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(-5, -19 + i * 5); ctx.lineTo(5, -19 + i * 5); } ctx.stroke();
    }
    ctx.restore();
  }
  function drawSeated(r) {   // at the desk: kneeling on the cushion
    const img = r.kneelImg; if (!img) return drawSprite(r);
    const kh = r.h * 0.66, kw = img.width * kh / img.height;
    ctx.save(); ctx.translate(r.x, r.y);
    if (r.seat && r.seat[0] > ROOM / 2) ctx.scale(-1, 1);
    ctx.drawImage(img, -kw / 2, -kh, kw, kh); ctx.restore();
  }
  function drawWorldMarkers() {
    const fs = 14 / cam.s;
    for (const h of town.houses) {
      if (h.portal === undefined && !h.empty) continue;
      const x = h.door.x, y = h.door.y;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, h.door.w / 2, h.door.w / 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = h.portal ? "rgba(201,162,39,0.22)" : "rgba(255,255,255,0.12)"; ctx.fill();
      ctx.strokeStyle = h.portal ? "rgba(201,162,39,0.85)" : "rgba(255,255,255,0.55)"; ctx.lineWidth = 2 / cam.s;
      if (!h.portal) ctx.setLineDash([6 / cam.s, 4 / cam.s]); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `600 ${fs}px "Gowun Batang", serif`;
      const w = ctx.measureText(h.name).width + fs, bh = fs * 1.5, by = y - h.door.w / 5 - bh - 4 / cam.s;
      ctx.fillStyle = "rgba(28,22,16,0.75)"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, by, w, bh, fs * 0.5) : ctx.rect(x - w / 2, by, w, bh); ctx.fill();
      ctx.fillStyle = h.portal ? "#f3e6c8" : "#c9b99b"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(h.name, x, by + bh / 2);
      ctx.restore();
    }
  }
  function drawLabel(a) {
    // title + name, always shown together, at a steady size on screen
    const fs = 13 / cam.s;
    let x = a.x, y = a.y - a.h * 1.04;
    ctx.save();
    ctx.font = `600 ${fs}px "Gowun Batang", serif`;
    const w = ctx.measureText(a.label).width + fs * 0.9;
    if (a.face && player.seated && court.active) {
      // kneeling courtier: the tag sits just behind them (away from the aisle), level with their head
      const kneelW = a.kneelImg ? a.kneelImg.width * (a.h * 0.66) / a.kneelImg.height : a.h * 0.4;
      const back = a.face === "right" ? -1 : 1;
      x = a.x + back * (kneelW * 0.5 + w * 0.5 + fs * 0.3);
      y = a.y - a.h * 0.5;
    }
    ctx.fillStyle = "rgba(28,22,16,0.72)";
    const r = fs * 0.5, bx = x - w / 2, by = y - fs * 1.15, bh = fs * 1.45;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, bh, r) : ctx.rect(bx, by, w, bh); ctx.fill();
    ctx.fillStyle = "#f3e6c8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(a.label, x, by + bh / 2);
    ctx.restore();
  }

  function updateAide(dt) {
    if (!aide.img) return;
    // the 상선's bow and joined hands are drawn into his sheet itself (no extra lean needed)
    aide.bow = 0;
    if (player.seated && court.data && inThroneHall()) { // stand beside the throne
      const sp = court.data.sangseon; aide.h = roomHeightAt(sp.y) * 0.97;
      const dx = sp.x - aide.x, dy = sp.y - aide.y, d = Math.hypot(dx, dy);
      if (d > 3) { const st = Math.min(d, aide.h * 2.8 * dt); aide.x += dx / d * st; aide.y += dy / d * st; aide.moving = true;
        aide.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"); }
      else { aide.moving = false; aide.phase = 0; aide.dir = "down"; }
      return;
    }
    aide.h = (inside ? roomHeightAt(aide.y) : player.h) * 0.97;
    const b = BEHIND[player.dir];
    // stand a little behind the King and off to the side, like an attendant
    const tx = player.x + b[0] * player.h * 0.75 + (b[0] ? 0 : player.h * 0.45);
    const ty = player.y + b[1] * player.h * 0.35;
    let dx = tx - aide.x, dy = ty - aide.y, d = Math.hypot(dx, dy);
    if (!inside && town.nav) {
      // outdoors he follows the paths: straight if the way is clear, otherwise along a route around walls
      if (!lineFree(aide.x, aide.y, tx, ty) || !footFree(tx, ty, aide.h * 0.12)) {
        aide.pathT = (aide.pathT || 0) - dt;
        if (aide.pathT <= 0 || !aide.path || !aide.path.length) { aide.path = findPath(aide.x, aide.y, player.x, player.y) || []; aide.pathT = 0.7; }
        if (aide.path.length && d > player.h * 0.6) {
          let wp = aide.path[0]; if (Math.hypot(wp.x - aide.x, wp.y - aide.y) < 6) { aide.path.shift(); wp = aide.path[0] || { x: tx, y: ty }; }
          dx = wp.x - aide.x; dy = wp.y - aide.y; d = Math.max(1, Math.hypot(dx, dy)) + player.h;
        }
      } else aide.path = null;
    }
    // start walking when he falls a little behind, stop once close (no jittery start-stop)
    if (d > player.h * (aide.moving ? 0.06 : 0.3)) {
      const run = keys.has("run") || d > player.h * 2.5;
      const step = Math.min(d, player.h * (run ? 5.6 : 2.8) * dt);
      const L = Math.max(1e-6, Math.hypot(dx, dy)), ax = aide.x + dx / L * step, ay = Math.min(aide.y + dy / L * step, world().h - 4);
      if (inside || footFree(ax, ay, aide.h * 0.1)) { aide.x = ax; aide.y = ay; }
      else if (footFree(ax, aide.y, aide.h * 0.1)) aide.x = ax;
      else if (footFree(aide.x, ay, aide.h * 0.1)) aide.y = ay;
      aide.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) aide.dir = dx > 0 ? "right" : "left"; else aide.dir = dy > 0 ? "down" : "up";
    } else {
      aide.moving = false; aide.phase = 0;
      if (!player.moving) aide.dir = player.dir;
    }
  }

  function placePlayer(img, x, y) {
    player.img = img; player.x = x; player.y = y; player.dir = "down"; player.phase = 0; player.armed = true; player.walking = false; player.lx = undefined;
    player.h = inside ? roomHeightAt(y) : town.P;
  }
  function hitPlayer(w) {
    const half = player.h * 0.32;
    return w.x > player.x - half && w.x < player.x + half && w.y > player.y - player.h && w.y < player.y + 4;
  }
  function centerOnPlayer(k) {
    const tx = player.x - W / cam.s / 2, ty = player.y - player.h * 0.5 - H / cam.s / 2;
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; clampCam();
  }

  const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  window.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
    if (e.key === "Shift") keys.add("run");
    if (e.code === "Space" && editor.on) { keys.add("pan"); e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]);
    if (e.key === "Shift") keys.delete("run");
    if (e.code === "Space") keys.delete("pan");
  });
  window.addEventListener("blur", () => keys.clear());

  function updatePlayer(dt) {
    if (!player.img || fadeTo) { player.moving = false; return; }
    let dx = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
    let dy = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
    player.moving = !!(dx || dy) && !grab;
    if (player.seated) {
      // stay seated while the keys you walked up with are still held; after letting go,
      // press down, left or right to stand (pressing up again does nothing)
      if (!player.moving) { player.sitLock = false; return; }
      if (player.sitLock || (dy < 0 && !dx)) { player.moving = false; return; }
      player.seated = false; player.y += player.h * 0.9; // step down off the throne
    }
    if (!player.moving) { player.phase = 0; return; }
    follow = true;
    if (Math.abs(dx) >= Math.abs(dy) && dx) player.dir = dx > 0 ? "right" : "left";
    else player.dir = dy > 0 ? "down" : "up";
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const run = keys.has("run");
    const speed = player.h * (run ? 5.2 : 2.6); // map pixels per second, in body heights
    const w = world();
    const top = inside ? roomTop() : player.h * 0.6; // inside, the back wall stops you
    const side = inside ? ROOM * 0.04 : 10;
    const nx = Math.min(Math.max(player.x + dx * speed * dt, side), w.w - side);
    const ny = Math.min(Math.max(player.y + dy * speed * dt, top), w.h - 2);
    // walls, buildings, trees, fences and people stop you; slide along them
    const ok = (x, y) => {
      if (!inside && !footFree(x, y, player.h * 0.14)) return false;
      const ps = playerSpace();
      for (const r of town.people) {
        if (!r.visible || r.inMeeting || !sameSpace(r, ps)) continue;
        const d1 = Math.hypot(r.x - x, (r.y - y) * 1.6);
        if (d1 < player.h * 0.4 && d1 < Math.hypot(r.x - player.x, (r.y - player.y) * 1.6)) return false;
      }
      return true;
    };
    if (ok(nx, ny)) { player.x = nx; player.y = ny; }
    else if (ok(nx, player.y)) player.x = nx;
    else if (ok(player.x, ny)) player.y = ny;
    if (inside) player.h = roomHeightAt(player.y); // smaller toward the back of the room
    checkDoors();
    updateThrone();
  }

  // walking into a doorway goes inside; walking out of the room's bottom doorway comes back out
  function inDoor(d) { return Math.abs(player.x - d.x) < d.w / 2 && player.y > d.y - player.h * 0.55 && player.y < d.y + player.h * 0.12; }
  function checkDoors() {
    if (!inside) {
      const d = town.houses.find((h) => inDoor(h.door));
      if (!d) { player.armed = true; return; }
      if (d.portal !== undefined || d.empty) {     // a town on the world map
        if (!player.armed) return;
        player.armed = false;
        if (d.portal) travelTo(d.portal); else flashHint(d.name + ": nothing built here yet.");
        return;
      }
      if (player.armed && player.dir === "up") goInside(d);
    } else {
      const atExit = Math.abs(player.x - ROOM / 2) < ROOM * 0.09 && player.y > ROOM - player.h * 0.35;
      if (atExit) goOutside();
    }
  }
  function goInside(house) {
    fadeTo = async () => {
      const img = await loadImg(house.interior);
      inside = { house, img, w: img.width, h: img.height };
      placePlayer(player.img, inside.w / 2, inside.h - ROOM_H * ((house.room_scale) || 1) * 0.45); // just inside the bottom doorway
      player.dir = "up"; placeAide();
      fitCamera(); cam.s = Math.max(cam.min, Math.min(cam.max, H / (player.h * 6))); follow = true; centerOnPlayer(1); // zoomed out to show most of the room
    };
  }
  function goOutside() {
    const house = inside.house;
    fadeTo = async () => {
      inside = null;
      placePlayer(player.img, house.door.x, (house.door.stairs_bottom || house.door.y) + town.P * 0.45);
      player.armed = false; // standing just outside the door; walk away and back to go in again
      player.dir = "down"; placeAide();
      fitCamera(); cam.s = Math.min(cam.max, Math.max(cam.min, 1.1)); follow = true; centerOnPlayer(1);
    };
  }
  function updateFade(dt) {
    if (fadeTo) {
      fade = Math.min(1, fade + dt * 5);
      if (fade >= 1 && typeof fadeTo === "function") {
        const f = fadeTo; fadeTo = "busy"; // keep the screen dark while the room loads
        Promise.resolve().then(f).catch((e) => console.error(e)).finally(() => { fadeTo = null; });
      }
    } else fade = Math.max(0, fade - dt * 4);
  }

  // ---------- legs and facing, from the ground each person actually covered ----------
  // Every frame we measure how far someone really moved. The walk cycle advances by that distance
  // (one step every ~0.7 body heights walking, longer strides running), so nobody glides or walks in place.
  // Facing comes from the same movement, so nobody walks backwards or sideways. A jump (through a door,
  // being dropped, appearing) is not a step.
  function faceFor(cur, dx, dy) {
    const h = dx > 0 ? "right" : "left", v = dy > 0 ? "down" : "up", ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay * 1.25) return h;
    if (ay > ax * 1.25) return v;
    return cur === h || cur === v ? cur : (ax >= ay ? h : v);   // on a diagonal keep facing unless it's backwards
  }
  function animate(a, dt) {
    if (!a || a.seated) { if (a) { a.walking = false; a.lx = a.x; a.ly = a.y; } return; }
    if (a.lx === undefined) { a.lx = a.x; a.ly = a.y; a.vx = a.vy = 0; }
    const dx = a.x - a.lx, dy = a.y - a.ly, d = Math.hypot(dx, dy), h = a.h || 60;
    a.lx = a.x; a.ly = a.y;
    if (d > h * 0.6) { a.walking = false; a.phase = 0; a.vx = a.vy = 0; return; }     // a jump, not a step
    if (d < h * 0.003) {                                                              // standing still
      a.stillT = (a.stillT || 0) + dt;
      if (a.stillT > 0.08) { a.walking = false; a.phase = 0; a.vx = a.vy = 0; }
      return;
    }
    a.stillT = 0; a.walking = true;
    const run = d / Math.max(dt, 1e-3) > h * 4;
    a.phase += (d / h) * (run ? 2.3 : 2.9);
    a.vx = a.vx * 0.5 + dx * 0.5; a.vy = a.vy * 0.5 + dy * 0.5;   // smooth out tiny sidesteps
    const fx = a.vx * dx < 0 ? dx : a.vx, fy = a.vy * dy < 0 ? dy : a.vy; // a real reversal turns at once
    a.dir = faceFor(a.dir, fx, fy);
  }
  function animateAll(dt) {
    if (grab) { player.walking = false; player.lx = undefined; } else animate(player, dt);
    if (aide.img) animate(aide, dt);
    for (const r of town.people) animate(r, dt);
    if (court.active) for (const c of court.people) if (c.arrived === false) animate(c, dt);
  }

  function drawActors(beforeY) {
    // draw the King and 김모심 in depth order (lower on screen = in front)
    const all = [player, aide, ...((town && town.people) || []).filter((r) => r.visible)];
    const list = all.filter((a) => a.img && !a.drawn && a.y <= beforeY).sort((a, b) => a.y - b.y);
    for (const a of list) { a === player ? drawPlayer() : a.seated ? drawSeated(a) : drawSprite(a); a.drawn = true; }
  }
  // 호패 (wooden ID tag) on the belt, coloured by home: Jung City red, each town its own colour.
  // Shared specialists keep the Jung City colour anywhere. The 암행어사 shows none while in disguise; the 임금 wears none.
  const HOPAE = { hanyang: "#b8342b", mojoco: "#2f5ea6" };
  function drawHopae(a, col) {
    const c = HOPAE[a.home]; if (!c) return;
    const h = a.h, swing = a.walking ? Math.sin(a.phase * Math.PI / 2) * h * 0.012 : 0;
    // hang at the wearer's side, roughly at belt height; turn with the facing
    const side = { down: -0.15, up: 0.15, right: 0.06, left: -0.06 }[a.dir];
    const x = a.x + side * h + swing, top = a.y - h * 0.47, w = h * 0.055, th = h * 0.095;
    ctx.save();
    if (a.dir === "up") ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "#3b2414"; ctx.lineWidth = Math.max(0.6, h * 0.008);
    ctx.beginPath(); ctx.moveTo(x, top - h * 0.03); ctx.lineTo(x, top); ctx.stroke();           // cord
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, top, w, th, w * 0.35) : ctx.rect(x - w / 2, top, w, th); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,240,210,0.35)"; ctx.fillRect(x - w * 0.3, top + th * 0.15, w * 0.18, th * 0.6); // highlight
    ctx.restore();
  }
  function drawSprite(a) {
    const col = a.walking ? STEP[Math.floor(a.phase) % 4] : 1;
    const k = a.h / FIG, dw = FRAME * k;
    ctx.save();
    ctx.fillStyle = "rgba(40,25,10,0.28)";
    if (!noShadow) { ctx.beginPath(); ctx.ellipse(a.x, a.y - a.h * 0.01, a.h * 0.2, a.h * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
    if (a.dir === "up") drawHopae(a, col); // seen from behind, the tag is partly hidden by the body
    if (a.bow > 0.02) {
      const side = a.dir === "right" ? 1 : a.dir === "left" ? -1 : 0;
      ctx.translate(a.x, a.y);
      if (side) ctx.rotate(side * 0.24 * a.bow);
      ctx.scale(1, 1 - (side ? 0.04 : 0.12) * a.bow);
      ctx.translate(-a.x, -a.y);
    }
    if (a.ghost) ctx.filter = "grayscale(1) brightness(1.08) contrast(0.85)";
    ctx.drawImage(a.img, col * FRAME, ROW[a.dir] * FRAME, FRAME, FRAME, a.x - dw / 2, a.y - FEET * k, dw, dw);
    if (a.dir !== "up") drawHopae(a, col);
    ctx.restore();
  }
  function drawPlayer() {
    if (!player.img) return;
    if (player.seated) return drawSeatedKing();
    const col = player.walking ? STEP[Math.floor(player.phase) % 4] : 1;
    const row = ROW[player.dir];
    const k = player.h / FIG; // same scale for every direction
    const dw = FRAME * k, dh = FRAME * k;
    ctx.save();
    ctx.fillStyle = "rgba(40,25,10,0.28)";
    if (!noShadow) { ctx.beginPath(); ctx.ellipse(player.x, player.y - player.h * 0.01, player.h * 0.2, player.h * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.drawImage(player.img, col * FRAME, row * FRAME, FRAME, FRAME, player.x - dw / 2, player.y - FEET * k, dw, dh);
    ctx.restore();
  }

  // ---------- calls: who's talking ----------
  // When an agent is on a call, a card in the corner shows their portraits (made from their own sheets),
  // framed in their 호패 colour, with whoever is speaking lit up. 상선 김모심 lifts his red 명패 while he's on a call.
  // Nothing places calls yet; the agents will once they run. Use: village.call(["sangseon-kim-mosim","yeonguijeong-i-gyun"], speakerId)
  const CALL_HOME = { king: "#c9a227", hanyang: "#b8342b", mojoco: "#2f5ea6" };
  const callEl = document.getElementById("call");
  let callState = null;
  const profileCache = new Map();
  async function profileOf(id) {
    if (id === "king") return { display: "임금", townId: "king", portrait: "assets/characters/portraits/king.webp" };
    const hp = hireProfile(id); if (hp) return hp;
    if (!profileCache.has(id)) profileCache.set(id, getJSON(`agents/${id}/profile.json`).catch(() => null));
    return profileCache.get(id);
  }
  // ---------- hover card: who is this? ----------
  // Point at any villager to see their title and name, one line on what they do, and who they report to.
  // The words come from each agent's profile.json ("role" and "boss").
  const cardEl = document.getElementById("vcard");
  const PROFILE_ALIAS = {};
  let hoverPt = null, hoverWho = null;
  canvas.addEventListener("pointermove", (e) => { hoverPt = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerleave", () => { hoverPt = null; });
  function hideCard() { if (hoverWho) { hoverWho = null; cardEl.hidden = true; } }
  function updateHover() {
    if (!cardEl || !hoverPt || !town || grab || pointers.size || editor.on || fadeTo) return hideCard();
    const r = canvas.getBoundingClientRect(), wx = cam.x + (hoverPt.x - r.left) / cam.s, wy = cam.y + (hoverPt.y - r.top) / cam.s;
    const kneeling = (a) => a.seated || (a.face && court.active && player.seated);
    const list = [];
    if (aide.img) list.push({ a: aide, id: "sangseon-kim-mosim" });
    for (const p of town.people) if (p.visible && !p.hidden && !p.inMeeting) list.push({ a: p, id: p.id });
    if (court.active && inThroneHall()) for (const c of court.people) if (!(c.delay > 0)) list.push({ a: c, id: c.id });
    let best = null;
    for (const t of list) {
      const a = t.a, half = a.h * (kneeling(a) ? 0.36 : 0.3), top = a.y - a.h * (kneeling(a) ? 0.7 : 1.0);
      if (wx > a.x - half && wx < a.x + half && wy > top && wy < a.y + 3 && (!best || a.y > best.a.y)) best = t;
    }
    if (!best) return hideCard();
    const id = PROFILE_ALIAS[best.id] || best.id;
    if (hoverWho !== id) {
      hoverWho = id;
      cardEl.querySelector(".vn").textContent = best.a.label || "";
      cardEl.querySelector(".vr").textContent = "";
      cardEl.querySelector(".vb").textContent = "";
      cardEl.style.setProperty("--home", CALL_HOME[best.a.home] || CALL_HOME.hanyang);
      cardEl.hidden = false;
      profileOf(id).then((p) => {
        if (hoverWho !== id || !p) return;
        cardEl.querySelector(".vn").textContent = p.display || best.a.label || "";
        cardEl.querySelector(".vr").textContent = p.role || "";
        cardEl.querySelector(".vb").textContent = p.boss ? "Reports to: " + p.boss : "";
        if (CALL_HOME[p.townId === "capital" ? "hanyang" : p.townId]) cardEl.style.setProperty("--home", CALL_HOME[p.townId === "capital" ? "hanyang" : p.townId]);
      });
    }
    const cw = cardEl.offsetWidth, ch = cardEl.offsetHeight;
    let x = hoverPt.x + 16, y = hoverPt.y + 16;
    if (x + cw > innerWidth - 8) x = hoverPt.x - cw - 12;
    if (y + ch > innerHeight - 8) y = hoverPt.y - ch - 12;
    cardEl.style.left = Math.max(8, x) + "px"; cardEl.style.top = Math.max(8, y) + "px";
  }
  async function showCall(ids, speaker) {
    const ps = await Promise.all(ids.map(profileOf));
    callEl.innerHTML = "";
    ps.forEach((p, i) => {
      if (!p) return;
      if (i > 0) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "↔"; callEl.appendChild(t); }
      const d = document.createElement("div"); d.className = "who" + (ids[i] === speaker ? " speaking" : "");
      d.style.setProperty("--home", CALL_HOME[p.townId === "capital" ? "hanyang" : p.townId] || "#b8342b");
      const im = document.createElement("img"); im.alt = ""; if (safeAsset(p.portrait)) im.src = safeAsset(p.portrait);
      const nm = document.createElement("span"); nm.className = "name"; d.append(im, nm);
      d.querySelector(".name").textContent = p.display;
      callEl.appendChild(d);
    });
    callEl.hidden = false;
    callState = { ids, speaker };
    setAideCalling(ids.includes("sangseon-kim-mosim"));
  }
  function endCall() { callEl.hidden = true; callState = null; setAideCalling(false); }
  let aideWalkImg = null, aideCallImg = null;
  function setAideCalling(on) {
    if (!aide.img) return;
    if (!aideWalkImg) aideWalkImg = aide.img;
    if (on) { loadImg("assets/characters/kim-mosim-myeongpae.webp").then((im) => { aideCallImg = im; if (callState) aide.img = im; }); }
    else aide.img = aideWalkImg;
  }
  window.village = { call: showCall, endCall, setWorking: (id, on) => setWorking(id, on), notes: () => store.get("village.notes", []) };

  // ---------- roofs: anyone standing behind a building, wall or tree is drawn under its roof ----------
  // A roof cell covers anyone whose feet are above the bottom of that roof's column (the eave line), so people
  // vanish behind buildings and trees exactly where the painted roof is, with no straight cut-offs.
  const RC = 4; // roof cell size in map px
  function buildRoofs(img) {
    const c = document.createElement("canvas"); c.width = town.w; c.height = town.h;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const rw = Math.ceil(town.w / RC), rh = Math.ceil(town.h / RC), mask = new Uint8Array(rw * rh);
    const small = document.createElement("canvas"); small.width = rw; small.height = rh;
    const sg = small.getContext("2d"); sg.drawImage(img, 0, 0, rw, rh);
    const a = sg.getImageData(0, 0, rw, rh).data;
    for (let k = 0; k < rw * rh; k++) mask[k] = a[k * 4 + 3] > 100 ? 1 : 0;
    town.roof = { canvas: c, ctx: g, rw, rh, mask, base: new Int32Array(rw * rh) };
    roofBases(0, rw - 1);
  }
  function roofBases(x0, x1) {
    const R = town.roof;
    for (let cx = Math.max(0, x0); cx <= Math.min(R.rw - 1, x1); cx++) {
      let bottom = -1;
      for (let cy = R.rh - 1; cy >= 0; cy--) {
        const k = cy * R.rw + cx;
        if (R.mask[k]) { if (bottom < 0) bottom = (cy + 1) * RC; R.base[k] = bottom; } else bottom = -1;
      }
    }
  }
  // Roofs are always drawn over people. Whatever roof (building, tree, wall top) the King touches fades to
  // see-through, smoothly, so he is never half-hidden; it turns solid again once he steps away.
  function roofPieces() {
    const R = town.roof, lab = new Int32Array(R.rw * R.rh), pieces = [];
    for (let k0 = 0; k0 < lab.length; k0++) {
      if (!R.mask[k0] || lab[k0]) continue;
      const id = pieces.length + 1, stack = [k0]; lab[k0] = id;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      while (stack.length) {
        const k = stack.pop(), cx = k % R.rw, cy = (k / R.rw) | 0;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
        for (const n of [k - 1, k + 1, k - R.rw, k + R.rw]) {
          if (n < 0 || n >= lab.length || lab[n] || !R.mask[n]) continue;
          if ((n === k - 1 && cx === 0) || (n === k + 1 && cx === R.rw - 1)) continue;
          lab[n] = id; stack.push(n);
        }
      }
      // this piece alone, cut out of the roof layer
      const w = (x1 - x0 + 1) * RC, h = (y1 - y0 + 1) * RC, c = document.createElement("canvas");
      c.width = w; c.height = h; const g = c.getContext("2d");
      g.drawImage(R.canvas, x0 * RC, y0 * RC, w, h, 0, 0, w, h);
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const k = (y0 + ((yy / RC) | 0)) * R.rw + x0 + ((xx / RC) | 0);
        if (lab[k] !== id) d[(yy * w + xx) * 4 + 3] = 0;
      }
      g.putImageData(img, 0, 0);
      pieces.push({ id, x: x0 * RC, y: y0 * RC, w, h, c, alpha: 1 });
    }
    R.lab = lab; R.pieces = pieces; R.piecesDirty = false;
  }
  function drawRoofs(dt) {
    const R = town.roof; if (!R) return;
    if (!R.pieces || (R.piecesDirty && !(editor.stroke))) roofPieces();
    // which roofs are the King's feet standing on? (only his feet count, not the rest of his body)
    const touched = new Set();
    if (player.img && !inside) {
      const x0 = Math.floor((player.x - player.h * 0.12) / RC), x1 = Math.floor((player.x + player.h * 0.12) / RC);
      const y0 = Math.floor((player.y - player.h * 0.06) / RC), y1 = Math.floor(player.y / RC);
      for (let cy = Math.max(0, y0); cy <= Math.min(R.rh - 1, y1); cy++)
        for (let cx = Math.max(0, x0); cx <= Math.min(R.rw - 1, x1); cx++) { const l = R.lab[cy * R.rw + cx]; if (l) touched.add(l); }
    }
    const vx0 = cam.x, vy0 = cam.y, vx1 = cam.x + W / cam.s, vy1 = cam.y + H / cam.s;
    ctx.save();
    for (const p of R.pieces) {
      const goal = touched.has(p.id) ? 0.35 : 1;
      p.alpha += (goal - p.alpha) * Math.min(1, (dt || 0.016) * 8);
      if (p.x > vx1 || p.y > vy1 || p.x + p.w < vx0 || p.y + p.h < vy0) continue;
      ctx.globalAlpha = p.alpha; ctx.drawImage(p.c, p.x, p.y);
    }
    // props (lampposts, posts, signs…) are separate pictures, not part of the map the roof layer is cut from.
    // A prop that stands inside a roof area (the roof run ends at the prop's foot) belongs to that roof:
    // draw it again on top of the roof, fading along with it.
    const byId = new Map(R.pieces.map((p) => [p.id, p]));
    for (const pr of town.props) {
      if (pr.x + pr.w / 2 < vx0 || pr.x - pr.w / 2 > vx1 || pr.y - pr.h > vy1 || pr.y < vy0) continue;
      const cx = Math.floor(pr.x / RC); if (cx < 0 || cx >= R.rw) continue;
      let piece = null;
      for (let y = pr.y - RC; y > pr.y - pr.h * 0.6; y -= RC) {
        const cy = Math.floor(y / RC); if (cy < 0 || cy >= R.rh) break;
        const k = cy * R.rw + cx;
        if (R.mask[k]) { if (R.base[k] <= pr.y + RC * 4 && R.lab[k]) piece = byId.get(R.lab[k]); break; }
      }
      if (piece) { ctx.globalAlpha = piece.alpha; drawProp(pr, performance.now() / 1000); }
    }
    ctx.restore();
  }

  // People stay on top of roofs unless their feet are on a roof square; only then do they go behind it.
  // After the roofs are drawn, everyone whose feet are off the roofs but whose body overlaps one is drawn
  // again on top (plus any prop standing in front of them, so trees and posts still hide them properly).
  let noShadow = false;
  function roofCells(a, wx, top, bottom, want) {   // does a box around a person hit any roof square?
    const R = town.roof; if (!R || !R.lab) return false;
    const x0 = Math.max(0, Math.floor((a.x - a.h * wx) / RC)), x1 = Math.min(R.rw - 1, Math.floor((a.x + a.h * wx) / RC));
    const y0 = Math.max(0, Math.floor((a.y - a.h * top) / RC)), y1 = Math.min(R.rh - 1, Math.floor((a.y - a.h * bottom) / RC));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if ((want === "mask" ? R.mask : R.lab)[cy * R.rw + cx]) return true;
    return false;
  }
  const feetOnRoof = (a) => roofCells(a, 0.12, 0.06, 0, "lab");
  const bodyUnderRoof = (a) => roofCells(a, 0.32, 1.02, 0, "mask");
  function drawOverRoofs(t) {
    if (inside || !town.roof || !town.roof.lab) return;
    const list = [player, aide, ...town.people.filter((r) => r.visible)]
      .filter((a) => a.img && !(a === player && player.seated) && bodyUnderRoof(a) && !feetOnRoof(a)).sort((a, b) => a.y - b.y);
    if (!list.length) return;
    noShadow = true;
    for (const a of list) {
      a === player ? drawPlayer() : a.seated ? drawSeated(a) : drawSprite(a);
      for (const p of town.props) if (p.y > a.y && p.y - p.h < a.y && Math.abs(p.x - a.x) < p.w / 2 + a.h * 0.35) drawProp(p, t);
    }
    noShadow = false;
  }

  // ---------- map editor: the director paints walkable / blocked / roof right on the live map ----------
  const editor = { on: false, tool: "walk", size: 16, stroke: null, db: null, mine: [] };   // size = grid square in map px
  const edBar = document.getElementById("editbar"), edBtn = document.getElementById("edit-map");
  // one grid square: set everything inside it
  function paintSquare(t, gx, gy, G) { paintRect(t, gx * G, gy * G, G, G); }
  function paintRect(t, x0, y0, w, h) {
    const n = town.nav;
    if ((t === "walk" || t === "block") && n) {
      const v = t === "walk" ? 1 : 0;
      for (let cy = Math.floor(y0 / n.C); cy < Math.ceil((y0 + h) / n.C); cy++)
        for (let cx = Math.floor(x0 / n.C); cx < Math.ceil((x0 + w) / n.C); cx++)
          if (cx >= 0 && cy >= 0 && cx < n.gw && cy < n.gh) { n.g[cy * n.gw + cx] = v; n.dirty = true; n.navDirty = true; }
    } else if ((t === "roof" || t === "unroof") && town.roof) {
      const R = town.roof;
      if (t === "roof") R.ctx.drawImage(town.img, x0, y0, w, h, x0, y0, w, h); else R.ctx.clearRect(x0, y0, w, h);
      for (let cy = Math.floor(y0 / RC); cy < Math.ceil((y0 + h) / RC); cy++)
        for (let cx = Math.floor(x0 / RC); cx < Math.ceil((x0 + w) / RC); cx++)
          if (cx >= 0 && cy >= 0 && cx < R.rw && cy < R.rh) R.mask[cy * R.rw + cx] = t === "roof" ? 1 : 0;
      roofBases(Math.floor(x0 / RC) - 1, Math.ceil((x0 + w) / RC) + 1);
      R.dirty = true; R.piecesDirty = true;
    }
  }
  function paintCells(t, x, y, r) {
    const n = town.nav;
    if ((t === "walk" || t === "block") && n) {
      const v = t === "walk" ? 1 : 0;
      for (let cy = Math.floor((y - r) / n.C); cy <= Math.floor((y + r) / n.C); cy++)
        for (let cx = Math.floor((x - r) / n.C); cx <= Math.floor((x + r) / n.C); cx++) {
          if (cx < 0 || cy < 0 || cx >= n.gw || cy >= n.gh) continue;
          if (Math.hypot((cx + 0.5) * n.C - x, (cy + 0.5) * n.C - y) > r) continue;
          n.g[cy * n.gw + cx] = v; n.dirty = true; n.navDirty = true;
        }
    } else if ((t === "roof" || t === "unroof") && town.roof) {
      const R = town.roof, g = R.ctx;
      g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
      if (t === "roof") g.drawImage(town.img, x - r, y - r, r * 2, r * 2, x - r, y - r, r * 2, r * 2); else g.clearRect(x - r, y - r, r * 2, r * 2);
      g.restore();
      for (let cy = Math.floor((y - r) / RC); cy <= Math.floor((y + r) / RC); cy++)
        for (let cx = Math.floor((x - r) / RC); cx <= Math.floor((x + r) / RC); cx++) {
          if (cx < 0 || cy < 0 || cx >= R.rw || cy >= R.rh) continue;
          if (Math.hypot((cx + 0.5) * RC - x, (cy + 0.5) * RC - y) <= r) R.mask[cy * R.rw + cx] = t === "roof" ? 1 : 0;
        }
      roofBases(Math.floor((x - r) / RC) - 1, Math.floor((x + r) / RC) + 1);
      R.dirty = true; R.piecesDirty = true;
    }
  }
  // outline & fill: every square inside the drawn outline (and under the outline itself) gets the tool, all at once
  function fillOutline(st) {
    const G = st.g, pts = st.pts;
    const add = (gx, gy) => { if (gx >= 0 && gy >= 0 && gx * G < town.w && gy * G < town.h) st.cells.add(gx + "," + gy); };
    for (let i = 0; i < pts.length; i++) {          // the outline line itself
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (G / 3)));
      if (i === pts.length - 1 && pts.length < 3) break;
      for (let k = 0; k <= n; k++) add(Math.floor((x0 + (x1 - x0) * k / n) / G), Math.floor((y0 + (y1 - y0) * k / n) / G));
    }
    if (pts.length >= 3) {                          // everything inside (even-odd rule)
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const gx0 = Math.floor(Math.min(...xs) / G), gx1 = Math.floor(Math.max(...xs) / G), gy0 = Math.floor(Math.min(...ys) / G), gy1 = Math.floor(Math.max(...ys) / G);
      for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
        const cx = (gx + 0.5) * G, cy = (gy + 0.5) * G; let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > cy) !== (yj > cy) && cx < (xj - xi) * (cy - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) add(gx, gy);
      }
    }
    for (const key of st.cells) { const [gx, gy] = key.split(",").map(Number); paintSquare(st.t, gx, gy, G); }
  }
  function applyStroke(st) {
    if (st.cells) { for (const [gx, gy] of st.cells) paintSquare(st.t, gx, gy, st.g); return; }
    const pts = st.pts; let px = null, py = null;
    for (const [x, y] of pts) {
      if (px !== null) { const d = Math.hypot(x - px, y - py), n = Math.ceil(d / (st.r * 0.4));
        for (let k = 1; k <= n; k++) paintCells(st.t, px + (x - px) * k / n, py + (y - py) * k / n, st.r); }
      else paintCells(st.t, x, y, st.r);
      px = x; py = y;
    }
  }
  const editsKey = () => (TOWNS[town.key] && TOWNS[town.key].edits) || town.key;
  const strokeKey = () => "mapedits/" + editsKey() + "/strokes";
  async function loadEdits() {
    // saved edits (shared, so they show for everyone and Claude can read them); this browser's copy as a fallback
    let list = [];
    if (editor.db === null || editor.db === undefined) editor.db = await Promise.resolve(window.claude && window.claude.use ? window.claude.use("db") : null).catch(() => null);
    if (editor.db) {
      try { const snap = await editor.db.collection(strokeKey()).orderBy("seq").limit(1000).get();
        list = snap.docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { console.warn("edits not readable", e); }
    } else list = store.get("village.edits." + editsKey(), []);
    for (const st of list) applyStroke(st.cells ? { t: st.t, g: st.g, cells: st.cells.split(";").map((p) => p.split(",").map(Number)) }
                                                : { t: st.t, r: st.r, pts: st.pts.split(";").map((p) => p.split(",").map(Number)) });
    editor.mine = list.map((st) => st.id).filter(Boolean);
  }
  async function saveStroke(st) {
    const body = { seq: Date.now(), t: st.t, g: st.g, cells: [...st.cells].join(";") };
    if (editor.db) {
      try { const ref = await editor.db.collection(strokeKey()).add(body); editor.mine.push(ref.id); return; }
      catch (e) { console.warn("could not save edit", e); }
    }
    const loc = store.get("village.edits." + editsKey(), []); loc.push(body); store.set("village.edits." + editsKey(), loc);
  }
  async function undoStroke() {
    // undo = delete the last saved stroke, then rebuild this town's ground and roofs from scratch
    if (editor.db && editor.mine.length) { const id = editor.mine.pop(); try { await editor.db.collection(strokeKey()).doc(id).delete(); } catch (e) {} }
    else { const loc = store.get("village.edits." + editsKey(), []); loc.pop(); store.set("village.edits." + editsKey(), loc); }
    const k = town.key; await loadTown(k); setEditing(true);
  }
  function setEditing(on) {
    editor.on = on; edBar.hidden = !on; edBtn.setAttribute("aria-pressed", String(on));
    canvas.style.cursor = on ? "crosshair" : "";
  }
  edBtn.addEventListener("click", () => setEditing(!editor.on));
  editor.shape = "brush";
  for (const b of document.querySelectorAll("[data-shape]")) b.addEventListener("click", () => {
    editor.shape = b.dataset.shape; document.querySelectorAll("[data-shape]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  for (const b of document.querySelectorAll("[data-tool]")) b.addEventListener("click", () => {
    editor.tool = b.dataset.tool; document.querySelectorAll("[data-tool]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  });
  document.getElementById("brush").addEventListener("change", (e) => { editor.size = +e.target.value; });
  document.getElementById("undo-edit").addEventListener("click", () => undoStroke());
  document.getElementById("done-edit").addEventListener("click", () => setEditing(false));
  function drawEditOverlay() {
    if (!editor.on) return;
    const n = town.nav;
    if (n) {
      if (!n.ov || n.dirty) {
        if (!n.ov) { n.ov = document.createElement("canvas"); n.ov.width = n.gw; n.ov.height = n.gh; }
        const og = n.ov.getContext("2d"), id = og.createImageData(n.gw, n.gh);
        for (let k = 0; k < n.gw * n.gh; k++) { if (!n.g[k]) { id.data[k * 4] = 230; id.data[k * 4 + 1] = 40; id.data[k * 4 + 2] = 40; id.data[k * 4 + 3] = 110; } }
        og.putImageData(id, 0, 0); n.dirty = false;
      }
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(n.ov, 0, 0, n.gw * n.C, n.gh * n.C); ctx.restore();
    }
    const R = town.roof;
    if (R) {
      if (!R.ov) { R.ov = document.createElement("canvas"); R.ov.width = R.rw; R.ov.height = R.rh; R.dirty = true; }
      if (R.dirty) { // redraw the blue tint only when the roofs change
        const og = R.ov.getContext("2d"), id = og.createImageData(R.rw, R.rh);
        for (let k = 0; k < R.rw * R.rh; k++) if (R.mask[k]) { id.data[k * 4] = 40; id.data[k * 4 + 1] = 90; id.data[k * 4 + 2] = 240; id.data[k * 4 + 3] = 110; }
        og.putImageData(id, 0, 0); R.dirty = false;
      }
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(R.ov, 0, 0, R.rw * RC, R.rh * RC); ctx.restore();
    }
    // grid lines over everything in view
    const G = editor.size;
    if (G * cam.s >= 5) {
      const vx0 = Math.max(0, Math.floor(cam.x / G) * G), vy0 = Math.max(0, Math.floor(cam.y / G) * G);
      const vx1 = Math.min(town.w, cam.x + W / cam.s), vy1 = Math.min(town.h, cam.y + H / cam.s);
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1 / cam.s; ctx.beginPath();
      for (let x = vx0; x <= vx1; x += G) { ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); }
      for (let y = vy0; y <= vy1; y += G) { ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); }
      ctx.stroke(); ctx.restore();
    }
    if (editor.stroke && editor.stroke.outline && editor.stroke.pts.length > 1) {
      const col = { walk: "60,208,112", block: "230,40,40", roof: "43,92,240", unroof: "170,187,204" }[editor.stroke.t] || "255,255,255";
      ctx.save(); ctx.beginPath(); editor.stroke.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = `rgba(${col},0.22)`; ctx.fill();
      ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 2.5 / cam.s; ctx.setLineDash([8 / cam.s, 5 / cam.s]); ctx.stroke(); ctx.restore();
    }
    if (editor.hover) { const hx = Math.floor(editor.hover.x / G) * G, hy = Math.floor(editor.hover.y / G) * G;
      ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 / cam.s; ctx.strokeRect(hx, hy, G, G); ctx.restore(); }
  }

  // who is working: set by the agents once they run. Press J to try it: everyone goes to work, press again to stop.
  function setWorking(id, on) { on ? working.add(id) : working.delete(id); }
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyJ" || !town || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    const anyone = town.people.some((r) => working.has(r.id));
    for (const r of town.people) setWorking(r.id, !anyone && !!r.houseObj);
  });

  // ---------- court meetings in the throne hall ----------
  // Officials stand or kneel at their rank stones in two rows facing each other (never the 임금).
  // They stand when the 임금 stands and kneel when he sits on the throne. 상선 김모심 stands beside the throne.
  const KING_THRONE = "assets/characters/king-throne.webp";
  const court = { data: null, active: false, people: [], throneImg: null };
  const meetingBtn = document.getElementById("meeting");
  async function loadCourt() {
    if (court.data) return;
    court.data = await getJSON("towns/court.json");
    court.throneImg = await loadImg(KING_THRONE).catch(() => null);
    court.people = (await Promise.all(court.data.seats.map(async (s) => {
      try {
        const [img, kneel] = await Promise.all([loadImg(s.sheet), loadImg(s.kneel)]);
        return { ...s, sx: s.x, sy: s.y, img, kneelImg: kneel, h: 60, dir: s.face, phase: 0, moving: false, label: s.title + " " + s.name };
      } catch (e) { console.warn("Missing court art for", s.id); return null; }
    }))).filter(Boolean);
  }
  const inThroneHall = () => inside && inside.house.id === (court.data ? court.data.hall : "throne-hall");
  async function callMeeting() {
    meetingBtn.disabled = true;
    try {
      await loadCourt();
      if (town.key !== "capital") {
        document.querySelectorAll("[data-town]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.town === "capital")));
        await loadTown("capital");
      }
      const house = town.houses.find((h) => h.id === court.data.hall);
      fadeTo = async () => {
        const img = await loadImg(house.interior);
        inside = { house, img, w: img.width, h: img.height };
        placePlayer(player.img, inside.w / 2, inside.h - ROOM_H * (house.room_scale || 1) * 0.45);
        player.dir = "up"; placeAide();
        court.active = true;
        for (const r of town.people) r.inMeeting = court.people.some((c) => c.id === r.id);
        // the court files in through the hall door, furthest seats first, and walks up the aisle to their places
        [...court.people].sort((a, b) => a.sy - b.sy).forEach((c, i) => {
          c.x = ROOM / 2 + (i % 2 ? 30 : -30); c.y = ROOM - 50; c.delay = 0.6 + i * 0.5; c.arrived = false;
          c.path = [{ x: ROOM / 2 + (c.sx < ROOM / 2 ? -40 : 40), y: c.sy }, { x: c.sx, y: c.sy }];
        });
        fitCamera(); cam.s = Math.max(cam.min, Math.min(cam.max, H / (player.h * 6))); follow = true; centerOnPlayer(1);
      };
      meetingBtn.textContent = "End Meeting"; meetingBtn.setAttribute("aria-pressed", "true");
    } finally { meetingBtn.disabled = false; }
  }
  function endMeeting() {
    const house = town.houses.find((h) => h.id === court.data.hall);
    if (!house) { // not in Jung City right now: just close the meeting
      court.active = false; player.seated = false;
      meetingBtn.textContent = "Call Meeting"; meetingBtn.setAttribute("aria-pressed", "false"); return;
    }
    fadeTo = async () => {
      court.active = false; player.seated = false;
      inside = null;
      placePlayer(player.img, house.door.x, (house.door.stairs_bottom || house.door.y) + town.P * 0.5);
      player.dir = "down"; player.armed = false; placeAide();
      let k = 0;
      const out = nearestFree(house.door.x, (house.door.stairs_bottom || house.door.y) + town.P * 0.5);
      for (const r of town.people) {
        if (!r.inMeeting) continue;
        r.inMeeting = false; r.space = "out"; r.plan = null; r.path = null; r.seated = false; r.mode = "idle";
        r.x = out.x + rand(-10, 10); r.y = out.y; r.dir = "down";
        if (r.id === "yeonguijeong-i-gyun") { const p0 = nearestFree(house.door.x - town.P * 0.9, out.y + town.P * 0.2); r.x = p0.x; r.y = p0.y; r.wait = rand(4, 8); r.emergeT = 0; }
        else { r.emergeT = 0.8 + k * 0.7; r.wait = 0.2; k++; }   // they come out of the hall one after another
      }
      fitCamera(); cam.s = Math.min(cam.max, Math.max(cam.min, 1.1)); follow = true; centerOnPlayer(1);
    };
    meetingBtn.textContent = "Call Meeting"; meetingBtn.setAttribute("aria-pressed", "false");
  }
  meetingBtn.addEventListener("click", () => { if (!town || fadeTo) return; court.active ? endMeeting() : callMeeting(); });

  // the throne: walk up onto it to sit; any arrow key stands you up again
  function updateThrone() {
    if (inside && inside.house.id === "throne-hall" && !court.data && !court.loading) { court.loading = true; loadCourt().catch((e) => console.warn(e)).finally(() => { court.loading = false; }); }
    if (!inThroneHall() || !court.data) { player.seated = false; return; }
    const t = court.data.throne;
    if (!player.seated && Math.abs(player.x - t.x) < 150 && player.y < t.y + 110) { // a generous zone in front of the throne
      player.seated = true; player.sitLock = true; player.x = t.x; player.y = t.y; player.dir = "down"; player.moving = false;
    }
  }
  function updateCourt(dt) {
    if (!court.active || !inThroneHall()) return;
    for (const c of court.people) {
      if (c.arrived !== false) continue;
      if (c.delay > 0) { c.delay -= dt; continue; }
      c.h = roomHeightAt(c.y);
      const wp = c.path[0], dx = wp.x - c.x, dy = wp.y - c.y, d = Math.hypot(dx, dy), st = Math.min(d, c.h * 1.8 * dt);
      if (d < 3) { c.path.shift(); if (!c.path.length) { c.arrived = true; c.x = c.sx; c.y = c.sy; c.moving = false; c.walking = false; c.dir = c.face; } continue; }
      c.x += dx / d * st; c.y += dy / d * st; c.moving = true;
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    }
  }
  function drawCourt(beforeY) {
    if (!court.active || !inThroneHall()) return;
    for (const c of court.people) {
      if (c.drawn || c.y > beforeY || c.delay > 0) continue;
      c.drawn = true;
      c.h = roomHeightAt(c.y);
      if (c.arrived === false) { drawSprite(c); continue; }   // still walking to their place
      if (player.seated) { // kneel, facing across the aisle
        const img = c.kneelImg, kh = c.h * 0.66, kw = img.width * kh / img.height;
        ctx.save();
        ctx.fillStyle = "rgba(40,25,10,0.25)";
        ctx.beginPath(); ctx.ellipse(c.x, c.y - c.h * 0.01, kw * 0.42, c.h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        ctx.translate(c.x, c.y);
        if (c.face === "left") ctx.scale(-1, 1); // the art faces right; flip for the right-hand row
        ctx.drawImage(img, -kw / 2, -kh, kw, kh);
        ctx.restore();
      } else {
        c.dir = c.face; c.moving = false;
        drawSprite(c);
      }
    }
  }
  function drawSeatedKing() {
    const img = court.throneImg; if (!img) return drawPlayer();
    const kh = player.h * 0.82, kw = img.width * kh / img.height;
    ctx.drawImage(img, player.x - kw / 2, player.y - kh, kw, kh);
  }

  // ---------- light: real clock, with manual override ----------
  // night on the director's own clock (10 pm to 6 am), or when the Night button is on
  function isNightNow() {
    if (lightMode === "night") return true;
    if (lightMode === "day") return false;
    const h = new Date().getHours(); return h >= 22 || h < 6;
  }
  function lighting() {
    if (lightMode === "day") return { night: 0, dusk: 0 };
    if (lightMode === "night") return { night: 1, dusk: 0 };
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    let n;
    if (h >= 7.5 && h <= 17) n = 0;
    else if (h > 17 && h < 19.5) n = (h - 17) / 2.5;
    else if (h >= 19.5 || h < 5) n = 1;
    else n = 1 - (h - 5) / 2.5;
    return { night: n, dusk: Math.max(0, 1 - Math.abs(n - 0.5) * 2) };
  }

  // ---------- water ----------
  function makeWater(z) {
    let box;
    if (z.shape === "rect") box = { x: z.x, y: z.y, w: z.w, h: z.h };
    else box = { x: z.cx - z.rx, y: z.cy - z.ry, w: z.rx * 2, h: z.ry * 2 };
    const n = Math.min(40, Math.max(4, Math.round((box.w * box.h) / 1400)));
    const glints = Array.from({ length: n }, () => ({
      x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h,
      len: rand(6, 16), ph: rand(0, 6.28), sp: rand(0.8, 1.8), drift: rand(-3, 3),
    }));
    return { z, box, glints, ripples: [], next: rand(0.5, 3) };
  }
  function addShape(s) {
    if (s.shape === "rect") ctx.rect(s.x, s.y, s.w, s.h);
    else { ctx.moveTo(s.cx + s.rx, s.cy); ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2); }
  }
  // water area = outer shape minus any holes (islands, pavilions, bridges); holes must not overlap
  function waterPath(z) {
    ctx.beginPath();
    addShape(z);
    for (const h of z.holes || []) addShape(h);
  }
  function drawWater(wz, t, dt) {
    const z = wz.z;
    ctx.save();
    waterPath(z); ctx.clip("evenodd");
    ctx.lineCap = "round";
    const v = vis();
    for (const g of wz.glints) {
      const a = Math.max(0, Math.sin(t * g.sp + g.ph));
      if (a < 0.05) continue;
      const x = g.x + Math.sin(t * 0.3 + g.ph) * g.drift;
      ctx.strokeStyle = `rgba(255,255,245,${0.7 * a})`;
      ctx.lineWidth = 2.2 * v;
      ctx.beginPath(); ctx.moveTo(x - g.len * 0.6 * v, g.y); ctx.lineTo(x + g.len * 0.6 * v, g.y); ctx.stroke();
    }
    wz.next -= dt;
    if (wz.next <= 0) {
      wz.next = rand(0.5, 1.6);
      wz.ripples.push({ x: wz.box.x + Math.random() * wz.box.w, y: wz.box.y + Math.random() * wz.box.h, age: 0 });
    }
    for (const r of wz.ripples) {
      r.age += dt;
      const k = r.age / 2.6;
      ctx.strokeStyle = `rgba(240,252,255,${0.6 * (1 - k)})`;
      ctx.lineWidth = 1.8 * v;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, (3 + k * 22) * v, (1.5 + k * 9) * v, 0, 0, Math.PI * 2); ctx.stroke();
    }
    wz.ripples = wz.ripples.filter((r) => r.age < 2.6);
    ctx.restore();
  }

  // ---------- flags: the painted cloth itself sways ----------
  function drawFlag(f, t) {
    const m = 5, step = 2;
    for (let y = 0; y < f.h; y += step) {
      const k = Math.pow(y / f.h, 1.15);
      const off = 7 * k * Math.sin(t * 2.1 - y * 0.05) + 2 * k * Math.sin(t * 3.7 + y * 0.11);
      ctx.drawImage(town.img, f.x - m, f.y + y, f.w + m * 2, step + 0.6, f.x - m + off, f.y + y, f.w + m * 2, step + 0.6);
    }
  }

  // ---------- fire (only at real fireplaces) ----------
  // lamps and window screens breathe slowly, like a candle behind paper
  function lampFlick(t, s) { return 0.9 + 0.1 * Math.sin(t * 1.1 + s) * Math.sin(t * 0.7 + s * 2.1); }
  function flick(t, s) { return 0.75 + 0.25 * Math.sin(t * 9.1 + s) * Math.sin(t * 5.3 + s * 2.1); }
  function drawFire(f, t) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(f.x, f.y - f.h * 0.3, 0, f.x, f.y - f.h * 0.3, f.w * 1.6);
    g.addColorStop(0, `rgba(255,170,70,${0.32 * flick(t, 1)})`);
    g.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(f.x, f.y - f.h * 0.3, f.w * 1.6, 0, Math.PI * 2); ctx.fill();
    for (let i = -1; i <= 1; i++) {
      const x = f.x + i * f.w * 0.22;
      const hgt = f.h * (0.55 + 0.35 * flick(t, i * 1.7 + 3)) * (i === 0 ? 1 : 0.75);
      const wid = f.w * 0.2;
      const sway = Math.sin(t * 6 + i) * f.w * 0.08;
      const fg = ctx.createLinearGradient(x, f.y, x, f.y - hgt);
      fg.addColorStop(0, "rgba(255,250,210,0.9)");
      fg.addColorStop(0.35, "rgba(255,190,70,0.75)");
      fg.addColorStop(1, "rgba(230,70,20,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(x - wid, f.y);
      ctx.quadraticCurveTo(x - wid * 1.1, f.y - hgt * 0.5, x + sway, f.y - hgt);
      ctx.quadraticCurveTo(x + wid * 1.1, f.y - hgt * 0.5, x + wid, f.y);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- smoke from real chimneys ----------
  function drawSmoke(em, t, dt) {
    const v = Math.sqrt(vis());
    em.acc += dt * 7;
    while (em.acc > 1 && em.parts.length < 110) {
      em.acc -= 1;
      em.parts.push({ x: em.x + rand(-3, 3), y: em.y, vx: rand(4, 10), vy: -rand(16, 26), age: 0, max: rand(7, 11), r0: rand(7, 11), ph: rand(0, 6) });
    }
    for (const p of em.parts) {
      p.age += dt;
      p.x += (p.vx + Math.sin(t * 0.8 + p.ph) * 4) * dt * v;
      p.y += p.vy * dt * v;
      p.vy *= 0.997;
      const k = p.age / p.max;
      const r = (p.r0 + p.age * 8) * v;
      const a = 0.42 * (1 - k) * Math.min(1, p.age * 1.5);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(236,232,226,${a})`);
      g.addColorStop(1, "rgba(236,232,226,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }
    em.parts = em.parts.filter((p) => p.age < p.max);
  }

  // ---------- painted trees: only the leaf-coloured pixels of each crown are copied and rocked by the wind ----------
  function leafMatch(kind, r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), v = mx / 255, s = mx ? (mx - mn) / mx : 0;
    if (mx === mn) return 0;
    let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
    h = (h * 60 + 360) % 360;
    if (kind === "blossom") return (h > 280 || h < 18) && s > 0.07 && v > 0.55 ? 1 : 0;
    return (h > 340 || h < 32) && s > 0.4 && v > 0.3 ? 1 : 0;
  }
  function makeCanopy(img, tr) {
    const r = Math.round(tr.r * 1.1), size = r * 2;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const g = c.getContext("2d");
    g.drawImage(img, tr.x - r, tr.y - r, size, size, 0, 0, size, size);
    try {
      const id = g.getImageData(0, 0, size, size), d = id.data;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const dist = Math.hypot(x - r, y - r) / r;
        const edge = dist < 0.75 ? 1 : Math.max(0, (1 - dist) / 0.25); // fade out towards the rim
        d[i + 3] = Math.round(d[i + 3] * leafMatch(tr.kind, d[i], d[i + 1], d[i + 2]) * edge);
      }
      g.putImageData(id, 0, 0);
    } catch (e) { return null; } // if the pixels can't be read, this tree just stays still
    return { c, x: tr.x, y: tr.y, r, ph: rand(0, 6.28) };
  }
  function drawCanopies(t) {
    const vw = W / cam.s, vh = H / cam.s;
    for (const k of town.canopies || []) {
      if (k.x + k.r < cam.x || k.x - k.r > cam.x + vw || k.y + k.r < cam.y || k.y - k.r > cam.y + vh) continue;
      const w = windAt(t, k.x) + 0.2 * Math.sin(t * 3.3 + k.ph);
      const dx = w * k.r * 0.01, sh = w * 0.012; // lean and shift the top of the crown downwind
      ctx.save();
      ctx.translate(k.x, k.y + k.r);            // pivot near the trunk, below the crown
      ctx.transform(1, 0, -sh, 1, dx, 0);
      ctx.drawImage(k.c, -k.r, -2 * k.r);
      ctx.restore();
    }
  }

  // ---------- props bend from their base in the wind ----------
  function drawProp(p, t) {
    if (!p.sway || reduceMotion) { ctx.drawImage(p.img, p.x - p.w / 2, p.y - p.h, p.w, p.h); return; }
    const k = p.sway * (windAt(t, p.x) + 0.15 * Math.sin(t * 4.1 + p.ph));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.transform(1, 0, -k, 1, 0, 0); // shear: the top leans, the base stays planted
    ctx.drawImage(p.img, -p.w / 2, -p.h, p.w, p.h);
    ctx.restore();
  }

  // ---------- petals and leaves falling from the painted trees and prop trees ----------
  const FALL_COLORS = { blossom: ["#f7c6d3", "#f2a7b8", "#fde4ea", "#ffffff"], maple: ["#d8452b", "#e9894a", "#c9302a", "#f0a040"] };
  function updateFalls(t, dt) {
    const vw = W / cam.s, vh = H / cam.s, v = vis();
    if (!reduceMotion && town.falls.length < 140) {
      const sources = (town.fx.trees || []).concat(town.props.filter((p) => /tree/.test(p.prop))
        .map((p) => ({ kind: /plum/.test(p.prop) ? "blossom" : "maple", x: p.x, y: p.y - p.h * 0.65, r: p.w * 0.4 })));
      for (const tr of sources) {
        if (tr.x < cam.x - 200 || tr.x > cam.x + vw + 200 || tr.y < cam.y - 300 || tr.y > cam.y + vh + 100) continue;
        const rate = (tr.kind === "blossom" ? 0.9 : 0.5) * (0.5 + windAt(t, tr.x)) * (tr.r / 80);
        if (Math.random() < rate * dt) {
          const a = rand(0, 6.28), d = Math.sqrt(Math.random()) * tr.r * 0.8;
          const c = FALL_COLORS[tr.kind];
          town.falls.push({ x: tr.x + Math.cos(a) * d, y: tr.y + Math.sin(a) * d * 0.6, y0: tr.y, drop: tr.r * rand(0.9, 1.6),
            vy: rand(18, 32), size: tr.kind === "blossom" ? rand(2.5, 4) : rand(3.5, 5.5), rot: rand(0, 6), spin: rand(-3, 3),
            ph: rand(0, 6), kind: tr.kind, c: c[(Math.random() * c.length) | 0], life: 0 });
        }
      }
    }
    for (const f of town.falls) {
      const w = windAt(t, f.x);
      f.life += dt;
      f.x += (w * 22 + Math.sin(t * 2 + f.ph) * 10) * dt;
      f.y += f.vy * dt;
      f.rot += f.spin * dt;
      const fallen = f.y - f.y0, fade = Math.min(1, f.life * 3, Math.max(0, (f.drop - fallen) / (f.drop * 0.3)));
      if (fade <= 0) { f.dead = true; continue; }
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.scale(v, v * (0.4 + 0.6 * Math.abs(Math.sin(t * 3.2 + f.ph))));
      ctx.fillStyle = f.c;
      ctx.beginPath();
      if (f.kind === "maple") { // a little five-point leaf
        for (let i = 0; i < 10; i++) { const r = i % 2 ? f.size * 0.45 : f.size, an = i * Math.PI / 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
      } else ctx.ellipse(0, 0, f.size, f.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    town.falls = town.falls.filter((f) => !f.dead);
  }

  // ---------- a few leaves and petals drifting by ----------
  const LEAF_COLORS = ["#f2a7b8", "#e9894a", "#d9b23a", "#9bbf4a", "#f6c9d3"];
  function updateLeaves(t, dt) {
    const vw = W / cam.s, vh = H / cam.s;
    const v = vis();
    const target = reduceMotion ? 0 : 16;
    while (town.leaves.length < target) {
      const fromTop = Math.random() < 0.4;
      town.leaves.push({
        x: fromTop ? cam.x + Math.random() * vw : cam.x - rand(10, 120) * v,
        y: fromTop ? cam.y - rand(10, 60) * v : cam.y + Math.random() * vh * 0.9,
        vx: rand(30, 55), vy: rand(6, 18), size: rand(5, 9), rot: rand(0, 6), spin: rand(-2.5, 2.5),
        ph: rand(0, 6), c: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
      });
    }
    for (const l of town.leaves) {
      l.x += l.vx * (0.6 + 0.5 * windAt(t, l.x)) * dt * v; l.y += (l.vy + Math.sin(t * 1.6 + l.ph) * 12) * dt * v; l.rot += l.spin * dt;
      ctx.save();
      ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.scale(v, v * (0.55 + 0.45 * Math.sin(t * 3 + l.ph)));
      ctx.fillStyle = l.c;
      ctx.beginPath(); ctx.ellipse(0, 0, l.size, l.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    town.leaves = town.leaves.filter((l) => l.x < cam.x + vw + 40 && l.y < cam.y + vh + 40);
  }

  // ---------- cloud shadows drifting over the town (daytime) ----------
  function drawClouds(L, dt) {
    const a = 0.16 * (1 - L.night);
    if (a < 0.01) return;
    for (const c of town.clouds) {
      c.x += c.sp * dt;
      c.y += c.sp * 0.25 * dt;
      if (c.x - c.r > town.w || c.y - c.r > town.h) { c.x = -c.r - rand(0, 400); c.y = rand(-c.r, town.h * 0.8); }
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, `rgba(20,30,60,${a})`);
      g.addColorStop(0.6, `rgba(20,30,60,${a * 0.6})`);
      g.addColorStop(1, "rgba(20,30,60,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * 1.4, c.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- small flocks of birds flying over now and then ----------
  function drawBirds(L, t, dt) {
    if (reduceMotion) return;
    const vw = W / cam.s, vh = H / cam.s, v = vis();
    town.birdNext -= dt;
    if (town.birdNext <= 0 && L.night < 0.7) {
      town.birdNext = rand(6, 14);
      const n = 3 + ((Math.random() * 4) | 0);
      const y0 = cam.y + rand(0.1, 0.7) * vh, ltr = Math.random() < 0.7;
      for (let i = 0; i < n; i++) {
        town.birds.push({ x: ltr ? cam.x - (40 + i * 26) * v : cam.x + vw + (40 + i * 26) * v,
          y: y0 + (i % 2 ? 1 : -1) * i * 12 * v, vx: (ltr ? 1 : -1) * rand(150, 190), vy: rand(-12, 6), ph: rand(0, 6) });
      }
    }
    ctx.strokeStyle = "rgba(45,35,30,0.85)";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const b of town.birds) {
      b.x += b.vx * dt * v; b.y += b.vy * dt * v;
      const flap = Math.sin(t * 11 + b.ph);
      const s = 7 * v;
      ctx.lineWidth = 1.8 * v;
      ctx.beginPath();
      ctx.moveTo(b.x - s, b.y - s * 0.5 * flap);
      ctx.quadraticCurveTo(b.x - s * 0.4, b.y - s * 0.2, b.x, b.y);
      ctx.quadraticCurveTo(b.x + s * 0.4, b.y - s * 0.2, b.x + s, b.y - s * 0.5 * flap);
      ctx.stroke();
      // faint shadow on the ground below
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.beginPath(); ctx.ellipse(b.x + 30 * v, b.y + 70 * v, s * 0.7, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    }
    town.birds = town.birds.filter((b) => b.x > cam.x - 300 * v && b.x < cam.x + vw + 300 * v);
  }

  // ---------- butterflies over flower beds (daytime) ----------
  function drawButterflies(L, t) {
    if (L.night > 0.6 || reduceMotion) return;
    const v = Math.sqrt(vis());
    for (const b of town.butterflies) {
      const tt = t * b.sp + b.ph;
      const x = b.hx + Math.sin(tt * 0.9) * 26 + Math.sin(tt * 2.3) * 8;
      const y = b.hy + Math.cos(tt * 1.3) * 14 - Math.abs(Math.sin(tt * 3)) * 6;
      const wing = Math.abs(Math.sin(t * 14 + b.ph)) * 4 * v + 1;
      ctx.fillStyle = b.c;
      ctx.beginPath(); ctx.ellipse(x - wing * 0.6, y, wing, 3.2 * v, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + wing * 0.6, y, wing, 3.2 * v, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(60,40,30,0.8)";
      ctx.fillRect(x - 0.5 * v, y - 2.5 * v, 1 * v, 5 * v);
    }
  }

  // ---------- glows: lamps and window screens ----------
  function glow(x, y, r, a, rgb) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- night shading via a light map (screen space) ----------
  function drawNight(L, t) {
    if (L.night < 0.01) return;
    const n = L.night;
    const base = [255 - n * 185, 255 - n * 170, 255 - n * 115]; // toward deep blue
    if (L.dusk > 0) { base[0] = Math.min(255, base[0] + 50 * L.dusk); base[1] += 10 * L.dusk; base[2] -= 25 * L.dusk; }
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    lctx.fillStyle = `rgb(${base.map((v) => Math.round(v)).join(",")})`;
    lctx.fillRect(0, 0, lm.width, lm.height);
    lctx.globalCompositeOperation = "lighter";
    const S = cam.s * dpr;
    const add = (wx, wy, wr, k) => {
      const x = (wx - cam.x) * S, y = (wy - cam.y) * S, r = wr * S;
      if (x < -r || y < -r || x > lm.width + r || y > lm.height + r) return;
      const g = lctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,205,150,${k})`);
      g.addColorStop(1, "rgba(255,205,150,0)");
      lctx.fillStyle = g;
      lctx.beginPath(); lctx.arc(x, y, r, 0, Math.PI * 2); lctx.fill();
    };
    for (const l of town.lamps) add(l.x, l.y, l.r * 1.4, 0.85 * n * lampFlick(t, l.ph));
    for (const w of town.fx.windows) add(w.x, w.y, w.r * 1.3, 0.55 * n);
    for (const f of town.fx.fire) add(f.x, f.y - f.h * 0.3, f.w * 3.5, 0.9 * n * flick(t, 2));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(lm, 0, 0);
    ctx.restore();
  }

  function drawFade() {
    if (fade <= 0) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(20,19,15,${fade})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    try { drawFrame(now); updateHover(); syncMeeting(); } catch (e) { console.error(e); }   // one bad frame never stops the village
    requestAnimationFrame(frame);
  }
  function drawFrame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = reduceMotion ? 0 : now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#14130f";
    ctx.fillRect(0, 0, W, H);
    if (town && inside) {
      updateFade(dt);
      updatePlayer(dt);
      updateAide(dt);
      for (const r of town.people) updateResident(r, dt);
      updateCourt(dt);
      animateAll(dt);
      if (follow && !grab) centerOnPlayer(Math.min(1, dt * 6));
      ctx.save();
      ctx.scale(cam.s, cam.s);
      ctx.translate(-cam.x, -cam.y);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(inside.img, 0, 0, inside.w, inside.h);
      player.drawn = aide.drawn = false; for (const r of town.people) r.drawn = false; for (const c of court.people) c.drawn = false;
      // depth order: walk down the hall drawing courtiers and everyone else by their feet
      const ys = [...new Set(court.active && inThroneHall() ? court.people.map((c) => c.y) : [])].sort((a, b) => a - b);
      for (const y of ys) { drawActors(y); drawCourt(y); }
      drawActors(Infinity);
      for (const a of [aide, ...town.people.filter((r) => r.visible), ...(court.active && inThroneHall() ? court.people.filter((c) => !(c.delay > 0)) : [])]) if (a.img) drawLabel(a);
      for (const r of town.people) drawBubble(r);
      ctx.restore();
      drawFade();
      clockEl.textContent = inside.house.name;
    } else if (town) {
      updateFade(dt);
      updatePlayer(dt);
      updateAide(dt);
      for (const r of town.people) updateResident(r, dt);
      animateAll(dt);
      if (follow && !grab) centerOnPlayer(Math.min(1, dt * 6));
      const L = lighting();
      ctx.save();
      ctx.scale(cam.s, cam.s);
      ctx.translate(-cam.x, -cam.y);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(town.img, 0, 0);
      for (const w of town.water) drawWater(w, t, dt);
      for (const f of town.fx.flags || []) drawFlag(f, t);
      drawCanopies(t);
      player.drawn = aide.drawn = false; for (const r of town.people) r.drawn = false;
      for (const p of town.props) { drawActors(p.y); drawProp(p, t); }
      drawActors(Infinity);
      drawRoofs(dt);
      if (town.key === "world") drawWorldMarkers();
      drawOverRoofs(t);
      drawEditOverlay();
      for (const a of [aide, ...town.people.filter((r) => r.visible)]) if (a.img) drawLabel(a);
      for (const r of town.people) drawBubble(r);
      updateFalls(t, dt);
      drawButterflies(L, t);
      drawClouds(L, dt);
      for (const s of town.smoke) drawSmoke(s, t, dt);
      for (const f of town.fx.fire || []) drawFire(f, t);
      updateLeaves(t, dt);
      drawBirds(L, t, dt);
      ctx.restore();

      drawNight(L, t);

      // warm glows on top (lamps and lit window screens), stronger as night falls
      ctx.save();
      ctx.scale(cam.s, cam.s);
      ctx.translate(-cam.x, -cam.y);
      ctx.globalCompositeOperation = "lighter";
      for (const l of town.lamps) glow(l.x, l.y, l.r * (0.35 + 0.45 * L.night), (0.12 + 0.5 * L.night) * lampFlick(t, l.ph), "255,180,90");
      for (const w of town.fx.windows) {
        const fl = 0.92 + 0.08 * Math.sin(t * 0.9 + w.ph) * Math.sin(t * 0.5 + w.ph * 3);
        glow(w.x, w.y, w.r * 0.8, (0.03 + 0.32 * L.night) * fl, "255,190,110");
      }
      ctx.restore();

      drawFade();
      clockEl.textContent = lightMode === "auto"
        ? new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : lightMode === "day" ? "Daytime" : "Night";
    }
  }

  // ---------- quiet ambience: soft wind with the odd bird ----------
  let audio = null;
  function startAudio() {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const master = ac.createGain();
    if (ac.state === "suspended") ac.resume();
    master.gain.setValueAtTime(0, ac.currentTime);
    master.connect(ac.destination);
    master.gain.linearRampToValueAtTime(1, ac.currentTime + 1.5);
    // (the wind sound was removed at the director's request; only the odd bird remains)
    // the odd bird: a short two-to-four note chirp every so often
    function bird() {
      if (!audio || audio.muted) { audio && (audio.timer = setTimeout(bird, 8000)); return; }
      const t0 = ac.currentTime + 0.05;
      const notes = 2 + ((Math.random() * 3) | 0);
      const base = rand(2400, 3600);
      const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      if (pan) { pan.pan.value = rand(-0.8, 0.8); pan.connect(master); }
      for (let i = 0; i < notes; i++) {
        const o = ac.createOscillator(); const g = ac.createGain();
        const s = t0 + i * rand(0.11, 0.17);
        const f0 = base * rand(0.9, 1.15);
        o.type = "sine";
        o.frequency.setValueAtTime(f0, s);
        o.frequency.exponentialRampToValueAtTime(f0 * rand(1.15, 1.45), s + 0.07);
        g.gain.setValueAtTime(0, s);
        g.gain.linearRampToValueAtTime(0.09, s + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
        o.connect(g).connect(pan || master);
        o.start(s); o.stop(s + 0.12);
      }
      audio.timer = setTimeout(bird, rand(5000, 14000));
    }
    audio = { ac, master, muted: false, timer: setTimeout(bird, rand(1200, 2500)) };
  }
  const soundBtn = document.getElementById("sound");
  soundBtn.addEventListener("click", () => {
    if (!audio) startAudio();
    else if (audio.muted) { audio.muted = false; audio.ac.resume(); audio.master.gain.setValueAtTime(0, audio.ac.currentTime); audio.master.gain.linearRampToValueAtTime(1, audio.ac.currentTime + 1); }
    else { audio.muted = true; audio.master.gain.setValueAtTime(audio.master.gain.value, audio.ac.currentTime); audio.master.gain.linearRampToValueAtTime(0, audio.ac.currentTime + 0.5); }
    const on = audio && !audio.muted;
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.textContent = on ? "Sound on" : "Sound off";
  });

  // ---------- talking to the agents ----------
  // Walk up to anyone and press T: a chat box opens on the right and they answer in their own voice,
  // knowing their own instructions and notes. Double-tap M anywhere for 영의정 이균 (chief of staff):
  // what you order him he hands to the right 사또, and those exchanges appear in the Orders log on the left.
  // Answers come from claude.ai's built-in "ask Claude" (the `sample` capability), on the director's own
  // Claude account and plan: no API keys, no pay-per-use. Nothing runs unless the 임금 sends a message.
  const CHIEF = "yeonguijeong-i-gyun";
  const MODEL_ID = { "Opus 5.5": "claude-opus-5-5", "Sonnet 5.5": "claude-sonnet-5-5" }; // never Fable
  const ALL_AGENTS = ["yeonguijeong-i-gyun", "sangseon-kim-mosim", "naegwan-yun-pyeonji", "naegwan-gwak-gotgan", "sanggung-jeong-sallim",
    "sagwan-o-namgim", "seonbi-seo-mureum", "daejangjangi-soedori", "munjangga-song-geulwol", "yeokgwan-han-dari", "cheonmungwan-nam-byeol",
    "hwawon-i-but", "moksu-jang-ieum", "amhaengeosa-bak-moreum",
    "jwauijeong-han-salpim", "ujeong-go-neolbeum", "ijopanseo-in-goreum", "hojopanseo-mun-semdol", "yejopanseo-i-yejeol", "byeongjopanseo-gang-bangpae", "hyeongjopanseo-gong-bareum", "gongjopanseo-seok-ssaeum", "doseungji-seo-batdeum", "daesaheon-eom-salpim", "daesagan-jeong-goteun"];
  const chatEl = document.getElementById("chat"), ordersEl = document.getElementById("orders");
  const chatLog = chatEl.querySelector(".log"), chatForm = chatEl.querySelector("form"), chatInput = chatEl.querySelector("textarea");
  const ordersLog = ordersEl.querySelector(".log");
  let samplePromise = null, chatWith = null, chatBusy = null;
  // ---------- village safety rules: enforced by the code, not just told to the agents ----------
  // 1. Email is always a draft: no tool that sends can ever be called.  2. Nobody spends money or Higgsfield credits:
  // the page has no payment or Higgsfield access at all, and no spending tool can be called.  3. Nobody publishes, posts
  // or lists anything: no such tool can be called, and the page cannot republish itself.  4. Everything finished waits
  // for the 임금's own click to approve; no agent and no code path can approve for him.
  // Agents' answers are only text: every Claude call goes through safeSample, which refuses page tools outright; the only
  // connector tool the page may ever call is the free local model's chat, checked by safeCallTool.
  const SAFETY = Object.freeze({
    allowedTools: Object.freeze(["host:ollama/ollama_chat"]),
    forbidden: /send|post|publish|tweet|share|upload|deploy|list_?(item|product)|create_?(listing|product|order|campaign|ad)|purchase|buy|pay|charge|checkout|refund|transfer|spend|credit|generate|upscale|invoice/i,
    rules: "Village safety rules, enforced by the village itself: email is always only a draft and can never be sent; nobody can spend money or Higgsfield credits; nobody can publish, post or list anything; everything finished goes to the 임금 for his own approval, and nobody else, not even 영의정 이균, can approve it.",
  });
  // pictures only ever come from the village's own files: never an outside address a record could smuggle in
  const safeAsset = (u) => (typeof u === "string" && /^assets\/[A-Za-z0-9_\-\/.]+\.(webp|png|jpg|jpeg)$/.test(u) && !u.includes("..") ? u : "");
  // text an agent wrote, stored in a record: short, plain, no links or control characters
  const plainText = (x, max) => String(x == null ? "" : x).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/https?:\/\/\S+|www\.\S+/gi, "").replace(/\s+/g, " ").trim().slice(0, max || 400);
  function safeCallTool(mcp, server, tool, input) {
    const key = server + "/" + tool;
    if (!SAFETY.allowedTools.includes(key) || (SAFETY.forbidden.test(tool) && !/^.*draft.*$/i.test(tool)) || /send/i.test(tool))
      return Promise.reject({ code: "blocked_by_village_rules", message: "Blocked by the village safety rules: " + key });
    return mcp.callTool(server, tool, input);
  }
  function safeSample(raw) {      // agents get words only: any call that tries to hand Claude tools is refused
    if (!raw) return null;
    const guard = (o) => { if (o && o.tools) throw { code: "blocked_by_village_rules", message: "Agents can't be given tools." }; return o; };
    const f = (input, opts) => { try { return raw(input, guard(opts)); } catch (e) { return Promise.reject(e); } };
    f.json = (input, opts) => { try { return raw.json(input, guard(opts)); } catch (e) { return Promise.reject(e); } };
    f.limits = () => raw.limits();
    return Object.freeze(f);
  }
  const getSample = () => (samplePromise ||= (window.claude && claude.use ? claude.use("sample").then(safeSample).catch(() => null) : Promise.resolve(null)));
  const textCache = new Map();
  const getText = (u) => { if (!textCache.has(u)) textCache.set(u, fetch(u).then((r) => (r.ok ? r.text() : "")).catch(() => "")); return textCache.get(u); };
  const chatKey = (id) => "village.chat." + id;
  const ORDERS_KEY = "village.orders";

  async function roster(forId) {   // the people this agent needs: their own town; a 사또 also knows the 영의정 and the 상선
    const ps = (await Promise.all(ALL_AGENTS.map(profileOf))).filter(Boolean), me = ps.find((p) => p.id === forId);
    const keep = (p) => !me || p.townId === me.townId || (me.title === "사또" && (p.id === CHIEF || p.id === "sangseon-kim-mosim")) || (me.id === CHIEF && p.title === "사또");
    return ps.filter(keep).map((p) => `- ${p.display} (${p.townId === "mojoco" ? "Mojoco" : "Jung City"}): ${p.role || ""} Reports to: ${p.boss || "?"}.`).join("\n");
  }
  // ---------- notes learned on the job (database collection "agentnotes", one document per agent) ----------
  const learned = {};
  async function notesDb() { return (window.claude && claude.use ? await claude.use("db").catch(() => null) : null); }
  async function getLearned(id) {
    if (learned[id]) return learned[id];
    let list = [];
    const db = await notesDb();
    if (db) { try { const d = await db.collection("agentnotes").doc(id).get(); list = (d && d.data() && d.data().notes) || []; } catch (e) {} }
    else list = store.get("village.agentnotes." + id, []);
    return (learned[id] = list);
  }
  async function addLearned(id, text) {
    const list = [...(await getLearned(id)), { t: Date.now(), text: plainText(text, 300) }].slice(-30);
    learned[id] = list;
    const db = await notesDb();
    if (db) { try { await db.collection("agentnotes").doc(id).set({ notes: list }); return; } catch (e) { console.warn(e); } }
    store.set("village.agentnotes." + id, list);
  }
  // after the 임금 approves, the worker writes down what's worth remembering (one short Sonnet reply)
  async function learnFrom(t) {
    const sample = await getSample(); if (!sample || !t.doerId) return;
    const p = await profileOf(t.doerId); if (!p) return;
    const fixes = t.steps.filter((s2) => /^Sent (it )?back/.test(s2.text)).map((s2) => s2.who + ": " + s2.text).join("\n");
    try {
      const { text } = await sample(`You are ${p.display} in "My AI Village" (${p.role}). The 임금 just approved your work.
Task: "${t.text}"
What you did: ${t.summary}
${fixes ? "It was sent back along the way:\n" + fixes + "\n" : ""}Write ONE or TWO short sentences worth remembering for next time: how the 임금 likes things, or a lesson about this kind of work. Plain sentences only, no heading. If there's nothing worth keeping, reply NONE.`, { ...SONNET, cache: false });
      const note = String(text || "").trim();
      if (note && !/^none\b/i.test(note)) { await addLearned(t.doerId, note); step(t, p.display, "Noted for next time: " + note); }
    } catch (e) { console.warn(e); }
  }
  async function characterBrief(id, extra) {
    const p = await profileOf(id);
    if (p && p.candidate) {
      const h = HIRES[id];
      return `You are ${p.display}, a candidate in "My AI Village", a Joseon-era village where every character is an AI agent serving the 임금 (the King, the real person who owns the village). 영의정 이균 brought you to the town hall; the 임금 is interviewing you.
The job: ${p.role} You would work under ${p.boss}. Why you'd help: ${h.why}
Your personality: ${p.personality}
Answer his interview questions honestly and in character: what you'd do, how you'd work, what you're good and not good at. Address him respectfully (e.g. 전하). Reply in the language he uses, 1-4 sentences. You are not hired yet; don't act as if you are. You can only talk.
${extra || ""}`;
    }
    const [ins, notes, team, lessons] = await Promise.all([getText(`agents/${id}/INSTRUCTIONS.md`), getText(`agents/${id}/NOTES.md`), roster(id), getLearned(id)]);
    return `You are ${p.display}, a character in "My AI Village", a Joseon-era village where every character is an AI agent serving the 임금 (the King). The 임금 is the real person who owns this village.
Stay fully in character: your own personality, voice and manners, addressing the 임금 respectfully (e.g. 전하).

Your standing instructions:
<instructions>
${ins.slice(0, 12000)}
</instructions>

Your own notes (your memory):
<notes>
${notes.slice(0, 8000)}
</notes>
${lessons.length ? "\nWhat you've learned on the job (newest last):\n" + lessons.slice(-12).map((l) => "- " + l.text).join("\n") + "\n" : ""}

The people you work with:
${team}

Rules for this conversation:
- Reply in the language the other person writes in. Keep it short and natural (1-4 sentences) unless asked for more.
- Right now you can only talk. You cannot send email, open files, browse or do real work outside this conversation, so never claim you have done something; say what you will do or who should handle it.
- Never invent facts about the 임금's life or data; if you don't know, say so.
- ${SAFETY.rules} If something needs one of those, prepare it and leave the action to the 임금.
${extra || ""}`;
  }
  const SONNET = Object.freeze({ model: "claude-sonnet-5-5", modelTier: "default" });
  function modelOpts(p) {
    const model = MODEL_ID[p && p.model];
    return model ? { model, modelTier: /opus/.test(model) ? "complex" : "default" } : { modelTier: "default" };
  }
  const errText = (e) => ({ not_granted: "Claude isn't allowed on this page. Allow it from the page's permissions to talk.", sampling_disabled: "Claude isn't available on this account.",
    rate_limited: "Too many messages, or your plan's usage limit was reached. Try again later.", session_expired: "Please sign in to claude.ai again.",
    refused: "They wouldn't answer that one.", cancelled: "Stopped." }[e && e.code] || "Couldn't get an answer. Try again.");

  function bubble(logEl, who, text, cls) {
    const d = document.createElement("div"); d.className = "msg " + (cls || "");
    if (who) { const n = document.createElement("div"); n.className = "who"; n.textContent = who; d.append(n); }
    const t = document.createElement("div"); t.className = "txt"; t.textContent = text; d.append(t);
    logEl.append(d); logEl.scrollTop = logEl.scrollHeight; return t;
  }
  async function renderChat() {
    chatLog.innerHTML = "";
    const p = await profileOf(chatWith);
    for (const m of store.get(chatKey(chatWith), [])) bubble(chatLog, m.role === "user" ? "임금" : p.display, m.content, m.role === "user" ? "me" : m.note ? "note" : "");
    if (!store.get(chatKey(chatWith), []).length) bubble(chatLog, "", chatWith === CHIEF ? "Give 영의정 이균 an order, or ask him anything. Orders he passes on appear in the Orders log on the left." : "Say something to start.", "note");
  }
  async function openChat(id) {
    const p = await profileOf(id); if (!p) return;
    chatWith = id;
    chatEl.querySelector(".title").textContent = p.display;
    chatEl.querySelector(".sub").textContent = p.role || "";
    const img = chatEl.querySelector("img"), pic = safeAsset(p.portrait); img.hidden = !pic; if (pic) img.src = pic; img.alt = p.display;
    chatEl.style.setProperty("--home", p.townId === "mojoco" ? CALL_HOME.mojoco : CALL_HOME.hanyang);
    chatEl.hidden = false; chatBtn.setAttribute("aria-pressed", "true");
    await renderChat();
    keys.clear(); chatInput.focus();
  }
  function closeChat() { chatEl.hidden = true; chatBtn.setAttribute("aria-pressed", "false"); if (chatBusy) chatBusy.abort(); chatInput.blur(); }
  function toggleOrders(show) {
    ordersEl.hidden = show === undefined ? !ordersEl.hidden : !show;
    ordersBtn.setAttribute("aria-pressed", String(!ordersEl.hidden));
    if (!ordersEl.hidden) renderOrders();
  }
  function renderOrders() {
    ordersLog.innerHTML = "";
    const all = store.get(ORDERS_KEY, []);
    if (!all.length) bubble(ordersLog, "", "No orders yet. Double-tap M to talk to 영의정 이균; what he hands to a 사또 shows up here.", "note");
    for (const m of all) bubble(ordersLog, m.from + " → " + m.to, m.text, m.from === "영의정 이균" ? "me" : "");
  }
  function addOrder(m) { const all = store.get(ORDERS_KEY, []); all.push({ ...m, t: Date.now() }); store.set(ORDERS_KEY, all.slice(-200)); if (!ordersEl.hidden) renderOrders(); }

  // plain commands the 임금 gives directly: "[name], come here" and "get back to work". No Claude call needed.
  const COME = /(come here|come over|come to me|이리\s*(와|오너라|오게|오시오|오세요|와라)|와\s*봐|오너라)/i;
  const BACK = /(get back to work|go back to work|back to work|return to work|일하러\s*(가|돌아)|업무로\s*돌아|돌아가)/i;
  async function namedIn(text) {   // which agent does this line name? (title + name, name, unique title, or romanized name)
    const ps = (await Promise.all(ALL_AGENTS.map(profileOf))).filter(Boolean), t = text.toLowerCase(), hits = [];
    const titles = {}; for (const p of ps) titles[p.title] = (titles[p.title] || 0) + 1;
    for (const p of ps) {
      const keys = [p.display, p.name, p.id.split("-").slice(1).join(" ")];
      if (titles[p.title] === 1) keys.push(p.title);
      if (p.id === CHIEF) keys.push("chief of staff");
      for (const k of keys) if (k && t.includes(k.toLowerCase())) hits.push({ id: p.id, len: k.length });
    }
    hits.sort((a, b) => b.len - a.len); return hits.length ? hits[0].id : null;
  }
  async function command(text) {
    if (text.length > 120) return false;
    const come = COME.test(text), back = BACK.test(text);
    if (!come && !back) return false;
    const named = await namedIn(text);
    const id = named || chatWith; if (!id) return false;
    const p = await profileOf(id);
    const hist = store.get(chatKey(chatWith), []);
    const note = (t) => { hist.push({ role: "assistant", content: t, note: true }); bubble(chatLog, "", t, "note"); };
    hist.push({ role: "user", content: text }); bubble(chatLog, "임금", text, "me");
    if (come && named && named !== chatWith && (chatWith === CHIEF || chatWith === "sangseon-kim-mosim")) {
      note("📞 " + (await profileOf(chatWith)).display + " calls " + p.display + " (see the log)");
      store.set(chatKey(chatWith), hist);
      queueCall(chatWith, named, "", /[\uac00-\ud7a3]/.test(text));
      return true;
    }
    if (come) {
      const err = await summon(id, () => { if (chatWith !== id || chatEl.hidden) openChat(id); });
      note(err || p.display + " stops what they're doing and comes over.");
    } else note(sendBackToWork(id) || p.display + " isn't in this town.");
    store.set(chatKey(chatWith), hist);
    return true;
  }
  // 영의정 or 상선 rings someone up: the call card shows, the 상선 lifts his 명패, the log shows the call, then the person comes
  let callQueue = Promise.resolve();
  const queueCall = (...a) => (callQueue = callQueue.then(() => phoneCall(...a)).catch((e) => console.warn(e)));
  async function phoneCall(callerId, targetId, words, korean, noSummon) {
    const c = await profileOf(callerId), t = await profileOf(targetId); if (!c || !t) return;
    toggleOrders(true);
    showCall([callerId, targetId], callerId);
    addOrder({ from: "📞 " + c.display, to: t.display, text: words || (korean ? "전하께서 찾으십니다. 지금 바로 오시오." : "His Majesty is asking for you. Please come right away.") });
    await new Promise((res) => setTimeout(res, 1800));
    showCall([callerId, targetId], targetId);
    addOrder({ from: "📞 " + t.display, to: c.display, text: noSummon ? (korean ? "예, 맡겠습니다." : "Understood, I'll take care of it.") : (korean ? "예, 지금 바로 가겠습니다." : "Understood, I'm on my way.") });
    await new Promise((res) => setTimeout(res, 1600));
    endCall();
    if (noSummon) return;
    const err = await summon(targetId, () => { if (chatWith !== targetId || chatEl.hidden) openChat(targetId); });
    if (err) addOrder({ from: c.display, to: "임금", text: err });
  }

  // ---------- a promise makes a task ----------
  // If the 임금 asks someone for something and they say they'll do it, a real task is put on his to-do list from his
  // own words: the agent marks it with [TASK: …], and if they forget, a promise in the reply ("on it", "하겠습니다")
  // to a request is enough.
  const TASK_RULE = "- If you agree to do something the 임금 asks (or promise to do it later), end your reply with one line: [TASK: what you will do, in a few words]. Only for real work you're committing to; never for chat.";
  const TASK_MARK = /\[\s*TASK\s*:\s*([^\]]+)\]/i;
  const stripMark = (x) => String(x || "").replace(TASK_MARK, "").replace(/\[\s*TASK[^\]]*$/i, "").trim();
  const PROMISE = /\b(on it|i'?m on it|i'?ll (do|get|take care|handle|prepare|draft|write|look|send|make|start|have|put|find|check|research)|will do|right away|consider it done|leave it (to|with) me)\b|하겠습니다|하겠소|하겠나이다|맡겠|처리하겠|준비하겠|알아보겠|작성하겠|올리겠|분부(대로| 받들)/i;
  const ASK = /\?|\b(please|can you|could you|would you|i need|i want|make|write|draft|find|prepare|get me|send|check|look into|research|plan|schedule|fix|create|do this|handle)\b|해\s*(줘|주세요|주게|주시오|라)|하시오|하게|하라|부탁|알아봐|만들어|써\s*(줘|주)|준비해/i;
  function askedText(hist, kingText) {   // "yes, do it" alone isn't a task: use what was asked just before
    if (kingText.length >= 20) return kingText;
    const prev = hist.filter((m) => m.role === "user" && !m.note && m.content !== kingText).slice(-1)[0];
    return prev ? prev.content + " — " + kingText : kingText;
  }
  async function makePromisedTask(agentId, text, promise, chiefCall) {
    const p = await profileOf(agentId); if (!p || !text) return null;
    const recent = todos().find((x) => x.promisedById === agentId && x.text === text && Date.now() - x.at < 120000);
    if (recent) return null;
    const t = { id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text, status: "new", stage: "Going to " + p.display, steps: [], at: Date.now(),
      promisedBy: p.display, promisedById: agentId, promise: promise || "" };
    if (chiefCall) { t.dirId = agentId; t.chiefCall = chiefCall; }
    else if (agentId === CHIEF) { /* the chief routes it to a 사또 as usual */ }
    else if (p.title === "사또" || agentId === "sangseon-kim-mosim") t.dirId = agentId;
    else t.doerId0 = agentId;
    saveTodo(t);
    todoQueue = todoQueue.then(() => runTask(t)).catch((err) => console.warn(err));
    return t;
  }
  function taskNote(logEl, hist, p, t) {
    if (!t) return;
    const n = "📋 On your to-do list: " + t.text.slice(0, 80) + (t.text.length > 80 ? "…" : "") + " (" + p.display + ")";
    if (hist) hist.push({ role: "assistant", content: n, note: true });
    bubble(logEl, "", n, "note");
  }
  async function giveToWorker(text) {
    const p = chatWith && await profileOf(chatWith);
    if (!p || p.title !== "사또" || !GIVE_WORKER.test(text)) return false;
    const hist = store.get(chatKey(chatWith), []);
    const before = hist.filter((m) => m.role === "user" && !m.note).slice(-2).map((m) => m.content);
    const stripped = text.replace(GIVE_WORKER, "").replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "");
    const taskText = (stripped.length > 8 ? stripped : before.join(" / ")) || text;
    hist.push({ role: "user", content: text }); bubble(chatLog, "임금", text, "me");
    const n = p.display + " will hand it to a worker. Follow it on your To-do list.";
    hist.push({ role: "assistant", content: n, note: true }); bubble(chatLog, "", n, "note"); store.set(chatKey(chatWith), hist);
    const t = { id: "t" + Date.now().toString(36), text: taskText, status: "new", stage: "Going to " + p.display, steps: [], at: Date.now(), dirId: p.id, forceWorker: true };
    saveTodo(t); todoEl.hidden = false; todoBtn.setAttribute("aria-pressed", "true");
    todoQueue = todoQueue.then(() => runTask(t)).catch((err) => console.warn(err));
    return true;
  }
  async function send(text) {
    if (chatWith && HIRES[chatWith] && HIRES[chatWith].status === "candidate" && (HIRE_YES.test(text.trim()) || HIRE_NO.test(text.trim())) && text.length < 60) {
      const hist = store.get(chatKey(chatWith), []); hist.push({ role: "user", content: text }); store.set(chatKey(chatWith), hist); bubble(chatLog, "임금", text, "me");
      await decideHire(chatWith, HIRE_YES.test(text.trim()));
      bubble(chatLog, "", HIRES[chatWith].status === "hired" ? "Hired." : "Not hired.", "note");
      return;
    }
    if (await command(text)) return;
    if (await giveToWorker(text)) return;
    const sample = await getSample();
    const id = chatWith, p = await profileOf(id);
    const hist = store.get(chatKey(id), []);
    hist.push({ role: "user", content: text }); store.set(chatKey(id), hist);
    if (chatLog.querySelector(".note") && hist.length === 1) chatLog.innerHTML = "";
    bubble(chatLog, "임금", text, "me");
    if (!sample) { bubble(chatLog, "", "Talking needs claude.ai: open the village from claude.ai to chat.", "note"); return; }
    const out = bubble(chatLog, p.display, "…", "");
    const ctl = new AbortController(); chatBusy = ctl; chatEl.classList.add("busy");
    const turns = hist.filter((m) => !m.note).slice(-10).map((m) => ({ role: m.role, content: m.content }));
    while (turns.length && turns[0].role !== "user") turns.shift();
    try {
      if (id === CHIEF || id === "sangseon-kim-mosim") await chiefTurn(sample, p, turns, out, ctl, id);
      else {
        const brief = await characterBrief(id, TASK_RULE);
        const { text: raw } = await sample([{ role: "user", content: brief }, ...turns], { ...modelOpts(p), cache: false, signal: ctl.signal, onText: ({ text: t }) => { out.textContent = stripMark(t); chatLog.scrollTop = chatLog.scrollHeight; } });
        const mark = raw.match(TASK_MARK), reply = stripMark(raw) || raw;
        out.textContent = reply;
        hist.push({ role: "assistant", content: reply });
        if (mark || (PROMISE.test(reply) && ASK.test(text))) taskNote(chatLog, hist, p, await makePromisedTask(id, askedText(hist, text), mark ? mark[1].trim() : reply));
        store.set(chatKey(id), hist);
      }
    } catch (e) {
      out.textContent = (e && e.text) || "";
      bubble(chatLog, "", errText(e), "note");
    } finally { chatBusy = null; chatEl.classList.remove("busy"); }
  }
  // 영의정 이균 answers the 임금 and decides which 사또 (if any) gets the order
  async function chiefTurn(sample, p, turns, out, ctl, who) {
    who = who || CHIEF;
    const dirs = (await Promise.all(ALL_AGENTS.map(profileOf))).filter((d) => d && d.title === "사또");
    const callable = (await Promise.all(ALL_AGENTS.map(profileOf))).filter((d) => d && d.id !== who);
    const summonRule = `- If the 임금 asks you to get, fetch, call, summon or bring someone, you ring them on your phone (your 명패) and tell them to come to him. Add each to "summon" with what you say on the call. People you can call (use the id):
${callable.map((d) => `  - "${d.id}": ${d.display}`).join("\n")}`;
    const extra = who !== CHIEF ? `${summonRule}
- Reply with ONLY a JSON object, no other text: {"reply": "what you say to the 임금, in character", "summon": [{"to": "<id>", "message": "what you say on the call, in character"}], "task": true or false}. Use "summon": [] when nobody needs calling. Set "task": true when you agree to do (or have your household do) something he asked.` : `${summonRule}
- You are the 임금's chief of staff, always looking for ways to make the team better. If he asks you to find or hire someone (or a 사또 or the 상선 needs help), add "hire": {"for": "<the 사또's id, or sangseon-kim-mosim>", "need": "what kind of worker"}.
- When he gives you an order or task, delegate it to the right 사또 (director). The 사또 available now:
${dirs.map((d) => `  - id "${d.id}": ${d.display} of ${d.townId === "mojoco" ? "Mojoco" : d.townId}. ${d.role}`).join("\n")}
- Personal matters are not yours: say they go to 상선 김모심. Questions, greetings and chat need no order.
- Reply with ONLY a JSON object, no other text: {"reply": "what you say to the 임금, in character", "orders": [{"to": "<사또 id from the list>", "message": "what you tell that 사또, in character"}], "summon": [{"to": "<id>", "message": "what you say on the call, in character"}]}. Use [] for orders or summon when there's nothing.`;
    const brief = await characterBrief(who, extra);
    out.textContent = "…";
    const res = await sample.json([{ role: "user", content: brief }, ...turns], { ...modelOpts(p), cache: false, signal: ctl.signal });
    const reply = String((res && res.reply) || "").trim() || "전하, 분부 받들겠습니다.";
    out.textContent = reply;
    const hist = store.get(chatKey(who), []); hist.push({ role: "assistant", content: reply });
    const calls = Array.isArray(res && res.summon) ? res.summon.filter((o) => o && callable.some((d) => d.id === o.to)) : [];
    const korean = /[\uac00-\ud7a3]/.test(turns.length ? turns[turns.length - 1].content : "");
    for (const o of calls) { const d = callable.find((x) => x.id === o.to); const t = "📞 Calling " + d.display + " (see the log)"; hist.push({ role: "assistant", content: t, note: true }); bubble(chatLog, "", t, "note"); }
    const orders = who !== CHIEF ? [] : Array.isArray(res && res.orders) ? res.orders.filter((o) => o && dirs.some((d) => d.id === o.to) && o.message) : [];
    for (const o of orders) { const d = dirs.find((x) => x.id === o.to); hist.push({ role: "assistant", content: "→ Sent to " + d.display + " (see the Orders log)", note: true }); bubble(chatLog, "", "→ Sent to " + d.display + " (see the Orders log)", "note"); }
    store.set(chatKey(who), hist);
    if (who === CHIEF && res && res.hire && res.hire.for) setTimeout(() => findCandidate(String(res.hire.for), String(res.hire.need || ""), ""), 0);
    for (const o of calls) queueCall(who, o.to, String(o.message || ""), korean);
    if (orders.length) toggleOrders(true);
    const asked = askedText(hist, turns.length ? turns[turns.length - 1].content : "");
    for (const o of orders) taskNote(chatLog, null, await profileOf(o.to), await makePromisedTask(o.to, asked, String(o.message), String(o.message)));
    if (!orders.length && !calls.length && (PROMISE.test(reply) || (res && res.task)) && ASK.test(asked)) {
      const t = await makePromisedTask(who, asked, reply);
      if (t) { const h2 = store.get(chatKey(who), []); taskNote(chatLog, h2, p, t); store.set(chatKey(who), h2); }
    }
  }
  // the 사또 hears the order from the 영의정 and answers him, in their own voice
  async function directorTurn(sample, id, message) {
    const d = await profileOf(id);
    addOrder({ from: "영의정 이균", to: d.display, text: message });
    const key = "village.chat.from-chief." + id, hist = store.get(key, []);
    hist.push({ role: "user", content: "영의정 이균 (the 임금's chief of staff) sends you this order: " + message });
    const brief = await characterBrief(id, "- You are answering 영의정 이균, not the 임금. Acknowledge the order in character and say how you'll handle it: who in your town you'd assign and what you'd check. You can't actually start the work yet.");
    const out = bubble(ordersLog, d.display + " → 영의정 이균", "…", "");
    try {
      const { text } = await sample([{ role: "user", content: brief }, ...hist.slice(-10)], { ...modelOpts(d), cache: false, onText: ({ text: t }) => { out.textContent = t; ordersLog.scrollTop = ordersLog.scrollHeight; } });
      hist.push({ role: "assistant", content: text }); store.set(key, hist.slice(-40));
      out.parentElement.remove(); addOrder({ from: d.display, to: "영의정 이균", text });
    } catch (e) { out.textContent = (e && e.text) || errText(e); }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim(); if (!text || chatBusy || !chatWith) return;
    chatInput.value = ""; send(text);
  });
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); }
    if (e.key === "Escape") { chatInput.blur(); }
  });
  chatEl.querySelector(".close").addEventListener("click", closeChat);
  chatEl.querySelector(".stop").addEventListener("click", () => chatBusy && chatBusy.abort());
  ordersEl.querySelector(".close").addEventListener("click", () => toggleOrders(false));
  ordersEl.querySelector(".clear").addEventListener("click", () => { store.set(ORDERS_KEY, []); renderOrders(); });
  chatEl.querySelector(".clear").addEventListener("click", () => { if (chatWith) { store.set(chatKey(chatWith), []); renderChat(); } });
  const chatBtn = document.getElementById("chat-btn"), ordersBtn = document.getElementById("orders-btn");
  // the briefing: 영의정 sums up what's done, what's waiting for the 임금, and what's stuck
  document.getElementById("brief-btn").addEventListener("click", async (e) => {
    if (!e.isTrusted) return;
    await openChat(CHIEF);
    const sample = await getSample();
    if (!sample) { bubble(chatLog, "", "Talking needs claude.ai: open the village from claude.ai.", "note"); return; }
    const all = todos(), day = Date.now() - 24 * 3600e3;
    const line = (t) => `- ${t.text} [${t.status}${t.doer ? ", by " + t.doer : ""}${t.stage ? ", " + t.stage : ""}]`;
    const facts = `Done in the last day:\n${all.filter((t) => t.status === "done" && t.doneAt > day).map(line).join("\n") || "(none)"}
Waiting for the 임금's approval:\n${all.filter((t) => t.status === "review").map(line).join("\n") || "(none)"}
In progress:\n${all.filter((t) => t.status === "working" || t.status === "new").map(line).join("\n") || "(none)"}
Stuck or needing him:\n${all.filter((t) => t.status === "needs" || t.status === "failed").map(line).join("\n") || "(none)"}
Candidates waiting in the town hall: ${Object.values(HIRES).filter((h) => h.status === "candidate").map((h) => h.display).join(", ") || "none"}`;
    const out = bubble(chatLog, "영의정 이균", "…", "");
    try {
      const { text } = await sample(`You are 영의정 이균, the 임금's even-handed, calm chief of staff in "My AI Village". Give him his morning briefing from these facts only (don't invent anything):
${facts}
Start with what needs HIM (approvals, stuck items, candidates), then what's done, then what's in progress. Short, clear, in character, addressing him as 전하. Use the language of the task texts.`, { ...SONNET, cache: false, onText: ({ text: t2 }) => { out.textContent = t2; chatLog.scrollTop = chatLog.scrollHeight; } });
      const h = store.get(chatKey(CHIEF), []); h.push({ role: "assistant", content: text }); store.set(chatKey(CHIEF), h);
    } catch (err) { out.textContent = errText(err); }
  });
  chatBtn.addEventListener("click", () => (chatEl.hidden ? openChat(chatWith || CHIEF) : closeChat()));
  ordersBtn.addEventListener("click", () => toggleOrders());

  // who's close enough to talk to?
  function nearestPerson() {
    const ps = playerSpace(), list = [];   // 상선 김모심 is never picked by T: double-tap N for him
    if (town) for (const r of town.people) if (r.visible && !r.hidden && !r.inMeeting && sameSpace(r, ps)) list.push({ a: r, id: r.id });
    if (court.active && inThroneHall()) for (const c of court.people) if (!(c.delay > 0)) list.push({ a: c, id: c.id });
    let best = null, bd = player.h * 2.2;
    for (const t of list) { const d = Math.hypot(t.a.x - player.x, (t.a.y - player.y) * 1.3); if (d < bd) { bd = d; best = t; } }
    return best && (PROFILE_ALIAS[best.id] || best.id);
  }
  let lastM = 0, lastN = 0;
  window.addEventListener("keydown", (e) => {
    if (e.repeat || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === "KeyT" && town) {
      const id = nearestPerson();
      if (id) { e.preventDefault(); openChat(id); } else flashHint("Walk up to someone, then press T to talk.");
    } else if (e.code === "KeyM") {
      const now = performance.now();
      if (now - lastM < 450) { e.preventDefault(); lastM = 0; openChat(CHIEF); } else lastM = now;
    } else if (e.code === "KeyN") {
      const now = performance.now();
      if (now - lastN < 450) { e.preventDefault(); lastN = 0; openChat("sangseon-kim-mosim"); } else lastN = now;
    } else if (e.code === "Escape" && !chatEl.hidden) closeChat();
  });
  const hintEl = document.querySelector(".hint");
  let hintT = null;
  function flashHint(msg) {   // the bottom hint line is gone: short tips show as a brief toast instead
    showToast(msg, "", null); clearTimeout(hintT); hintT = setTimeout(() => { toastEl.hidden = true; }, 2200);
  }


  // ---------- meeting chat: talk to the whole room, or to one person in it ----------
  // Shown on the left while a court meeting is on in the throne hall. "Everyone" is picked first: the room hears
  // you and whoever has something to say answers. Click a face to talk to just that person (the rest still hear).
  const meetEl = document.getElementById("meetchat"), meetWho = meetEl.querySelector(".people"), meetLog = meetEl.querySelector(".log");
  const meetForm = meetEl.querySelector("form"), meetInput = meetEl.querySelector("textarea"), meetSize = meetEl.querySelector(".size input");
  const MEET_KEY = "village.meeting";
  let meetTo = "all", meetShown = false, meetClosed = false, meetBusy = null;
  try { const v = store.get("village.meet.av", 64); meetSize.value = v; meetEl.style.setProperty("--av", v + "px"); } catch (e) {}
  try { const sz = store.get("village.meet.size", null); if (sz) { meetEl.style.width = sz.w + "px"; meetEl.style.height = sz.h + "px"; } } catch (e) {}
  meetSize.addEventListener("input", () => { meetEl.style.setProperty("--av", meetSize.value + "px"); store.set("village.meet.av", +meetSize.value); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (!meetEl.hidden) store.set("village.meet.size", { w: meetEl.offsetWidth, h: meetEl.offsetHeight }); }).observe(meetEl);
  const meetingIds = () => ["sangseon-kim-mosim", ...court.people.map((c) => PROFILE_ALIAS[c.id] || c.id)];
  async function renderMeetPeople() {
    meetWho.innerHTML = "";
    const chip = (id, label, src) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "person"; b.setAttribute("aria-pressed", String(meetTo === id));
      if (safeAsset(src)) { const im = document.createElement("img"); im.src = safeAsset(src); im.alt = ""; b.append(im); } else { const e = document.createElement("span"); e.className = "all"; e.textContent = "全"; b.append(e); }
      const n = document.createElement("span"); n.className = "nm"; n.textContent = label; b.append(n);
      b.addEventListener("click", () => { meetTo = id; renderMeetPeople(); meetInput.placeholder = id === "all" ? "Speak to everyone…" : "Speak to " + label + "…"; meetInput.focus(); });
      meetWho.append(b);
    };
    chip("all", "Everyone", null);
    for (const p of await Promise.all(meetingIds().map(profileOf))) if (p) chip(p.id, p.display, p.portrait);
  }
  function renderMeetLog() {
    meetLog.innerHTML = "";
    const all = store.get(MEET_KEY, []);
    if (!all.length) bubble(meetLog, "", "The court is listening. Speak to everyone, or click a face to speak to one person.", "note");
    for (const m of all) bubble(meetLog, m.note ? "" : m.from + (m.to ? " → " + m.to : ""), m.text, m.from === "임금" ? "me" : m.note ? "note" : "");
  }
  function addMeet(m) { const all = store.get(MEET_KEY, []); all.push(m); store.set(MEET_KEY, all.slice(-300)); }
  function syncMeeting() {          // called every frame: show the box while the meeting is on
    const on = court.active && !!inside && inThroneHall();
    if (on && !meetShown) { meetShown = true; meetClosed = false; meetTo = "all"; store.set(MEET_KEY, []); ordersEl.hidden = true; meetEl.hidden = false; meetBtn2.hidden = false; renderMeetPeople(); renderMeetLog(); meetInput.placeholder = "Speak to everyone…"; }
    if (!on && meetShown) { meetShown = false; meetEl.hidden = true; meetBtn2.hidden = true; if (meetBusy) meetBusy.abort(); }
  }
  async function meetSend(text) {
    const sample = await getSample();
    const target = meetTo, ps = (await Promise.all(meetingIds().map(profileOf))).filter(Boolean);
    const tp = target === "all" ? null : ps.find((p) => p.id === target);
    addMeet({ from: "임금", to: tp ? tp.display : "everyone", text });
    renderMeetLog();
    if (!sample) { bubble(meetLog, "", "Talking needs claude.ai: open the village from claude.ai.", "note"); return; }
    const transcript = store.get(MEET_KEY, []).slice(-20).map((m) => `${m.from}${m.to ? " → " + m.to : ""}: ${m.text}`).join("\n");
    const ctl = new AbortController(); meetBusy = ctl; meetEl.classList.add("busy");
    const wait = bubble(meetLog, "", "…", "note");
    try {
      if (tp) {
        const brief = await characterBrief(tp.id, `- You are in a court meeting in the throne hall. The 임금 is on the throne; these officials are present and can hear: ${ps.map((p) => p.display).join(", ")}.
- The meeting so far:
${transcript}
- The 임금 has just spoken to you directly. Answer him.
${TASK_RULE}`);
        const out = wait; out.parentElement.className = "msg"; const who = document.createElement("div"); who.className = "who"; who.textContent = tp.display; out.parentElement.prepend(who);
        const { text: raw } = await sample(brief, { ...modelOpts(tp), cache: false, signal: ctl.signal, onText: ({ text: t }) => { out.textContent = stripMark(t); meetLog.scrollTop = meetLog.scrollHeight; } });
        const mark = raw.match(TASK_MARK), reply = stripMark(raw) || raw;
        addMeet({ from: tp.display, text: reply });
        if (mark || (PROMISE.test(reply) && ASK.test(text))) { const t = await makePromisedTask(tp.id, text, mark ? mark[1].trim() : reply); if (t) addMeet({ from: "", text: "📋 On your to-do list: " + t.text.slice(0, 80) + " (" + tp.display + ")", note: true }); }
      } else {
        const people = await Promise.all(ps.map(async (p) => `### ${p.id} — ${p.display}\nRole: ${p.role}\nReports to: ${p.boss}\n${(await getText(`agents/${p.id}/INSTRUCTIONS.md`)).slice(0, 1500)}`));
        const prompt = `"My AI Village" is a Joseon-era village where every character is an AI agent serving the 임금 (the King, the real person who owns the village). A court meeting is under way in the throne hall: the 임금 sits on the throne and these officials are present, each with their own personality and job:

${people.join("\n\n")}

The meeting so far:
${transcript}

The 임금 has just spoken to the whole room. Decide who would naturally answer: usually 1-3 people whose job it touches (the 영의정 often leads on government matters; the 상선 on the 임금's personal matters). Each speaks in their own voice and manners, addresses the 임금 respectfully (e.g. 전하), replies in the language the 임금 used, and keeps it to 1-3 sentences. They can only talk right now: nobody claims to have done real work.
Reply with ONLY a JSON array, no other text: [{"id": "<id from the list>", "text": "what they say", "task": true if they are agreeing to do something the 임금 asked, else false}]`;
        const res = await sample.json(prompt, { model: "claude-opus-5-5", modelTier: "complex", cache: false, signal: ctl.signal });
        wait.parentElement.remove();
        for (const r of (Array.isArray(res) ? res : []).slice(0, 5)) {
          const p = ps.find((x) => x.id === r.id); if (!p || !r.text) continue;
          addMeet({ from: p.display, text: String(r.text) });
          if ((r.task === true || PROMISE.test(String(r.text))) && ASK.test(text)) { const t = await makePromisedTask(p.id, text, String(r.text)); if (t) addMeet({ from: "", text: "📋 On your to-do list: " + t.text.slice(0, 80) + " (" + p.display + ")", note: true }); }
        }
        renderMeetLog();
      }
    } catch (e) {
      if (wait.isConnected) wait.textContent = (e && e.text) || "";
      bubble(meetLog, "", errText(e), "note");
    } finally { meetBusy = null; meetEl.classList.remove("busy"); renderMeetLog(); }
  }
  meetForm.addEventListener("submit", (e) => { e.preventDefault(); const t = meetInput.value.trim(); if (!t || meetBusy) return; meetInput.value = ""; meetSend(t); });
  meetInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); meetForm.requestSubmit(); } if (e.key === "Escape") meetInput.blur(); });
  meetEl.querySelector(".close").addEventListener("click", () => { meetEl.hidden = true; });
  meetEl.querySelector(".stop").addEventListener("click", () => meetBusy && meetBusy.abort());
  const meetBtn2 = document.getElementById("meetchat-btn");
  meetBtn2.addEventListener("click", () => { meetEl.hidden = !meetEl.hidden; if (!meetEl.hidden) { ordersEl.hidden = true; renderMeetLog(); } });

  // ---------- villagers talking to each other (free, on the director's Mac) ----------
  // Two villagers who meet and have a real reason to talk (one reports to the other, they share a boss, or a recent
  // order touches them) get a short conversation written by Ollama (qwen2.5:3b) on the director's Mac, reached
  // through the Claude desktop app's "ollama" connector. No Claude usage, no API key, nothing paid. Small talk is
  // thrown away. Press C to read the log. Works only when the village is open in the Claude app on that Mac.
  const LOCAL = { server: "host:ollama", tool: "ollama_chat", model: "qwen2.5:3b" };
  const TALK_KEY = "village.chatlog";
  const talkEl = document.getElementById("talklog"), talkLog = talkEl.querySelector(".log"), talkStatus = talkEl.querySelector(".sub");
  let mcpPromise = null, localState = "unknown", talkBusy = false, talkLast = 0, talkSkips = 0;
  const getMcp = () => (mcpPromise ||= (window.claude && claude.use ? claude.use("mcp").catch(() => null) : Promise.resolve(null)));
  getMcp().then((m) => { if (!m) localState = "none"; });
  const SPEC_BOSS = /^Whoever borrows/;
  const PROF = {};   // profiles kept at hand, so the "is there a real reason?" check needs no waiting
  Promise.all(ALL_AGENTS.map(profileOf)).then((ps) => ps.forEach((p) => { if (p) PROF[p.id] = p; }));
  function talkReason(a, b) {
    const pa = PROF[PROFILE_ALIAS[a.id] || a.id], pb = PROF[PROFILE_ALIAS[b.id] || b.id];
    if (!pa || !pb) return null;
    const names = (p) => [p.display, p.name];
    const reasons = [];
    if (names(pb).some((n) => (pa.boss || "").includes(n))) reasons.push(`${pa.display} reports to ${pb.display}.`);
    if (names(pa).some((n) => (pb.boss || "").includes(n))) reasons.push(`${pb.display} reports to ${pa.display}.`);
    if (pa.boss && pa.boss === pb.boss && !SPEC_BOSS.test(pa.boss)) reasons.push(`They both report to ${pa.boss}.`);
    const day = Date.now() - 24 * 3600e3;
    const orders = store.get("village.orders", []).filter((m) => (m.t || 0) > day && [m.from, m.to, m.text].join(" ").match(new RegExp([pa.display, pb.display, pa.name, pb.name].join("|"))));
    if (orders.length) reasons.push("Recent orders that touch them:\n" + orders.slice(-4).map((m) => `${m.from} → ${m.to}: ${m.text}`).join("\n"));
    return reasons.length ? { pa, pb, why: reasons.join("\n") } : null;
  }
  function textOf(payload) {
    if (typeof payload === "string") return payload;
    if (payload && typeof payload === "object") return payload.message?.content || payload.response || payload.content || payload.text || JSON.stringify(payload);
    return "";
  }
  function jsonIn(t) { const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  const CHATTER = /\b(weather|nice day|how are you|good morning|just saying hi)\b|날씨|안녕하세요[.!]?$/i;
  async function writeTalk(a, b, rs) {
    const mcp = await getMcp(); if (!mcp) { localState = "none"; return; }
    const [ia, ib] = await Promise.all([getText(`agents/${rs.pa.id}/INSTRUCTIONS.md`), getText(`agents/${rs.pb.id}/INSTRUCTIONS.md`)]);
    const prompt = `Two officials in a Joseon-era village of AI agents serving the 임금 (the King) have just met on the street.
A: ${rs.pa.display}. Job: ${rs.pa.role} Reports to: ${rs.pa.boss}.
${ia.slice(0, 900)}
B: ${rs.pb.display}. Job: ${rs.pb.role} Reports to: ${rs.pb.boss}.
${ib.slice(0, 900)}
Why they might talk:
${rs.why}
Write their conversation ONLY if they have something real and useful to discuss about their work (a task, an order, a handoff, a question, a deadline). No greetings-only, no weather, no small talk. If there is nothing real, set "talk" to false.
Write in English, keeping Korean titles and names in Hangul. 2 to 6 short lines, each in the speaker's own voice. Nobody claims to have finished real work.
Reply with ONLY JSON: {"talk": true, "topic": "a few words", "lines": [{"who": "A", "text": "..."}, {"who": "B", "text": "..."}]}`;
    let res;
    try { res = await safeCallTool(mcp, LOCAL.server, LOCAL.tool, Object.freeze({ model: LOCAL.model, messages: [{ role: "user", content: prompt }] })); }
    catch (e) {
      const code = e && e.code;
      if (code === "server_not_connected" || code === "blocked_by_policy") localState = "none";
      else if (code === "cancelled" || code === "approval_required" || code === "not_in_manifest") {
        // the Claude app's confirm wasn't answered (or was declined): skip this one and pause a while, never lock it off
        talkSkips++; localState = "asked"; talkLast = performance.now() + Math.min(5, talkSkips) * 60000;
      } else localState = "error";
      setTalkStatus(); return;
    }
    localState = "ok"; talkSkips = 0; setTalkStatus();
    const j = jsonIn(textOf(res && (res.payload !== undefined ? res.payload : res)));
    if (!j || j.talk === false || !Array.isArray(j.lines)) return;
    const lines = j.lines.filter((l) => l && l.text && (l.who === "A" || l.who === "B")).slice(0, 6)
      .map((l) => ({ who: l.who === "A" ? rs.pa.display : rs.pb.display, text: String(l.text).trim() }));
    const body = lines.map((l) => l.text).join(" ");
    if (lines.length < 2 || body.length < 60 || (CHATTER.test(body) && body.length < 160)) return;   // just chatter: not logged
    const all = store.get(TALK_KEY, []);
    all.push({ t: Date.now(), town: town ? town.key : "", topic: String(j.topic || "").slice(0, 60), a: rs.pa.display, b: rs.pb.display, lines });
    store.set(TALK_KEY, all.slice(-200));
    if (!talkEl.hidden) renderTalk();
  }
  const villagerTalk = {
    ready: () => localState !== "none" && !talkBusy && !isNightNow() && performance.now() - talkLast > 25000,
    start(a, b) {     // only a real reason starts a conversation; the words are written in the background
      const rs = talkReason(a, b); if (!rs) return false;
      talkBusy = true; talkLast = performance.now();
      writeTalk(a, b, rs).catch((e) => console.warn(e)).finally(() => { talkBusy = false; });
      return true;
    },
  };
  function setTalkStatus() {
    talkStatus.textContent = localState === "none" ? "Needs Ollama: open the village in the Claude app on your Mac."
      : localState === "asked" ? "The Claude app asked to confirm an Ollama call and it wasn't allowed. Pick \"Always allow\" when it asks; trying again in a few minutes."
      : localState === "error" ? "Ollama didn't answer. Is the Ollama app running?"
      : localState === "ok" ? "Connected · free · written on your Mac by " + LOCAL.model
      : "Waiting for two villagers who work together to meet · free, on your Mac (" + LOCAL.model + ")";
  }
  function renderTalk() {
    setTalkStatus();
    talkLog.innerHTML = "";
    const all = store.get(TALK_KEY, []);
    if (!all.length) bubble(talkLog, "", "No conversations yet. Villagers talk when they meet someone they work with and have something real to say.", "note");
    for (const c of all) {
      const when = new Date(c.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      bubble(talkLog, "", `${when} · ${c.a} & ${c.b}${c.topic ? " · " + c.topic : ""}`, "note");
      for (const l of c.lines) bubble(talkLog, l.who, l.text, l.who === c.a ? "" : "me");
    }
  }
  function toggleTalk(show) {
    talkEl.hidden = show === undefined ? !talkEl.hidden : !show;
    talkBtn.setAttribute("aria-pressed", String(!talkEl.hidden));
    if (!talkEl.hidden) renderTalk();
  }
  const talkBtn = document.getElementById("talk-btn");
  talkBtn.addEventListener("click", () => toggleTalk());
  talkEl.querySelector(".close").addEventListener("click", () => toggleTalk(false));
  talkEl.querySelector(".clear").addEventListener("click", () => { store.set(TALK_KEY, []); renderTalk(); });
  window.addEventListener("keydown", (e) => {
    if (e.code !== "KeyC" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    e.preventDefault(); toggleTalk();
  });

  // ---------- the 임금's to-do list ----------
  // A task typed here goes to 영의정 이균, who phones the right 사또. The 사또 does it or hands it to one of their
  // workers (or borrows a shared specialist), checks the result, and the task is crossed off. Hover a task to see
  // exactly what was done. Runs on the director's Claude plan (the same "ask Claude" as the chats), only when he adds a task.
  // The agents can only write: drafts, plans, research from what they know. Anything needing a real-world action is
  // prepared and handed back as "left for you".
  const TODO_KEY = "village.todos";
  const todoEl = document.getElementById("todo"), todoList = todoEl.querySelector("ul"), todoForm = todoEl.querySelector("form"), todoInput = todoEl.querySelector("input");
  const todoTip = document.getElementById("todotip"), todoBtn = document.getElementById("todo-btn");
  let todoQueue = Promise.resolve();
  const todos = () => store.get(TODO_KEY, []);
  const saveTodo = (t) => { const all = todos(), i = all.findIndex((x) => x.id === t.id); if (i >= 0) all[i] = t; else all.push(t); store.set(TODO_KEY, all.slice(-100)); renderTodos(); };
  const step = (t, who, text) => { t.steps.push({ who, text, at: Date.now() }); saveTodo(t); };
  function renderTodos() {
    const all = todos(), open = all.filter((t) => t.status !== "done").length, waiting = all.filter((t) => t.status === "review").length;
    todoBtn.textContent = waiting ? `To-do (${open} · ${waiting} to approve)` : open ? `To-do (${open})` : "To-do";
    todoList.innerHTML = "";
    if (!all.length) { const li = document.createElement("li"); li.className = "empty"; li.textContent = "Type a task. 영의정 이균 will pass it to the right 사또."; todoList.append(li); return; }
    for (const t of [...all].reverse()) {
      const li = document.createElement("li"); li.className = "task " + t.status; li.dataset.id = t.id;
      const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = { done: "✓", working: "…", needs: "!", failed: "↻", review: "?" }[t.status] || "○";
      const tx = document.createElement("span"); tx.className = "tx"; tx.textContent = t.text;
      const st = document.createElement("span"); st.className = "st"; st.textContent = t.status === "done" ? (t.doer ? "Done by " + t.doer + (t.checker ? " · checked by " + t.checker : "") + (t.rounds > 1 ? " · " + (t.rounds - 1) + " fix" + (t.rounds > 2 ? "es" : "") : "") : "Done") : t.stage || "";
      const del = document.createElement("button"); del.type = "button"; del.className = "del"; del.title = "Remove"; del.textContent = "×";
      del.addEventListener("click", (e) => { e.stopPropagation(); store.set(TODO_KEY, todos().filter((x) => x.id !== t.id)); renderTodos(); hideTip(); });
      const body = document.createElement("div"); body.className = "body"; body.append(tx, st);
      if (t.status === "review") {
        const row = document.createElement("div"); row.className = "approve";
        const ok = document.createElement("button"); ok.type = "button"; ok.className = "ok"; ok.textContent = "Approve";
        const back = document.createElement("button"); back.type = "button"; back.className = "back"; back.textContent = "Send back";
        ok.addEventListener("click", (e) => { e.stopPropagation(); approveTask(e, t.id); });
        back.addEventListener("click", (e) => {
          e.stopPropagation(); if (!e.isTrusted) return;
          row.innerHTML = ""; const inp = document.createElement("input"); inp.placeholder = "What should be fixed?"; const go = document.createElement("button"); go.type = "button"; go.textContent = "Send";
          const sendIt = (ev) => { if (!ev.isTrusted || !inp.value.trim()) return; sendBackTask(t.id, inp.value.trim()); };
          go.addEventListener("click", sendIt); inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") sendIt(ev); });
          row.append(inp, go); inp.focus();
        });
        row.append(ok, back); body.append(row);
      }
      if (t.status === "done") { const rb = document.createElement("button"); rb.type = "button"; rb.className = "pdf"; rb.textContent = "PDF report"; rb.addEventListener("click", (e) => { e.stopPropagation(); saveReport(t.id, rb, e); }); body.append(rb); }
      li.append(ic, body, del);
      li.addEventListener("mouseenter", () => showTip(t.id, li));
      li.addEventListener("mouseleave", () => { tipHover = false; setTimeout(() => { if (!tipHover) hideTip(); }, 150); });
      todoList.append(li);
    }
  }
  let tipHover = false;
  todoTip.addEventListener("mouseenter", () => { tipHover = true; });
  todoTip.addEventListener("mouseleave", () => { tipHover = false; hideTip(); });
  function hideTip() { todoTip.hidden = true; }
  function showTip(id, li) {
    const t = todos().find((x) => x.id === id); if (!t) return;
    todoTip.innerHTML = "";
    const h = document.createElement("div"); h.className = "th"; h.textContent = t.text; todoTip.append(h);
    if (t.doer) { const s = document.createElement("div"); s.className = "tb"; s.textContent = "Done by " + t.doer + (t.checker ? " · Checked by " + t.checker : "") + (t.approvedBy ? " · Approved by you" : t.status === "review" ? " · Waiting for your approval" : "") + (t.rounds > 1 ? " · sent back " + (t.rounds - 1) + "×" : ""); todoTip.append(s); }
    if (t.summary) { const s = document.createElement("div"); s.className = "ts"; s.textContent = t.summary; todoTip.append(s); }
    if (t.left) { const s = document.createElement("div"); s.className = "tl"; s.textContent = "Left for you: " + t.left; todoTip.append(s); }
    const ol = document.createElement("ol");
    for (const s of t.steps) { const li2 = document.createElement("li"); const b = document.createElement("b"); b.textContent = s.who + ": "; li2.append(b, document.createTextNode(s.text)); ol.append(li2); }
    if (t.steps.length) todoTip.append(ol);
    if (t.work) { const w = document.createElement("div"); w.className = "tw"; w.textContent = t.work; todoTip.append(w); }
    todoTip.hidden = false;
    const r = li.getBoundingClientRect(), tw = todoTip.offsetWidth;
    todoTip.style.top = Math.min(r.top, innerHeight - todoTip.offsetHeight - 8) + "px";
    todoTip.style.left = Math.max(8, r.left - tw - 10) + "px";
  }
  // ---------- task reports: a finished task becomes a polished PDF ----------
  // Built in the page from the task's own record (who, instructions, every step and send-back, the result), laid out
  // on A4 hanji-style pages, drawn with html2canvas and bound into a PDF with jsPDF. Saving always asks the 임금 first.
  const RPT_LIBS = ["js/vendor/html2canvas.min.js", "js/vendor/jspdf.umd.min.js"];   // html2canvas 1.4.1 + jsPDF 2.5.1, stored in the village (no outside code)
  let rptLibs = null;
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Couldn't load " + src)); document.head.append(s); });
  const getRptLibs = () => (rptLibs ||= Promise.all(RPT_LIBS.map(loadScript)).catch((e) => { rptLibs = null; throw e; }));
  const esc = (x) => String(x == null ? "" : x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (t) => (t ? new Date(t).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
  const RPT_W = 794, RPT_H = 1123, RPT_PAD = 64;   // A4 at 96 dpi
  function rptStyle() {
    return `<style>
      .rp{width:${RPT_W}px;height:${RPT_H}px;box-sizing:border-box;padding:${RPT_PAD}px ${RPT_PAD}px 80px;position:relative;overflow:hidden;
        background:#f6efe0 radial-gradient(ellipse at 20% 10%,rgba(255,250,238,.9),transparent 60%),radial-gradient(ellipse at 90% 95%,rgba(214,196,160,.35),transparent 55%);
        color:#2a2119;font:400 13.5px/1.6 Inter,"Gowun Batang",system-ui,sans-serif}
      .rp:before{content:"";position:absolute;top:22px;left:22px;right:22px;bottom:22px;border:1.5px solid #b89a5e;border-radius:4px;pointer-events:none}
      .rp:after{content:"";position:absolute;top:28px;left:28px;right:28px;bottom:28px;border:.5px solid rgba(184,154,94,.6);border-radius:2px;pointer-events:none}
      .rp .ft{position:absolute;left:${RPT_PAD}px;right:${RPT_PAD}px;bottom:40px;display:flex;justify-content:space-between;font-size:10px;letter-spacing:.08em;color:#8a7350;text-transform:uppercase}
      .rp h1{font:700 34px/1.25 "Gowun Batang",serif;margin:0 0 10px;color:#2a2119}
      .rp h2{font:700 15px/1.3 "Gowun Batang",serif;letter-spacing:.06em;color:#8b2e22;margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid #d8c59d}
      .rp .kicker{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8a7350;margin-bottom:14px}
      .rp .seal{position:absolute;right:${RPT_PAD + 8}px;top:${RPT_PAD + 4}px;width:86px;height:86px;border:3px solid #b8342b;border-radius:10px;color:#b8342b;
        display:flex;align-items:center;justify-content:center;flex-direction:column;font:700 22px/1.05 "Gowun Batang",serif;transform:rotate(-6deg);opacity:.88}
      .rp .seal small{font:600 9px/1 Inter,sans-serif;letter-spacing:.14em;margin-top:5px}
      .rp .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0 6px}
      .rp .meta div{background:rgba(255,252,244,.75);border:1px solid #e2d3b2;border-radius:8px;padding:9px 12px}
      .rp .meta b{display:block;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8a7350;font-weight:600;margin-bottom:2px}
      .rp .people{display:flex;gap:14px;margin:6px 0}
      .rp .card{flex:1;display:flex;gap:12px;align-items:center;background:rgba(255,252,244,.8);border:1px solid #e2d3b2;border-radius:10px;padding:12px}
      .rp .card img{width:58px;height:58px;border-radius:8px;border:2px solid var(--c,#b8342b);object-fit:cover}
      .rp .card b{display:block;font:700 15px/1.2 "Gowun Batang",serif}
      .rp .card span{font-size:11px;color:#6d5a3e;letter-spacing:.06em;text-transform:uppercase}
      .rp .summary{font:400 16px/1.6 "Gowun Batang",serif;background:rgba(255,252,244,.8);border-left:4px solid #c9a227;border-radius:0 10px 10px 0;padding:14px 18px;margin:6px 0}
      .rp .left{background:#fbefd9;border:1px solid #e9c98f;border-radius:10px;padding:12px 16px;color:#6b4513}
      .rp .left b{display:block;font-size:10px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:3px}
      .rp .step{display:grid;grid-template-columns:22px 1fr;gap:10px;margin:0 0 10px}
      .rp .dot{width:12px;height:12px;border-radius:50%;background:#c9a227;margin:5px 0 0 5px;box-shadow:0 0 0 4px rgba(201,162,39,.18)}
      .rp .step.back .dot{background:#b8342b;box-shadow:0 0 0 4px rgba(184,52,43,.15)}
      .rp .step.ok .dot{background:#5f8a4b;box-shadow:0 0 0 4px rgba(95,138,75,.18)}
      .rp .who{font:700 13px/1.3 "Gowun Batang",serif}
      .rp .when{font-size:10.5px;color:#8a7350;margin-left:6px;font-family:Inter,sans-serif;font-weight:400}
      .rp .txt{white-space:pre-wrap;color:#3b2f22}
      .rp .work{white-space:pre-wrap;background:rgba(255,253,248,.92);border:1px solid #e2d3b2;border-radius:10px;padding:14px 18px;font:400 13.5px/1.7 Inter,"Gowun Batang",sans-serif}
      .rp .cover-line{height:2px;width:120px;background:#c9a227;margin:18px 0}
    </style>`;
  }
  function rptBlocks(t, P) {
    const card = (p, role) => p ? `<div class="card" style="--c:${p.townId === "mojoco" ? "#2f5ea6" : "#b8342b"}"><img src="${esc(safeAsset(p.portrait))}"><div><span>${role}</span><b>${esc(p.display)}</b></div></div>` : "";
    const dur = t.doneAt && t.at ? Math.max(1, Math.round((t.doneAt - t.at) / 60000)) + " min" : "—";
    const out = [];
    out.push(`<div class="kicker">My AI Village · Task report</div><div class="seal">完<small>DONE</small></div>
      <h1>${esc(t.text)}</h1><div class="cover-line"></div>
      <div class="meta"><div><b>Approved by you</b>${esc(fmtTime(t.doneAt))}</div><div><b>Time taken</b>${dur}</div><div><b>Rounds</b>${t.rounds > 1 ? t.rounds + " (" + (t.rounds - 1) + " sent back)" : "1 · approved first time"}</div></div>`);
    out.push(`<h2>WHO</h2><div class="people">${card(P[t.doerId], "Done by")}${card(P[t.checkerId], "Checked by")}</div>`);
    if (t.summary) out.push(`<h2>WHAT WAS DONE</h2><div class="summary">${esc(t.summary)}</div>`);
    if (t.left) out.push(`<div class="left" style="margin-top:12px"><b>Left for you</b>${esc(t.left)}</div>`);
    if (t.instructions) out.push(`<h2>THE HANDOFF</h2><div class="txt">${esc(t.instructions)}</div>`);
    out.push(`<h2>EVERYTHING THAT HAPPENED</h2>`);
    for (const s of t.steps) {
      const cls = /^Sent it back|^Still not good/.test(s.text) ? "back" : /^Checked and approved/.test(s.text) ? "ok" : "";
      out.push(`<div class="step ${cls}"><div class="dot"></div><div><div class="who">${esc(s.who)}<span class="when">${esc(fmtTime(s.at))}</span></div><div class="txt">${esc(s.text)}</div></div></div>`);
    }
    out.push(`<h2>THE RESULT</h2>`);
    const paras = [];
    for (const p of String(t.work || "(no written result)").split(/\n{2,}/)) {   // keep each piece short enough to fit on a page
      let cur = "";
      for (const line of p.split("\n")) { if ((cur + line).length > 1100 && cur) { paras.push(cur); cur = ""; } cur += (cur ? "\n" : "") + line; }
      while (cur.length > 1400) { const cut = cur.lastIndexOf(" ", 1300) > 600 ? cur.lastIndexOf(" ", 1300) : 1300; paras.push(cur.slice(0, cut)); cur = cur.slice(cut).trimStart(); }
      if (cur) paras.push(cur);
    }
    for (const p of paras) out.push(`<div class="work">${esc(p)}</div>`);
    return out;
  }
  async function buildReport(t) {
    const ps = (await Promise.all(ALL_AGENTS.map(profileOf))).filter(Boolean), P = {};
    for (const p of ps) P[p.id] = p;
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;z-index:-1";
    host.innerHTML = rptStyle(); document.body.append(host);
    const pages = [];
    const newPage = () => { const pg = document.createElement("div"); pg.className = "rp"; const body = document.createElement("div"); pg.append(body); host.append(pg); pages.push(pg); return body; };
    let body = newPage();
    const limit = RPT_H - 80 - RPT_PAD;
    for (const html of rptBlocks(t, P)) {
      const tmp = document.createElement("div"); tmp.innerHTML = html;
      const kids = [...tmp.childNodes];
      kids.forEach((k) => body.append(k));
      if (body.offsetHeight > limit && body.childNodes.length > kids.length) {   // spill to a new page
        kids.forEach((k) => k.remove()); body = newPage(); kids.forEach((k) => body.append(k));
      }
    }
    pages.forEach((pg, i) => { const f = document.createElement("div"); f.className = "ft"; f.innerHTML = `<span>My AI Village · ${esc(t.doer || "")}</span><span>${i + 1} / ${pages.length}</span>`; pg.append(f); });
    await Promise.all([...host.querySelectorAll("img")].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await getRptLibs();
    const pdf = new window.jspdf.jsPDF({ unit: "pt", format: "a4", compress: true });
    for (let i = 0; i < pages.length; i++) {
      const canvas = await window.html2canvas(pages[i], { scale: 2, backgroundColor: "#f6efe0", useCORS: true, logging: false });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    }
    host.remove();
    return pdf.output("blob");
  }
  async function saveReport(id, btn, ev) {
    if (!ev || !ev.isTrusted) return;
    const t = todos().find((x) => x.id === id); if (!t) return;
    const old = btn && btn.textContent; if (btn) { btn.disabled = true; btn.textContent = "Making PDF…"; }
    try {
      const blob = await buildReport(t);
      const name = "Task report - " + t.text.replace(/[\\/:*?"<>|]+/g, "").slice(0, 60).trim() + ".pdf";
      const dl = window.claude && claude.use ? await claude.use("downloads").catch(() => null) : null;
      if (dl) await dl.save({ filename: name, data: blob });
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
      if (btn) btn.textContent = "Saved ✓";
    } catch (e) {
      console.warn(e);
      if (btn) btn.textContent = e && e.code ? "Not saved" : "Couldn't make the PDF";
    } finally { if (btn) setTimeout(() => { btn.disabled = false; btn.textContent = old; }, 2500); }
  }
  // the "done" toast: a task just finished, here's its report
  const toastEl = document.getElementById("toast");
  function announceDone(t) {
    toastEl.innerHTML = "";
    const m = document.createElement("span"); m.textContent = "✓ Done: " + t.text.slice(0, 60) + (t.text.length > 60 ? "…" : "");
    const b = document.createElement("button"); b.type = "button"; b.textContent = "Get the PDF report";
    b.addEventListener("click", (e) => saveReport(t.id, b, e));
    const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.textContent = "×"; x.setAttribute("aria-label", "Dismiss");
    x.addEventListener("click", () => { toastEl.hidden = true; });
    toastEl.append(m, b, x); toastEl.hidden = false;
  }

  const GIVE_WORKER = /(give|hand|pass|assign)\s+(this|it|that)\s+to\s+(your|a|one of your)\s+(worker|people|staff|team)|워커|부하|아랫사람|일꾼|맡겨/i;
  // the brief a lead writes when checking work (used by the 사또 for workers, by the 영의정 when a 사또 did it himself)
  async function checkWork(sample, checker, doer, t, round) {
    const b = await characterBrief(checker.id, `- You're checking finished work before it counts as done. Task from the 임금: "${t.text}"
- Done by ${doer.display}${round > 1 ? ` (revision ${round - 1}, after your earlier notes)` : ""}. Their summary: ${t.summary}
${t.instructions ? `- The instructions they were given: ${t.instructions}\n` : ""}- The work:
${t.work.slice(0, 12000)}
- Be a fair but real check: does it do what was asked, is it correct and usable as it stands? Small polish is not a reason to send it back.
- Reply with ONLY JSON: {"ok": true or false, "notes": "if not ok: exactly what to fix; if ok: one sentence for the 임금", "in_character": true}`);
    return sample.json(b, { ...modelOpts(checker), cache: false });
  }
  async function doWork(sample, doer, dir, t, notes) {
    const b = await characterBrief(doer.id, `- Task from the 임금's to-do list: "${t.text}"
- ${t.doerId0 ? t.instructions : doer === dir ? "You took this on yourself." : dir.display + " handed it to you with these instructions:\n" + t.instructions}
${notes ? `- ${dir === doer ? "영의정 이균" : dir.display} sent your last version back. Their notes:\n${notes}\n- Your last version:\n${t.work.slice(0, 8000)}\n- Fix exactly what the notes ask and hand in the whole improved deliverable.\n` : ""}- Do the task as fully as you can in writing: the actual deliverable (the draft, the plan, the list, the answer), not a promise.
- You have no tools, no internet and no access to the 임금's accounts. If part of it needs a real action (sending, buying, booking, posting) or facts you can't know, prepare everything and say exactly what's left for the 임금.
- Write the deliverable in the language of the task.
- Reply with ONLY JSON: {"summary": "one or two sentences on what you did", "work": "the full deliverable", "left": "what's left for the 임금, or empty"}`);
    return sample.json(b, { ...modelOpts(doer), cache: false });
  }
  // only a real click by the 임금 approves: no agent reply, no message and no script can set a task to done
  function approveTask(e, id) {
    if (!e || !e.isTrusted) return;
    const t = todos().find((x) => x.id === id); if (!t || t.status !== "review") return;
    t.status = "done"; t.stage = ""; t.doneAt = Date.now(); t.approvedBy = "임금";
    t.steps.push({ who: "임금", text: "Approved.", at: Date.now() });
    saveTodo(t); hideTip(); announceDone(t);
    learnFrom(t);
  }
  function sendBackTask(id, notes) {
    const t = todos().find((x) => x.id === id); if (!t || t.status !== "review") return;
    t.steps.push({ who: "임금", text: "Sent back: " + notes, at: Date.now() });
    t.status = "new"; t.kingNotes = notes; t.stage = "Sent back by you"; saveTodo(t); hideTip();
    todoQueue = todoQueue.then(() => runTask(t)).catch((err) => console.warn(err));
  }
  async function reworkTask(sample, t, ps, chief) {
    const doer = ps.find((p) => p.id === t.doerId), checker = ps.find((p) => p.id === t.checkerId) || chief;
    const dir = checker === chief ? doer : checker;
    try {
      t.status = "working"; t.stage = doer.display + " is fixing it (your notes)"; saveTodo(t);
      const r3 = await doWork(sample, doer, dir, t, "The 임금 himself sent it back: " + t.kingNotes);
      t.work = String((r3 && r3.work) || "").slice(0, 20000); t.summary = String((r3 && r3.summary) || ""); t.left = String((r3 && r3.left) || "");
      step(t, doer.display, "Revised for you: " + (t.summary || "handed in the fix."));
      t.stage = checker.display + " is checking it"; saveTodo(t);
      const r4 = await checkWork(sample, checker, doer, t, (t.rounds || 1) + 1);
      step(t, checker.display, (r4 && r4.ok === false ? "Still has concerns: " : "Checked again. ") + String((r4 && r4.notes) || ""));
      t.kingNotes = ""; t.rounds = (t.rounds || 1) + 1;
      t.status = "review"; t.stage = "Fixed and checked. Waiting for your approval."; saveTodo(t); announceReview(t);
    } catch (e) { t.status = "failed"; t.stage = errText(e) + " Click to try again."; saveTodo(t); }
  }
  function announceReview(t) {
    showToast("Ready for your approval: " + t.text.slice(0, 60) + (t.text.length > 60 ? "…" : "") + " (by " + t.doer + ", checked by " + t.checker + ")", "Open the to-do list", () => { toastEl.hidden = true; todoEl.hidden = false; todoBtn.setAttribute("aria-pressed", "true"); renderTodos(); });
  }
  async function runTask(t) {
    const sample = await getSample();
    if (!sample) { t.status = "failed"; t.stage = "Needs claude.ai: open the village from claude.ai."; saveTodo(t); return; }
    const ps = (await Promise.all(ALL_AGENTS.map(profileOf))).filter(Boolean);
    const chief = ps.find((p) => p.id === CHIEF), dirs = ps.filter((p) => p.title === "사또");
    const forceWorker = !!t.forceWorker || GIVE_WORKER.test(t.text);
    if (t.kingNotes && t.doerId) return reworkTask(sample, t, ps, chief);
    try {
      t.status = "working"; saveTodo(t);
      const isLead = (p) => p && (p.title === "사또" || p.id === "sangseon-kim-mosim");
      const preDoer = t.doerId0 ? ps.find((p) => p.id === t.doerId0) : null;
      let dir = t.dirId ? ps.find((d) => d.id === t.dirId) : null;
      if (preDoer) dir = ps.find((p) => isLead(p) && (preDoer.boss || "").includes(p.name)) || chief;   // their own lead checks it
      if (dir && t.chiefCall) {   // 영의정 agreed in chat and phones the 사또
        t.stage = "영의정 이균 is calling " + dir.display; saveTodo(t);
        await new Promise((res) => queueCall(CHIEF, dir.id, t.chiefCall, /[가-힣]/.test(t.text), true).then(res));
        step(t, "영의정 이균", "Called " + dir.display + ": " + t.chiefCall.slice(0, 300));
      } else if (dir && t.promisedBy) step(t, "임금", "Asked " + t.promisedBy + ", who said: " + String(t.promise || "they'd do it").slice(0, 200));
      const PERSONAL = /\b(personal|family|my (wife|husband|kids?|mom|dad|calendar|inbox|email|money|bills?)|birthday)\b|개인|가족|집안|생일/i;
      if (!dir) {   // obvious owner: the 사또 the task names, or the only 사또 there is (personal matters still go to the 영의정)
        const named = dirs.find((d) => t.text.includes(d.name) || (d.townId === "mojoco" && /mojoco|모조코/i.test(t.text)));
        const only = dirs.length === 1 && !PERSONAL.test(t.text) ? dirs[0] : null;
        dir = named || only || null;
        if (dir) {
          const call = /[가-힣]/.test(t.text) ? `${dir.display}, 전하께서 맡기신 일이오: ${t.text}` : `${dir.display}, a task from His Majesty: ${t.text}`;
          t.stage = "영의정 이균 is calling " + dir.display; saveTodo(t);
          await new Promise((res) => queueCall(CHIEF, dir.id, call, /[가-힣]/.test(t.text), true).then(res));
          step(t, "영의정 이균", "Called " + dir.display + ": " + call.slice(0, 300));
        }
      }
      if (!dir) {
        // 1. the chief of staff picks the 사또 and phones them
        t.stage = "영의정 이균 is reading it"; saveTodo(t);
        const b1 = await characterBrief(CHIEF, `- The 임금 has added a task to his to-do list: "${t.text}"
- Pick the 사또 who should own it:
${dirs.map((d) => `  - "${d.id}": ${d.display} (${d.townId === "mojoco" ? "Mojoco" : d.townId}). ${d.role}`).join("\n")}
- If no 사또 fits (for example it's a personal matter for the 상선), say so.
- Reply with ONLY JSON: {"to": "<사또 id, or null>", "call": "what you say to that 사또 on the phone, in character", "note": "one line for the 임금 if no 사또 fits"}`);
        const r1 = await sample.json(b1, { ...SONNET, cache: false });   // routing is light work: Sonnet
        dir = dirs.find((d) => d.id === (r1 && r1.to));
        if (!dir) { t.status = "needs"; t.stage = "영의정: " + String((r1 && r1.note) || "No 사또 fits this one."); step(t, "영의정 이균", t.stage.slice(5)); return; }
        t.stage = "영의정 이균 is calling " + dir.display; saveTodo(t);
        await new Promise((res) => queueCall(CHIEF, dir.id, String(r1.call || ""), /[가-힣]/.test(t.text), true).then(res));
        step(t, "영의정 이균", "Called " + dir.display + ": " + String(r1.call || "").slice(0, 300));
      } else if (!t.promisedBy && !t.chiefCall) step(t, "임금", "Told " + dir.display + " directly" + (forceWorker ? " to give it to a worker." : "."));
      // 2. the 사또 decides: can one of my workers handle this?
      const team = ps.filter((p) => (p.boss || "").includes(dir.name));
      const specs = ps.filter((p) => /^Whoever borrows/.test(p.boss || ""));
      const options = forceWorker ? team : [...team, ...specs];
      let doer = preDoer, r2 = null;
      if (!doer) {
      t.stage = dir.display + " is deciding who does it"; saveTodo(t);
      const b2 = await characterBrief(dir.id, `- A task from the 임금's to-do list: "${t.text}"
- First decide whether one of your workers can handle it. Hand it to a worker whenever it fits their job; do it yourself only if it truly needs your judgment as 사또 or nobody fits.${forceWorker ? "\n- The 임금 has told you to give this to your worker. You MUST pick one of your workers below, not yourself." : ""}
- ${forceWorker ? "Your workers" : "Your workers, and shared specialists you may borrow (give them only your town's context)"}:
${options.map((p) => `  - "${p.id}": ${p.display}. ${p.role}`).join("\n") || "  (none)"}
- If you hand it off, write clear instructions: the goal, exactly what to deliver and in what form, any limits, and what you will check before you accept it.
- Reply with ONLY JSON: {"assign": "self" or "<id>", "why": "one sentence", "instructions": "your clear instructions to the worker (or your own plan if self)", "need_help": "if none of your people really fits this kind of work, what kind of new worker would; else empty"}`);
      r2 = await sample.json(b2, { ...SONNET, cache: false });   // choosing who does it: Sonnet; the work and the check keep their own models
      doer = r2 && r2.assign !== "self" ? options.find((p) => p.id === r2.assign) : null;
      if (!doer && forceWorker && team.length) doer = team[0];
      doer = doer || dir;
      t.instructions = String((r2 && r2.instructions) || t.text);
      if (doer === dir) step(t, dir.display, "Kept it: " + String((r2 && r2.why) || "") + " Plan: " + t.instructions);
      else { step(t, dir.display, "Handed to " + doer.display + " (" + String((r2 && r2.why) || "") + ") Instructions: " + t.instructions); addOrder({ from: dir.display, to: doer.display, text: t.instructions }); }
      } else { t.instructions = "The 임금 asked you directly: " + t.text + (t.promise ? "\nYou told him: " + t.promise : ""); step(t, doer.display, "Started on it (asked directly by the 임금)."); }
      const checker = doer === dir ? chief : dir;   // a lead checks the worker; the 영의정 checks a 사또's own work
      // 3. do, check, and send back with notes until it's good (at most two rounds of fixes)
      let notes = "", ok = false, round = 0;
      while (round < 3) {
        round++;
        t.stage = doer.display + (round > 1 ? " is fixing it (round " + round + ")" : " is working on it"); saveTodo(t);
        const r3 = await doWork(sample, doer, dir, t, notes);
        t.work = String((r3 && r3.work) || "").slice(0, 20000); t.summary = String((r3 && r3.summary) || ""); t.left = String((r3 && r3.left) || "");
        step(t, doer.display, (round > 1 ? "Revised: " : "") + (t.summary || "Handed in the work."));
        t.stage = checker.display + " is checking it"; saveTodo(t);
        const r4 = await checkWork(sample, checker, doer, t, round);
        if (r4 && r4.ok !== false) { ok = true; step(t, checker.display, "Checked and approved. " + String(r4.notes || "")); break; }
        notes = String((r4 && r4.notes) || "Not good enough yet.");
        step(t, checker.display, round < 3 ? "Sent it back with notes: " + notes : "Still not good enough: " + notes);
        if (round < 3 && doer !== dir) addOrder({ from: dir.display, to: doer.display, text: "Sent back: " + notes });
      }
      t.doer = doer.display; t.checker = checker.display; t.rounds = round; t.doerId = doer.id; t.checkerId = checker.id;
      if (r2 && r2.need_help && String(r2.need_help).trim().length > 3) setTimeout(() => findCandidate(dir.id, String(r2.need_help), t.text), 0);
      if (ok) { t.status = "review"; t.stage = "Checked by " + checker.display + ". Waiting for your approval."; t.checkedAt = Date.now(); setTimeout(() => announceReview(t), 0); addOrder({ from: dir.display, to: "영의정 이균", text: "Task done: " + t.text + " (by " + doer.display + ", checked by " + checker.display + ")" }); }
      else { t.status = "needs"; t.stage = checker.display + " still isn't satisfied after " + round + " tries. Click to try again."; }
      saveTodo(t);
    } catch (e) {
      t.status = "failed"; t.stage = errText(e) + " Click to try again."; saveTodo(t);
    }
  }
  todoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = todoInput.value.trim(); if (!text) return;
    todoInput.value = "";
    const t = { id: "t" + Date.now().toString(36), text, status: "new", stage: "Waiting for 영의정 이균", steps: [], at: Date.now() };
    saveTodo(t);
    todoQueue = todoQueue.then(() => runTask(t)).catch((err) => console.warn(err));
  });
  todoInput.addEventListener("keydown", (e) => { if (e.key === "Escape") todoInput.blur(); });
  todoBtn.addEventListener("click", () => { todoEl.hidden = !todoEl.hidden; todoBtn.setAttribute("aria-pressed", String(!todoEl.hidden)); if (!todoEl.hidden) { renderTodos(); todoInput.focus(); keys.clear(); } else hideTip(); });
  todoEl.querySelector(".close").addEventListener("click", () => { todoEl.hidden = true; todoBtn.setAttribute("aria-pressed", "false"); hideTip(); });
  // tasks cut off when the page was closed wait for a click (nothing calls Claude on its own at load)
  for (const t of todos()) if (t.status === "new" || t.status === "working") { t.status = "failed"; t.stage = "Stopped when the page closed. Click to try again."; saveTodo(t); }
  todoList.addEventListener("click", (e) => {
    const li = e.target.closest("li.task"); if (!li || e.target.closest(".del")) return;
    const t = todos().find((x) => x.id === li.dataset.id); if (!t || (t.status !== "failed" && t.status !== "needs")) return;
    t.status = "new"; t.steps = []; t.work = t.summary = t.left = t.doer = t.checker = ""; t.stage = "Waiting for 영의정 이균"; saveTodo(t); hideTip();
    todoQueue = todoQueue.then(() => runTask(t)).catch((err) => console.warn(err));
  });
  renderTodos();

  // ---------- hiring: the 영의정 finds candidates, the 임금 interviews them in the town hall ----------
  // A candidate is a record in the artifact's database (collection "hires"): status "candidate" → "hired" or "declined"
  // → "ready" once Claude (in the director's Claude Code session) has made their Higgsfield sheet and agent folder.
  // Until then a hire shows as a pale figure and their profile comes from the record.
  const HALL = "throne-hall", GHOST_SHEET = "assets/characters/ibang-kim-charye.webp";
  var HIRES = {};   // var: profileOf may ask before this line has run
  let hireDb = null;
  function hireProfile(id) {
    const h = HIRES && HIRES[id];
    if (!h || h.status === "declined" || h.status === "ready") return null;
    return { id: h.id, title: h.title, name: h.name, display: h.display, townId: h.townId, houseId: h.houseId, role: h.role, boss: h.boss,
      model: "Sonnet 5.5", portrait: safeAsset(h.portrait), sheet: safeAsset(h.sheet) || GHOST_SHEET, candidate: h.status === "candidate", personality: h.personality };
  }
  async function hireStore() {
    if (hireDb === null) hireDb = (window.claude && claude.use ? await claude.use("db").catch(() => null) : null) || false;
    return hireDb || null;
  }
  async function saveHire(h) {
    HIRES[h.id] = h;
    const db = await hireStore();
    if (db) { try { await db.collection("hires").doc(h.id).set(h); return; } catch (e) { console.warn(e); } }
    store.set("village.hires", Object.values(HIRES));
  }
  async function loadHires() {
    const db = await hireStore();
    let list = [];
    if (db) { try { list = (await db.collection("hires").get()).docs.map((d) => d.data()).filter(Boolean); } catch (e) { console.warn(e); } }
    else list = store.get("village.hires", []);
    for (const h of list) { HIRES[h.id] = h; if (h.status !== "declined" && !ALL_AGENTS.includes(h.id)) ALL_AGENTS.push(h.id); }
    placeHires();
  }
  setTimeout(loadHires, 300);
  const openCandidate = () => Object.values(HIRES).find((h) => h.status === "candidate");
  // put candidates in the hall and hires in their town (if they aren't there yet)
  async function placeHires() {
    if (!town || !town.people) return;
    for (const h of Object.values(HIRES)) {
      if (town.people.some((r) => r.id === h.id)) continue;
      if (h.status === "candidate" && town.key === "capital") {
        const img = await loadImg(safeAsset(h.sheet) || GHOST_SHEET).catch(() => null); if (!img) continue;
        town.people.push({ id: h.id, title: h.title, name: h.name, img, kneelImg: null, houseObj: null, house: null, visitHouse: HALL, seat: null, yard: [],
          x: ROOM / 2 + 140, y: ROOM * 0.66, h: 60, dir: "down", phase: 0, moving: false, space: "in", mode: "idle", plan: null, path: null, wait: 1,
          seated: false, worker: false, talkT: 0, noteT: 0, blockT: 0, label: "지원자 " + h.display, home: null, ghost: !h.sheet, candidate: true });
      } else if ((h.status === "hired" || h.status === "ready") && h.town === town.townName) {
        const r = await makeResident({ id: h.id, title: h.title, name: h.name, sheet: safeAsset(h.sheet) || GHOST_SHEET, kneel: safeAsset(h.kneel) || null, house: h.houseId, home: h.town, ghost: !h.sheet }, h.town, town.seatsUsed || {});
        if (r && !town.people.some((x) => x.id === h.id)) { town.people.push(r); setWorking(r.id, true); }
      }
    }
  }
  // the 영의정 looks for someone who'd help a 사또 (or the 상선) and brings them to the town hall
  let finding = false, lastFind = 0;
  async function findCandidate(leadId, need, taskText) {
    if (finding || openCandidate() || Date.now() - lastFind < 600000) return;
    lastFind = Date.now();
    const sample = await getSample(); if (!sample) return;
    const lead = await profileOf(leadId); if (!lead || !(lead.title === "사또" || lead.id === "sangseon-kim-mosim")) return;
    finding = true;
    try {
      const ps = (await Promise.all(ALL_AGENTS.map(profileOf))).filter(Boolean);
      const team = ps.filter((p) => (p.boss || "").includes(lead.name));
      const brief = await characterBrief(CHIEF, `- You're always looking for ways to make the team better. ${lead.display} could use help${need ? ": " + need : ""}.${taskText ? `\n- It came up on this task: "${taskText}"` : ""}
- ${lead.display}'s people now: ${team.map((p) => p.display + " (" + p.role + ")").join("; ") || "none"}.
- Find ONE candidate to bring to the 임금 for an interview. Make them a believable Joseon-era person whose job title fits${lead.title === "사또" ? " (a 사또's unfilled town-office posts are 호방, 병방, 형방, 공방; use one if it fits, or another fitting title)" : " (palace household titles: 내관, 상궁, 나인, or another fitting one)"}.
- Give them a family name and a 2-syllable given name whose Korean meaning fits their job, like the others (김차례 = turns/order, 이소식 = news, 곽곳간 = storehouse).
- Every name must be new: not any of ${ps.map((p) => p.display).join(", ")}.
- Reply with ONLY JSON: {"title": "...", "name": "family+given name", "romanized": "lowercase ascii like hobang-park-donsem", "role": "one sentence: what they'd do", "personality": "a few words", "why": "why they'd help ${lead.display}", "pitch": "what you tell the 임금 about them, in character"}`);
      const chief = ps.find((p) => p.id === CHIEF);
      let c = await sample.json(brief, { ...modelOpts(chief), cache: false });
      let nm = cleanName(c, ps);
      if (!nm) {   // one more try, asking for nothing but the name
        const again = await sample.json(`Give a Joseon-era job title and a Korean personal name for a new worker who will: ${String((c && c.role) || need)}.
Rules: title is 1-4 Hangul letters only (e.g. 호방). name is a family name plus a 2-syllable given name, 3 Hangul letters only (e.g. 박돈셈), not any of: ${ps.map((p) => p.name).join(", ")}.
No spaces, no brackets, no notes, no English. Reply with ONLY JSON: {"title": "...", "name": "..."}`, { modelTier: "default", cache: false });
        nm = cleanName(again, ps);
        if (nm && c) { c.title = nm.title; c.name = nm.name; }
      }
      if (!c || !nm) return;
      let id = String(c.romanized || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 4).join("-");
      if (!/^[a-z][a-z0-9-]{2,40}$/.test(id)) id = "hire-" + Date.now().toString(36);
      while (ALL_AGENTS.includes(id) || HIRES[id]) id += "-2";
      const h = { id, status: "candidate", title: nm.title, name: nm.name, display: nm.title + " " + nm.name,
        role: plainText(c.role, 240), personality: plainText(c.personality, 120), why: plainText(c.why, 240), pitch: plainText(c.pitch, 300),
        leadId: lead.id, boss: lead.display, townId: lead.townId, town: lead.townId === "mojoco" ? "mojoco" : "hanyang", houseId: lead.houseId, need: plainText(need, 200), createdAt: Date.now() };
      await saveHire(h); ALL_AGENTS.push(id);
      addOrder({ from: "영의정 이균", to: "임금", text: "A candidate for " + lead.display + " is waiting in the town hall: " + h.display + ". " + h.pitch });
      placeHires();
      showToast("영의정 이균 found a candidate for " + lead.display + ": " + h.display + ", waiting in the town hall.", "Go to the town hall", goToHall);
    } catch (e) { console.warn(e); } finally { finding = false; }
  }
  // one clean name: Hangul only, no brackets, notes, English or thinking out loud. null if it can't be cleaned.
  function cleanName(c, ps) {
    if (!c || typeof c !== "object") return null;
    const strip = (x) => String(x || "").replace(/\([^)]*\)|\[[^\]]*\]|（[^）]*）/g, " ").trim();
    const titles = strip(c.title).match(/[가-힣]+/g) || [];
    if (titles.length !== 1 || titles[0].length > 4) return null;          // exactly one title word
    const title = titles[0];
    const names = (strip(c.name).match(/[가-힣]+/g) || []).filter((w) => w !== title);
    if (names.length !== 1 || names[0].length < 3 || names[0].length > 4) return null;   // exactly one full name, nothing else
    const name = names[0];
    if (ps.some((p) => p.name === name || p.display === title + " " + name)) return null;
    return { title, name };
  }
  async function goToHall() {
    toastEl.hidden = true;
    if (court.active) return;
    if (town.key !== "capital") { document.querySelectorAll("[data-town]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.town === "capital"))); await loadTown("capital"); }
    const house = town.houses.find((h) => h.id === HALL); if (!house) return;
    fadeTo = async () => {
      const img = await loadImg(house.interior);
      inside = { house, img, w: img.width, h: img.height };
      placePlayer(player.img, inside.w / 2, inside.h - ROOM_H * (house.room_scale || 1) * 0.45);
      player.dir = "up"; placeAide(); placeHires();
      fitCamera(); cam.s = Math.max(cam.min, Math.min(cam.max, H / (player.h * 6))); follow = true; centerOnPlayer(1);
    };
  }
  function showToast(text, label, fn) {
    toastEl.innerHTML = "";
    const m = document.createElement("span"); m.textContent = text; toastEl.append(m);
    if (label) { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.addEventListener("click", fn); toastEl.append(b); }
    const x = document.createElement("button"); x.type = "button"; x.className = "x"; x.textContent = "×"; x.setAttribute("aria-label", "Dismiss");
    x.addEventListener("click", () => { toastEl.hidden = true; }); toastEl.append(x);
    toastEl.hidden = false;
  }
  // the 임금's decision
  async function decideHire(id, yes) {
    const h = HIRES[id]; if (!h || h.status !== "candidate") return;
    h.status = yes ? "hired" : "declined"; h.decidedAt = Date.now();
    await saveHire(h);
    const r = town && town.people.find((x) => x.id === id);
    const lead = await profileOf(h.leadId);
    if (r) {
      r.candidate = false; r.label = h.display;
      if (!yes || h.town !== town.townName) { r.visitor = true; }            // leaves town (declined, or works in another town)
      else {                                                                  // walks out of the hall to the director's house and starts work
        const house = town.houses.find((x) => x.id === h.houseId);
        r.house = h.houseId; r.houseObj = house; r.home = h.town;
        const P = town.P, door = house.door, base = door.stairs_bottom || door.y;
        r.yard = [[-1.3, 0.7], [1.3, 0.8], [0, 1.2]].map(([a, b]) => nearestFree(door.x + a * P, base + b * P, town.nav && town.nav.safe));
        if (house.seats && house.seats.length) { const k = (town.seatsUsed[house.id] = (town.seatsUsed[house.id] || 0)); r.seat = house.seats[k % house.seats.length]; town.seatsUsed[house.id]++; }
        setWorking(r.id, true);
      }
    }
    if (yes) {
      addOrder({ from: "임금", to: h.display, text: "Hired to work under " + (lead ? lead.display : h.boss) + "." });
      showToast(h.display + " is hired and heading to " + (lead ? lead.display : h.boss) + "'s house. Tell Claude \"process hires\" to make their character sheet (cost shown first) and agent folder.", "", null);
    } else showToast(h.display + " wasn't hired and has left.", "", null);
    renderHireBar();
  }
  // hire / don't hire buttons on the interview chat
  const hireBar = document.getElementById("hirebar");
  function renderHireBar() {
    const h = chatWith && HIRES[chatWith];
    hireBar.hidden = !(h && h.status === "candidate" && !chatEl.hidden);
  }
  hireBar.querySelector(".yes").addEventListener("click", (e) => e.isTrusted && chatWith && decideHire(chatWith, true));
  hireBar.querySelector(".no").addEventListener("click", (e) => e.isTrusted && chatWith && decideHire(chatWith, false));
  setInterval(renderHireBar, 500);
  const HIRE_YES = /^(yes|yep|hire|hired|you'?re hired|welcome aboard|채용|합격|좋다|좋소|그래)\b/i, HIRE_NO = /^(no|nope|not hired|sorry|불합격|안 ?되겠|아니)\b/i;

  // ---------- town tabs and light toggle ----------
  // ---------- travelling between the world map and the towns ----------
  function selectTab(key) { document.querySelectorAll("[data-town]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.town === key))); }
  function travelTo(key) {
    if (!TOWNS[key] || (town && town.key === key) || court.active) return;
    if (town && town.key !== "world" && key === "world") {        // leaving a town: come out at that town on the world map
      const from = town.key;
      return getJSON(TOWNS.world.houses).then((w) => {
        const p = w.houses.find((h) => h.portal === from);
        if (p) arriveAt = { town: "world", x: p.door.x, y: p.door.y + 45 };
        selectTab("world"); loadTown("world");
      });
    }
    selectTab(key); loadTown(key);
  }
  document.getElementById("world-btn").addEventListener("click", (e) => { if (town && town.key === "world") return; travelTo("world"); });
  for (const b of document.querySelectorAll("[data-town]")) {
    b.addEventListener("click", () => {
      travelTo(b.dataset.town);   // the tabs are fast travel (post horse / palanquin)
    });
  }
  for (const b of document.querySelectorAll("[data-light]")) {
    b.addEventListener("click", () => {
      lightMode = b.dataset.light;
      document.querySelectorAll("[data-light]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
  }

  // ---------- full screen (F or the button) ----------
  // Real full screen when the browser allows it; otherwise "focus mode": the header and hints hide and the map fills the frame.
  const fsBtn = document.getElementById("fullscreen"), exitFs = document.getElementById("exitfs");
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || document.body.classList.contains("focus-mode");
  function syncFs() {
    const on = isFs();
    fsBtn.setAttribute("aria-pressed", String(on)); fsBtn.textContent = on ? "Exit full screen" : "Full screen";
    exitFs.hidden = true;   // the header (with its own Exit full screen button) stays visible
    requestAnimationFrame(resize);
  }
  async function toggleFs() {
    if (isFs()) {
      document.body.classList.remove("focus-mode");
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
    } else {
      const el = document.documentElement;
      document.body.classList.add("focus-mode");   // the map fills the frame either way
      try { if (el.requestFullscreen) await el.requestFullscreen(); else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen(); } catch (e) { /* the frame doesn't allow it: focus mode only */ }
    }
    syncFs();
  }
  fsBtn.addEventListener("click", toggleFs);
  exitFs.addEventListener("click", toggleFs);
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) document.body.classList.remove("focus-mode"); syncFs(); });
  document.addEventListener("webkitfullscreenchange", () => { if (!document.webkitFullscreenElement) document.body.classList.remove("focus-mode"); syncFs(); });
  window.addEventListener("keydown", (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    if (e.code === "KeyF") { e.preventDefault(); toggleFs(); }
    else if (e.code === "Escape" && document.body.classList.contains("focus-mode") && !document.fullscreenElement) { document.body.classList.remove("focus-mode"); syncFs(); }
  });

  window.addEventListener("resize", resize);
  resize();
  loadTown("capital");
  requestAnimationFrame(frame);
})();
