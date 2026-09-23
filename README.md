# Sysco&Tech

A web-based management system for the Sysco&Tech student club — handling member profiles, tasks, attendance, a points-based leaderboard, and role-based admin controls.

## Overview

Sysco&Tech is built for university student club administrators, team leads and members (UI in Mongolian). Admins and team leads create tasks and mark attendance; members set their own three-state progress on a task, and a lead or admin then scores the finished work — that review is the only thing that awards points. A real-time leaderboard ranks all members by total points. The app is deployed on Vercel with Firebase as the backend.

## Features

- **Authentication** — email/password sign-up and login via Firebase Auth, with a show/hide password toggle
- **Three roles** — `admin`, `lead` (team lead) and `member`; admin-only and lead-only pages are guarded both client-side and by Firestore security rules
- **Dashboard** — overview of total points, reviewed/active tasks, and top leaderboard members
- **Task management** — admins create tasks for anyone; a lead creates tasks for their own team only. Tasks carry a title, description, maximum point value and acceptance deadline, and can be assigned to individuals, a whole team, or every member
- **Self-reported status** — each assignee moves their own work through *Хүлээгдэж буй → Хийж байгаа → Дууссан*. Setting a status never awards points and is frozen once the work has been reviewed
- **Lead review** — a lead (or an admin) scores each finished assignee from 0 to the task's point value, with an optional comment. One Firestore transaction writes the review, credits `totalPoints` and appends to the `pointsHistory` ledger; a second review of the same person is rejected. Nobody reviews themselves
- **Assignee visibility** — every task shows who it is assigned to, with avatar, team, status and score. `all` and `team:<team>` assignments are expanded to real people from a single cached directory read
- **Team filter** — Бүгд / Хөгжүүлэлт / Дотоод үйл ажиллагаа / Дизайн / Сошиал across the leaderboard, member directory, attendance and both task workspaces, persisted in the `?team=` search param
- **Points leaderboard** — real-time ranking with a top-3 podium; ranks are recomputed inside the active filter
- **Profile management** — members edit their major, team and course year
- **Attendance tracking** — admins mark daily attendance (present/late/absent/excused); present members automatically receive +5 points
- **Member directory** — admin view with search, team filter, task history, attendance history, and role/team assignment
- **Responsive layout** — collapsible sidebar on mobile, desktop sidebar on larger screens
- **Dark theme** — consistent dark UI across all pages

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19.2.4 |
| Component Library | shadcn/ui (Radix UI, Tailwind CSS) |
| Styling | Tailwind CSS v4, tw-animate-css |
| State / Data Fetching | Tanstack React Query v5, React Context |
| Icons | Lucide React |
| Notifications | Sonner |
| Date Utilities | date-fns v4 |
| Authentication | Firebase Auth |
| Database | Cloud Firestore |
| Linter / Formatter | Biome |
| Package Manager | pnpm |
| Deployment | Vercel |
| Fonts | JetBrains Mono, Barlow, Barlow Condensed (Google Fonts) |

## Architecture

```
Browser
  └─ Next.js App (Vercel)
       ├─ AuthProvider (Firebase Auth state + Firestore profile)
       ├─ QueryClientProvider (React Query)
       └─ Pages / Components
            ├─ /login, /signup     → Firebase Auth
            └─ /dashboard/*        → Firestore (real-time snapshots)
                 ├─ tasks          → member status transaction
                 ├─ lead/tasks     → team task creation + review transaction
                 ├─ admin/tasks    → club-wide task creation + review transaction
                 ├─ admin/members  → users collection (role / team assignment)
                 ├─ admin/attendance → attendance collection (+5 points)
                 └─ leaderboard    → users ordered by totalPoints
```

- **Firebase Auth** handles identity; `AuthContext` exposes `user` and `userData` (the Firestore profile) to the whole app.
- **Firestore** stores four collections: `users`, `tasks`, `attendance`, `pointsHistory`.
- **There is no backend.** Every rule that matters is enforced in `firestore.rules`, and `scripts/test-rules.ts` runs 43 cases against it on the emulator.
- **Points are awarded in exactly one place** — the review transaction in `src/components/task-workspace.tsx`. It writes the task's `assigneeReview`, increments `users/<uid>.totalPoints` and appends to `pointsHistory` atomically. Members cannot write `totalPoints`, `role`, `assigneeReview` or `pointsHistory` at all.
- **Assignment tokens.** A task's `assignedTo` holds uids, the literal `"all"`, or `"team:<team>"`, so one `array-contains-any` query finds everything assigned to a member. `resolveAssignees()` in `src/lib/tasks.ts` expands the tokens back into people.
- **`lastReviewedUid`.** Security rules cannot read a key out of a map diff, so a review write also declares which uid it targets. The rules verify that declaration against the real diff, then use it to authorise the write.
- **Real-time snapshots** live in effects (`useAssignedTasks`, `useAllTasks`, `useLeaderboard`) and mirror into the React Query cache, so the listener is always unsubscribed on unmount.

