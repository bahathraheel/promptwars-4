# Accessibility Statement

Accessibility is a **core product requirement** for StadiumPulse AI — the platform exists in part to help disabled fans navigate a 80,000-seat stadium. We target **WCAG 2.1 Level AA** throughout.

---

## Design Decisions

### Semantic Structure
- Landmark elements (`header`, `nav`, `main`, `footer`) throughout all pages
- Logical heading hierarchy (`h1` → `h2` → `h3`) never skipping levels
- Semantic `<section>`, `<article>`, `<label>`, `<select>` elements
- "Skip to main content" link visible on keyboard focus

### Keyboard Support
- The feature switcher implements the **ARIA Tabs pattern** (`role="tablist"`, `role="tab"`, `role="tabpanel"`)
- **Roving `tabIndex`** — only the active tab is in the tab order
- **Arrow key navigation** — `←`/`→` move between tabs, `Home`/`End` jump to first/last
- All form controls and buttons reachable by keyboard with visible focus indicator (2px primary-color outline)
- Minimum **44×44px touch targets** on all interactive elements

### Screen Readers
- Every `<input>` and `<select>` has an associated `<label>`
- Results render in `aria-live` regions (`polite` for informational, `assertive` for incident triage)
- `aria-busy` toggled during async requests so screen readers announce loading state
- Each result carries correct `lang` and `dir` attributes — Arabic responses rendered `dir="rtl"`
- All decorative icons carry `aria-hidden="true"`; meaningful icons have `aria-label`

### Colour & Contrast
- All text/background pairs meet **AA contrast ratio (≥ 4.5:1)** in both default and high-contrast themes
- Colour is **never the sole signal** — status badges carry both colour and text labels
- Focus indicators visible in all colour modes

### SVG Route Map
- Wayfinding SVG carries `role="img"` and a descriptive `aria-label`
- Always accompanied by an equivalent text description of the turn-by-turn directions
- Route nodes have individual `aria-label` attributes describing their location

### User Preferences
- `@media (prefers-reduced-motion: reduce)` — all animations and transitions disabled
- `@media (prefers-contrast: more)` — border widths increased, muted colours brightened
- `@media (forced-colors: active)` — Windows High Contrast Mode: buttons use `ButtonText`/`ButtonFace` system colours

### Step-Free Routing (First-Class Feature)
- `POST /api/navigate` with `stepFree: true` excludes stair-only edges before running Dijkstra
- The returned route **provably** uses only elevator/ramp segments
- Frontend checkbox "Require Step-Free / Elevator Route" is keyboard and screen-reader accessible
- Route result announces via `aria-live` describing whether step-free constraints were applied

### Multilingual & Low-Literacy
- AI responses available in **10 languages** including RTL (Arabic)
- Pictogram mode adds leading emoji to responses for low-literacy support
- Voice mode via Web Speech API (degrades gracefully if browser doesn't support it)

---

## Known Limitations
- Interface chrome (labels, navigation tabs) is presented in English
- AI-generated answers, translations, and announcements are available in all 10 configured languages
- Automated axe-core E2E verification is a planned addition for CI
