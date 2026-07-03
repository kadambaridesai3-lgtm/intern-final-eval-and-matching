import { getPrisma } from '../lib/prisma';

const prisma = getPrisma();

// ── Grade & Remarks Mapping ──────────────────────────────────────────────────

export function assignGrade(score: number): string {
  if (score >= 90) return 'Outstanding';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Satisfactory';
  return 'Needs Improvement';
}

export function assignRemarks(grade: string): string {
  switch (grade) {
    case 'Outstanding':
      return 'Recommended for PPO';
    case 'Excellent':
      return 'Strong Performer';
    case 'Very Good':
      return 'Good Performer';
    case 'Good':
      return 'Meets Expectations';
    case 'Satisfactory':
      return 'Needs Improvement';
    case 'Needs Improvement':
      return 'Performance Review Required';
    default:
      return '';
  }
}

// ── Project Score Retrieval ──────────────────────────────────────────────────

export async function getProjectScore(internId: string, pNo?: string | null, cuid?: string, reviewId?: string): Promise<number | null> {
  const result = await prisma.finalResult.findFirst({
    where: {
      OR: [
        { presenter_id: internId },
        ...(pNo ? [{ presenter_id: pNo }] : []),
        ...(cuid ? [{ presenter_id: cuid }] : []),
      ],
      ...(reviewId ? { review_id: reviewId } : {}),
    },
    orderBy: { created_at: 'desc' },
  });

  if (result) {
    console.log('[FinalEval] Found project score:', result.final_score);
    return result.final_score;
  }

  return null;
}

// ── Department/Role Requirement Helper ────────────────────────────────────────

export function requiresProjectReview(intern: { project_required?: string | null; department?: string | null; branch?: string | null; preferred_domain?: string | null }): boolean {
  const nonProjectKeywords = ['support', 'operations', 'documentation', 'training'];
  
  const dept = (intern.department || '').toLowerCase();
  const branch = (intern.branch || '').toLowerCase();
  const domain = (intern.preferred_domain || '').toLowerCase();
  
  const isNonProject = nonProjectKeywords.some(keyword => 
    dept.includes(keyword) || 
    branch.includes(keyword) || 
    domain.includes(keyword)
  );

  if (isNonProject) {
    return false;
  }

  if (intern.project_required !== undefined && intern.project_required !== null && intern.project_required !== '') {
    return intern.project_required.toLowerCase() === 'yes';
  }

  return true;
}

// ── Final Score Calculation ──────────────────────────────────────────────────

export function calculateFinalInternshipScore(
  projectScore: number | null,
  attendanceScore: number,
  guideScore: number,
  isProjectRequired: boolean
): number | null {
  const aScore = attendanceScore ?? 0;
  const gScore = guideScore ?? 0;

  if (isProjectRequired) {
    if (projectScore === null || projectScore === undefined) {
      return null; // Missing required project score
    }
    const score = (projectScore * 0.65) + (gScore * 0.25) + (aScore * 0.10);
    return isNaN(score) ? 0 : Math.round(score * 100) / 100;
  } else {
    // Method 2 (No Project Required)
    const score = (gScore * 0.70) + (aScore * 0.30);
    return isNaN(score) ? 0 : Math.round(score * 100) / 100;
  }
}

// ── Generate All Final Evaluations ───────────────────────────────────────────

