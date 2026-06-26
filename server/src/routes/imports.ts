import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { getPrisma } from '../lib/prisma';
import { parseStringArray, toStoredStringArray } from '../utils/stringArray';
import { generateNextInternId } from '../utils/internId';
import { rankGuides } from '../utils/matching';
import { loadGuides as loadGuidesFromInterns } from './interns';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function pickCell(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
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

function toDate(value: unknown, fallback: Date) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    return fallback;
  }

  const text = String(value).trim();
  const parsedDate = new Date(text);
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate;

  return fallback;
}

// POST /api/interns/import
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const prisma = getPrisma();
    //const guides = await loadGuidesFromInterns();

    const created: string[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // header row assumed at 1

      const full_name = toText(pickCell(row, ['full_name', 'Full Name', 'Name']));
      //const email = toText(pickCell(row, ['email', 'Email']));
      const phone = toText(pickCell(row, ['phone', 'Phone']));
      const p_no = toText(pickCell(row, ['P.no', 'P No']));
      console.log('P No:', p_no);
      const intern_type = toText(pickCell(row, ['intern_type', 'Bachelor Degree Type','Type']));
      const college = toText(pickCell(row, ['college', 'College']));
      const branch = toText(pickCell(row, ['Bachelor Stream', 'Branch','Stream']));
      const department = toText(pickCell(row, ['Department Name']));
      const graduation_year = toNumber(pickCell(row, ['graduation_year', 'Graduation Year']), new Date().getFullYear());
      const rawCgpa = pickCell(row, [
  'cgpa',
  'CGPA',
  'Bachelor Percentage',
]);

console.log('RAW CGPA:', rawCgpa);

const cgpa = Number(
  String(rawCgpa)
    .replace('%', '')
    .replace(',', '.')
    .trim()
);

//console.log('PARSED CGPA:', cgpa);
      const skills = parseStringArray(pickCell(row, ['skills', 'Skills']));
      const preferred_domain = toText(pickCell(row, ['preferred_domain', 'Preferred Domain']));
      const start_date = toDate(pickCell(row, ['start_date', 'Start Date','DOJ']), new Date());
      const duration_months = toNumber(pickCell(row, ['duration_months', 'Duration Months']), 3);
      const end_date = toDate(pickCell(row, ['end_date', 'End Date','DOL']), new Date());
      const excelGuideName = toText(pickCell(row, ['Guide Name']));
      const excelGuidePNo = toText(pickCell(row, ['Guide P No','Guide PNo', 'Guide_PNo','Guide P.No']));
      // if(!cgpa) {
      //   errors.push({ row: rowNumber, error: 'CGPA is required' });
      //   continue;
      // }
      if (!full_name) {
        errors.push({ row: rowNumber, error: 'full_name is required' });
        continue;
      }
      if(!intern_type)
      {
        errors.push({ row: rowNumber, error: 'intern_type is required' });
        continue;
      }
      if(!branch)
      {
        errors.push({ row: rowNumber, error: 'branch is required' });
        continue;
      }
      if(!p_no && start_date <= new Date())
      {
        errors.push({ row: rowNumber, error: 'P No is required' });
        continue;
      }
      try {
        const internInput = {
          skills,
          branch,
          preferred_domain,
          cgpa,
          intern_type,
        };

        // const ranked = rankGuides(internInput as any, guides as any);
        // const topMatch = ranked[0] ?? null;

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
      full_name:  excelGuideName.trim()
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

    console.log('Created Guide:', guide.full_name);
  }

  assignedGuideId = guide.id;
}
const today = new Date();

// Left = never assigned + internship period already over
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
if(!assignedGuideId && today > end_date) {
  status = 'Left';
}

else if (today < start_date) {
  status = 'YetToJoin';
}
else if (assignedGuideId) {
  if (today > end_date) {
    status = 'Completed';
  }
  else {
    status = 'Allotted';
  }
}
        let existingIntern = null;

if (p_no && p_no.trim() !== '') {

  // const latestIntern = await prisma.intern.findFirst({
  //   where: {
  //     p_no: p_no.trim(),
  //   },
  //   orderBy: {
  //     end_date: 'desc',
  //   },
  // });

  // if (latestIntern) {

  //   // Update only if internships overlap
  //   if (start_date <= latestIntern.end_date) {
  //     existingIntern = latestIntern;
  //   }

  //   // If new internship starts after previous ended,
  //   // existingIntern stays null
  //   // and a NEW record will be created
  // }
  const existingInterns = await prisma.intern.findMany({
  where: {
    p_no: p_no.trim(),
  },
});

existingIntern =
  existingInterns.find(
    (intern) =>
      start_date <= intern.end_date &&
      end_date >= intern.start_date
  ) ?? null;

} else {

  existingIntern = await prisma.intern.findFirst({
    where: {
      full_name,
      start_date,
    },
  });

}      // const intern = await prisma.intern.create({
        //   data: {
        //     full_name,
        //     //email,
        //     phone: phone ?? '',
        //     p_no: p_no ?? '',
        //     intern_type,
        //     college: college ?? '',
        //     branch: branch ?? '',
        //     graduation_year: Number(graduation_year ?? new Date().getFullYear()),
        //     cgpa: Number(cgpa ?? 0),
        //     skills: toStoredStringArray(skills),
        //     preferred_domain: preferred_domain ?? '',
        //     start_date,
        //     duration_months: Number(duration_months ?? 3),
        //     end_date,
        //     status,
        //     assigned_guide_id: assignedGuideId,
        //   },
        // });
        let intern;

if (existingIntern) {
  intern = await prisma.intern.update({
    where: {
      id: existingIntern.id,
    },
    data: {
      full_name,
      phone: phone ?? '',
      p_no : p_no && p_no.trim()!=='' ?
      p_no.trim():null,
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
    },
  });
} else {
  const nextInternId = await generateNextInternId();
  intern = await prisma.intern.create({
    data: {
      intern_id: nextInternId,
      full_name,
      phone: phone ?? '',
      p_no : p_no && p_no.trim()!=='' ?
      p_no.trim():null,
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
    },
  });
}
        created.push(intern.id);
      } catch (err: unknown) {
        console.error('Row import error', err);
        errors.push({ row: rowNumber, error: (err as Error).message || 'Import failed' });
      }
    }

    res.json({ created: created.length, created_ids: created, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import file' });
  }
});

export default router;
