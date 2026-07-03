import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { getPrisma } from '../lib/prisma';
import { parseStringArray, toStoredStringArray } from '../utils/stringArray';
import { generateNextInternId } from '../utils/internId';
import { generateAllFinalEvaluations } from '../services/finalEvaluationService';
import { writeTempFile, deleteTempFile } from '../utils/tempFile';
import { parseDateSafe } from '../services/attendanceService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function pickCell(row: Record<string, unknown>, keys: string[]) {
  const rowKeys = Object.keys(row);
  const matchKey = rowKeys.find(k => 
    keys.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
  return matchKey ? row[matchKey] : '';
}

function toText(value: unknown) {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toNumber(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// POST /api/interns/import
router.post('/', upload.single('file'), async (req, res) => {
  let tempPath = '';
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log('[Intern Master] Uploading file:', req.file.originalname);

    try {
      tempPath = writeTempFile(req.file.buffer, req.file.originalname);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to write temporary file: ' + err.message });
    }

    let rows: any[];
    try {
      const workbook = XLSX.readFile(tempPath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (err: any) {
      if (err.code === 'EBUSY' || err.message?.includes('busy') || err.message?.includes('lock')) {
        return res.status(400).json({ error: 'The uploaded Excel file is locked or open in another program. Please close it and try again.' });
      }
      return res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
    }

    const prisma = getPrisma();
    const created: string[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    const warnings: Array<{ row: number; warning: string }> = [];
    const seenPnos = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // header row assumed at 1

      // Skip completely empty rows
      const isEmptyRow = Object.values(row).every(val => val === undefined || val === null || String(val).trim() === '');
      if (isEmptyRow) {
        continue;
      }

      const full_name = toText(pickCell(row, ['full_name', 'Full Name', 'Name']));
      const phone = toText(pickCell(row, ['phone', 'Phone'])) || '';
      const p_no = toText(pickCell(row, ['P.no', 'P No', 'PNo', 'p_no', 'pNo', 'P.No.'])).trim();

      const intern_type = toText(pickCell(row, ['intern_type', 'Bachelor Degree Type', 'Type'])) || 'B.Tech';
      const college = toText(pickCell(row, ['college', 'College'])) || '';
      const branch = toText(pickCell(row, ['Bachelor Stream', 'Branch', 'Stream'])) || '';
      const department = toText(pickCell(row, ['Department Name', 'department', 'Department'])) || '';
      const graduation_year = toNumber(pickCell(row, ['graduation_year', 'Graduation Year']), new Date().getFullYear());
      const rawCgpa = pickCell(row, ['cgpa', 'CGPA', 'Bachelor Percentage']);
      const cgpa = rawCgpa ? Number(String(rawCgpa).replace('%', '').replace(',', '.').trim()) : 0.0;
      const skills = parseStringArray(pickCell(row, ['skills', 'Skills']) || '');
      const preferred_domain = toText(pickCell(row, ['preferred_domain', 'Preferred Domain'])) || '';
      
      const rawStartDate = pickCell(row, ['start_date', 'Start Date', 'DOJ']);
      const rawEndDate = pickCell(row, ['end_date', 'End Date', 'DOL']);
      
      const duration_months = toNumber(pickCell(row, ['duration_months', 'Duration Months']), 3);
      const excelGuideName = toText(pickCell(row, ['Guide Name']));
      const excelGuidePNo = toText(pickCell(row, ['Guide P No', 'Guide PNo', 'Guide_PNo', 'Guide P.No']));
      const project_required = toText(pickCell(row, ['Project Required', 'project_required', 'ProjectRequired'])) || 'Yes';

      // ── Validations ──
      if (!p_no) {
        errors.push({ row: rowNumber, error: `Row ${rowNumber}: P No is missing.` });
        continue;
      }
      if (seenPnos.has(p_no)) {
        errors.push({ row: rowNumber, error: `Row ${rowNumber}: Duplicate P No ${p_no} in the uploaded file.` });
        continue;
      }
      seenPnos.add(p_no);

      // Validate dates only if they are not empty (blank is accepted)
      let start_date = new Date();
      if (rawStartDate !== undefined && rawStartDate !== null && String(rawStartDate).trim() !== '') {
        const parsed = parseDateSafe(rawStartDate);
        if (!parsed) {
          errors.push({ row: rowNumber, error: `Row ${rowNumber}: Start Date is invalid.` });
          continue;
        }
        start_date = parsed;
      }

      let end_date = new Date(new Date(start_date).setMonth(start_date.getMonth() + duration_months));
      if (rawEndDate !== undefined && rawEndDate !== null && String(rawEndDate).trim() !== '') {
        const parsed = parseDateSafe(rawEndDate);
        if (!parsed) {
          errors.push({ row: rowNumber, error: `Row ${rowNumber}: End Date is invalid.` });
          continue;
        }
        end_date = parsed;
      }

      // Collect warnings for optional blank fields
      if (!full_name) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Full Name is blank` });
      }
      if (!department) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Department is blank` });
      }
      if (!excelGuideName) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Guide Name is blank` });
      }
      if (!preferred_domain) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Preferred Domain is blank` });
      }
      if (!phone) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Mobile number is blank` });
      }

      try {
        let assignedGuideId: string | null = null;

        if (excelGuideName) {
          let guide = null;
          if (excelGuidePNo) {
            guide = await prisma.guide.findFirst({
              where: {
                p_no: excelGuidePNo.trim(),
              },
            });
          }

          if (!guide && excelGuideName) {
            guide = await prisma.guide.findFirst({
              where: {
                full_name: excelGuideName.trim()
              },
            });
          }

          if (!guide) {
            guide = await prisma.guide.create({
              data: {
                full_name: excelGuideName.trim(),
                p_no: excelGuidePNo || null,
                department: 'Imported',
                expertise_domains: '',
                required_skills: '',
                preferred_intern_types: '',
                max_capacity: 20,
                is_complete: true,
              },
            });
          }

          assignedGuideId = guide.id;
        }

        const today = new Date();

        await prisma.intern.updateMany({
          where: {
            assigned_guide_id: null,
            end_date: {
              lt: today,
            },
          },
          data: {
            status: 'Left',
          },
        });

        let status = 'Waitlisted';
        if (!assignedGuideId && today > end_date) {
          status = 'Left';
        } else if (today < start_date) {
          status = 'YetToJoin';
        } else if (assignedGuideId) {
          if (today > end_date) {
            status = 'Completed';
          } else {
            status = 'Allotted';
          }
        }

        let existingIntern = await prisma.intern.findFirst({
          where: {
            p_no: p_no.trim(),
          },
        });

        let intern;

        if (existingIntern) {
          intern = await prisma.intern.update({
            where: {
              id: existingIntern.id,
            },
            data: {
              full_name,
              phone: phone ?? '',
              p_no: p_no.trim(),
              college: college ?? '',
              branch: branch ?? '',
              department: department ?? '',
              graduation_year: Number(graduation_year ?? new Date().getFullYear()),
              cgpa: Number(cgpa ?? 0),
              skills: toStoredStringArray(skills),
              preferred_domain: preferred_domain ?? '',
              start_date,
              duration_months: Number(duration_months ?? 3),
              end_date,
              status,
              assigned_guide_id: assignedGuideId,
              project_required: project_required || 'Yes',
            },
          });
        } else {
          const nextInternId = await generateNextInternId();
          intern = await prisma.intern.create({
            data: {
              intern_id: nextInternId,
              full_name,
              phone: phone ?? '',
              p_no: p_no.trim(),
              intern_type,
              college: college ?? '',
              branch: branch ?? '',
              department: department ?? '',
              graduation_year: Number(graduation_year ?? new Date().getFullYear()),
              cgpa: Number(cgpa ?? 0),
              skills: toStoredStringArray(skills),
              preferred_domain: preferred_domain ?? '',
              start_date,
              duration_months: Number(duration_months ?? 3),
              end_date,
              status,
              assigned_guide_id: assignedGuideId,
              project_required: project_required || 'Yes',
            },
          });
        }
        created.push(intern.id);
      } catch (err: unknown) {
        console.error('Row import error', err);
        errors.push({ row: rowNumber, error: (err as Error).message || 'Import failed' });
      }
    }

    // Call generateAllFinalEvaluations to update final evaluations after master import
    await generateAllFinalEvaluations();

    try {
      await prisma.uploadHistory.create({
        data: {
          file_name: req.file.originalname,
          records_imported: created.length,
          status: errors.length > 0 ? 'Failed' : (warnings.length > 0 ? 'Warnings' : 'Success'),
          module: 'Intern Master',
          uploaded_by: 'HR Admin'
        }
      });
    } catch (dbErr) {
      console.error('Failed to save import history', dbErr);
    }

    res.json({ created: created.length, created_ids: created, errors, warnings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import file' });
  } finally {
    if (tempPath) deleteTempFile(tempPath);
  }
});

export default router;
