# AI Village — Joseon Province Spec

> **Team structure has moved to [TEAM.md](TEAM.md) (official, 2026-11-20).** Wherever this spec disagrees with
> TEAM.md about levels, roles, who reports to whom, houses, names, models or data fields, TEAM.md wins. In particular:
> a town is a whole project or company (one 사또 each), houses are workstreams inside a town (workplaces, not homes),
> 행수 lead houses, the palace has a household under the 상선 and its own 규장각, and Fable is never used.

A visual "village" where the user can watch their AI agents live and work. The world is styled as a **Joseon-era Korean province**: a capital (Jung City) at the center with a palace, surrounded by towns (고을). Each town represents one company or area of the user's life. Agents are characters who work in buildings, walk between them, and travel to the capital to report.

The visuals are not decoration: **every animation reflects real agent state or a real event.** If nothing is happening, characters stay put. Looking at the map should tell the user what's going on.

---

## 1. Core concepts

| Concept | In the world | In the system |
|---|---|---|
| 임금 (King) | The player | The user. Sets priorities, approves decisions. |
| Jung City (Capital) | Center of the map | Global layer: cross-town coordination + shared specialists |
| 궁궐 (Palace) | Building in Jung City | Where the user "is"; briefings and decision requests arrive here |
| 영의정 (Chief State Councillor) | Lives in the palace | Cross-town coordinator agent. Merges all town reports into one briefing. Does not do task work itself. |
| 고을 (Town) | A cluster of buildings around the capital | One workspace = one company/area (e.g. "New Company", "Personal") |
| 사또 (Magistrate) | Head of a town, sits in the 관아 | Town lead agent. Receives requests, plans, assigns, confirms completion. |
| 파발 (Relay rider) | Riders on roads | Visual representation of messages/handoffs between agents and towns |

### Isolation rule (important)
- **Each town has its own memory/context (its own 규장각).** Agents in one town never read another town's memory.
- **Only leaders travel between towns and the capital** (사또 to the palace). Workers stay in their town.
- **Shared specialists** live in Jung City and can be dispatched to any town, but a job carries **only that town's context**. They keep no memory across towns.
- Rationale: keeps context clean and keeps confidential data separated (e.g. an employer's data never mixes with the user's own company).

---

## 2. World structure

```
                [Town: Personal]
                       |
[Town: (future)] —— [ Jung City / 궁궐 ] —— [Town: New Company]
                       |
                [Town: (future)]
```

- Jung City sits in the center. Towns are arranged around it, connected by roads.
- New towns can be added at any time ("founding a town"). The layout should accommodate N towns (e.g. radial placement, or predefined slots).
- Each town starts small (사또 + a few buildings) and grows as agents are added.

### Zoom levels
1. **Province view**: whole map. Towns are small clusters. Shows at a glance: busy towns, lit beacons, riders on roads, petitions heading to the palace.
2. **Town view**: click a town to zoom in. Shows individual buildings, agents working, the notice board, the jail, the tavern.
3. **Agent detail** (panel/modal): click an agent to see its current task, status, and its 실록 (work log).

---

## 3. Roles

### 3.1 Capital (Jung City), global
| Role | Job |
|---|---|
| 영의정 | Receives every 사또's report, produces one combined daily briefing for the user, flags conflicts across towns, helps prioritize. |
| Shared specialists | Live in Jung City, get dispatched to towns for jobs (see 3.4). |

### 3.2 Town government (관아): one set per town
| Role | Job |
|---|---|
| **사또** | Town lead. Takes requests, breaks them into tasks, assigns them, confirms when a project is actually done, reports to the palace. |
| **이방** | Task queue, assignments, deadlines, tracking who is working on what. |
| **호방** | Numbers: data, budgets, spreadsheets. |
| **예방** | Communications: email, messages, calendar. |
| **병방** | Security and monitoring. Runs the 포졸 (night watch) and the 봉수대 (beacon). |
| **형방** | Rules and safety: permissions, what needs approval, spending/action limits, incident investigation. Runs the 옥 (jail/quarantine). |
| **공방** | Infrastructure: tools, API connections, keys, storage, repairs. Oversees the craftsmen. |

