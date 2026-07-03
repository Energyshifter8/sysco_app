# Sysco&Tech

A web-based management system for the Sysco&Tech student club — handling member profiles, tasks, attendance, a points-based leaderboard, and role-based admin controls.

## Overview

Sysco&Tech is built for university student club administrators and members (UI in Mongolian). Admins create tasks and mark attendance; members self-report task progress and earn points. A real-time leaderboard ranks all members by total points. The app is deployed on Vercel with Firebase as the backend.

## Features

- **Authentication** — email/password sign-up and login via Firebase Auth
- **Role-based access** — admin and member roles; admin-only pages are guarded both client-side and via Firestore security rules
- **Dashboard** — overview of total points, completed/active tasks, and top leaderboard members
- **Task management** — admins create tasks with titles, descriptions, point values, and assign them to individual members, entire teams, or all members
- **Self-reported progress** — members update a progress slider (0-100%) and mark tasks complete; a Firestore transaction atomically awards points and logs to an append-only `pointsHistory` ledger
- **Points leaderboard** — real-time ranking of all members with a top-3 podium view
- **Team organization** — members belong to one of four teams: Development, Operations, Design, or Social
- **Profile management** — members edit their major, team, and course year
- **Attendance tracking** — admins mark daily attendance (present/late/absent); present members automatically receive +5 points
- **Member directory** — admin view of all members with search, task history, and attendance history
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
       ├─ AuthProvider (Firebase Auth state)
       ├─ QueryClientProvider (React Query)
       └─ Pages / Components
            ├─ /login, /signup  → Firebase Auth
            └─ /dashboard/*     → Firestore (real-time snapshots)
                 ├─ members page  → users collection
                 ├─ tasks page    → tasks collection
                 ├─ leaderboard   → users collection (ordered by totalPoints)
                 └─ attendance    → attendance collection + users (increment points)
```

- **Firebase Auth** handles user identity; `AuthContext` exposes `user` and `userData` (Firestore profile) to the entire app.
- **Firestore** stores four collections: `users`, `tasks`, `attendance`, `pointsHistory`.
- **Firestore security rules** enforce that members can only update their own profile fields and task progress; admins can manage tasks, attendance, and any user.
- **Points are awarded via Firestore transactions** — task completion and attendance both use atomic transactions that update `totalPoints` and write an audit entry to `pointsHistory`.
- **React Query** manages server state; real-time Firestore snapshots are wrapped in query functions for cache integration.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — fonts, Providers, metadata
│   ├── page.tsx                # Root page — redirects to /dashboard or /login
│   ├── providers.tsx           # QueryClientProvider + AuthProvider + Toaster
│   ├── login/page.tsx          # Login form (email + password)
│   ├── signup/page.tsx         # Registration form (name + email + password)
│   ├── globals.css             # Tailwind directives + CSS variables
│   └── dashboard/
│       ├── layout.tsx          # Dashboard shell — sidebar + mobile header
│       ├── page.tsx            # Overview — stats, recent tasks, leaderboard preview
│       ├── tasks/page.tsx      # Member task list with detail dialog + progress slider
│       ├── leaderboard/page.tsx # Full leaderboard with top-3 podium
│       ├── profile/page.tsx    # Member profile — edit major, team, course
│       └── admin/
│           ├── layout.tsx      # Admin guard — redirects non-admins
│           ├── tasks/page.tsx  # Create tasks, view/approve existing tasks
│           ├── members/page.tsx # Member directory with search + detail modal
│           └── attendance/page.tsx # Daily attendance with date picker
├── components/
│   ├── dashboard-sidebar.tsx   # Sidebar navigation (member + admin sections)
│   └── ui/                     # shadcn/ui primitives (button, card, dialog, etc.)
├── context/
│   └── AuthContext.tsx          # React Context for Firebase Auth + Firestore user data
├── hooks/
│   ├── useAuthActions.ts        # login, signup, logout wrappers
│   └── useLeaderboard.ts        # Real-time leaderboard from Firestore
├── lib/
│   ├── firebase.ts              # Firebase app, auth, and Firestore initialization
│   ├── constants.ts             # Major/specialty options (Mongolian labels)
│   ├── queryClient.ts           # React Query client singleton
│   └── utils.ts                 # cn() for Tailwind merging, getInitials()
└── types/
    └── index.ts                 # User, Task, AttendanceRecord, Team types
scripts/
└── test-progress-transaction.ts # E2E test for the task-completion → point-awarding transaction
firebase.json                    # Firebase project config (emulator port 8080)
firestore.rules                  # Firestore security rules
firestore.indexes.json           # Firestore composite indexes
biome.json                       # Biome linter + formatter config
next.config.ts                   # Next.js config
postcss.config.mjs               # PostCSS config (Tailwind plugin)
components.json                  # shadcn/ui config
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

### E2E Test

The progress transaction can be tested against the Firestore emulator:

```bash
npx tsx scripts/test-progress-transaction.ts
```

This seeds a test user and task, runs the completion transaction, verifies point awarding, tests idempotency (double-credit prevention), and cleans up.

## Known Limitations

- **Points are client-writable**: The Firestore rules allow members to update their own `totalPoints`. A server-side Cloud Function would be the proper enforcement point, but no function infrastructure exists yet. The `pointsHistory` append-only ledger serves as an audit mechanism to detect anomalies (noted in `firestore.rules:5-9`).
- **No email verification**: Newly registered users are not required to verify their email address.
- **No password reset flow**: There is no "forgot password" functionality.
- **No task deletion by admins**: Admins can create and update tasks but the UI does not provide a delete action.
- **Attendance auto-points are not transactional**: The attendance page awards +5 points for "present" status using a batch write + `getDoc` read, which is not atomic (unlike the task completion flow which uses `runTransaction`).
- **No pagination**: Member lists, task lists, and leaderboard load all documents at once — no pagination or infinite scroll.
- **Limited error handling**: Some Firestore operations use bare `catch` blocks that do not surface detailed error messages to the user.
- **UI language**: All labels are in Mongolian; no i18n or language switching is implemented.

## License

Not yet specified.
