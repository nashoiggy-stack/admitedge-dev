# Research: Resume / Activities Section Builder

**Project:** essay-grader-app (AdmitEdge)
**Researched:** 2026-04-07
**Researcher note:** WebSearch and WebFetch were disabled during this session.
Findings draw from training data (cutoff August 2025), direct codebase reading,
and well-established domain knowledge about Common App. Mark accordingly where
external verification would strengthen confidence.

---

## 1. Common App Activities Section — Exact Format

**Confidence: HIGH** — This format has been stable for years and is canonical
knowledge in the college admissions domain.

### Slot structure

The Common App allows up to **10 activity slots**. Students fill them
top-to-bottom in self-assigned priority order. Admissions readers scan them in
that order, so slot 1 must be the most impressive.

### Fields per activity (every field has a hard character cap enforced by the form)

| Field | Cap | Notes |
|---|---|---|
| Activity Type | dropdown | ~35 predefined categories (see below) |
| Position / Leadership title | 50 chars | "President", "Founder", "Team Captain", etc. |
| Organization name | 100 chars | The club, team, employer, org name |
| Description | 150 chars | What you did and accomplished — tightest constraint |
| Participation grades | checkboxes | 9, 10, 11, 12 (multi-select) |
| Timing | radio | During school year / During break / Year-round |
| Hours per week | numeric | Student-reported |
| Weeks per year | numeric | Student-reported |
| Pursued in college | checkbox | Yes/No |

### Activity Type dropdown categories (official list, ~35 options)

Academic (club or class-based), Arts (general), Career-Oriented,
Community Service (Volunteer), Computer/Technology, Cultural, Dance,
Debate/Speech, Environmental, Family Responsibilities, Foreign Language,
Internship, Journalism/Publication, Junior ROTC, LGBT, Music (Instrumental),
Music (Vocal), Religious, Research, Robotics, School Spirit, Science/Math,
Social Justice, Sports (Club), Sports (JV/Varsity), Student Government/Politics,
Theater/Drama, Work (Paid), Other Club/Activity, Other (Explain in description).

### The 150-character description — what it demands

150 characters = roughly one short sentence. There is **no room for filler**.
Every word must carry information. Admissions officers read thousands of these.

Common App's own guidance says: write in an active voice, avoid restating
the activity type or organization name (already captured in other fields),
lead with what you specifically did or achieved.

Strong example (149 chars):
"Led 12-person team; raised $18K for local shelter via annual gala; secured 3
corporate sponsors; increased donations 40% YoY"

Weak example (wastes chars on restatement):
"I am the president of the environmental club where we do environmental
activities and raise awareness about climate issues"

### Hours/weeks fields

Students self-report. There is no validation. Admissions officers mentally
flag implausibly high numbers (>20 hrs/week across multiple activities).
The builder should surface a soft warning when total reported hours across
all activities exceeds ~25 hrs/week during school year.

---

## 2. What Tools Like CollegeVine, Going Merry, and Scoir Do

**Confidence: MEDIUM** — Based on training data through August 2025, direct
experience with these platforms is not possible without live access.

### CollegeVine

- Provides an activity list builder that mirrors the Common App fields exactly
- Offers AI-assisted description writing — student enters a longer description
  in natural language, tool compresses it to fit 150 chars
- Shows a live character counter with color feedback (red when over limit)
- Gives tier/strength ratings (their "chancing" model factors in activity tier)
- Lets students reorder activities via drag-and-drop
- Activity descriptions feed into chancing calculations
- The tight integration between EC tier and admissions odds is their
  differentiating feature vs. standalone resume tools

### Going Merry

- Primarily a scholarship platform, but has a profile builder
- Activity list is more freeform — they care about the resume more than the
  exact Common App format
- Less emphasis on 150-char compression, more on complete descriptions
- Better for generating a full extracurricular resume PDF

### Scoir

- School-facing platform (counselors see student data)
- Activity list mirrors Common App fields
- Less AI assistance, more form-filling
- Counselors can view and comment on student activity lists before submission

### Key gaps in competitor UX

1. None of them integrate live evaluation (tier scoring) *alongside* editing —
   you fill out the form, then separately see strength indicators
2. Description compression AI tends to produce generic output because it does
   not know why the activity matters in context of the student's full profile
3. None generate a print-ready resume automatically formatted in a way
   admissions offices actually prefer

---

## 3. Best Practices for Activity Description Writing

**Confidence: HIGH** — This is well-established college counseling doctrine.

### The formula that works in 150 chars

```
[Action verb] + [what/scope] + [quantified result or recognition]
```

