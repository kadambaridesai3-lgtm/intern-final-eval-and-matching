import express from 'express';
import multer from 'multer';
import { getPrisma } from '../lib/prisma';
import {
  upsertGuideFeedback,
  getAllGuideFeedbacks,
  getGuideFeedbackByInternId,
  deleteGuideFeedback,
  parseGuideFeedbackExcel,
  generateSampleExcel,
} from '../services/guideFeedbackService';
import { generateAllFinalEvaluations } from '../services/finalEvaluationService';
import { writeTempFile, deleteTempFile } from '../utils/tempFile';

const router = express.Router();
const prisma = getPrisma();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/guide-feedback — Submit/update guide feedback manually
router.post('/', async (req, res) => {
  try {
    const {
      intern_id,
      review_id,
      guide_name,
      department,
      teamwork,
      communication,
      task_completion,
      quality_of_work,
      problem_solving,
      initiative_innovation,
      learning_adaptability,
      attendance_punctuality,
      professionalism_ethics,
      respect_authority,
      accountability,
      conflict_resolution,
      empathy,
      leadership_potential,
      conflict_handling,
    } = req.body;

    if (!intern_id) {
      return res.status(400).json({ error: 'intern_id is required' });
    }

    if (!guide_name || guide_name.trim() === '') {
      return res.status(400).json({ error: 'Guide Name is required.' });
    }

    if (!department || department.trim() === '') {
      return res.status(400).json({ error: 'Department is required.' });
    }

    const scoreFields = [
      'task_completion', 'quality_of_work', 'problem_solving', 'initiative_innovation', 'learning_adaptability',
      'attendance_punctuality', 'communication', 'professionalism_ethics', 'respect_authority', 'accountability',
      'teamwork', 'conflict_resolution', 'empathy', 'leadership_potential', 'conflict_handling'
    ];
    for (const field of scoreFields) {
      const score = req.body[field];
      if (score === undefined || score === null || score === '') {
        return res.status(400).json({ error: `Score for ${field} is missing.` });
      }
      const num = Number(score);
      if (isNaN(num) || num < 1 || num > 5) {
        return res.status(400).json({ error: `Score for ${field} must be between 1 and 5.` });
      }
    }

    const feedback = await upsertGuideFeedback({
      intern_id,
      review_id: review_id || undefined,
      guide_name,
      department,
      teamwork: Number(teamwork),
      communication: Number(communication),
      task_completion: Number(task_completion),
      quality_of_work: quality_of_work !== undefined ? Number(quality_of_work) : undefined,
      problem_solving: problem_solving !== undefined ? Number(problem_solving) : undefined,
      initiative_innovation: initiative_innovation !== undefined ? Number(initiative_innovation) : undefined,
      learning_adaptability: learning_adaptability !== undefined ? Number(learning_adaptability) : undefined,
      attendance_punctuality: attendance_punctuality !== undefined ? Number(attendance_punctuality) : undefined,
      professionalism_ethics: professionalism_ethics !== undefined ? Number(professionalism_ethics) : undefined,
      respect_authority: respect_authority !== undefined ? Number(respect_authority) : undefined,
      accountability: accountability !== undefined ? Number(accountability) : undefined,
      conflict_resolution: conflict_resolution !== undefined ? Number(conflict_resolution) : undefined,
      empathy: empathy !== undefined ? Number(empathy) : undefined,
      leadership_potential: leadership_potential !== undefined ? Number(leadership_potential) : undefined,
      conflict_handling: conflict_handling !== undefined ? Number(conflict_handling) : undefined,
    });

    res.json(feedback);
  } catch (error: any) {
    console.error('[GuideFeedback] Error:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: `Intern with ID "${req.body.intern_id}" does not exist in the database.` });
    }
    res.status(500).json({ error: error.message || 'Failed to submit guide feedback' });
  }
});

