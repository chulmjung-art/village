/* My AI Village: town viewer with living effects drawn by code.
   The painted map is the base; props come from towns/*-props.json; animated effects come from
   towns/*-effects.json. Every effect is drawn in map coordinates each frame, so it stays sharp
   at any zoom. Lighting follows the viewer's real clock (with a manual override). */
(() => {
  "use strict";

  const TOWNS = {
    mojoco: { map: "assets/maps/mojoco-map.webp", props: "towns/mojoco-props.json", fx: "towns/mojoco-effects.json", houses: "towns/mojoco-houses.json", people: "towns/mojoco-people.json" },
    capital: { map: "assets/maps/capital-personal-map.webp", props: "towns/capital-props.json", fx: "towns/capital-effects.json", houses: "towns/capital-houses.json" },
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
               smoke: (fx.smoke || []).map((s) => ({ ...s, parts: [], acc: 0 })), leaves: [], falls: [], birds: [], birdNext: rand(2, 6) };
      town.canopies = (fx.trees || []).map((tr) => makeCanopy(img, tr)).filter(Boolean);
      town.houses = houses.houses; town.P = houses.player_height;
      town.people = [];
      if (t.people) loadPeople(t.people).then((ppl) => { if (town && town.key === key) town.people = ppl; });
      inside = null;
      placePlayer(kingImg, houses.spawn.x, houses.spawn.y, 0);
      aide.img = aideImg; placeAide();
      fitCamera();
      cam.s = Math.min(cam.max, Math.max(cam.min, 1.1)); follow = true; centerOnPlayer(1);
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
    if (town && pointers.size === 0 && hitPlayer(toWorld(e))) {
      const w = toWorld(e);
      grab = { id: e.pointerId, dx: player.x - w.x, dy: player.y - w.y };
      canvas.style.cursor = "grabbing";
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  canvas.addEventListener("pointermove", (e) => {
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
    if (grab && e.pointerId === grab.id) { grab = null; canvas.style.cursor = ""; return; }
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
  const aide = { img: null, x: 0, y: 0, h: 66, dir: "down", phase: 0, moving: false, label: "상선 김모심" };
  const BEHIND = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }; // where "behind" is for each facing
  function placeAide() {
    const b = BEHIND[player.dir];
    aide.h = player.h * 0.97;
    aide.x = player.x + b[0] * player.h * 0.75 + (b[0] ? 0 : player.h * 0.45);
    aide.y = player.y + b[1] * player.h * 0.35 + (b[1] ? 0 : 2);
    aide.y = Math.min(aide.y, world().h - 4);
    aide.dir = player.dir; aide.phase = 0; aide.moving = false;
  }
  // ---------- residents: 사또 and others who live in a house, spending time in its yard and inside ----------
  async function loadPeople(url) {
    const data = await getJSON(url);
    return Promise.all(data.people.map(async (d) => {
      const img = await loadImg(d.sheet);
      const where = Math.random() < 0.6 ? "yard" : "room";
      const spot = d[where][0];
      return { ...d, img, x: spot.x, y: spot.y, h: 66, dir: "down", phase: 0, moving: false,
               where, target: null, wait: rand(2, 6), stay: rand(40, 90), label: d.title + " " + d.name };
    }));
  }
  function updateResident(r, dt) {
    const house = town.houses.find((h) => h.id === r.house);
    const here = r.where === "room" ? (inside && inside.house.id === r.house) : !inside;
    r.h = r.where === "room" ? roomHeightAt(r.y) * ((inside && inside.house.room_scale) ? 1 : 1) : town.P * 1.02;
    r.stay -= dt;
    if (r.stay <= 0 && !r.target) {
      // time to go between the yard and the hall: walk to the doorway, then switch sides
      r.target = r.where === "yard" ? { x: house.door.x, y: house.door.y - 4, swap: true } : { x: ROOM / 2, y: ROOM - 30, swap: true };
    }
    if (!r.target) {
      r.wait -= dt;
      if (r.wait <= 0) { const spots = r[r.where]; r.target = spots[(Math.random() * spots.length) | 0]; r.wait = rand(6, 14); }
    }
    if (r.target) {
      const dx = r.target.x - r.x, dy = r.target.y - r.y, d = Math.hypot(dx, dy);
      const sp = r.h * 1.6; // an unhurried stroll
      if (d < 3) {
        r.moving = false;
        if (r.target.swap) {
          r.where = r.where === "yard" ? "room" : "yard"; r.stay = rand(40, 90); r.wait = rand(1, 3);
          if (r.where === "room") { r.x = ROOM / 2; r.y = ROOM - 40; r.dir = "up"; r.target = r[r.where][0]; }
          else { r.x = house.door.x; r.y = house.door.y + 4; r.dir = "down"; r.target = r.yard[(Math.random() * r.yard.length) | 0]; }
          return;
        }
        r.target = null;
      } else {
        const step = Math.min(d, sp * dt);
        r.x += dx / d * step; r.y += dy / d * step; r.moving = true;
        if (Math.abs(dx) > Math.abs(dy)) r.dir = dx > 0 ? "right" : "left"; else r.dir = dy > 0 ? "down" : "up";
        r.phase += (step / r.h) * 2.9;
      }
    }
    if (!r.moving) {
      r.phase = 0;
      // turn to face the King when he comes close
      if (here && Math.hypot(player.x - r.x, player.y - r.y) < player.h * 2.2) {
        const dx = player.x - r.x, dy = player.y - r.y;
        r.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      }
    }
    r.visible = here;
  }
  function drawLabel(a) {
    // title + name, always shown together, at a steady size on screen
    const fs = 13 / cam.s, x = a.x, y = a.y - a.h * 1.04;
    ctx.save();
    ctx.font = `600 ${fs}px "Gowun Batang", serif`;
    const w = ctx.measureText(a.label).width + fs * 0.9;
    ctx.fillStyle = "rgba(28,22,16,0.72)";
    const r = fs * 0.5, bx = x - w / 2, by = y - fs * 1.15, bh = fs * 1.45;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, bh, r) : ctx.rect(bx, by, w, bh); ctx.fill();
    ctx.fillStyle = "#f3e6c8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(a.label, x, by + bh / 2);
    ctx.restore();
  }

  function updateAide(dt) {
    if (!aide.img) return;
    aide.h = (inside ? roomHeightAt(aide.y) : player.h) * 0.97;
    const b = BEHIND[player.dir];
    // stand a little behind the King and off to the side, like an attendant
    const tx = player.x + b[0] * player.h * 0.75 + (b[0] ? 0 : player.h * 0.45);
    const ty = player.y + b[1] * player.h * 0.35;
    const dx = tx - aide.x, dy = ty - aide.y, d = Math.hypot(dx, dy);
    // start walking when he falls a little behind, stop once close (no jittery start-stop)
    if (d > player.h * (aide.moving ? 0.06 : 0.3)) {
      const run = keys.has("run") || d > player.h * 2.5;
      const step = Math.min(d, player.h * (run ? 5.6 : 2.8) * dt);
      aide.x += dx / d * step; aide.y = Math.min(aide.y + dy / d * step, world().h - 4);
      aide.moving = true;
      if (Math.abs(dx) > Math.abs(dy)) aide.dir = dx > 0 ? "right" : "left"; else aide.dir = dy > 0 ? "down" : "up";
      // legs move with the ground actually covered, so slow shuffles and fast runs both look right
      aide.phase += (step / aide.h) * (run ? 2.3 : 2.9);
    } else {
      aide.moving = false; aide.phase = 0;
      if (!player.moving) aide.dir = player.dir;
    }
  }

  function placePlayer(img, x, y) {
    player.img = img; player.x = x; player.y = y; player.dir = "down"; player.phase = 0; player.armed = true;
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
  });
  window.addEventListener("keyup", (e) => {
    if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]);
    if (e.key === "Shift") keys.delete("run");
  });
  window.addEventListener("blur", () => keys.clear());

  function updatePlayer(dt) {
    if (!player.img || fadeTo) { player.moving = false; return; }
    let dx = (keys.has("right") ? 1 : 0) - (keys.has("left") ? 1 : 0);
    let dy = (keys.has("down") ? 1 : 0) - (keys.has("up") ? 1 : 0);
    player.moving = !!(dx || dy) && !grab;
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
    player.x = Math.min(Math.max(player.x + dx * speed * dt, side), w.w - side);
    player.y = Math.min(Math.max(player.y + dy * speed * dt, top), w.h - 2);
    if (inside) player.h = roomHeightAt(player.y); // smaller toward the back of the room
    player.phase += dt * (run ? 12 : 7.5);
    checkDoors();
  }

  // walking into a doorway goes inside; walking out of the room's bottom doorway comes back out
  function inDoor(d) { return Math.abs(player.x - d.x) < d.w / 2 && player.y > d.y - player.h * 0.55 && player.y < d.y + player.h * 0.12; }
  function checkDoors() {
    if (!inside) {
      const d = town.houses.find((h) => inDoor(h.door));
      if (!d) { player.armed = true; return; }
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
      placePlayer(player.img, house.door.x, house.door.y + town.P * 0.55);
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

  function drawActors(beforeY) {
    // draw the King and 김모심 in depth order (lower on screen = in front)
    const all = [player, aide, ...((town && town.people) || []).filter((r) => r.visible)];
    const list = all.filter((a) => a.img && !a.drawn && a.y <= beforeY).sort((a, b) => a.y - b.y);
    for (const a of list) { a === player ? drawPlayer() : drawSprite(a); a.drawn = true; }
  }
  function drawSprite(a) {
    const col = a.moving ? STEP[Math.floor(a.phase) % 4] : 1;
    const k = a.h / FIG, dw = FRAME * k;
    ctx.save();
    ctx.fillStyle = "rgba(40,25,10,0.28)";
    ctx.beginPath(); ctx.ellipse(a.x, a.y - a.h * 0.01, a.h * 0.2, a.h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(a.img, col * FRAME, ROW[a.dir] * FRAME, FRAME, FRAME, a.x - dw / 2, a.y - FEET * k, dw, dw);
    ctx.restore();
  }
  function drawPlayer() {
    if (!player.img) return;
    const col = player.moving ? STEP[Math.floor(player.phase) % 4] : 1;
    const row = ROW[player.dir];
    const k = player.h / FIG; // same scale for every direction
    const dw = FRAME * k, dh = FRAME * k;
    ctx.save();
    ctx.fillStyle = "rgba(40,25,10,0.28)";
    ctx.beginPath(); ctx.ellipse(player.x, player.y - player.h * 0.01, player.h * 0.2, player.h * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(player.img, col * FRAME, row * FRAME, FRAME, FRAME, player.x - dw / 2, player.y - FEET * k, dw, dh);
    ctx.restore();
  }

  // ---------- light: real clock, with manual override ----------
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
      if (follow && !grab) centerOnPlayer(Math.min(1, dt * 6));
      ctx.save();
      ctx.scale(cam.s, cam.s);
      ctx.translate(-cam.x, -cam.y);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(inside.img, 0, 0, inside.w, inside.h);
      player.drawn = aide.drawn = false; for (const r of town.people) r.drawn = false;
      drawActors(Infinity);
      for (const a of [aide, ...town.people.filter((r) => r.visible)]) if (a.img) drawLabel(a);
      ctx.restore();
      drawFade();
      clockEl.textContent = inside.house.name;
    } else if (town) {
      updateFade(dt);
      updatePlayer(dt);
      updateAide(dt);
      for (const r of town.people) updateResident(r, dt);
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
      for (const a of [aide, ...town.people.filter((r) => r.visible)]) if (a.img) drawLabel(a);
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
    requestAnimationFrame(frame);
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

  // ---------- town tabs and light toggle ----------
  for (const b of document.querySelectorAll("[data-town]")) {
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-town]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      loadTown(b.dataset.town);
    });
  }
  for (const b of document.querySelectorAll("[data-light]")) {
    b.addEventListener("click", () => {
      lightMode = b.dataset.light;
      document.querySelectorAll("[data-light]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
  }

  window.addEventListener("resize", resize);
  resize();
  loadTown("mojoco");
  requestAnimationFrame(frame);
})();
