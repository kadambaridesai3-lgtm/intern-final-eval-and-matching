import express from 'express';
import multer from 'multer';
import { getPrisma } from '../lib/prisma';
import {
  upsertGuideFeedback,
  getAllGuideFeedbacks,
  getGuideFeedbackByInternId,
  deleteGuideFeedback,
  parseGuideFeedbackExcel,
} from '../services/guideFeedbackService';

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
      discipline,
      learning_ability,
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

    const feedback = await upsertGuideFeedback({
      intern_id,
      review_id: review_id || undefined,
      guide_name,
      discipline: discipline !== undefined ? Number(discipline) : undefined,
      learning_ability: learning_ability !== undefined ? Number(learning_ability) : undefined,
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

// POST /api/guide-feedback/upload — Bulk upload Guide Feedback Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[GuideFeedback] Bulk upload file:', req.file.originalname);
    const parsedRecords = parseGuideFeedbackExcel(req.file.buffer);

    if (parsedRecords.length === 0) {
      return res.status(400).json({ error: 'No valid records found in Excel file' });
    }

    const errors: { row: number; error: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < parsedRecords.length; i++) {
      const record = parsedRecords[i];
      const rowNum = i + 2; // Row index (1-based, plus 1 header offset)

      // Look up intern by p_no or intern_id
      const queryConditions: any[] = [];
      if (record.p_no) queryConditions.push({ p_no: record.p_no });
      if (record.intern_id) queryConditions.push({ intern_id: record.intern_id });

      if (queryConditions.length === 0) {
        errors.push({ row: rowNum, error: 'Row is missing both P No and Intern ID' });
        continue;
      }

      const intern = await prisma.intern.findFirst({
        where: {
          OR: queryConditions,
        },
      });

      if (!intern) {
        const idVal = record.p_no || record.intern_id || 'Unknown';
        errors.push({
          row: rowNum,
          error: `Intern not found in database for identifier: "${idVal}"`,
        });
        continue;
      }

      try {
        await upsertGuideFeedback({
          intern_id: intern.intern_id,
          review_id: req.body.review_id || req.query.review_id || undefined,
          guide_name: req.body.guide_name || req.query.guide_name || undefined,
          task_completion: record.task_completion,
          quality_of_work: record.quality_of_work,
          problem_solving: record.problem_solving,
          initiative_innovation: record.initiative_innovation,
          learning_adaptability: record.learning_adaptability,
          communication: record.communication,
          professionalism_ethics: record.professionalism_ethics,
          respect_authority: record.respect_authority,
          accountability: record.accountability,
          teamwork: record.teamwork,
          conflict_resolution: record.conflict_resolution,
          empathy: record.empathy,
          leadership_potential: record.leadership_potential,
          conflict_handling: record.conflict_handling,
          attendance_punctuality: record.attendance_punctuality,
        });
        successCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: err.message || 'Failed to save record' });
      }
    }

    res.json({
      message: `Processed ${parsedRecords.length} records`,
      created: successCount,
      total_parsed: parsedRecords.length,
      errors,
    });
  } catch (error: any) {
    console.error('[GuideFeedback] Bulk upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process bulk upload file' });
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