The description is NOT a job duty list. It is a compressed impact statement.

### High-value action verbs (by category)

Leadership: Founded, Led, Directed, Organized, Chaired, Spearheaded, Managed
Research: Investigated, Analyzed, Published, Presented, Designed, Developed
Teaching/mentoring: Tutored, Coached, Mentored, Trained, Taught
Community: Raised, Collected, Coordinated, Volunteered, Campaigned, Advocated
Creative: Composed, Choreographed, Designed, Produced, Directed, Illustrated
Sports: Captained, Competed, Earned, Placed, Qualified

### Quantification patterns that land well

Numbers compress meaning efficiently. Prioritize:
- Money raised / budgets managed: "$8,400 raised for...", "managed $15K budget"
- People reached / served: "tutored 30+ students", "coached team of 18"
- Scale / reach: "presented to 400-person audience", "300+ subscribers"
- Growth: "increased membership 3x", "grew revenue 60%"
- Awards/rankings: "1st place, state competition", "top 5% nationally"
- Duration signals commitment and is often already covered by hours/weeks fields,
  so do not waste 150-char description repeating years if not adding new info

### What to avoid

- Restating the activity type (already in the dropdown)
- Restating the position (already in position field)
- Restating the organization name (already in org field)
- Filler phrases: "I was responsible for", "I had the opportunity to",
  "We worked together as a team to"
- Passive voice: "was selected by", "was given the role of"
- Vague claims without numbers: "helped many people", "made a big impact"

### The no-article / telegraphic style

Because 150 chars is so tight, Common App has normalized a telegraphic style
that drops articles and pronouns:

"Founded debate club; grew membership to 45; placed 2nd at state championship"

Not: "I founded the debate club and grew its membership to 45 students..."

The builder's AI suggestion engine should output this telegraphic style.

### Prioritization of the 10 slots

The order matters as much as the descriptions. Standard counseling guidance:

1. Put the most impressive / most time-intensive activity first
2. Group thematically adjacent activities (signals spike/focus)
3. Do not put work/family responsibilities last just because they seem
   "less academic" — they signal maturity and context
4. If you have a clear spike (e.g., STEM research), put all STEM activities
   in slots 1-4 to create a visual cluster

---

## 4. Integration with the Existing EC Evaluator

**Confidence: HIGH** — Based on direct reading of the codebase.

### What the existing evaluator does

The current `extracurriculars` feature works via **conversational intake**:
1. Student describes an activity in free-form chat
2. AI advisor asks follow-up questions (leadership, impact, commitment, hours)
3. Student clicks "Done" when satisfied
4. Student triggers an evaluation across all activities
5. Returns: tier (1-4), band (limited → exceptional), scores, recommendations

The evaluation schema (`ProfileEvaluation`) already captures:
- Per-activity: tier, category, scores (leadership/impact/commitment/alignment),
  highlights, improvements
- Profile-level: band, spikes, isWellRounded, gaps, recommendations

This is excellent input for a resume builder. The gap is:
**the evaluator extracts rich structured data but does not let the student
output it in Common App format.**

### Integration architecture options

**Option A: Two-tab experience on the same page**

After evaluation completes, show a second tab: "Build Common App Section".
Pre-populate the fields using data extracted from the conversation + evaluation:
- `activityName` → Organization name field
- `category` → Activity Type dropdown (map existing category strings to the
  official Common App category list)
- Leadership title from conversation → Position field
- AI generates a 150-char description from conversation transcript + tier data

Pros: Zero navigation friction, student sees evaluation and builder together.
Cons: Page gets heavy; evaluation and builder serve slightly different goals.

**Option B: Dedicated `/resume` route**

A separate page that reads from the same `localStorage` keys the evaluator
already writes (`EC_ACTIVITIES_KEY`, `EC_STORAGE_KEY`).

Student flow:
1. Complete evaluation on `/extracurriculars`
2. Navigate to `/resume` to fine-tune Common App fields + generate PDF

Pros: Clear separation of concerns, resume builder works independently.
Cons: Requires students to go through evaluation first, or provide an
alternative data entry path.

**Option C: Unified data model, independent entry points**

Introduce a shared `ActivityRecord` type that both the evaluator and the
builder read/write. The evaluator populates it from conversation. The builder
lets students edit all fields directly and also run evaluation on demand.

This is the most architecturally correct approach and enables the most features,
but requires a data model refactor.

### Recommended approach

Start with **Option A** (tab on the same page) for the fastest delivery,
then evolve toward Option B as the feature matures. Option C is the right
long-term architecture — introduce it when adding persistence (Supabase).

### Data mapping from existing types

