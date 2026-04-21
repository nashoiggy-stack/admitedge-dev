# Directory Structure

## Root Layout

```
essay-grader-app/
├── public/                    # Static assets
│   ├── gpa-calculator.html    # Standalone GPA calculator (iframe)
│   ├── logo.png               # Logo image (missing — SVG fallback in code)
│   └── *.svg                  # Default Next.js icons
├── src/
│   ├── app/                   # Next.js App Router pages + API routes
│   ├── components/            # React components
│   ├── data/                  # Static data (colleges, config)
│   ├── hooks/                 # Custom React hooks
│   └── lib/                   # Shared utilities, types, prompts
├── .planning/                 # GSD planning artifacts
├── .env.local                 # API keys (Anthropic)
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## App Routes (src/app/)

```
app/
├── page.tsx                   # Landing page (GSAP scroll animation)
├── layout.tsx                 # Root layout (fonts, AppShell)
├── globals.css                # Global styles, glass class, text-gradient
├── essay/page.tsx             # Essay Grader feature
├── gpa/
│   ├── page.tsx               # GPA Calculator (iframe wrapper)
│   └── layout.tsx             # GPA-specific layout
├── colleges/page.tsx          # College List Builder
├── chances/page.tsx           # Chance Calculator + map
├── extracurriculars/page.tsx  # EC Evaluator (conversational)
├── profile/page.tsx           # User Profile (auto-fill hub)
└── api/
    ├── grade/route.ts         # Essay grading (Anthropic Claude)
    ├── chat/route.ts          # Essay coaching chat
    ├── suggestions/route.ts   # Inline essay suggestions
    ├── ec-chat/route.ts       # EC activity chatbot
    └── ec-evaluate/route.ts   # EC profile evaluation
```

## Components (src/components/)

### Feature Components
| File | Purpose |
|------|---------|
| EssayInput.tsx | Essay text input + file upload |
| ScoreOverview.tsx | Score summary after grading |
| CommonAppTab.tsx | Common App criteria results |
| VspiceTab.tsx | VSPICE rubric results |
| FeedbackTab.tsx | General feedback display |
| LineNotesTab.tsx | Line-by-line suggestions |
| ChatTab.tsx | Coaching chat interface |
| InlineEditor.tsx | Grammarly-style inline suggestions |
| EssayHistorySidebar.tsx | Saved essay history sidebar |
| TabNavigation.tsx | Tab switcher for essay results |
| CollegeFilters.tsx | College list filter panel |
| CollegeResults.tsx | College list results display |
| CollegeCard.tsx | Individual college card |
| ChanceForm.tsx | Chance calculator input form |
| ChanceResult.tsx | Chance calculator result display |
| ECConversation.tsx | EC activity chat interface |
| ECActivityList.tsx | EC activity sidebar list |
| ECResults.tsx | EC evaluation results |

### Shell Components
| File | Purpose |
|------|---------|
| AppShell.tsx | AuthProvider + AuthGate + NavBar + ProfileSync |
| AuthGate.tsx | Auth check + glassmorphism login screen |
| AuthProvider.tsx | Supabase auth context |
| NavBar.tsx | Top navigation (5 tools + home) |
| NavBarWrapper.tsx | Conditionally shows/hides nav |
| ProfileSync.tsx | Syncs localStorage to Supabase cloud |
| AdmitEdgeLogo.tsx | SVG logo component |
| AuroraBackground.tsx | Page background wrapper |
| ScrollReveal.tsx | Scroll-triggered fade-in wrapper |

### UI Components (src/components/ui/)
| File | Purpose |
|------|---------|
| cinematic-landing-hero.tsx | Landing page with GSAP scroll (currently unused — logic moved to page.tsx) |
| college-map.tsx | MapLibre GL map for college locations |
| shader-lines.tsx | WebGL shader background |
| shader-animation.tsx | Three.js shader (npm-based) |
| web-gl-shader.tsx | WebGL chromatic wave shader |
| card.tsx, button.tsx, badge.tsx | shadcn base components |

## Hooks (src/hooks/)

| File | Purpose |
|------|---------|
| useAuth.ts | Supabase auth (sign in/up/out/guest) |
| useProfile.ts | Profile state + localStorage + computed values |
| useGrading.ts | Essay grading state + API call |
| useChat.ts | Coaching chat state |
| useSuggestions.ts | Inline suggestions state |
| useEssayInput.ts | Essay text + file handling |
| useEssayHistory.ts | Saved essay persistence |
| useCollegeFilter.ts | College list filtering + classification |
| useChanceCalculator.ts | Chance calculation + auto-fill |
| useECEvaluator.ts | EC conversations + evaluation |
| useScoreColor.ts | Score-to-color mapping |

## Lib (src/lib/)

| File | Purpose |
|------|---------|
| admissions.ts | Scoring: GPA/test comparison, classification, essay adjustment |
| college-types.ts | College, ChanceInputs, CollegeFilters types |
| profile-types.ts | UserProfile, SAT/ACT scores, composite calculations |
| extracurricular-types.ts | EC types: conversations, evaluations, bands |
| types.ts | Essay grading types |
| ec-prompts.ts | EC chatbot + evaluator system prompts |
| prompts.ts | Essay chat system prompts |
| suggestions-prompt.ts | Inline suggestions prompt builder |
| rubrics.ts | Essay grading rubric definitions |
| parse-file.ts | PDF/DOCX parsing for essay upload |
| profile-sync.ts | Supabase cloud sync for profile data |
| supabase.ts | Supabase client initialization |
| utils.ts | cn() utility (clsx + tailwind-merge) |

## Where to Add New Code

- **New feature page:** `src/app/[feature-name]/page.tsx`
- **New API route:** `src/app/api/[endpoint]/route.ts`
- **New hook:** `src/hooks/use[Feature].ts`
- **New types:** `src/lib/[feature]-types.ts`
- **New component:** `src/components/[ComponentName].tsx`
- **New UI primitive:** `src/components/ui/[component].tsx`
- **New static data:** `src/data/[dataset].ts`
