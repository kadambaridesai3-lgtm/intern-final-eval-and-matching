import express from 'express';
import {
  generateAllFinalEvaluations,
  getAllFinalEvaluations,
  getFinalEvaluationByInternId,
  deleteFinalEvaluation,
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
