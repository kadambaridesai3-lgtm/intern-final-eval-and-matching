import { getPrisma } from './lib/prisma';
import { generateAllFinalEvaluations } from './services/finalEvaluationService';
import { calculateAndUpsertSummaries } from './services/attendanceService';

const prisma = getPrisma();

async function main() {
  console.log('[Seed] Starting database seeding...');

  // 1. Clean existing data
  await prisma.matchLog.deleteMany({});
  await prisma.smartCardPunch.deleteMany({});
  await prisma.finalInternshipEvaluation.deleteMany({});
  await prisma.guideFeedback.deleteMany({});
  await prisma.attendanceSummary.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.finalResult.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.projectReview.deleteMany({});
  await prisma.guide.deleteMany({});
  await prisma.intern.deleteMany({});

  console.log('[Seed] Database cleaned.');

  // 2. Create sample interns
  const internJohn = await prisma.intern.create({
    data: {
      intern_id: 'INT0001',
      full_name: 'John Doe',
      p_no: 'INT-JHN-01',
      phone: '9876543210',
      intern_type: 'B.Tech',
      college: 'College of Engineering',
      branch: 'Computer Science',
      department: 'IT',
      graduation_year: 2026,
      cgpa: 8.5,
      skills: 'React, Node, TypeScript',
      preferred_domain: 'Software Engineering',
      start_date: new Date('2026-06-01'),
      duration_months: 3,
      end_date: new Date('2026-09-01'),
    },
  });

  const internSarah = await prisma.intern.create({
    data: {
      intern_id: 'INT0002',
      full_name: 'Sarah Smith',
      p_no: 'INT-SRH-02',
      phone: '9876543211',
      intern_type: 'B.Tech',
      college: 'Pimpri College of Engineering',
      branch: 'Mechanical',
      department: 'Manufacturing',
      graduation_year: 2026,
      cgpa: 7.9,
      skills: 'SolidWorks, AutoCAD',
      preferred_domain: 'Design',
      start_date: new Date('2026-06-01'),
      duration_months: 3,
      end_date: new Date('2026-09-01'),
    },
  });

  const internBob = await prisma.intern.create({
    data: {
      intern_id: 'INT0003',
      full_name: 'Bob Johnson (Support)',
      p_no: 'INT-BOB-03',
      phone: '9876543212',
      intern_type: 'B.Tech',
      college: 'Savitribai Phule Pune University',
      branch: 'Electrical',
      department: 'Operations',
      graduation_year: 2026,
      cgpa: 8.1,
      skills: 'Excel, PowerPoint, Operations',
      preferred_domain: 'Operations',
      start_date: new Date('2026-06-01'),
      duration_months: 3,
      end_date: new Date('2026-09-01'),
    },
  });

  const internAlice = await prisma.intern.create({
    data: {
      intern_id: 'INT0004',
      full_name: 'Alice Williams',
      p_no: 'INT-ALC-04',
      phone: '9876543213',
      intern_type: 'B.Tech',
      college: 'COEP Technological University',
      branch: 'Information Technology',
      department: 'IT',
      graduation_year: 2026,
      cgpa: 8.8,
      skills: 'Java, Python, SQL',
      preferred_domain: 'IT',
      start_date: new Date('2026-06-01'),
      duration_months: 3,
      end_date: new Date('2026-09-01'),
    },
  });

  console.log('[Seed] Created interns: John Doe (INT-JHN-01), Sarah Smith (INT-SRH-02), Bob Johnson (INT-BOB-03), Alice Williams (INT-ALC-04).');

  // 3. Create Project Review batch & Final Results (where presenter_id is stored as p_no)
  const projectReview = await prisma.projectReview.create({
    data: {
      title: 'Midterm Internship Presentation',
      batch_name: 'Batch-2026-A',
      review_date: new Date(),
    },
  });

  // FinalResult for John (presenter_id = INT-JHN-01)
  await prisma.finalResult.create({
    data: {
      review_id: projectReview.id,
      presenter_id: 'INT-JHN-01', // Matching p_no
      presenter_name: 'John Doe',
      hr_score: 85,
      peer_average: 80,
      presentation_score: 82.5,
      total_penalty: 2,
      final_score: 80.5, // Project Review score
    },
  });

  // FinalResult for Sarah (presenter_id = INT-SRH-02)
  await prisma.finalResult.create({
    data: {
      review_id: projectReview.id,
      presenter_id: 'INT-SRH-02', // Matching p_no
      presenter_name: 'Sarah Smith',
      hr_score: 75,
      peer_average: 78,
      presentation_score: 76.5,
      total_penalty: 0,
      final_score: 76.5, // Project Review score
    },
  });

  console.log('[Seed] Created Project Review and Final Results with presenter_id as p_no.');

  // 4. Create Attendance records and summaries
  // John has 100% attendance, 100% sincerity
  const dates = [
    new Date('2026-06-01'),
    new Date('2026-06-02'),
    new Date('2026-06-03'),
    new Date('2026-06-04'),
    new Date('2026-06-05'),
  ];

  for (const date of dates) {
    await prisma.attendanceRecord.create({
      data: {
        intern_id: internJohn.intern_id,
        attendance_date: date,
        submitted_at: date, // Genuine presentation
        status: 'PRESENT',
      },
    });
  }

  // Sarah has 100% attendance, but 40% sincerity (some backfilled entries)
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const isBackfilled = i >= 2; // i = 2, 3, 4 are backfilled
    await prisma.attendanceRecord.create({
      data: {
        intern_id: internSarah.intern_id,
        attendance_date: date,
        submitted_at: isBackfilled ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : date,
        status: isBackfilled ? 'BACKFILLED' : 'PRESENT',
      },
    });
  }

  // Bob has 100% attendance, 100% sincerity
  for (const date of dates) {
    await prisma.attendanceRecord.create({
      data: {
        intern_id: internBob.intern_id,
        attendance_date: date,
        submitted_at: date,
        status: 'PRESENT',
      },
    });
  }

  // Alice has 100% attendance, 100% sincerity
  for (const date of dates) {
    await prisma.attendanceRecord.create({
      data: {
        intern_id: internAlice.intern_id,
        attendance_date: date,
        submitted_at: date,
        status: 'PRESENT',
      },
    });
  }

  // Calculate summaries
  await calculateAndUpsertSummaries(6, 2026, 'Batch-2026-A');
  console.log('[Seed] Created Attendance records and summaries.');

  // 5. Create Guide Feedbacks
  // John: discipline 9, learning_ability 9, teamwork 10, communication 8, task_completion 9 (total 45/50 -> 90%)
  await prisma.guideFeedback.create({
    data: {
      intern_id: internJohn.intern_id,
      review_id: projectReview.id,
      guide_name: 'Dr. Alan Turing',
      discipline: 9,
      learning_ability: 9,
      teamwork: 10,
      communication: 8,
      task_completion: 9,
      total_marks: 45,
      guide_score: 90,
    },
  });

  // Sarah: discipline 8, learning_ability 8, teamwork 7, communication 7, task_completion 8 (total 38/50 -> 76%)
  await prisma.guideFeedback.create({
    data: {
      intern_id: internSarah.intern_id,
      review_id: projectReview.id,
      guide_name: 'Dr. Nikola Tesla',
      discipline: 8,
      learning_ability: 8,
      teamwork: 7,
      communication: 7,
      task_completion: 8,
      total_marks: 38,
      guide_score: 76,
    },
  });

  // Bob: discipline 9, learning_ability 10, teamwork 9, communication 9, task_completion 9 (total 46/50 -> 92%)
  await prisma.guideFeedback.create({
    data: {
      intern_id: internBob.intern_id,
      review_id: projectReview.id,
      guide_name: 'Dr. Marie Curie',
      discipline: 9,
      learning_ability: 10,
      teamwork: 9,
      communication: 9,
      task_completion: 9,
      total_marks: 46,
      guide_score: 92,
    },
  });

  // Alice: discipline 9, learning_ability 9, teamwork 9, communication 9, task_completion 9 (total 45/50 -> 90%)
  await prisma.guideFeedback.create({
    data: {
      intern_id: internAlice.intern_id,
      review_id: projectReview.id,
      guide_name: 'Dr. Alan Turing',
      discipline: 9,
      learning_ability: 9,
      teamwork: 9,
      communication: 9,
      task_completion: 9,
      total_marks: 45,
      guide_score: 90,
    },
  });

  console.log('[Seed] Created Guide Feedback records.');

  // 6. Generate final evaluations
  await generateAllFinalEvaluations(projectReview.id);
  console.log('[Seed] Final evaluations generated successfully!');
}

main()
  .catch((err) => console.error('[Seed] Error seeding database:', err))
  .finally(() => prisma.$disconnect());
