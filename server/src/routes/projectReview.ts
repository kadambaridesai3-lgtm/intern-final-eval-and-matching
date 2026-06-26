import express from 'express';
import { getPrisma } from '../lib/prisma';
import {
  calculateHRScore,
  calculateAnalyticalPenalty,
  calculatePeerAverage,
  calculatePresentationScore,
  calculateTotalPenaltyForPresenter,
  calculateFinalScore,
  upsertFinalResult,
  updateAllFinalResultsForReview,
  getFinalResult,
  getFinalResultsForReview,
  generateLeaderboardFromFinalResults,
  deleteFinalResultsForReview,
  getReviewSummary
} from '../services/projectReviewService';

const router = express.Router();
const prisma = getPrisma();

/**
 * Create Project Review
 * POST /api/Project-review/create
 */
router.post('/create', async (req, res) => {
  try {
    const { title, batch_name, review_date } = req.body;

    const review = await prisma.projectReview.create({
      data: {
        title,
        batch_name,
        review_date: new Date(review_date),
      },
    });

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * Get All Project Reviews
 * GET /api/Project-review
 */
router.get('/', async (_req, res) => {
  try {
    const reviews = await prisma.projectReview.findMany({
      orderBy: { created_at: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * Get Review Details with Evaluations
 * GET /api/Project-review/:reviewId
 */
router.get('/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.projectReview.findUnique({
      where: { id: reviewId },
      include: {
        evaluations: true,
        finalResults: {
          orderBy: { final_score: 'desc' }
        }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

/**
 * Submit Evaluation (HR or Peer)
 * POST /api/Project-review/evaluation
 *
 * After each evaluation is submitted:
 * 1. Calculate HR score if it's an HR evaluation
 * 2. Upsert final result to ensure only ONE record per presenter
 * 3. Return the updated final result
 */
router.post('/evaluation', async (req, res) => {
  try {
    const {
      review_id,
      presenter_id,
      presenter_name,
      evaluator_id,
      is_hr,
      technical,
      communication,
      confidence,
      understanding,
      problem_solving,
      innovation,
      documentation,
      qa_handling,
      presentation,
      overall
    } = req.body;

    // Validate input
    if (!review_id || !presenter_id || !evaluator_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total marks
    const total_marks =
      technical +
      communication +
      confidence +
      understanding +
      problem_solving +
      innovation +
      documentation +
      qa_handling +
      presentation +
      overall;

    // Create evaluation record
    const evaluation = await prisma.evaluation.create({
      data: {
        review_id,
        presenter_id,
        presenter_name,
        evaluator_id,
        is_hr,
        technical,
        communication,
        confidence,
        understanding,
        problem_solving,
        innovation,
        documentation,
        qa_handling,
        presentation,
        overall,
        total_marks
      }
    });

    // After evaluation is created, upsert the final result
    const finalResult = await upsertFinalResult(
      review_id,
      presenter_id,
      presenter_name
    );

    res.json({
      evaluation,
      finalResult,
      message: 'Evaluation submitted and final result updated'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit evaluation' });
  }
});

/**
 * Get Final Result for Specific Presenter
 * GET /api/Project-review/final-result/:reviewId/:presenterId
 */
router.get('/final-result/:reviewId/:presenterId', async (req, res) => {
  try {
    const { reviewId, presenterId } = req.params;

    const finalResult = await getFinalResult(reviewId, presenterId);

    if (!finalResult) {
      return res.status(404).json({ error: 'Final result not found' });
    }

    res.json(finalResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch final result' });
  }
});

/**
 * Get Score Breakdown (for debugging/UI display)
 * GET /api/Project-review/score/:reviewId/:presenterId
 *
 * Returns detailed breakdown of HR score, peer average, and presentation score
 */
router.get('/score/:reviewId/:presenterId', async (req, res) => {
  try {
    const { reviewId, presenterId } = req.params;

    const finalResult = await getFinalResult(reviewId, presenterId);

    if (!finalResult) {
      return res.status(404).json({ error: 'Final result not found' });
    }

    res.json({
      presenter_id: finalResult.presenter_id,
      presenter_name: finalResult.presenter_name,
      hr_score: finalResult.hr_score,
      peer_average: finalResult.peer_average,
      presentation_score: finalResult.presentation_score,
      total_penalty: finalResult.total_penalty,
      final_score: finalResult.final_score,
      created_at: finalResult.created_at,
      updated_at: finalResult.updated_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate score' });
  }
});

/**
 * Get All Final Results for a Review (ONE per presenter)
 * GET /api/Project-review/final-results/:reviewId
 */
router.get('/final-results/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const finalResults = await getFinalResultsForReview(reviewId);

    res.json(finalResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch final results' });
  }
});

/**
 * Generate Leaderboard from Final Results
 * GET /api/Project-review/leaderboard/:reviewId
 *
 * Returns ranked leaderboard with one record per presenter (one per review)
 * Ranked by final_score in descending order
 */
router.get('/leaderboard/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const leaderboard = await generateLeaderboardFromFinalResults(reviewId);

    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate leaderboard' });
  }
});

/**
 * Get Review Summary Statistics
 * GET /api/Project-review/summary/:reviewId
 *
 * Returns aggregated statistics:
 * - Total presenters
 * - Average, highest, lowest scores
 * - Average HR score
 * - Average peer score
 */
router.get('/summary/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const summary = await getReviewSummary(reviewId);

    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * Recalculate All Final Results for a Review
 * POST /api/Project-review/recalculate/:reviewId
 *
 * Use this endpoint to refresh all final results after bulk imports
 * or when you need to recalculate penalties
 */
router.post('/recalculate/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Delete all existing final results for this review
    await deleteFinalResultsForReview(reviewId);

    // Recalculate and create new final results for all presenters
    const results = await updateAllFinalResultsForReview(reviewId);

    res.json({
      message: 'Final results recalculated successfully',
      total_presenters: results.length,
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to recalculate final results' });
  }
});

/**
 * Get Penalties Breakdown (for analytical review)
 * GET /api/Project-review/penalties/:reviewId/:evaluatorId
 *
 * Calculates penalty for evaluator by comparing their marks to HR marks
 */
router.get('/penalties/:reviewId/:evaluatorId', async (req, res) => {
  try {
    const { reviewId, evaluatorId } = req.params;

    const peerEvaluations = await prisma.evaluation.findMany({
      where: {
        review_id: reviewId,
        evaluator_id: evaluatorId,
        is_hr: false
      }
    });

    let totalPenalty = 0;
    const penaltyDetails = [];

    for (const evaluation of peerEvaluations) {
      const hrEvaluation = await prisma.evaluation.findFirst({
        where: {
          review_id: reviewId,
          presenter_id: evaluation.presenter_id,
          is_hr: true
        }
      });

      const hrScore = hrEvaluation?.total_marks || 0;
      const penalty = calculateAnalyticalPenalty(
        evaluation.total_marks,
        hrScore
      );

      totalPenalty += penalty;

      penaltyDetails.push({
        presenter_id: evaluation.presenter_id,
        presenter_name: evaluation.presenter_name,
        evaluator_score: evaluation.total_marks,
        hr_score: hrScore,
        penalty
      });
    }

    const averagePenalty = peerEvaluations.length > 0 
      ? totalPenalty / peerEvaluations.length 
      : 0;

    res.json({
      evaluator_id: evaluatorId,
      total_evaluations: peerEvaluations.length,
      total_penalty: totalPenalty,
      average_penalty: averagePenalty,
      details: penaltyDetails
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch penalty details' });
  }
});

/**
 * Export Final Results (for reporting/download)
 * GET /api/Project-review/export/:reviewId
 */
router.get('/export/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.projectReview.findUnique({
      where: { id: reviewId },
      include: {
        finalResults: {
          orderBy: { final_score: 'desc' }
        }
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Format data for CSV export
    const data = review.finalResults.map((result, index) => ({
      rank: index + 1,
      presenter_id: result.presenter_id,
      presenter_name: result.presenter_name,
      hr_score: result.hr_score.toFixed(2),
      peer_average: result.peer_average.toFixed(2),
      presentation_score: result.presentation_score.toFixed(2),
      total_penalty: result.total_penalty.toFixed(2),
      final_score: result.final_score.toFixed(2)
    }));

    res.json({
      review_title: review.title,
      batch_name: review.batch_name,
      review_date: review.review_date,
      export_date: new Date().toISOString(),
      total_presenters: data.length,
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export results' });
  }
});

/**
 * Delete Evaluation and Update Final Result
 * DELETE /api/Project-review/evaluation/:evaluationId
 *
 * Removes an evaluation and recalculates final result for the presenter
 */
router.delete('/evaluation/:evaluationId', async (req, res) => {
  try {
    const { evaluationId } = req.params;

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' });
    }

    // Delete evaluation
    await prisma.evaluation.delete({
      where: { id: evaluationId }
    });

    // Recalculate final result for the presenter
    const finalResult = await upsertFinalResult(
      evaluation.review_id,
      evaluation.presenter_id,
      evaluation.presenter_name
    );

    res.json({
      message: 'Evaluation deleted and final result updated',
      finalResult
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
});

export default router;
