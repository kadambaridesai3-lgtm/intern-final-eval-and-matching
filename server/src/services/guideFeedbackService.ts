import { getPrisma } from '../lib/prisma';
import XLSX from 'xlsx';

const prisma = getPrisma();

function toNumericScore(val: any): number {
  if (val === undefined || val === null || val === '') return 3; // Default to Average (3)
  const s = String(val).trim().toLowerCase();
  if (s === '5' || s.startsWith('best') || s.startsWith('excellent')) return 5;
  if (s === '4' || s.startsWith('good')) return 4;
  if (s === '3' || s.startsWith('average') || s.startsWith('meet')) return 3;
  if (s === '2' || s.startsWith('poor') || s.startsWith('below')) return 2;
  if (s === '1' || s.startsWith('worst') || s.startsWith('needs')) return 1;
  const parsed = parseInt(s);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
  return 3; // default fallback
}

export function calculateGuideFeedbackScores(data: {
  discipline: number;
  learning_ability: number;
  teamwork: number;
  communication: number;
  task_completion: number;
  quality_of_work?: number;
  problem_solving?: number;
  initiative_innovation?: number;
  learning_adaptability?: number;
  attendance_punctuality?: number;
  professionalism_ethics?: number;
  respect_authority?: number;
  accountability?: number;
  conflict_resolution?: number;
  empathy?: number;
  leadership_potential?: number;
  conflict_handling?: number;
}) {
  // Convert all to numeric (in case they are passed as raw data or 1-5 / 1-10)
  const task_completion = toNumericScore(data.task_completion);
  const quality_of_work = toNumericScore(data.quality_of_work ?? 3);
  const problem_solving = toNumericScore(data.problem_solving ?? 3);
  const initiative_innovation = toNumericScore(data.initiative_innovation ?? 3);
  const learning_adaptability = toNumericScore(data.learning_adaptability ?? data.learning_ability ?? 3);
  const communication = toNumericScore(data.communication);
  const professionalism_ethics = toNumericScore(data.professionalism_ethics ?? data.discipline ?? 3);
  const respect_authority = toNumericScore(data.respect_authority ?? 3);
  const accountability = toNumericScore(data.accountability ?? 3);
  const teamwork = toNumericScore(data.teamwork);
  const conflict_resolution = toNumericScore(data.conflict_resolution ?? 3);
  const empathy = toNumericScore(data.empathy ?? 3);
  const leadership_potential = toNumericScore(data.leadership_potential ?? 3);
  const conflict_handling = toNumericScore(data.conflict_handling ?? 3);
  const attendance_punctuality = toNumericScore(data.attendance_punctuality ?? 3);

  // Obtained marks sum the 14 non-attendance dimensions
  const obtainedMarks =
    task_completion +
    quality_of_work +
    problem_solving +
    initiative_innovation +
    learning_adaptability +
    communication +
    professionalism_ethics +
    respect_authority +
    accountability +
    teamwork +
    conflict_resolution +
    empathy +
    leadership_potential +
    conflict_handling;

  // Maximum score for the 14 dimensions is 14 * 5 = 70
  const guide_score = (obtainedMarks / 70) * 100;

  // Total marks is out of 75 (15 * 5) including attendance_punctuality for reference
  const total_marks = obtainedMarks + attendance_punctuality;

  console.log('[GuideFeedback] obtained:', obtainedMarks, 'guide_score:', guide_score, 'total_marks:', total_marks);

  return {
    total_marks,
    guide_score: Math.round(guide_score * 100) / 100,
  };
}