```typescript
// Existing ECConversation + ActivityEvaluation → proposed ActivityRecord

interface ActivityRecord {
  // Common App fields
  readonly id: string;
  readonly activityType: CommonAppActivityType;  // the 35-value enum
  readonly positionTitle: string;       // max 50 chars
  readonly organizationName: string;    // max 100 chars
  readonly description: string;         // max 150 chars — the hard one
  readonly gradesActive: Array<9 | 10 | 11 | 12>;
  readonly timing: 'school_year' | 'break' | 'year_round';
  readonly hoursPerWeek: number;
  readonly weeksPerYear: number;
  readonly intendInCollege: boolean;

  // Evaluation data (from existing evaluator)
  readonly tier?: ActivityTier;         // 1-4, from existing type
  readonly scores?: ActivityScores;     // from existing type
  readonly category?: string;           // evaluator's category string
  readonly highlights?: string[];
  readonly improvements?: string[];

  // Source
  readonly sourceConvId?: string;       // links back to ECConversation
}
```

The `CommonAppActivityType` enum should mirror the official dropdown exactly —
do not use freeform strings, because it affects how the PDF is rendered and
how the builder validates completeness.

### AI description generation

Given the conversation transcript + evaluation tier + position + org name,
Claude can generate a tight 150-char description. The prompt should:
1. Provide the conversation transcript
2. Provide the evaluation scores for context
3. Give strict output constraints: ≤150 chars, telegraphic style, no restating
   position or org name
4. Ask for 3 variants ranked by impact, so student can pick

The existing `/api/ec-evaluate` and `/api/ec-chat` routes demonstrate the
correct pattern for these API calls.

---

## 5. PDF / Printable Resume Generation

**Confidence: HIGH** for library options; MEDIUM for integration specifics.

### What students actually need

Two distinct output formats:

**A. Common App activities list preview**
Renders the 10 activities exactly as they will appear to admissions readers —
same field layout, same character limits visible. Used for review before
copy-pasting into Common App. Not a traditional resume.

**B. Traditional extracurricular resume**
One-page PDF document, often submitted to schools that ask for a supplemental
resume, or shared with counselors. Has section headers, bullet points under
each activity, is more readable than the Common App format.

### Library options for PDF generation

**react-pdf / @react-pdf/renderer** (recommended for Option B)
- Renders React components to PDF via a virtual DOM
- No browser print API needed — generates a real PDF blob
- Excellent for structured layouts like a resume
- Works well with Next.js API routes (generate server-side, stream to browser)
- Character limit warnings can be enforced in the React component
- Already no dependency in package.json — needs to be added

```bash
npm install @react-pdf/renderer
```

**html2canvas + jsPDF** (simpler but lower quality)
- Screenshots DOM → converts to PDF
- Font rendering is inconsistent across browsers
- Fine for a quick MVP but produces blurry text at high DPI
- Not recommended for a polished product

**Puppeteer / Playwright server-side screenshot** (high quality, heavy)
- Renders a real browser page, captures PDF
- Produces the highest-quality output
- Too heavy for a Vercel/serverless deployment
- Only viable if you have a dedicated render server

**window.print() with print CSS** (zero dependencies)
- Fastest to ship
- Student opens a print-optimized view, uses browser print to PDF
- Controllable with `@media print` CSS
- Recommended for the Common App preview (Option A output)
- Not recommended for the traditional resume (Option B) — too hard to control
  layout consistently across browsers

### Recommended strategy

1. **Phase 1:** Ship the Common App preview as a print CSS view.
   Zero new dependencies. Student presses Cmd+P, gets their activities list.
   Add a "Print / Save as PDF" button that calls `window.print()`.

2. **Phase 2:** Add `@react-pdf/renderer` for a proper one-page
   extracurricular resume PDF. Run generation server-side in a Next.js API
   route, return a PDF blob.

### Resume layout best practices for the PDF output

- One page only — admissions offices do not read two-page EC resumes
- Header: Name, Email, School, Graduation year
- Section for each Common App activity type with entries grouped under headers
- Each entry: Position title + Org name (bold), then description as bullet
- Include hours/week and weeks/year in a subtle line below each entry
- Awards / honors as a separate section if applicable
- Font: a clean serif (Georgia) or sans-serif (Inter/Helvetica) — do not use
  script or decorative fonts
- No photo, no color bars, no "objective statement" — this is not a job resume

---

## 6. Existing Codebase Integration Notes

### Current storage model

Activities live in `localStorage` under two keys:
- `EC_ACTIVITIES_KEY` (`ec-evaluator-activities`): `ECConversation[]`
- `EC_STORAGE_KEY` (`ec-evaluator-result`): `ProfileEvaluation`

