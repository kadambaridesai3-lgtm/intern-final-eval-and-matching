import { getPrisma } from '../lib/prisma';
import XLSX from 'xlsx';

const prisma = getPrisma();

// ── Excel Parsing ────────────────────────────────────────────────────────────

export interface RawAttendanceRow {
  p_no: string;
  employee_name: string;
  attendance_date: Date | null;
  department: string;
  attendance_status: string;
  report_submitted: string;
  submitted_at: Date | null;
  remarks: string;
  rowNum: number;
}

export function parseDateSafe(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }
  if (typeof value === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const d = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
        if (!isNaN(d.getTime())) return d;
      }
    } catch {
      return null;
    }
  }
  const text = String(value).trim();
  const parts = text.split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (year > 1000 && month >= 0 && month < 12 && day > 0 && day <= 31) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  return null;
}

export function parseAttendanceExcel(filePath: string): RawAttendanceRow[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log('[Attendance] Parsed', rows.length, 'rows from Excel');

  const pickCell = (row: Record<string, unknown>, keys: string[]): any => {
    const rowKeys = Object.keys(row);
    const matchKey = rowKeys.find(k => 
      keys.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    return matchKey !== undefined ? row[matchKey] : '';
  };

  const parsed: RawAttendanceRow[] = [];
  if (rows.length === 0) return parsed;

  // Detect if there are monthly date columns (e.g. "1-Jun", "2-Jun")
  const firstRowKeys = Object.keys(rows[0]);
  const dateColumnKeys = firstRowKeys.filter(k => /^\d+-[A-Za-z]+$/i.test(k.trim()));

  const hasDateColumns = dateColumnKeys.length > 0;
  console.log('[Attendance] Has column-based date headers:', hasDateColumns, dateColumnKeys);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const isEmptyRow = Object.values(row).every(val => val === undefined || val === null || String(val).trim() === '');
    if (isEmptyRow) {
      continue;
    }

    const p_no = String(pickCell(row, ['P No', 'P.No', 'p_no', 'P.no', 'P.No.'])).trim();
    const employee_name = String(pickCell(row, ['Candidate Name', 'Employee Name', 'EmployeeName', 'Name', 'Intern Name'])).trim();
    const department = String(pickCell(row, ['Department', 'Department Name', 'Dept.Name', 'department'])).trim();

    if (hasDateColumns) {
      // Extract year from DOJ or DOL if available, else current year
      let baseYear = new Date().getFullYear();
      const rawDoj = pickCell(row, ['DOJ', 'doj', 'Start Date', 'start_date']);
      if (rawDoj) {
        const parsedDoj = parseDateSafe(rawDoj);
        if (parsedDoj && !isNaN(parsedDoj.getTime())) {
          baseYear = parsedDoj.getFullYear();
        }
      }
      const rawDol = pickCell(row, ['DOL', 'dol', 'End Date', 'end_date']);
      if (rawDol) {
        const parsedDol = parseDateSafe(rawDol);
        if (parsedDol && !isNaN(parsedDol.getTime())) {
          baseYear = parsedDol.getFullYear();
        }
      }

      for (const dateKey of dateColumnKeys) {
        const val = String(row[dateKey]).trim().toUpperCase();
        if (val === 'P') {
          // Parse header string like "1-Jun" to date
          const match = dateKey.trim().match(/^(\d+)-([A-Za-z]+)$/);
          if (match) {
            const day = parseInt(match[1]);
            const monthStr = match[2];
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m));
            if (monthIndex !== -1) {
              const attendance_date = new Date(baseYear, monthIndex, day);
              parsed.push({
                p_no,
                employee_name,
                attendance_date,
                department,
                attendance_status: 'PRESENT',
                report_submitted: 'YES',
                submitted_at: attendance_date, // Submission same day -> Marks it as PRESENT (genuine)
                remarks: '',
                rowNum
              });
            }
          }
        }
      }
    } else {
      // Standard row-based layout
      const rawDate = pickCell(row, ['Date', 'date']);
      const attendance_status = String(pickCell(row, ['Attendance Status', 'AttendanceStatus', 'Status'])).trim();
      const report_submitted = String(pickCell(row, ['Report Submitted', 'ReportSubmitted'])).trim();
      const rawSubmissionTime = pickCell(row, ['Submission Time', 'SubmissionTime', 'Submitted Time', 'submitted_time']);
      const remarks = String(pickCell(row, ['Remarks', 'remarks', 'Remark'])).trim();

      const attendance_date = parseDateSafe(rawDate);
      const submitted_at = parseDateSafe(rawSubmissionTime);

      parsed.push({
        p_no,
        employee_name,
        attendance_date,
        department,
        attendance_status,
        report_submitted,
        submitted_at,
        remarks,
        rowNum
      });
    }
  }

  return parsed;
}

