import { getPrisma } from '../lib/prisma';
import { detectBackfilled, detectBulkSubmissions, calculateAndUpsertSummaries } from '../services/attendanceService';
import { upsertGuideFeedback, getGuideFeedbackByInternId } from '../services/guideFeedbackService';
import { generateAllFinalEvaluations, getProjectScore } from '../services/finalEvaluationService';

const prisma = getPrisma();

async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('🏁 Starting Integration Tests...');

  // Setup test environment: Clear databases & create test interns
  await prisma.matchLog.deleteMany({});
  await prisma.smartCardPunch.deleteMany({});
  await prisma.finalInternshipEvaluation.deleteMany({});
  await prisma.guideFeedback.deleteMany({});
  await prisma.attendanceSummary.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.finalResult.deleteMany({});
  await prisma.projectReview.deleteMany({});
  await prisma.guide.deleteMany({});
  await prisma.intern.deleteMany({});

  const intern = await prisma.intern.create({
    data: {
      intern_id: 'INT-TST-99',
      full_name: 'Test Intern A',
      p_no: 'P99999', // P No to match smart card
      phone: '1234567890',
      intern_type: 'B.Tech',
      college: 'Test College',
      branch: 'CS',
      department: 'IT',
      graduation_year: 2026,
      cgpa: 9.0,
      skills: 'React',
      preferred_domain: 'IT',
      start_date: new Date(),
      duration_months: 3,
      end_date: new Date(),
    },
  });

  const intern2 = await prisma.intern.create({
    data: {
      intern_id: 'INT-TST-88',
      full_name: 'Test Intern B (No Project)',
      p_no: 'P88888',
      phone: '9876543210',
      intern_type: 'B.Tech',
      college: 'Test College',
      branch: 'ME',
      department: 'Operations',
      graduation_year: 2026,
      cgpa: 8.0,
      skills: 'Excel',
      preferred_domain: 'Operations',
      start_date: new Date(),
      duration_months: 3,
      end_date: new Date(),
    },
  });

  const intern3 = await prisma.intern.create({
    data: {
      intern_id: 'INT-TST-77',
      full_name: 'Test Intern C (Pending Project)',
      p_no: 'P77777',
      phone: '9876543211',
      intern_type: 'B.Tech',
      college: 'Test College',
      branch: 'CS',
      department: 'IT',
      graduation_year: 2026,
      cgpa: 8.5,
      skills: 'Java',
      preferred_domain: 'IT',
      start_date: new Date(),
      duration_months: 3,
      end_date: new Date(),
    },
  });

  // 1. Verify Excel Upload Validation (simulated)
  console.log('\n--- 1. Excel Upload Validation ---');
  const nonExistent = await prisma.intern.findFirst({ where: { p_no: 'INVALID-P-NO' } });
  await assert(nonExistent === null, 'Non-existent p_no should not find any intern');
  
  const existing = await prisma.intern.findFirst({ where: { p_no: 'P99999' } });
  await assert(existing !== null, 'Existing p_no should return the matching intern');

  // 2. Verify Attendance Calculations
  console.log('\n--- 2. Attendance Calculations ---');
  // Backfill detection
  const dateSame = new Date('2026-06-25T10:00:00Z');
  const dateSameSubmit = new Date('2026-06-25T12:00:00Z');
  const backfillStatusSame = detectBackfilled(dateSame, dateSameSubmit);
  await assert(backfillStatusSame === 'PRESENT', 'Same-day submission should be marked PRESENT');

  const dateDiffSubmit = new Date('2026-06-26T10:00:00Z');
  const backfillStatusDiff = detectBackfilled(dateSame, dateDiffSubmit);
  await assert(backfillStatusDiff === 'BACKFILLED', 'Different-day submission should be marked BACKFILLED');

  // Simulate smart card punches for intern 1 (2 working days)
  await prisma.smartCardPunch.create({
    data: {
      intern_id: intern.intern_id,
      p_no: intern.p_no || '',
      punch_date: new Date('2026-06-01T00:00:00Z'),
      in_time: '09:00 AM',
      out_time: '05:30 PM',
    }
  });
  await prisma.smartCardPunch.create({
    data: {
      intern_id: intern.intern_id,
      p_no: intern.p_no || '',
      punch_date: new Date('2026-06-02T00:00:00Z'),
      in_time: '09:00 AM',
      out_time: '05:30 PM',
    }
  });

  // Daily report submissions for intern 1 (1 present, 1 backfilled)
  await prisma.attendanceRecord.create({
    data: {
      intern_id: intern.intern_id,
      attendance_date: new Date('2026-06-01T00:00:00Z'),
      submitted_at: new Date('2026-06-01T00:00:00Z'),
      status: 'PRESENT',
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      intern_id: intern.intern_id,
      attendance_date: new Date('2026-06-02T00:00:00Z'),
      submitted_at: new Date('2026-06-03T00:00:00Z'),
      status: 'BACKFILLED',
    },
  });

  // Simulate smart card punches for intern 2 (2 working days)
  await prisma.smartCardPunch.create({
    data: {
      intern_id: intern2.intern_id,
      p_no: intern2.p_no || '',
      punch_date: new Date('2026-06-01T00:00:00Z'),
      in_time: '09:00 AM',
      out_time: '05:30 PM',
    }
  });
  await prisma.smartCardPunch.create({
    data: {
      intern_id: intern2.intern_id,
      p_no: intern2.p_no || '',
      punch_date: new Date('2026-06-02T00:00:00Z'),
      in_time: '09:00 AM',
      out_time: '05:30 PM',
    }
  });

  // Daily report submissions for intern 2 (2 present)
  await prisma.attendanceRecord.create({
    data: {
      intern_id: intern2.intern_id,
      attendance_date: new Date('2026-06-01T00:00:00Z'),
      submitted_at: new Date('2026-06-01T00:00:00Z'),
      status: 'PRESENT',
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      intern_id: intern2.intern_id,
      attendance_date: new Date('2026-06-02T00:00:00Z'),
      submitted_at: new Date('2026-06-02T00:00:00Z'),
      status: 'PRESENT',
    },
  });

  // Simulate smart card punches for intern 3 (2 working days)
  await prisma.smartCardPunch.create({
    data: {
      intern_id: intern3.intern_id,
      p_no: intern3.p_no || '',
      punch_date: new Date('2026-06-01T00:00:00Z'),
      in_time: '09:00 AM',
      out_time: '05:30 PM',
    }
  });
  await prisma.smartCardPunch.create({
    data: {
      intern_id: intern3.intern_id,
      p_no: intern3.p_no || '',
      punch_date: new Date('2026-06-02T00:00:00Z'),
      in_time: '09:00 AM',
      out_time: '05:30 PM',
    }
  });

  // Daily report submissions for intern 3 (2 present)
  await prisma.attendanceRecord.create({
    data: {
      intern_id: intern3.intern_id,
      attendance_date: new Date('2026-06-01T00:00:00Z'),
      submitted_at: new Date('2026-06-01T00:00:00Z'),
      status: 'PRESENT',
    },
  });
  await prisma.attendanceRecord.create({
    data: {
      intern_id: intern3.intern_id,
      attendance_date: new Date('2026-06-02T00:00:00Z'),
      submitted_at: new Date('2026-06-02T00:00:00Z'),
      status: 'PRESENT',
    },
  });

  // We set working days config to 2
  const summaries = await calculateAndUpsertSummaries(6, 2026, 'Test Batch', 2);
  await assert(summaries.length === 3, 'Should create 3 summaries');
  
  const summary1 = summaries.find(s => s.intern_id === intern.intern_id);
  const summary2 = summaries.find(s => s.intern_id === intern2.intern_id);
  
  await assert(summary1.attendance_percentage === 100, 'Intern 1 attendance percentage should be 100%');
  await assert(summary1.sincerity_percentage === 50, 'Intern 1 sincerity percentage should be 50%');
  await assert(summary1.attendance_score === 85, 'Intern 1 attendance score should be 85');

  await assert(summary2.attendance_percentage === 100, 'Intern 2 attendance percentage should be 100%');
  await assert(summary2.sincerity_percentage === 100, 'Intern 2 sincerity percentage should be 100%');
  await assert(summary2.attendance_score === 100, 'Intern 2 attendance score should be 100');

  // 3. Verify Guide Feedback CRUD
  console.log('\n--- 3. Guide Feedback CRUD ---');
  const review = await prisma.projectReview.create({
    data: {
      title: 'Review A',
      batch_name: 'Batch A',
      review_date: new Date(),
    },
  });

  // Set all 14 non-attendance dimensions to 5 -> 100% for intern 1 (updated to 4 -> 80% below)
  const feedback = await upsertGuideFeedback({
    intern_id: intern.intern_id,
    review_id: review.id,
    guide_name: 'Mentor X',
    discipline: 5,
    learning_ability: 5,
    teamwork: 5,
    communication: 5,
    task_completion: 5,
    quality_of_work: 5,
    problem_solving: 5,
    initiative_innovation: 5,
    learning_adaptability: 5,
    attendance_punctuality: 5, // Excluded from guide_score
    professionalism_ethics: 5,
    respect_authority: 5,
    accountability: 5,
    conflict_resolution: 5,
    empathy: 5,
    leadership_potential: 5,
    conflict_handling: 5,
  });
  await assert(feedback.guide_score === 100, 'Guide score should be 100%');

  // Set guide feedback for intern 2 to 100%
  const feedback2 = await upsertGuideFeedback({
    intern_id: intern2.intern_id,
    review_id: review.id,
    guide_name: 'Mentor Y',
    discipline: 5,
    learning_ability: 5,
    teamwork: 5,
    communication: 5,
    task_completion: 5,
    quality_of_work: 5,
    problem_solving: 5,
    initiative_innovation: 5,
    learning_adaptability: 5,
    attendance_punctuality: 5,
    professionalism_ethics: 5,
    respect_authority: 5,
    accountability: 5,
    conflict_resolution: 5,
    empathy: 5,
    leadership_potential: 5,
    conflict_handling: 5,
  });
  await assert(feedback2.guide_score === 100, 'Guide feedback 2 score should be 100%');

  // Set guide feedback for intern 3 to 100%
  const feedback3 = await upsertGuideFeedback({
    intern_id: intern3.intern_id,
    review_id: review.id,
    guide_name: 'Mentor Z',
    discipline: 5,
    learning_ability: 5,
    teamwork: 5,
    communication: 5,
    task_completion: 5,
    quality_of_work: 5,
    problem_solving: 5,
    initiative_innovation: 5,
    learning_adaptability: 5,
    attendance_punctuality: 5,
    professionalism_ethics: 5,
    respect_authority: 5,
    accountability: 5,
    conflict_resolution: 5,
    empathy: 5,
    leadership_potential: 5,
    conflict_handling: 5,
  });
  await assert(feedback3.guide_score === 100, 'Guide feedback 3 score should be 100%');

  // Read
  const fetched = await getGuideFeedbackByInternId(intern.intern_id, review.id);
  await assert(fetched !== null && fetched.guide_name === 'Mentor X', 'Should fetch guide feedback successfully');

  // Update all 14 non-attendance dimensions to 4 -> 80%
  const updatedFeedback = await upsertGuideFeedback({
    intern_id: intern.intern_id,
    review_id: review.id,
    guide_name: 'Mentor X Updated',
    discipline: 4,
    learning_ability: 4,
    teamwork: 4,
    communication: 4,
    task_completion: 4,
    quality_of_work: 4,
    problem_solving: 4,
    initiative_innovation: 4,
    learning_adaptability: 4,
    attendance_punctuality: 5, // Excluded from guide_score
    professionalism_ethics: 4,
    respect_authority: 4,
    accountability: 4,
    conflict_resolution: 4,
    empathy: 4,
    leadership_potential: 4,
    conflict_handling: 4,
  });
  await assert(updatedFeedback.guide_score === 80, 'Guide score should be updated to 80%');

  // 4. Verify Project Review linkage
  console.log('\n--- 4. Project Review Linkage ---');
  await prisma.finalResult.create({
    data: {
      review_id: review.id,
      presenter_id: 'P99999', // Stored as p_no
      presenter_name: 'Test Intern A',
      final_score: 90,
    },
  });

  const projScore = await getProjectScore(intern.intern_id, intern.p_no, intern.id, review.id);
  await assert(projScore === 90, 'Should correctly resolve project score when matching p_no');

  // 5. Verify Final Ranking Generation (Dual Evaluation Method)
  console.log('\n--- 5. Final Ranking Generation (Dual Method) ---');
  const finalEvals = await generateAllFinalEvaluations();
  await assert(finalEvals.length === 3, 'Should generate 3 final evaluations');
  
  const eval1 = finalEvals.find(e => e.intern_id === intern.intern_id);
  const eval2 = finalEvals.find(e => e.intern_id === intern2.intern_id);
  const eval3 = finalEvals.find(e => e.intern_id === intern3.intern_id);

  // Intern 1 (Method 1): Has Project Score (90), Guide Score (80), Attendance Score (85)
  // Score formula: (Project * 0.65) + (Guide * 0.25) + (Attendance * 0.10)
  // Score: (90 * 0.65) + (80 * 0.25) + (85 * 0.10) = 58.5 + 20.0 + 8.5 = 87
  await assert(eval1.final_internship_score === 87, 'Intern 1 final score should be 87');
  await assert(eval1.grade === 'Excellent', 'Intern 1 grade should be Excellent');
  await assert(eval1.evaluation_method === 'Project + Guide + Attendance', 'Intern 1 evaluation method should be Project + Guide + Attendance');
  await assert(eval1.evaluation_status === 'Complete', 'Intern 1 evaluation status should be Complete');

  // Intern 2 (Method 2): No Project Score (null), Guide Score (100), Attendance Score (100)
  // Score formula: (Guide * 0.70) + (Attendance * 0.30)
  // Score: (100 * 0.70) + (100 * 0.30) = 70.0 + 30.0 = 100
  await assert(eval2.project_score === null, 'Intern 2 project score should be null');
  await assert(eval2.final_internship_score === 100, 'Intern 2 final score should be 100');
  await assert(eval2.grade === 'Outstanding', 'Intern 2 grade should be Outstanding');
  await assert(eval2.evaluation_method === 'Guide + Attendance', 'Intern 2 evaluation method should be Guide + Attendance');
  await assert(eval2.evaluation_status === 'Complete', 'Intern 2 evaluation status should be Complete');

  // Intern 3 (IT, requires project but has none):
  await assert(eval3.project_score === null, 'Intern 3 project score should be null');
  await assert(eval3.final_internship_score === null, 'Intern 3 final score should be null');
  await assert(eval3.grade === '', 'Intern 3 grade should be empty string');
  await assert(eval3.remarks === 'Pending Project Review', 'Intern 3 remarks should be Pending Project Review');
  await assert(eval3.evaluation_method === 'Project + Guide + Attendance', 'Intern 3 evaluation method should be Project + Guide + Attendance');
  await assert(eval3.evaluation_status === 'Pending Project Review', 'Intern 3 status should be Pending Project Review');

  // Rankings verification: Intern 2 (100 score) should be rank 1, Intern 1 (87 score) should be rank 2, Intern 3 (null score) should be rank 0
  await assert(eval2.rank === 1, 'Intern 2 should be ranked 1');
  await assert(eval1.rank === 2, 'Intern 1 should be ranked 2');
  await assert(eval3.rank === 0, 'Intern 3 should be ranked 0');

  console.log('\n🎉 ALL DUAL EVALUATION TESTS PASSED SUCCESSFULLY!');
}

runTests()
  .catch((err) => {
    console.error('❌ Tests failed with error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