export async function upsertGuideFeedback(data: {
  intern_id: string;
  review_id?: string;
  guide_name?: string;
  discipline?: number;
  learning_ability?: number;
  teamwork: number;
  communication: number;
  task_completion: number;
  quality_of_work?: number;
  problem_solving?: number;
  initiative_innovation?: number;
  learning_adaptability?: number;
  attendance_punctuality?: number;
  professionalism_ethics?: number;
  respect_authority?: number;
  accountability?: number;
  conflict_resolution?: number;
  empathy?: number;
  leadership_potential?: number;
  conflict_handling?: number;
}) {
  // Backwards compatibility mapper for standard 5 fields
  const parsed = {
    discipline: toNumericScore(data.discipline ?? 3),
    learning_ability: toNumericScore(data.learning_ability ?? 3),
    teamwork: toNumericScore(data.teamwork),
    communication: toNumericScore(data.communication),
    task_completion: toNumericScore(data.task_completion),
    quality_of_work: toNumericScore(data.quality_of_work ?? 3),
    problem_solving: toNumericScore(data.problem_solving ?? 3),
    initiative_innovation: toNumericScore(data.initiative_innovation ?? 3),
    learning_adaptability: toNumericScore(data.learning_adaptability ?? data.learning_ability ?? 3),
    attendance_punctuality: toNumericScore(data.attendance_punctuality ?? 3),
    professionalism_ethics: toNumericScore(data.professionalism_ethics ?? data.discipline ?? 3),
    respect_authority: toNumericScore(data.respect_authority ?? 3),
    accountability: toNumericScore(data.accountability ?? 3),
    conflict_resolution: toNumericScore(data.conflict_resolution ?? 3),
    empathy: toNumericScore(data.empathy ?? 3),
    leadership_potential: toNumericScore(data.leadership_potential ?? 3),
    conflict_handling: toNumericScore(data.conflict_handling ?? 3),
  };

  const { total_marks, guide_score } = calculateGuideFeedbackScores(parsed);

  console.log('[GuideFeedback] Upserting for intern:', data.intern_id, 'review_id:', data.review_id);

  const existing = await prisma.guideFeedback.findFirst({
    where: {
      intern_id: data.intern_id,
      review_id: data.review_id || null,
    }
  });

  if (existing) {
    return prisma.guideFeedback.update({
      where: { id: existing.id },
      data: {
        guide_name: data.guide_name || null,
        discipline: parsed.discipline,
        learning_ability: parsed.learning_ability,
        teamwork: parsed.teamwork,
        communication: parsed.communication,
        task_completion: parsed.task_completion,
        quality_of_work: parsed.quality_of_work,
        problem_solving: parsed.problem_solving,
        initiative_innovation: parsed.initiative_innovation,
        learning_adaptability: parsed.learning_adaptability,
        attendance_punctuality: parsed.attendance_punctuality,
        professionalism_ethics: parsed.professionalism_ethics,
        respect_authority: parsed.respect_authority,
        accountability: parsed.accountability,
        conflict_resolution: parsed.conflict_resolution,
        empathy: parsed.empathy,
        leadership_potential: parsed.leadership_potential,
        conflict_handling: parsed.conflict_handling,
        total_marks,
        guide_score,
        updated_at: new Date(),
      }
    });
  } else {
    return prisma.guideFeedback.create({
      data: {
        intern_id: data.intern_id,
        review_id: data.review_id || null,
        guide_name: data.guide_name || null,
        discipline: parsed.discipline,
        learning_ability: parsed.learning_ability,
        teamwork: parsed.teamwork,
        communication: parsed.communication,
        task_completion: parsed.task_completion,
        quality_of_work: parsed.quality_of_work,
        problem_solving: parsed.problem_solving,
        initiative_innovation: parsed.initiative_innovation,
        learning_adaptability: parsed.learning_adaptability,
        attendance_punctuality: parsed.attendance_punctuality,
        professionalism_ethics: parsed.professionalism_ethics,
        respect_authority: parsed.respect_authority,
        accountability: parsed.accountability,
        conflict_resolution: parsed.conflict_resolution,
        empathy: parsed.empathy,
        leadership_potential: parsed.leadership_potential,
        conflict_handling: parsed.conflict_handling,
        total_marks,
        guide_score,
      }
    });
  }
}

export async function getAllGuideFeedbacks(reviewId?: string) {
  const where: any = {};
  if (reviewId) where.review_id = reviewId;
  return prisma.guideFeedback.findMany({
    where,
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
        }
      },
      review: {
        select: {
          title: true,
          batch_name: true,
        }
      }
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getGuideFeedbackByInternId(internId: string, reviewId?: string) {
  return prisma.guideFeedback.findFirst({
    where: {
      intern_id: internId,
      ...(reviewId ? { review_id: reviewId } : {})
    },
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
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
}

export async function deleteGuideFeedback(internId: string, reviewId?: string) {
  return prisma.guideFeedback.deleteMany({
    where: {
      intern_id: internId,
      ...(reviewId ? { review_id: reviewId } : {})
    },
  });
}

export interface RawFeedbackRow {
  intern_id: string;
  p_no: string;
  intern_name: string;
  task_completion: any;
  quality_of_work: any;
  problem_solving: any;
  initiative_innovation: any;
  learning_adaptability: any;
  communication: any;
  professionalism_ethics: any;
  respect_authority: any;
  accountability: any;
  teamwork: any;
  conflict_resolution: any;
  empathy: any;
  leadership_potential: any;
  conflict_handling: any;
  attendance_punctuality?: any;
}

export function parseGuideFeedbackExcel(buffer: Buffer): RawFeedbackRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log('[GuideFeedback] Parsed', rows.length, 'rows from Excel');

  const parsed: RawFeedbackRow[] = [];
  for (const row of rows) {
    const keys = Object.keys(row);
    const getVal = (colNames: string[]) => {
      const matchKey = keys.find(k => colNames.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, '')));
      return matchKey ? row[matchKey] : '';
    };

    const internId = String(getVal(['Intern ID', 'internid', 'id'])).trim();
    const pNo = String(getVal(['P No', 'pno', 'p_no'])).trim();
    const internName = String(getVal(['Intern Name', 'name', 'internname'])).trim();

    if (!internId && !pNo) {
      console.log('[GuideFeedback] Skipping row — no ID or P No');
      continue;
    }

    parsed.push({
      intern_id: internId,
      p_no: pNo,
      intern_name: internName,
      task_completion: getVal(['Task Completion', 'taskcompletion']),
      quality_of_work: getVal(['Quality of Work', 'qualityofwork']),
      problem_solving: getVal(['Problem Solving', 'problemsolving']),
      initiative_innovation: getVal(['Initiative & Innovation', 'Initiative and Innovation', 'initiativeinnovation']),
      learning_adaptability: getVal(['Learning & Adaptability', 'Learning and Adaptability', 'learningadaptability']),
      communication: getVal(['Communication']),
      professionalism_ethics: getVal(['Professionalism & Ethics', 'Professionalism and Ethics', 'professionalismethics']),
      respect_authority: getVal(['Respect for Authority', 'respectauthority']),
      accountability: getVal(['Accountability']),
      teamwork: getVal(['Teamwork']),
      conflict_resolution: getVal(['Conflict Resolution', 'conflictresolution']),
      empathy: getVal(['Empathy']),
      leadership_potential: getVal(['Leadership Potential', 'leadershippotential']),
      conflict_handling: getVal(['Conflict Handling', 'conflicthandling']),
      attendance_punctuality: getVal(['Attendance & Punctuality', 'Attendance and Punctuality', 'attendancepunctuality', 'attendance']),
    });
  }

  return parsed;
}