// ── Backfill Detection ───────────────────────────────────────────────────────

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function detectBackfilled(attendanceDate: Date, submittedAt: Date): string {
  return isSameDay(attendanceDate, submittedAt) ? 'PRESENT' : 'BACKFILLED';
}

// ── Bulk Submission Detection ────────────────────────────────────────────────

interface BulkFlag {
  intern_id: string;
  count: number;
  window_start: Date;
  window_end: Date;
}

export function detectBulkSubmissions(records: { intern_id: string; submitted_at: Date }[]): BulkFlag[] {
  const grouped: Record<string, { submitted_at: Date }[]> = {};

  for (const r of records) {
    if (!grouped[r.intern_id]) grouped[r.intern_id] = [];
    grouped[r.intern_id].push({ submitted_at: r.submitted_at });
  }

  const flags: BulkFlag[] = [];

  for (const [intern_id, submissions] of Object.entries(grouped)) {
    const sorted = submissions.sort((a, b) => a.submitted_at.getTime() - b.submitted_at.getTime());

    for (let i = 0; i < sorted.length; i++) {
      const windowStart = sorted[i].submitted_at;
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000); // +1 hour

      let count = 0;
      for (let j = i; j < sorted.length; j++) {
        if (sorted[j].submitted_at <= windowEnd) {
          count++;
        } else {
          break;
        }
      }

      if (count > 3) {
        flags.push({
          intern_id,
          count,
          window_start: windowStart,
          window_end: windowEnd,
        });
        break; // one flag per intern is sufficient
      }
    }
  }

  console.log('[Attendance] Bulk submission flags:', flags.length);
  return flags;
}

// ── Smart Card Helpers ───────────────────────────────────────────────────────

export function isLate(inTime?: string | null): boolean {
  if (!inTime) return false;
  const clean = inTime.trim().toLowerCase();
  const matches = clean.match(/(\d+):(\d+)/);
  if (!matches) return false;
  let hrs = parseInt(matches[1]);
  const mins = parseInt(matches[2]);
  if (clean.includes('pm') && hrs < 12) hrs += 12;
  if (clean.includes('am') && hrs === 12) hrs = 0;
  return hrs * 60 + mins > 9 * 60 + 15; // 09:15 AM
}

export function isEarlyExit(outTime?: string | null): boolean {
  if (!outTime) return false;
  const clean = outTime.trim().toLowerCase();
  const matches = clean.match(/(\d+):(\d+)/);
  if (!matches) return false;
  let hrs = parseInt(matches[1]);
  const mins = parseInt(matches[2]);
  if (clean.includes('pm') && hrs < 12) hrs += 12;
  if (clean.includes('am') && hrs === 12) hrs = 0;
  return hrs * 60 + mins < 17 * 60; // 05:00 PM
}

export function getWorkingHours(inTime?: string | null, outTime?: string | null): number {
  if (!inTime || !outTime) return 0;
  const parseTimeToMins = (tStr: string) => {
    const clean = tStr.trim().toLowerCase();
    const matches = clean.match(/(\d+):(\d+)/);
    if (!matches) return 0;
    let hrs = parseInt(matches[1]);
    const mins = parseInt(matches[2]);
    if (clean.includes('pm') && hrs < 12) hrs += 12;
    if (clean.includes('am') && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  };
  const inMins = parseTimeToMins(inTime);
  const outMins = parseTimeToMins(outTime);
  if (outMins <= inMins) return 0;
  return (outMins - inMins) / 60;
}

// ── Smart Card Excel Parser ──────────────────────────────────────────────────

export interface RawSmartCardRow {
  p_no: string;
  punch_date: Date | null;
  in_time: string;
  out_time: string;
  rowNum: number;
}

export function parseSmartCardExcel(filePath: string): RawSmartCardRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log('[SmartCard] Parsed', rows.length, 'rows from Excel');

  const pickCell = (row: Record<string, unknown>, keys: string[]): any => {
    const rowKeys = Object.keys(row);
    const matchKey = rowKeys.find(k => 
      keys.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, ''))
    );
    return matchKey !== undefined ? row[matchKey] : '';
  };

  const parsed: RawSmartCardRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const isEmptyRow = Object.values(row).every(val => val === undefined || val === null || String(val).trim() === '');
    if (isEmptyRow) {
      continue;
    }

    const p_no = String(pickCell(row, ['P No', 'P.No', 'p_no', 'P.no', 'P.No.'])).trim();
    const rawDate = pickCell(row, ['Date', 'date', 'Punch Date']);
    const in_time = String(pickCell(row, ['In Time', 'InTime', 'In'])).trim();
    const out_time = String(pickCell(row, ['Out Time', 'OutTime', 'Out'])).trim();
    // candidate_name parsed for completeness (not stored in SmartCardPunch)

    const punch_date = parseDateSafe(rawDate);

    parsed.push({
      p_no,
      punch_date,
      in_time: in_time || '',
      out_time: out_time || '',
      rowNum
    });
  }

  console.log('[SmartCard] Valid punch rows:', parsed.length);
  return parsed;
}