### Roles

| | member | lead | admin |
|---|---|---|---|
| Set own task status | ✓ | ✓ | ✓ |
| Create tasks | — | own team only | anyone |
| Edit / delete tasks | — | own tasks only | any task |
| Review + award points | — | own team, not self | anyone but self |
| Assign roles and teams | — | — | ✓ |
| Mark attendance | — | — | ✓ |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, Providers, metadata
│   ├── page.tsx                    # Redirects to /dashboard or /login
│   ├── providers.tsx               # QueryClientProvider + AuthProvider + Toaster
│   ├── login/page.tsx              # Login form
│   ├── signup/page.tsx             # Registration form
│   ├── globals.css                 # Tailwind directives + CSS variables
│   └── dashboard/
│       ├── layout.tsx              # Dashboard shell — sidebar + mobile header
│       ├── page.tsx                # Overview — stats, recent tasks, leaderboard preview
│       ├── tasks/page.tsx          # Member task list, detail dialog, status picker
│       ├── leaderboard/page.tsx    # Leaderboard with top-3 podium + team filter
│       ├── profile/page.tsx        # Member profile — major, team, course
│       ├── lead/
│       │   ├── layout.tsx          # Lead guard (lead or admin)
│       │   └── tasks/page.tsx      # <TaskWorkspace scope="lead" />
│       └── admin/
│           ├── layout.tsx          # Admin guard
│           ├── tasks/page.tsx      # <TaskWorkspace scope="admin" />
│           ├── members/page.tsx    # Member directory, search, role/team assignment
│           └── attendance/page.tsx # Daily attendance with date picker
├── components/
│   ├── task-workspace.tsx          # Task creation + oversight, shared by admin and lead
│   ├── assignee-list.tsx           # Assignee rows + compact avatar stack
│   ├── review-dialog.tsx           # Score 0..task.points with an optional comment
│   ├── status-picker.tsx           # Member's three-state progress control
│   ├── team-filter.tsx             # Shared team segmented filter
│   ├── member-role-editor.tsx      # Admin role/team selects
│   ├── dashboard-sidebar.tsx       # Sidebar navigation (main / team / admin sections)
│   ├── page-spinner.tsx            # Shared page loading state
│   └── ui/                         # shadcn/ui primitives
├── context/
│   └── AuthContext.tsx             # Firebase Auth + Firestore user data
├── hooks/
│   ├── useAuthActions.ts           # login, signup, logout + Mongolian error mapping
│   ├── useAssignedTasks.ts         # Real-time tasks assigned to the signed-in user
│   ├── useAllTasks.ts              # Real-time full task collection (admin / lead)
│   ├── useMembers.ts               # Cached uid → User directory
│   ├── useLeaderboard.ts           # Real-time leaderboard
│   └── useTeamFilter.ts            # `?team=` search-param filter
├── lib/
│   ├── firebase.ts                 # Firebase app, auth, Firestore initialization
│   ├── constants.ts                # Single source for majors, teams, roles, statuses
│   ├── permissions.ts              # isAdmin / isLead / canManageMember / canReview
│   ├── tasks.ts                    # resolveAssignees, status + review helpers
│   ├── queryClient.ts              # React Query client singleton
│   └── utils.ts                    # cn(), getInitials(), asDate(), formatDateTime()
└── types/
    └── index.ts                    # User, Task, TaskReview, AttendanceRecord