export async function generateAllFinalEvaluations(reviewId?: string): Promise<any[]> {
  console.log('[FinalEval] Generating all final evaluations for all interns');

  // Get only interns whose status is Applied, Matched, Assigned, Ongoing, Completed
  const interns = await prisma.intern.findMany({
    where: {
      status: {
        in: ['Applied', 'Matched', 'Assigned', 'Ongoing', 'Completed'],
      },
    },
  });
  const evaluations: any[] = [];

  for (const intern of interns) {
    // Generate evaluations from all interns, ignoring a specific review_id restriction for scores
    const projectScore = await getProjectScore(intern.intern_id, intern.p_no, intern.id, undefined);
    
    const attendance = await prisma.attendanceSummary.findFirst({
      where: { intern_id: intern.intern_id },
      orderBy: { created_at: 'desc' },
    });

    const guide = await prisma.guideFeedback.findFirst({
      where: { intern_id: intern.intern_id },
      orderBy: { created_at: 'desc' },
    });

    const aScore = attendance?.attendance_score ?? 0;
    const gScore = guide?.guide_score ?? 0;

    const isProjectRequired = requiresProjectReview(intern);
    const finalScore = calculateFinalInternshipScore(projectScore, aScore, gScore, isProjectRequired);

    let grade = "";
    let remarks = "";
    if (finalScore !== null) {
      grade = assignGrade(finalScore);
      remarks = assignRemarks(grade);
    }

    // Save with review_id as null to ensure one record per intern overall
    const existing = await prisma.finalInternshipEvaluation.findFirst({
      where: {
        intern_id: intern.intern_id,
        review_id: null,
      }
    });

    let evaluation;
    if (existing) {
      evaluation = await prisma.finalInternshipEvaluation.update({
        where: { id: existing.id },
        data: {
          project_score: projectScore,
          attendance_score: aScore,
          guide_score: gScore,
          final_internship_score: finalScore,
          grade,
          remarks,
          rank: 0,
          updated_at: new Date(),
        },
        include: {
          intern: {
            select: {
              full_name: true,
              p_no: true,
              department: true,
              branch: true,
              preferred_domain: true,
              project_required: true,
              attendance_summaries: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
              guide_feedbacks: {
                orderBy: { created_at: 'desc' },
                take: 1,
              }
            }
          }
        }
      });
    } else {
      evaluation = await prisma.finalInternshipEvaluation.create({
        data: {
          intern_id: intern.intern_id,
          review_id: null,
          project_score: projectScore,
          attendance_score: aScore,
          guide_score: gScore,
          final_internship_score: finalScore,
          grade,
          remarks,
          rank: 0,
        },
        include: {
          intern: {
            select: {
              full_name: true,
              p_no: true,
              department: true,
              branch: true,
              preferred_domain: true,
              project_required: true,
              attendance_summaries: {
                orderBy: { created_at: 'desc' },
                take: 1,
              },
              guide_feedbacks: {
                orderBy: { created_at: 'desc' },
                take: 1,
              }
            }
          }
        }
      });
    }

    // Dynamic evaluation method and status helper
    const hasGuide = evaluation.intern.guide_feedbacks.length > 0;
    const hasAttendance = evaluation.intern.attendance_summaries.length > 0;
    
    let status = 'Complete';
    const missing: string[] = [];
    if (!hasGuide) missing.push('Guide Feedback');
    if (!hasAttendance) missing.push('Attendance');
    if (isProjectRequired && projectScore === null) missing.push('Project Review');
    
    if (missing.length > 0) {
      status = `Pending ${missing.join(' & ')}`;
    }

    evaluations.push({
      ...evaluation,
      evaluation_method: isProjectRequired ? 'Project + Guide + Attendance' : 'Guide + Attendance',
      evaluation_status: status,
    });
  }

  // ── Ranking ──────────────────────────────────────────────────────────────
  evaluations.sort((a, b) => {
    const scoreA = a.final_internship_score ?? -1;
    const scoreB = b.final_internship_score ?? -1;
    return scoreB - scoreA;
  });

  for (let i = 0; i < evaluations.length; i++) {
    const score = evaluations[i].final_internship_score;
    const rank = score !== null ? i + 1 : 0;
    await prisma.finalInternshipEvaluation.update({
      where: { id: evaluations[i].id },
      data: { rank },
    });
    evaluations[i].rank = rank;
  }

  // Sort javascript output: non-zero ranks first, then zero ranks
  evaluations.sort((a, b) => {
    const rankA = a.rank === 0 ? 999999 : a.rank;
    const rankB = b.rank === 0 ? 999999 : b.rank;
    return rankA - rankB;
  });

  return evaluations;
}

