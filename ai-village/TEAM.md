# AI Village: Official Team Structure

**This is the official structure.** Provided by the director on 2026-11-20, saved word for word. It replaces every
earlier version (the earlier TEAM.md, and any conflicting parts of SPEC.md, the AI village spec). Roles listed as
"defined" are ready for when the director hires them.

---

# 1. Structure

## Levels
- Province: Jung City (capital) in the center, towns around it, connected by roads.
- Town (고을) = one whole project or company. One 사또 per town.
- House = one workstream inside a town (e.g. YouTube, Products, Trading). Houses are workplaces, not homes.

## Chain of command
- 임금 (me) → 영의정 → 사또 → 행수 → workers
- 임금 → 상선 → palace household
- 임금 → 암행어사
- 상선 and 영의정 both report directly to me. Neither manages the other.

# 2. Jung City (capital)

## 궁궐 (palace)
- 임금: me.
- 영의정 이균 (Opus 5.5): chief of staff. Works in the 편전. Collects every 사또's report at morning 조회, writes one combined briefing in palace/briefings/, flags conflicts between towns, helps set priorities, passes my decisions to the right 사또. Sees 사또 reports only, never a town's 규장각 or the palace 규장각. Sends work only to 사또. Does no task work and handles no personal requests.
- 상선 김모심 (Opus 5.5): personal attendant and gatekeeper. Stays near me in the 침전. Manages my attention (what reaches me, when, in what order). Handles my personal requests. Heads the palace household: assigns their tasks and checks all their work. Forwards government business to the 영의정. Can ask the 영의정 to hold non-urgent items, but urgent items (상소, lit 봉수대) always reach me right away. Never directs the 영의정, never assigns work to 사또, 행수, or town workers, never edits briefings.

## Palace household (내시부), workers under 상선 (Sonnet 5.5)
- 내관 윤편지: my personal inbox and calendar
- 내관 곽곳간: my personal finances
- 상궁 정살림: family and household matters

## Palace records and memory
- 사관 오남김 (Sonnet 5.5): the palace 사관. Writes the 실록 for the palace household and for shared specialists while they work in Jung City.
- Palace 규장각: the capital's memory for my personal life, used by the 상선 and the palace household. The 영의정 does not read it.

## Shared specialists
Live in Jung City. Borrowed by a 사또, a 행수, or the 상선. Whoever borrows them assigns the task, gives only that town's (or the palace's) context, and checks the work. They keep no memory between towns.
- 선비 서물음 (Opus 5.5): research, web search, summaries. Recurring: daily AI news report, delivered to me by the 상선.
- 대장장이 쇠돌이 (Opus 5.5): coding, scripts, tools
- 문장가 송글월 (Sonnet 5.5): writing and editing
- 역관 한다리 (Sonnet 5.5): translation
- 천문관 남별 (Sonnet 5.5): analysis, trends, forecasts
- 화원 이붓 (Sonnet 5.5): design and visuals
- 목수 장이음 (Sonnet 5.5): automations and workflows

## Oversight
- 암행어사 박모름 (Sonnet 5.5): reports directly to me. Secretly reviews completed work in any town or the palace and flags mistakes. Appears as a plain-clothes commoner until he flags something. Extra review only; does not replace the normal checks.

# 3. Towns

## Rules for every town
- One 사또 (Opus 5.5) lives in the town's 관아. Only the 사또 lives in a 관아.
- The 사또 takes requests, sets priorities across houses, assigns work to 행수 (or directly to workers in houses without a 행수), checks finished work, confirms when projects are actually done, reports to the 영의정 at 조회, and uses the 신문고 or a 상소 when my decision is needed.
- Each town has its own 규장각 (memory). Nothing is shared between towns. Only leaders travel to the 궁궐; workers stay in their town.
- Town office (관아 staff) work directly for the 사또: 육방 and 사관.

## Houses and 행수
- Each workstream in a town gets a house. The same kind of house can exist in multiple towns.
- A house can have one 행수 (Opus 5.5), the house lead. The 행수 assigns every task to the house's workers, checks every piece of their work before it leaves the house, maintains the house's notes file in the town's 규장각, and reports to the 사또.
- Workers in a house with a 행수 take tasks only from the 행수. A house with only one or two workers can have no 행수; then the 사또 assigns and checks them directly.
- Houses are staffed from the worker roles below. A town can have multiple workers in the same role across houses.