Not every town needs all six 방 at the start. Town government roles are added as needed.

### 3.3 Scholars (학문)
| Role | Job |
|---|---|
| **선비** | Research: web search, reading, summaries. |
| **문장가** | Writing and editing. |
| **역관** | Translation (Korean, English, others). |
| **관상감 천문관** | Analysis, trends, forecasts. |

### 3.4 Craftsmen (장인): report to the 공방
| Role | Job |
|---|---|
| **대장장이** (blacksmith) | Coding: scripts, tools, fixes. |
| **화원** (도화서 painter) | Design and visuals. |
| **목수** (carpenter) | Automations and workflows connecting tools. |

Scholars and craftsmen may be **town-local** or **shared specialists from Jung City**. Configurable per agent.

### 3.5 Records and oversight
| Role | Job |
|---|---|
| **사관** | Writes each agent's work log (실록): what it did, why, results. |
| **규장각** | The town's memory/archive (a place, not an agent, though it can have a librarian). One per town. |
| **암행어사** | Secret QA. Reviews other agents' completed work and flags mistakes. Distinct from 형방 (which enforces rules openly). |

### 3.6 Optional
| Role | Job |
|---|---|
| Household helper | Personal life admin (appointments, errands). Belongs in the "Personal" town. |

### Recommended starter set (per town)
사또, 선비, 문장가, 대장장이, 사관. Add 형방 early if agents can take real actions (sending email, editing files, spending money).

---

## 4. Places and signals

| Place / object | Meaning |
|---|---|
| 관아 | Town government building, where the 사또 and 육방 sit |
| 규장각 | Town memory/archive |
| 파발 | Rider animation for a message or handoff (agent→agent, town→capital) |
| 신문고 (petition drum) | An agent needs the user's decision: it walks to the drum and beats it. Drum shows a pending indicator until resolved. |
| 상소 (petition scroll) | A 사또 rides to the palace with a scroll when a decision must reach the user mid-day |
| 봉수대 (beacon tower) | Lit when there's an error or urgent issue in that town. Visible from province view. |
| 옥 (jail) | Quarantine for failed or suspicious tasks. They sit "in a cell" until the user reviews them. |
| 주막 (tavern) | Idle agents wait here |
| 방 (notice board) | At the town gate: daily summary of that town's activity |
| 포졸 (night watch) | Patrol animation while scheduled/overnight jobs run |
| Scaffolding | Appears on a building when its tool/integration is broken or being repaired |

---

## 5. Agent states → visuals

Each agent has exactly one state at a time. State drives position and animation.

| State | Visual |
|---|---|
| `idle` | Sitting in the 주막 |
| `working` | At its building, working animation |
| `traveling` | Walking/riding along a road (handoff, dispatch, report) |
| `waiting_on_user` | At the 신문고 (town) or riding to the palace with a 상소 |
| `blocked` | At its building with a visible "stuck" indicator |
| `error` | Lights the town's 봉수대; task goes to the 옥 if it can't recover |
| `reviewing` | (암행어사) quietly visiting another agent's building |

**Rule: only animate movement for real events.** No random wandering.

---

## 6. Events → visuals

The visual layer subscribes to an event stream. Suggested event types:

| Event | Visual effect |
|---|---|
| `task.created` | 사또 receives a scroll |
| `task.assigned` | 파발 rider from 관아 to the assignee's building; assignee → `working` |
| `task.handoff` | Rider/walk between the two agents' buildings |
| `task.completed` | Agent returns to 주막 (if no other work); entry added to 실록 |
| `task.failed` | Beacon lights; task moves to 옥 |
| `approval.requested` | Agent goes to 신문고; if urgent, 사또 rides to palace with 상소 |
| `approval.resolved` | Drum indicator clears; agent resumes |
| `specialist.dispatched` | Specialist walks from Jung City to the town |
| `specialist.returned` | Specialist walks back to Jung City |
| `report.daily` | Every 사또 rides to the palace (조회); 영의정 produces briefing |
| `tool.broken` / `tool.repaired` | Scaffolding on / off the related building |
| `schedule.started` / `schedule.finished` | 포졸 patrol starts / stops |
| `review.flagged` | 암행어사 reveals itself at the agent's building with a flag |