// PUT /api/guide-feedback/:id — Update existing guide feedback record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      guide_name,
      department,
      task_completion,
      quality_of_work,
      problem_solving,
      initiative_innovation,
      learning_adaptability,
      attendance_punctuality,
      communication,
      professionalism_ethics,
      respect_authority,
      accountability,
      teamwork,
      conflict_resolution,
      empathy,
      leadership_potential,
      conflict_handling,
    } = req.body;

    const existing = await prisma.guideFeedback.findUnique({
      where: { id }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Guide feedback record not found.' });
    }

    if (guide_name !== undefined && (!guide_name || guide_name.trim() === '')) {
      return res.status(400).json({ error: 'Guide Name is required.' });
    }
    if (department !== undefined && (!department || department.trim() === '')) {
      return res.status(400).json({ error: 'Department is required.' });
    }

    const scoreFields = [
      'task_completion', 'quality_of_work', 'problem_solving', 'initiative_innovation', 'learning_adaptability',
      'attendance_punctuality', 'communication', 'professionalism_ethics', 'respect_authority', 'accountability',
      'teamwork', 'conflict_resolution', 'empathy', 'leadership_potential', 'conflict_handling'
    ];
    for (const field of scoreFields) {
      const score = req.body[field];
      if (score !== undefined) {
        if (score === null || score === '') {
          return res.status(400).json({ error: `Score for ${field} is missing.` });
        }
        const num = Number(score);
        if (isNaN(num) || num < 1 || num > 5) {
          return res.status(400).json({ error: `Score for ${field} must be between 1 and 5.` });
        }
      }
    }

    const feedback = await upsertGuideFeedback({
      intern_id: existing.intern_id,
      review_id: existing.review_id || undefined,
      guide_name: guide_name !== undefined ? guide_name : existing.guide_name,
      department: department !== undefined ? department : existing.department,
      task_completion: task_completion !== undefined ? Number(task_completion) : existing.task_completion,
      quality_of_work: quality_of_work !== undefined ? Number(quality_of_work) : existing.quality_of_work,
      problem_solving: problem_solving !== undefined ? Number(problem_solving) : existing.problem_solving,
      initiative_innovation: initiative_innovation !== undefined ? Number(initiative_innovation) : existing.initiative_innovation,
      learning_adaptability: learning_adaptability !== undefined ? Number(learning_adaptability) : existing.learning_adaptability,
      attendance_punctuality: attendance_punctuality !== undefined ? Number(attendance_punctuality) : existing.attendance_punctuality,
      communication: communication !== undefined ? Number(communication) : existing.communication,
      professionalism_ethics: professionalism_ethics !== undefined ? Number(professionalism_ethics) : existing.professionalism_ethics,
      respect_authority: respect_authority !== undefined ? Number(respect_authority) : existing.respect_authority,
      accountability: accountability !== undefined ? Number(accountability) : existing.accountability,
      teamwork: teamwork !== undefined ? Number(teamwork) : existing.teamwork,
      conflict_resolution: conflict_resolution !== undefined ? Number(conflict_resolution) : existing.conflict_resolution,
      empathy: empathy !== undefined ? Number(empathy) : existing.empathy,
      leadership_potential: leadership_potential !== undefined ? Number(leadership_potential) : existing.leadership_potential,
      conflict_handling: conflict_handling !== undefined ? Number(conflict_handling) : existing.conflict_handling,
    });

    // Recalculate final evaluations
    await generateAllFinalEvaluations();

    res.json(feedback);
  } catch (error: any) {
    console.error('[GuideFeedback] Error updating:', error);
    res.status(500).json({ error: error.message || 'Failed to update guide feedback' });
  }
});

// GET /api/guide-feedback/sample — Download sample Excel file
router.get('/sample', async (_req, res) => {
  try {
    const buffer = generateSampleExcel();
    res.setHeader('Content-Disposition', 'attachment; filename="Guide_Feedback_Sample_Format.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error: any) {
    console.error('[GuideFeedback] Sample download error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate sample file' });
  }
});

