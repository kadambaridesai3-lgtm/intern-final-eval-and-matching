import { getPrisma } from '../lib/prisma';

const prisma = getPrisma();

/**
 * Calculation Functions
 */

/**
 * Calculate HR Score from HR evaluation
 * Sum of all 10 criteria (0-10 each)
 */
export function calculateHRScore(evaluation: {
  technical: number;
  communication: number;
  confidence: number;
  understanding: number;
  problem_solving: number;
  innovation: number;
  documentation: number;
  qa_handling: number;
  presentation: number;
  overall: number;
}): number {
  return (
    evaluation.technical +
    evaluation.communication +
    evaluation.confidence +
    evaluation.understanding +
    evaluation.problem_solving +
    evaluation.innovation +
    evaluation.documentation +
    evaluation.qa_handling +
    evaluation.presentation +
    evaluation.overall
  );
}

/**
 * Calculate penalty based on difference from HR evaluation
 * Within ±5: penalty = 0 (acceptable range)
 * Beyond ±5: penalty = (difference - 5)
 */
export function calculateAnalyticalPenalty(
  evaluatorScore: number,
  hrScore: number
): number {
  const difference = Math.abs(evaluatorScore - hrScore);
  return Math.max(0, difference - 5);
}

/**
 * Calculate peer average from all peer evaluations
 */
export async function calculatePeerAverage(
  reviewId: string,
  presenterId: string
): Promise<number> {
  const peerEvaluations = await prisma.evaluation.findMany({
    where: {
      review_id: reviewId,
      presenter_id: presenterId,
      is_hr: false
    }
  });

  if (peerEvaluations.length === 0) {
    return 0;
  }

  const totalScore = peerEvaluations.reduce(
    (sum, evaluation) => sum + evaluation.total_marks,
    0
  );

  return totalScore / peerEvaluations.length;
}

/**
 * Calculate presentation score
 * presentation_score = (hr_score + peer_average) / 2
 */
export function calculatePresentationScore(
  hrScore: number,
  peerAverage: number
): number {
  return (hrScore + peerAverage) / 2;
}

/**
 * Calculate total penalty from evaluator's penalty
 * This is the penalty accumulated from comparing evaluator's marks to HR's marks
 */
export async function calculateTotalPenalty(
  reviewId: string,
  evaluatorId: string
): Promise<number> {
  const evaluatorEvaluations = await prisma.evaluation.findMany({
    where: {
      review_id: reviewId,
      evaluator_id: evaluatorId,
      is_hr: false // Only calculate penalty for peer evaluations
    }
  });

  let totalPenalty = 0;

  for (const evaluation of evaluatorEvaluations) {
    // Get HR evaluation for the same presenter
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
  }

  return totalPenalty;
}

/**
 * Calculate final score
 * final_score = presentation_score - total_penalty
 */
export function calculateFinalScore(
  presentationScore: number,
  totalPenalty: number
): number {
  return Math.max(0, presentationScore - totalPenalty); // Ensure score doesn't go below 0
}

/**
 * Upsert Final Result - Core Logic
 * Creates or updates a single final record per presenter per review
 * Uses unique constraint [review_id, presenter_id]
 */
export async function upsertFinalResult(
  reviewId: string,
  presenterId: string,
  presenterName: string
): Promise<any> {
  // Step 1: Get HR evaluation for this presenter in this review
  const hrEvaluation = await prisma.evaluation.findFirst({
    where: {
      review_id: reviewId,
      presenter_id: presenterId,
      is_hr: true
    }
  });

  // Step 2: Calculate HR Score (default 0 if no HR evaluation yet)
  const hrScore = hrEvaluation ? calculateHRScore(hrEvaluation) : 0;

  // Step 3: Calculate Peer Average
  const peerAverage = await calculatePeerAverage(reviewId, presenterId);

  // Step 4: Calculate Presentation Score
  const presentationScore = calculatePresentationScore(hrScore, peerAverage);

  // Step 5: Calculate Total Penalty (from peer evaluations)
  const totalPenalty = await calculateTotalPenaltyForPresenter(
    reviewId,
    presenterId
  );

  // Step 6: Calculate Final Score
  const finalScore = calculateFinalScore(presentationScore, totalPenalty);

  // Step 7: Upsert single record using unique constraint
  const finalResult = await prisma.finalResult.upsert({
    where: {
      review_id_presenter_id: {
        review_id: reviewId,
        presenter_id: presenterId
      }
    },
    create: {
      review_id: reviewId,
      presenter_id: presenterId,
      presenter_name: presenterName,
      hr_score: hrScore,
      peer_average: peerAverage,
      presentation_score: presentationScore,
      total_penalty: totalPenalty,
      final_score: finalScore
    },
    update: {
      presenter_name: presenterName,
      hr_score: hrScore,
      peer_average: peerAverage,
      presentation_score: presentationScore,
      total_penalty: totalPenalty,
      final_score: finalScore,
      updated_at: new Date()
    }
  });

  return finalResult;
}

