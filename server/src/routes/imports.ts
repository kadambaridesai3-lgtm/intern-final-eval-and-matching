import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { getPrisma } from '../lib/prisma';
import { toStoredStringArray } from '../utils/stringArray';
import { generateNextInternId } from '../utils/internId';
import { generateAllFinalEvaluations } from '../services/finalEvaluationService';
import { writeTempFile, deleteTempFile } from '../utils/tempFile';
import { parseDateSafe } from '../services/attendanceService';
import { cleanPNo, validateExcelHeaders, toText, toNumber } from '../utils/excel';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const EXPECTED_HEADERS = [
  'P No',
  'Candidate Name',
  'Guide Name',
  'Department',
  'College',
  'Branch',
  'Qualification',
  'Intern Type',
  'Project Required',
  'Project Title',
  'Project Domain',
  'Date of Joining',
  'Date of Leaving',
  'Duration (Months)',
  'Status',
  'Remarks'
];

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
    let headers: string[] = [];
    try {
      const workbook = XLSX.readFile(tempPath, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // Get all headers from row 1
      const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
      headers = (headerRow || []).map(h => String(h || '').trim());

      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (err: any) {
      if (err.code === 'EBUSY' || err.message?.includes('busy') || err.message?.includes('lock')) {
        return res.status(400).json({ error: 'The uploaded Excel file is locked or open in another program. Please close it and try again.' });
      }
      return res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
    }

    // ── Header Validation ──
    const headerError = validateExcelHeaders(headers, EXPECTED_HEADERS);
    if (headerError) {
      return res.status(400).json({ error: headerError });
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

      // Read cells matching standard columns exactly
      const p_no = cleanPNo(row['P No']);
      const full_name = toText(row['Candidate Name']);
      const excelGuideName = toText(row['Guide Name']);
      const department = toText(row['Department']);
      const college = toText(row['College']);
      const branch = toText(row['Branch']);
      const intern_type = toText(row['Intern Type']) || toText(row['Qualification']) || 'B.Tech';
      const project_required = toText(row['Project Required']) || 'Yes';
      const project_title = toText(row['Project Title']) || null;
      const preferred_domain = toText(row['Project Domain']) || '';
      const rawStartDate = row['Date of Joining'];
      const rawEndDate = row['Date of Leaving'];
      const duration_months = toNumber(row['Duration (Months)'], 3);
      const importStatus = toText(row['Status']);
      const remarks = toText(row['Remarks']);

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
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Candidate Name is blank` });
      }
      if (!department) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Department is blank` });
      }
      if (!excelGuideName) {
        warnings.push({ row: rowNumber, warning: `Row ${rowNumber}: Guide Name is blank` });
      }

      try {
        let assignedGuideId: string | null = null;

        if (excelGuideName) {
          let guide = await prisma.guide.findFirst({
            where: {
              full_name: excelGuideName.trim()
            },
          });

          if (!guide) {
            guide = await prisma.guide.create({
              data: {
                full_name: excelGuideName.trim(),
                p_no: null,
                department: department || 'Imported',
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

        let status = importStatus || 'Waitlisted';
        if (!importStatus) {
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
              p_no: p_no.trim(),
              college: college ?? '',
              branch: branch ?? '',
              department: department ?? '',
              graduation_year: new Date(start_date).getFullYear(),
              cgpa: 0,
              skills: '',
              preferred_domain: preferred_domain ?? '',
              start_date,
              duration_months: Number(duration_months ?? 3),
              end_date,
              status,
              assigned_guide_id: assignedGuideId,
              project_required: project_required || 'Yes',
              Project_title: project_title,
              Project_details: preferred_domain,
            },
          });
        } else {
          const nextInternId = await generateNextInternId();
          intern = await prisma.intern.create({
            data: {
              intern_id: nextInternId,
              full_name,
              phone: '', // standard columns don't have phone
              p_no: p_no.trim(),
              intern_type,
              college: college ?? '',
              branch: branch ?? '',
              department: department ?? '',
              graduation_year: new Date(start_date).getFullYear(),
              cgpa: 0,
              skills: '',
              preferred_domain: preferred_domain ?? '',
              start_date,
              duration_months: Number(duration_months ?? 3),
              end_date,
              status,
              assigned_guide_id: assignedGuideId,
              project_required: project_required || 'Yes',
              Project_title: project_title,
              Project_details: preferred_domain,
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