// POST /api/guide-feedback/upload — Bulk upload Guide Feedback Excel (Tata Motors format)
router.post('/upload', upload.single('file'), async (req, res) => {
  let tempPath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[GuideFeedback] Bulk upload file:', req.file.originalname);
    
    // Save to temp file to handle file locks and permissions
    try {
      tempPath = writeTempFile(req.file.buffer, req.file.originalname);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to write temporary file: ' + err.message });
    }

    let parsedRecords;
    try {
      parsedRecords = parseGuideFeedbackExcel(tempPath);
    } catch (err: any) {
      // Excel File Lock check
      if (err.code === 'EBUSY' || err.message?.includes('busy') || err.message?.includes('lock')) {
        return res.status(400).json({ error: 'The uploaded Excel file is locked or open in another program. Please close it and try again.' });
      }
      return res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
    }

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'No records found in Excel file. Ensure the file has P.No column.' });
    }

    const errors: { row: number; error: string }[] = [];
    const warnings: { row: number; warning: string }[] = [];
    let successCount = 0;
    const seenPnos = new Set<string>();

    for (let i = 0; i < parsedRecords.length; i++) {
      const record = parsedRecords[i];
      const rowNum = record.rowNum;

      if (!record.p_no) {
        errors.push({ row: rowNum, error: `Row ${rowNum} : P.No is empty` });
        continue;
      }

      if (seenPnos.has(record.p_no)) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum} : Duplicate Guide Feedback entry for P.No ${record.p_no} in file` });
        continue;
      }
      seenPnos.add(record.p_no);

      // Validate Q5-Q19 scores
      let scoreErrorFound = false;
      for (let q = 5; q <= 19; q++) {
        const score = record.scores[`Q${q}`];
        if (score === null || score === undefined) {
          warnings.push({ row: rowNum, warning: `Row ${rowNum} : Q${q} Score is blank` });
          continue; // blank cell accepted, defaults to 0
        }
        if (score < 0) {
          errors.push({ row: rowNum, error: `Row ${rowNum} : Q${q} Score cannot be negative` });
          scoreErrorFound = true;
          break;
        }
        if (score > 5) {
          errors.push({ row: rowNum, error: `Row ${rowNum} : Q${q} Score cannot exceed 5` });
          scoreErrorFound = true;
          break;
        }
      }

      if (scoreErrorFound) continue;

      // Match intern ONLY by P.No
      const intern = await prisma.intern.findFirst({
        where: { p_no: record.p_no },
      });

      if (!intern) {
        warnings.push({
          row: rowNum,
          warning: `Row ${rowNum} : P.No ${record.p_no} not found in Intern database`,
        });
        continue;
      }

      if (!record.guide_name) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum} : Guide Name is blank` });
      }
      if (!record.department) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum} : Department is blank` });
      }

      try {
        await upsertGuideFeedback({
          intern_id: intern.intern_id,
          review_id: req.body.review_id || req.query.review_id as string || undefined,
          guide_name: record.guide_name || undefined,
          department: record.department || undefined,
          task_completion: record.scores['Q5'] ?? 0,
          quality_of_work: record.scores['Q6'] ?? 0,
          problem_solving: record.scores['Q7'] ?? 0,
          initiative_innovation: record.scores['Q8'] ?? 0,
          learning_adaptability: record.scores['Q9'] ?? 0,
          attendance_punctuality: record.scores['Q10'] ?? 0,
          communication: record.scores['Q11'] ?? 0,
          professionalism_ethics: record.scores['Q12'] ?? 0,
          respect_authority: record.scores['Q13'] ?? 0,
          accountability: record.scores['Q14'] ?? 0,
          teamwork: record.scores['Q15'] ?? 0,
          conflict_resolution: record.scores['Q16'] ?? 0,
          empathy: record.scores['Q17'] ?? 0,
          leadership_potential: record.scores['Q18'] ?? 0,
          conflict_handling: record.scores['Q19'] ?? 0,
        });
        successCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: `Row ${rowNum} : ${err.message || 'Failed to save record'}` });
      }
    }

    // Recalculate final evaluations so guide scores flow into Final Evaluation
    await generateAllFinalEvaluations();

    try {
      await prisma.uploadHistory.create({
        data: {
          file_name: req.file.originalname,
          records_imported: successCount,
          status: errors.length > 0 ? 'Failed' : (warnings.length > 0 ? 'Warnings' : 'Success'),
          module: 'Guide Feedback',
          uploaded_by: 'HR Admin'
        }
      });
    } catch (dbErr) {
      console.error('Failed to log guide feedback upload history', dbErr);
    }

    res.json({
      message: `Processed ${parsedRecords.length} records`,
      total_parsed: parsedRecords.length,
      created: successCount,
      failed: parsedRecords.length - successCount,
      errors,
      warnings,
    });
  } catch (error: any) {
    console.error('[GuideFeedback] Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process bulk upload file' });
  } finally {
    if (tempPath) deleteTempFile(tempPath);
  }
});
// GET /api/guide-feedback — List all guide feedbacks
router.get('/', async (req, res) => {
  try {
    const reviewId = req.query.review_id as string | undefined;
    const feedbacks = await getAllGuideFeedbacks(reviewId);
    const formatted = feedbacks.map(f => ({
      ...f,
      intern_name: f.intern?.full_name || 'Unknown',
      p_no: f.intern?.p_no || '',
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch guide feedbacks' });
  }
});

// GET /api/guide-feedback/:internId — Single intern feedback
router.get('/:internId', async (req, res) => {
  try {
    const reviewId = req.query.review_id as string | undefined;
    const feedback = await getGuideFeedbackByInternId(req.params.internId, reviewId);
    if (!feedback) {
      return res.status(404).json({ error: 'No guide feedback found for this intern' });
    }
    const formatted = {
      ...feedback,
      intern_name: feedback.intern?.full_name || 'Unknown',
      p_no: feedback.intern?.p_no || '',
    };
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch guide feedback' });
  }
});

// DELETE /api/guide-feedback/:internId — Delete feedback
router.delete('/:internId', async (req, res) => {
  try {
    const reviewId = req.query.review_id as string | undefined;
    await deleteGuideFeedback(req.params.internId, reviewId);
    res.json({ message: 'Guide feedback deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete guide feedback' });
  }
});

export default router;