// ── Attendance Score Calculation ──────────────────────────────────────────────

export async function calculateAndUpsertSummaries(
  month?: number,
  year?: number,
  batchName?: string,
  configWorkingDays?: number
): Promise<any[]> {
  // Get all unique interns
  const interns = await prisma.intern.findMany();
  console.log('[Attendance] Calculating summaries for', interns.length, 'interns');

  // Determine Working Days
  let workingDays = 0;
  if (configWorkingDays && configWorkingDays > 0) {
    workingDays = configWorkingDays;
  } else {
    // Find maximum punch count for any single intern to determine Working Days dynamically
    const punchCounts = await prisma.smartCardPunch.groupBy({
      by: ['intern_id'],
      _count: {
        punch_date: true
      }
    });
    const maxPunches = punchCounts.reduce((max, curr) => curr._count.punch_date > max ? curr._count.punch_date : max, 0);
    workingDays = maxPunches > 0 ? maxPunches : 20; // Fallback to 20 if no punches
  }

  console.log('[Attendance] Using workingDays =', workingDays);

  const results: any[] = [];

  for (const intern of interns) {
    const intern_id = intern.intern_id;

    // Get smart card punches
    const punches = await prisma.smartCardPunch.findMany({
      where: { intern_id },
    });

    // Present days = number of unique punch dates
    const present_days = punches.length;
    const attendance_percentage = workingDays > 0
      ? Math.min((present_days / workingDays) * 100, 100)
      : 0;

    // Get daily submission records
    const records = await prisma.attendanceRecord.findMany({
      where: { intern_id },
    });

    // Genuine reports = records with status PRESENT
    const genuine_days = records.filter(r => r.status === 'PRESENT').length;
    const sincerity_percentage = workingDays > 0
      ? Math.min((genuine_days / workingDays) * 100, 100)
      : 0;

    // Attendance Score = (Attendance Percentage * 70%) + (Sincerity Percentage * 30%)
    const attendance_score = (attendance_percentage * 0.70) + (sincerity_percentage * 0.30);

    // Flag for bulk submissions (using daily submissions)
    const allRecords = records.map(r => ({
      intern_id: r.intern_id,
      submitted_at: r.submitted_at,
    }));
    const bulkFlags = detectBulkSubmissions(allRecords);
    const flagged = bulkFlags.length > 0;
    const flag_details = flagged
      ? `Bulk submission detected: ${bulkFlags[0].count} entries within 1 hour`
      : null;

    // Default to current month/year if not provided
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    console.log(`[Attendance] ${intern_id}: present=${present_days}/${workingDays}, genuine=${genuine_days}/${workingDays}, score=${attendance_score.toFixed(2)}`);

    const summary = await prisma.attendanceSummary.upsert({
      where: {
        intern_id_month_year: {
          intern_id,
          month: targetMonth,
          year: targetYear,
        }
      },
      create: {
        intern_id,
        month: targetMonth,
        year: targetYear,
        batch_name: batchName || null,
        total_working_days: workingDays,
        present_days,
        genuine_days,
        attendance_percentage: Math.round(attendance_percentage * 100) / 100,
        sincerity_percentage: Math.round(sincerity_percentage * 100) / 100,
        attendance_score: Math.round(attendance_score * 100) / 100,
        flagged,
        flag_details,
      },
      update: {
        batch_name: batchName || null,
        total_working_days: workingDays,
        present_days,
        genuine_days,
        attendance_percentage: Math.round(attendance_percentage * 100) / 100,
        sincerity_percentage: Math.round(sincerity_percentage * 100) / 100,
        attendance_score: Math.round(attendance_score * 100) / 100,
        flagged,
        flag_details,
        updated_at: new Date(),
      },
    });

    results.push(summary);
  }

  console.log('[Attendance] Upserted', results.length, 'summaries');
  return results;
}

export async function getAllSummaries() {
  return prisma.attendanceSummary.findMany({
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
        }
      }
    },
    orderBy: { attendance_score: 'desc' },
  });
}

export async function getSummaryByInternId(internId: string) {
  return prisma.attendanceSummary.findFirst({
    where: { intern_id: internId },
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
        }
      }
    }
  });
}

export async function getRecordsByInternId(internId: string) {
  return prisma.attendanceRecord.findMany({
    where: { intern_id: internId },
    orderBy: { attendance_date: 'asc' },
  });
}

export async function getFlaggedSummaries() {
  return prisma.attendanceSummary.findMany({
    where: { flagged: true },
    include: {
      intern: {
        select: {
          full_name: true,
          p_no: true,
        }
      }
    }
  });
}

export async function clearAllAttendanceData() {
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceSummary.deleteMany({});
  await prisma.smartCardPunch.deleteMany({});
  console.log('[Attendance] Cleared all attendance & smart card data');
}