scripts/
├── migrate-task-status.ts          # Legacy → status/review migration (dry-run by default)
├── test-rules.ts                   # Security-rules tests (emulator)
└── test-review-flow.ts             # Status → review → points transaction test (emulator)
firestore.rules                     # Firestore security rules
firestore.indexes.json              # Firestore composite indexes
```

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm (this project uses pnpm — see `pnpm-lock.yaml`)
- A Firebase project with Authentication (email/password provider enabled) and Firestore enabled

### Install

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file at the project root with the following variables (obtain values from your Firebase project settings):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

> **Never commit `.env.local` or expose actual secret values.** Only variable names should appear in documentation.

### Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firestore Emulator (Optional)

For local development with the Firestore emulator:

```bash
firebase emulators:start --only firestore
```

The emulator runs on `127.0.0.1:8080` by default (configured in `firebase.json`).

## Scripts / Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start the Next.js development server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Lint `src/` with Biome |
| `pnpm lint:fix` | Lint + auto-fix `src/` with Biome |
| `pnpm format` | Format `src/` with Biome |
| `pnpm check` | Lint + type-check (`tsc --noEmit`) + production build |
| `pnpm test:rules` | Security-rules tests against the Firestore emulator |
| `pnpm test:signup` | Sign-up / rollback / self-heal test against the Auth + Firestore emulators |
| `pnpm test:review` | Status → review → points transaction test against the emulator |
| `pnpm migrate:status` | Legacy task migration (dry run; add `-- --apply` to write) |
| `pnpm backfill:users` | Create missing `users/{uid}` profiles (dry run; add `-- --apply`) |

### Tests

All three suites need the emulators running:

```bash
firebase emulators:start --only firestore,auth
```

```bash
pnpm test:rules    # 48 cases: who may set a status, review, award points, create tasks, sign up
pnpm test:review   # the status → review → point-crediting transaction, including double-review
pnpm test:signup   # sign-up, rollback on a rejected profile write, and the self-heal
```

### Backfilling missing profiles

Sign-up used to create the Firebase Auth account and then have its `users/{uid}` write rejected,
because the create rule was `allow create: if false`. Those accounts can sign in but have no
profile. Two things fix them:

- `AuthContext` re-creates a missing profile on the next sign-in, so anyone who logs in heals
  themselves.
- `scripts/backfill-users.ts` heals everyone at once, without waiting for them to log in.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export FIREBASE_PROJECT_ID=your-project-id

pnpm backfill:users              # dry run — lists exactly who would be created
pnpm backfill:users -- --apply   # create the profiles
```

New profiles get `role: "member"`, `totalPoints: 0`, an empty `course`/`major`, no team, and
`createdAt` taken from the Auth account's `metadata.creationTime`. The name falls back to the Auth
display name, then to the part of the email before the `@`. **Existing documents are never
overwritten** — the script writes with `create()`, which fails rather than clobbers.

> Deploy the rules *before* running this, and keep the service account key outside the repo.
> `.gitignore` already excludes `*service-account*.json`, `*serviceAccount*.json` and
> `firebase-adminsdk-*.json`.

### Migration

Existing tasks written under the old "member marks complete, points land immediately" flow need
converting once, after the new rules are deployed:

```bash
pnpm migrate:status                      # dry run — prints exactly what would change
pnpm migrate:status -- --apply           # write assigneeStatus + legacy assigneeReview
pnpm migrate:status -- --apply --cleanup # once verified, drop the legacy fields
```

`assigneeCompleted[uid] === true` becomes `assigneeStatus[uid] = "done"` plus a back-filled review
(`reviewedBy: "legacy"`, full marks) that records the points already granted. **The script never
changes `totalPoints`.** Tasks the old admin "approve" emptied out are reported at the end — their
assignments cannot be reconstructed.

## Known Limitations

- **A lead's per-uid assignments are only checked client-side**: security rules have no loops, so they can block a lead from using the `"all"` token or another team's `"team:<team>"` token, but cannot verify that every individual uid in `assignedTo` belongs to that lead's team. `src/components/task-workspace.tsx` enforces it before writing; the trade-off is documented in `firestore.rules`.
- **Attendance points are not transactional and not logged**: the attendance page awards +5 for "present" with a batch write plus a read taken outside it, and writes no `pointsHistory` entry — unlike the review flow, which is atomic and audited.
- **No task editing in the UI**: the rules permit admins (and leads, on their own tasks) to update and delete tasks, but no screen offers it yet.
- **No email verification** and **no password reset flow**.
- **Sign-up rollback is best-effort**: if the profile write is rejected the Auth account is deleted again, but if that delete also fails the account is left without a profile. `AuthContext` re-creates it on the next sign-in.
- **No pagination**: member lists, task lists and the leaderboard load every document at once.
- **UI language**: all labels are in Mongolian; no i18n or language switching is implemented.

## License

Not yet specified.