// ── CRUD Helpers ─────────────────────────────────────────────────────────────

export async function getAllFinalEvaluations(reviewId?: string) {
  const evaluations = await prisma.finalInternshipEvaluation.findMany({
    where: {
      review_id: null,
      intern: {
        status: {
          in: ['Applied', 'Matched', 'Assigned', 'Ongoing', 'Completed'],
        },
      },
    },
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
          department: true,
          branch: true,
          preferred_domain: true,
          project_required: true,
          status: true,
          attendance_summaries: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          guide_feedbacks: {
            orderBy: { created_at: 'desc' },
            take: 1,
          }
        }
      },
      review: {
        select: {
          title: true,
          batch_name: true,
        }
      }
    },
    orderBy: { rank: 'asc' },
  });

  const mapped = evaluations.map(e => {
    const isProjectRequired = requiresProjectReview(e.intern);
    const hasProject = e.project_score !== null;
    const hasGuide = e.intern.guide_feedbacks.length > 0;
    const hasAttendance = e.intern.attendance_summaries.length > 0;
    
    let status = 'Complete';
    const missing: string[] = [];
    if (!hasGuide) missing.push('Guide Feedback');
    if (!hasAttendance) missing.push('Attendance');
    if (isProjectRequired && !hasProject) missing.push('Project Review');
    
    if (missing.length > 0) {
      status = `Pending ${missing.join(' & ')}`;
    }

    return {
      ...e,
      evaluation_method: isProjectRequired ? 'Project + Guide + Attendance' : 'Guide + Attendance',
      evaluation_status: status,
    };
  });

  // Sort javascript output: non-zero ranks first, then zero ranks
  mapped.sort((a, b) => {
    const rankA = a.rank === 0 ? 999999 : a.rank;
    const rankB = b.rank === 0 ? 999999 : b.rank;
    return rankA - rankB;
  });

  return mapped;
}

export async function getFinalEvaluationByInternId(internId: string, reviewId?: string) {
  const evaluation = await prisma.finalInternshipEvaluation.findFirst({
    where: {
      intern_id: internId,
      review_id: null,
      intern: {
        status: {
          in: ['Applied', 'Matched', 'Assigned', 'Ongoing', 'Completed'],
        },
      },
    },
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
          department: true,
          branch: true,
          preferred_domain: true,
          project_required: true,
          status: true,
          attendance_summaries: {
            orderBy: { created_at: 'desc' },
            take: 1,
          },
          guide_feedbacks: {
            orderBy: { created_at: 'desc' },
            take: 1,
          }
        }
      },
      review: {
        select: {
          title: true,
          batch_name: true,
        }
      }
    }
  });

  if (!evaluation) return null;

  const isProjectRequired = requiresProjectReview(evaluation.intern);
  const hasProject = evaluation.project_score !== null;
  const hasGuide = evaluation.intern.guide_feedbacks.length > 0;
  const hasAttendance = evaluation.intern.attendance_summaries.length > 0;
  
  let status = 'Complete';
  const missing: string[] = [];
  if (!hasGuide) missing.push('Guide Feedback');
  if (!hasAttendance) missing.push('Attendance');
  if (isProjectRequired && !hasProject) missing.push('Project Review');
  
  if (missing.length > 0) {
    status = `Pending ${missing.join(' & ')}`;
  }

  return {
    ...evaluation,
    evaluation_method: isProjectRequired ? 'Project + Guide + Attendance' : 'Guide + Attendance',
    evaluation_status: status,
  };
}

export async function deleteFinalEvaluation(internId: string, reviewId?: string) {
  return prisma.finalInternshipEvaluation.deleteMany({
    where: {
      intern_id: internId,
      review_id: null,
    },
  });
}
