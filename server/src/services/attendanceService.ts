import { getPrisma } from '../lib/prisma';
import XLSX from 'xlsx';

const prisma = getPrisma();

// ── Excel Parsing ────────────────────────────────────────────────────────────

interface RawAttendanceRow {
  intern_id: string; // This holds the raw Intern ID / p_no from Excel
  attendance_date: Date;
  submitted_at: Date;
}

function pickCell(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
}

function toText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toDate(value: unknown, fallback: Date): Date {
  if (value === undefined || value === null || value === '') return fallback;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
    }
    return fallback;
  }
  const text = String(value).trim();
  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  return fallback;
}

export function parseAttendanceExcel(buffer: Buffer): RawAttendanceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log('[Attendance] Parsed', rows.length, 'rows from Excel');

  const parsed: RawAttendanceRow[] = [];
  const now = new Date();

  for (const row of rows) {
    const intern_id = toText(pickCell(row, ['Intern ID', 'intern_id', 'P No', 'P.No', 'PNo', 'ID']));
    const attendance_date = toDate(pickCell(row, ['Date', 'Attendance Date', 'attendance_date']), now);
    const submitted_at = toDate(pickCell(row, ['Submitted At', 'submitted_at', 'Submission Date', 'Submission Time']), now);

    if (!intern_id) {
      console.log('[Attendance] Skipping row — no intern_id');
      continue;
    }

    parsed.push({ intern_id, attendance_date, submitted_at });
  }

  console.log('[Attendance] Valid rows:', parsed.length);
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
  punch_date: Date;
  in_time: string;
  out_time: string;
}

export function parseSmartCardExcel(buffer: Buffer): RawSmartCardRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  console.log('[SmartCard] Parsed', rows.length, 'rows from Excel');

  const parsed: RawSmartCardRow[] = [];
  const now = new Date();

  for (const row of rows) {
    const keys = Object.keys(row);
    const getVal = (colNames: string[]) => {
      const matchKey = keys.find(k => colNames.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, '')));
      return matchKey ? row[matchKey] : '';
    };

    const pNo = String(getVal(['P No', 'pno', 'p_no', 'personalno', 'personal_no'])).trim();
    const rawDate = getVal(['Date', 'punchdate', 'punch_date']);
    const punch_date = toDate(rawDate, now);
    const in_time = String(getVal(['In Time', 'intime', 'in'])).trim();
    const out_time = String(getVal(['Out Time', 'outtime', 'out'])).trim();

    if (!pNo) {
      console.log('[SmartCard] Skipping row — no P No');
      continue;
    }

    parsed.push({
      p_no: pNo,
      punch_date,
      in_time: in_time || '',
      out_time: out_time || '',
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