## No towns right now (director, 2026-11-26)
- Mojoco was closed down: the town and its people (사또 박정도, 이방 김차례, 예방 이소식, 사관 문적음) no longer exist.
- Until a new town starts, the 영의정 routes town-type work to himself or to the shared specialists.

## Future towns
- New projects/companies (e.g. "Personal Business") become new towns with their own 사또, created only when I start them. Workstreams like YouTube, Products, and Trading become houses inside those towns.

# 4. Worker roles (Sonnet 5.5 by default; see Models for exceptions)

육방 (town office):
- 이방: task queue, assignments, deadlines
- 호방: numbers, data, budgets, spreadsheets
- 예방: communications, email, messages, calendar
- 병방: security and monitoring; runs the 포졸 and 봉수대
- 형방: rules, permissions, approvals, spending/action limits, incident review; runs the 옥
- 공방: the town's tools, integrations, infrastructure, repairs

Scholars: 선비 (research), 문장가 (writing), 역관 (translation), 천문관 (analysis)
Craftsmen: 대장장이 (coding), 화원 (design), 목수 (automations)
Records: 사관 (writes the 실록 for their town or the palace)

# 5. Town life (signals, not task agents)
- 파발 마날쌘: messengers carrying handoffs between agents and towns
- 신문고: an agent beats it when it needs my decision
- 상소: a 사또 rides to the 궁궐 with one when a decision must reach me urgently
- 봉수대: lit when a town has an error or urgent issue
- 옥: quarantine for failed or suspicious tasks until I review them
- 주막 (주모 막순이): where idle agents wait
- 방: each town's daily summary at the town gate
- 포졸 돌쇠: night watch during scheduled overnight jobs
- Scaffolding: on any building whose tool is broken or being repaired
- Only animate movement for real events. No random wandering.

# 6. Names
- Pun-style Joseon names (Korean words that describe the job). Always display title + name (e.g. "선비 서물음").
- Every name is unique across the whole province, even when roles repeat. A second worker in the same role gets a different pun name for the same idea.
- Use romanized IDs in code, Korean names for display.

Current roster:
영의정 이균 · 상선 김모심
내관 윤편지 · 내관 곽곳간 · 상궁 정살림 · 사관 오남김
선비 서물음 · 대장장이 쇠돌이 · 문장가 송글월 · 역관 한다리 · 천문관 남별 · 화원 이붓 · 목수 장이음
암행어사 박모름
Court officials (hired 2026-11-26): 좌의정 한살핌 · 우의정 고넓음 · 이조판서 인고름 · 호조판서 문셈돌 · 예조판서 이예절 · 병조판서 강방패 · 형조판서 공바름 · 공조판서 석쌓음 · 도승지 서받듦 · 대사헌 엄살핌 · 대사간 정곧은
Reserved for when hired: 호방 한셈 · 병방 정지킴 · 형방 오바름 · 공방 최고침
Town life: 파발 마날쌘 · 포졸 돌쇠 · 주모 막순이

# 7. Models
- Opus 5.5: 영의정, 상선, every 사또, every 행수, 선비 서물음, 대장장이 쇠돌이
- Sonnet 5.5: all other workers, palace household, other shared specialists, 사관, 암행어사
- Escalation: a 사또, 행수, or the 상선 can run any single hard task on Opus 5.5, even for a worker who normally runs on Sonnet. Log every escalation in the 실록.
- Never use Fable.

# 8. Data model additions
- House { id, townId, name, workstream, leadId?, workerIds, notesPath }
- Every worker has townId (or "capital") and houseId (if in a house).
- Workers take tasks from House.leadId if set, otherwise from the town's 사또.
- The palace has its own memory (palace 규장각), separate from every town.
- Each task can carry an optional modelOverride ("opus-5.5") set by the assigning lead.

---