---

## 7. Daily rhythm

1. **조회 (morning court):** each town's 사또 rides to the palace, delivers a report. The 영의정 merges them into one briefing shown to the user in the palace.
2. **Daytime:** towns work independently. Decisions go to the 신문고, or via 상소 to the palace if urgent.
3. **방:** each town's notice board updates with a daily summary.
4. **Night:** 포졸 patrol during scheduled jobs.

---

## 8. Data model (suggested)

```ts
type Town = {
  id: string;
  name: string;            // "Personal", ...
  slot: number;            // position around the capital
  memoryId: string;        // its own 규장각, never shared
  agentIds: string[];
  beaconLit: boolean;
};

type Agent = {
  id: string;
  name: string;
  role: Role;              // "satto" | "ibang" | "hobang" | "yebang" | "byeongbang" | "hyeongbang" | "gongbang" | "seonbi" | "munjangga" | "yeokgwan" | "cheonmungwan" | "daejangjangi" | "hwawon" | "moksu" | "sagwan" | "amhaengeosa" | "yeonguijeong" | "household"
  homeTownId: string | "capital";
  shared: boolean;         // shared specialist from Jung City
  state: AgentState;
  currentTaskId?: string;
  location: { townId: string | "capital"; buildingId?: string; path?: Point[] };
  permissions: string[];   // enforced by 형방 rules
};

type Task = {
  id: string;
  townId: string;          // context boundary
  title: string;
  status: "queued" | "in_progress" | "waiting_on_user" | "blocked" | "failed" | "jailed" | "done";
  assigneeId?: string;
  createdBy: string;
  log: LogEntry[];         // feeds the 실록
};

type LogEntry = { at: string; agentId: string; action: string; detail?: string };
```

Constraint: a task's `townId` determines which memory an agent may access while working on it. A shared specialist working on a task gets that town's context only.

---

## 9. UI requirements

- Province map with Jung City in the center and towns around it; roads connecting each town to the capital.
- Click a town to zoom to the town view; a back button returns to the province.
- Click an agent to open a panel: name, role, state, current task, 실록 (scrollable log).
- Palace panel: the 영의정's latest briefing + list of pending decisions (from all towns).
- Town notice board (방) panel: today's summary.
- Jail (옥) panel: quarantined tasks with "retry", "dismiss", or "inspect".
- "Found a town" action: add a new town in the next free slot.
- "Hire" action: add an agent to a town (or as a shared specialist in Jung City).

---

## 10. Art direction

- Joseon-era: hanok buildings with giwa (tiled) roofs, 초가 (thatched) for smaller buildings, stone walls, a 성문 gate on each town, pine trees, hills.
- Characters are distinguishable by role through clothing/hats: 사또 in official robes (관복), 선비 with a 갓, craftsmen in work clothes, 포졸 with spears, 파발 on horseback, 암행어사 in plain clothes (only revealed when flagging).
- Palace in Jung City is clearly the largest, most ornate building.
- Style (pixel art / illustrated / 3D) is open; keep it consistent.

---

## 11. Build phases

1. **Static province map:** Jung City + palace, 2–3 towns, roads, zoom in/out.
2. **Agents and states:** place agents, drive position/animation from state; agent detail panel with log.
3. **Event stream:** hook into real agent events (or a mock event generator first), map events to visuals per section 6.
4. **Signals:** 신문고, 봉수대, 옥, 주막, 방, scaffolding.
5. **Capital layer:** 영의정 briefing, daily 조회 animation, 상소 flow, shared specialist dispatch.
6. **Management:** found a town, hire agents, permissions (형방).

Start with a mock event generator so the visuals can be built and tested before real agents are connected.

---

## 12. Open questions (decide before building)

- Tech stack / engine (web canvas, Phaser, PixiJS, Godot, Three.js, etc.)?
- Where do real agent events come from, and in what format?
- Art style and asset source?
- Real-time updates (websocket) or polling?
- Persist town/agent configuration where?
