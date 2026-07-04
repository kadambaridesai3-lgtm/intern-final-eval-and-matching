import { getPrisma } from '../lib/prisma';
import XLSX from 'xlsx';

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

function toOptionalNumericScore(val: any): number | null {
  if (val === undefined || val === null || val === '') return null;
  const s = String(val).trim().toLowerCase();
  if (s === '') return null;
  
  // Direct numeric
  const parsed = parseInt(s, 10);
  if (!isNaN(parsed) && parsed >= 0) return parsed;
  
  // Text-based (legacy support)
  if (s.startsWith('best') || s.startsWith('excellent')) return 5;
  if (s.startsWith('good')) return 4;
  if (s.startsWith('average') || s.startsWith('meet')) return 3;
  if (s.startsWith('poor') || s.startsWith('below')) return 2;
  if (s.startsWith('worst') || s.startsWith('needs')) return 1;
  
  return null;
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
  task_completion: number | null;      // Q5
  quality_of_work: number | null;      // Q6
  problem_solving: number | null;      // Q7
  initiative_innovation: number | null; // Q8
  learning_adaptability: number | null; // Q9
  attendance_punctuality: number | null; // Q10 — excluded from guide_score
  communication: number | null;        // Q11
  professionalism_ethics: number | null; // Q12
  respect_authority: number | null;    // Q13
  accountability: number | null;       // Q14
  teamwork: number | null;             // Q15
  conflict_resolution: number | null;  // Q16
  empathy: number | null;              // Q17
  leadership_potential: number | null; // Q18
  conflict_handling: number | null;    // Q19
}) {
  const q5  = data.task_completion ?? 0;
  const q6  = data.quality_of_work ?? 0;
  const q7  = data.problem_solving ?? 0;
  const q8  = data.initiative_innovation ?? 0;
  const q9  = data.learning_adaptability ?? 0;
  const q10 = data.attendance_punctuality ?? 0;
  const q11 = data.communication ?? 0;
  const q12 = data.professionalism_ethics ?? 0;
  const q13 = data.respect_authority ?? 0;
  const q14 = data.accountability ?? 0;
  const q15 = data.teamwork ?? 0;
  const q16 = data.conflict_resolution ?? 0;
  const q17 = data.empathy ?? 0;
  const q18 = data.leadership_potential ?? 0;
  const q19 = data.conflict_handling ?? 0;

  // Total = sum of all 15 (max 75)
  const total_marks = q5 + q6 + q7 + q8 + q9 + q10 + q11 + q12 + q13 + q14 + q15 + q16 + q17 + q18 + q19;

  // Percentage = (Total / 75) × 100
  const percentage = (total_marks / 75) * 100;

  // Guide Score = (sum excluding Q10) / 70 × 100
  const obtainedMarksExclQ10 = q5 + q6 + q7 + q8 + q9 + q11 + q12 + q13 + q14 + q15 + q16 + q17 + q18 + q19;
  const guide_score = (obtainedMarksExclQ10 / 70) * 100;

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
  discipline?: number | null;
  learning_ability?: number | null;
  teamwork: number | null;
  communication: number | null;
  task_completion: number | null;
  quality_of_work?: number | null;
  problem_solving?: number | null;
  initiative_innovation?: number | null;
  learning_adaptability?: number | null;
  attendance_punctuality?: number | null;
  professionalism_ethics?: number | null;
  respect_authority?: number | null;
  accountability?: number | null;
  conflict_resolution?: number | null;
  empathy?: number | null;
  leadership_potential?: number | null;
  conflict_handling?: number | null;
  remarks?: string | null;
}) {
  const parsed = {
    discipline: data.discipline !== undefined ? toOptionalNumericScore(data.discipline) : null,
    learning_ability: data.learning_ability !== undefined ? toOptionalNumericScore(data.learning_ability) : null,
    teamwork: toOptionalNumericScore(data.teamwork),
    communication: toOptionalNumericScore(data.communication),
    task_completion: toOptionalNumericScore(data.task_completion),
    quality_of_work: toOptionalNumericScore(data.quality_of_work),
    problem_solving: toOptionalNumericScore(data.problem_solving),
    initiative_innovation: toOptionalNumericScore(data.initiative_innovation),
    learning_adaptability: toOptionalNumericScore(data.learning_adaptability),
    attendance_punctuality: toOptionalNumericScore(data.attendance_punctuality),
    professionalism_ethics: toOptionalNumericScore(data.professionalism_ethics),
    respect_authority: toOptionalNumericScore(data.respect_authority),
    accountability: toOptionalNumericScore(data.accountability),
    conflict_resolution: toOptionalNumericScore(data.conflict_resolution),
    empathy: toOptionalNumericScore(data.empathy),
    leadership_potential: toOptionalNumericScore(data.leadership_potential),
    conflict_handling: toOptionalNumericScore(data.conflict_handling),
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
    percentage,
    guide_score,
    remarks: data.remarks || '',
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
  excel_total: number | null;
  excel_percentage: number | null;
  remarks: string;
  rowNum: number;
}

export function parseGuideFeedbackExcel(filePath: string): RawFeedbackRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // raw: false formatted values preserves leading zeros as text strings
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  console.log('[GuideFeedback] Parsed', rows.length, 'rows from Excel');

  const parsed: RawFeedbackRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as Record<string, any>;
    const rowNum = i + 2;

    const isEmptyRow = Object.values(row).every(val => val === undefined || val === null || String(val).trim() === '');
    if (isEmptyRow) {
      continue;
    }

    // Read only the exact Tata Motors headers:
    const p_no = row['P No'] !== undefined && row['P No'] !== null ? String(row['P No']).trim() : '';
    const candidate_name = row['Candidate Name'] !== undefined && row['Candidate Name'] !== null ? String(row['Candidate Name']).trim() : '';
    const guide_name = row['Guide Name'] !== undefined && row['Guide Name'] !== null ? String(row['Guide Name']).trim() : '';
    const department = row['Department'] !== undefined && row['Department'] !== null ? String(row['Department']).trim() : '';
    const remarks = row['Remarks'] !== undefined && row['Remarks'] !== null ? String(row['Remarks']).trim() : '';

    const scores: Record<string, number | null> = {};
    for (let q = 5; q <= 19; q++) {
      const val = row[`Q${q}`];
      if (val === undefined || val === null || String(val).trim() === '') {
        scores[`Q${q}`] = null;
      } else {
        const trimmedVal = String(val).trim();
        const num = Number(trimmedVal);
        scores[`Q${q}`] = isNaN(num) ? -1 : num;
      }
    }

    const excel_total = row['Total'] !== undefined && row['Total'] !== null && String(row['Total']).trim() !== '' ? Number(String(row['Total']).trim()) : null;
    const excel_percentage = row['Percentage'] !== undefined && row['Percentage'] !== null && String(row['Percentage']).trim() !== '' ? Number(String(row['Percentage']).trim()) : null;

    parsed.push({
      p_no,
      candidate_name,
      guide_name,
      department,
      scores,
      excel_total,
      excel_percentage,
      remarks,
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
    'Q11', 'Q12', 'Q13', 'Q14', 'Q15', 'Q16',
    'Q17', 'Q18', 'Q19',
    'Total', 'Guide Score', 'Percentage', 'Remarks'
  ];

  // Populate one sample row with realistic data
  const sampleRow = [
    '012345', 'John Doe', 'Dr. Smith', 'Mechanical Engineering',
    4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4, 5, 4,
    66, 87.14, 88.00, 'Excellent performance'
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);

  // Set cell type of P No to string ('s') to preserve leading zero
  if (ws['A2']) {
    ws['A2'].t = 's';
    ws['A2'].v = '012345';
  }

  // Set column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));

  XLSX.utils.book_append_sheet(wb, ws, 'Guide Feedback');

  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
