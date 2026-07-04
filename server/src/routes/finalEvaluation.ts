import express from 'express';
import {
  generateAllFinalEvaluations,
  getAllFinalEvaluations,
  getFinalEvaluationByInternId,
  deleteFinalEvaluation,
  createOrUpdateFinalEvaluation,
  updateFinalEvaluation,
} from '../services/finalEvaluationService';

const router = express.Router();

// POST /api/final-evaluation/generate — Generate/refresh all final evaluations
router.post('/generate', async (req, res) => {
  try {
    const reviewId = req.body.review_id || req.query.review_id as string | undefined;
    console.log('[FinalEval] Generate request received for review:', reviewId);
    const evaluations = await generateAllFinalEvaluations(reviewId);
    
    const formatted = evaluations.map(e => ({
      ...e,
      intern_name: e.intern?.full_name || 'Unknown',
    }));

    res.json({
      message: `Generated ${evaluations.length} final evaluations`,
      count: evaluations.length,
      evaluations: formatted,
    });
  } catch (error: any) {
    console.error('[FinalEval] Generate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate final evaluations' });
  }
});

// GET /api/final-evaluation — List all final evaluations
router.get('/', async (req, res) => {
  try {
    const reviewId = req.query.review_id as string | undefined;
    const evaluations = await getAllFinalEvaluations(reviewId);
    const formatted = evaluations.map(e => ({
      ...e,
      intern_name: e.intern?.full_name || 'Unknown',
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch final evaluations' });
  }
});

// POST /api/final-evaluation — Create/upsert final evaluation
router.post('/', async (req, res) => {
  try {
    const { p_no, attendance_score, guide_score, project_score, remarks, review_id } = req.body;
    if (!p_no) {
      return res.status(400).json({ error: 'P No is required' });
    }
    if (attendance_score === undefined || attendance_score === null) {
      return res.status(400).json({ error: 'Attendance score is required' });
    }
    if (guide_score === undefined || guide_score === null) {
      return res.status(400).json({ error: 'Guide score is required' });
    }

    const evaluation = await createOrUpdateFinalEvaluation({
      p_no,
      attendance_score: Number(attendance_score),
      guide_score: Number(guide_score),
      project_score: project_score !== undefined && project_score !== null && project_score !== '' ? Number(project_score) : null,
      remarks: remarks ?? '',
      review_id: review_id || null,
    });

    res.status(201).json(evaluation);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to create final evaluation' });
  }
});

// GET /api/final-evaluation/:internId — Single intern evaluation
router.get('/:internId', async (req, res) => {
  try {
    const reviewId = req.query.review_id as string | undefined;
    const evaluation = await getFinalEvaluationByInternId(req.params.internId, reviewId);
    if (!evaluation) {
      return res.status(404).json({ error: 'No final evaluation found for this intern' });
    }
    const formatted = {
      ...evaluation,
      intern_name: evaluation.intern?.full_name || 'Unknown',
    };
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch final evaluation' });
  }
});

// PUT /api/final-evaluation/:internId — Update final evaluation
router.put('/:internId', async (req, res) => {
  try {
    const { attendance_score, guide_score, project_score, remarks, review_id } = req.body;
    if (attendance_score === undefined || attendance_score === null) {
      return res.status(400).json({ error: 'Attendance score is required' });
    }
    if (guide_score === undefined || guide_score === null) {
      return res.status(400).json({ error: 'Guide score is required' });
    }

    const evaluation = await updateFinalEvaluation(req.params.internId, {
      attendance_score: Number(attendance_score),
      guide_score: Number(guide_score),
      project_score: project_score !== undefined && project_score !== null && project_score !== '' ? Number(project_score) : null,
      remarks: remarks ?? '',
      review_id: review_id || null,
    });

    res.json(evaluation);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to update final evaluation' });
  }
});

// DELETE /api/final-evaluation/:internId — Delete evaluation
router.delete('/:internId', async (req, res) => {
  try {
    const reviewId = req.query.review_id as string | undefined;
    await deleteFinalEvaluation(req.params.internId, reviewId);
    res.json({ message: 'Final evaluation deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete final evaluation' });
  }
});

export default router;
