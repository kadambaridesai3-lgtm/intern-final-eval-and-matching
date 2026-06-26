run # Tata Motors — Intern Guide Matching System
### Pimpri Plant · HR Department

Internal web application for HR staff to manage intern–guide placements with automated matching.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ (workspaces support) |
| PostgreSQL | 14+ |

---

## Quick Start

### 1. Clone / navigate to the Project root

```bash
cd "TATA/HR software"
```

### 2. Create the PostgreSQL database

```sql
CREATE DATABASE intern_guide_db;
```

### 3. Configure environment

Edit `.env` in the Project root (already created):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/intern_guide_db"
```

Adjust the username/password to match your local PostgreSQL setup.

### 4. Install all dependencies

```bash
npm install
```

### 5. Run database migrations

```bash
npm run db:migrate
```

### 6. Generate Prisma client

```bash
npm run db:generate
```

### 7. Seed the database

```bash
npm run db:seed
```

This creates:
- **80 guides** across Manufacturing, R&D, Quality, IT, HR, Design, Testing, Logistics
- **15 interns** in various statuses (complete, Matched, Applied, Waitlisted, Allotted)
- **Match logs** with realistic scores

### 8. Start development servers

```bash
npm run dev
```

This starts both servers concurrently:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

Open http://localhost:5173 in your browser.

### 9. Run on a single port (production-style)

Build the client, generate Prisma, and run only the backend server:

```bash
npm run start:single
```

This serves the built frontend from Express on the same backend port:
- **Single URL**: http://localhost:3001

You can also use `npm start` after `npm install`; the root `prestart` hook will build both workspaces automatically before launching the server.

---

## Project Structure

```
/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script (8 guides, 15 interns)
├── server/
│   └── src/
│       ├── index.ts           # Express entry point
│       ├── lib/prisma.ts      # PrismaClient singleton
│       ├── utils/matching.ts  # Matching algorithm
│       └── routes/
│           ├── interns.ts     # POST/GET/PATCH intern routes
│           ├── guides.ts      # CRUD guide routes
│           ├── match.ts       # GET ranked matches, POST run waitlist
│           └── dashboard.ts   # Summary stats
├── client/
│   └── src/
│       ├── App.tsx            # Router setup
│       ├── api/index.ts       # All fetch calls
│       ├── types/index.ts     # Shared TypeScript types
│       ├── components/
│       │   ├── Layout.tsx
│       │   ├── TagInput.tsx   # AutoAllotted tag input
│       │   ├── CapacityBar.tsx
│       │   ├── StatusBadge.tsx
│       │   └── SortableTable.tsx
│       └── pages/
│           ├── Dashboard.tsx
│           ├── InternsList.tsx
│           ├── AddIntern.tsx
│           ├── InternDetail.tsx
│           ├── GuidesList.tsx
│           ├── AddEditGuide.tsx
│           ├── GuideDetail.tsx
│           └── Waitlist.tsx
├── package.json               # Root workspace + Prisma scripts
├── .env                       # DATABASE_URL
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Summary stats |
| `GET` | `/api/interns` | List interns (filter: status, intern_type, branch, search) |
| `POST` | `/api/interns` | Create intern + auto-run matching |
| `GET` | `/api/interns/:id` | Intern detail with match logs |
| `PATCH` | `/api/interns/:id/confirm` | HR confirms match → complete |
| `PATCH` | `/api/interns/:id/Allotted` | Mark Allotted, free slot, re-run waitlist |
| `GET` | `/api/guides` | List all guides with capacity |
| `POST` | `/api/guides` | Create guide |
| `GET` | `/api/guides/:id` | Guide detail with intern lists |
| `PUT` | `/api/guides/:id` | Update guide |
| `GET` | `/api/match/:internId` | Top 5 ranked guide matches for an intern |
| `POST` | `/api/match/run` | Re-run matching for all Waitlisted interns |

---

## Matching Algorithm

Scores each available guide against an intern on three dimensions:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Skill Overlap | 40% | matched_skills / total_guide_required_skills |
| Domain Alignment | 40% | 1.0 (exact), 0.5 (partial), 0.0 (none) |
| CGPA | 20% | cgpa / 10 |

Tie-breaking: fewer current interns wins.

---

## Intern Status Flow

```
Applied
  └─ (matching runs on submit)
       ├─ Matched      ← guide has capacity
       │    └─ HR confirms → complete → HR marks Allotted → Allotted
       └─ Waitlisted   ← all guides full
            └─ slot opens → re-run → Matched (flagged to HR)
```

---

## Re-seeding

```bash
npm run db:reset   # drops + re-migrates + prompts to re-seed
# or
npm run db:seed    # only works on an already-migrated database
```

## Importing Interns from CSV or Excel

On the Interns page, use **Download Template** to get a CSV file with example data and the correct column names.

Supported columns:

- `full_name`
- `email`
- `phone`
- `intern_type`
- `college`
- `branch`
- `graduation_year`
- `cgpa`
- `skills`
- `preferred_domain`
- `start_date`
- `duration_months`

Notes:

- `skills` should be comma-separated in a single cell.
- The upload button accepts `.csv` and `.xlsx` files.
- After upload, the app shows a results page with created IDs and any row-level errors.
# intern-matching
