# Project Review System - Complete Setup & Migration Guide

## 📋 Overview

This refactored system creates **ONE final record per presenter per review** instead of separate HR and peer records.

### Key Features:
- ✅ Single final record per presenter with unique constraint `[review_id, presenter_id]`
- ✅ HR Score calculated from 10 criteria
- ✅ Peer Average calculated from all peer evaluations
- ✅ Presentation Score = (HR Score + Peer Average) / 2
- ✅ Total Penalty based on peer deviation from HR evaluation
- ✅ Final Score = Presentation Score - Total Penalty
- ✅ Upsert logic ensures record creation or update on each evaluation submission
- ✅ Leaderboard generated from single final records only

---

## 🚀 Installation & Migration Steps

### Step 1: Update Prisma Schema
```bash
# The schema has been updated with:
# 1. New FinalResult model with proper unique constraint
# 2. Added updated_at field for tracking changes
# 3. Added cascade delete relationships
# 4. Added finalResults relation in ProjectReview

cat /prisma/schema.prisma
```

### Step 2: Run Prisma Migration
```bash
# From project root directory
cd /home/ubuntu/Downloads/Intern-main/Intern-Matching\ edit/tata-hr-intern-matching-master-2-1--main

# Generate migration files
npx prisma migrate resolve --rolled-back 20260623_update_final_results 2>/dev/null || true

# Deploy migration
npx prisma migrate deploy

# Verify schema
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

### Step 3: Verify Database Schema
```bash
# View database with Prisma Studio
npx prisma studio
```

### Step 4: Install Dependencies (if needed)
```bash
cd server
npm install

cd ../client
npm install
```

---

## 📁 New Files Added

### Service Layer
**File**: `server/src/services/projectReviewService.ts`

Contains all business logic:
- `calculateHRScore()` - Sum of 10 criteria (0-10 each)
- `calculatePeerAverage()` - Average of all peer evaluations
- `calculatePresentationScore()` - (HR + Peer) / 2
- `calculateAnalyticalPenalty()` - Penalty for deviation > ±5 from HR score
- `calculateTotalPenaltyForPresenter()` - Average penalty from peers
- `calculateFinalScore()` - Presentation Score - Total Penalty
- `upsertFinalResult()` - **Core function: Create or update ONE record per presenter**
- `getFinalResult()`, `getFinalResultsForReview()` - Query functions
- `generateLeaderboardFromFinalResults()` - Ranked leaderboard from final records
- `getReviewSummary()` - Aggregated statistics

### Updated Routes
**File**: `server/src/routes/projectReview.ts`

New/Updated endpoints:
- `POST /api/Project-review/create` - Create review
- `GET /api/Project-review` - List all reviews
- `GET /api/Project-review/:reviewId` - Get review details
- `POST /api/Project-review/evaluation` - Submit evaluation (triggers upsert)
- `GET /api/Project-review/final-result/:reviewId/:presenterId` - Get final result
- `GET /api/Project-review/score/:reviewId/:presenterId` - Score breakdown
- `GET /api/Project-review/final-results/:reviewId` - All final results
- `GET /api/Project-review/leaderboard/:reviewId` - **Ranked leaderboard (one per presenter)**
- `GET /api/Project-review/summary/:reviewId` - Statistics
- `POST /api/Project-review/recalculate/:reviewId` - Recalculate all final results
- `GET /api/Project-review/penalties/:reviewId/:evaluatorId` - Penalty breakdown
- `GET /api/Project-review/export/:reviewId` - Export for reporting
- `DELETE /api/Project-review/evaluation/:evaluationId` - Delete evaluation

---

## 💾 Database Schema Changes

### Old Structure (Multiple Records)
```
FinalResult Table:
├── id
├── review_id
├── intern_id (now presenter_id)
├── hr_score (OR peer average - separate rows)
├── peer_average (OR hr_score - separate rows)
├── presentation_score
└── analytical_penalty
```

### New Structure (Single Record)
```
FinalResult Table:
├── id                  TEXT PRIMARY KEY
├── review_id           TEXT (FK → ProjectReview.id)
├── presenter_id        TEXT
├── presenter_name      TEXT
├── hr_score            FLOAT (HR evaluation total)
├── peer_average        FLOAT (Average of all peers)
├── presentation_score  FLOAT ((hr_score + peer_average) / 2)
├── total_penalty       FLOAT (Average penalty from peers)
├── final_score         FLOAT (presentation_score - total_penalty)
├── created_at          DATETIME
├── updated_at          DATETIME
└── UNIQUE([review_id, presenter_id])  ← ONE record per presenter per review
```

---

## 🧮 Calculation Examples

### Example 1: Simple Case
```
HR Evaluation: 75 points
Peer Evaluations: [70, 84, 95, 95, 80]