/**
 * Calculate total penalty for a specific presenter
 * By comparing all peer evaluations against HR evaluation
 */
export async function calculateTotalPenaltyForPresenter(
  reviewId: string,
  presenterId: string
): Promise<number> {
  const peerEvaluations = await prisma.evaluation.findMany({
    where: {
      review_id: reviewId,
      presenter_id: presenterId,
      is_hr: false
    }
  });

  // Get HR evaluation for reference
  const hrEvaluation = await prisma.evaluation.findFirst({
    where: {
      review_id: reviewId,
      presenter_id: presenterId,
      is_hr: true
    }
  });

  const hrScore = hrEvaluation ? calculateHRScore(hrEvaluation) : 0;

  let totalPenalty = 0;

  // For each peer evaluation, calculate penalty based on difference from HR score
  for (const peerEval of peerEvaluations) {
    const penalty = calculateAnalyticalPenalty(peerEval.total_marks, hrScore);
    totalPenalty += penalty;
  }

  // Return average penalty per peer
  if (peerEvaluations.length > 0) {
    return totalPenalty / peerEvaluations.length;
  }

  return 0;
}

/**
 * Get all unique presenters for a review and upsert their final results
 */
export async function updateAllFinalResultsForReview(
  reviewId: string
): Promise<any[]> {
  const presenters = await prisma.evaluation.findMany({
    where: { review_id: reviewId },
    distinct: ['presenter_id'],
    select: {
      presenter_id: true,
      presenter_name: true
    }
  });

  const results = [];

  for (const presenter of presenters) {
    const finalResult = await upsertFinalResult(
      reviewId,
      presenter.presenter_id,
      presenter.presenter_name
    );
    results.push(finalResult);
  }

  return results;
}

/**
 * Get final result for a specific presenter in a review
 */
export async function getFinalResult(
  reviewId: string,
  presenterId: string
): Promise<any> {
  return prisma.finalResult.findUnique({
    where: {
      review_id_presenter_id: {
        review_id: reviewId,
        presenter_id: presenterId
      }
    }
  });
}

/**
 * Get all final results for a review (one per presenter)
 */
export async function getFinalResultsForReview(reviewId: string): Promise<any[]> {
  return prisma.finalResult.findMany({
    where: { review_id: reviewId },
    orderBy: { final_score: 'desc' }
  });
}

/**
 * Generate leaderboard from final results (one record per presenter)
 */
export async function generateLeaderboardFromFinalResults(
  reviewId: string
): Promise<any[]> {
  const finalResults = await prisma.finalResult.findMany({
    where: { review_id: reviewId },
    orderBy: { final_score: 'desc' }
  });

  return finalResults.map((result, index) => ({
    rank: index + 1,
    review_id: result.review_id,
    presenter_id: result.presenter_id,
    presenter_name: result.presenter_name,
    hr_score: result.hr_score,
    peer_average: result.peer_average,
    presentation_score: result.presentation_score,
    total_penalty: result.total_penalty,
    final_score: result.final_score,
    created_at: result.created_at,
    updated_at: result.updated_at
  }));
}

/**
 * Delete final results for a review (e.g., when resetting evaluations)
 */
export async function deleteFinalResultsForReview(reviewId: string): Promise<any> {
  return prisma.finalResult.deleteMany({
    where: { review_id: reviewId }
  });
}

/**
 * Get summary statistics for a review
 */
export async function getReviewSummary(reviewId: string): Promise<any> {
  const finalResults = await prisma.finalResult.findMany({
    where: { review_id: reviewId }
  });

  if (finalResults.length === 0) {
    return {
      total_presenters: 0,
      average_score: 0,
      highest_score: 0,
      lowest_score: 0,
      average_hr_score: 0,
      average_peer_score: 0
    };
  }

  const scores = finalResults.map(r => r.final_score);
  const hrScores = finalResults.map(r => r.hr_score);
  const peerScores = finalResults.map(r => r.peer_average);

  return {
    total_presenters: finalResults.length,
    average_score: scores.reduce((a, b) => a + b, 0) / scores.length,
    highest_score: Math.max(...scores),
    lowest_score: Math.min(...scores),
    average_hr_score: hrScores.reduce((a, b) => a + b, 0) / hrScores.length,
    average_peer_score: peerScores.reduce((a, b) => a + b, 0) / peerScores.length
  };
}
