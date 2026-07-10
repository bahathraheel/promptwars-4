# Problem-Statement Alignment

> **Challenge:** _Build a GenAI-enabled solution that enhances stadium operations
> and the overall tournament experience for **fans, organizers, volunteers, or
> venue staff**. The solution must leverage Generative AI to improve
> **navigation, crowd management, accessibility, transportation, sustainability,
> multilingual assistance, operational intelligence, or real-time decision
> support** during the FIFA World Cup 2026._

StadiumPulse AI implements **every** named capability area and serves **every**
named audience — as working, tested features. This mapping is also exposed as a
machine-readable contract at **`GET /api/capabilities`** and asserted by
integration tests (Tests 118–128).

---

## Capability Area → Feature → Endpoint

| GenAI Capability Area | Feature | Endpoint |
|---|---|---|
| **Navigation** | Shortest-path wayfinding + step-free accessible mode + SVG map | `POST /api/navigate` |
| **Crowd Management** | Live per-zone density + AI-authored prioritised actions | `GET /api/crowd/:venueId` |
| **Accessibility** | Step-free routing, wheelchair paths, sensory rooms info, WCAG-AA UI | `POST /api/navigate` + cross-cutting |
| **Transportation** | Travel carbon-footprint comparison + match-day arrival planning | `POST /api/sustainability/footprint`, `GET /api/plan/:venueId` |
| **Sustainability** | Green travel nudge + waste bin identification | `POST /api/sustainability/footprint`, `POST /api/sustainability` |
| **Multilingual Assistance** | RAG concierge in 10 languages (RTL-aware), translation, PA announcements | `POST /api/concierge`, `POST /api/translate`, `POST /api/announce` |
| **Operational Intelligence** | Crowd snapshot, PA announcements, shift briefings | `GET /api/crowd/:venueId`, `POST /api/announce`, `POST /api/briefing` |
| **Real-time Decision Support** | Incident triage with priority, SLA, dispatch team, escalation | `POST /api/incident` |

---

## Audience / Persona → Feature

| Persona | Served By |
|---|---|
| **Fans** | Multilingual concierge, step-free wayfinding, green travel comparison, match-day arrival plan, on-demand translation, food concessions |
| **Organizers** | Crowd intelligence snapshot, incident triage, PA announcements, What-If surge simulation |
| **Volunteers** | Role-specific shift briefings, PA announcements, wayfinding, incident reporting |
| **Venue Staff** | Incident triage, crowd operations dashboard, shift briefings, announcement broadcast, translation |

---

## Machine-Verifiable Coverage

```bash
curl https://promptwars-backend-681763957794.us-central1.run.app/api/capabilities
```

Returns:
```json
{
  "worldCup2026": { "venuesCount": 16, "teamsCount": 48, "openingVenue": "Estadio Azteca...", "finalVenue": "MetLife Stadium..." },
  "capabilities": [ ...8 items... ],
  "audiences": [ ...4 items... ]
}
```

---

## FIFA World Cup 2026 Data Grounding

StadiumPulse AI is grounded in **real tournament data**:

- All **16 host venues** across USA, Canada and Mexico with accessibility amenity metadata
- **48-team / 104-match** format fixture skeleton
- Opening match at **Estadio Azteca, Mexico City** (Match 1, 11 June 2026)
- Final at **MetLife Stadium, New York/New Jersey** (Match 104, 19 July 2026)
- Per-venue wayfinding graphs (Dijkstra adjacency lists)
- 10 supported languages including RTL (Arabic)
- Real-world CO₂ emission factors per transport mode