Calculations:
1. HR Score = 75
2. Peer Average = (70 + 84 + 95 + 95 + 80) / 5 = 84.8
3. Presentation Score = (75 + 84.8) / 2 = 79.9
4. Penalty (peer 1): |70 - 75| = 5 → penalty = 0 (within ±5)
5. Penalty (peer 2): |84 - 75| = 9 → penalty = 4 (beyond ±5)
6. Penalty (peer 3): |95 - 75| = 20 → penalty = 15
7. Penalty (peer 4): |95 - 75| = 20 → penalty = 15
8. Penalty (peer 5): |80 - 75| = 5 → penalty = 0
9. Total Penalty = (0 + 4 + 15 + 15 + 0) / 5 = 6.8
10. Final Score = 79.9 - 6.8 = 73.1

Final Record:
{
  review_id: "review_1",
  presenter_id: "INT001",
  presenter_name: "Intern A",
  hr_score: 75,
  peer_average: 84.8,
  presentation_score: 79.9,
  total_penalty: 6.8,
  final_score: 73.1
}
```

### Example 2: With No HR Evaluation Yet
```
HR Evaluation: NOT SUBMITTED
Peer Evaluations: [70, 84, 95]

Calculations:
1. HR Score = 0 (default)
2. Peer Average = (70 + 84 + 95) / 3 = 83
3. Presentation Score = (0 + 83) / 2 = 41.5
4. Total Penalty = 0 (can't compare without HR)
5. Final Score = 41.5

Note: Once HR submits, record will update automatically
```

---

## 🔄 Upsert Logic (Core Feature)

### What is Upsert?
**Upsert** = **Update** if exists, **Insert** if not

### How it Works in This System

```
When an evaluation is submitted:

1. Check if final record exists for [review_id, presenter_id]
   ├─ If YES: UPDATE existing record
   └─ If NO: CREATE new record

2. Recalculate all scores:
   ├─ HR Score (from HR evaluation or 0)
   ├─ Peer Average (from all peer evaluations)
   ├─ Presentation Score
   ├─ Total Penalty
   └─ Final Score

3. Persist single updated record
```

### Example Flow

**Time 1**: HR submits evaluation
```
→ upsertFinalResult(review_1, INT001, "Intern A")
→ No record exists → CREATE FinalResult
→ hr_score: 75, peer_average: 0, ...
```

**Time 2**: First peer submits evaluation
```
→ upsertFinalResult(review_1, INT001, "Intern A")
→ Record exists → UPDATE FinalResult
→ hr_score: 75, peer_average: 70, ...
```

**Time 3**: Second peer submits evaluation
```
→ upsertFinalResult(review_1, INT001, "Intern A")
→ Record exists → UPDATE FinalResult
→ hr_score: 75, peer_average: 77, ...
```

**Final Result**: ONE record with all aggregated data
```
{
  review_id: "review_1",
  presenter_id: "INT001",
  hr_score: 75,
  peer_average: 77,
  presentation_score: 76,
  total_penalty: 4.5,
  final_score: 71.5
}
```

---

## 📊 Leaderboard Generation

### Old Approach (Separate Records)
❌ HR record for Intern A
❌ Peer record for Intern A
❌ Duplicate entries, confusion in ranking

### New Approach (Single Record)
✅ ONE record per presenter
✅ Ranked by `final_score` DESC
✅ Clean leaderboard

### Example Leaderboard
```
GET /api/Project-review/leaderboard/review_1

Response:
[
  {
    rank: 1,
    presenter_id: "INT001",
    presenter_name: "Intern A",
    hr_score: 75,
    peer_average: 84.8,
    presentation_score: 79.9,
    total_penalty: 6.8,
    final_score: 73.1
  },
  {
    rank: 2,
    presenter_id: "INT002",
    presenter_name: "Intern B",
    hr_score: 80,
    peer_average: 78.0,
    presentation_score: 79.0,
    total_penalty: 3.2,
    final_score: 75.8
  }
]
```

---

## 🛠️ API Usage Examples

### 1. Submit HR Evaluation
```bash
curl -X POST http://localhost:3000/api/Project-review/evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "review_1",
    "presenter_id": "INT001",
    "presenter_name": "Intern A",
    "evaluator_id": "HR001",
    "is_hr": true,
    "technical": 8,
    "communication": 7,
    "confidence": 8,
    "understanding": 9,
    "problem_solving": 7,
    "innovation": 8,
    "documentation": 8,
    "qa_handling": 7,
    "presentation": 8,
    "overall": 8
  }'
