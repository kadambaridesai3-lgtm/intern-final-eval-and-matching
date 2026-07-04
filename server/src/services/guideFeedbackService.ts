import { getPrisma } from '../lib/prisma';
import XLSX from 'xlsx';
import { cleanPNo, validateExcelHeaders, toText } from '../utils/excel';

const prisma = getPrisma();

// ── Q-Number to DB field mapping ──────────────────────────────────────────────
// The Tata Motors Guide Feedback Excel has Q5–Q19 Score columns.
// Each maps to an existing DB field in GuideFeedback.

export const Q_TO_FIELD: Record<string, string> = {
  'Q5':  'task_completion',
  'Q6':  'quality_of_work',
  'Q7':  'problem_solving',
  'Q8':  'initiative_innovation',
  'Q9':  'learning_adaptability',
  'Q10': 'attendance_punctuality',   // Attendance — excluded from Guide Score
  'Q11': 'communication',
  'Q12': 'professionalism_ethics',
  'Q13': 'respect_authority',
  'Q14': 'accountability',
  'Q15': 'teamwork',
  'Q16': 'conflict_resolution',
  'Q17': 'empathy',
  'Q18': 'leadership_potential',
  'Q19': 'conflict_handling',
};

// ── Score helpers ─────────────────────────────────────────────────────────────

function toNumericScore(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const s = String(val).trim().toLowerCase();
  // Direct numeric
  const parsed = parseInt(s);
  if (!isNaN(parsed) && parsed >= 0) return parsed;
  // Text-based (legacy support)
  if (s.startsWith('best') || s.startsWith('excellent')) return 5;
  if (s.startsWith('good')) return 4;
  if (s.startsWith('average') || s.startsWith('meet')) return 3;
  if (s.startsWith('poor') || s.startsWith('below')) return 2;
  if (s.startsWith('worst') || s.startsWith('needs')) return 1;
  return 0;
}

/**
 * Calculate guide feedback scores from the 15 dimension values (Q5–Q19).
 *
 * - total_marks = sum of all 15 scores (Q5–Q19), max 75
 * - percentage  = (total_marks / 75) × 100
 * - guide_score = (sum of Q5–Q9 + Q11–Q19, i.e. excluding Q10) / 70 × 100
 *
 * Q10 (attendance_punctuality) is stored but NOT included in guide_score.
 */
export function calculateGuideFeedbackScores(data: {
  task_completion: number;      // Q5
  quality_of_work: number;      // Q6
  problem_solving: number;      // Q7
  initiative_innovation: number; // Q8
  learning_adaptability: number; // Q9
  attendance_punctuality: number; // Q10 — excluded from guide_score
}) {
  const q5  = data.task_completion;
  const q6  = data.quality_of_work;
  const q7  = data.problem_solving;
  const q8  = data.initiative_innovation;
  const q9  = data.learning_adaptability;
  const q10 = data.attendance_punctuality;

  // Total = sum of all 6 (max 30)
  const total_marks = q5 + q6 + q7 + q8 + q9 + q10;

  // Percentage = (Total / 30) × 100
  const percentage = (total_marks / 30) * 100;

  // Guide Score = (sum of Q5–Q9, excluding Q10) / 25 × 100
  const obtainedMarksExclQ10 = q5 + q6 + q7 + q8 + q9;
  const guide_score = (obtainedMarksExclQ10 / 25) * 100;

  console.log('[GuideFeedback] total:', total_marks, 'percentage:', percentage.toFixed(2), 'guide_score:', guide_score.toFixed(2), '(Q10 excluded)');

  return {
    total_marks,
    percentage: Math.round(percentage * 100) / 100,
    guide_score: Math.round(guide_score * 100) / 100,
  };
}

// ── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertGuideFeedback(data: {
  intern_id: string;
  review_id?: string;
  guide_name?: string;
  department?: string;
  task_completion: number;      // Q5
  quality_of_work: number;      // Q6
  problem_solving: number;      // Q7
  initiative_innovation: number; // Q8
  learning_adaptability: number; // Q9
  attendance_punctuality: number; // Q10
}) {
  const parsed = {
    task_completion: toNumericScore(data.task_completion),
    quality_of_work: toNumericScore(data.quality_of_work),
    problem_solving: toNumericScore(data.problem_solving),
    initiative_innovation: toNumericScore(data.initiative_innovation),
    learning_adaptability: toNumericScore(data.learning_adaptability),
    attendance_punctuality: toNumericScore(data.attendance_punctuality),
  };

  const { total_marks, percentage, guide_score } = calculateGuideFeedbackScores(parsed);

  console.log('[GuideFeedback] Upserting for intern:', data.intern_id, 'review_id:', data.review_id);

  const existing = await prisma.guideFeedback.findFirst({
    where: {
      intern_id: data.intern_id,
      review_id: data.review_id || null,
    }
  });

  const writeData = {
    guide_name: data.guide_name || null,
    department: data.department || '',
    discipline: 0,
    learning_ability: 0,
    teamwork: 0,
    communication: 0,
    task_completion: parsed.task_completion,
    quality_of_work: parsed.quality_of_work,
    problem_solving: parsed.problem_solving,
    initiative_innovation: parsed.initiative_innovation,
    learning_adaptability: parsed.learning_adaptability,
    attendance_punctuality: parsed.attendance_punctuality,
    professionalism_ethics: 0,
    respect_authority: 0,
    accountability: 0,
    conflict_resolution: 0,
    empathy: 0,
    leadership_potential: 0,
    conflict_handling: 0,
    total_marks,
    percentage,
    guide_score,
  };

  if (existing) {
    return prisma.guideFeedback.update({
      where: { id: existing.id },
      data: {
        ...writeData,
        updated_at: new Date(),
      }
    });
  } else {
    return prisma.guideFeedback.create({
      data: {
        intern_id: data.intern_id,
        review_id: data.review_id || null,
        ...writeData,
      }
    });
  }
}

// ── Read helpers ──────────────────────────────────────────────────────────────

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
  p_no: string;
  candidate_name: string;
  guide_name: string;
  department: string;
  scores: Record<string, number | null>;
  excel_total: number;
  excel_percentage: number;
  rowNum: number;
}

export function parseGuideFeedbackExcel(filePath: string): RawFeedbackRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Get all headers from row 1
  const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
  const headers = (headerRow || []).map(h => String(h || '').trim());

  const EXPECTED_FEEDBACK_HEADERS = [
    'P No',
    'Candidate Name',
    'Guide Name',
    'Department',
    'Q5',
    'Q6',
    'Q7',
    'Q8',
    'Q9',
    'Q10',
    'Guide Score',
    'Remarks'
  ];

  const headerError = validateExcelHeaders(headers, EXPECTED_FEEDBACK_HEADERS);
  if (headerError) {
    throw new Error(headerError);
  }

  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log('[GuideFeedback] Parsed', rows.length, 'rows from Excel');

  const parsed: RawFeedbackRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const isEmptyRow = Object.values(row).every(val => val === undefined || val === null || String(val).trim() === '');
    if (isEmptyRow) {
      continue;
    }

    const p_no = cleanPNo(row['P No']);
    const candidate_name = toText(row['Candidate Name']);
    const guide_name = toText(row['Guide Name']);
    const department = toText(row['Department']);

    const scores: Record<string, number | null> = {};
    for (let q = 5; q <= 10; q++) {
      const val = row[`Q${q}`];
      if (val === undefined || val === null || val === '') {
        scores[`Q${q}`] = null;
      } else {
        const num = Number(val);
        scores[`Q${q}`] = isNaN(num) ? null : num;
      }
    }

    // Set Q11-Q19 to null for completeness
    for (let q = 11; q <= 19; q++) {
      scores[`Q${q}`] = null;
    }

    const excel_total = Number(row['Guide Score'] || 0); // we can read it, but we calculate it ourselves
    const excel_percentage = Number(row['Guide Score'] || 0);

    parsed.push({
      p_no,
      candidate_name,
      guide_name,
      department,
      scores,
      excel_total,
      excel_percentage,
      rowNum
    });
  }

  return parsed;
}

// ── Sample Excel Generator ────────────────────────────────────────────────────

export function generateSampleExcel(): Buffer {
  const wb = XLSX.utils.book_new();

  const headers = [
    'P No', 'Candidate Name', 'Guide Name', 'Department',
    'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10',
    'Guide Score', 'Remarks'
  ];

  const sampleRow = [
    '106245', 'Rahul Sharma', 'Santosh Ghanwat', 'Development',
    4, 5, 3, 4, 5, 4,
    84.0, 'Good Performer'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Guide Feedback');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