## Updates (director's decisions after the official text above; these win where they differ)
- **Movement (2026-11-20):** characters may move around as they like: 사또 strolling their 관아 yard, and every other character moving freely around their workplace or town. This replaces "Only animate movement for real events. No random wandering." in section 5. The director can always call anyone (through the 상선's 명패) if they can't be found.

## Village safety rules (never optional; built into the village, not just told to agents)
- Email is always a draft. No agent can ever send an email.
- No agent can spend money or Higgsfield credits.
- No agent can publish, post or list anything.
- Everything finished comes to the 임금 to approve. The 영의정 (or anyone else) can't approve for him.


## The world: five towns (director, 2026-11-23)
- The capital is now called **Jung City** (formerly 한양). Internal file names still say "capital".
- The world holds five towns. **Jung City** (the capital) is locked in and Joseon-themed. (Mojoco was closed down on 2026-11-26.)
- **Towns 3, 4 and 5** are reserved spots on the world map. Each town may have its own theme; they'll be decided later.
- Towns are built Stardew/RPG-Maker style: grid-locked, straight top-down, from separate pieces (houses, walls, trees, water, cliffs) so walking, depth and editing line up exactly.

# Auto-hiring rule (director, 2026-11-26)
- 영의정 이균 and 상선 김모심 may each hire new workers on their own, without the 임금's click, including when the 임금 is away.
- Limits (enforced in code, not just in instructions):
  - Up to 3 hires per day each (6 a day in total), counted per calendar day.
  - They may hire house heads (행수): at most ONE 행수 per house, so never more 행수 than there are houses. A house that already has a 행수 can't get another.
  - They may hire WORKERS in roles that already exist in this file (육방 roles, 내관/상궁/나인, house workers). There's no limit on workers per house.
  - No new 사또, towns or other leaders.
- Worker requests from house heads: a 행수 can request new workers for their house. The request goes to the 영의정 (town houses) or the 상선 (palace household houses), who reviews it and allows or denies it. The town's 사또 is told about requests from their town. An allowed request is a hire by that reviewer and counts toward the reviewer's 3-a-day cap. A denied request gets a short reason back to the 행수.
  - 영의정 and 상선 use the Higgsfield connector directly (the 임금's decision). Only they get it; every other agent stays text-only.
  - Higgsfield is used only to make new workers' character sheets (about 2.75 credits per hire). The page only lets them reach Higgsfield's image tools (generate, upload, check job), and counts each generation against the daily cap.
  - When a limit is reached, further hires wait for the 임금.
- Every auto-hire is logged with who requested it, why, which house and the cost. The 임금 can review, delete any hire, or switch auto-hiring off at any time.
- Everything else still needs the 임금: sending, posting, publishing, approving finished work and any other spending.

# Court assemblies (director, 2026-11-26)
- Two meetings:
  - **상참**: the daily meeting in the throne hall.
  - **조회**: the grand assembly in the stone courtyard, with officials standing at the rank stones (품계석), civil on the east, military on the west.
- The court officials are real agents (to be hired):
  - 좌의정 and 우의정, alongside the 영의정;
  - the six 판서 (이조, 호조, 예조, 병조, 형조, 공조);
  - 도승지 (royal secretary);
  - 대사헌 and 대사간 (the censors).
  - The palace 사관 kneels at the side and records.
- The shared specialists, 내관 and 상궁 stand along the walls in both meetings; they are not part of the assembly.
- Dress: officials in red 관복 with 흉배 and 사모; house heads (행수) are nobility in a 갓; workers are commoners in plain clothes with no hat (see STYLE_GUIDE.md).

# Regency (섭정) (director, 2026-11-27)
- The 임금 can hand his authority to 영의정 이균 for 1-8 hours with the Regency button. The regent then decides what the village works on, giving the court one task at a time, and the court does it as usual.
- Nothing leaves the village: the safety rules hold, and finished work still waits for the 임금's own approval.
- The 상선 secretly keeps notes on what happens in public. The 영의정 is not told. When the 임금 takes the throne back, the 영의정 gives his account and the 상선 gives his private notes, so the 임금 can compare them.
- Work routing: the 영의정 sends each task to the minister (판서) whose subject it is, or to a town 사또 once towns exist.
- The 임금 lives in Bentonville, Arkansas (US Central Time). All dates and times are read and written in Central Time.