```

**Response**: Contains both `evaluation` object and updated `finalResult`

### 2. Submit Peer Evaluation
```bash
curl -X POST http://localhost:3000/api/Project-review/evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "review_id": "review_1",
    "presenter_id": "INT001",
    "presenter_name": "Intern A",
    "evaluator_id": "PEER001",
    "is_hr": false,
    "technical": 7,
    "communication": 8,
    "confidence": 9,
    "understanding": 8,
    "problem_solving": 8,
    "innovation": 9,
    "documentation": 7,
    "qa_handling": 8,
    "presentation": 9,
    "overall": 8
  }'
```

**Response**: Auto-updated final result

### 3. Get Final Result
```bash
curl http://localhost:3000/api/Project-review/final-result/review_1/INT001
```

**Response**:
```json
{
  "id": "final_1",
  "review_id": "review_1",
  "presenter_id": "INT001",
  "presenter_name": "Intern A",
  "hr_score": 79,
  "peer_average": 84.8,
  "presentation_score": 81.9,
  "total_penalty": 6.8,
  "final_score": 75.1,
  "created_at": "2026-06-23T10:00:00Z",
  "updated_at": "2026-06-23T10:15:00Z"
}
```

### 4. Get Leaderboard
```bash
curl http://localhost:3000/api/Project-review/leaderboard/review_1
```

### 5. Recalculate All Final Results
```bash
curl -X POST http://localhost:3000/api/Project-review/recalculate/review_1
```

Use this after bulk imports or data corrections.

---

## ⚠️ Migration Checklist

- [ ] Backup existing database before migration
- [ ] Run `npx prisma migrate deploy`
- [ ] Deploy new `projectReviewService.ts`
- [ ] Deploy new `projectReview.ts` routes
- [ ] Update client to call new endpoints
- [ ] Test HR evaluation submission
- [ ] Test peer evaluation submission
- [ ] Verify leaderboard shows one record per presenter
- [ ] Test recalculate endpoint
- [ ] Verify analytics/penalties calculations

---

## 🐛 Troubleshooting

### Issue: Migration fails
```bash
# Reset migrations (dev only)
npx prisma migrate reset

# Or manually delete db file and run
npx prisma migrate deploy
```

### Issue: Duplicate records still exist
```bash
# Recalculate all final results
curl -X POST http://localhost:3000/api/Project-review/recalculate/:reviewId
```

### Issue: Scores not updating
```bash
# Verify evaluation was created
GET /api/Project-review/:reviewId

# Check final result
GET /api/Project-review/final-result/:reviewId/:presenterId

# Check calculation details
GET /api/Project-review/score/:reviewId/:presenterId
```

---

## 📝 Code Quality

### Type Safety
- Full TypeScript support
- Proper error handling
- Null checks on calculations

### Performance
- Indexed queries on `review_id` and `presenter_id`
- Single upsert operation (not multiple queries)
- Efficient aggregation queries

### Maintainability
- Calculation functions separated from routes
- Clear function documentation
- Reusable calculation logic

---

## 🚀 Production Deployment

1. **Backup Database**
   ```bash
   cp dev.db dev.db.backup.$(date +%s)
   ```

2. **Test Migration on Dev/Staging**
   ```bash
   npm run build
   npm test
   ```

3. **Deploy**
   ```bash
   npm run build
   npm start
   ```

4. **Verify**
   ```bash
   curl http://your-server/api/Project-review/
   ```

---

## 📚 Reference

### Unique Constraint
```prisma
@@unique([review_id, presenter_id])
```
Ensures only ONE record per presenter per review at database level.

### Upsert Syntax
```typescript
await prisma.finalResult.upsert({
  where: {
    review_id_presenter_id: {
      review_id: "review_1",
      presenter_id: "INT001"
    }
  },
  create: { /* new record data */ },
  update: { /* updated record data */ }
});
```

### Cascade Delete
```prisma
review ProjectReview @relation(..., onDelete: Cascade)
```
When a review is deleted, all associated final results are deleted automatically.

---

Generated: 2026-06-23
Last Updated: 2026-06-23
