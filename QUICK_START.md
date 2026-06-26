# 🚀 Quick Start Guide - Project Review System

## 📊 Problem Solved

**Before**: Multiple records per presenter (separate HR and peer evaluations)
**After**: Single unified record per presenter with all calculated scores

---

## ⚡ Quick Commands

### 1. Setup & Migration
```bash
cd /home/ubuntu/Downloads/Intern-main/Intern-Matching\ edit/tata-hr-intern-matching-master-2-1--main

# Apply schema changes
npx prisma migrate deploy

# Regenerate client
npx prisma generate

# View database
npx prisma studio
```

### 2. Start Development Server
```bash
cd server
npm install
npm run dev
```

### 3. Run Tests
```bash
npm test -- projectReview.test.ts
```

---

## 🔑 Key Endpoints

### Submit Evaluation (Auto-Upserts Final Result)
```bash
POST /api/Project-review/evaluation

# HR Evaluation
{
  "review_id": "rev_1",
  "presenter_id": "INT001",
  "presenter_name": "Intern A",
  "evaluator_id": "HR001",
  "is_hr": true,
  "technical": 8, "communication": 7, "confidence": 8,
  "understanding": 9, "problem_solving": 7, "innovation": 8,
  "documentation": 8, "qa_handling": 7, "presentation": 8,
  "overall": 8
}

# Returns: { evaluation, finalResult, message }
```

### Get Final Result (One Record)
```bash
GET /api/Project-review/final-result/:reviewId/:presenterId

# Returns single unified record with:
# - hr_score
# - peer_average
# - presentation_score
# - total_penalty
# - final_score
```

### Get Leaderboard
```bash
GET /api/Project-review/leaderboard/:reviewId

# Returns array ranked by final_score DESC
# ONE record per presenter only
```

### Recalculate All Results
```bash
POST /api/Project-review/recalculate/:reviewId

# Use after bulk imports or data fixes
# Deletes and recreates all final results
```

---

## 💡 Core Logic

### Calculation Order:
1. **HR Score** = Sum of 10 criteria (from HR evaluation)
2. **Peer Average** = Sum of all peer scores ÷ number of peers
3. **Presentation Score** = (HR Score + Peer Average) ÷ 2
4. **Penalty** = Average deviation > ±5 from HR score
5. **Final Score** = Presentation Score - Penalty

### Example:
```
HR: 75
Peers: [70, 84, 95, 95, 80]

1. HR Score = 75
2. Peer Average = 424 ÷ 5 = 84.8
3. Presentation = (75 + 84.8) ÷ 2 = 79.9
4. Penalty = (0 + 4 + 15 + 15 + 0) ÷ 5 = 6.8
5. Final = 79.9 - 6.8 = 73.1

Final Record:
{
  review_id, presenter_id, presenter_name,
  hr_score: 75, peer_average: 84.8,
  presentation_score: 79.9,
  total_penalty: 6.8, final_score: 73.1
}
```

---

## 📁 Files Changed/Created

**Created**:
- `server/src/services/projectReviewService.ts` - All business logic
- `server/src/tests/projectReview.test.ts` - Comprehensive tests
- `MIGRATION_GUIDE.md` - Full documentation
- `QUICK_START.md` - This file

**Updated**:
- `prisma/schema.prisma` - New FinalResult structure
- `server/src/routes/projectReview.ts` - New/updated endpoints
- `prisma/migrations/20260623_update_final_results/` - Migration SQL

---

## 🔄 Upsert Magic Explained

```typescript
// When evaluation submitted:
await upsertFinalResult(review_id, presenter_id, presenter_name)

// Checks: Does record exist for [review_id, presenter_id]?
// ✅ YES → UPDATE all fields
// ❌ NO  → CREATE new record

// Result: Always ONE record, always current data
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] HR evaluation submission works
- [ ] Peer evaluations auto-update final record
- [ ] Only ONE record exists per presenter
- [ ] Leaderboard shows correct ranking
- [ ] Scores are correctly calculated
- [ ] Penalties are applied correctly
- [ ] Database has unique constraint on [review_id, presenter_id]

---

## 🐛 Debug Helpers

### Check if record was created:
```bash
GET /api/Project-review/final-result/:reviewId/:presenterId
```

### See score breakdown:
```bash
GET /api/Project-review/score/:reviewId/:presenterId
```

### Check penalty calculation:
```bash
GET /api/Project-review/penalties/:reviewId/:evaluatorId
```

### Review summary stats:
```bash
GET /api/Project-review/summary/:reviewId
```

---

## ❓ FAQ

**Q: Why only ONE record per presenter?**
A: Eliminates duplicate entries, simplifies rankings, and ensures data consistency.

**Q: What if HR hasn't evaluated yet?**
A: HR score defaults to 0. Once HR evaluates, record auto-updates.

**Q: Can I edit an evaluation?**
A: Delete the old evaluation, submit new one. Final result auto-recalculates.

**Q: Why is my leaderboard showing duplicates?**
A: Run recalculate endpoint: `POST /recalculate/:reviewId`

**Q: How is penalty calculated?**
A: Compare each peer's score to HR score. Deviation > ±5 = penalty.

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│ Submit Eval     │
│ (HR or Peer)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Eval     │
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Upsert Final    │
│ Result          │
└────────┬────────┘
         │
         ├─→ Get HR evaluation → Calculate HR Score
         │
         ├─→ Get all peer evals → Calculate Peer Average
         │
         ├─→ Calculate Presentation Score
         │
         ├─→ Calculate Penalties
         │
         └─→ Calculate Final Score
         │
         ▼
┌─────────────────┐
│ ONE Record per  │
│ Presenter       │
│ (Updated)       │
└─────────────────┘
```

---

## 🔧 Customization

### Change Penalty Tolerance
Edit `projectReviewService.ts`:
```typescript
// Currently: ±5
Math.max(0, difference - 5)

// Change to ±10
Math.max(0, difference - 10)
```

### Change Score Weighting
Edit calculation functions:
```typescript
// Currently: 50% HR, 50% Peer
(hrScore + peerAverage) / 2

// Change to 60% HR, 40% Peer
(hrScore * 0.6) + (peerAverage * 0.4)
```

---

## 📞 Support

If you encounter issues:
1. Check MIGRATION_GUIDE.md for detailed steps
2. Run tests: `npm test -- projectReview.test.ts`
3. Check calculation via debug endpoints
4. Verify database with `npx prisma studio`

---

**Version**: 1.0.0
**Date**: 2026-06-23
**Status**: Production Ready ✅
