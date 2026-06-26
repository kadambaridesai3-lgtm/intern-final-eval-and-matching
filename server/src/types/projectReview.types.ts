/**
 * TypeScript Type Definitions for Project Review System
 * Location: server/src/types/projectReview.ts
 *
 * Provides strong typing for all project review operations
 */

/**
 * Evaluation Criteria Scores (0-10 each)
 */
export interface EvaluationCriteria {
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
}

/**
 * Evaluation Request/Response
 */
export interface EvaluationInput extends EvaluationCriteria {
  review_id: string;
  presenter_id: string;
  presenter_name: string;
  evaluator_id: string;
  is_hr: boolean;
}

export interface EvaluationRecord extends EvaluationInput {
  id: string;
  total_marks: number;
  created_at: Date;
}

/**
 * Final Result - Single Record per Presenter per Review
 */
export interface FinalResult {
  id: string;
  review_id: string;
  presenter_id: string;
  presenter_name: string;
  hr_score: number;
  peer_average: number;
  presentation_score: number;
  total_penalty: number;
  final_score: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Final Result with Ranking
 */
export interface RankedFinalResult extends FinalResult {
  rank: number;
}

/**
 * Leaderboard Entry (Ranked Final Result)
 */
export interface LeaderboardEntry extends RankedFinalResult {
  // All fields from FinalResult + rank
}

/**
 * Score Breakdown (For UI Display)
 */
export interface ScoreBreakdown {
  presenter_id: string;
  presenter_name: string;
  hr_score: number;
  peer_average: number;
  presentation_score: number;
  total_penalty: number;
  final_score: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Penalty Details (For Analysis)
 */
export interface PenaltyDetail {
  presenter_id: string;
  presenter_name: string;
  evaluator_score: number;
  hr_score: number;
  penalty: number;
}

/**
 * Penalties Breakdown Response
 */
export interface PenaltiesBreakdown {
  evaluator_id: string;
  total_evaluations: number;
  total_penalty: number;
  average_penalty: number;
  details: PenaltyDetail[];
}

/**
 * Review Summary Statistics
 */
export interface ReviewSummary {
  total_presenters: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  average_hr_score: number;
  average_peer_score: number;
}

/**
 * Project Review
 */
export interface ProjectReview {
  id: string;
  title: string;
  batch_name: string;
  review_date: Date;
  created_at: Date;
  evaluations?: EvaluationRecord[];
  finalResults?: FinalResult[];
}

/**
 * Evaluation Response (with Final Result)
 */
export interface EvaluationResponse {
  evaluation: EvaluationRecord;
  finalResult: FinalResult;
  message: string;
}

/**
 * Recalculation Response
 */
export interface RecalculationResponse {
  message: string;
  total_presenters: number;
  results: FinalResult[];
}

/**
 * Export Data (for CSV/Excel)
 */
export interface ExportData {
  review_title: string;
  batch_name: string;
  review_date: Date;
  export_date: string;
  total_presenters: number;
  data: ExportRow[];
}

export interface ExportRow {
  rank: number;
  presenter_id: string;
  presenter_name: string;
  hr_score: string;
  peer_average: string;
  presentation_score: string;
  total_penalty: string;
  final_score: string;
}

/**
 * API Response Wrappers
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Error Response
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

/**
 * Calculation Results (Intermediate)
 */
export interface CalculationResult {
  hrScore: number;
  peerAverage: number;
  presentationScore: number;
  totalPenalty: number;
  finalScore: number;
}

/**
 * Unique Constraint Type for Upsert
 */
export interface UpsertKey {
  review_id: string;
  presenter_id: string;
}

/**
 * Service Function Types
 */
export interface IProjectReviewService {
  calculateHRScore(criteria: EvaluationCriteria): number;
  calculatePeerAverage(reviewId: string, presenterId: string): Promise<number>;
  calculatePresentationScore(hrScore: number, peerAverage: number): number;
  calculateAnalyticalPenalty(evaluatorScore: number, hrScore: number): number;
  calculateTotalPenaltyForPresenter(
    reviewId: string,
    presenterId: string
  ): Promise<number>;
  calculateFinalScore(presentationScore: number, totalPenalty: number): number;
  upsertFinalResult(
    reviewId: string,
    presenterId: string,
    presenterName: string
  ): Promise<FinalResult>;
  getFinalResult(reviewId: string, presenterId: string): Promise<FinalResult | null>;
  getFinalResultsForReview(reviewId: string): Promise<FinalResult[]>;
  generateLeaderboardFromFinalResults(reviewId: string): Promise<RankedFinalResult[]>;
  deleteFinalResultsForReview(reviewId: string): Promise<void>;
  getReviewSummary(reviewId: string): Promise<ReviewSummary>;
}

/**
 * Constants
 */
export const PENALTY_TOLERANCE = 5; // ±5 marks tolerance
export const MAX_CRITERIA = 10; // 10 evaluation criteria
export const MAX_CRITERIA_SCORE = 10; // 0-10 per criterion
export const MAX_TOTAL_SCORE = 100; // Max 100 points

/**
 * Validation Types
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Request Validation
 */
export function validateEvaluationInput(input: any): ValidationResult {
  const errors: string[] = [];

  if (!input.review_id) errors.push('review_id is required');
  if (!input.presenter_id) errors.push('presenter_id is required');
  if (!input.presenter_name) errors.push('presenter_name is required');
  if (!input.evaluator_id) errors.push('evaluator_id is required');
  if (typeof input.is_hr !== 'boolean') errors.push('is_hr must be boolean');

  // Validate criteria scores
  const criteria = [
    'technical',
    'communication',
    'confidence',
    'understanding',
    'problem_solving',
    'innovation',
    'documentation',
    'qa_handling',
    'presentation',
    'overall'
  ];

  for (const criterion of criteria) {
    if (typeof input[criterion] !== 'number') {
      errors.push(`${criterion} must be a number`);
    } else if (input[criterion] < 0 || input[criterion] > 10) {
      errors.push(`${criterion} must be between 0 and 10`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Response Builders
 */
export const ResponseBuilder = {
  success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message
    };
  },

  error(error: string, code?: string): ApiErrorResponse {
    return {
      error,
      code
    };
  },

  notFound(resource: string): ApiErrorResponse {
    return {
      error: `${resource} not found`,
      code: 'NOT_FOUND'
    };
  },

  badRequest(message: string): ApiErrorResponse {
    return {
      error: 'Bad Request',
      message,
      code: 'BAD_REQUEST'
    };
  }
};