The resume builder must read from these same keys to avoid requiring students
to re-enter activities. The proposed `ActivityRecord[]` type should be stored
under a new key, e.g. `ec-resume-activities`, and populated via a migration
step from the conversation data.

### No Zod validation currently

The EC evaluator parses Claude's JSON response with `JSON.parse()` directly.
When building the resume section, any form data (hours per week, char counts)
should be validated with Zod before storing — this is the right place to
introduce schema validation into this feature.

### Existing dependencies available

- `motion` (framer-motion v12) — use for animated character count bars,
  drag-to-reorder
- `lucide-react` — icons for field states (check, warning, error)
- `@anthropic-ai/sdk` — already configured for AI description generation
- `pdf-parse` and `mammoth` are already installed (for essay parsing) —
  these do not help with PDF generation, only parsing

### Dependency to add

`@react-pdf/renderer` for Phase 2 PDF generation. No other new dependencies
needed for Phase 1.

---

## 7. Pitfalls to Avoid

### Pitfall 1: Storing descriptions over 150 chars

The form must enforce the 150-char hard limit before any data is persisted.
Common App's form silently truncates on paste — students lose content.
Show a live counter that goes red at 140 chars (warning) and blocks saving
at 151.

### Pitfall 2: Mapping free-text categories to the Common App dropdown

The evaluator assigns freeform category strings ("STEM Research", "Community
Service"). These do not map 1:1 to Common App's official dropdown values.
Build an explicit mapping table, and surface it to the student to confirm —
do not auto-assign silently.

### Pitfall 3: Over-relying on AI description generation without student review

AI-generated descriptions can be factually accurate but tonally off, or omit
details the student considers important. Always show the generated description
as a starting point that the student edits — never auto-submit AI output.
Make the editable state visually obvious.

### Pitfall 4: Ignoring hours math

If a student reports 20 hrs/week on Activity 1, 15 hrs/week on Activity 2,
and 10 hrs/week on Activities 3-5, that is 65 hrs/week. Admissions officers
flag this. The builder should show a total-hours-per-week indicator and
warn when it exceeds a plausible threshold (~25 during school year,
~40 during summer break).

### Pitfall 5: PDF generation in the browser bundle

`@react-pdf/renderer` should run server-side only. If imported in a client
component it will bloat the JS bundle significantly. Keep it in an API route.

### Pitfall 6: Not handling the "no evaluation yet" state

Students should be able to use the resume builder even if they have not run
the evaluator. The builder should work as a standalone form, with evaluation
data shown as enrichment when available, not required.

---

## 8. Suggested Feature Scope for the Builder

### Must-have (table stakes)

- Form with all 9 Common App fields per activity
- Live 150-char counter on description (warning at 140, error at 151)
- 50-char counter on position, 100-char on org name
- Drag-to-reorder the 10 slots (priority ordering matters)
- Pre-population from existing EC conversations when available
- AI-assisted description generation (3 variants, student picks + edits)
- Common App preview view (styled to look like the actual form)
- Print / Save as PDF via `window.print()` (Phase 1)

### High-value additions

- Hours-per-week total calculator with overflow warning
- Tier badges shown alongside each activity (pulled from evaluator)
- "Improve this description" AI feedback inline
- Activity type category mapping confirmation step
- Traditional one-page resume PDF via `@react-pdf/renderer` (Phase 2)
- Completeness checker (flags empty fields, missing hours, etc.)

### Defer

- Cloud sync (Supabase) — localStorage is fine until auth is fully built out
- Sharing / exporting to counselors — nice-to-have, not core
- Multiple application profiles — over-engineering for v1

---

## Sources

- Direct codebase reading: `src/lib/extracurricular-types.ts`, `src/lib/ec-prompts.ts`,
  `src/hooks/useECEvaluator.ts`, `src/components/ECResults.tsx`,
  `src/app/extracurriculars/page.tsx`, `src/app/api/ec-evaluate/route.ts`,
  `package.json`
- Common App Activities section format: training data (HIGH confidence —
  format is stable and canonical; verify official field caps at commonapp.org
  before implementation)
- Activity description best practices: well-established college counseling
  doctrine (HIGH confidence)
- CollegeVine / Going Merry / Scoir feature analysis: training data through
  August 2025 (MEDIUM confidence — features may have evolved; verify against
  current product before positioning claims)
- @react-pdf/renderer: training data confirmed through npm registry patterns
  (MEDIUM confidence — verify current version compatibility with React 19
  before installing)
