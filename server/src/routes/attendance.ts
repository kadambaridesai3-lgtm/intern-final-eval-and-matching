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

const router = express.Router();
const prisma = getPrisma();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/attendance/upload — Upload daily reports attendance Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[Attendance] Uploading file:', req.file.originalname);
    const parsedRecords = parseAttendanceExcel(req.file.buffer);

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'No valid attendance records found in file' });
    }

    const records: { intern_id: string; attendance_date: Date; submitted_at: Date }[] = [];
    const cache = new Map<string, string>(); // p_no -> intern business intern_id

    for (let i = 0; i < parsedRecords.length; i++) {
      const pr = parsedRecords[i];
      let businessId = cache.get(pr.intern_id);
      if (!businessId) {
        const intern = await prisma.intern.findFirst({
          where: {
            OR: [
              { p_no: pr.intern_id },
              { intern_id: pr.intern_id },
            ]
          },
        });
        if (!intern) {
          return res.status(400).json({
            error: `Validation error: Intern with identifier "${pr.intern_id}" (row ${i + 2}) does not exist in the database.`
          });
        }
        businessId = intern.intern_id;
        cache.set(pr.intern_id, businessId);
      }
      records.push({
        intern_id: businessId,
        attendance_date: pr.attendance_date,
        submitted_at: pr.submitted_at,
      });
    }

    const month = req.body.month ? parseInt(req.body.month) : req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.body.year ? parseInt(req.body.year) : req.query.year ? parseInt(req.query.year as string) : undefined;
    const batchName = req.body.batch_name || req.query.batch_name || undefined;
    const configWorkingDays = req.body.working_days ? parseInt(req.body.working_days) : req.query.working_days ? parseInt(req.query.working_days as string) : undefined;

    let created = 0;
    const errors: { row: number; error: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        const status = detectBackfilled(record.attendance_date, record.submitted_at);

        // Delete existing daily record for same intern and date to avoid duplication
        await prisma.attendanceRecord.deleteMany({
          where: {
            intern_id: record.intern_id,
            attendance_date: record.attendance_date,
          }
        });

        await prisma.attendanceRecord.create({
          data: {
            intern_id: record.intern_id,
            attendance_date: record.attendance_date,
            submitted_at: record.submitted_at,
            status,
          },
        });
        created++;
      } catch (err: any) {
        errors.push({ row: i + 2, error: err.message || 'Failed to create record' });
      }
    }

    const bulkFlags = detectBulkSubmissions(
      records.map(r => ({
        intern_id: r.intern_id,
        submitted_at: r.submitted_at,
      }))
    );

    // Calculate and upsert summaries
    const summaries = await calculateAndUpsertSummaries(month, year, batchName, configWorkingDays);

    res.json({
      message: `Successfully processed ${created} daily report attendance records`,
      created,
      total_parsed: parsedRecords.length,
      summaries_updated: summaries.length,
      bulk_flags: bulkFlags,
      errors,
    });
  } catch (error: any) {
    console.error('[Attendance] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process attendance file' });
  }
});

// POST /api/attendance/upload-smart-card — Upload Smart Card Attendance Excel
router.post('/upload-smart-card', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[SmartCard] Uploading file:', req.file.originalname);
    const parsedRecords = parseSmartCardExcel(req.file.buffer);

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'No valid records found in smart card file' });
    }

    const errors: { row: number; error: string }[] = [];
    let created = 0;

    for (let i = 0; i < parsedRecords.length; i++) {
      const pr = parsedRecords[i];
      const rowNum = i + 2;

      // Look up intern by p_no
      const intern = await prisma.intern.findFirst({
        where: { p_no: pr.p_no },
      });

      if (!intern) {
        errors.push({
          row: rowNum,
          error: `Intern not found in database for Personal No: "${pr.p_no}"`,
        });
        continue;
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
            in_time: pr.in_time,
            out_time: pr.out_time,
          },
          update: {
            in_time: pr.in_time,
            out_time: pr.out_time,
          }
        });
        created++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || 'Failed to upsert punch record' });
      }
    }

    const month = req.body.month ? parseInt(req.body.month) : req.query.month ? parseInt(req.query.month as string) : undefined;
    const year = req.body.year ? parseInt(req.body.year) : req.query.year ? parseInt(req.query.year as string) : undefined;
    const batchName = req.body.batch_name || req.query.batch_name || undefined;
    const configWorkingDays = req.body.working_days ? parseInt(req.body.working_days) : req.query.working_days ? parseInt(req.query.working_days as string) : undefined;

    // Recalculate summaries based on updated punches
    const summaries = await calculateAndUpsertSummaries(month, year, batchName, configWorkingDays);

    res.json({
      message: `Successfully processed ${created} smart card punch records`,
      created,
      total_parsed: parsedRecords.length,
      summaries_updated: summaries.length,
      errors,
    });
  } catch (error: any) {
    console.error('[SmartCard] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process smart card file' });
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
