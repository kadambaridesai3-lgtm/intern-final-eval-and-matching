import express from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
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
import { generateAllFinalEvaluations } from '../services/finalEvaluationService';
import { writeTempFile, deleteTempFile } from '../utils/tempFile';

const router = express.Router();
const prisma = getPrisma();
const upload = multer({ storage: multer.memoryStorage() });

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
 * Get All Saved Evaluations
 * GET /api/Project-review/evaluations
 */
router.get('/evaluations', async (_req, res) => {
  try {
    const evaluations = await prisma.evaluation.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json(evaluations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
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
 * Create/Upsert Final Result Manually
 * POST /api/Project-review/final-result
 */
router.post('/final-result', async (req, res) => {
  try {
    const { review_id, p_no, hr_score, peer_average, total_penalty } = req.body;

    if (!review_id || !p_no) {
      return res.status(400).json({ error: 'review_id and p_no are required' });
    }

    const intern = await prisma.intern.findFirst({
      where: { p_no: p_no.trim() }
    });
    if (!intern) {
      return res.status(400).json({ error: `P No ${p_no} not found in database.` });
    }

    const hr = Number(hr_score || 0);
    const peer = Number(peer_average || 0);
    const penalty = Number(total_penalty || 0);
    const presentation = (hr + peer) / 2;
    const final = Math.max(0, presentation - penalty);

    const result = await prisma.finalResult.upsert({
      where: {
        review_id_presenter_id: {
          review_id,
          presenter_id: intern.intern_id
        }
      },
      update: {
        hr_score: hr,
        peer_average: peer,
        presentation_score: presentation,
        total_penalty: penalty,
        final_score: final,
        updated_at: new Date()
      },
      create: {
        review_id,
        presenter_id: intern.intern_id,
        presenter_name: intern.full_name,
        hr_score: hr,
        peer_average: peer,
        presentation_score: presentation,
        total_penalty: penalty,
        final_score: final
      }
    });

    // Automatically recalculate evaluations
    await generateAllFinalEvaluations();

    res.json(result);
  } catch (error: any) {
    console.error('[ProjectReview] Manual insert error:', error);
    res.status(500).json({ error: error.message || 'Failed to upsert final result' });
  }
});

/**
 * Edit Final Result Manually
 * PUT /api/Project-review/final-result/:reviewId/:presenterId
 */
router.put('/final-result/:reviewId/:presenterId', async (req, res) => {
  try {
    const { reviewId, presenterId } = req.params;
    const { hr_score, peer_average, total_penalty } = req.body;

    const existing = await prisma.finalResult.findFirst({
      where: {
        review_id: reviewId,
        presenter_id: presenterId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Final result not found.' });
    }

    const hr = hr_score !== undefined ? Number(hr_score) : existing.hr_score;
    const peer = peer_average !== undefined ? Number(peer_average) : existing.peer_average;
    const penalty = total_penalty !== undefined ? Number(total_penalty) : existing.total_penalty;
    const presentation = (hr + peer) / 2;
    const final = Math.max(0, presentation - penalty);

    const updated = await prisma.finalResult.update({
      where: {
        id: existing.id
      },
      data: {
        hr_score: hr,
        peer_average: peer,
        presentation_score: presentation,
        total_penalty: penalty,
        final_score: final,
        updated_at: new Date()
      }
    });

    // Automatically recalculate evaluations
    await generateAllFinalEvaluations();

    res.json(updated);
  } catch (error: any) {
    console.error('[ProjectReview] Manual edit error:', error);
    res.status(500).json({ error: error.message || 'Failed to update final result' });
  }
});

/**
 * Delete Final Result
 * DELETE /api/Project-review/final-result/:reviewId/:presenterId
 */
router.delete('/final-result/:reviewId/:presenterId', async (req, res) => {
  try {
    const { reviewId, presenterId } = req.params;
    await prisma.finalResult.delete({
      where: {
        review_id_presenter_id: {
          review_id: reviewId,
          presenter_id: presenterId
        }
      }
    });

    // Automatically recalculate evaluations
    await generateAllFinalEvaluations();

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('[ProjectReview] Delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete final result' });
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

/**
 * Upload Project Review Excel
 * POST /api/Project-review/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  let tempPath = '';
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[ProjectReview] Uploading file:', req.file.originalname);
    
    try {
      tempPath = writeTempFile(req.file.buffer, req.file.originalname);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to write temporary file: ' + err.message });
    }

    let rows: any[];
    try {
      const workbook = XLSX.readFile(tempPath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } catch (err: any) {
      if (err.code === 'EBUSY' || err.message?.includes('busy') || err.message?.includes('lock')) {
        return res.status(400).json({ error: 'The uploaded Excel file is locked or open in another program. Please close it and try again.' });
      }
      return res.status(400).json({ error: 'Failed to parse Excel file: ' + err.message });
    }

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No records found in Excel file' });
    }

    const pickCell = (row: Record<string, unknown>, keys: string[]) => {
      const rowKeys = Object.keys(row);
      const matchKey = rowKeys.find(k => keys.some(c => k.toLowerCase().replace(/[^a-z0-9]/g, '') === c.toLowerCase().replace(/[^a-z0-9]/g, '')));
      return matchKey ? row[matchKey] : '';
    };

    const toText = (value: unknown) => {
      if (value === undefined || value === null) return '';
      return String(value).trim();
    };

    // Get or create default review
    let review = await prisma.projectReview.findFirst({
      where: { title: "Excel Uploaded Review" }
    });
    if (!review) {
      review = await prisma.projectReview.create({
        data: {
          title: "Excel Uploaded Review",
          batch_name: "Excel Uploaded Batch",
          review_date: new Date(),
        }
      });
    }

    const errors: { row: number; error: string }[] = [];
    const warnings: { row: number; warning: string }[] = [];
    let successCount = 0;
    const seenPnos = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // Skip completely empty rows
      const isEmptyRow = Object.values(row).every(val => val === undefined || val === null || String(val).trim() === '');
      if (isEmptyRow) {
        continue;
      }

      const pNo = toText(pickCell(row, ['P No', 'pno', 'p_no', 'P.No'])).trim();
      const rawHrScore = pickCell(row, ['HR Score', 'hrscore', 'hr_score']);
      const rawPeerAverage = pickCell(row, ['Peer Average', 'peeraverage', 'peer_average']);
      const rawPenalty = pickCell(row, ['Penalty', 'penalty', 'total_penalty']);

      if (!pNo) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: P No is blank.` });
        continue;
      }

      if (seenPnos.has(pNo)) {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: Duplicate Project Review entry for P No ${pNo} in file.` });
        continue;
      }
      seenPnos.add(pNo);

      // Validate scores
      let hrScore = 0;
      if (rawHrScore === undefined || rawHrScore === null || String(rawHrScore).trim() === '') {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: HR Score is blank` });
      } else {
        hrScore = Number(rawHrScore);
        if (isNaN(hrScore) || hrScore < 0 || hrScore > 100) {
          errors.push({ row: rowNum, error: `Row ${rowNum}: HR Score must be a valid number between 0 and 100.` });
          continue;
        }
      }

      let peerAverage = 0;
      if (rawPeerAverage === undefined || rawPeerAverage === null || String(rawPeerAverage).trim() === '') {
        warnings.push({ row: rowNum, warning: `Row ${rowNum}: Peer Average is blank` });
      } else {
        peerAverage = Number(rawPeerAverage);
        if (isNaN(peerAverage) || peerAverage < 0 || peerAverage > 100) {
          errors.push({ row: rowNum, error: `Row ${rowNum}: Peer Average must be a valid number between 0 and 100.` });
          continue;
        }
      }

      const penalty = rawPenalty === undefined || rawPenalty === null || String(rawPenalty).trim() === '' ? 0 : Number(rawPenalty);
      if (isNaN(penalty) || penalty < 0) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: Penalty cannot be negative.` });
        continue;
      }

      // Look up intern by p_no
      const intern = await prisma.intern.findFirst({
        where: { p_no: pNo }
      });

      if (!intern) {
        warnings.push({
          row: rowNum,
          warning: `Row ${rowNum}: P No ${pNo} not found in Intern database.`
        });
        continue;
      }

      // Calculate project score automatically
      const presentationScore = (hrScore + peerAverage) / 2;
      const projectScore = Math.max(0, presentationScore - penalty);

      try {
        await prisma.finalResult.upsert({
          where: {
            review_id_presenter_id: {
              review_id: review.id,
              presenter_id: intern.intern_id
            }
          },
          create: {
            review_id: review.id,
            presenter_id: intern.intern_id,
            presenter_name: intern.full_name,
            hr_score: hrScore,
            peer_average: peerAverage,
            presentation_score: presentationScore,
            total_penalty: penalty,
            final_score: projectScore,
          },
          update: {
            presenter_name: intern.full_name,
            hr_score: hrScore,
            peer_average: peerAverage,
            presentation_score: presentationScore,
            total_penalty: penalty,
            final_score: projectScore,
            updated_at: new Date(),
          }
        });
        successCount++;
      } catch (err: any) {
        errors.push({ row: rowNum, error: `Row ${rowNum}: Failed to save project review: ${err.message}` });
      }
    }

    // Recalculate final evaluations
    await generateAllFinalEvaluations();

    try {
      await prisma.uploadHistory.create({
        data: {
          file_name: req.file.originalname,
          records_imported: successCount,
          status: errors.length > 0 ? 'Failed' : (warnings.length > 0 ? 'Warnings' : 'Success'),
          module: 'Project Review',
          uploaded_by: 'HR Admin'
        }
      });
    } catch (dbErr) {
      console.error('Failed to log project review upload history', dbErr);
    }

    res.json({
      message: `Processed ${rows.length} project review records`,
      total_parsed: rows.length,
      created: successCount,
      errors,
      warnings,
    });
  } catch (error: any) {
    console.error('[ProjectReview] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process project review file' });
  } finally {
    if (tempPath) deleteTempFile(tempPath);
  }
});

export default router;
