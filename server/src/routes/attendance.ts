import express from 'express';
import multer from 'multer';
import { getPrisma } from '../lib/prisma';
import {
  parseAttendanceExcel,
  detectBackfilled,
  detectBulkSubmissions,
  calculateAndUpsertSummaries,
  getAllSummaries,
  getSummaryByInternId,
  getRecordsByInternId,
  getFlaggedSummaries,
  clearAllAttendanceData,
  parseSmartCardExcel,
  isLate,
  isEarlyExit,
  getWorkingHours,
} from '../services/attendanceService';
import { generateAllFinalEvaluations } from '../services/finalEvaluationService';
import { writeTempFile, deleteTempFile } from '../utils/tempFile';

const router = express.Router();
const prisma = getPrisma();
const upload = multer({ storage: multer.memoryStorage() });

function parseDateSafe(val: any): Date {
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

// POST /api/attendance/upload — Upload daily reports attendance Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  let tempPath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Attendance] Uploading file:', req.file.originalname);
    
    // Save to temp file to handle file locks and permissions
    try {
      tempPath = writeTempFile(req.file.buffer, req.file.originalname);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to write temporary file: ' + err.message });
    }

    let parsedRecords;
    try {
      parsedRecords = parseAttendanceExcel(tempPath);
    } catch (err: any) {
      // Excel File Lock check
      if (err.code === 'EBUSY' || err.message?.includes('busy') || err.message?.includes('lock')) {
        return res.status(400).json({ error: 'The uploaded Excel file is locked or open in another program. Please close it and try again.' });
      }
      return res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
    }

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'No records found in attendance file' });
    }

    const errors: { row: number; error: string }[] = [];
    const warnings: { row: number; warning: string }[] = [];
    let created = 0;
    const seenPunches = new Set<string>();

    const month = req.body.month ? parseInt(req.body.month) : req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.body.year ? parseInt(req.body.year) : req.query.year ? parseInt(req.query.year as string) : undefined;
    const batchName = req.body.batch_name || req.query.batch_name || undefined;
    const configWorkingDays = req.body.working_days ? parseInt(req.body.working_days) : req.query.working_days ? parseInt(req.query.working_days as string) : undefined;

    const recordsForBulkFlag: { intern_id: string; submitted_at: Date }[] = [];

    for (let i = 0; i < parsedRecords.length; i++) {
      const pr = parsedRecords[i];
      const rowNum = pr.rowNum;

      if (!pr.p_no) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: P No is blank.` });
        continue;
      }

      if (!pr.attendance_date) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: Date is invalid.` });
        continue;
      }

      const dateStr = pr.attendance_date.toISOString().split('T')[0];
      const punchKey = `${pr.p_no}_${dateStr}`;
      if (seenPunches.has(punchKey)) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: Duplicate attendance entry for P No ${pr.p_no} on date ${dateStr} in file.` });
        continue;
      }
      seenPunches.add(punchKey);

      const intern = await prisma.intern.findFirst({
        where: { p_no: pr.p_no },
      });

      if (!intern) {
        warnings.push({
          row: rowNum,
          warning: `Row ${rowNum}: P No ${pr.p_no} not found in Intern database.`
        });
        continue;
      }

      const businessId = intern.intern_id;

      if (!pr.department) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: Department is blank` });
      }

      try {
        const fallbackSubmission = pr.submitted_at || new Date();
        const status = detectBackfilled(pr.attendance_date, fallbackSubmission);

        // Delete existing daily record for same intern and date to avoid duplication
        await prisma.attendanceRecord.deleteMany({
          where: {
            intern_id: businessId,
            attendance_date: pr.attendance_date,
          }
        });

        await prisma.attendanceRecord.create({
          data: {
            intern_id: businessId,
            attendance_date: pr.attendance_date,
            submitted_at: fallbackSubmission,
            status,
          },
        });
        created++;
        recordsForBulkFlag.push({
          intern_id: businessId,
          submitted_at: fallbackSubmission,
        });
      } catch (err: any) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: Failed to save record: ${err.message}` });
      }
    }

    const bulkFlags = detectBulkSubmissions(recordsForBulkFlag);

    // Calculate and upsert summaries
    const summaries = await calculateAndUpsertSummaries(month, year, batchName, configWorkingDays);

    // Recalculate final evaluations
    await generateAllFinalEvaluations();

    try {
      await prisma.uploadHistory.create({
        data: {
          file_name: req.file.originalname,
          records_imported: created,
          status: errors.length > 0 ? 'Failed' : (warnings.length > 0 ? 'Warnings' : 'Success'),
          module: 'Daily Attendance',
          uploaded_by: 'HR Admin'
        }
      });
    } catch (dbErr) {
      console.error('Failed to log daily attendance upload history', dbErr);
    }

    res.json({
      message: `Processed ${parsedRecords.length} daily report attendance records`,
      created,
      total_parsed: parsedRecords.length,
      summaries_updated: summaries.length,
      bulk_flags: bulkFlags,
      errors,
      warnings,
    });
  } catch (error: any) {
    console.error('[Attendance] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process attendance file' });
  } finally {
    if (tempPath) deleteTempFile(tempPath);
  }
});

// POST /api/attendance/upload-smart-card — Upload Smart Card Attendance Excel
router.post('/upload-smart-card', upload.single('file'), async (req, res) => {
  let tempPath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[SmartCard] Uploading file:', req.file.originalname);
    
    // Save to temp file to handle file locks and permissions
    try {
      tempPath = writeTempFile(req.file.buffer, req.file.originalname);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to write temporary file: ' + err.message });
    }

    let parsedRecords;
    try {
      parsedRecords = parseSmartCardExcel(tempPath);
    } catch (err: any) {
      // Excel File Lock check
      if (err.code === 'EBUSY' || err.message?.includes('busy') || err.message?.includes('lock')) {
        return res.status(400).json({ error: 'The uploaded Excel file is locked or open in another program. Please close it and try again.' });
      }
      return res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
    }

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'No records found in smart card file' });
    }

    const errors: { row: number; error: string }[] = [];
    const warnings: { row: number; warning: string }[] = [];
    let created = 0;
    const seenPunches = new Set<string>();

    for (let i = 0; i < parsedRecords.length; i++) {
      const pr = parsedRecords[i];
      const rowNum = pr.rowNum;

      if (!pr.p_no) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: P No is blank.` });
        continue;
      }

      if (!pr.punch_date) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: Date is invalid.` });
        continue;
      }

      const dateStr = pr.punch_date.toISOString().split('T')[0];
      const punchKey = `${pr.p_no}_${dateStr}`;
      if (seenPunches.has(punchKey)) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: Duplicate attendance entry for P No ${pr.p_no} on date ${dateStr} in file.` });
        continue;
      }
      seenPunches.add(punchKey);

      // Look up intern by p_no
      const intern = await prisma.intern.findFirst({
        where: { p_no: pr.p_no },
      });

      if (!intern) {
        warnings.push({
          row: rowNum,
          warning: `Row ${rowNum}: P No ${pr.p_no} not found in Intern database.`,
        });
        continue;
      }

      if (!pr.in_time) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: In Time is blank` });
      }
      if (!pr.out_time) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: Out Time is blank` });
      }

      try {
        await prisma.smartCardPunch.upsert({
          where: {
            intern_id_punch_date: {
              intern_id: intern.intern_id,
              punch_date: pr.punch_date,
            }
          },
          create: {
            intern_id: intern.intern_id,
            p_no: intern.p_no || pr.p_no,
            punch_date: pr.punch_date,
            in_time: pr.in_time || null,
            out_time: pr.out_time || null,
          },
          update: {
            in_time: pr.in_time || null,
            out_time: pr.out_time || null,
          }
        });
        created++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: Failed to save punch record: ${err.message}` });
      }
    }

    const month = req.body.month ? parseInt(req.body.month) : req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.body.year ? parseInt(req.body.year) : req.query.year ? parseInt(req.query.year as string) : undefined;
    const batchName = req.body.batch_name || req.query.batch_name || undefined;
    const configWorkingDays = req.body.working_days ? parseInt(req.body.working_days) : req.query.working_days ? parseInt(req.query.working_days as string) : undefined;

    // Recalculate summaries based on updated punches
    const summaries = await calculateAndUpsertSummaries(month, year, batchName, configWorkingDays);

    // Recalculate final evaluations
    await generateAllFinalEvaluations();

    try {
      await prisma.uploadHistory.create({
        data: {
          file_name: req.file.originalname,
          records_imported: created,
          status: errors.length > 0 ? 'Failed' : (warnings.length > 0 ? 'Warnings' : 'Success'),
          module: 'Smart Card',
          uploaded_by: 'HR Admin'
        }
      });
    } catch (dbErr) {
      console.error('Failed to log smart card upload history', dbErr);
    }

    res.json({
      message: `Processed ${parsedRecords.length} smart card punch records`,
      created,
      total_parsed: parsedRecords.length,
      summaries_updated: summaries.length,
      errors,
      warnings,
    });
  } catch (error: any) {
    console.error('[SmartCard] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process smart card file' });
  } finally {
    if (tempPath) deleteTempFile(tempPath);
  }
});

// POST /api/attendance/smart-card/punch — Manual smart card punch entry
router.post('/smart-card/punch', async (req, res) => {
  try {
    const { p_no, punch_date, in_time, out_time } = req.body;

    if (!p_no || p_no.trim() === '') {
      return res.status(400).json({ error: 'P No is required.' });
    }

    if (!punch_date) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    const parsedDate = parseDateSafe(punch_date);
    if (!parsedDate) {
      return res.status(400).json({ error: 'Invalid punch date format.' });
    }

    const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]\s*(AM|PM|am|pm)?$/;
    if (in_time && !timeRegex.test(in_time)) {
      return res.status(400).json({ error: 'Invalid In Time format (expected HH:MM).' });
    }
    if (out_time && !timeRegex.test(out_time)) {
      return res.status(400).json({ error: 'Invalid Out Time format (expected HH:MM).' });
    }

    // Check if intern exists
    const intern = await prisma.intern.findFirst({
      where: { p_no: p_no.trim() }
    });
    if (!intern) {
      return res.status(400).json({ error: `P No ${p_no} not found in database.` });
    }

    // Check for duplicate punch
    const existing = await prisma.smartCardPunch.findUnique({
      where: {
        intern_id_punch_date: {
          intern_id: intern.intern_id,
          punch_date: parsedDate
        }
      }
    });
    if (existing) {
      return res.status(400).json({ error: `Duplicate punch: Intern already has a punch record on ${parsedDate.toLocaleDateString('en-IN')}.` });
    }

    const punch = await prisma.smartCardPunch.create({
      data: {
        intern_id: intern.intern_id,
        p_no: intern.p_no || p_no.trim(),
        punch_date: parsedDate,
        in_time: in_time || null,
        out_time: out_time || null,
      }
    });

    // Recalculate summary & evaluations
    await calculateAndUpsertSummaries();
    await generateAllFinalEvaluations();

    res.status(201).json(punch);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create smart card punch' });
  }
});

// PUT /api/attendance/smart-card/punch/:id — Edit smart card punch record
router.put('/smart-card/punch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { punch_date, in_time, out_time } = req.body;

    const existing = await prisma.smartCardPunch.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Smart card punch record not found.' });
    }

    const parsedDate = punch_date ? parseDateSafe(punch_date) : existing.punch_date;
    if (!parsedDate) {
      return res.status(400).json({ error: 'Invalid punch date format.' });
    }

    const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]\s*(AM|PM|am|pm)?$/;
    if (in_time && !timeRegex.test(in_time)) {
      return res.status(400).json({ error: 'Invalid In Time format (expected HH:MM).' });
    }
    if (out_time && !timeRegex.test(out_time)) {
      return res.status(400).json({ error: 'Invalid Out Time format (expected HH:MM).' });
    }

    // Check duplicate punch (excluding current record)
    if (punch_date) {
      const duplicate = await prisma.smartCardPunch.findFirst({
        where: {
          intern_id: existing.intern_id,
          punch_date: parsedDate,
          NOT: { id }
        }
      });
      if (duplicate) {
        return res.status(400).json({ error: `Duplicate punch: Intern already has a punch record on ${parsedDate.toLocaleDateString('en-IN')}.` });
      }
    }

    const punch = await prisma.smartCardPunch.update({
      where: { id },
      data: {
        punch_date: parsedDate,
        in_time: in_time !== undefined ? in_time : existing.in_time,
        out_time: out_time !== undefined ? out_time : existing.out_time,
      }
    });

    // Recalculate summary & evaluations
    await calculateAndUpsertSummaries();
    await generateAllFinalEvaluations();

    res.json(punch);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update punch record' });
  }
});

// DELETE /api/attendance/smart-card/punch/:id — Delete smart card punch record
router.delete('/smart-card/punch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const punch = await prisma.smartCardPunch.findUnique({
      where: { id }
    });
    if (!punch) {
      return res.status(404).json({ error: 'Punch record not found.' });
    }

    await prisma.smartCardPunch.delete({
      where: { id }
    });

    // Recalculate summary & evaluations
    await calculateAndUpsertSummaries();
    await generateAllFinalEvaluations();

    res.json({ message: 'Punch record deleted successfully.' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to delete punch record' });
  }
});

// GET /api/attendance/smart-card/punches — List all smart card punches
router.get('/smart-card/punches', async (req, res) => {
  try {
    const punches = await prisma.smartCardPunch.findMany({
      include: {
        intern: {
          select: {
            full_name: true,
            p_no: true,
          }
        }
      },
      orderBy: { punch_date: 'desc' },
    });

    const formatted = punches.map(p => {
      const late = isLate(p.in_time);
      const early = isEarlyExit(p.out_time);
      const hours = getWorkingHours(p.in_time, p.out_time);
      return {
        ...p,
        intern_name: p.intern?.full_name || 'Unknown',
        is_late: late,
        is_early_exit: early,
        working_hours: Math.round(hours * 100) / 100,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch smart card punches' });
  }
});

// GET /api/attendance/summaries — List all attendance summaries
router.get('/summaries', async (_req, res) => {
  try {
    const summaries = await getAllSummaries();
    const formatted = summaries.map(s => ({
      ...s,
      intern_name: s.intern?.full_name || 'Unknown',
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance summaries' });
  }
});

// GET /api/attendance/summary/:internId — Single intern summary
router.get('/summary/:internId', async (req, res) => {
  try {
    const summary = await getSummaryByInternId(req.params.internId);
    if (!summary) {
      return res.status(404).json({ error: 'No attendance summary found for this intern' });
    }
    const formatted = {
      ...summary,
      intern_name: summary.intern?.full_name || 'Unknown',
    };
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

// GET /api/attendance/records/:internId — Raw daily records for an intern
router.get('/records/:internId', async (req, res) => {
  try {
    const records = await getRecordsByInternId(req.params.internId);
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// GET /api/attendance/flagged — Flagged interns
router.get('/flagged', async (_req, res) => {
  try {
    const flagged = await getFlaggedSummaries();
    const formatted = flagged.map(s => ({
      ...s,
      intern_name: s.intern?.full_name || 'Unknown',
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch flagged attendance' });
  }
});

// POST /api/attendance/recalculate — Recalculate summaries with custom working days
router.post('/recalculate', async (req, res) => {
  try {
    const month = req.body.month ? parseInt(req.body.month) : undefined;
    const year = req.body.year ? parseInt(req.body.year) : undefined;
    const batchName = req.body.batch_name;
    const configWorkingDays = req.body.working_days ? parseInt(req.body.working_days) : undefined;

    const summaries = await calculateAndUpsertSummaries(month, year, batchName, configWorkingDays);
    res.json({
      message: 'Recalculation complete',
      summaries_updated: summaries.length,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to recalculate' });
  }
});

// POST /api/attendance/record — Manual attendance entry
router.post('/record', async (req, res) => {
  try {
    const { p_no, attendance_date, status, submitted_at } = req.body;

    if (!p_no || p_no.trim() === '') {
      return res.status(400).json({ error: 'P No is required.' });
    }

    if (!attendance_date) {
      return res.status(400).json({ error: 'Attendance date is required.' });
    }

    const parsedDate = parseDateSafe(attendance_date);
    if (!parsedDate) {
      return res.status(400).json({ error: 'Invalid attendance date format.' });
    }

    // Check if intern exists
    const intern = await prisma.intern.findFirst({
      where: { p_no: p_no.trim() }
    });
    if (!intern) {
      return res.status(400).json({ error: `P No ${p_no} not found in database.` });
    }

    // Check for duplicate attendance
    const dateOnly = new Date(parsedDate);
    dateOnly.setHours(0, 0, 0, 0);

    const nextDay = new Date(dateOnly);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        intern_id: intern.intern_id,
        attendance_date: {
          gte: dateOnly,
          lt: nextDay
        }
      }
    });

    if (existingRecord) {
      return res.status(400).json({ error: `Duplicate attendance record: Intern ${p_no} already has an attendance record on ${dateOnly.toLocaleDateString('en-IN')}.` });
    }

    const fallbackSubmission = submitted_at ? (parseDateSafe(submitted_at) || new Date()) : new Date();
    const calculatedStatus = status || detectBackfilled(parsedDate, fallbackSubmission);

    const record = await prisma.attendanceRecord.create({
      data: {
        intern_id: intern.intern_id,
        attendance_date: parsedDate,
        submitted_at: fallbackSubmission,
        status: calculatedStatus,
      }
    });

    // Recalculate summary & evaluations
    await calculateAndUpsertSummaries();
    await generateAllFinalEvaluations();

    res.status(201).json(record);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create attendance record' });
  }
});

// PUT /api/attendance/record/:id — Edit daily attendance record
router.put('/record/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { attendance_date, status, submitted_at } = req.body;

    const existing = await prisma.attendanceRecord.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    const parsedDate = attendance_date ? parseDateSafe(attendance_date) : existing.attendance_date;
    if (!parsedDate) {
      return res.status(400).json({ error: 'Invalid attendance date format.' });
    }

    // Check duplicate daily attendance (excluding current record)
    if (attendance_date) {
      const dateOnly = new Date(parsedDate);
      dateOnly.setHours(0, 0, 0, 0);

      const nextDay = new Date(dateOnly);
      nextDay.setDate(nextDay.getDate() + 1);

      const duplicate = await prisma.attendanceRecord.findFirst({
        where: {
          intern_id: existing.intern_id,
          attendance_date: {
            gte: dateOnly,
            lt: nextDay
          },
          NOT: { id }
        }
      });

      if (duplicate) {
        return res.status(400).json({ error: `Duplicate attendance record: Intern already has an attendance record on ${dateOnly.toLocaleDateString('en-IN')}.` });
      }
    }

    const fallbackSubmission = submitted_at ? (parseDateSafe(submitted_at) || existing.submitted_at) : existing.submitted_at;
    const calculatedStatus = status || detectBackfilled(parsedDate, fallbackSubmission);

    const record = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        attendance_date: parsedDate,
        submitted_at: fallbackSubmission,
        status: calculatedStatus,
      }
    });

    // Recalculate summary & evaluations
    await calculateAndUpsertSummaries();
    await generateAllFinalEvaluations();

    res.json(record);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update attendance record' });
  }
});

// DELETE /api/attendance/record/:id — Delete daily attendance record
router.delete('/record/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const record = await prisma.attendanceRecord.findUnique({
      where: { id }
    });
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    await prisma.attendanceRecord.delete({
      where: { id }
    });

    // Recalculate summary & evaluations
    await calculateAndUpsertSummaries();
    await generateAllFinalEvaluations();

    res.json({ message: 'Attendance record deleted successfully.' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to delete attendance record' });
  }
});

// DELETE /api/attendance/records — Clear all attendance data
router.delete('/records', async (_req, res) => {
  try {
    await clearAllAttendanceData();
    res.json({ message: 'All attendance data cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear attendance data' });
  }
});

export default router;
