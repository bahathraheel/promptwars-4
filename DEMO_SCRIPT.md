# StadiumPulse AI – Demo Script (3 Minutes)

> **Timing guide:** Each section ~45 seconds. Practice once before presenting.

---

## 🎯 Opening (15 seconds)

> "StadiumPulse AI is a GenAI operating layer for the FIFA World Cup 2026.
> It has two faces sharing one grounded knowledge base:
> a Fan Copilot for 80,000 fans, and an Ops Copilot for stadium operators.
> Let me show you both."

---

## 1️⃣ Fan Copilot Demo (60 seconds)

### Navigate to: `http://localhost:5173/` (Fan Copilot)

1. **Ask a navigation question in English:**
   > Type: "Where is the accessible entrance for wheelchair users?"
   - ✅ Point out: grounded answer (green checkmark), response time, intent classification shown below the reply.

2. **Switch language to Spanish (ES 🇪🇸)** using the dropdown in the header.
   > Type: "¿Dónde está la estación médica más cercana?"
   - ✅ Point out: response is in Spanish, grounded from the same English knowledge base.

3. **Toggle Pictogram mode** (smiley icon in header).
   > Type: "Where is food?"
   - ✅ Point out: emoji-heavy response, designed for low-literacy accessibility.

4. **Click SMS mode** in the header.
   - ✅ Show the SMS-style mock view: plain text, no rich UI.
   - Say: *"This proves the system works without a smartphone — just a basic feature phone with SMS."*

5. **Point out the Sign Language widget** in the SMS view sidebar.
   - Say: *"Architecture supports sign-language avatar clips for PA announcements."*

---

## 2️⃣ Ops Copilot Demo (60 seconds)

### Navigate to: `/ops` (Ops Dashboard)

1. **Click "Generate Report"** button.
   - ✅ Wait 3–5 seconds for LLM to analyze.
   - Point out the **KPI strip**: overall occupancy, pending actions count, critical gates.

2. **Scroll to Gate Status cards.**
   - ✅ Show capacity bars (green/yellow/red), flow rate, wait time.
   - Say: *"These are aggregate counts only — no facial recognition, no PII. Privacy by design."*

3. **Scroll to Recommended Actions.**
   - ✅ Read one action's title and rationale aloud.
   - Say: *"Each action has a confidence score and a one-line 'why'. Nothing executes automatically."*

4. **Click "Approve"** on one action.
   - ✅ Show status changes to ✅ Approved.
   - Click "Reject" on another.
   - Say: *"Human-in-the-loop. Every decision is logged."*

5. **Navigate to `/audit`** (Audit Log).
   - ✅ Show the timestamped trail: report generated → actions proposed → decisions made.

---

## 3️⃣ What-If Simulation (30 seconds)

### Navigate to: `/whatif`

1. **Set the slider to 10,000 extra fans via Gate 3 in 15 minutes.**
2. **Click "Run Simulation".**
   - ✅ Show the narrative (LLM-generated bottleneck analysis).
   - ✅ Point at the bar chart: baseline vs. simulated capacity per gate.
   - Point out the bottleneck list and mitigation suggestions.
   - Say: *"Operators can test scenarios before they happen."*

---

## 4️⃣ Sustainability (15 seconds)

### Navigate to: `/sustainability`

1. **Click "plastic water bottle"** quick chip.
   - ✅ Show: blue Recycling bin recommendation.
   - ✅ Show: emissions comparison bar (car vs. shuttle vs. metro).
   - Say: *"Fans get instant sorting guidance plus carbon impact awareness."*

---

## 🏁 Closing (15 seconds)

> "StadiumPulse AI is grounded — it refuses to guess when it's not confident.
> It's accessible — pictogram, voice, SMS, keyboard-navigable, sign-language ready.
> It's privacy-first — no PII, no biometrics, aggregate data only.
> And every AI recommendation requires a human to approve it.
> Thank you."

---

## Backup: If something fails

- **LLM timeout?** The Fan Copilot shows a user-friendly error message. Mention: *"Graceful degradation."*
- **Backend down?** Start it: `cd backend && npm run dev`
- **Frontend down?** Start it: `cd frontend && npm run dev`
- **No API key?** The retrieval guard still works — low-confidence queries get a refusal without hitting the LLM.
