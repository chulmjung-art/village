# Agents

Every character in the village is a real agent. Each one has a folder here:

| File | What it is |
|---|---|
| `INSTRUCTIONS.md` | Who they are, their job, who they report to, who reports to them, and the rules they follow. Their standing orders. |
| `NOTES.md` | Their own memory. They add what they learn here, so they remember it next time. |
| `profile.json` | The short facts the game and the team use: title, name, model, where they live, their character sheet. |

Rules for every agent (from TEAM.md):
- Title and name are always shown together (e.g. 사또 박정도).
- A town's memory (규장각) stays in that town. An agent never copies another town's notes or context.
- Workers take tasks only from their lead (their house's 행수, else their town's 사또; the palace household from the 상선), and that lead checks their work before it counts as done.
- Characters may move around as they like (director's update).
- None of these agents runs by itself yet. Before any agent runs on its own, Claude must confirm to the director that it uses only the director's subscriptions (no API keys, no pay-per-use).

Folders follow the official roster in TEAM.md (18 agents): 영의정 이균, 상선 김모심; palace household 내관 윤편지,
내관 곽곳간, 상궁 정살림; palace 사관 오남김; shared specialists 선비 서물음, 대장장이 쇠돌이, 문장가 송글월, 역관 한다리,
천문관 남별, 화원 이붓, 목수 장이음; 암행어사 박모름; Mojoco: 사또 박정도, 이방 김차례, 예방 이소식, 사관 문적음.
Folder names are romanized IDs (e.g. `satto-bak-jeongdo`); Korean names are for display.
Town-life figures (파발 마날쌘, 포졸 돌쇠, 주모 막순이) are signals, not task agents, so they have no folder.
